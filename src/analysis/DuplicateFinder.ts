/**
 * DuplicateFinder - Find near-duplicate content sections
 */

import { WritingStorage } from "../storage/WritingStorage.js";
import { paginateResults } from "../utils/pagination.js";

export interface DuplicateMatch {
  file1: string;
  file2: string;
  content: string;
  similarity: number;
  location1: { line: number };
  location2: { line: number };
}

export class DuplicateFinder {
  constructor(private storage: WritingStorage) {}

  async findDuplicates(options: {
    scope?: string;
    similarityThreshold?: number;
    minLength?: number;
    limit?: number;
  }): Promise<DuplicateMatch[]> {
    const { similarityThreshold = 0.8, minLength = 50, limit } = options;

    const files = await this.storage.getAllFiles();
    const matches: DuplicateMatch[] = [];

    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const duplicates = this.compareFiles(
          files[i],
          files[j],
          similarityThreshold,
          minLength
        );
        matches.push(...duplicates);
      }
    }

    // Sort by similarity (highest first) before pagination
    const sorted = matches.sort((a, b) => b.similarity - a.similarity);
    return paginateResults(sorted, limit);
  }

  private compareFiles(
    file1: { file_path: string; content: string },
    file2: { file_path: string; content: string },
    threshold: number,
    minLength: number
  ): DuplicateMatch[] {
    const matches: DuplicateMatch[] = [];
    const paragraphs1 = this.splitParagraphs(file1.content);
    const paragraphs2 = this.splitParagraphs(file2.content);

    for (let i = 0; i < paragraphs1.length; i++) {
      const para1 = paragraphs1[i];
      if (para1.text.length < minLength) {continue;}

      for (let j = 0; j < paragraphs2.length; j++) {
        const para2 = paragraphs2[j];
        if (para2.text.length < minLength) {continue;}

        const similarity = this.calculateSimilarity(para1.text, para2.text);

        if (similarity >= threshold) {
          matches.push({
            file1: file1.file_path,
            file2: file2.file_path,
            content: para1.text.substring(0, 100) + "...",
            similarity,
            location1: { line: para1.line },
            location2: { line: para2.line },
          });
        }
      }
    }

    return matches;
  }

  private splitParagraphs(content: string): { text: string; line: number }[] {
    const lines = content.split("\n");
    const paragraphs: { text: string; line: number }[] = [];
    let current = "";
    let startLine = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.length === 0) {
        if (current) {
          paragraphs.push({ text: current.trim(), line: startLine });
          current = "";
        }
        startLine = i + 2;
      } else {
        current += " " + line;
      }
    }

    if (current) {
      paragraphs.push({ text: current.trim(), line: startLine });
    }

    return paragraphs;
  }

  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }
}
