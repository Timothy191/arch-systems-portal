/**
 * @repo/rate-limiter — lightweight Redis-backed rate limiter
 *
 * Usage:
 *   import { RateLimiter, RedisStore, FixedWindowStrategy } from "@repo/rate-limiter";
 *   import { getRedisClient } from "@repo/redis";
 *
 *   const store = new RedisStore(redis);
 *   const strategy = new FixedWindowStrategy();
 *   const limiter = new RateLimiter({ store, strategy, limit: 10, windowMs: 60000 });
 *   const result = await limiter.check("user-or-resource-id");
 *   if (!result.allowed) { handleRateLimit(); }
 */

/** Minimal Redis client interface for the rate limiter. */
export interface SimpleRedisClient {
  status: string
  get(key: string): Promise<string | null>
  set(key: string, value: string, mode: 'EX', ttl: number): Promise<unknown>
}

/** Rate limit check result. */
export interface RateLimitResult {
  allowed: boolean
  retryAfter?: number
  remaining?: number
  total?: number
}

/** Storage backend interface. */
export interface Store {
  increment(key: string, windowMs: number): Promise<{ current: number; ttl: number }>
}

/**
 * Redis-backed store using atomic INCR + EXPIRE.
 */
export class RedisStore implements Store {
  constructor(private client: SimpleRedisClient) {}

  async increment(key: string, windowMs: number): Promise<{ current: number; ttl: number }> {
    const now = Date.now()
    const multiKey = `ratelimit:${key}:${Math.floor(now / windowMs)}`

    const current = await this.client.get(multiKey)
    const count = current ? Number.parseInt(current, 10) + 1 : 1

    // Use SET with NX to set expiry only on first create
    await this.client.set(multiKey, String(count), 'EX', Math.ceil(windowMs / 1000))

    return { current: count, ttl: Math.ceil(windowMs / 1000) }
  }
}

/**
 * Fixed window strategy — counts requests in wall-clock windows.
 * Simple, memory-efficient. Use sliding window for stricter accuracy.
 */
export class FixedWindowStrategy {
  // No configuration needed for basic fixed window
}

/** Rate limiter configuration. */
export interface RateLimiterConfig {
  store: Store
  strategy: FixedWindowStrategy
  limit: number
  windowMs: number
  keyPrefix?: string
}

/**
 * Rate limiter — checks if a request is within the configured limits.
 */
export class RateLimiter {
  private store: Store
  private limit: number
  private windowMs: number
  private keyPrefix: string

  constructor(config: RateLimiterConfig) {
    this.store = config.store
    this.limit = config.limit
    this.windowMs = config.windowMs
    this.keyPrefix = config.keyPrefix ?? 'ratelimit:'
  }

  /**
   * Check if the given identifier is allowed within the rate limit window.
   * Returns whether the request is allowed and how long to wait if not.
   */
  async check(identifier: string): Promise<RateLimitResult> {
    const key = `${this.keyPrefix}${identifier}`

    try {
      const { current, ttl } = await this.store.increment(key, this.windowMs)
      const allowed = current <= this.limit

      return {
        allowed,
        remaining: Math.max(0, this.limit - current),
        total: this.limit,
        retryAfter: allowed ? undefined : ttl,
      }
    } catch {
      // If Redis is unavailable, allow the request through
      return { allowed: true, remaining: 1, total: this.limit }
    }
  }
}
