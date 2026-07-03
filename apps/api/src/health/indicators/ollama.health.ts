import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from "@nestjs/terminus";

@Injectable()
export class OllamaHealthIndicator extends HealthIndicator {
  private readonly ollamaUrl: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.ollamaUrl =
      this.configService.get<string>("OLLAMA_URL") ?? "http://localhost:5243";
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    const enabled = !!this.configService.get<string>("OLLAMA_URL");

    if (!enabled) {
      return this.getStatus("aiRouter", true, { disabled: true });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.ollamaUrl}/api/tags`, {
        method: "GET",
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Ollama returned ${res.status}`);
      }

      return this.getStatus("aiRouter", true);
    } catch (err) {
      throw new HealthCheckError(
        "Ollama check failed",
        this.getStatus("aiRouter", false, { message: (err as Error).message }),
      );
    }
  }
}
