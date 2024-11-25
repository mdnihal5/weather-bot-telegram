require("dotenv").config();

module.exports = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  WEATHER_API_KEY: process.env.WEATHER_API_KEY,
  ADMIN_USERNAMES: (process.env.ADMIN_USERNAMES || "").split(","),
  MONGODB_URI:
    process.env.MONGODB_URI || "mongodb://localhost:27017/weather-bot",
  UPDATE_INTERVAL: process.env.UPDATE_INTERVAL || "12", // hours
};
