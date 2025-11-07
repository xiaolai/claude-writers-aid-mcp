/**
 * ReadabilityAnalyzer - Calculate readability metrics (Flesch-Kincaid, etc.)
 */

import { WritingStorage } from "../storage/WritingStorage.js";

export interface ReadabilityMetrics {
  file: string;
  fleschReadingEase: number;
  fleschKincaidGradeLevel: number;
  averageWordsPerSentence: number;
  averageSyllablesPerWord: number;
  totalWords: number;
  totalSentences: number;
  readingLevel: "elementary" | "middle-school" | "high-school" | "college" | "advanced";
}

export class ReadabilityAnalyzer {
  constructor(private storage: WritingStorage) {}

  async analyzeReadability(filePath?: string): Promise<ReadabilityMetrics[]> {
    const files = filePath
      ? [await this.storage.getFile(filePath)]
      : await this.storage.getAllFiles();

    const validFiles = files.filter((f) => f !== null);
    const results: ReadabilityMetrics[] = [];

    for (const file of validFiles) {
      const metrics = this.calculateMetrics(file.content, file.file_path);
      results.push(metrics);
    }

    return results;
  }

  private calculateMetrics(content: string, filePath: string): ReadabilityMetrics {
    // Remove markdown syntax
    const cleanText = this.stripMarkdown(content);

    const sentences = this.countSentences(cleanText);
    const words = this.countWords(cleanText);
    const syllables = this.countSyllables(cleanText);

    const avgWordsPerSentence = sentences > 0 ? words / sentences : 0;
    const avgSyllablesPerWord = words > 0 ? syllables / words : 0;

    // Flesch Reading Ease: 206.835 - 1.015(words/sentences) - 84.6(syllables/words)
    const fleschReadingEase =
      206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;

    // Flesch-Kincaid Grade Level: 0.39(words/sentences) + 11.8(syllables/words) - 15.59
    const fleschKincaidGradeLevel =
      0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;

    return {
      file: filePath,
      fleschReadingEase: Math.max(0, Math.min(100, fleschReadingEase)),
      fleschKincaidGradeLevel: Math.max(0, fleschKincaidGradeLevel),
      averageWordsPerSentence: avgWordsPerSentence,
      averageSyllablesPerWord: avgSyllablesPerWord,
      totalWords: words,
      totalSentences: sentences,
      readingLevel: this.getReadingLevel(fleschKincaidGradeLevel),
    };
  }

  private stripMarkdown(content: string): string {
    return content
      .replace(/^#+\s+/gm, "") // Remove headers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Links
      .replace(/[*_~`]/g, "") // Emphasis
      .replace(/^[->]\s+/gm, "") // Lists
      .replace(/```[\s\S]*?```/g, "") // Code blocks
      .replace(/`[^`]+`/g, ""); // Inline code
  }

  private countSentences(text: string): number {
    const sentences = text.match(/[.!?]+/g);
    return sentences ? sentences.length : 1;
  }

  private countWords(text: string): number {
    const words = text.match(/\b\w+\b/g);
    return words ? words.length : 0;
  }

  private countSyllables(text: string): number {
    const words = text.match(/\b\w+\b/g) || [];
    return words.reduce((total, word) => total + this.syllablesInWord(word), 0);
  }

  private syllablesInWord(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) {return 1;}

    const vowels = word.match(/[aeiouy]+/g);
    let count = vowels ? vowels.length : 1;

    // Adjust for silent 'e'
    if (word.endsWith("e")) {count--;}

    return Math.max(1, count);
  }

  private getReadingLevel(gradeLevel: number): ReadabilityMetrics["readingLevel"] {
    if (gradeLevel < 6) {return "elementary";}
    if (gradeLevel < 9) {return "middle-school";}
    if (gradeLevel < 13) {return "high-school";}
    if (gradeLevel < 16) {return "college";}
    return "advanced";
  }
}
