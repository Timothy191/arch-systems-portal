import { Injectable, CanActivate, ExecutionContext, Inject, HttpException, HttpStatus } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { REDIS_CLIENT } from "../../redis/redis.constants";
import type { RedisClientType } from "redis";

export const AI_RATE_LIMIT = "ai-rate-limit";

export interface AiRateLimitOptions {
  category: "chat" | "embedding" | "tool";
  limit: number;
  windowMs: number;
  toolName?: string;
}

/**
 * Token Bucket rate limiter for AI endpoints.
 * Uses Redis for distributed rate limiting with in-memory fallback.
 *
 * Per-category buckets so a heavy tool call cannot starve other endpoints.
 *
 * Usage: @UseGuards(AiRateLimitGuard) with setMetadata(AI_RATE_LIMIT, { category, limit, windowMs })
 */
@Injectable()
export class AiRateLimitGuard implements CanActivate {
  private readonly inMemoryCounters = new Map<string, { count: number; resetTime: number }>();

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisClientType,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<AiRateLimitOptions>(
      AI_RATE_LIMIT,
      context.getHandler(),
    );

    if (!options) return true;

    const request = context.switchToHttp().getRequest();
    const ip = (request.headers["x-forwarded-for"] ?? request.ip ?? "unknown") as string;

    const key = options.toolName
      ? `ratelimit:${options.category}:${options.toolName}:${ip}`
      : `ratelimit:${options.category}:${ip}`;

    const { count, resetTime } = await this.increment(key, options.windowMs);
    const allowed = count <= options.limit;
    const remaining = Math.max(0, options.limit - count);

    if (!allowed) {
      const retryAfter = Math.max(0, Math.ceil((resetTime - Date.now()) / 1000));
      throw new HttpException(
        { error: "Rate limit exceeded", retryAfter },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const response = context.switchToHttp().getResponse();
    response.header?.("X-RateLimit-Limit", String(options.limit));
    response.header?.("X-RateLimit-Remaining", String(remaining));
    response.header?.("X-RateLimit-Reset", String(Math.ceil(resetTime / 1000)));

    return true;
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
      // Fallback to in-memory
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
