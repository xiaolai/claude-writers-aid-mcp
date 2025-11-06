/**
 * Unit tests for QueryCache - LRU cache for database queries
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { QueryCache } from "../../cache/QueryCache.js";

describe("QueryCache", () => {
  let cache: QueryCache;

  beforeEach(() => {
    cache = new QueryCache({ maxSize: 3, ttlMs: 5000 });
  });

  describe("Basic Operations", () => {
    it("should store and retrieve values", () => {
      cache.set("key1", { data: "value1" });
      const result = cache.get("key1");

      expect(result).toEqual({ data: "value1" });
    });

    it("should return undefined for non-existent keys", () => {
      const result = cache.get("nonexistent");

      expect(result).toBeUndefined();
    });

    it("should overwrite existing keys", () => {
      cache.set("key1", { data: "value1" });
      cache.set("key1", { data: "value2" });

      const result = cache.get("key1");
      expect(result).toEqual({ data: "value2" });
    });

    it("should check if key exists", () => {
      cache.set("key1", { data: "value1" });

      expect(cache.has("key1")).toBe(true);
      expect(cache.has("key2")).toBe(false);
    });

    it("should delete keys", () => {
      cache.set("key1", { data: "value1" });
      cache.delete("key1");

      expect(cache.has("key1")).toBe(false);
      expect(cache.get("key1")).toBeUndefined();
    });

    it("should clear all entries", () => {
      cache.set("key1", { data: "value1" });
      cache.set("key2", { data: "value2" });
      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.has("key1")).toBe(false);
      expect(cache.has("key2")).toBe(false);
    });
  });

  describe("LRU Eviction", () => {
    it("should evict least recently used item when capacity is exceeded", () => {
      cache.set("key1", { data: "value1" });
      cache.set("key2", { data: "value2" });
      cache.set("key3", { data: "value3" });
      cache.set("key4", { data: "value4" }); // Should evict key1

      expect(cache.has("key1")).toBe(false);
      expect(cache.has("key2")).toBe(true);
      expect(cache.has("key3")).toBe(true);
      expect(cache.has("key4")).toBe(true);
      expect(cache.size()).toBe(3);
    });

    it("should update access order on get", () => {
      cache.set("key1", { data: "value1" });
      cache.set("key2", { data: "value2" });
      cache.set("key3", { data: "value3" });

      // Access key1 to make it most recently used
      cache.get("key1");

      // Add key4, should evict key2 (least recently used)
      cache.set("key4", { data: "value4" });

      expect(cache.has("key1")).toBe(true);
      expect(cache.has("key2")).toBe(false);
      expect(cache.has("key3")).toBe(true);
      expect(cache.has("key4")).toBe(true);
    });

    it("should update access order on has check", () => {
      cache.set("key1", { data: "value1" });
      cache.set("key2", { data: "value2" });
      cache.set("key3", { data: "value3" });

      // Check key1 to make it most recently used
      cache.has("key1");

      // Add key4, should evict key2
      cache.set("key4", { data: "value4" });

      expect(cache.has("key1")).toBe(true);
      expect(cache.has("key2")).toBe(false);
    });

    it("should update access order on set of existing key", () => {
      cache.set("key1", { data: "value1" });
      cache.set("key2", { data: "value2" });
      cache.set("key3", { data: "value3" });

      // Update key1 to make it most recently used
      cache.set("key1", { data: "updated" });

      // Add key4, should evict key2
      cache.set("key4", { data: "value4" });

      expect(cache.get("key1")).toEqual({ data: "updated" });
      expect(cache.has("key2")).toBe(false);
    });
  });

  describe("TTL (Time To Live)", () => {
    it("should expire entries after TTL", async () => {
      const shortTtlCache = new QueryCache({ maxSize: 10, ttlMs: 100 });

      shortTtlCache.set("key1", { data: "value1" });
      expect(shortTtlCache.has("key1")).toBe(true);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(shortTtlCache.has("key1")).toBe(false);
      expect(shortTtlCache.get("key1")).toBeUndefined();
    });

    it("should not return expired entries", async () => {
      const shortTtlCache = new QueryCache({ maxSize: 10, ttlMs: 100 });

      shortTtlCache.set("key1", { data: "value1" });

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      const result = shortTtlCache.get("key1");
      expect(result).toBeUndefined();
    });

    it("should clean up expired entries on access", async () => {
      const shortTtlCache = new QueryCache({ maxSize: 10, ttlMs: 100 });

      shortTtlCache.set("key1", { data: "value1" });
      shortTtlCache.set("key2", { data: "value2" });

      await new Promise((resolve) => setTimeout(resolve, 150));

      // Accessing should trigger cleanup
      shortTtlCache.get("key1");

      expect(shortTtlCache.size()).toBe(0);
    });

    it("should reset TTL on update", async () => {
      const shortTtlCache = new QueryCache({ maxSize: 10, ttlMs: 200 });

      shortTtlCache.set("key1", { data: "value1" });

      // Wait 100ms, then update (should reset TTL)
      await new Promise((resolve) => setTimeout(resolve, 100));
      shortTtlCache.set("key1", { data: "updated" });

      // Wait another 150ms (total 250ms from original)
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should still be valid because TTL was reset
      expect(shortTtlCache.get("key1")).toEqual({ data: "updated" });
    });
  });

  describe("Cache Statistics", () => {
    it("should track cache hits", () => {
      cache.set("key1", { data: "value1" });

      cache.get("key1"); // Hit
      cache.get("key1"); // Hit

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
    });

    it("should track cache misses", () => {
      cache.get("nonexistent1"); // Miss
      cache.get("nonexistent2"); // Miss

      const stats = cache.getStats();
      expect(stats.misses).toBe(2);
    });

    it("should calculate hit rate", () => {
      cache.set("key1", { data: "value1" });

      cache.get("key1"); // Hit
      cache.get("key2"); // Miss
      cache.get("key1"); // Hit
      cache.get("key3"); // Miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBeCloseTo(0.5, 2);
    });

    it("should handle zero requests in hit rate calculation", () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
    });

    it("should track evictions", () => {
      cache.set("key1", { data: "value1" });
      cache.set("key2", { data: "value2" });
      cache.set("key3", { data: "value3" });
      cache.set("key4", { data: "value4" }); // Evicts key1
      cache.set("key5", { data: "value5" }); // Evicts key2

      const stats = cache.getStats();
      expect(stats.evictions).toBe(2);
    });

    it("should reset statistics", () => {
      cache.set("key1", { data: "value1" });
      cache.get("key1");
      cache.get("key2");

      cache.resetStats();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.evictions).toBe(0);
      expect(stats.hitRate).toBe(0);
    });

    it("should include size in statistics", () => {
      cache.set("key1", { data: "value1" });
      cache.set("key2", { data: "value2" });

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(3);
    });
  });

  describe("Edge Cases", () => {
    it("should handle cache size of 1", () => {
      const smallCache = new QueryCache({ maxSize: 1, ttlMs: 5000 });

      smallCache.set("key1", { data: "value1" });
      smallCache.set("key2", { data: "value2" }); // Should evict key1

      expect(smallCache.has("key1")).toBe(false);
      expect(smallCache.has("key2")).toBe(true);
      expect(smallCache.size()).toBe(1);
    });

    it("should handle undefined and null values", () => {
      cache.set("key1", undefined);
      cache.set("key2", null);

      expect(cache.get("key1")).toBeUndefined();
      expect(cache.get("key2")).toBeNull();
      expect(cache.has("key1")).toBe(true);
      expect(cache.has("key2")).toBe(true);
    });

    it("should handle complex objects", () => {
      const complexObj = {
        nested: { deep: { value: [1, 2, 3] } },
        array: [{ id: 1 }, { id: 2 }],
      };

      cache.set("key1", complexObj);
      const result = cache.get("key1");

      expect(result).toEqual(complexObj);
    });

    it("should handle rapid consecutive operations", () => {
      for (let i = 0; i < 100; i++) {
        cache.set(`key${i}`, { data: `value${i}` });
      }

      // Should only keep last 3 entries
      expect(cache.size()).toBe(3);
      expect(cache.has("key97")).toBe(true);
      expect(cache.has("key98")).toBe(true);
      expect(cache.has("key99")).toBe(true);
    });

    it("should handle deleting non-existent keys", () => {
      expect(() => cache.delete("nonexistent")).not.toThrow();
    });
  });

  describe("Configuration", () => {
    it("should use default configuration if not provided", () => {
      const defaultCache = new QueryCache();

      defaultCache.set("key1", { data: "value1" });
      expect(defaultCache.get("key1")).toEqual({ data: "value1" });
    });

    it("should respect custom max size", () => {
      const largeCache = new QueryCache({ maxSize: 100, ttlMs: 5000 });

      for (let i = 0; i < 100; i++) {
        largeCache.set(`key${i}`, { data: `value${i}` });
      }

      expect(largeCache.size()).toBe(100);

      largeCache.set("key100", { data: "value100" });
      expect(largeCache.size()).toBe(100); // Should evict oldest
    });

    it("should validate configuration", () => {
      expect(() => new QueryCache({ maxSize: 0, ttlMs: 5000 })).toThrow();
      expect(() => new QueryCache({ maxSize: -1, ttlMs: 5000 })).toThrow();
      expect(() => new QueryCache({ maxSize: 10, ttlMs: 0 })).toThrow();
      expect(() => new QueryCache({ maxSize: 10, ttlMs: -1 })).toThrow();
    });
  });
});
