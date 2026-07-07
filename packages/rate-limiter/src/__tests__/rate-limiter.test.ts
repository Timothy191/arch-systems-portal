import { MemoryStore } from "../stores/memory.store";
import { RedisStore } from "../stores/redis.store";
import { FixedWindowStrategy } from "../strategies/fixed-window";
import { SlidingWindowStrategy } from "../strategies/sliding-window";
import { TokenBucketStrategy } from "../strategies/token-bucket";
import { RateLimiter } from "../index";
import type { IStore, SimpleRedisClient } from "../interfaces";
import { RateLimitResult } from "../interfaces";

// ---------------------------------------------------------------------------
// MemoryStore
// ---------------------------------------------------------------------------
describe("MemoryStore", () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
  });

  it("should store and retrieve a value", async () => {
    await store.set("key1", "hello", 60);
    await expect(store.get("key1")).resolves.toBe("hello");
  });

  it("should return null for a missing key", async () => {
    await expect(store.get("missing")).resolves.toBeNull();
  });

  it("should expire entries after TTL", async () => {
    await store.set("key1", "hello", 0); // 0-second TTL → immediate expiry
    // Small delay to let time advance past the 0-second window
    await new Promise((r) => setTimeout(r, 5));
    await expect(store.get("key1")).resolves.toBeNull();
  });

  it("should delete a key", async () => {
    await store.set("key1", "hello", 60);
    await store.delete("key1");
    await expect(store.get("key1")).resolves.toBeNull();
  });

  it("should clear all keys", async () => {
    await store.set("a", "1", 60);
    await store.set("b", "2", 60);
    store.clear();
    await expect(store.get("a")).resolves.toBeNull();
    await expect(store.get("b")).resolves.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// RedisStore (with mock client)
// ---------------------------------------------------------------------------
describe("RedisStore", () => {
  let mockClient: jest.Mocked<SimpleRedisClient>;
  let store: RedisStore;

  beforeEach(() => {
    mockClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      eval: jest.fn(),
    };
    store = new RedisStore(mockClient);
  });

  it("should get a value from the client", async () => {
    mockClient.get.mockResolvedValue("hello");
    await expect(store.get("key1")).resolves.toBe("hello");
    expect(mockClient.get).toHaveBeenCalledWith("key1");
  });

  it("should set a value with TTL", async () => {
    await store.set("key1", "hello", 60);
    expect(mockClient.set).toHaveBeenCalledWith("key1", "hello", { EX: 60 });
  });

  it("should enforce minimum TTL of 1 second", async () => {
    await store.set("key1", "hello", 0);
    expect(mockClient.set).toHaveBeenCalledWith("key1", "hello", { EX: 1 });
  });

  it("should delete a key", async () => {
    mockClient.del.mockResolvedValue(1);
    await store.delete("key1");
    expect(mockClient.del).toHaveBeenCalledWith("key1");
  });

  it("should execute Lua eval script", async () => {
    mockClient.eval.mockResolvedValue('{"allowed":1}');
    const result = await store.eval("return 1", ["key1"], ["arg1"]);
    expect(result).toBe('{"allowed":1}');
    expect(mockClient.eval).toHaveBeenCalledWith("return 1", {
      keys: ["key1"],
      arguments: ["arg1"],
    });
  });

  it("should throw when client does not support eval", async () => {
    const simpleClient: SimpleRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    const noEvalStore = new RedisStore(simpleClient);
    await expect(noEvalStore.eval("script", ["k"], ["a"])).rejects.toThrow(
      "does not support eval",
    );
  });
});

// ---------------------------------------------------------------------------
// FixedWindowStrategy
// ---------------------------------------------------------------------------
describe("FixedWindowStrategy", () => {
  let store: MemoryStore;
  let strategy: FixedWindowStrategy;

  beforeEach(() => {
    store = new MemoryStore();
    strategy = new FixedWindowStrategy();
  });

  it("should allow requests within the limit", async () => {
    const result = await strategy.check("key", 5, 60000, store);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.limit).toBe(5);
  });

  it("should block requests when limit is exceeded", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await strategy.check("key", 5, 60000, store);
      expect(res.allowed).toBe(true);
    }
    const blocked = await strategy.check("key", 5, 60000, store);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("should reset on a new window", async () => {
    // Use a very short window (1ms) so the next call falls into a new window
    const shortWindow = 1;
    for (let i = 0; i < 3; i++) {
      await strategy.check("key", 3, shortWindow, store);
    }
    // All 3 consumed — next should block
    let result = await strategy.check("key", 3, shortWindow, store);
    expect(result.allowed).toBe(false);

    // Wait for window to pass
    await new Promise((r) => setTimeout(r, 10));

    // Next request should be in a new window
    result = await strategy.check("key", 3, shortWindow, store);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("should use different cache keys for different identifiers", async () => {
    const result1 = await strategy.check("user-1", 1, 60000, store);
    expect(result1.allowed).toBe(true);

    const result2 = await strategy.check("user-2", 1, 60000, store);
    expect(result2.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SlidingWindowStrategy
// ---------------------------------------------------------------------------
describe("SlidingWindowStrategy", () => {
  let store: MemoryStore;
  let strategy: SlidingWindowStrategy;

  beforeEach(() => {
    store = new MemoryStore();
    strategy = new SlidingWindowStrategy();
  });

  it("should allow requests within the limit", async () => {
    const result = await strategy.check("key", 3, 60000, store);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("should block when limit is reached", async () => {
    for (let i = 0; i < 3; i++) {
      await strategy.check("key", 3, 60000, store);
    }
    const blocked = await strategy.check("key", 3, 60000, store);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("should expire old timestamps outside the window", async () => {
    // First request sets a timestamp at t=0
    const result = await strategy.check("key", 2, 50, store);
    expect(result.allowed).toBe(true);

    // Fast second request within window
    const result2 = await strategy.check("key", 2, 50, store);
    expect(result2.allowed).toBe(true);

    // Third should block (2/2)
    const blocked = await strategy.check("key", 2, 50, store);
    expect(blocked.allowed).toBe(false);

    // Wait for window to slide past first timestamp
    await new Promise((r) => setTimeout(r, 60));

    // After waiting past the window, the first timestamp should be expired,
    // so only 1 timestamp remains in the window → should allow
    const result3 = await strategy.check("key", 2, 50, store);
    expect(result3.allowed).toBe(true);
  });

  it("should handle corrupted stored data gracefully", async () => {
    // Manually store invalid JSON
    await store.set("key:sliding", "not-json", 60);

    const result = await strategy.check("key", 3, 60000, store);
    expect(result.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TokenBucketStrategy
// ---------------------------------------------------------------------------
describe("TokenBucketStrategy", () => {
  let store: MemoryStore;
  let strategy: TokenBucketStrategy;

  beforeEach(() => {
    store = new MemoryStore();
    strategy = new TokenBucketStrategy();
  });

  it("should allow requests when tokens are available", async () => {
    const result = await strategy.check("key", 10, 60000, store);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(8); // 10 - 1 = 9, but maybe some refill
  });

  it("should block when tokens run out (no refill window yet)", async () => {
    for (let i = 0; i < 3; i++) {
      await strategy.check("key", 3, 60000, store);
    }
    const blocked = await strategy.check("key", 3, 60000, store);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("should refill tokens over time", async () => {
    // Fast rate: 10 tokens per 100ms = 1 token per 10ms
    const veryFastWindow = 100;
    const limit = 10;

    // Use all tokens
    for (let i = 0; i < limit; i++) {
      await strategy.check("key", limit, veryFastWindow, store);
    }
    // Should be blocked
    let result = await strategy.check("key", limit, veryFastWindow, store);
    expect(result.allowed).toBe(false);

    // Wait for refill (at least 1 token)
    await new Promise((r) => setTimeout(r, 15));

    // Should get a token back
    result = await strategy.check("key", limit, veryFastWindow, store);
    expect(result.allowed).toBe(true);
  });

  it("should reset tokens for a new key", async () => {
    const result1 = await strategy.check("key-a", 1, 60000, store);
    expect(result1.allowed).toBe(true);

    const result2 = await strategy.check("key-b", 1, 60000, store);
    expect(result2.allowed).toBe(true);
  });

  it("should fall back to JS logic when store has no eval", async () => {
    const noEvalStore: IStore = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const result = await strategy.check("key", 5, 60000, noEvalStore);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// RateLimiter (integration)
// ---------------------------------------------------------------------------
describe("RateLimiter", () => {
  it("should apply fixed-window strategy with MemoryStore", async () => {
    const limiter = new RateLimiter({
      store: new MemoryStore(),
      strategy: new FixedWindowStrategy(),
      limit: 3,
      windowMs: 60000,
      keyPrefix: "test:",
    });

    const r1 = await limiter.check("user-1");
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = await limiter.check("user-1");
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = await limiter.check("user-1");
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);

    const r4 = await limiter.check("user-1");
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
  });

  it("should apply sliding-window strategy", async () => {
    const limiter = new RateLimiter({
      store: new MemoryStore(),
      strategy: new SlidingWindowStrategy(),
      limit: 2,
      windowMs: 60000,
    });

    expect((await limiter.check("x")).allowed).toBe(true);
    expect((await limiter.check("x")).allowed).toBe(true);
    expect((await limiter.check("x")).allowed).toBe(false);
  });

  it("should apply token-bucket strategy", async () => {
    const limiter = new RateLimiter({
      store: new MemoryStore(),
      strategy: new TokenBucketStrategy(),
      limit: 5,
      windowMs: 60000,
    });

    // Consume 5 tokens
    for (let i = 0; i < 5; i++) {
      expect((await limiter.check("x")).allowed).toBe(true);
    }
    // 6th should be blocked
    expect((await limiter.check("x")).allowed).toBe(false);
  });

  it("should use different key prefixes for isolation", async () => {
    const limiterA = new RateLimiter({
      store: new MemoryStore(),
      strategy: new FixedWindowStrategy(),
      limit: 1,
      windowMs: 60000,
      keyPrefix: "service-a:",
    });

    const limiterB = new RateLimiter({
      store: new MemoryStore(),
      strategy: new FixedWindowStrategy(),
      limit: 1,
      windowMs: 60000,
      keyPrefix: "service-b:",
    });

    // Both should allow since they use different prefixes
    expect((await limiterA.check("user-1")).allowed).toBe(true);
    expect((await limiterB.check("user-1")).allowed).toBe(true);

    // Second call on limiterA should block
    expect((await limiterA.check("user-1")).allowed).toBe(false);
  });
});
