import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { ReadabilityAnalyzer } from "../../../analysis/ReadabilityAnalyzer.js";
import { WritingStorage } from "../../../storage/WritingStorage.js";
import { SQLiteManager } from "../../../storage/SQLiteManager.js";
import fs from "fs";
import os from "os";
import path from "path";

describe("ReadabilityAnalyzer", () => {
  let storage: WritingStorage;
  let analyzer: ReadabilityAnalyzer;
  const testDbPath = path.join(os.tmpdir(), "test-readability.db");

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {fs.unlinkSync(testDbPath);}
    const sqliteManager = new SQLiteManager({ dbPath: testDbPath });
    storage = new WritingStorage(sqliteManager);
    analyzer = new ReadabilityAnalyzer(storage);
  });

  afterEach(() => {
    storage.close();
    if (fs.existsSync(testDbPath)) {fs.unlinkSync(testDbPath);}
  });

  it("should calculate basic readability metrics", async () => {
    await storage.addFile({
      filePath: "test.md",
      content: "The cat sat on the mat. The dog ran in the park.",
      title: "Test",
    });

    const results = await analyzer.analyzeReadability("test.md");
    expect(results.length).toBe(1);
    expect(results[0].totalWords).toBeGreaterThan(0);
    expect(results[0].totalSentences).toBe(2);
  });

  it("should calculate Flesch Reading Ease score", async () => {
    await storage.addFile({
      filePath: "simple.md",
      content: "I like cats. Cats are nice. They sleep a lot.",
      title: "Simple",
    });

    const results = await analyzer.analyzeReadability("simple.md");
    expect(results[0].fleschReadingEase).toBeGreaterThan(0);
    expect(results[0].fleschReadingEase).toBeLessThanOrEqual(100);
  });

  it("should determine reading level", async () => {
    await storage.addFile({
      filePath: "elementary.md",
      content: "See the cat. The cat is big. It sits here.",
      title: "Elementary",
    });

    const results = await analyzer.analyzeReadability("elementary.md");
    expect(["elementary", "middle-school"]).toContain(results[0].readingLevel);
  });

  it("should handle markdown syntax", async () => {
    await storage.addFile({
      filePath: "markdown.md",
      content: "# Title\n**Bold** and *italic* text. [Link](url) here.",
      title: "Markdown",
    });

    const results = await analyzer.analyzeReadability("markdown.md");
    expect(results[0].totalWords).toBeGreaterThan(0);
  });

  it("should analyze multiple files", async () => {
    await storage.addFile({ filePath: "file1.md", content: "Content one.", title: "File 1" });
    await storage.addFile({ filePath: "file2.md", content: "Content two.", title: "File 2" });

    const results = await analyzer.analyzeReadability();
    expect(results.length).toBe(2);
  });
});
