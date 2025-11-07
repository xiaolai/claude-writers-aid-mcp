/**
 * StructureValidator - Check heading hierarchy and section balance
 *
 * Validates document structure for consistency and best practices.
 */

import { WritingStorage } from "../storage/WritingStorage.js";

export interface StructureIssue {
  type:
    | "skipped-level"
    | "duplicate-heading"
    | "unbalanced-section"
    | "missing-heading"
    | "deep-nesting";
  file: string;
  line?: number;
  heading?: string;
  level?: number;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface StructureReport {
  issues: StructureIssue[];
  filesChecked: number;
  errors: number;
  warnings: number;
  info: number;
}

export class StructureValidator {
  constructor(private storage: WritingStorage) {}

  /**
   * Validate document structure
   */
  async validateStructure(options: {
    filePath?: string;
    checks?: string[];
  }): Promise<StructureReport> {
    const { filePath, checks } = options;

    const enabledChecks = checks || [
      "heading-levels",
      "duplicate-headings",
      "section-balance",
      "deep-nesting",
    ];

    const issues: StructureIssue[] = [];
    const files = filePath
      ? [await this.storage.getFile(filePath)]
      : await this.storage.getAllFiles();

    const validFiles = files.filter((f) => f !== null);

    for (const file of validFiles) {
      if (enabledChecks.includes("heading-levels")) {
        issues.push(...(await this.checkHeadingLevels(file.file_path)));
      }

      if (enabledChecks.includes("duplicate-headings")) {
        issues.push(...(await this.checkDuplicateHeadings(file.file_path)));
      }

      if (enabledChecks.includes("section-balance")) {
        issues.push(...(await this.checkSectionBalance(file.file_path)));
      }

      if (enabledChecks.includes("deep-nesting")) {
        issues.push(...(await this.checkDeepNesting(file.file_path)));
      }
    }

    const errors = issues.filter((i) => i.severity === "error").length;
    const warnings = issues.filter((i) => i.severity === "warning").length;
    const info = issues.filter((i) => i.severity === "info").length;

    return {
      issues,
      filesChecked: validFiles.length,
      errors,
      warnings,
      info,
    };
  }

  /**
   * Check for skipped heading levels (e.g., h1 -> h3)
   */
  private async checkHeadingLevels(filePath: string): Promise<StructureIssue[]> {
    const headings = await this.storage.getHeadings(filePath);
    const issues: StructureIssue[] = [];

    if (headings.length === 0) {
      issues.push({
        type: "missing-heading",
        file: filePath,
        message: "File has no headings",
        severity: "warning",
      });
      return issues;
    }

    for (let i = 1; i < headings.length; i++) {
      const prevLevel = headings[i - 1].level;
      const currLevel = headings[i].level;

      // Check if level was skipped
      if (currLevel > prevLevel + 1) {
        issues.push({
          type: "skipped-level",
          file: filePath,
          line: headings[i].line_number,
          heading: headings[i].text,
          level: currLevel,
          message: `Heading level skipped from H${prevLevel} to H${currLevel}`,
          severity: "warning",
        });
      }
    }

    return issues;
  }

  /**
   * Check for duplicate heading text
   */
  private async checkDuplicateHeadings(
    filePath: string
  ): Promise<StructureIssue[]> {
    const headings = await this.storage.getHeadings(filePath);
    const issues: StructureIssue[] = [];
    const seen = new Map<string, number>();

    for (const heading of headings) {
      const key = `${heading.level}:${heading.text.toLowerCase()}`;

      if (seen.has(key)) {
        issues.push({
          type: "duplicate-heading",
          file: filePath,
          line: heading.line_number,
          heading: heading.text,
          level: heading.level,
          message: `Duplicate heading "${heading.text}" at same level`,
          severity: "info",
        });
      } else {
        seen.set(key, heading.line_number);
      }
    }

    return issues;
  }

  /**
   * Check section balance (sections with significantly different lengths)
   */
  private async checkSectionBalance(filePath: string): Promise<StructureIssue[]> {
    const file = await this.storage.getFile(filePath);
    if (!file) {
      return [];
    }

    const headings = await this.storage.getHeadings(filePath);
    const issues: StructureIssue[] = [];

    if (headings.length < 2) {
      return issues;
    }

    const lines = file.content.split("\n");
    const sections: {
      heading: string;
      level: number;
      lineStart: number;
      lineEnd: number;
      wordCount: number;
    }[] = [];

    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const nextHeading = headings[i + 1];

      const lineStart = heading.line_number;
      const lineEnd = nextHeading ? nextHeading.line_number - 1 : lines.length;

      const sectionLines = lines.slice(lineStart, lineEnd);
      const wordCount = sectionLines.join(" ").split(/\s+/).length;

      sections.push({
        heading: heading.text,
        level: heading.level,
        lineStart,
        lineEnd,
        wordCount,
      });
    }

    // Check sections at same level
    const levelGroups = new Map<number, typeof sections>();

    for (const section of sections) {
      if (!levelGroups.has(section.level)) {
        levelGroups.set(section.level, []);
      }
      levelGroups.get(section.level)?.push(section);
    }

    for (const [level, sameLevelSections] of levelGroups) {
      if (sameLevelSections.length < 2) {
        continue;
      }

      const wordCounts = sameLevelSections.map((s) => s.wordCount);
      const avg = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
      const max = Math.max(...wordCounts);
      const min = Math.min(...wordCounts);

      // Flag if max is > 3x min and avg > 100 words
      if (max > min * 3 && avg > 100) {
        const minSection = sameLevelSections.find((s) => s.wordCount === min);
        const maxSection = sameLevelSections.find((s) => s.wordCount === max);

        if (minSection) {
          issues.push({
            type: "unbalanced-section",
            file: filePath,
            line: minSection.lineStart,
            heading: minSection.heading,
            level,
            message: `Section "${minSection.heading}" is significantly shorter (${min} words) than average (${Math.round(avg)} words)`,
            severity: "info",
          });
        }

        if (maxSection && maxSection !== minSection) {
          issues.push({
            type: "unbalanced-section",
            file: filePath,
            line: maxSection.lineStart,
            heading: maxSection.heading,
            level,
            message: `Section "${maxSection.heading}" is significantly longer (${max} words) than average (${Math.round(avg)} words)`,
            severity: "info",
          });
        }
      }
    }

    return issues;
  }

  /**
   * Check for deeply nested headings
   */
  private async checkDeepNesting(filePath: string): Promise<StructureIssue[]> {
    const headings = await this.storage.getHeadings(filePath);
    const issues: StructureIssue[] = [];

    const MAX_DEPTH = 4; // H1-H4 is reasonable, H5+ is too deep

    for (const heading of headings) {
      if (heading.level > MAX_DEPTH) {
        issues.push({
          type: "deep-nesting",
          file: filePath,
          line: heading.line_number,
          heading: heading.text,
          level: heading.level,
          message: `Heading level ${heading.level} is too deep (max recommended: ${MAX_DEPTH})`,
          severity: "warning",
        });
      }
    }

    return issues;
  }
}
