import { Injectable, Inject, Logger } from "@nestjs/common";
import { REDIS_CLIENT } from "../redis/redis.constants";
import type { RedisClientType } from "redis";

export interface AiRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

@Injectable()
export class AiRateLimiterService {
  private readonly logger = new Logger(AiRateLimiterService.name);
  private readonly inMemoryCounters = new Map<string, { count: number; resetTime: number }>();

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisClientType,
  ) {}

  async check(
    category: string,
    identifier: string,
    limit: number,
    windowMs: number,
    toolName?: string,
  ): Promise<AiRateLimitResult> {
    const key = toolName
      ? `ratelimit:${category}:${toolName}:${identifier}`
      : `ratelimit:${category}:${identifier}`;

    const { count, resetTime } = await this.increment(key, windowMs);
    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);

    return { allowed, remaining, resetTime };
  }

  private async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    try {
      if (this.redis?.isOpen) {
        const now = Date.now();
        const resetTime = now + windowMs;
        const result = await this.redis.incr(key);
        if (result === 1) {
          await this.redis.expire(key, Math.ceil(windowMs / 1000));
        }
        return { count: result, resetTime };
      }
    } catch {
      // fallback
    }

    return this.inMemoryIncrement(key, windowMs);
  }

  private inMemoryIncrement(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const entry = this.inMemoryCounters.get(key);

    if (!entry || now > entry.resetTime) {
      const newEntry = { count: 1, resetTime: now + windowMs };
      this.inMemoryCounters.set(key, newEntry);
      return newEntry;
    }

    entry.count++;
    return entry;
  }
}
