/**
 * MarkdownChunker - Split markdown content into semantic chunks
 * Uses heading-based chunking with size limits for semantic search
 */

import { nanoid } from "nanoid";
import type {
  MarkdownChunk,
  MarkdownHeading,
  ChunkConfig,
} from "../markdown/types.js";

/**
 * Default chunking configuration
 */
export const DEFAULT_CHUNK_CONFIG: ChunkConfig = {
  maxChunkSize: 500, // Max words per chunk
  overlapSize: 50, // Overlap words
  splitOnHeadings: true, // Split at heading boundaries
  preserveContext: true, // Include parent headings
};

/**
 * MarkdownChunker class
 */
export class MarkdownChunker {
  private config: ChunkConfig;

  constructor(config: Partial<ChunkConfig> = {}) {
    this.config = { ...DEFAULT_CHUNK_CONFIG, ...config };
  }

  /**
   * Chunk markdown content
   */
  chunk(
    fileId: string,
    content: string,
    headings: MarkdownHeading[]
  ): MarkdownChunk[] {
    if (this.config.splitOnHeadings && headings.length > 0) {
      return this.chunkByHeadings(fileId, content, headings);
    } else {
      return this.chunkBySize(fileId, content);
    }
  }

  /**
   * Chunk content by heading boundaries
   */
  private chunkByHeadings(
    fileId: string,
    content: string,
    headings: MarkdownHeading[]
  ): MarkdownChunk[] {
    const chunks: MarkdownChunk[] = [];
    const lines = content.split("\n");

    // Build heading hierarchy map
    const headingMap = new Map<string, MarkdownHeading>();
    for (const heading of headings) {
      headingMap.set(heading.id, heading);
    }

    // Process each heading section
    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const nextHeading = headings[i + 1];

      // Find section boundaries
      const startLine = heading.line_number - 1; // 0-indexed
      const endLine = nextHeading
        ? nextHeading.line_number - 1
        : lines.length;

      // Extract section content
      const sectionLines = lines.slice(startLine, endLine);
      const sectionContent = sectionLines.join("\n");

      // Get context (parent headings)
      const context = this.config.preserveContext
        ? this.getHeadingContext(heading, headingMap)
        : heading.text;

      // Count words
      const wordCount = this.countWords(sectionContent);
      const tokenCount = this.estimateTokens(sectionContent);

      // If section is too large, split it further
      if (wordCount > this.config.maxChunkSize) {
        const subChunks = this.splitLargeSection(
          fileId,
          sectionContent,
          context,
          startLine,
          chunks.length
        );
        chunks.push(...subChunks);
      } else {
        // Create single chunk for this section
        chunks.push({
          id: nanoid(),
          file_id: fileId,
          chunk_index: chunks.length,
          heading: context,
          content: sectionContent,
          start_offset: this.calculateOffset(lines, startLine),
          end_offset: this.calculateOffset(lines, endLine),
          token_count: tokenCount,
          word_count: wordCount,
        });
      }
    }

    // Handle content before first heading
    if (headings.length > 0 && headings[0].line_number > 1) {
      const preambleLines = lines.slice(0, headings[0].line_number - 1);
      const preambleContent = preambleLines.join("\n").trim();

      if (preambleContent) {
        chunks.unshift({
          id: nanoid(),
          file_id: fileId,
          chunk_index: 0,
          heading: null,
          content: preambleContent,
          start_offset: 0,
          end_offset: this.calculateOffset(lines, headings[0].line_number - 1),
          token_count: this.estimateTokens(preambleContent),
          word_count: this.countWords(preambleContent),
        });

        // Reindex chunks
        for (let i = 1; i < chunks.length; i++) {
          chunks[i].chunk_index = i;
        }
      }
    }

    return chunks;
  }

  /**
   * Split large section into multiple chunks
   */
  private splitLargeSection(
    fileId: string,
    content: string,
    heading: string,
    startLine: number,
    baseIndex: number
  ): MarkdownChunk[] {
    const chunks: MarkdownChunk[] = [];
    const words = content.split(/\s+/);
    const maxWords = this.config.maxChunkSize;
    const overlapWords = this.config.overlapSize;

    let currentIndex = 0;

    while (currentIndex < words.length) {
      const chunkWords = words.slice(
        currentIndex,
        currentIndex + maxWords
      );
      const chunkContent = chunkWords.join(" ");

      chunks.push({
        id: nanoid(),
        file_id: fileId,
        chunk_index: baseIndex + chunks.length,
        heading,
        content: chunkContent,
        start_offset: startLine, // Approximate
        end_offset: startLine, // Approximate
        token_count: this.estimateTokens(chunkContent),
        word_count: chunkWords.length,
      });

      // Move to next chunk with overlap
      currentIndex += maxWords - overlapWords;

      // Prevent infinite loop
      if (maxWords <= overlapWords) {
        break;
      }
    }

    return chunks;
  }

  /**
   * Chunk content by size without respecting headings
   */
  private chunkBySize(fileId: string, content: string): MarkdownChunk[] {
    const chunks: MarkdownChunk[] = [];

    // Handle empty content
    if (!content.trim()) {
      return chunks;
    }

    const words = content.split(/\s+/);
    const maxWords = this.config.maxChunkSize;
    const overlapWords = this.config.overlapSize;

    let currentIndex = 0;

    while (currentIndex < words.length) {
      const chunkWords = words.slice(
        currentIndex,
        currentIndex + maxWords
      );
      const chunkContent = chunkWords.join(" ");

      chunks.push({
        id: nanoid(),
        file_id: fileId,
        chunk_index: chunks.length,
        heading: null,
        content: chunkContent,
        start_offset: 0, // Not tracking offsets in this mode
        end_offset: 0,
        token_count: this.estimateTokens(chunkContent),
        word_count: chunkWords.length,
      });

      currentIndex += maxWords - overlapWords;

      if (maxWords <= overlapWords) {
        break;
      }
    }

    return chunks;
  }

  /**
   * Get full heading context (parent headings)
   */
  private getHeadingContext(
    heading: MarkdownHeading,
    headingMap: Map<string, MarkdownHeading>
  ): string {
    const parts: string[] = [];
    let current: MarkdownHeading | undefined = heading;

    // Walk up the hierarchy
    while (current) {
      parts.unshift(current.text);

      if (current.parent_id) {
        current = headingMap.get(current.parent_id);
      } else {
        break;
      }
    }

    return parts.join(" > ");
  }

  /**
   * Calculate byte offset in content
   */
  private calculateOffset(lines: string[], lineIndex: number): number {
    let offset = 0;

    for (let i = 0; i < lineIndex && i < lines.length; i++) {
      offset += lines[i].length + 1; // +1 for newline
    }

    return offset;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    const words = text.trim().split(/\s+/);
    return words[0] === "" ? 0 : words.length;
  }

  /**
   * Estimate token count (rough approximation)
   * Tokens ≈ words * 1.3 (conservative estimate for English)
   */
  private estimateTokens(text: string): number {
    const wordCount = this.countWords(text);
    return Math.ceil(wordCount * 1.3);
  }
}
