/**
 * MetadataExtractor - Extract and validate frontmatter metadata
 * Converts frontmatter to MarkdownMetadata entries for storage
 */

import { nanoid } from "nanoid";
import type {
  Frontmatter,
  MarkdownMetadata,
} from "../markdown/types.js";

/**
 * MetadataExtractor class
 */
export class MetadataExtractor {
  /**
   * Convert frontmatter to metadata entries
   */
  extractMetadata(
    fileId: string,
    frontmatter: Frontmatter
  ): MarkdownMetadata[] {
    const metadata: MarkdownMetadata[] = [];

    for (const [key, value] of Object.entries(frontmatter)) {
      metadata.push({
        id: nanoid(),
        file_id: fileId,
        key,
        value: this.serializeValue(value),
      });
    }

    return metadata;
  }

  /**
   * Serialize metadata value to string
   */
  private serializeValue(value: unknown): string {
    if (Array.isArray(value)) {
      return JSON.stringify(value);
    }

    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Deserialize metadata value from string
   */
  deserializeValue(value: string): unknown {
    // Try to parse as JSON first
    try {
      return JSON.parse(value);
    } catch {
      // If not JSON, return as string
      return value;
    }
  }

  /**
   * Get metadata by key
   */
  getMetadataValue(
    metadata: MarkdownMetadata[],
    key: string
  ): unknown | null {
    const entry = metadata.find((m) => m.key === key);

    if (!entry) {
      return null;
    }

    return this.deserializeValue(entry.value);
  }

  /**
   * Validate required metadata fields
   */
  validateMetadata(
    frontmatter: Frontmatter,
    requiredFields: string[]
  ): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const field of requiredFields) {
      if (!(field in frontmatter) || frontmatter[field] === undefined || frontmatter[field] === null) {
        missing.push(field);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Extract common metadata fields
   */
  extractCommonFields(frontmatter: Frontmatter): {
    title?: string;
    author?: string;
    date?: string;
    tags?: string[];
    draft?: boolean;
    description?: string;
  } {
    return {
      title: this.getString(frontmatter.title),
      author: this.getString(frontmatter.author),
      date: this.getString(frontmatter.date),
      tags: this.getStringArray(frontmatter.tags),
      draft: this.getBoolean(frontmatter.draft),
      description: this.getString(frontmatter.description),
    };
  }

  /**
   * Get string value from unknown type
   */
  private getString(value: unknown): string | undefined {
    if (typeof value === "string") {
      return value;
    }
    return undefined;
  }

  /**
   * Get string array value from unknown type
   */
  private getStringArray(value: unknown): string[] | undefined {
    if (Array.isArray(value)) {
      const strings = value.filter((v) => typeof v === "string") as string[];
      return strings.length > 0 ? strings : undefined;
    }
    return undefined;
  }

  /**
   * Get boolean value from unknown type
   */
  private getBoolean(value: unknown): boolean | undefined {
    if (typeof value === "boolean") {
      return value;
    }
    return undefined;
  }
}
