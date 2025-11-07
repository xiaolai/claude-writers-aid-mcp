/**
 * WritingStorage - Database operations for Writer's Aid MCP
 * Handles CRUD operations for markdown files, chunks, links, and metadata
 */

import type Database from "better-sqlite3";
import type { SQLiteManager } from "./SQLiteManager.js";
import { QueryCache, type QueryCacheConfig, type CacheStats } from "../cache/QueryCache.js";
import type {
  MarkdownFile,
  MarkdownChunk,
  MarkdownHeading,
  MarkdownLink,
  MarkdownMetadata,
  MarkdownFileRow,
  MarkdownChunkRow,
} from "../markdown/types.js";

/**
 * WritingStorage class for managing manuscript data
 */
export class WritingStorage {
  private db: Database.Database;
  private cache: QueryCache | null = null;

  constructor(sqliteManager: SQLiteManager) {
    this.db = sqliteManager.getDatabase();
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  /**
   * Enable query caching for better performance
   */
  enableCache(config: QueryCacheConfig): void {
    this.cache = new QueryCache(config);
  }

  /**
   * Disable query caching
   */
  disableCache(): void {
    this.cache = null;
  }

  /**
   * Check if caching is enabled
   */
  isCacheEnabled(): boolean {
    return this.cache !== null;
  }

  /**
   * Clear all cached queries
   */
  clearCache(): void {
    this.cache?.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats | null {
    return this.cache ? this.cache.getStats() : null;
  }

  // ============================================================================
  // File Operations
  // ============================================================================

  /**
   * Store markdown files in the database
   */
  async storeFiles(files: MarkdownFile[]): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO markdown_files
      (id, file_path, title, content, content_hash, word_count, created_at, last_modified, indexed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.db.transaction(() => {
      for (const file of files) {
        stmt.run(
          file.id,
          file.file_path,
          file.title,
          file.content,
          file.content_hash,
          file.word_count,
          file.created_at,
          file.last_modified,
          file.indexed_at
        );

        // Invalidate cache for this file
        if (this.cache) {
          this.cache.delete(`file:${file.file_path}`);
          this.cache.delete(`file:${file.id}`);
        }
      }
    })();

    console.log(`✓ Stored ${files.length} markdown files`);
  }

  /**
   * Get a file by path
   */
  getFile(filePath: string): MarkdownFile | null {
    const cacheKey = `file:${filePath}`;

    // Check cache first
    if (this.cache) {
      const cached = this.cache.get<MarkdownFile | null>(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    const row = this.db
      .prepare("SELECT * FROM markdown_files WHERE file_path = ?")
      .get(filePath) as MarkdownFileRow | undefined;

    if (!row) {
      this.cache?.set(cacheKey, null);
      return null;
    }

    const result: MarkdownFile = {
      ...row,
      title: row.title || null,
    };

    this.cache?.set(cacheKey, result);
    return result;
  }

  /**
   * Get file by ID
   */
  getFileById(id: string): MarkdownFile | null {
    const cacheKey = `file:${id}`;

    if (this.cache) {
      const cached = this.cache.get<MarkdownFile | null>(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    const row = this.db
      .prepare("SELECT * FROM markdown_files WHERE id = ?")
      .get(id) as MarkdownFileRow | undefined;

    if (!row) {
      this.cache?.set(cacheKey, null);
      return null;
    }

    const result: MarkdownFile = {
      ...row,
      title: row.title || null,
    };

    this.cache?.set(cacheKey, result);
    return result;
  }

  /**
   * Get all files
   */
  getAllFiles(): MarkdownFile[] {
    const rows = this.db
      .prepare("SELECT * FROM markdown_files ORDER BY file_path")
      .all() as MarkdownFileRow[];

    return rows.map((row) => ({
      ...row,
      title: row.title || null,
    }));
  }

  // ============================================================================
  // Chunk Operations
  // ============================================================================

  /**
   * Store markdown chunks
   */
  async storeChunks(chunks: MarkdownChunk[]): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO markdown_chunks
      (id, file_id, chunk_index, heading, content, start_offset, end_offset, token_count, word_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.db.transaction(() => {
      for (const chunk of chunks) {
        stmt.run(
          chunk.id,
          chunk.file_id,
          chunk.chunk_index,
          chunk.heading,
          chunk.content,
          chunk.start_offset,
          chunk.end_offset,
          chunk.token_count,
          chunk.word_count
        );
      }
    })();

    console.log(`✓ Stored ${chunks.length} chunks`);
  }

  /**
   * Get chunks for a file
   */
  getChunksForFile(fileId: string): MarkdownChunk[] {
    const cacheKey = `chunks:${fileId}`;

    if (this.cache) {
      const cached = this.cache.get<MarkdownChunk[]>(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    const rows = this.db
      .prepare("SELECT * FROM markdown_chunks WHERE file_id = ? ORDER BY chunk_index")
      .all(fileId) as MarkdownChunkRow[];

    const result: MarkdownChunk[] = rows.map((row) => ({
      ...row,
      heading: row.heading || null,
    }));

    this.cache?.set(cacheKey, result);
    return result;
  }

  // ============================================================================
  // Heading Operations
  // ============================================================================

  /**
   * Store headings
   */
  async storeHeadings(headings: MarkdownHeading[]): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO markdown_headings
      (id, file_id, level, text, slug, line_number, parent_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    this.db.transaction(() => {
      for (const heading of headings) {
        stmt.run(
          heading.id,
          heading.file_id,
          heading.level,
          heading.text,
          heading.slug,
          heading.line_number,
          heading.parent_id
        );
      }
    })();

    console.log(`✓ Stored ${headings.length} headings`);
  }

  /**
   * Get headings for a file
   */
  getHeadingsForFile(fileId: string): MarkdownHeading[] {
    const rows = this.db
      .prepare("SELECT * FROM markdown_headings WHERE file_id = ? ORDER BY line_number")
      .all(fileId) as MarkdownHeading[];

    return rows;
  }

  // ============================================================================
  // Link Operations
  // ============================================================================

  /**
   * Store links
   */
  async storeLinks(links: MarkdownLink[]): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO markdown_links
      (id, source_file_id, target_file_path, link_text, link_type, source_line, is_broken)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    this.db.transaction(() => {
      for (const link of links) {
        stmt.run(
          link.id,
          link.source_file_id,
          link.target_file_path,
          link.link_text,
          link.link_type,
          link.source_line,
          link.is_broken ? 1 : 0
        );
      }
    })();

    console.log(`✓ Stored ${links.length} links`);
  }

  /**
   * Get links from a file
   */
  getLinksFromFile(fileId: string): MarkdownLink[] {
    const rows = this.db
      .prepare("SELECT * FROM markdown_links WHERE source_file_id = ?")
      .all(fileId) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: row.id as string,
      source_file_id: row.source_file_id as string,
      target_file_path: row.target_file_path as string,
      link_text: (row.link_text as string) || null,
      link_type: row.link_type as 'wiki' | 'markdown' | 'external' | 'anchor',
      source_line: (row.source_line as number) || null,
      is_broken: Boolean(row.is_broken),
    }));
  }

  /**
   * Get broken links
   */
  getBrokenLinks(): MarkdownLink[] {
    const rows = this.db
      .prepare("SELECT * FROM markdown_links WHERE is_broken = 1")
      .all() as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: row.id as string,
      source_file_id: row.source_file_id as string,
      target_file_path: row.target_file_path as string,
      link_text: (row.link_text as string) || null,
      link_type: row.link_type as 'wiki' | 'markdown' | 'external' | 'anchor',
      source_line: (row.source_line as number) || null,
      is_broken: true,
    }));
  }

  // ============================================================================
  // Metadata Operations
  // ============================================================================

  /**
   * Store metadata
   */
  async storeMetadata(metadata: MarkdownMetadata[]): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO markdown_metadata
      (id, file_id, key, value)
      VALUES (?, ?, ?, ?)
    `);

    this.db.transaction(() => {
      for (const meta of metadata) {
        stmt.run(meta.id, meta.file_id, meta.key, meta.value);
      }
    })();

    console.log(`✓ Stored ${metadata.length} metadata entries`);
  }

  /**
   * Get metadata for a file
   */
  getMetadataForFile(fileId: string): MarkdownMetadata[] {
    const rows = this.db
      .prepare("SELECT * FROM markdown_metadata WHERE file_id = ?")
      .all(fileId) as MarkdownMetadata[];

    return rows;
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get database statistics
   */
  getStats(): {
    files: number;
    chunks: number;
    headings: number;
    links: number;
    todos: number;
  } {
    const cacheKey = "stats:all";

    if (this.cache) {
      const cached = this.cache.get<ReturnType<typeof this.getStats>>(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    const stats = {
      files: (this.db.prepare("SELECT COUNT(*) as count FROM markdown_files").get() as { count: number }).count,
      chunks: (this.db.prepare("SELECT COUNT(*) as count FROM markdown_chunks").get() as { count: number }).count,
      headings: (this.db.prepare("SELECT COUNT(*) as count FROM markdown_headings").get() as { count: number }).count,
      links: (this.db.prepare("SELECT COUNT(*) as count FROM markdown_links").get() as { count: number }).count,
      todos: (this.db.prepare("SELECT COUNT(*) as count FROM markdown_todos").get() as { count: number }).count,
    };

    this.cache?.set(cacheKey, stats);
    return stats;
  }

  // ============================================================================
  // Convenience Helper Methods
  // ============================================================================

  /**
   * Add a single file (convenience method)
   */
  async addFile(data: { filePath: string; content: string; title: string }): Promise<void> {
    const file: MarkdownFile = {
      id: data.filePath,
      file_path: data.filePath,
      title: data.title,
      content: data.content,
      content_hash: this.hashContent(data.content),
      word_count: data.content.split(/\s+/).length,
      created_at: Date.now(),
      last_modified: Date.now(),
      indexed_at: Date.now(),
    };

    await this.storeFiles([file]);
  }

  /**
   * Add a single chunk (convenience method)
   */
  async addChunk(
    filePath: string,
    data: { heading: string; content: string; chunkIndex: number; tokenCount: number }
  ): Promise<void> {
    const chunk: MarkdownChunk = {
      id: `${filePath}:${data.chunkIndex}`,
      file_id: filePath,
      chunk_index: data.chunkIndex,
      heading: data.heading,
      content: data.content,
      start_offset: 0,
      end_offset: data.content.length,
      token_count: data.tokenCount,
      word_count: data.content.split(/\s+/).length,
    };

    await this.storeChunks([chunk]);
  }

  /**
   * Add a single link (convenience method)
   */
  async addLink(data: {
    sourceFile: string;
    targetFile: string;
    linkText: string;
    linkType: string;
  }): Promise<void> {
    const link: MarkdownLink = {
      id: `${data.sourceFile}:${data.targetFile}`,
      source_file_id: data.sourceFile,
      target_file_path: data.targetFile,
      link_text: data.linkText,
      link_type: data.linkType as "wiki" | "markdown" | "external" | "anchor",
      source_line: 0,
      is_broken: false,
    };

    await this.storeLinks([link]);
  }

  /**
   * Get headings for a file
   */
  getHeadings(filePath: string): MarkdownHeading[] {
    const rows = this.db
      .prepare("SELECT * FROM markdown_headings WHERE file_id = ? ORDER BY line_number")
      .all(filePath) as MarkdownHeading[];

    return rows;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Hash content for change detection
   */
  private hashContent(content: string): string {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(36);
  }
}
