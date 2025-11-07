/**
 * Unit tests for FullTextSearch
 */

import { FullTextSearch, DEFAULT_FTS_CONFIG } from "../../search/FullTextSearch.js";

describe("FullTextSearch", () => {
  describe("Configuration", () => {
    it("should export default configuration", () => {
      expect(DEFAULT_FTS_CONFIG).toBeDefined();
      expect(DEFAULT_FTS_CONFIG.limit).toBe(10);
      expect(DEFAULT_FTS_CONFIG.highlightTags).toEqual(["<mark>", "</mark>"]);
    });

    it("should accept configuration in constructor", () => {
      const mockSQLiteManager = {
        getDatabase: () => ({
          prepare: () => ({ all: () => [] }),
        }),
      } as never;
      const mockStorage = {} as never;

      const search = new FullTextSearch(
        mockSQLiteManager,
        mockStorage,
        {
          limit: 20,
          highlightTags: ["<b>", "</b>"],
        }
      );

      expect(search).toBeDefined();
    });
  });

  describe("Index Statistics", () => {
    it("should get index stats", () => {
      const mockSQLiteManager = {
        getDatabase: () => ({
          prepare: () => ({
            get: () => ({ count: 42 }),
          }),
        }),
      } as never;
      const mockStorage = {} as never;

      const search = new FullTextSearch(mockSQLiteManager, mockStorage);
      const stats = search.getIndexStats();

      expect(stats.totalChunks).toBe(42);
    });
  });
});
