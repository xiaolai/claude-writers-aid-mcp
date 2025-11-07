/**
 * TerminologyChecker - Detects inconsistent term usage across manuscript
 *
 * Finds term variants (e.g., "email" vs "e-mail" vs "Email") and suggests standardization.
 */

import { WritingStorage } from "../storage/WritingStorage.js";

export interface TermVariant {
  term: string;
  count: number;
  files: string[];
  examples: { file: string; line: number; context: string }[];
}

export interface TermGroup {
  canonical: string;
  variants: TermVariant[];
  totalCount: number;
  inconsistency: "high" | "medium" | "low";
}

export interface TerminologyReport {
  groups: TermGroup[];
  totalIssues: number;
  filesAffected: number;
}

export class TerminologyChecker {
  constructor(private storage: WritingStorage) {}

  /**
   * Find inconsistent terminology usage across files
   */
  async checkTerminology(options: {
    scope?: string;
    autoDetect?: boolean;
    terms?: string[];
  }): Promise<TerminologyReport> {
    const { scope, autoDetect = true, terms } = options;

    if (terms && terms.length > 0) {
      return this.checkSpecificTerms(terms, scope);
    }

    if (autoDetect) {
      return this.autoDetectVariants(scope);
    }

    return {
      groups: [],
      totalIssues: 0,
      filesAffected: 0,
    };
  }

  /**
   * Check specific terms for variants
   */
  private async checkSpecificTerms(
    terms: string[],
    scope?: string
  ): Promise<TerminologyReport> {
    const groups: TermGroup[] = [];
    const filesAffected = new Set<string>();

    for (const term of terms) {
      const variants = await this.findVariantsForTerm(term, scope);

      if (variants.length > 1) {
        // Multiple variants found - inconsistency detected
        const group = this.createTermGroup(term, variants);
        groups.push(group);

        variants.forEach((v) => v.files.forEach((f) => filesAffected.add(f)));
      }
    }

    return {
      groups,
      totalIssues: groups.length,
      filesAffected: filesAffected.size,
    };
  }

