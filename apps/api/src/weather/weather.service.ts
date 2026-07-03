import { Injectable, Logger } from "@nestjs/common";

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  weatherCode: number;
  description: string;
  icon: string;
  timestamp: string;
  location: { lat: number; lon: number; name?: string };
  daily?: DailyForecast[];
}

interface DailyForecast {
  date: string;
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
  description: string;
  icon: string;
  precipitation: number;
}

const weatherCodes: Record<number, { description: string; icon: string }> = {
  0: { description: "Clear sky", icon: "☀️" },
  1: { description: "Mainly clear", icon: "🌤️" },
  2: { description: "Partly cloudy", icon: "⛅" },
  3: { description: "Overcast", icon: "☁️" },
  45: { description: "Foggy", icon: "🌫️" },
  48: { description: "Depositing rime fog", icon: "🌫️" },
  51: { description: "Light drizzle", icon: "🌦️" },
  53: { description: "Moderate drizzle", icon: "🌦️" },
  55: { description: "Dense drizzle", icon: "🌧️" },
  61: { description: "Slight rain", icon: "🌦️" },
  63: { description: "Moderate rain", icon: "🌧️" },
  65: { description: "Heavy rain", icon: "⛈️" },
  71: { description: "Slight snow", icon: "🌨️" },
  73: { description: "Moderate snow", icon: "❄️" },
  75: { description: "Heavy snow", icon: "❄️" },
  95: { description: "Thunderstorm", icon: "⛈️" },
  96: { description: "Thunderstorm with hail", icon: "⛈️" },
  99: { description: "Thunderstorm with heavy hail", icon: "⛈️" },
};

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  async fetchWeather(
    lat = -26.1436,
    lon = 28.6811,
    locationName?: string,
  ): Promise<WeatherData> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    const current = data.current;
    const weatherInfo = weatherCodes[current.weather_code] ?? {
      description: "Unknown",
      icon: "❓",
    };

    const daily: DailyForecast[] = data.daily.time
      .slice(0, 5)
      .map((date: string, index: number) => {
        const code = data.daily.weather_code[index];
        const info = weatherCodes[code] ?? { description: "Unknown", icon: "❓" };
        return {
          date,
          maxTemp: Math.round(data.daily.temperature_2m_max[index]),
          minTemp: Math.round(data.daily.temperature_2m_min[index]),
          weatherCode: code,
          description: info.description,
          icon: info.icon,
          precipitation: data.daily.precipitation_sum[index],
        };
      });

    return {
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      humidity: current.relative_humidity_2m,
      windSpeed: Math.round(current.wind_speed_10m),
      windDirection: current.wind_direction_10m,
      weatherCode: current.weather_code,
      description: weatherInfo.description,
      icon: weatherInfo.icon,
      timestamp: current.time,
      location: { lat, lon, name: locationName },
      daily,
    };
  }
}
