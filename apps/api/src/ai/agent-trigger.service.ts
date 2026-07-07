import { Injectable, Logger } from "@nestjs/common";
import { Redis } from "ioredis";

@Injectable()
export class AgentTriggerService {
  private readonly logger = new Logger(AgentTriggerService.name);
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
    this.logger.log(
      "Agent Trigger Service initialized (Redis Streams Zero-Disk Offloading)",
    );
  }

  async emitEvent(payload: any) {
    try {
      await this.redis.xadd(
        "ai:triggers:stream",
        "*",
        "payload",
        JSON.stringify(payload),
      );
      this.logger.debug(`Fired Agent Trigger into Redis Stream`);
    } catch (e) {
      this.logger.error(
        `Failed to emit trigger to Redis: ${e instanceof Error ? e.message : "Unknown Error"}`,
      );
    }
  }
}
