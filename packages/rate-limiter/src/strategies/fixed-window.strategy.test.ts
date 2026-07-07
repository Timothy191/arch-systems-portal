import { FixedWindowStrategy } from "./fixed-window";
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

describe("FixedWindowStrategy", () => {
  let strategy: FixedWindowStrategy;
  let memoryStore: MemoryStore;
  let mockRedisClient: MockedObject<SimpleRedisClient>;
  let redisStore: RedisStore;

  beforeEach(() => {
    strategy = new FixedWindowStrategy();
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
    it("allows first request in window", async () => {
      const result = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(result.limit).toBe(10);
    });

    it("tracks requests within window", async () => {
      for (let i = 0; i < 5; i++) {
        const result = await strategy.check("user1", 10, 60000, memoryStore);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(9 - i);
      }
    });

    it("blocks requests when limit exceeded", async () => {
      for (let i = 0; i < 10; i++) {
        await strategy.check("user1", 10, 60000, memoryStore);
      }
      const result = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThanOrEqual(1);
    });

    it("resets count after window expires", async () => {
      vi.useFakeTimers();

      // Fill the window
      for (let i = 0; i < 10; i++) {
        await strategy.check("user1", 10, 60000, memoryStore);
      }

      // Should be blocked
      let result = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result.allowed).toBe(false);

      // Advance past window
      vi.advanceTimersByTime(60001);

      // Should be allowed again
      result = await strategy.check("user1", 10, 60000, memoryStore);
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

    it("calculates correct reset time", async () => {
      vi.useFakeTimers();
      const now = Date.now();
      const windowStart = Math.floor(now / 60000) * 60000;

      const result = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result.resetTime).toBe(windowStart + 60000);

      vi.useRealTimers();
    });

    it("handles corrupted stored data gracefully", async () => {
      await memoryStore.set("user1:fixed:123456", "invalid json", 60);
      const result = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result.allowed).toBe(true);
    });

    it("handles window boundary transitions", async () => {
      vi.useFakeTimers();

      // Request at end of window
      vi.setSystemTime(59999);
      await strategy.check("user1", 10, 60000, memoryStore);

      // Request at start of new window
      vi.setSystemTime(60001);
      const result = await strategy.check("user1", 10, 60000, memoryStore);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);

      vi.useRealTimers();
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
      const storedData = JSON.stringify({ count: 10, windowStart: Date.now() });
      mockRedisClient.get.mockResolvedValue(storedData);

      const result = await strategy.check("user1", 10, 60000, redisStore);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("handles Redis errors gracefully", async () => {
      mockRedisClient.get.mockRejectedValue(new Error("Redis error"));
      await expect(
        strategy.check("user1", 10, 60000, redisStore),
      ).rejects.toThrow("Redis error");
    });

    it("respects window boundaries with Redis", async () => {
      vi.useFakeTimers();
      const now = Date.now();
      const windowStart = Math.floor(now / 60000) * 60000;

      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue("OK");

      const result = await strategy.check("user1", 10, 60000, redisStore);
      expect(result.resetTime).toBe(windowStart + 60000);

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
  });
});
