/**
 * FullTextSearch - FTS5-based keyword search for markdown content
 * Uses SQLite FTS5 for fast full-text search
 */

import type Database from "better-sqlite3";
import type { SQLiteManager } from "../storage/SQLiteManager.js";
import type { WritingStorage } from "../storage/WritingStorage.js";
import type { SearchResult } from "../markdown/types.js";

/**
 * FullTextSearch configuration
 */
export interface FullTextSearchConfig {
  limit?: number; // Max results to return
  highlightTags?: [string, string]; // Tags for highlighting matches
}

/**
 * Default search configuration
 */
export const DEFAULT_FTS_CONFIG: FullTextSearchConfig = {
  limit: 10,
  highlightTags: ["<mark>", "</mark>"],
};

/**
 * FTS search result with ranking
 */
interface FTSResult {
  chunk_id: string;
  file_path: string;
  heading: string | null;
  content: string;
  rank: number;
}

/**
 * FullTextSearch class
 */
export class FullTextSearch {
  private db: Database.Database;
  private writingStorage: WritingStorage;
  private config: FullTextSearchConfig;

  constructor(
    sqliteManager: SQLiteManager,
    writingStorage: WritingStorage,
    config: Partial<FullTextSearchConfig> = {}
  ) {
    this.db = sqliteManager.getDatabase();
    this.writingStorage = writingStorage;
    this.config = { ...DEFAULT_FTS_CONFIG, ...config };
  }

  /**
   * Index chunks in FTS5 table
   */
  async indexChunks(chunks: Array<{
    chunk_id: string;
    file_path: string;
    heading: string | null;
    content: string;
  }>): Promise<void> {
    console.log(`Indexing ${chunks.length} chunks in FTS5...`);

    const stmt = this.db.prepare(`
      INSERT INTO markdown_chunks_fts (chunk_id, file_path, heading, content)
      VALUES (?, ?, ?, ?)
    `);

    this.db.transaction(() => {
      for (const chunk of chunks) {
        stmt.run(
          chunk.chunk_id,
          chunk.file_path,
          chunk.heading,
          chunk.content
        );
      }
    })();

    console.log(`✓ Indexed ${chunks.length} chunks in FTS5`);
  }

  /**
   * Search for chunks matching query
   */
  async search(
    query: string,
    config: Partial<FullTextSearchConfig> = {}
  ): Promise<SearchResult[]> {
    const searchConfig = { ...this.config, ...config };

    // Execute FTS5 search with ranking
    const results = this.db
      .prepare(
        `SELECT
          chunk_id,
          file_path,
          heading,
          content,
          rank
        FROM markdown_chunks_fts
        WHERE markdown_chunks_fts MATCH ?
        ORDER BY rank
        LIMIT ?`
      )
      .all(query, searchConfig.limit || 10) as FTSResult[];

    // Convert to SearchResult format
    const searchResults: SearchResult[] = [];

    for (const result of results) {
      // Find the chunk in storage
      const chunk = this.findChunkById(result.chunk_id);
      if (!chunk) {
        continue;
      }

      // Find the file
      const file = this.writingStorage.getFileById(chunk.file_id);
      if (!file) {
        continue;
      }

      // Calculate similarity from rank (FTS5 rank is negative, lower is better)
      // Normalize to 0-1 range
      const similarity = 1 / (Math.abs(result.rank) + 1);

      searchResults.push({
        chunk,
        file,
        similarity,
      });
    }

    return searchResults;
  }

  /**
   * Search with snippets (highlighted excerpts)
   */
  async searchWithSnippets(
    query: string,
    config: Partial<FullTextSearchConfig> = {}
  ): Promise<Array<SearchResult & { snippet: string }>> {
    const searchConfig = { ...this.config, ...config };
    const [startTag, endTag] = searchConfig.highlightTags || ["<mark>", "</mark>"];

    // Execute FTS5 search with snippets
    const results = this.db
      .prepare(
        `SELECT
          chunk_id,
          file_path,
          heading,
          snippet(markdown_chunks_fts, 3, ?, ?, '...', 32) as snippet,
          rank
        FROM markdown_chunks_fts
        WHERE markdown_chunks_fts MATCH ?
        ORDER BY rank
        LIMIT ?`
      )
      .all(startTag, endTag, query, searchConfig.limit || 10) as Array<
      FTSResult & { snippet: string }
    >;

    // Convert to SearchResult format
    const searchResults: Array<SearchResult & { snippet: string }> = [];

    for (const result of results) {
      // Find the chunk in storage
      const chunk = this.findChunkById(result.chunk_id);
      if (!chunk) {
        continue;
      }

      // Find the file
      const file = this.writingStorage.getFileById(chunk.file_id);
      if (!file) {
        continue;
      }

      // Calculate similarity from rank
      const similarity = 1 / (Math.abs(result.rank) + 1);

      searchResults.push({
        chunk,
        file,
        similarity,
        snippet: result.snippet,
      });
    }

    return searchResults;
  }

  /**
   * Clear FTS index
   */
  async clearIndex(): Promise<void> {
    this.db.exec("DELETE FROM markdown_chunks_fts");
    console.log("✓ Cleared FTS5 index");
  }

  /**
   * Get index statistics
   */
  getIndexStats(): { totalChunks: number } {
    const result = this.db
      .prepare("SELECT COUNT(*) as count FROM markdown_chunks_fts")
      .get() as { count: number };

    return { totalChunks: result.count };
  }

  /**
   * Helper to find chunk by ID
   */
  private findChunkById(chunkId: string) {
    const allFiles = this.writingStorage.getAllFiles();

    for (const file of allFiles) {
      const chunks = this.writingStorage.getChunksForFile(file.id);
      const chunk = chunks.find((c) => c.id === chunkId);
      if (chunk) {
        return chunk;
      }
    }

    return null;
  }
}
