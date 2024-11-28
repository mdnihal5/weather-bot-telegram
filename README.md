# WeatherBot - Telegram Weather Update Bot

**WeatherBot** is a Telegram bot that provides users with daily weather updates for their chosen cities. It allows admins to manage subscriptions, update settings, and handle user interactions.

## Features

### User Commands:
- **/subscribe <city>**: Subscribe to daily weather updates for a specific city.
- **/unsubscribe**: Unsubscribe from weather updates.
- **/weather <city>**: Get the current weather for a specific city.

### Admin Commands:
- **/admin**: Access the admin panel.
- **/setapikey <key>**: Update the weather API key.
- **/block <userId>**: Block a user from receiving updates.
- **/unblock <userId>**: Unblock a user.
- **/listusers**: List all active subscribers.

## Setup

### Prerequisites
- Node.js (v16 or later)
- Telegram Bot Token (create a bot via [BotFather](https://core.telegram.org/bots#botfather))
- Weather API Key (get from a service like [OpenWeatherMap](https://openweathermap.org/api))

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mdnihal5/weather-bot-telegram.git
   cd weather-bot-telegram
