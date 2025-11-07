/**
 * ThemeExtractor - Extract main themes from content
 */

import { WritingStorage } from "../storage/WritingStorage.js";

export interface ThemeOptions {
  scope?: string;
  numThemes?: number;
}

export class ThemeExtractor {
  constructor(private storage: WritingStorage) {}

  async extractThemes(options?: ThemeOptions) {
    const { numThemes = 5 } = options || {};

    const files = await this.storage.getAllFiles();
    const wordFreq = new Map<string, number>();

    // Simple theme extraction based on word frequency
    for (const file of files) {
      const words = file.content.toLowerCase().match(/\b\w+\b/g) || [];
      for (const word of words) {
        if (word.length > 4) {
          // Skip short words
          wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        }
      }
    }

    // Get top themes
    const themes = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, numThemes)
      .map(([word, count]) => ({ theme: word, count }));

    return themes;
  }
}
