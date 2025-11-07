/**
 * Tests for StructureValidator
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { StructureValidator } from "../../../analysis/StructureValidator.js";
import { WritingStorage } from "../../../storage/WritingStorage.js";
import { SQLiteManager } from "../../../storage/SQLiteManager.js";
import fs from "fs";
import os from "os";
import path from "path";

describe("StructureValidator", () => {
  let storage: WritingStorage;
  let validator: StructureValidator;
  const testDbPath = path.join(os.tmpdir(), "test-structure.db");

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    const sqliteManager = new SQLiteManager({ dbPath: testDbPath });
    storage = new WritingStorage(sqliteManager);
    validator = new StructureValidator(storage);
  });

  afterEach(() => {
    storage.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe("checkHeadingLevels", () => {
    it("should detect skipped heading levels", async () => {
      const content = `# Chapter 1\n### Subsection\nContent here`;

      await storage.addFile({
        filePath: "chapter1.md",
        content,
        title: "Chapter 1",
      });

      const report = await validator.validateStructure({
        filePath: "chapter1.md",
        checks: ["heading-levels"],
      });

      expect(report.issues.length).toBeGreaterThan(0);

      const skipIssue = report.issues.find((i) => i.type === "skipped-level");
      expect(skipIssue).toBeDefined();
      expect(skipIssue?.message).toContain("H1 to H3");
    });

    it("should not flag correct heading hierarchy", async () => {
      const content = `# Chapter 1\n## Section 1\n### Subsection\n## Section 2`;

      await storage.addFile({
        filePath: "chapter1.md",
        content,
        title: "Chapter 1",
      });

      const report = await validator.validateStructure({
        filePath: "chapter1.md",
        checks: ["heading-levels"],
      });

      const skipIssues = report.issues.filter((i) => i.type === "skipped-level");
      expect(skipIssues.length).toBe(0);
    });

    it("should warn about files with no headings", async () => {
      const content = `Just plain content without headings`;

      await storage.addFile({
        filePath: "plain.md",
        content,
        title: "Plain",
      });

      const report = await validator.validateStructure({
        filePath: "plain.md",
        checks: ["heading-levels"],
      });

      const missingHeading = report.issues.find(
        (i) => i.type === "missing-heading"
      );
      expect(missingHeading).toBeDefined();
    });
  });

  describe("checkDuplicateHeadings", () => {
    it("should detect duplicate headings at same level", async () => {
      const content = `# Introduction\n## Setup\nContent\n## Setup\nMore content`;

      await storage.addFile({
        filePath: "chapter1.md",
        content,
        title: "Chapter 1",
      });

      const report = await validator.validateStructure({
        filePath: "chapter1.md",
        checks: ["duplicate-headings"],
      });

      const dupIssue = report.issues.find((i) => i.type === "duplicate-heading");
      expect(dupIssue).toBeDefined();
      expect(dupIssue?.heading).toBe("Setup");
    });

    it("should allow same text at different levels", async () => {
      const content = `# Setup\n## Overview\n### Setup\nDifferent levels OK`;

      await storage.addFile({
        filePath: "chapter1.md",
        content,
        title: "Chapter 1",
      });

      const report = await validator.validateStructure({
        filePath: "chapter1.md",
        checks: ["duplicate-headings"],
      });

      const dupIssues = report.issues.filter((i) => i.type === "duplicate-heading");
      expect(dupIssues.length).toBe(0);
    });

    it("should be case-insensitive", async () => {
      const content = `## Introduction\n## INTRODUCTION`;

      await storage.addFile({
        filePath: "chapter1.md",
        content,
        title: "Chapter 1",
      });

      const report = await validator.validateStructure({
        filePath: "chapter1.md",
        checks: ["duplicate-headings"],
      });

      const dupIssue = report.issues.find((i) => i.type === "duplicate-heading");
      expect(dupIssue).toBeDefined();
    });
  });

  describe("checkSectionBalance", () => {
    it("should detect unbalanced sections", async () => {
      const shortSection = "Short.";
      const longSection = "Long ".repeat(100); // 100 words

      const content = `# Chapter\n## Section 1\n${longSection}\n## Section 2\n${shortSection}`;

      await storage.addFile({
        filePath: "chapter1.md",
        content,
        title: "Chapter 1",
      });

      const report = await validator.validateStructure({
        filePath: "chapter1.md",
        checks: ["section-balance"],
      });

      const balanceIssues = report.issues.filter(
        (i) => i.type === "unbalanced-section"
      );
      expect(balanceIssues.length).toBeGreaterThan(0);
    });

    it("should not flag balanced sections", async () => {
      const section1 = "Content ".repeat(50);
      const section2 = "Content ".repeat(55);

      const content = `# Chapter\n## Section 1\n${section1}\n## Section 2\n${section2}`;

      await storage.addFile({
        filePath: "chapter1.md",
        content,
        title: "Chapter 1",
      });

      const report = await validator.validateStructure({
        filePath: "chapter1.md",
        checks: ["section-balance"],
      });

      const balanceIssues = report.issues.filter(
        (i) => i.type === "unbalanced-section"
      );
      expect(balanceIssues.length).toBe(0);
    });

    it("should ignore short documents", async () => {
      const content = `# Title\n## Section 1\nShort\n## Section 2\nAlso short`;

      await storage.addFile({
        filePath: "short.md",
        content,
        title: "Short",
      });

      const report = await validator.validateStructure({
        filePath: "short.md",
        checks: ["section-balance"],
      });

      const balanceIssues = report.issues.filter(
        (i) => i.type === "unbalanced-section"
      );
      expect(balanceIssues.length).toBe(0);
    });
  });

  describe("checkDeepNesting", () => {
    it("should warn about deeply nested headings", async () => {
      const content = `# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6`;

      await storage.addFile({
        filePath: "deep.md",
        content,
        title: "Deep",
      });

      const report = await validator.validateStructure({
        filePath: "deep.md",
        checks: ["deep-nesting"],
      });

      const deepIssues = report.issues.filter((i) => i.type === "deep-nesting");
      expect(deepIssues.length).toBeGreaterThan(0);

      const h5Issue = deepIssues.find((i) => i.level === 5);
      expect(h5Issue).toBeDefined();
    });

    it("should allow reasonable nesting depth", async () => {
      const content = `# H1\n## H2\n### H3\n#### H4`;

      await storage.addFile({
        filePath: "reasonable.md",
        content,
        title: "Reasonable",
      });

      const report = await validator.validateStructure({
        filePath: "reasonable.md",
        checks: ["deep-nesting"],
      });

      const deepIssues = report.issues.filter((i) => i.type === "deep-nesting");
      expect(deepIssues.length).toBe(0);
    });
  });

  describe("validateStructure", () => {
    it("should run all checks by default", async () => {
      const content = `# Title\n### Skipped Level\n### Skipped Level\n##### Too Deep`;

      await storage.addFile({
        filePath: "issues.md",
        content,
        title: "Issues",
      });

      const report = await validator.validateStructure({
        filePath: "issues.md",
      });

      expect(report.issues.length).toBeGreaterThan(0);
      expect(report.filesChecked).toBe(1);

      const types = new Set(report.issues.map((i) => i.type));
      expect(types.size).toBeGreaterThan(1); // Multiple issue types
    });

    it("should run only specified checks", async () => {
      const content = `# Title\n### Skipped\n### Skipped`;

      await storage.addFile({
        filePath: "test.md",
        content,
        title: "Test",
      });

      const report = await validator.validateStructure({
        filePath: "test.md",
        checks: ["duplicate-headings"],
      });

      const types = new Set(report.issues.map((i) => i.type));
      expect(types.has("duplicate-heading")).toBe(true);
      expect(types.has("skipped-level")).toBe(false);
    });

    it("should count severity levels correctly", async () => {
      const content = `# Title\n### Skipped\n##### Too Deep`;

      await storage.addFile({
        filePath: "severity.md",
        content,
        title: "Severity",
      });

      const report = await validator.validateStructure({
        filePath: "severity.md",
      });

      expect(report.errors + report.warnings + report.info).toBe(
        report.issues.length
      );
    });

    it("should validate multiple files", async () => {
      await storage.addFile({
        filePath: "file1.md",
        content: "# Title\n### Skipped",
        title: "File 1",
      });

      await storage.addFile({
        filePath: "file2.md",
        content: "# Title\n##### Deep",
        title: "File 2",
      });

      const report = await validator.validateStructure({});

      expect(report.filesChecked).toBe(2);
      expect(report.issues.length).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("should handle empty files", async () => {
      await storage.addFile({
        filePath: "empty.md",
        content: "",
        title: "Empty",
      });

      const report = await validator.validateStructure({
        filePath: "empty.md",
      });

      expect(report.filesChecked).toBe(1);
    });

    it("should handle files with only headings", async () => {
      await storage.addFile({
        filePath: "headings-only.md",
        content: "# H1\n## H2\n### H3",
        title: "Headings Only",
      });

      const report = await validator.validateStructure({
        filePath: "headings-only.md",
      });

      expect(report.filesChecked).toBe(1);
    });
  });
});
