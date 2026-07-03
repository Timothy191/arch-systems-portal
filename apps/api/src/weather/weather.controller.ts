import { Controller, Get, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { WeatherService } from "./weather.service";

@ApiTags("weather")
@Controller("weather")
export class WeatherController {
  private readonly logger = new Logger(WeatherController.name);

  constructor(private readonly weatherService: WeatherService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "Get current weather data" })
  async getWeather() {
    try {
      return await this.weatherService.fetchWeather();
    } catch (error) {
      this.logger.error("Weather fetch failed", error);
      return null;
    }
  }
}
