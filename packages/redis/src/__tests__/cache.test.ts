import {
  cacheGet,
  cacheSet,
  cacheGetWithStats,
  cacheWrap,
  cacheDelete,
  cacheDeletePattern,
  cacheEvictL1ByPrefix,
  clearMemoryCache,
  cacheSetWithTags,
} from "../cache";

// Mock the dynamic import of ./client.js so getRedisClientSafe returns a mock
jest.mock("../client", () => {
  let mockRedis: Record<string, string> = {};
  return {
    getRedisClient: jest.fn().mockResolvedValue({
      isOpen: true,
      get: jest.fn(async (key: string) => mockRedis[key] ?? null),
      setEx: jest.fn(
        async (key: string, _ttl: number, value: string) => {
          mockRedis[key] = value;
        },
      ),
      del: jest.fn(async (key: string) => {
        delete mockRedis[key];
        return 1;
      }),
      multi: jest.fn(() => ({
        sAdd: jest.fn(),
        exec: jest.fn().mockResolvedValue([]),
      })),
    }),
    closeRedis: jest.fn(),
  };
});

// Mock the invalidation.ts to avoid side effects
jest.mock("../invalidation", () => ({
  indexCacheKeyByTags: jest.fn().mockResolvedValue(undefined),
  cacheInvalidateTags: jest.fn().mockResolvedValue(0),
  cacheInvalidatePrefixes: jest.fn().mockResolvedValue(0),
}));

// Mock stats.ts to avoid side effects
jest.mock("../stats", () => ({
  recordCacheHit: jest.fn(),
  recordCacheMiss: jest.fn(),
  recordRedisError: jest.fn(),
  resetCacheStats: jest.fn(),
}));

// Mock stats.js as well (the import might use .js extension)
jest.mock("../stats.js", () => ({
  recordCacheHit: jest.fn(),
  recordCacheMiss: jest.fn(),
  recordRedisError: jest.fn(),
  resetCacheStats: jest.fn(),
}));

// Mock invalidation.js for the .js extension imports
jest.mock("../invalidation.js", () => ({
  indexCacheKeyByTags: jest.fn().mockResolvedValue(undefined),
  cacheInvalidateTags: jest.fn().mockResolvedValue(0),
  cacheInvalidatePrefixes: jest.fn().mockResolvedValue(0),
}));

// Mock client.js for the .js extension imports
jest.mock("../client.js", () => ({
  getRedisClient: jest.fn().mockResolvedValue({
    isOpen: true,
    get: jest.fn().mockResolvedValue(null),
    setEx: jest.fn(),
    del: jest.fn().mockResolvedValue(1),
    multi: jest.fn(() => ({
      sAdd: jest.fn(),
      exec: jest.fn(),
    })),
  }),
  closeRedis: jest.fn(),
}));

beforeEach(() => {
  clearMemoryCache();
});

describe("cacheGet / cacheSet", () => {
  it("should set and get a value from L1 (memory) cache", async () => {
    await cacheSet("key1", { hello: "world" }, 60);
    const result = await cacheGet<{ hello: string }>("key1");
    expect(result).toEqual({ hello: "world" });
  });

  it("should return null for a missing key", async () => {
    const result = await cacheGet("nonexistent");
    expect(result).toBeNull();
  });

  it("should return null after TTL expiry (L1)", async () => {
    await cacheSet("short", "value", 0); // 0-second TTL
    // Since the TTL is 0, L1 TTL will be Math.min(0, 30) = 0
    // So the entry should expire immediately
    const result = await cacheGet("short");
    expect(result).toBeNull();
  });

  it("should overwrite an existing key", async () => {
    await cacheSet("key", "old", 60);
    await cacheSet("key", "new", 60);
    const result = await cacheGet("key");
    expect(result).toBe("new");
  });
});

describe("cacheGetWithStats", () => {
  it("should return source 'l1' for memory hits", async () => {
    await cacheSet("key", 42, 60);
    const result = await cacheGetWithStats<number>("key");
    expect(result.value).toBe(42);
    expect(result.source).toBe("l1");
  });

  it("should return source 'l1' for memory hits with objects", async () => {
    await cacheSet("obj", { a: 1 }, 60);
    const result = await cacheGetWithStats<{ a: number }>("obj");
    expect(result.value).toEqual({ a: 1 });
    expect(result.source).toBe("l1");
  });

  it("should return null source for cache misses", async () => {
    const result = await cacheGetWithStats("missing-key");
    expect(result.value).toBeNull();
  });
});

