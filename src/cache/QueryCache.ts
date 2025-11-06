/**
 * QueryCache - LRU cache for database query results
 *
 * Provides an in-memory caching layer with:
 * - LRU (Least Recently Used) eviction policy
 * - TTL (Time To Live) for automatic expiration
 * - Cache statistics (hits, misses, evictions, hit rate)
 * - Smart invalidation support
 *
 * Use this to cache expensive database queries like conversation searches,
 * file timelines, and decision lookups.
 *
 * @example
 * ```typescript
 * const cache = new QueryCache({ maxSize: 100, ttlMs: 60000 });
 *
 * // Store query result
 * cache.set('conversations:all', conversations);
 *
 * // Retrieve from cache
 * const cached = cache.get('conversations:all');
 * if (cached) {
 *   return cached; // Cache hit
 * }
 *
 * // Cache miss - query database
 * const result = await queryDatabase();
 * cache.set('conversations:all', result);
 * return result;
 * ```
 */

/**
 * Configuration options for QueryCache
 */
export interface QueryCacheConfig {
  /** Maximum number of entries to store */
  maxSize: number;
  /** Time to live in milliseconds before entries expire */
  ttlMs: number;
}

/**
 * Cache entry with timestamp for TTL
 */
interface CacheEntry<T> {
  /** Cached value */
  value: T;
  /** Timestamp when entry was created/updated */
  timestamp: number;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Number of entries evicted */
  evictions: number;
  /** Cache hit rate (0-1) */
  hitRate: number;
  /** Current cache size */
  size: number;
  /** Maximum cache size */
  maxSize: number;
}

/**
 * LRU cache with TTL support for database query results.
 *
 * Uses a Map for O(1) access and maintains LRU order by moving
 * accessed entries to the end of the Map.
 */
export class QueryCache {
  private cache: Map<string, CacheEntry<unknown>>;
  private readonly config: QueryCacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  /**
   * Create a new QueryCache.
   *
   * @param config - Cache configuration
   * @throws {Error} If configuration is invalid
   *
   * @example
   * ```typescript
   * // Create cache with 100 entries, 1 minute TTL
   * const cache = new QueryCache({ maxSize: 100, ttlMs: 60000 });
   * ```
   */
  constructor(config: Partial<QueryCacheConfig> = {}) {
    // Default configuration
    this.config = {
      maxSize: config.maxSize ?? 100,
      ttlMs: config.ttlMs ?? 300000, // 5 minutes default
    };

    // Validate configuration
    if (this.config.maxSize <= 0) {
      throw new Error("maxSize must be greater than 0");
    }
    if (this.config.ttlMs <= 0) {
      throw new Error("ttlMs must be greater than 0");
    }

    this.cache = new Map();
  }

  /**
   * Store a value in the cache.
   *
   * If the key already exists, updates the value and resets TTL.
   * If cache is full, evicts the least recently used entry.
   *
   * @param key - Cache key
   * @param value - Value to cache
   *
   * @example
   * ```typescript
   * cache.set('user:123', { id: 123, name: 'Alice' });
   * ```
   */
  set<T>(key: string, value: T): void {
    // Remove old entry if exists (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict LRU entry if at capacity
    if (this.cache.size >= this.config.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
        this.stats.evictions++;
      }
    }

    // Add new entry at end (most recently used)
    this.cache.set(key, {
      value: value as unknown,
      timestamp: Date.now(),
    });
  }

  /**
   * Retrieve a value from the cache.
   *
   * Returns undefined if key doesn't exist or entry has expired.
   * Updates access order (moves entry to end as most recently used).
   *
   * @param key - Cache key
   * @returns Cached value or undefined
   *
   * @example
   * ```typescript
   * const user = cache.get<User>('user:123');
   * if (user) {
   *   console.log('Cache hit:', user.name);
   * } else {
   *   console.log('Cache miss');
   * }
   * ```
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.stats.hits++;
    return entry.value as T;
  }

  /**
   * Check if a key exists in the cache.
   *
   * Returns false if key doesn't exist or entry has expired.
   * Updates access order (moves entry to end as most recently used).
   *
   * @param key - Cache key
   * @returns True if key exists and not expired
   *
   * @example
   * ```typescript
   * if (cache.has('user:123')) {
   *   const user = cache.get('user:123');
   * }
   * ```
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return true;
  }

  /**
   * Delete a key from the cache.
   *
   * Does nothing if key doesn't exist.
   *
   * @param key - Cache key to delete
   *
   * @example
   * ```typescript
   * cache.delete('user:123');
   * ```
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache.
   *
   * Resets the cache but preserves statistics.
   *
   * @example
   * ```typescript
   * cache.clear(); // Remove all cached data
   * ```
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get current cache size.
   *
   * @returns Number of entries in cache
   *
   * @example
   * ```typescript
   * console.log(`Cache contains ${cache.size()} entries`);
   * ```
   */
  size(): number {
    // Clean up expired entries first
    this.cleanupExpired();
    return this.cache.size;
  }

  /**
   * Get cache statistics.
   *
   * Provides insight into cache performance:
   * - Hit/miss counts
   * - Hit rate percentage
   * - Eviction count
   * - Current size
   *
   * @returns Cache statistics object
   *
   * @example
   * ```typescript
   * const stats = cache.getStats();
   * console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
   * console.log(`Evictions: ${stats.evictions}`);
   * ```
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      hitRate,
      size: this.cache.size,
      maxSize: this.config.maxSize,
    };
  }

  /**
   * Reset statistics counters.
   *
   * Clears hit/miss/eviction counts but preserves cached data.
   *
   * @example
   * ```typescript
   * cache.resetStats(); // Start fresh statistics
   * ```
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
    };
  }

  /**
   * Check if an entry has expired based on TTL.
   *
   * @param entry - Cache entry to check
   * @returns True if entry is expired
   * @internal
   */
  private isExpired(entry: CacheEntry<unknown>): boolean {
    const age = Date.now() - entry.timestamp;
    return age > this.config.ttlMs;
  }

  /**
   * Remove all expired entries from the cache.
   *
   * Called automatically by size() to keep cache clean.
   *
   * @internal
   */
  private cleanupExpired(): void {
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }
}
