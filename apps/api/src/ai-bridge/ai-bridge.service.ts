import { Injectable, Logger } from "@nestjs/common";
import { AiGatewayService } from "../ai/ai-gateway.service";

@Injectable()
export class AiBridgeService {
  private readonly logger = new Logger(AiBridgeService.name);
  private readonly AI_GATEWAY_URL =
    process.env.AI_GATEWAY_URL || "http://ai-gateway:3000";

  constructor(private readonly aiGateway: AiGatewayService) {}

  async invokeAgent(
    task: string,
    context: Record<string, any> = {},
  ): Promise<any> {
    this.logger.log(`Invoking AI Gateway for task: ${task}`);
    const response = await this.aiGateway.invoke(
      async (signal) => {
        const controller = new AbortController();
        const timeoutMs = this.aiGateway["features"].getConfig().requestTimeoutMs;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const result = await fetch(`${this.AI_GATEWAY_URL}/api/ai/invoke`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ task, context }),
            signal: signal as any,
          });
          clearTimeout(timeoutId);

          if (!result.ok) {
            throw new Error(`AI Gateway returned status: ${result.status}`);
          }

          return result.json();
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      },
      { task, context },
    );

    return response.result;
  }
}
