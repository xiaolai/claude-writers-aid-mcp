/**
 * Tests for TerminologyChecker
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { TerminologyChecker } from "../../../analysis/TerminologyChecker.js";
import { WritingStorage } from "../../../storage/WritingStorage.js";
import { SQLiteManager } from "../../../storage/SQLiteManager.js";
import fs from "fs";
import os from "os";
import path from "path";

describe("TerminologyChecker", () => {
  let storage: WritingStorage;
  let checker: TerminologyChecker;
  const testDbPath = path.join(os.tmpdir(), "test-terminology.db");

  beforeEach(() => {
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    const sqliteManager = new SQLiteManager({ dbPath: testDbPath });
    storage = new WritingStorage(sqliteManager);
    checker = new TerminologyChecker(storage);
  });

  afterEach(() => {
    storage.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe("checkSpecificTerms", () => {
    it("should detect variants of a specific term", async () => {
      // Add files with term variants
      await storage.addFile({
        filePath: "chapter1.md",
        content: "Send me an email at test@example.com",
        title: "Chapter 1",
      });

      await storage.addFile({
        filePath: "chapter2.md",
        content: "Use e-mail for communication. E-mail is preferred.",
        title: "Chapter 2",
      });

      await storage.addFile({
        filePath: "chapter3.md",
        content: "Email addresses are important",
        title: "Chapter 3",
      });

      const report = await checker.checkTerminology({
        terms: ["email"],
      });

      expect(report.totalIssues).toBeGreaterThan(0);
      expect(report.groups.length).toBeGreaterThan(0);

      const group = report.groups[0];
      expect(group.variants.length).toBeGreaterThanOrEqual(2);

      // Should find "email", "e-mail", "Email", "E-mail"
      const variantTerms = group.variants.map((v) => v.term);
      expect(variantTerms).toContain("email");
      expect(variantTerms.some((t) => t.toLowerCase() === "email")).toBe(true);
    });

    it("should return empty report when no variants found", async () => {
      await storage.addFile({
        filePath: "chapter1.md",
        content: "Use email for communication. email is preferred.",
        title: "Chapter 1",
      });

      const report = await checker.checkTerminology({
        terms: ["email"],
      });

      // Only one variant, so no issues
      expect(report.totalIssues).toBe(0);
      expect(report.groups.length).toBe(0);
    });

    it("should check multiple terms", async () => {
      await storage.addFile({
        filePath: "chapter1.md",
        content: "Send email and login to the website using your username",
        title: "Chapter 1",
      });

      await storage.addFile({
        filePath: "chapter2.md",
        content: "Use e-mail and log-in credentials",
        title: "Chapter 2",
      });

      const report = await checker.checkTerminology({
        terms: ["email", "login"],
      });

      expect(report.totalIssues).toBeGreaterThanOrEqual(1);
    });

    it("should filter by scope", async () => {
      await storage.addFile({
        filePath: "chapters/chapter1.md",
        content: "Use email for communication",
        title: "Chapter 1",
      });

      await storage.addFile({
        filePath: "drafts/draft1.md",
        content: "Use e-mail instead",
        title: "Draft 1",
      });

      const report = await checker.checkTerminology({
        terms: ["email"],
        scope: "chapters/*",
      });

      // Should only find one variant in chapters scope
      if (report.groups.length > 0) {
        const affectedFiles = report.groups[0].variants.flatMap((v) => v.files);
        expect(affectedFiles.every((f) => f.startsWith("chapters/"))).toBe(true);
      }
    });
  });

  describe("autoDetectVariants", () => {
    it("should auto-detect common term variants", async () => {
      await storage.addFile({
        filePath: "chapter1.md",
        content:
          "JavaScript is a programming language. JavaScript is widely used.",
        title: "Chapter 1",
      });

      await storage.addFile({
        filePath: "chapter2.md",
        content: "Javascript has many features. javascript is flexible.",
        title: "Chapter 2",
      });

      await storage.addFile({
        filePath: "chapter3.md",
        content: "Learn JavaScript programming",
        title: "Chapter 3",
      });

      const report = await checker.checkTerminology({
        autoDetect: true,
      });

      expect(report.totalIssues).toBeGreaterThan(0);

      // Should detect JavaScript/Javascript/javascript variants
      const jsGroup = report.groups.find((g) =>
        g.variants.some((v) => v.term.toLowerCase().includes("javascript"))
      );

      expect(jsGroup).toBeDefined();
      if (jsGroup) {
        expect(jsGroup.variants.length).toBeGreaterThanOrEqual(2);
      }
    });

    it("should calculate inconsistency levels correctly", async () => {
      // High inconsistency: roughly equal usage
      await storage.addFile({
        filePath: "high1.md",
        content: "wifi wifi wifi",
        title: "High 1",
      });

      await storage.addFile({
        filePath: "high2.md",
        content: "Wi-Fi Wi-Fi Wi-Fi",
        title: "High 2",
      });

      const highReport = await checker.checkTerminology({
        autoDetect: true,
      });

      const wifiGroup = highReport.groups.find((g) =>
        g.variants.some((v) => v.term.toLowerCase().replace(/[^a-z]/g, "") === "wifi")
      );

      expect(wifiGroup).toBeDefined();
      if (wifiGroup) {
        expect(wifiGroup.inconsistency).toBe("high");
      }
    });

    it("should ignore stop words", async () => {
      await storage.addFile({
        filePath: "chapter1.md",
        content: "The quick brown fox. the lazy dog",
        title: "Chapter 1",
      });

      const report = await checker.checkTerminology({
        autoDetect: true,
      });

      // Should not flag "the" vs "The" as significant
      const theGroup = report.groups.find((g) =>
        g.variants.some((v) => v.term.toLowerCase() === "the")
      );

      expect(theGroup).toBeUndefined();
    });

    it("should ignore low-frequency terms", async () => {
      await storage.addFile({
        filePath: "chapter1.md",
        content: "A rare word appears once. Rare appears twice.",
        title: "Chapter 1",
      });

      const report = await checker.checkTerminology({
        autoDetect: true,
      });

      // Should not flag terms with very low usage
      const rareGroup = report.groups.find((g) =>
        g.variants.some((v) => v.term.toLowerCase() === "rare")
      );

      // Might be undefined or have low inconsistency
      if (rareGroup) {
        expect(rareGroup.totalCount).toBeLessThan(5);
      }
    });

    it("should select canonical form as most common variant", async () => {
      await storage.addFile({
        filePath: "chapter1.md",
        content: "database database database database",
        title: "Chapter 1",
      });

      await storage.addFile({
        filePath: "chapter2.md",
        content: "data-base once",
        title: "Chapter 2",
      });

      const report = await checker.checkTerminology({
        terms: ["database"],
      });

      if (report.groups.length > 0) {
        const group = report.groups[0];
        expect(group.canonical).toBe("database");
      }
    });
  });

  describe("findExamples", () => {
    it("should provide usage examples with context", async () => {
      await storage.addFile({
        filePath: "chapter1.md",
        content: "Line 1: Use email\nLine 2: Send email\nLine 3: Email is great",
        title: "Chapter 1",
      });

      const report = await checker.checkTerminology({
        terms: ["email"],
      });

      if (report.groups.length > 0) {
        const variant = report.groups[0].variants[0];
        expect(variant.examples.length).toBeGreaterThan(0);

        const example = variant.examples[0];
        expect(example.file).toBe("chapter1.md");
        expect(example.line).toBeGreaterThan(0);
        expect(example.context).toContain("email");
      }
    });

    it("should limit number of examples", async () => {
      const content = Array(20)
        .fill("email appears here")
        .join("\n");

      await storage.addFile({
        filePath: "chapter1.md",
        content,
        title: "Chapter 1",
      });

      const report = await checker.checkTerminology({
        terms: ["email"],
      });

      if (report.groups.length > 0) {
        const variant = report.groups[0].variants[0];
        expect(variant.examples.length).toBeLessThanOrEqual(3);
      }
    });
  });

  describe("edge cases", () => {
    it("should handle empty content", async () => {
      await storage.addFile({
        filePath: "empty.md",
        content: "",
        title: "Empty",
      });

      const report = await checker.checkTerminology({
        autoDetect: true,
      });

      expect(report.totalIssues).toBe(0);
    });

    it("should handle hyphenated words", async () => {
      await storage.addFile({
        filePath: "chapter1.md",
        content: "Use e-mail and email and Email",
        title: "Chapter 1",
      });

      const report = await checker.checkTerminology({
        terms: ["email"],
      });

      expect(report.groups.length).toBeGreaterThan(0);

      const group = report.groups[0];
      const hasHyphenated = group.variants.some((v) => v.term.includes("-"));
      expect(hasHyphenated).toBe(true);
    });

    it("should handle case variations", async () => {
      await storage.addFile({
        filePath: "chapter1.md",
        content: "API api Api",
        title: "Chapter 1",
      });

      const report = await checker.checkTerminology({
        terms: ["api"],
      });

      expect(report.groups.length).toBeGreaterThan(0);

      const group = report.groups[0];
      expect(group.variants.length).toBeGreaterThanOrEqual(2);
    });
  });
});
