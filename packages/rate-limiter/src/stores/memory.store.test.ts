import { MemoryStore } from "./memory.store";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

describe("MemoryStore", () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
  });

  afterEach(() => {
    store.clear();
  });

  describe("get", () => {
    it("returns null for non-existent key", async () => {
      const result = await store.get("nonexistent");
      expect(result).toBeNull();
    });

    it("returns stored value for existing key", async () => {
      await store.set("key1", "value1", 60);
      const result = await store.get("key1");
      expect(result).toBe("value1");
    });

    it("returns null for expired entry", async () => {
      vi.useFakeTimers();
      await store.set("key1", "value1", 1);
      vi.advanceTimersByTime(1100);
      const result = await store.get("key1");
      expect(result).toBeNull();
      vi.useRealTimers();
    });

    it("returns value for non-expired entry", async () => {
      await store.set("key1", "value1", 10);
      const result = await store.get("key1");
      expect(result).toBe("value1");
    });
  });

  describe("set", () => {
    it("stores value with TTL", async () => {
      await store.set("key1", "value1", 60);
      const result = await store.get("key1");
      expect(result).toBe("value1");
    });

    it("overwrites existing value", async () => {
      await store.set("key1", "value1", 60);
      await store.set("key1", "value2", 60);
      const result = await store.get("key1");
      expect(result).toBe("value2");
    });

    it("handles TTL of 0 as minimum 1 second", async () => {
      await store.set("key1", "value1", 0);
      const result = await store.get("key1");
      expect(result).toBe("value1");
    });

    it("stores multiple keys independently", async () => {
      await store.set("key1", "value1", 60);
      await store.set("key2", "value2", 60);
      const result1 = await store.get("key1");
      const result2 = await store.get("key2");
      expect(result1).toBe("value1");
      expect(result2).toBe("value2");
    });
  });

  describe("delete", () => {
    it("removes existing key", async () => {
      await store.set("key1", "value1", 60);
      await store.delete("key1");
      const result = await store.get("key1");
      expect(result).toBeNull();
    });

    it("handles deleting non-existent key", async () => {
      await expect(store.delete("nonexistent")).resolves.toBeUndefined();
    });

    it("deletes only the specified key", async () => {
      await store.set("key1", "value1", 60);
      await store.set("key2", "value2", 60);
      await store.delete("key1");
      const result1 = await store.get("key1");
      const result2 = await store.get("key2");
      expect(result1).toBeNull();
      expect(result2).toBe("value2");
    });
  });

  describe("clear", () => {
    it("removes all entries", async () => {
      await store.set("key1", "value1", 60);
      await store.set("key2", "value2", 60);
      store.clear();
      const result1 = await store.get("key1");
      const result2 = await store.get("key2");
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it("handles clearing empty store", () => {
      expect(() => store.clear()).not.toThrow();
    });
  });

  describe("TTL expiration", () => {
    it("expires entries after TTL", async () => {
      vi.useFakeTimers();
      await store.set("key1", "value1", 1);
      vi.advanceTimersByTime(1100);
      const result = await store.get("key1");
      expect(result).toBeNull();
      vi.useRealTimers();
    });

    it("does not expire entries before TTL", async () => {
      vi.useFakeTimers();
      await store.set("key1", "value1", 10);
      vi.advanceTimersByTime(100);
      const result = await store.get("key1");
      expect(result).toBe("value1");
      vi.useRealTimers();
    });

    it("handles concurrent expiration checks", async () => {
      vi.useFakeTimers();
      await store.set("key1", "value1", 1);
      await store.set("key2", "value2", 10);
      vi.advanceTimersByTime(1100);
      const result1 = await store.get("key1");
      const result2 = await store.get("key2");
      expect(result1).toBeNull();
      expect(result2).toBe("value2");
      vi.useRealTimers();
    });
  });
});
