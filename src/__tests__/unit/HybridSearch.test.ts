/**
 * Unit tests for HybridSearch
 */

import { HybridSearch, DEFAULT_HYBRID_CONFIG } from "../../search/HybridSearch.js";
import type { SearchResult, MarkdownChunk, MarkdownFile } from "../../markdown/types.js";

describe("HybridSearch", () => {
  describe("Configuration", () => {
    it("should export default configuration", () => {
      expect(DEFAULT_HYBRID_CONFIG).toBeDefined();
      expect(DEFAULT_HYBRID_CONFIG.limit).toBe(10);
      expect(DEFAULT_HYBRID_CONFIG.semanticWeight).toBe(0.7);
      expect(DEFAULT_HYBRID_CONFIG.keywordWeight).toBe(0.3);
      expect(DEFAULT_HYBRID_CONFIG.minSemanticSimilarity).toBe(0.5);
      expect(DEFAULT_HYBRID_CONFIG.includeContext).toBe(true);
    });

    it("should accept configuration in constructor", () => {
      const mockSemantic = {
        isAvailable: () => true,
        search: () => Promise.resolve([]),
        getIndexStats: () => ({ totalChunks: 0 }),
        clearIndex: () => Promise.resolve(),
      } as never;

      const mockKeyword = {
        search: () => Promise.resolve([]),
        getIndexStats: () => ({ totalChunks: 0 }),
        clearIndex: () => Promise.resolve(),
      } as never;

      const search = new HybridSearch(mockSemantic, mockKeyword, {
        limit: 20,
        semanticWeight: 0.8,
        keywordWeight: 0.2,
      });

      expect(search).toBeDefined();
    });

    it("should validate weights sum to 1.0", async () => {
      const mockSemantic = {
        isAvailable: () => true,
        search: () => Promise.resolve([]),
      } as never;

      const mockKeyword = {
        search: () => Promise.resolve([]),
      } as never;

      const search = new HybridSearch(mockSemantic, mockKeyword, {
        semanticWeight: 0.6,
        keywordWeight: 0.5, // Sum = 1.1, invalid
      });

      await expect(search.search("test")).rejects.toThrow(
        "Semantic and keyword weights must sum to 1.0"
      );
    });

    it("should validate weights in updateConfig", () => {
      const mockSemantic = {
        isAvailable: () => true,
      } as never;

      const mockKeyword = {} as never;

      const search = new HybridSearch(mockSemantic, mockKeyword);

      expect(() => {
        search.updateConfig({
          semanticWeight: 0.7,
          keywordWeight: 0.4, // Sum = 1.1, invalid
        });
      }).toThrow("Semantic and keyword weights must sum to 1.0");
    });
  });

  describe("Search Result Merging", () => {
    it("should merge results from both searches", async () => {
      const mockFile: MarkdownFile = {
        id: "file1",
        file_path: "/test.md",
        title: "Test",
        content: "content",
        content_hash: "hash",
        word_count: 10,
        created_at: 0,
        last_modified: 0,
        indexed_at: 0,
      };

      const chunk1: MarkdownChunk = {
        id: "chunk1",
        file_id: "file1",
        chunk_index: 0,
        heading: null,
        content: "semantic result",
        start_offset: 0,
        end_offset: 100,
        token_count: 2,
        word_count: 2,
      };

      const chunk2: MarkdownChunk = {
        id: "chunk2",
        file_id: "file1",
        chunk_index: 1,
        heading: null,
        content: "keyword result",
        start_offset: 100,
        end_offset: 200,
        token_count: 2,
        word_count: 2,
      };

      const semanticResults: SearchResult[] = [
        { chunk: chunk1, file: mockFile, similarity: 0.9 },
      ];

      const keywordResults: SearchResult[] = [
        { chunk: chunk2, file: mockFile, similarity: 0.8 },
      ];

      const mockSemantic = {
        isAvailable: () => true,
        search: () => Promise.resolve(semanticResults),
      } as never;

      const mockKeyword = {
        search: () => Promise.resolve(keywordResults),
      } as never;

      const search = new HybridSearch(mockSemantic, mockKeyword);
      const results = await search.search("test");

      expect(results).toHaveLength(2);
    });

    it("should deduplicate results from both searches", async () => {
      const mockFile: MarkdownFile = {
        id: "file1",
        file_path: "/test.md",
        title: "Test",
        content: "content",
        content_hash: "hash",
        word_count: 10,
        created_at: 0,
        last_modified: 0,
        indexed_at: 0,
      };

      const chunk1: MarkdownChunk = {
        id: "chunk1",
        file_id: "file1",
        chunk_index: 0,
        heading: null,
        content: "found in both",
        start_offset: 0,
        end_offset: 100,
        token_count: 3,
        word_count: 3,
      };

      // Same chunk appears in both results
      const semanticResults: SearchResult[] = [
        { chunk: chunk1, file: mockFile, similarity: 0.9 },
      ];

      const keywordResults: SearchResult[] = [
        { chunk: chunk1, file: mockFile, similarity: 0.8 },
      ];

      const mockSemantic = {
        isAvailable: () => true,
        search: () => Promise.resolve(semanticResults),
      } as never;

      const mockKeyword = {
        search: () => Promise.resolve(keywordResults),
      } as never;

      const search = new HybridSearch(mockSemantic, mockKeyword);
      const results = await search.search("test");

      // Should only have 1 result, not 2 (deduplicated)
      expect(results).toHaveLength(1);
    });

    it("should calculate weighted combined scores", async () => {
      const mockFile: MarkdownFile = {
        id: "file1",
        file_path: "/test.md",
        title: "Test",
        content: "content",
        content_hash: "hash",
        word_count: 10,
        created_at: 0,
        last_modified: 0,
        indexed_at: 0,
      };

      const chunk1: MarkdownChunk = {
        id: "chunk1",
        file_id: "file1",
        chunk_index: 0,
        heading: null,
        content: "found in both",
        start_offset: 0,
        end_offset: 100,
        token_count: 3,
        word_count: 3,
      };

      const semanticResults: SearchResult[] = [
        { chunk: chunk1, file: mockFile, similarity: 0.8 },
      ];

      const keywordResults: SearchResult[] = [
        { chunk: chunk1, file: mockFile, similarity: 0.6 },
      ];

      const mockSemantic = {
        isAvailable: () => true,
        search: () => Promise.resolve(semanticResults),
      } as never;

      const mockKeyword = {
        search: () => Promise.resolve(keywordResults),
      } as never;

      // Use 0.7 semantic + 0.3 keyword weights
      const search = new HybridSearch(mockSemantic, mockKeyword, {
        semanticWeight: 0.7,
        keywordWeight: 0.3,
      });

      const results = await search.search("test");

      // Combined score = 0.8 * 0.7 + 0.6 * 0.3 = 0.56 + 0.18 = 0.74
      expect(results[0].similarity).toBeCloseTo(0.74, 2);
    });

    it("should sort by combined score", async () => {
      const mockFile: MarkdownFile = {
        id: "file1",
        file_path: "/test.md",
        title: "Test",
        content: "content",
        content_hash: "hash",
        word_count: 10,
        created_at: 0,
        last_modified: 0,
        indexed_at: 0,
      };

      const chunk1: MarkdownChunk = {
        id: "chunk1",
        file_id: "file1",
        chunk_index: 0,
        heading: null,
        content: "low score",
        start_offset: 0,
        end_offset: 100,
        token_count: 2,
        word_count: 2,
      };

      const chunk2: MarkdownChunk = {
        id: "chunk2",
        file_id: "file1",
        chunk_index: 1,
        heading: null,
        content: "high score",
        start_offset: 100,
        end_offset: 200,
        token_count: 2,
        word_count: 2,
      };

      const semanticResults: SearchResult[] = [
        { chunk: chunk1, file: mockFile, similarity: 0.5 },
        { chunk: chunk2, file: mockFile, similarity: 0.9 },
      ];

      const keywordResults: SearchResult[] = [
        { chunk: chunk1, file: mockFile, similarity: 0.4 },
        { chunk: chunk2, file: mockFile, similarity: 0.8 },
      ];

      const mockSemantic = {
        isAvailable: () => true,
        search: () => Promise.resolve(semanticResults),
      } as never;

      const mockKeyword = {
        search: () => Promise.resolve(keywordResults),
      } as never;

      const search = new HybridSearch(mockSemantic, mockKeyword);
      const results = await search.search("test");

      // chunk2 should be first (higher combined score)
      expect(results[0].chunk.id).toBe("chunk2");
      expect(results[1].chunk.id).toBe("chunk1");
    });
  });

  describe("Fallback Behavior", () => {
    it("should work with only semantic search when available", async () => {
      const mockFile: MarkdownFile = {
        id: "file1",
        file_path: "/test.md",
        title: "Test",
        content: "content",
        content_hash: "hash",
        word_count: 10,
        created_at: 0,
        last_modified: 0,
        indexed_at: 0,
      };

      const chunk1: MarkdownChunk = {
        id: "chunk1",
        file_id: "file1",
        chunk_index: 0,
        heading: null,
        content: "semantic only",
        start_offset: 0,
        end_offset: 100,
        token_count: 2,
        word_count: 2,
      };

      const semanticResults: SearchResult[] = [
        { chunk: chunk1, file: mockFile, similarity: 0.9 },
      ];

      const mockSemantic = {
        isAvailable: () => true,
        search: () => Promise.resolve(semanticResults),
      } as never;

      const mockKeyword = {
        search: () => Promise.resolve([]),
      } as never;

      const search = new HybridSearch(mockSemantic, mockKeyword);
      const results = await search.search("test");

      expect(results).toHaveLength(1);
      expect(results[0].chunk.id).toBe("chunk1");
    });

    it("should work with only keyword search when semantic unavailable", async () => {
      const mockFile: MarkdownFile = {
        id: "file1",
        file_path: "/test.md",
        title: "Test",
        content: "content",
        content_hash: "hash",
        word_count: 10,
        created_at: 0,
        last_modified: 0,
        indexed_at: 0,
      };

      const chunk1: MarkdownChunk = {
        id: "chunk1",
        file_id: "file1",
        chunk_index: 0,
        heading: null,
        content: "keyword only",
        start_offset: 0,
        end_offset: 100,
        token_count: 2,
        word_count: 2,
      };

      const keywordResults: SearchResult[] = [
        { chunk: chunk1, file: mockFile, similarity: 0.8 },
      ];

      const mockSemantic = {
        isAvailable: () => false,
        search: () => Promise.resolve([]),
      } as never;

      const mockKeyword = {
        search: () => Promise.resolve(keywordResults),
      } as never;

      const search = new HybridSearch(mockSemantic, mockKeyword);
      const results = await search.search("test");

      expect(results).toHaveLength(1);
      expect(results[0].chunk.id).toBe("chunk1");
    });
  });

  describe("Index Management", () => {
    it("should get stats from both indexes", () => {
      const mockSemantic = {
        isAvailable: () => true,
        getIndexStats: () => ({ totalChunks: 100 }),
      } as never;

      const mockKeyword = {
        getIndexStats: () => ({ totalChunks: 150 }),
      } as never;

      const search = new HybridSearch(mockSemantic, mockKeyword);
      const stats = search.getStats();

      expect(stats.semanticAvailable).toBe(true);
      expect(stats.semanticIndexSize).toBe(100);
      expect(stats.keywordIndexSize).toBe(150);
    });

    it("should clear both indexes", async () => {
      let semanticCleared = false;
      let keywordCleared = false;

      const mockSemantic = {
        isAvailable: () => true,
        clearIndex: async () => {
          semanticCleared = true;
        },
      } as never;

      const mockKeyword = {
        clearIndex: async () => {
          keywordCleared = true;
        },
      } as never;

      const search = new HybridSearch(mockSemantic, mockKeyword);
      await search.clearIndex();

      expect(semanticCleared).toBe(true);
      expect(keywordCleared).toBe(true);
    });
  });

  describe("Limit Handling", () => {
    it("should respect result limit", async () => {
      const mockFile: MarkdownFile = {
        id: "file1",
        file_path: "/test.md",
        title: "Test",
        content: "content",
        content_hash: "hash",
        word_count: 10,
        created_at: 0,
        last_modified: 0,
        indexed_at: 0,
      };

      // Create many chunks
      const chunks: MarkdownChunk[] = Array.from({ length: 20 }, (_, i) => ({
        id: `chunk${i}`,
        file_id: "file1",
        chunk_index: i,
        heading: null,
        content: `content ${i}`,
        start_offset: i * 100,
        end_offset: (i + 1) * 100,
        token_count: 2,
        word_count: 2,
      }));

      const semanticResults: SearchResult[] = chunks.map((chunk, i) => ({
        chunk,
        file: mockFile,
        similarity: 0.8 - i * 0.01,
      }));

      const mockSemantic = {
        isAvailable: () => true,
        search: () => Promise.resolve(semanticResults),
      } as never;

      const mockKeyword = {
        search: () => Promise.resolve([]),
      } as never;

      const search = new HybridSearch(mockSemantic, mockKeyword, {
        limit: 5,
      });

      const results = await search.search("test");

      expect(results).toHaveLength(5);
    });
  });
});
