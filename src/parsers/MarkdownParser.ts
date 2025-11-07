/**
 * MarkdownParser - Parse markdown files for Writer's Aid
 * Extracts frontmatter, headings, and content structure
 */

import { nanoid } from "nanoid";
import { createHash } from "crypto";
import type {
  MarkdownFile,
  MarkdownHeading,
  Frontmatter,
} from "../markdown/types.js";

/**
 * Result of parsing a markdown file
 */
export interface ParseResult {
  file: MarkdownFile;
  headings: MarkdownHeading[];
  frontmatter: Frontmatter;
  contentWithoutFrontmatter: string;
}

/**
 * MarkdownParser class
 */
export class MarkdownParser {
  /**
   * Parse a markdown file
   */
  parse(filePath: string, content: string): ParseResult {
    const lines = content.split("\n");

    // Extract frontmatter
    const { frontmatter, contentStartLine } = this.extractFrontmatter(lines);

    // Get content without frontmatter
    const contentWithoutFrontmatter = lines.slice(contentStartLine).join("\n");

    // Extract headings
    const headings = this.extractHeadings(
      lines,
      contentStartLine,
      filePath
    );

    // Calculate metadata
    const contentHash = createHash("sha256")
      .update(content)
      .digest("hex");
    const wordCount = this.countWords(contentWithoutFrontmatter);
    const now = Date.now();

    // Create file record
    const file: MarkdownFile = {
      id: nanoid(),
      file_path: filePath,
      title: frontmatter.title || this.extractTitleFromContent(headings),
      content,
      content_hash: contentHash,
      word_count: wordCount,
      created_at: now,
      last_modified: now,
      indexed_at: now,
    };

    return {
      file,
      headings,
      frontmatter,
      contentWithoutFrontmatter,
    };
  }

  /**
   * Extract YAML frontmatter from markdown
   */
  private extractFrontmatter(
    lines: string[]
  ): { frontmatter: Frontmatter; contentStartLine: number } {
    const frontmatter: Frontmatter = {};
    let contentStartLine = 0;

    // Check for frontmatter (starts with ---)
    if (lines[0]?.trim() === "---") {
      let endLine = -1;

      // Find closing ---
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === "---") {
          endLine = i;
          break;
        }
      }

      if (endLine > 0) {
        // Parse YAML frontmatter
        const yamlLines = lines.slice(1, endLine);
        for (const line of yamlLines) {
          const colonIndex = line.indexOf(":");
          if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            let value: string | string[] | boolean = line
              .substring(colonIndex + 1)
              .trim();

            // Handle arrays (e.g., tags: [foo, bar])
            if (value.startsWith("[") && value.endsWith("]")) {
              value = value
                .slice(1, -1)
                .split(",")
                .map((v) => v.trim().replace(/^['"]|['"]$/g, ""));
            }
            // Handle booleans
            else if (value === "true" || value === "false") {
              value = value === "true";
            }
            // Remove quotes from strings
            else if (
              (value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))
            ) {
              value = value.slice(1, -1);
            }

            frontmatter[key] = value;
          }
        }

        contentStartLine = endLine + 1;
      }
    }

    return { frontmatter, contentStartLine };
  }

  /**
   * Extract headings from markdown
   */
  private extractHeadings(
    lines: string[],
    startLine: number,
    fileId: string
  ): MarkdownHeading[] {
    const headings: MarkdownHeading[] = [];
    const headingStack: Array<{ level: number; id: string }> = [];

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();
        const slug = this.createSlug(text);
        const id = nanoid();

        // Find parent heading
        let parentId: string | null = null;

        // Pop stack until we find a heading with lower level
        while (
          headingStack.length > 0 &&
          headingStack[headingStack.length - 1].level >= level
        ) {
          headingStack.pop();
        }

        // Parent is the top of stack (if exists)
        if (headingStack.length > 0) {
          parentId = headingStack[headingStack.length - 1].id;
        }

        headings.push({
          id,
          file_id: fileId,
          level,
          text,
          slug,
          line_number: i + 1, // 1-indexed
          parent_id: parentId,
        });

        // Push current heading onto stack
        headingStack.push({ level, id });
      }
    }

    return headings;
  }

  /**
   * Create URL-friendly slug from heading text
   */
  private createSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "") // Remove special chars
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single
      .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
  }

  /**
   * Extract title from first h1 heading
   */
  private extractTitleFromContent(
    headings: MarkdownHeading[]
  ): string | null {
    const firstH1 = headings.find((h) => h.level === 1);
    return firstH1?.text || null;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    // Remove code blocks
    const withoutCodeBlocks = text.replace(/```[\s\S]*?```/g, "");

    // Remove inline code
    const withoutInlineCode = withoutCodeBlocks.replace(/`[^`]*`/g, "");

    // Count words (split by whitespace)
    const words = withoutInlineCode.trim().split(/\s+/);

    return words[0] === "" ? 0 : words.length;
  }
}
