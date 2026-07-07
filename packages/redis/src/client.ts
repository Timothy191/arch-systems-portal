import { createClient, type RedisClientType } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let client: RedisClientType | null = null;
let connecting: Promise<RedisClientType> | null = null;

/**
 * Returns the Redis client if it is currently open, otherwise null.
 * Useful for non-critical operations (like telemetry) to avoid triggering connections.
 */
export function getClientIfOpen(): RedisClientType | null {
  return client?.isOpen ? client : null;
}

/**
 * Get or create the singleton Redis client.
 * Reconnection behaviour:
 *  - Existing open socket → returned immediately.
 *  - In-flight connect → awaited (prevents thundering herd).
 *  - On connect/disconnect error → reset state so the next caller retries.
 */
export async function getRedisClient(): Promise<RedisClientType> {
  if (client?.isOpen) return client;
  if (connecting) return connecting;

  connecting = (async () => {
    // Cast through unknown to resolve nominal type mismatch from pnpm hoisting
    // of duplicate @redis/client versions, without disabling type checking.
    const next = createClient({
      url: REDIS_URL,
      socket: {
        keepAlive: 5000,
        reconnectStrategy(retries: number) {
          if (retries > 3) {
            return new Error("Redis connection failed");
          }
          return Math.min(retries * 50, 500);
        },
      },
    }) as unknown as RedisClientType;

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
 * Call on shutdown or test cleanup.
 */
export async function closeRedis(): Promise<void> {
  if (client?.isOpen) {
    await client.quit();
    client = null;
  }
  connecting = null;
}
