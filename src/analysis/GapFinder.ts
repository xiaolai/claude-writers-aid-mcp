/**
 * GapFinder - Find terms mentioned but not explained/defined
 */

import { WritingStorage } from "../storage/WritingStorage.js";
import { paginateResults } from "../utils/pagination.js";

export interface TermGap {
  term: string;
  mentions: number;
  files: string[];
  hasDefinition: boolean;
}

export class GapFinder {
  constructor(private storage: WritingStorage) {}

  async findGaps(options: { scope?: string; limit?: number }): Promise<TermGap[]> {
    const { limit } = options;
    const files = await this.storage.getAllFiles();
    const termMentions = new Map<string, { count: number; files: Set<string> }>();
    const definedTerms = new Set<string>();

    // Extract terms and definitions
    for (const file of files) {
      const content = file.content;

      // Find potential technical terms (capitalized, or specific patterns)
      const terms = this.extractTerms(content);
      for (const term of terms) {
        if (!termMentions.has(term)) {
          termMentions.set(term, { count: 0, files: new Set() });
        }
        const entry = termMentions.get(term);
        if (entry) {
          entry.count++;
          entry.files.add(file.file_path);
        }
      }

      // Find definitions
      const definitions = this.extractDefinitions(content);
      definitions.forEach((d) => definedTerms.add(d));
    }

    // Find gaps (mentioned but not defined)
    const gaps: TermGap[] = [];

    for (const [term, data] of termMentions) {
      if (data.count >= 2 && !definedTerms.has(term)) {
        gaps.push({
          term,
          mentions: data.count,
          files: Array.from(data.files),
          hasDefinition: false,
        });
      }
    }

    const sorted = gaps.sort((a, b) => b.mentions - a.mentions);
    return paginateResults(sorted, limit);
  }

  private extractTerms(content: string): string[] {
    // Extract capitalized words and technical terms
    const capitalizedWords = content.match(/\b[A-Z][a-z]+\b/g) || [];
    const acronyms = content.match(/\b[A-Z]{2,}\b/g) || [];
    return [...new Set([...capitalizedWords, ...acronyms])];
  }

  private extractDefinitions(content: string): string[] {
    const definitions: string[] = [];

    // Pattern: "X is defined as", "X means", "X refers to"
    const patterns = [
      /\b(\w+)\s+is\s+defined\s+as\b/gi,
      /\b(\w+)\s+means\b/gi,
      /\b(\w+)\s+refers\s+to\b/gi,
      /\*\*(\w+)\*\*:\s/g, // Bold term followed by colon
    ];

    for (const pattern of patterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {definitions.push(match[1]);}
      }
    }

    return definitions;
  }
}
