import { Injectable, Inject } from "@nestjs/common";
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from "@nestjs/terminus";
import { REDIS_CLIENT } from "../../redis/redis.constants";
import type { RedisClientType } from "redis";

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: RedisClientType,
  ) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    try {
      if (!this.redis.isOpen) {
        throw new Error("Redis client not open");
      }
      await this.redis.ping();
      return this.getStatus("redis", true);
    } catch (err) {
      throw new HealthCheckError(
        "Redis check failed",
        this.getStatus("redis", false, { message: (err as Error).message }),
      );
    }
  }
}
