/**
 * Unit tests for SemanticSearch
 */

import { SemanticSearch, DEFAULT_SEARCH_CONFIG } from "../../search/SemanticSearch.js";

describe("SemanticSearch", () => {
  describe("Configuration", () => {
    it("should export default configuration", () => {
      expect(DEFAULT_SEARCH_CONFIG).toBeDefined();
      expect(DEFAULT_SEARCH_CONFIG.limit).toBe(10);
      expect(DEFAULT_SEARCH_CONFIG.minSimilarity).toBe(0.5);
      expect(DEFAULT_SEARCH_CONFIG.includeContext).toBe(true);
    });

    it("should accept configuration in constructor", () => {
      const mockVectorStore = {} as never;
      const mockEmbeddingProvider = {
        isAvailable: () => true,
      } as never;
      const mockStorage = {} as never;

      const search = new SemanticSearch(
        mockVectorStore,
        mockEmbeddingProvider,
        mockStorage,
        {
          limit: 20,
          minSimilarity: 0.7,
        }
      );

      expect(search).toBeDefined();
    });
  });

  describe("Availability", () => {
    it("should check embedding provider availability", () => {
      const mockVectorStore = {} as never;
      const mockEmbeddingProvider = {
        isAvailable: () => true,
      } as never;
      const mockStorage = {} as never;

      const search = new SemanticSearch(
        mockVectorStore,
        mockEmbeddingProvider,
        mockStorage
      );

      expect(search.isAvailable()).toBe(true);
    });

    it("should return false when provider unavailable", () => {
      const mockVectorStore = {} as never;
      const mockEmbeddingProvider = {
        isAvailable: () => false,
      } as never;
      const mockStorage = {} as never;

      const search = new SemanticSearch(
        mockVectorStore,
        mockEmbeddingProvider,
        mockStorage
      );

      expect(search.isAvailable()).toBe(false);
    });
  });
});
