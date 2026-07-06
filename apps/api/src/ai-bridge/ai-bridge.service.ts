import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class AiBridgeService {
  private readonly logger = new Logger(AiBridgeService.name);
  private readonly AI_GATEWAY_URL =
    process.env.AI_GATEWAY_URL || "http://ai-gateway:3000";

  async invokeAgent(
    task: string,
    context: Record<string, any> = {},
  ): Promise<any> {
    this.logger.log(`Invoking AI Gateway for task: ${task}`);
    try {
      // Create a native AbortController for a 10-second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.AI_GATEWAY_URL}/api/ai/invoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, context }),
        signal: controller.signal as any,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`AI Gateway returned status: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      this.logger.error(
        `Failed to reach AI Gateway: ${error.message}. Returning fallback response.`,
      );
      // Elegant fail-safe response if the AI container is down
      return {
        status: "fallback",
        result:
          "The AI subsystem is currently unreachable. Operational systems remain active.",
      };
    }
  }
}
