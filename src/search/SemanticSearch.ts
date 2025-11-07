/**
 * SemanticSearch - Vector-based semantic search for markdown content
 * Uses existing VectorStore infrastructure for chunk embeddings
 */

import type { VectorStore } from "../embeddings/VectorStore.js";
import type { EmbeddingProvider } from "../embeddings/EmbeddingProvider.js";
import type { WritingStorage } from "../storage/WritingStorage.js";
import type {
  SearchResult,
  MarkdownChunk,
} from "../markdown/types.js";

/**
 * SemanticSearch configuration
 */
export interface SemanticSearchConfig {
  limit?: number; // Max results to return
  minSimilarity?: number; // Minimum similarity threshold (0-1)
  includeContext?: boolean; // Include surrounding chunks
}

/**
 * Default search configuration
 */
export const DEFAULT_SEARCH_CONFIG: SemanticSearchConfig = {
  limit: 10,
  minSimilarity: 0.5,
  includeContext: true,
};

/**
 * SemanticSearch class
 */
export class SemanticSearch {
  private vectorStore: VectorStore;
  private embeddingProvider: EmbeddingProvider;
  private writingStorage: WritingStorage;
  private config: SemanticSearchConfig;

  constructor(
    vectorStore: VectorStore,
    embeddingProvider: EmbeddingProvider,
    writingStorage: WritingStorage,
    config: Partial<SemanticSearchConfig> = {}
  ) {
    this.vectorStore = vectorStore;
    this.embeddingProvider = embeddingProvider;
    this.writingStorage = writingStorage;
    this.config = { ...DEFAULT_SEARCH_CONFIG, ...config };
  }

  /**
   * Index chunks with embeddings
   */
  async indexChunks(chunks: MarkdownChunk[]): Promise<void> {
    console.log(`Indexing ${chunks.length} chunks...`);

    for (const chunk of chunks) {
      // Generate embedding for chunk content
      const embedding = await this.embeddingProvider.embed(chunk.content);

      // Store in VectorStore using chunk.id as messageId
      await this.vectorStore.storeMessageEmbedding(
        chunk.id,
        chunk.content,
        embedding
      );
    }

    console.log(`✓ Indexed ${chunks.length} chunks`);
  }

  /**
   * Search for similar chunks
   */
  async search(
    query: string,
    config: Partial<SemanticSearchConfig> = {}
  ): Promise<SearchResult[]> {
    const searchConfig = { ...this.config, ...config };

    // Generate query embedding
    const queryEmbedding = await this.embeddingProvider.embed(query);

    // Search for similar chunks using VectorStore
    const results = await this.vectorStore.searchMessages(
      queryEmbedding,
      searchConfig.limit || 10
    );

    // Convert to SearchResult format
    const searchResults: SearchResult[] = [];

    for (const result of results) {
      // Skip results below similarity threshold
      if (result.similarity < (searchConfig.minSimilarity || 0)) {
        continue;
      }

      // The result.id is the chunk ID
      // We need to find the chunk and file
      // First, get all files to search for the chunk
      const allFiles = this.writingStorage.getAllFiles();

      let foundChunk: MarkdownChunk | null = null;
      let foundFile = null;

      for (const file of allFiles) {
        const chunks = this.writingStorage.getChunksForFile(file.id);
        foundChunk = chunks.find((c) => c.id === result.id) || null;
        if (foundChunk) {
          foundFile = file;
          break;
        }
      }

      if (!foundChunk || !foundFile) {
        continue;
      }

      // Build context if requested
      let context: string | undefined;
      if (searchConfig.includeContext) {
        const allChunks = this.writingStorage.getChunksForFile(foundFile.id);
        context = this.buildContext(foundChunk, allChunks);
      }

      searchResults.push({
        chunk: foundChunk,
        file: foundFile,
        similarity: result.similarity,
        context,
      });
    }

    return searchResults;
  }

  /**
   * Build context from surrounding chunks
   */
  private buildContext(
    targetChunk: MarkdownChunk,
    allChunks: MarkdownChunk[]
  ): string {
    const targetIndex = targetChunk.chunk_index;
    const contextParts: string[] = [];

    // Get previous chunk (if exists)
    const prevChunk = allChunks.find((c) => c.chunk_index === targetIndex - 1);
    if (prevChunk) {
      // Take last 50 words
      const words = prevChunk.content.split(/\s+/);
      const preview = words.slice(-50).join(" ");
      contextParts.push(`...${preview}`);
    }

    // Add target chunk
    contextParts.push(targetChunk.content);

    // Get next chunk (if exists)
    const nextChunk = allChunks.find((c) => c.chunk_index === targetIndex + 1);
    if (nextChunk) {
      // Take first 50 words
      const words = nextChunk.content.split(/\s+/);
      const preview = words.slice(0, 50).join(" ");
      contextParts.push(`${preview}...`);
    }

    return contextParts.join("\n\n");
  }

  /**
   * Clear all indexed chunks
   */
  async clearIndex(): Promise<void> {
    await this.vectorStore.clearAllEmbeddings();
    console.log("✓ Cleared search index");
  }

  /**
   * Get index statistics
   */
  getIndexStats(): { totalChunks: number } {
    const totalChunks = this.vectorStore.getEmbeddingCount();
    return { totalChunks };
  }

  /**
   * Check if embedding provider is available
   */
  isAvailable(): boolean {
    return this.embeddingProvider.isAvailable();
  }
}