describe("cacheWrap", () => {
  it("should call the factory function on cache miss and cache the result", async () => {
    const factory = jest.fn().mockResolvedValue("computed");
    const result = await cacheWrap("wrap-key", factory, 60);
    expect(result).toBe("computed");
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("should return cached value on subsequent calls", async () => {
    const factory = jest.fn().mockResolvedValue("expensive");
    await cacheWrap("coalesce-key", factory, 60);
    const result = await cacheWrap("coalesce-key", factory, 60);
    expect(result).toBe("expensive");
    // Should only call factory once (first call + second call hits cache)
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("should coalesce concurrent requests for the same key", async () => {
    let callCount = 0;
    const factory = jest.fn().mockImplementation(async () => {
      callCount++;
      await new Promise((r) => setTimeout(r, 20));
      return `result-${callCount}`;
    });

    // Fire two concurrent requests (rely on activeFetches coalescing)
    const [r1, r2] = await Promise.all([
      cacheWrap("concurrent", factory, 60),
      cacheWrap("concurrent", factory, 60),
    ]);

    // Both should get the same result and factory should only be called once
    expect(r1).toBe("result-1");
    expect(r2).toBe("result-1");
    expect(factory).toHaveBeenCalledTimes(1);
  });
});

describe("cacheDelete", () => {
  it("should delete a key from cache", async () => {
    await cacheSet("delete-me", "value", 60);
    await cacheDelete("delete-me");
    const result = await cacheGet("delete-me");
    expect(result).toBeNull();
  });

  it("should not throw when deleting a missing key", async () => {
    await expect(cacheDelete("already-missing")).resolves.not.toThrow();
  });
});

describe("cacheDeletePattern", () => {
  it("should delete keys matching a pattern", async () => {
    await cacheSet("users:1", "a", 60);
    await cacheSet("users:2", "b", 60);
    await cacheSet("other", "c", 60);

    // Should not throw — delegates to SCAN-based invalidation
    await expect(cacheDeletePattern("users:*")).resolves.not.toThrow();

    // The memory cache should be cleared for matching keys
    // Note: L1 deletion uses prefix matching without wildcard
    await expect(cacheGet("users:1")).resolves.toBeNull();
    await expect(cacheGet("users:2")).resolves.toBeNull();
    await expect(cacheGet("other")).resolves.toBe("c");
  });
});

describe("cacheEvictL1ByPrefix", () => {
  it("should clear L1 entries matching a prefix", async () => {
    await cacheSet("dept:1:data", "x", 60);
    await cacheSet("dept:2:data", "y", 60);
    await cacheSet("other", "z", 60);

    cacheEvictL1ByPrefix("dept:");

    await expect(cacheGet("dept:1:data")).resolves.toBeNull();
    await expect(cacheGet("dept:2:data")).resolves.toBeNull();
    await expect(cacheGet("other")).resolves.toBe("z");
  });
});

describe("clearMemoryCache", () => {
  it("should clear the entire L1 cache", async () => {
    await cacheSet("a", 1, 60);
    await cacheSet("b", 2, 60);
    clearMemoryCache();

    await expect(cacheGet("a")).resolves.toBeNull();
    await expect(cacheGet("b")).resolves.toBeNull();
  });
});

describe("cacheSetWithTags", () => {
  it("should set value and index tags", async () => {
    // Import the mock to verify it was called
    const { indexCacheKeyByTags } = jest.requireMock("../invalidation");

    await cacheSetWithTags("tagged-key", { data: 1 }, 60, ["tag1", "tag2"]);

    // Verify value is cached
    const result = await cacheGet("tagged-key");
    expect(result).toEqual({ data: 1 });

    // Verify tags were indexed
    expect(indexCacheKeyByTags).toHaveBeenCalledWith("tagged-key", [
      "tag1",
      "tag2",
    ]);
  });

  it("should not index tags when none provided", async () => {
    const { indexCacheKeyByTags } = jest.requireMock("../invalidation");

    await cacheSetWithTags("no-tags", "val", 60);

    expect(indexCacheKeyByTags).not.toHaveBeenCalled();
  });
});
