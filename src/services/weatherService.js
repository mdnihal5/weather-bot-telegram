class WeatherService {
    static async getWeather(city, apiKey) {
        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`
            );

            if (!response.ok) {
                const error = await response.json();
                console.error(`Failed to fetch weather data for ${city}:`, error);
                throw new Error('Failed to fetch weather data');
            }

            const data = await response.json();
            return {
                cityName: data.name,
                temperature: data.main.temp,
                condition: data.weather[0].description,
                windSpeed: data.wind.speed,
                humidity: data.main.humidity
            };
        } catch (error) {
            console.error(`Error fetching weather data for ${city}:`, error);
            throw error;
        }
    }
}

module.exports = WeatherService;
