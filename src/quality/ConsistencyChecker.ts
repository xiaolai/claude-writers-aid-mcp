/**
 * ConsistencyChecker - Cross-document consistency checks
 */

import { WritingStorage } from "../storage/WritingStorage.js";

export interface ConsistencyIssue {
  type: "style" | "terminology" | "formatting";
  file: string;
  line?: number;
  message: string;
  suggestion?: string;
}

export class ConsistencyChecker {
  constructor(private storage: WritingStorage) {}

  async checkConsistency(_options: {
    scope?: string;
  }): Promise<ConsistencyIssue[]> {
    const files = await this.storage.getAllFiles();
    const issues: ConsistencyIssue[] = [];

    // Check heading style consistency
    const headingStyles = this.analyzeHeadingStyles(files);
    if (headingStyles.mixed) {
      issues.push({
        type: "formatting",
        file: "multiple",
        message: "Mixed heading styles detected (ATX and Setext)",
        suggestion: "Use consistent heading style throughout",
      });
    }

    // Check list marker consistency
    const listMarkers = this.analyzeListMarkers(files);
    if (listMarkers.mixed) {
      issues.push({
        type: "formatting",
        file: "multiple",
        message: "Mixed list markers detected (* vs -)",
        suggestion: "Use consistent list markers throughout",
      });
    }

    return issues;
  }

  private analyzeHeadingStyles(files: { file_path: string; content: string }[]): {
    mixed: boolean;
  } {
    let hasATX = false;
    let hasSetext = false;

    for (const file of files) {
      if (file.content.match(/^#+\s/m)) {hasATX = true;}
      if (file.content.match(/^.+\n[=-]+$/m)) {hasSetext = true;}
    }

    return { mixed: hasATX && hasSetext };
  }

  private analyzeListMarkers(files: { file_path: string; content: string }[]): {
    mixed: boolean;
  } {
    let hasDash = false;
    let hasAsterisk = false;

    for (const file of files) {
      if (file.content.match(/^-\s/m)) {hasDash = true;}
      if (file.content.match(/^\*\s/m)) {hasAsterisk = true;}
    }

    return { mixed: hasDash && hasAsterisk };
  }
}
