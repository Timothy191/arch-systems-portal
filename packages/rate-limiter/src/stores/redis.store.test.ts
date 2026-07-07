import { RedisStore, SimpleRedisClient } from "./redis.store";
import { vi, describe, it, expect, beforeEach, afterEach, type MockedObject } from "vitest";

describe("RedisStore", () => {
  let mockClient: MockedObject<SimpleRedisClient>;
  let store: RedisStore;

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      eval: vi.fn(),
    };
    store = new RedisStore(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("get", () => {
    it("delegates to client get", async () => {
      mockClient.get.mockResolvedValue("value");
      const result = await store.get("key1");
      expect(mockClient.get).toHaveBeenCalledWith("key1");
      expect(result).toBe("value");
    });

    it("returns null when client returns null", async () => {
      mockClient.get.mockResolvedValue(null);
      const result = await store.get("key1");
      expect(result).toBeNull();
    });

    it("handles client errors", async () => {
      mockClient.get.mockRejectedValue(new Error("Connection error"));
      await expect(store.get("key1")).rejects.toThrow("Connection error");
    });
  });

  describe("set", () => {
    it("delegates to client set with EX option", async () => {
      mockClient.set.mockResolvedValue("OK");
      await store.set("key1", "value1", 60);
      expect(mockClient.set).toHaveBeenCalledWith("key1", "value1", { EX: 60 });
    });

    it("ensures minimum TTL of 1 second", async () => {
      mockClient.set.mockResolvedValue("OK");
      await store.set("key1", "value1", 0);
      expect(mockClient.set).toHaveBeenCalledWith("key1", "value1", { EX: 1 });
    });

    it("passes TTL as-is when >= 1", async () => {
      mockClient.set.mockResolvedValue("OK");
      await store.set("key1", "value1", 3600);
      expect(mockClient.set).toHaveBeenCalledWith("key1", "value1", { EX: 3600 });
    });

    it("handles client errors", async () => {
      mockClient.set.mockRejectedValue(new Error("Connection error"));
      await expect(store.set("key1", "value1", 60)).rejects.toThrow("Connection error");
    });
  });

  describe("delete", () => {
    it("delegates to client del", async () => {
      mockClient.del.mockResolvedValue(1);
      await store.delete("key1");
      expect(mockClient.del).toHaveBeenCalledWith("key1");
    });

    it("handles client errors", async () => {
      mockClient.del.mockRejectedValue(new Error("Connection error"));
      await expect(store.delete("key1")).rejects.toThrow("Connection error");
    });
  });

  describe("eval", () => {
    it("delegates to client eval when supported", async () => {
      const mockResult = { allowed: 1, remaining: 5 };
      mockClient.eval.mockResolvedValue(JSON.stringify(mockResult));
      const script = "return 1";
      const keys = ["key1"];
      const args = ["10", "60000"];

      const result = await store.eval(script, keys, args);
      expect(mockClient.eval).toHaveBeenCalledWith(script, { keys, arguments: args });
      expect(result).toEqual(mockResult);
    });

    it("throws error when client does not support eval", async () => {
      const clientWithoutEval: SimpleRedisClient = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
      };
      const storeWithoutEval = new RedisStore(clientWithoutEval);

      await expect(storeWithoutEval.eval("script", [], [])).rejects.toThrow(
        "Redis client does not support eval method"
      );
    });

    it("handles client eval errors", async () => {
      mockClient.eval.mockRejectedValue(new Error("Lua script error"));
      await expect(store.eval("script", [], [])).rejects.toThrow("Lua script error");
    });
  });

  describe("distributed coordination", () => {
    it("supports atomic operations via eval", async () => {
      const mockResult = { allowed: 1, remaining: 9, limit: 10 };
      mockClient.eval.mockResolvedValue(JSON.stringify(mockResult));

      const result = await store.eval("return 1", ["key1"], ["10", "60000"]);
      expect(result).toEqual(mockResult);
    });

    it("handles concurrent requests through eval", async () => {
      const mockResult = { allowed: 1, remaining: 8, limit: 10 };
      mockClient.eval.mockResolvedValue(JSON.stringify(mockResult));

      const results = await Promise.all([
        store.eval("return 1", ["key1"], ["10", "60000"]),
        store.eval("return 1", ["key1"], ["10", "60000"]),
      ]);

      expect(results).toHaveLength(2);
      expect(mockClient.eval).toHaveBeenCalledTimes(2);
    });
  });
});
