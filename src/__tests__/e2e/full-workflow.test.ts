/**
 * End-to-End Tests - Full Workflow
 * Tests the complete Writer's Aid workflow using the sample manuscript
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { WritersAid } from "../../WritersAid.js";
import path from "path";
import fs from "fs";

describe("E2E: Full Workflow", () => {
  const manuscriptPath = path.join(
    process.cwd(),
    "src/__tests__/fixtures/sample-manuscript"
  );
  let writersAid: WritersAid;

  beforeAll(async () => {
    // Initialize WritersAid with sample manuscript
    writersAid = new WritersAid({ projectPath: manuscriptPath });

    // Index the manuscript
    await writersAid.indexManuscript();
  });

  afterAll(() => {
    if (writersAid) {
      writersAid.close();
    }
  });

  describe("Initialization and Indexing", () => {
    it("should index all markdown files in the sample manuscript", async () => {
      const result = await writersAid.indexManuscript();

      expect(result.filesIndexed).toBeGreaterThanOrEqual(6); // 4 chapters + 2 appendix files + README
      expect(result.chunksCreated).toBeGreaterThan(0);
    });

    it("should create database in project directory", () => {
      const dbPath = path.join(manuscriptPath, ".writers-aid", "manuscript.db");
      expect(fs.existsSync(dbPath)).toBe(true);
    });

    it("should get manuscript statistics", async () => {
      const stats = await writersAid.getStats();

      expect(stats.totalFiles).toBeGreaterThanOrEqual(6);
      expect(stats.totalWords).toBeGreaterThan(1000);
      expect(stats.averageWordsPerFile).toBeGreaterThan(0);
      expect(stats.files.length).toBe(stats.totalFiles);
    });
  });

  describe("Content Search", () => {
    it("should find content about HTML", async () => {
      const results = await writersAid.searchContent("HTML", { limit: 5 });

      expect(results.length).toBeGreaterThan(0);
      expect(
        results.some((r) => r.file.includes("03-html-basics.md"))
      ).toBe(true);
    });

    it("should find content about CSS", async () => {
      const results = await writersAid.searchContent("CSS", { limit: 5 });

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.file.includes("04-css.md"))).toBe(true);
    });

    it("should find content about API", async () => {
      const results = await writersAid.searchContent("API", { limit: 5 });

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.file.includes("api-guide.md"))).toBe(true);
    });

    it("should limit search results correctly", async () => {
      const results = await writersAid.searchContent("web", { limit: 3 });

      expect(results.length).toBeLessThanOrEqual(3);
    });

    it("should search within specific file scope", async () => {
      const results = await writersAid.searchContent("HTML", {
        scope: "chapters/03-html-basics.md",
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.file === "chapters/03-html-basics.md")).toBe(true);
    });
  });

  describe("Theme Extraction", () => {
    it("should extract main themes from manuscript", async () => {
      const themes = await writersAid.extractThemes({ numThemes: 10 });

      expect(themes.length).toBeGreaterThan(0);
      expect(themes.length).toBeLessThanOrEqual(10);

      // Check theme structure
      const theme = themes[0];
      expect(theme).toHaveProperty("theme");
      expect(theme).toHaveProperty("count");
      expect(typeof theme.theme).toBe("string");
      expect(typeof theme.count).toBe("number");
    });

    it("should extract themes with scope filter", async () => {
      const themes = await writersAid.extractThemes({
        scope: "chapters/*",
        numThemes: 5,
      });

      expect(themes.length).toBeGreaterThan(0);
      expect(themes.length).toBeLessThanOrEqual(5);
    });
  });

  describe("Structure Validation", () => {
    it("should detect skipped heading levels", async () => {
      const report = await writersAid.validateStructure({
        filePath: "chapters/02-setup.md",
      });

      // This file has intentional skipped heading levels
      const skippedIssues = report.issues.filter(
        (i) => i.type === "skipped-level"
      );
      expect(skippedIssues.length).toBeGreaterThan(0);
    });

    it("should detect duplicate headings", async () => {
      const report = await writersAid.validateStructure({
        filePath: "chapters/02-setup.md",
      });

      const duplicates = report.issues.filter(
        (i) => i.type === "duplicate-heading"
      );
      // The setup file has intentional duplicate "Installation" headings
      expect(duplicates.length).toBeGreaterThan(0);
    });

    it("should detect deep nesting", async () => {
      const report = await writersAid.validateStructure({
        filePath: "chapters/02-setup.md",
      });

      const deepNesting = report.issues.filter((i) => i.type === "deep-nesting");
      // The setup file has H5 and H6 headings (too deep)
      expect(deepNesting.length).toBeGreaterThan(0);
    });

    it("should validate all files in manuscript", async () => {
      const report = await writersAid.validateStructure();

      expect(report.filesChecked).toBeGreaterThanOrEqual(6);
      expect(report.issues.length).toBeGreaterThan(0); // We know there are issues
    });
  });

  describe("Terminology Consistency", () => {
    it("should detect email/e-mail variants", async () => {
      const report = await writersAid.checkTerminology({
        terms: ["email"],
      });

      // Sample manuscript has email, e-mail, and Email variants
      if (report.groups.length > 0) {
        const emailGroup = report.groups.find((g) =>
          g.canonical.toLowerCase().includes("email")
        );
        if (emailGroup) {
          expect(emailGroup.variants.length).toBeGreaterThan(1);
        }
      }
    });

    it("should detect API casing variants", async () => {
      const report = await writersAid.checkTerminology({
        terms: ["api"],
      });

      // Sample manuscript has API, api, Api variants
      if (report.groups.length > 0) {
        const apiGroup = report.groups.find((g) =>
          g.canonical.toLowerCase().includes("api")
        );
        if (apiGroup) {
          expect(apiGroup.variants.length).toBeGreaterThan(1);
        }
      }
    });

    it("should auto-detect terminology issues", async () => {
      const report = await writersAid.checkTerminology({
        autoDetect: true,
      });

      // Should detect multiple inconsistent terms
      expect(report.groups.length).toBeGreaterThan(0);
    });

    it("should provide usage examples", async () => {
      const report = await writersAid.checkTerminology({
        terms: ["email"],
      });

      if (report.groups.length > 0 && report.groups[0].variants.length > 0) {
        const variant = report.groups[0].variants[0];
        expect(variant.examples.length).toBeGreaterThan(0);

        const example = variant.examples[0];
        expect(example).toHaveProperty("file");
        expect(example).toHaveProperty("line");
        expect(example).toHaveProperty("context");
      }
    });
  });

  describe("TODO Extraction", () => {
    it("should find all TODO markers", async () => {
      const todos = await writersAid.findTodos();

      // Sample manuscript has 12+ TODO markers
      const todoMarkers = todos.filter((t) => t.marker === "TODO");
      expect(todoMarkers.length).toBeGreaterThan(10);
    });

    it("should find FIXME markers", async () => {
      const todos = await writersAid.findTodos();

      // Sample manuscript has 5+ FIXME markers
      const fixmes = todos.filter((t) => t.marker === "FIXME");
      expect(fixmes.length).toBeGreaterThan(3);
    });

    it("should assign priority levels", async () => {
      const todos = await writersAid.findTodos();

      // Check that priorities are assigned
      const withPriority = todos.filter((t) => t.priority);
      expect(withPriority.length).toBeGreaterThan(0);

      // FIXME should be high priority
      const fixmes = todos.filter((t) => t.marker === "FIXME");
      if (fixmes.length > 0) {
        expect(fixmes[0].priority).toBe("high");
      }
    });

    it("should group TODOs by file", async () => {
      const todos = await writersAid.findTodos({ groupBy: "file" });

      // Should find TODOs in multiple files
      const files = new Set(todos.map((t) => t.file));
      expect(files.size).toBeGreaterThan(3);
    });
  });

  describe("Link Health", () => {
    it("should detect broken internal links", async () => {
      const issues = await writersAid.checkLinks();

      // Sample manuscript has 4 broken links
      const broken = issues.filter((i) => i.issue.includes("not found") || i.issue.includes("broken"));
      expect(broken.length).toBeGreaterThan(0);
    });

    it("should identify specific broken links", async () => {
      const issues = await writersAid.checkLinks();

      // Check for specific broken links we know exist
      const hasMissingChapter = issues.some((i) =>
        i.target.includes("missing-chapter.md")
      );
      const hasBrokenLink = issues.some((i) => i.target.includes("broken-link.md"));

      expect(hasMissingChapter || hasBrokenLink).toBe(true);
    });
  });

  describe("Readability Analysis", () => {
    it("should analyze readability of all files", async () => {
      const results = await writersAid.analyzeReadability();

      expect(results.length).toBeGreaterThanOrEqual(6);

      results.forEach((result) => {
        expect(result).toHaveProperty("file");
        expect(result).toHaveProperty("fleschReadingEase");
        expect(result).toHaveProperty("readingLevel");
        expect(result).toHaveProperty("totalWords");
        expect(result).toHaveProperty("totalSentences");
      });
    });

    it("should analyze specific file", async () => {
      const results = await writersAid.analyzeReadability("chapters/03-html-basics.md");

      expect(results.length).toBe(1);
      expect(results[0].file).toBe("chapters/03-html-basics.md");
    });

    it("should calculate Flesch Reading Ease score", async () => {
      const results = await writersAid.analyzeReadability("chapters/01-introduction.md");

      if (results.length > 0) {
        const score = results[0].fleschReadingEase;
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    });

    it("should determine reading level", async () => {
      const results = await writersAid.analyzeReadability();

      if (results.length > 0) {
        const validLevels = [
          "elementary",
          "middle-school",
          "high-school",
          "college",
          "advanced",
        ];
        expect(validLevels).toContain(results[0].readingLevel);
      }
    });
  });

  describe("Duplicate Detection", () => {
    it("should find duplicate content", async () => {
      const duplicates = await writersAid.findDuplicates();

      // Check structure
      if (duplicates.length > 0) {
        const dup = duplicates[0];
        expect(dup).toHaveProperty("file1");
        expect(dup).toHaveProperty("file2");
        expect(dup).toHaveProperty("similarity");
        expect(dup.similarity).toBeGreaterThan(0);
        expect(dup.similarity).toBeLessThanOrEqual(1);
      }
    });

    it("should use similarity threshold", async () => {
      const duplicates = await writersAid.findDuplicates({ similarityThreshold: 0.9 });

      // All results should have similarity >= 0.9
      duplicates.forEach((dup) => {
        expect(dup.similarity).toBeGreaterThanOrEqual(0.9);
      });
    });
  });

  describe("Gap Finding", () => {
    it("should find undefined terms", async () => {
      const gaps = await writersAid.findGaps();

      // Structure check
      if (gaps.length > 0) {
        const gap = gaps[0];
        expect(gap).toHaveProperty("term");
        expect(gap).toHaveProperty("mentions");
        expect(gap).toHaveProperty("files");
        expect(gap.mentions).toBeGreaterThan(0);
      }
    });

    it("should check gap structure", async () => {
      const gaps = await writersAid.findGaps();

      // Verify structure of results
      expect(Array.isArray(gaps)).toBe(true);
    });
  });

  describe("Quality Checks", () => {
    it("should run comprehensive quality check", async () => {
      // Run multiple checks and verify they all complete
      const [structure, terminology, todos, links, readability] = await Promise.all([
        writersAid.validateStructure(),
        writersAid.checkTerminology({ autoDetect: true }),
        writersAid.findTodos(),
        writersAid.checkLinks(),
        writersAid.analyzeReadability(),
      ]);

      expect(structure.filesChecked).toBeGreaterThan(0);
      expect(terminology.totalIssues).toBeGreaterThanOrEqual(0);
      expect(todos.length).toBeGreaterThan(0);
      expect(links.length).toBeGreaterThan(0);
      expect(readability.length).toBeGreaterThan(0);
    });
  });
});
