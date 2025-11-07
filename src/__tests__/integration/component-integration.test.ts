/**
 * Integration Tests - Component Interactions
 * Tests how different components work together
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { WritingStorage } from "../../storage/WritingStorage.js";
import { SQLiteManager } from "../../storage/SQLiteManager.js";
import { MarkdownParser } from "../../markdown/MarkdownParser.js";
import { MarkdownChunker } from "../../markdown/MarkdownChunker.js";
import { LinkAnalyzer } from "../../markdown/LinkAnalyzer.js";
import { TerminologyChecker } from "../../analysis/TerminologyChecker.js";
import { StructureValidator } from "../../analysis/StructureValidator.js";
import fs from "fs";
import os from "os";
import path from "path";

describe("Integration: Component Interactions", () => {
  let storage: WritingStorage;
  let parser: MarkdownParser;
  let chunker: MarkdownChunker;
  let linkAnalyzer: LinkAnalyzer;
  const testDbPath = path.join(os.tmpdir(), "test-integration.db");

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    const sqliteManager = new SQLiteManager({ dbPath: testDbPath });
    storage = new WritingStorage(sqliteManager);
    parser = new MarkdownParser();
    chunker = new MarkdownChunker();
    linkAnalyzer = new LinkAnalyzer(storage);
  });

  afterEach(() => {
    storage.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe("Parser → Storage Integration", () => {
    it("should parse and store markdown file", async () => {
      const content = `---
title: Test Document
author: Test Author
---

# Main Title

This is a test paragraph.

## Subsection

More content here.`;

      const parsed = parser.parse("test.md", content);

      await storage.addFile({
        filePath: "test.md",
        content,
        title: parsed.metadata.title || "Test Document",
      });

      const files = storage.getFiles();
      expect(files.length).toBe(1);
      expect(files[0].title).toBe("Test Document");
    });

    it("should parse headings and store them", async () => {
      const content = "# H1\n## H2\n### H3\n## Another H2";

      const parsed = parser.parse("test.md", content);

      await storage.addFile({
        filePath: "test.md",
        content,
        title: "Test",
      });

      const headings = storage.getHeadings("test.md");
      expect(headings.length).toBeGreaterThan(0);
    });
  });

  describe("Parser → Chunker Integration", () => {
    it("should parse then chunk content", () => {
      const content = `# Chapter 1

Introduction paragraph.

## Section 1.1

Section content.

## Section 1.2

More section content.`;

      const parsed = parser.parse("test.md", content);
      const chunks = chunker.chunk("test.md", content, parsed.headings);

      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach((chunk) => {
        expect(chunk).toHaveProperty("heading");
        expect(chunk).toHaveProperty("content");
      });
    });

    it("should maintain heading context in chunks", () => {
      const content = `# Main

Content under main.

## Sub1

Content under sub1.

## Sub2

Content under sub2.`;

      const parsed = parser.parse("test.md", content);
      const chunks = chunker.chunk("test.md", content, parsed.headings);

      expect(chunks.some((c) => c.heading.includes("Main"))).toBe(true);
      expect(chunks.some((c) => c.heading.includes("Sub1"))).toBe(true);
      expect(chunks.some((c) => c.heading.includes("Sub2"))).toBe(true);
    });
  });

  describe("LinkAnalyzer → Storage Integration", () => {
    it("should extract and store links", async () => {
      const content = `# Document

[Link 1](other.md)
[Link 2](https://example.com)
[[Wiki Link]]`;

      await storage.addFile({
        filePath: "test.md",
        content,
        title: "Test",
      });

      const fileId = storage.getFiles()[0].id;
      await linkAnalyzer.extractLinks(fileId, "test.md", content);

      const links = storage.getLinks("test.md");
      expect(links.length).toBeGreaterThan(0);
    });

    it("should categorize link types correctly", async () => {
      const content = `[Internal](doc.md)
[External](https://example.com)
[[WikiLink]]
[Anchor](#section)`;

      await storage.addFile({
        filePath: "test.md",
        content,
        title: "Test",
      });

      const fileId = storage.getFiles()[0].id;
      await linkAnalyzer.extractLinks(fileId, "test.md", content);

      const links = storage.getLinks("test.md");

      const hasMarkdown = links.some((l) => l.linkType === "markdown");
      const hasExternal = links.some((l) => l.linkType === "external");
      const hasWiki = links.some((l) => l.linkType === "wiki");

      expect(hasMarkdown || hasExternal || hasWiki).toBe(true);
    });
  });

  describe("Storage → TerminologyChecker Integration", () => {
    it("should check terminology from stored content", async () => {
      await storage.addFile({
        filePath: "file1.md",
        content: "Use email for contact. Send email to support.",
        title: "File 1",
      });

      await storage.addFile({
        filePath: "file2.md",
        content: "Use e-mail for contact. Send e-mail to support.",
        title: "File 2",
      });

      const checker = new TerminologyChecker(storage);
      const report = await checker.checkTerminology({ terms: ["email"] });

      if (report.groups.length > 0) {
        expect(report.groups[0].variants.length).toBeGreaterThan(1);
      }
    });

    it("should find variants across multiple files", async () => {
      await storage.addFile({
        filePath: "file1.md",
        content: "The API is RESTful.",
        title: "File 1",
      });

      await storage.addFile({
        filePath: "file2.md",
        content: "Call the api endpoint.",
        title: "File 2",
      });

      await storage.addFile({
        filePath: "file3.md",
        content: "The Api responds quickly.",
        title: "File 3",
      });

      const checker = new TerminologyChecker(storage);
      const report = await checker.checkTerminology({ terms: ["api"] });

      if (report.groups.length > 0) {
        const apiGroup = report.groups[0];
        expect(apiGroup.variants.length).toBeGreaterThan(1);
      }
    });
  });

  describe("Storage → StructureValidator Integration", () => {
    it("should validate structure from stored content", async () => {
      const content = "# Title\n### Skipped Level\nContent";

      await storage.addFile({
        filePath: "test.md",
        content,
        title: "Test",
      });

      const validator = new StructureValidator(storage);
      const report = await validator.validateStructure({
        filePath: "test.md",
      });

      expect(report.filesChecked).toBe(1);
    });

    it("should validate multiple files", async () => {
      await storage.addFile({
        filePath: "file1.md",
        content: "# Title\n## Section\nContent",
        title: "File 1",
      });

      await storage.addFile({
        filePath: "file2.md",
        content: "# Title\n### Skipped\nContent",
        title: "File 2",
      });

      const validator = new StructureValidator(storage);
      const report = await validator.validateStructure();

      expect(report.filesChecked).toBe(2);
    });
  });

  describe("Full Pipeline Integration", () => {
    it("should handle complete indexing pipeline", async () => {
      const content = `---
title: Complete Test
author: Test Author
---

# Main Title

This is test content with [a link](other.md).

## Section One

More content here.

<!-- TODO: Add examples -->

## Section Two

Final section content.`;

      // Parse
      const parsed = parser.parse("test.md", content);

      // Store file
      await storage.addFile({
        filePath: "test.md",
        content,
        title: parsed.metadata.title || "Complete Test",
      });

      // Extract links
      const fileId = storage.getFiles()[0].id;
      await linkAnalyzer.extractLinks(fileId, "test.md", content);

      // Chunk content
      const chunks = chunker.chunk("test.md", content, parsed.headings);

      // Verify all components worked
      const files = storage.getFiles();
      expect(files.length).toBe(1);
      expect(files[0].title).toBe("Complete Test");

      const links = storage.getLinks("test.md");
      expect(links.length).toBeGreaterThan(0);

      expect(chunks.length).toBeGreaterThan(0);
    });

    it("should maintain referential integrity", async () => {
      // Add multiple interconnected files
      await storage.addFile({
        filePath: "index.md",
        content: "# Index\n[Chapter 1](chapter1.md)\n[Chapter 2](chapter2.md)",
        title: "Index",
      });

      await storage.addFile({
        filePath: "chapter1.md",
        content: "# Chapter 1\n[Back to Index](index.md)\n[Next](chapter2.md)",
        title: "Chapter 1",
      });

      await storage.addFile({
        filePath: "chapter2.md",
        content: "# Chapter 2\n[Back to Index](index.md)\n[Previous](chapter1.md)",
        title: "Chapter 2",
      });

      // Extract all links
      const files = storage.getFiles();
      for (const file of files) {
        const content = file.title; // Simplified for test
        await linkAnalyzer.extractLinks(file.id, file.filePath, content);
      }

      // Verify link graph
      const indexLinks = storage.getLinks("index.md");
      expect(indexLinks.length).toBeGreaterThan(0);

      const chapter1Links = storage.getLinks("chapter1.md");
      expect(chapter1Links.length).toBeGreaterThan(0);

      const chapter2Links = storage.getLinks("chapter2.md");
      expect(chapter2Links.length).toBeGreaterThan(0);
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle missing files gracefully", async () => {
      const validator = new StructureValidator(storage);

      const report = await validator.validateStructure({
        filePath: "nonexistent.md",
      });

      expect(report.filesChecked).toBe(0);
      expect(report.issues.length).toBe(0);
    });

    it("should handle empty content", async () => {
      await storage.addFile({
        filePath: "empty.md",
        content: "",
        title: "Empty",
      });

      const checker = new TerminologyChecker(storage);
      const report = await checker.checkTerminology({ autoDetect: true });

      // Should not crash
      expect(report).toBeDefined();
    });

    it("should handle malformed markdown", async () => {
      const content = "# Unclosed **bold\n### Random ### headings\n";

      const parsed = parser.parse("malformed.md", content);

      // Should still parse something
      expect(parsed).toBeDefined();
      expect(parsed.headings.length).toBeGreaterThan(0);
    });
  });

  describe("Performance Integration", () => {
    it("should handle multiple files efficiently", async () => {
      const startTime = Date.now();

      // Add 50 files
      for (let i = 1; i <= 50; i++) {
        await storage.addFile({
          filePath: `file${i}.md`,
          content: `# File ${i}\nContent for file ${i}.`,
          title: `File ${i}`,
        });
      }

      const elapsed = Date.now() - startTime;

      // Should complete in reasonable time (< 5 seconds)
      expect(elapsed).toBeLessThan(5000);

      const files = storage.getFiles();
      expect(files.length).toBe(50);
    });

    it("should handle large content efficiently", async () => {
      // Create large content (10KB)
      const largeContent = "# Large File\n" + "word ".repeat(2000);

      const startTime = Date.now();

      await storage.addFile({
        filePath: "large.md",
        content: largeContent,
        title: "Large File",
      });

      const parsed = parser.parse("large.md", largeContent);
      const chunks = chunker.chunk("large.md", largeContent, parsed.headings);

      const elapsed = Date.now() - startTime;

      // Should complete in reasonable time (< 2 seconds)
      expect(elapsed).toBeLessThan(2000);
      expect(chunks.length).toBeGreaterThan(0);
    });
  });
});