  /**
   * Auto-detect term variants by analyzing content
   */
  private async autoDetectVariants(scope?: string): Promise<TerminologyReport> {
    // Get all files
    const files = await this.storage.getAllFiles();
    const termCounts = new Map<string, Map<string, number>>();

    // Extract and normalize terms
    for (const file of files) {
      if (scope && !this.matchesScope(file.file_path, scope)) {
        continue;
      }

      const content = file.content;
      const words = this.extractWords(content);

      for (const word of words) {
        const normalized = this.normalizeForGrouping(word);

        if (!termCounts.has(normalized)) {
          termCounts.set(normalized, new Map());
        }

        const variantMap = termCounts.get(normalized);
        if (variantMap) {
          variantMap.set(word, (variantMap.get(word) || 0) + 1);
        }
      }
    }

    // Find groups with multiple variants
    const groups: TermGroup[] = [];
    const filesAffected = new Set<string>();

    for (const [normalized, variantMap] of termCounts) {
      if (variantMap.size > 1 && this.isSignificantTerm(normalized, variantMap)) {
        const variants: TermVariant[] = [];

        for (const [variant, count] of variantMap) {
          const examples = await this.findExamples(variant, scope, 3);
          const variantFiles = examples.map((e) => e.file);

          variants.push({
            term: variant,
            count,
            files: [...new Set(variantFiles)],
            examples,
          });

          variantFiles.forEach((f) => filesAffected.add(f));
        }

        const canonical = this.selectCanonical(variants);
        const group: TermGroup = {
          canonical,
          variants,
          totalCount: Array.from(variantMap.values()).reduce((a, b) => a + b, 0),
          inconsistency: this.calculateInconsistency(variants),
        };

        groups.push(group);
      }
    }

    // Sort by inconsistency severity
    groups.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.inconsistency] - severityOrder[a.inconsistency];
    });

    return {
      groups,
      totalIssues: groups.length,
      filesAffected: filesAffected.size,
    };
  }

  /**
   * Find variants for a specific term
   */
  private async findVariantsForTerm(
    term: string,
    scope?: string
  ): Promise<TermVariant[]> {
    const files = await this.storage.getAllFiles();
    const variantCounts = new Map<string, number>();
    const variantFiles = new Map<string, Set<string>>();

    const normalized = this.normalizeForGrouping(term);

    for (const file of files) {
      if (scope && !this.matchesScope(file.file_path, scope)) {
        continue;
      }

      const content = file.content;
      const words = this.extractWords(content);

      for (const word of words) {
        if (this.normalizeForGrouping(word) === normalized) {
          variantCounts.set(word, (variantCounts.get(word) || 0) + 1);

          if (!variantFiles.has(word)) {
            variantFiles.set(word, new Set());
          }
          variantFiles.get(word)?.add(file.file_path);
        }
      }
    }

    const variants: TermVariant[] = [];

    for (const [variant, count] of variantCounts) {
      const examples = await this.findExamples(variant, scope, 3);
      const files = Array.from(variantFiles.get(variant) || []);

      variants.push({
        term: variant,
        count,
        files,
        examples,
      });
    }

    return variants;
  }

  /**
   * Find usage examples for a term
   */
  private async findExamples(
    term: string,
    scope: string | undefined,
    limit: number
  ): Promise<{ file: string; line: number; context: string }[]> {
    const files = await this.storage.getAllFiles();
    const examples: { file: string; line: number; context: string }[] = [];

    for (const file of files) {
      if (scope && !this.matchesScope(file.file_path, scope)) {
        continue;
      }

      if (examples.length >= limit) {
        break;
      }

      const lines = file.content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (this.containsWord(line, term)) {
          examples.push({
            file: file.file_path,
            line: i + 1,
            context: line.trim(),
          });

          if (examples.length >= limit) {
            break;
          }
        }
      }
    }

    return examples;
  }

  /**
   * Create term group from variants
   */
  private createTermGroup(canonical: string, variants: TermVariant[]): TermGroup {
    const totalCount = variants.reduce((sum, v) => sum + v.count, 0);

    return {
      canonical,
      variants,
      totalCount,
      inconsistency: this.calculateInconsistency(variants),
    };
  }

  /**
   * Select canonical form from variants (most common)
   */
  private selectCanonical(variants: TermVariant[]): string {
    return variants.reduce((a, b) => (a.count > b.count ? a : b)).term;
  }

  /**
   * Calculate inconsistency level based on variant distribution
   */
  private calculateInconsistency(
    variants: TermVariant[]
  ): "high" | "medium" | "low" {
    if (variants.length <= 1) {
      return "low";
    }

    const totalCount = variants.reduce((sum, v) => sum + v.count, 0);
    const maxCount = Math.max(...variants.map((v) => v.count));
    const dominance = maxCount / totalCount;

    // High dominance (>80%) = low inconsistency
    if (dominance > 0.8) {
      return "low";
    }

    // Medium dominance (50-80%) = medium inconsistency
    if (dominance > 0.5) {
      return "medium";
    }

    // Low dominance (<50%) = high inconsistency
    return "high";
  }

  /**
   * Check if term is significant (not common words)
   */
  private isSignificantTerm(
    normalized: string,
    variantMap: Map<string, number>
  ): boolean {
    const totalCount = Array.from(variantMap.values()).reduce((a, b) => a + b, 0);

    // Ignore very common words
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "as",
      "is",
      "was",
      "are",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "can",
      "this",
      "that",
      "these",
      "those",
      "i",
      "you",
      "he",
      "she",
      "it",
      "we",
      "they",
    ]);

    if (stopWords.has(normalized)) {
      return false;
    }

    // Require minimum usage
    if (totalCount < 3) {
      return false;
    }

    // Require at least 2 characters
    if (normalized.length < 2) {
      return false;
    }

    return true;
  }

  /**
   * Normalize term for grouping (lowercase, no punctuation)
   */
  private normalizeForGrouping(term: string): string {
    return term.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  /**
   * Extract words from content
   */
  private extractWords(content: string): string[] {
    // Match words (including hyphenated words)
    const wordRegex = /\b[\w-]+\b/g;
    return content.match(wordRegex) || [];
  }

  /**
   * Check if line contains word (word boundary aware)
   */
  private containsWord(line: string, word: string): boolean {
    const regex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, "i");
    return regex.test(line);
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Check if file path matches scope pattern
   */
  private matchesScope(filePath: string, scope: string): boolean {
    // Simple glob matching (supports * wildcard)
    const pattern = scope.replace(/\*/g, ".*");
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(filePath);
  }
}
