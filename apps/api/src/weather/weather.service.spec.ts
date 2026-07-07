import { Test, TestingModule } from "@nestjs/testing";
import { WeatherService } from "./weather.service";

const mockFetch = jest.fn();

describe("WeatherService", () => {
  let service: WeatherService;

  beforeAll(() => {
    global.fetch = mockFetch;
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod: TestingModule = await Test.createTestingModule({
      providers: [WeatherService],
    }).compile();
    service = mod.get(WeatherService);
  });

  const sampleResponse = {
    current: {
      time: "2026-07-07T10:00",
      temperature_2m: 25.3,
      apparent_temperature: 23.1,
      relative_humidity_2m: 65,
      wind_speed_10m: 12.5,
      wind_direction_10m: 180,
      weather_code: 2,
      is_day: 1,
    },
    daily: {
      time: [
        "2026-07-07",
        "2026-07-08",
        "2026-07-09",
        "2026-07-10",
        "2026-07-11",
      ],
      weather_code: [2, 3, 61, 0, 95],
      temperature_2m_max: [27, 25, 22, 28, 24],
      temperature_2m_min: [15, 14, 13, 16, 14],
      precipitation_sum: [0, 2, 15, 0, 5],
    },
  };

  it("parses weather data correctly from Open-Meteo response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(sampleResponse),
    });

    const result = await service.fetchWeather(
      -26.1436,
      28.6811,
      "Test Location",
    );

    expect(result).toMatchObject({
      temperature: 25,
      feelsLike: 23,
      humidity: 65,
      windSpeed: 13,
      windDirection: 180,
      weatherCode: 2,
      description: "Partly cloudy",
      icon: "⛅",
      location: { lat: -26.1436, lon: 28.6811, name: "Test Location" },
    });

    // Should have 5 daily forecasts
    expect(result.daily).toHaveLength(5);
    expect(result.daily![0]).toMatchObject({
      date: "2026-07-07",
      maxTemp: 27,
      minTemp: 15,
      description: "Partly cloudy",
    });
    expect(result.daily![4]).toMatchObject({
      weatherCode: 95,
      description: "Thunderstorm",
      precipitation: 5,
    });
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
    });

    await expect(service.fetchWeather()).rejects.toThrow(
      "Weather API error: 503",
    );
  });

  it("handles unknown weather codes", async () => {
    const unknownCodeResponse = JSON.parse(JSON.stringify(sampleResponse));
    unknownCodeResponse.current.weather_code = 999;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(unknownCodeResponse),
    });

    const result = await service.fetchWeather();
    expect(result.description).toBe("Unknown");
    expect(result.icon).toBe("❓");
  });

  it("uses default coordinates when none provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(sampleResponse),
    });

    const result = await service.fetchWeather();

    // Defaults to -26.1436, 28.6811 (Witbank, South Africa)
    expect(result.location).toMatchObject({
      lat: -26.1436,
      lon: 28.6811,
    });
  });

  it("makes request to the correct Open-Meteo endpoint", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(sampleResponse),
    });

    await service.fetchWeather(-30.0, 150.0);

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("api.open-meteo.com");
    expect(calledUrl).toContain("latitude=-30");
    expect(calledUrl).toContain("longitude=150");
  });
});
