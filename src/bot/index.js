const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const config = require("../config/config");
const Database = require("../services/database");
const WeatherService = require("../services/weatherService");

class WeatherBot {
  constructor() {
    this.bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN);
    this.app = express();
    this.initializeBot();
  }

  async initializeBot() {
    try {
      await Database.connect();
      this.initializeCommands();
      this.startSubscriptionUpdates();
      console.log("Bot is running...");
      const webhookUrl = `${config.WEB_HOOK_URL}/bot${config.TELEGRAM_BOT_TOKEN}`;
      await this.bot.setWebHook(webhookUrl);

      this.app.use(express.json());
      this.app.post(`/bot${config.TELEGRAM_BOT_TOKEN}`, (req, res) => {
        this.bot.processUpdate(req.body);
        res.sendStatus(200);
      });

      const port = process.env.PORT || 3000;
      this.app.listen(port, () => {
        console.log(`Webhook server is listening on port ${port}`);
      });
    } catch (error) {
      console.error("Failed to initialize bot:", error);
      process.exit(1);
    }
  }
  isAdmin(username) {
    return config.ADMIN_USERNAMES.includes(username);
  }

  async initializeCommands() {
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      this.sendHelpMessage(chatId);
    });

    this.bot.onText(/\/subscribe (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const city = match[1];
      const username =
        `${msg.from.first_name || ""} ${msg.from.last_name || ""}`.trim();

      try {
        const isAlreadySubscribed = await Database.isSubscribed(chatId);
        if (isAlreadySubscribed) {
          this.bot.sendMessage(
            chatId,
            "You are already subscribed. Use /unsubscribe first if you want to change your subscription.",
          );
        } else {
          if (await Database.addSubscriber(chatId, username, city)) {
            this.bot.sendMessage(
              chatId,
              `You've been subscribed to daily weather updates for ${city}`,
            );
          } else {
            this.bot.sendMessage(
              chatId,
              "Subscription failed. Please try again.",
            );
          }
        }
      } catch (error) {
        this.bot.sendMessage(
          chatId,
          "Failed to subscribe. Please try again later.",
        );
        console.error("Error subscribing user:", error);
      }
    });

    this.bot.onText(/\/unsubscribe/, async (msg) => {
      const chatId = msg.chat.id;

      try {
        const isSubscribed = await Database.isSubscribed(chatId);
        if (!isSubscribed) {
          this.bot.sendMessage(
            chatId,
            "You are not subscribed to weather updates.",
          );
        } else {
          if (await Database.removeSubscriber(chatId)) {
            this.bot.sendMessage(
              chatId,
              "You've been unsubscribed from weather updates.",
            );
          } else {
            this.bot.sendMessage(
              chatId,
              "Unsubscription failed. Please try again.",
            );
          }
        }
      } catch (error) {
        this.bot.sendMessage(
          chatId,
          "Failed to unsubscribe. Please try again later.",
        );
        console.error("Error unsubscribing user:", error);
      }
    });

    this.bot.onText(/\/weather (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const city = match[1];

      try {
        const weather = await WeatherService.getWeather(
          city,
          config.WEATHER_API_KEY,
        );
        const message = this.formatWeatherMessage(weather);
        this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
      } catch (error) {
        this.bot.sendMessage(
          chatId,
          `Sorry, I couldn't fetch weather information for ${city}. Please check the city name and try again.`,
        );
        console.error("Error fetching weather data:", error);
      }
    });

    this.bot.onText(/\/admin/, async (msg) => {
      const chatId = msg.chat.id;
      const username = msg.from.first_name + msg.from.last_name;
      if (this.isAdmin(username)) {
        await this.showAdminPanel(chatId);
      } else {
        this.bot.sendMessage(
          chatId,
          "You are not authorized to access the admin panel.",
        );
      }
    });

    this.bot.onText(/\/setapikey (.+)/, async (msg, match) => {
      const username = msg.from.first_name + msg.from.last_name;
      if (this.isAdmin(username)) {
        const chatId = msg.chat.id;
        const apiKey = match[1];

        try {
          await Database.updateSettings("weatherApiKey", apiKey);
          this.bot.sendMessage(chatId, "API key updated successfully");
        } catch (error) {
          this.bot.sendMessage(
            chatId,
            "Failed to update the API key. Please try again later.",
          );
          console.error("Error updating API key:", error);
        }
      }
    });

    this.bot.onText(/\/block (.+)/, async (msg, match) => {
      const username = msg.from.first_name + msg.from.last_name;
      if (this.isAdmin(username)) {
        const chatId = msg.chat.id;
        const userId = Number(match[1]);

        try {
          await Database.toggleSubscriber(userId, false);
          this.bot.sendMessage(chatId, `User ${userId} has been blocked`);
        } catch (error) {
          this.bot.sendMessage(chatId, `Failed to block user ${userId}.`);
          console.error(`Error blocking user ${userId}:`, error);
        }
      }
    });

    this.bot.onText(/\/unblock (.+)/, async (msg, match) => {
      const username = msg.from.first_name + msg.from.last_name;
      if (this.isAdmin(username)) {
        const chatId = msg.chat.id;
        const userId = Number(match[1]);

        try {
          await Database.toggleSubscriber(userId, true);
          this.bot.sendMessage(chatId, `User ${userId} has been unblocked`);
        } catch (error) {
          this.bot.sendMessage(chatId, `Failed to unblock user ${userId}.`);
          console.error(`Error unblocking user ${userId}:`, error);
        }
      }
    });

    this.bot.onText(/\/listusers/, async (msg) => {
      const username = msg.from.first_name + msg.from.last_name;
      if (this.isAdmin(username)) {
        const chatId = msg.chat.id;
        const subscribers = await Database.getActiveSubscribers();
        const userList = subscribers
          .map(
            (s) => `ID: ${s.userId}, Username: ${s.username}, City: ${s.city}`,
          )
          .join("\n");

        this.bot.sendMessage(chatId, userList || "No active subscribers");
      }
    });
  }

  async startSubscriptionUpdates() {
    setInterval(
      async () => {
        try {
          const subscribers = await Database.getActiveSubscribers();
          const apiKey = await Database.getSetting("weatherApiKey");

          for (const subscriber of subscribers) {
            try {
              const weather = await WeatherService.getWeather(
                subscriber.city,
                apiKey,
              );
              const message = this.formatWeatherMessage(weather);
              await this.bot.sendMessage(subscriber.userId, message, {
                parse_mode: "Markdown",
              });
            } catch (error) {
              console.error(
                `Failed to send update to ${subscriber.userId}:`,
                error,
              );
            }
          }
        } catch (error) {
          console.error(
            "Error fetching subscribers or sending updates:",
            error,
          );
        }
      },
      1000 * 60 * 60 * Number(config.UPDATE_INTERVAL),
    );
  }

  sendHelpMessage(chatId) {
    const helpMessage = `
🌦️ Weather Bot Commands 🌦️

User Commands:
/subscribe <city> - Get daily weather updates for a city
/unsubscribe - Stop receiving weather updates
/weather <city> - Get current weather for a specific city

Admin Commands:
/admin - Access admin panel
/setapikey <key> - Update weather API key
/block <userId> - Block a user from receiving updates
/unblock <userId> - Unblock a user
/listusers - View all subscribers
        `.trim();

    this.bot.sendMessage(chatId, helpMessage);
  }

  formatWeatherMessage(weather) {
    return `
🌆 *City*: ${weather.cityName}
🌡️ *Temperature*: ${weather.temperature.toFixed(1)}°C
☁️ *Condition*: ${weather.condition}
💨 *Wind Speed*: ${weather.windSpeed} m/s
💧 *Humidity*: ${weather.humidity}%
        `.trim();
  }

  async showAdminPanel(chatId) {
    try {
      const subscribers = await Database.getActiveSubscribers();
      const apiKey = await Database.getSetting("weatherApiKey");

      const adminMessage =
        "🔧 Admin Panel\n\n" +
        `Total Subscribers: ${subscribers.length}\n` +
        `Current API Key: ${apiKey}\n\n` +
        "Commands:\n" +
        "/setapikey <key> - Update Weather API key\n" +
        "/block <userId> - Block a user\n" +
        "/unblock <userId> - Unblock a user\n" +
        "/listusers - List all subscribers";

      this.bot.sendMessage(chatId, adminMessage);
    } catch (error) {
      console.error("Error fetching admin panel data:", error);
      this.bot.sendMessage(
        chatId,
        "Failed to fetch admin panel information. Please try again later.",
      );
    }
  }
}

module.exports = WeatherBot;
