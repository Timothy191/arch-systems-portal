/**
 * @repo/redis — shared Redis client singleton
 *
 * Usage:
 *   import { redis } from "@repo/redis";
 *   await redis.set("key", "value", "EX", 60);
 */
import Redis from "ioredis";

let _client: Redis | null = null;

function createClient(): Redis {
  const url = process.env["REDIS_URL"];
  if (!url) {
    throw new Error(
      "[redis] REDIS_URL environment variable is not set. " +
        "Add REDIS_URL=redis://localhost:6379 to your .env file."
    );
  }

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  client.on("error", (err: Error) => {
    console.error("[redis] Connection error:", err.message);
  });

  client.on("connect", () => {
    console.log("[redis] Connected:", url.replace(/\/\/.*@/, "//<credentials>@"));
  });

  return client;
}

/**
 * Returns the shared Redis singleton.
 * Initialises lazily on first access.
 */
export function getRedis(): Redis {
  if (!_client) {
    _client = createClient();
  }
  return _client;
}

/** The Redis singleton — preferred import for most use-cases. */
export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    return (getRedis() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export type { Redis };

// Legacy exports for compatibility
export function getRedisClient(): Redis {
  return getRedis();
}

export const CacheCategory = {
  ACCESS_CONTROL: "access_control",
  DRILLING: "drilling",
  TRAINING: "training",
  HUB: "hub",
};

export function cacheGet(key: string): Promise<string | null> {
  return getRedis().get(key);
}

export function cacheSet(key: string, value: string, ttl?: number): Promise<"OK"> {
  return getRedis().set(key, value, "EX", ttl || 3600);
}

export function cacheEvictL1ByPrefix(prefix: string): Promise<number> {
  const keys = getRedis().keys(`${prefix}*`);
  return keys.then((keyList) => {
    if (keyList.length === 0) return 0;
    return getRedis().del(...keyList);
  });
}

export function cacheInvalidateTags(tags: string[]): Promise<void> {
  // Stub implementation
  return Promise.resolve();
}

export function cacheWrap<T>(key: string, fn: () => Promise<T>): Promise<T> {
  return cacheGet(key).then((cached) => {
    if (cached) return JSON.parse(cached) as T;
    return fn().then((result) => {
      cacheSet(key, JSON.stringify(result));
      return result;
    });
  });
}

export function getCacheStats() {
  return {
    hits: 0,
    misses: 0,
    keys: 0,
  };
}

export const cacheGetWithStats = cacheGet;
export const cacheSetWithTags = cacheSet;
