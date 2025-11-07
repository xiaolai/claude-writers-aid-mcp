/**
 * HybridSearch - Combines semantic and keyword search for best results
 * Uses weighted scoring to merge vector similarity and FTS ranking
 */

import type { SemanticSearch } from "./SemanticSearch.js";
import type { FullTextSearch } from "./FullTextSearch.js";
import type { SearchResult } from "../markdown/types.js";

/**
 * HybridSearch configuration
 */
export interface HybridSearchConfig {
  limit?: number; // Max results to return
  semanticWeight?: number; // Weight for semantic similarity (0-1)
  keywordWeight?: number; // Weight for keyword matching (0-1)
  minSemanticSimilarity?: number; // Min similarity threshold for semantic results
  includeContext?: boolean; // Include surrounding chunks
}

/**
 * Default hybrid search configuration
 */
export const DEFAULT_HYBRID_CONFIG: HybridSearchConfig = {
  limit: 10,
  semanticWeight: 0.7,
  keywordWeight: 0.3,
  minSemanticSimilarity: 0.5,
  includeContext: true,
};

/**
 * Search result with combined score
 */
interface ScoredResult extends SearchResult {
  semanticScore: number;
  keywordScore: number;
  combinedScore: number;
}

/**
 * HybridSearch class
 */
export class HybridSearch {
  private semanticSearch: SemanticSearch;
  private fullTextSearch: FullTextSearch;
  private config: HybridSearchConfig;

  constructor(
    semanticSearch: SemanticSearch,
    fullTextSearch: FullTextSearch,
    config: Partial<HybridSearchConfig> = {}
  ) {
    this.semanticSearch = semanticSearch;
    this.fullTextSearch = fullTextSearch;
    this.config = { ...DEFAULT_HYBRID_CONFIG, ...config };
  }

  /**
   * Search using both semantic and keyword methods
   */
  async search(
    query: string,
    config: Partial<HybridSearchConfig> = {}
  ): Promise<SearchResult[]> {
    const searchConfig = { ...this.config, ...config };
    const semanticWeight = searchConfig.semanticWeight || 0.7;
    const keywordWeight = searchConfig.keywordWeight || 0.3;

    // Validate weights sum to 1.0
    if (Math.abs(semanticWeight + keywordWeight - 1.0) > 0.001) {
      throw new Error("Semantic and keyword weights must sum to 1.0");
    }

    // Run both searches in parallel
    const [semanticResults, keywordResults] = await Promise.all([
      this.semanticSearch.isAvailable()
        ? this.semanticSearch.search(query, {
            limit: searchConfig.limit ? searchConfig.limit * 2 : 20,
            minSimilarity: searchConfig.minSemanticSimilarity,
            includeContext: searchConfig.includeContext,
          })
        : Promise.resolve([]),
      this.fullTextSearch.search(query, {
        limit: searchConfig.limit ? searchConfig.limit * 2 : 20,
      }),
    ]);

    // Create a map of chunk ID to scored results
    const resultMap = new Map<string, ScoredResult>();

    // Process semantic results
    for (const result of semanticResults) {
      const chunkId = result.chunk.id;
      resultMap.set(chunkId, {
        ...result,
        semanticScore: result.similarity,
        keywordScore: 0,
        combinedScore: result.similarity * semanticWeight,
      });
    }

    // Process keyword results and merge
    for (const result of keywordResults) {
      const chunkId = result.chunk.id;
      const existing = resultMap.get(chunkId);

      if (existing) {
        // Chunk found in both results - combine scores
        existing.keywordScore = result.similarity;
        existing.combinedScore =
          existing.semanticScore * semanticWeight +
          result.similarity * keywordWeight;
      } else {
        // Chunk only found in keyword results
        resultMap.set(chunkId, {
          ...result,
          semanticScore: 0,
          keywordScore: result.similarity,
          combinedScore: result.similarity * keywordWeight,
        });
      }
    }

    // Convert map to array and sort by combined score
    const scoredResults = Array.from(resultMap.values()).sort(
      (a, b) => b.combinedScore - a.combinedScore
    );

    // Apply limit and remove scoring metadata
    const finalResults = scoredResults
      .slice(0, searchConfig.limit || 10)
      .map((result) => ({
        chunk: result.chunk,
        file: result.file,
        similarity: result.combinedScore,
        context: result.context,
      }));

    return finalResults;
  }

  /**
   * Get search statistics
   */
  getStats(): {
    semanticAvailable: boolean;
    semanticIndexSize: number;
    keywordIndexSize: number;
  } {
    return {
      semanticAvailable: this.semanticSearch.isAvailable(),
      semanticIndexSize: this.semanticSearch.getIndexStats().totalChunks,
      keywordIndexSize: this.fullTextSearch.getIndexStats().totalChunks,
    };
  }

  /**
   * Clear both indexes
   */
  async clearIndex(): Promise<void> {
    await Promise.all([
      this.semanticSearch.clearIndex(),
      this.fullTextSearch.clearIndex(),
    ]);
    console.log("✓ Cleared hybrid search indexes");
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<HybridSearchConfig>): void {
    this.config = { ...this.config, ...config };

    // Validate weights if provided
    const semanticWeight = this.config.semanticWeight || 0.7;
    const keywordWeight = this.config.keywordWeight || 0.3;

    if (Math.abs(semanticWeight + keywordWeight - 1.0) > 0.001) {
      throw new Error("Semantic and keyword weights must sum to 1.0");
    }
  }
}
