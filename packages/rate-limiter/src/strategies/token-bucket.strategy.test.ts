import { TokenBucketStrategy } from "./token-bucket";
import { MemoryStore } from "../stores/memory.store";
import { RedisStore, SimpleRedisClient } from "../stores/redis.store";
import {
  vi,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  type MockedObject,
} from "vitest";

describe("TokenBucketStrategy", () => {
  let strategy: TokenBucketStrategy;
  let memoryStore: MemoryStore;
  let mockRedisClient: MockedObject<SimpleRedisClient>;
  let redisStore: RedisStore;

  beforeEach(() => {
    strategy = new TokenBucketStrategy();
    memoryStore = new MemoryStore();
    mockRedisClient = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      eval: vi.fn(),
    };
    redisStore = new RedisStore(mockRedisClient);
  });

  afterEach(() => {
    memoryStore.clear();
    vi.clearAllMocks();
  });

  describe("with MemoryStore (JavaScript fallback)", () => {
    it("allows first request with full bucket", async () => {
      const result = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(result.limit).toBe(10);
    });

    it("consumes tokens from bucket", async () => {
      for (let i = 0; i < 5; i++) {
        const result = await strategy.check("user1", 10, 60000, memoryStore);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(9 - i);
      }
    });

    it("blocks when bucket is empty", async () => {
      for (let i = 0; i < 10; i++) {
        await strategy.check("user1", 10, 60000, memoryStore);
      }
      const result = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("refills tokens over time", async () => {
      vi.useFakeTimers();

      // Empty the bucket
      for (let i = 0; i < 10; i++) {
        await strategy.check("user1", 10, 60000, memoryStore);
      }

      // Should be blocked
      let result = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result.allowed).toBe(false);

      // Advance time to allow refill (half window = 5 tokens)
      vi.advanceTimersByTime(30000);

      // Should be allowed again
      result = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThanOrEqual(4);

      vi.useRealTimers();
    });

    it("handles multiple keys independently", async () => {
      const result1 = await strategy.check("user1", 10, 60000, memoryStore);
      const result2 = await strategy.check("user2", 10, 60000, memoryStore);

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result1.remaining).toBe(9);
      expect(result2.remaining).toBe(9);
    });

    it("calculates correct reset time", async () => {
      vi.useFakeTimers();
      const now = Date.now();

      const result = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result.resetTime).toBeGreaterThan(now);

      vi.useRealTimers();
    });

    it("handles corrupted stored data gracefully", async () => {
      await memoryStore.set("user1:tokenbucket", "invalid json", 60);
      const result = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result.allowed).toBe(true);
    });

    it("handles burst capacity correctly", async () => {
      vi.useFakeTimers();

      // Start with full bucket
      const result1 = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result1.remaining).toBe(9);

      // Wait for partial refill
      vi.advanceTimersByTime(30000);

      // Should have refilled some tokens
      const result2 = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result2.remaining).toBeGreaterThanOrEqual(4);

      vi.useRealTimers();
    });
  });

  describe("with RedisStore (Lua script)", () => {
    it("uses Lua script when eval is available", async () => {
      const mockResult = {
        allowed: 1,
        limit: 10,
        remaining: 9,
        reset_time: Date.now() + 60000,
      };
      mockRedisClient.eval.mockResolvedValue(JSON.stringify(mockResult));

      const result = await strategy.check("user1", 10, 60000, redisStore);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(mockRedisClient.eval).toHaveBeenCalled();
    });

    it("blocks when Lua script returns allowed: 0", async () => {
      const now = Date.now();
      const mockResult = {
        allowed: 0,
        limit: 10,
        remaining: 0,
        reset_time: now + 60000,
      };
      mockRedisClient.eval.mockResolvedValue(JSON.stringify(mockResult));

      const result = await strategy.check("user1", 10, 60000, redisStore);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("falls back to JavaScript on Lua script error", async () => {
      mockRedisClient.eval.mockRejectedValue(new Error("Lua error"));
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue("OK");

      const result = await strategy.check("user1", 10, 60000, redisStore);
      expect(result.allowed).toBe(true);
      expect(mockRedisClient.get).toHaveBeenCalled();
    });

    it("handles Redis eval errors gracefully", async () => {
      mockRedisClient.eval.mockRejectedValue(
        new Error("Redis connection error"),
      );

      // Should fall back to JavaScript
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue("OK");

      const result = await strategy.check("user1", 10, 60000, redisStore);
      expect(result.allowed).toBe(true);
    });

    it("passes correct parameters to Lua script", async () => {
      const mockResult = {
        allowed: 1,
        limit: 10,
        remaining: 9,
        reset_time: Date.now() + 60000,
      };
      mockRedisClient.eval.mockResolvedValue(JSON.stringify(mockResult));

      await strategy.check("user1", 10, 60000, redisStore);

      expect(mockRedisClient.eval).toHaveBeenCalledWith(
        expect.any(String),
        ["user1"],
        ["10", "60000", expect.any(String), "1"],
      );
    });

    it("handles malformed Lua script response", async () => {
      mockRedisClient.eval.mockResolvedValue("invalid json");
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue("OK");

      const result = await strategy.check("user1", 10, 60000, redisStore);
      expect(result.allowed).toBe(true);
    });
  });

  describe("refill rate calculations", () => {
    it("refills at correct rate", async () => {
      vi.useFakeTimers();

      // Empty bucket
      for (let i = 0; i < 10; i++) {
        await strategy.check("user1", 10, 60000, memoryStore);
      }

      // Wait for half the window (should refill 5 tokens)
      vi.advanceTimersByTime(30000);

      const result = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result.remaining).toBeGreaterThanOrEqual(4);
      expect(result.remaining).toBeLessThanOrEqual(5);

      vi.useRealTimers();
    });

    it("caps refill at bucket capacity", async () => {
      vi.useFakeTimers();

      // Empty bucket
      for (let i = 0; i < 10; i++) {
        await strategy.check("user1", 10, 60000, memoryStore);
      }

      // Wait for more than full window
      vi.advanceTimersByTime(120000);

      const result = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);

      vi.useRealTimers();
    });

    it("handles partial refills correctly", async () => {
      vi.useFakeTimers();

      // Use 5 tokens
      for (let i = 0; i < 5; i++) {
        await strategy.check("user1", 10, 60000, memoryStore);
      }

      // Wait for quarter window (should refill 2.5 tokens)
      vi.advanceTimersByTime(15000);

      const result = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result.remaining).toBeGreaterThanOrEqual(6);
      expect(result.remaining).toBeLessThanOrEqual(7);

      vi.useRealTimers();
    });
  });

  describe("boundary conditions", () => {
    it("handles limit of 1", async () => {
      const result1 = await strategy.check("user1", 1, 60000, memoryStore);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(0);

      const result2 = await strategy.check("user1", 1, 60000, memoryStore);
      expect(result2.allowed).toBe(false);
    });

    it("handles very small windows", async () => {
      vi.useFakeTimers();

      const result1 = await strategy.check("user1", 10, 100, memoryStore);
      expect(result1.allowed).toBe(true);

      vi.advanceTimersByTime(101);

      const result2 = await strategy.check("user1", 10, 100, memoryStore);
      expect(result2.allowed).toBe(true);

      vi.useRealTimers();
    });

    it("handles very large windows", async () => {
      const result = await strategy.check("user1", 10, 86400000, memoryStore);
      expect(result.allowed).toBe(true);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it("handles zero remaining correctly", async () => {
      for (let i = 0; i < 10; i++) {
        await strategy.check("user1", 10, 60000, memoryStore);
      }
      const result = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result.remaining).toBe(0);
    });

    it("calculates retry after correctly", async () => {
      vi.useFakeTimers();

      // Empty the bucket
      for (let i = 0; i < 10; i++) {
        await strategy.check("user1", 10, 60000, memoryStore);
      }

      const result = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(60);

      vi.useRealTimers();
    });
  });

  describe("distributed coordination", () => {
    it("handles concurrent requests with Redis", async () => {
      const mockResult = {
        allowed: 1,
        limit: 10,
        remaining: 8,
        reset_time: Date.now() + 60000,
      };
      mockRedisClient.eval.mockResolvedValue(JSON.stringify(mockResult));

      const results = await Promise.all([
        strategy.check("user1", 10, 60000, redisStore),
        strategy.check("user1", 10, 60000, redisStore),
      ]);

      expect(results).toHaveLength(2);
      results.forEach((result) => {
        expect(result.allowed).toBe(true);
      });
    });

    it("maintains consistency across distributed requests", async () => {
      const mockResult1 = {
        allowed: 1,
        limit: 10,
        remaining: 9,
        reset_time: Date.now() + 60000,
      };
      const mockResult2 = {
        allowed: 1,
        limit: 10,
        remaining: 8,
        reset_time: Date.now() + 60000,
      };
      mockRedisClient.eval
        .mockResolvedValueOnce(JSON.stringify(mockResult1))
        .mockResolvedValueOnce(JSON.stringify(mockResult2));

      const result1 = await strategy.check("user1", 10, 60000, redisStore);
      const result2 = await strategy.check("user1", 10, 60000, redisStore);

      expect(result1.remaining).toBe(9);
      expect(result2.remaining).toBe(8);
    });
  });

  describe("reset time calculation", () => {
    it("calculates reset time based on remaining tokens", async () => {
      vi.useFakeTimers();

      // Use 5 tokens
      for (let i = 0; i < 5; i++) {
        await strategy.check("user1", 10, 60000, memoryStore);
      }

      const result = await strategy.check("user1", 10, 60000, memoryStore);
      const now = Date.now();

      // Reset time should be time to refill remaining tokens
      expect(result.resetTime).toBeGreaterThan(now);
      expect(result.resetTime).toBeLessThanOrEqual(now + 60000);

      vi.useRealTimers();
    });

    it("handles reset time when bucket is empty", async () => {
      vi.useFakeTimers();

      // Empty bucket
      for (let i = 0; i < 10; i++) {
        await strategy.check("user1", 10, 60000, memoryStore);
      }

      const result = await strategy.check("user1", 10, 60000, memoryStore);
      const now = Date.now();

      // Reset time should be time to refill 1 token
      expect(result.resetTime).toBeGreaterThan(now);
      expect(result.resetTime).toBeLessThanOrEqual(now + 6000);

      vi.useRealTimers();
    });
  });
});
