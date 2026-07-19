import Redis from "ioredis";

type RedisClient = import("ioredis").Redis;

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let client: RedisClient | null = null;
let connecting: Promise<RedisClient> | null = null;

/**
 * Returns the Redis client if it is currently open, otherwise null.
 * Useful for non-critical operations (like telemetry) to avoid triggering connections.
 */
export function getClientIfOpen(): RedisClient | null {
  return client?.status === "ready" ? client : null;
}

/**
 * Get or create the singleton Redis client using ioredis.
 */
export async function getRedisClient(): Promise<RedisClient> {
  if (client?.status === "ready") return client;
  if (connecting) return connecting;

  connecting = (async () => {
    const next = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy(times: number) {
        if (times > 3) return null;
        return Math.min(times * 50, 500);
      },
    });

    next.on("error", () => {
      if (client === next) client = null;
      connecting = null;
    });

    next.on("end", () => {
      if (client === next) client = null;
      connecting = null;
    });

    try {
      await next.connect();
      client = next;
      return client;
    } finally {
      connecting = null;
    }
  })();

  return connecting;
}

/**
 * Gracefully close the Redis connection.
 */
export async function closeRedis(): Promise<void> {
  if (client?.status === "ready") {
    await client.quit();
    client = null;
  }
  connecting = null;
}
