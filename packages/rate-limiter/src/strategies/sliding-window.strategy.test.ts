import { SlidingWindowStrategy } from "./sliding-window";
import { MemoryStore } from "../stores/memory.store";
import { RedisStore, SimpleRedisClient } from "../stores/redis.store";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

describe("SlidingWindowStrategy", () => {
  let strategy: SlidingWindowStrategy;
  let memoryStore: MemoryStore;
  let mockRedisClient: SimpleRedisClient;
  let redisStore: RedisStore;

  beforeEach(() => {
    strategy = new SlidingWindowStrategy();
    memoryStore = new MemoryStore();
    mockRedisClient = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };
    redisStore = new RedisStore(mockRedisClient);
  });

  afterEach(() => {
    memoryStore.clear();
    vi.clearAllMocks();
  });

  describe("with MemoryStore", () => {
    it("allows first request", async () => {
      const result = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(result.limit).toBe(10);
    });

    it("tracks requests within sliding window", async () => {
      vi.useFakeTimers();
      
      for (let i = 0; i < 5; i++) {
        const result = await strategy.check("user1", 10, 60000, memoryStore);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(9 - i);
        vi.advanceTimersByTime(1000);
      }
      
      vi.useRealTimers();
    });

    it("blocks when limit exceeded", async () => {
      for (let i = 0; i < 10; i++) {
        await strategy.check("user1", 10, 60000, memoryStore);
      }
      const result = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThanOrEqual(1);
    });

    it("slides window - allows requests after old ones expire", async () => {
      vi.useFakeTimers();
      
      // Fill the window
      for (let i = 0; i < 10; i++) {
        await strategy.check("user1", 10, 60000, memoryStore);
        vi.advanceTimersByTime(1000);
      }
      
      // Should be blocked
      let result = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result.allowed).toBe(false);
      
      // Advance past oldest request
      vi.advanceTimersByTime(10000);
      
      // Should be allowed again
      result = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result.allowed).toBe(true);
      
      vi.useRealTimers();
    });

    it("filters expired timestamps", async () => {
      vi.useFakeTimers();
      
      // Add requests
      for (let i = 0; i < 5; i++) {
        await strategy.check("user1", 10, 60000, memoryStore);
        vi.advanceTimersByTime(1000);
      }
      
      // Advance past window
      vi.advanceTimersByTime(60001);
      
      // Should start fresh
      const result = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      
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

    it("calculates correct reset time based on oldest active request", async () => {
      vi.useFakeTimers();
      
      await strategy.check("user1", 10, 60000, memoryStore);
      const firstResult = await strategy.check("user1", 10, 60000, memoryStore);
      
      vi.advanceTimersByTime(5000);
      const secondResult = await strategy.check("user1", 10, 60000, memoryStore);
      
      expect(secondResult.resetTime).toBeGreaterThan(firstResult.resetTime);
      
      vi.useRealTimers();
    });

    it("handles corrupted stored data gracefully", async () => {
      await memoryStore.set("user1:sliding", "invalid json", 60);
      const result = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result.allowed).toBe(true);
    });

    it("handles empty timestamp array", async () => {
      await memoryStore.set("user1:sliding", "[]", 60);
      const result = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });
  });

  describe("with RedisStore", () => {
    it("allows first request", async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue("OK");

      const result = await strategy.check("user1", 10, 60000, redisStore);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it("tracks requests with Redis", async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue("OK");

      for (let i = 0; i < 5; i++) {
        const result = await strategy.check("user1", 10, 60000, redisStore);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(9 - i);
      }
    });

    it("blocks when limit exceeded with Redis", async () => {
      const now = Date.now();
      const timestamps = Array(10).fill(now);
      mockRedisClient.get.mockResolvedValue(JSON.stringify(timestamps));

      const result = await strategy.check("user1", 10, 60000, redisStore);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("handles Redis errors gracefully", async () => {
      mockRedisClient.get.mockRejectedValue(new Error("Redis error"));
      await expect(strategy.check("user1", 10, 60000, redisStore)).rejects.toThrow("Redis error");
    });

    it("filters expired timestamps with Redis", async () => {
      vi.useFakeTimers();
      const now = Date.now();
      const oldTimestamps = [now - 70000, now - 65000, now - 60001];
      mockRedisClient.get.mockResolvedValue(JSON.stringify(oldTimestamps));
      mockRedisClient.set.mockResolvedValue("OK");

      const result = await strategy.check("user1", 10, 60000, redisStore);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      
      vi.useRealTimers();
    });
  });

  describe("precision and edge cases", () => {
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

    it("handles burst traffic", async () => {
      vi.useFakeTimers();
      
      // Send burst of requests
      const results = await Promise.all(
        Array(10).fill(null).map(() => strategy.check("user1", 10, 60000, memoryStore))
      );
      
      results.forEach(result => {
        expect(result.allowed).toBe(true);
      });
      
      // Next request should be blocked
      const blockedResult = await strategy.check("user1", 10, 60000, memoryStore);
      expect(blockedResult.allowed).toBe(false);
      
      vi.useRealTimers();
    });

    it("maintains precision with rapid requests", async () => {
      vi.useFakeTimers();
      
      // Rapid requests within same millisecond
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(await strategy.check("user1", 10, 60000, memoryStore));
      }
      
      const allowedCount = results.filter(r => r.allowed).length;
      expect(allowedCount).toBe(10);
      
      vi.useRealTimers();
    });

    it("calculates retry after correctly", async () => {
      vi.useFakeTimers();
      
      // Fill the window
      for (let i = 0; i < 10; i++) {
        await strategy.check("user1", 10, 60000, memoryStore);
      }
      
      const result = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(60);
      
      vi.useRealTimers();
    });
  });

  describe("timestamp management", () => {
    it("stores timestamps in chronological order", async () => {
      vi.useFakeTimers();
      
      await strategy.check("user1", 10, 60000, memoryStore);
      vi.advanceTimersByTime(1000);
      await strategy.check("user1", 10, 60000, memoryStore);
      vi.advanceTimersByTime(1000);
      await strategy.check("user1", 10, 60000, memoryStore);
      
      const stored = await memoryStore.get("user1:sliding");
      const timestamps = JSON.parse(stored || "[]");
      
      expect(timestamps).toHaveLength(3);
      expect(timestamps[0]).toBeLessThan(timestamps[1]);
      expect(timestamps[1]).toBeLessThan(timestamps[2]);
      
      vi.useRealTimers();
    });

    it("removes timestamps outside window", async () => {
      vi.useFakeTimers();
      
      // Add requests
      for (let i = 0; i < 5; i++) {
        await strategy.check("user1", 10, 60000, memoryStore);
        vi.advanceTimersByTime(1000);
      }
      
      // Advance past window
      vi.advanceTimersByTime(60001);
      
      // Add new request
      await strategy.check("user1", 10, 60000, memoryStore);
      
      const stored = await memoryStore.get("user1:sliding");
      const timestamps = JSON.parse(stored || "[]");
      
      // Should only have the new request
      expect(timestamps).toHaveLength(1);
      
      vi.useRealTimers();
    });
  });
});
