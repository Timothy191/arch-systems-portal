// Placeholder exports for @repo/rate-limiter

export class RateLimiter {
  constructor(options: any) {}
  async check(key: string): Promise<boolean> {
    return true;
  }
}

export class RedisStore {
  constructor(options: any) {}
}

export class FixedWindowStrategy {
  constructor(options: any) {}
}