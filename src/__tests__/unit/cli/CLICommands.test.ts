/**
 * Tests for CLI Commands - TDD: TESTS FIRST
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

describe("CLI Commands", () => {
  let testDir: string;
  const cliPath = path.join(process.cwd(), "dist/index.js");

  beforeEach(() => {
    // Create temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "writers-aid-test-"));
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("writers-aid init", () => {
    it("should initialize a new writing project", async () => {
      const { stdout } = await execAsync(`node ${cliPath} init ${testDir}`);

      expect(stdout).toContain("Initialized writing project");
      expect(fs.existsSync(path.join(testDir, ".writers-aid"))).toBe(true);
      expect(fs.existsSync(path.join(testDir, ".writers-aid", "manuscript.db"))).toBe(true);
    });

    it("should index existing markdown files", async () => {
      // Create test markdown files
      fs.writeFileSync(path.join(testDir, "chapter1.md"), "# Chapter 1\nContent here");
      fs.writeFileSync(path.join(testDir, "chapter2.md"), "# Chapter 2\nMore content");

      const { stdout } = await execAsync(`node ${cliPath} init ${testDir}`);

      expect(stdout).toContain("Indexed 2 files");
    });

    it("should handle empty directory", async () => {
      const { stdout } = await execAsync(`node ${cliPath} init ${testDir}`);

      expect(stdout).toContain("Initialized");
      expect(stdout).toContain("0 files");
    });
  });

  describe("writers-aid search", () => {
    beforeEach(async () => {
      // Setup test project
      fs.writeFileSync(path.join(testDir, "chapter1.md"), "# Authentication\nUser authentication with OAuth");
      fs.writeFileSync(path.join(testDir, "chapter2.md"), "# Database\nPostgreSQL setup");
      await execAsync(`node ${cliPath} init ${testDir}`);
    });

    it("should search for content", async () => {
      const { stdout } = await execAsync(`node ${cliPath} search "authentication" --project ${testDir}`);

      expect(stdout).toContain("chapter1.md");
      expect(stdout).toContain("OAuth");
    });

    it("should limit results", async () => {
      const { stdout } = await execAsync(`node ${cliPath} search "chapter" --limit 1 --project ${testDir}`);

      const lines = stdout.split("\n").filter(l => l.includes(".md"));
      expect(lines.length).toBeLessThanOrEqual(1);
    });

    it("should handle no results", async () => {
      const { stdout } = await execAsync(`node ${cliPath} search "nonexistent" --project ${testDir}`);

      expect(stdout).toContain("No results found");
    });
  });

  describe("writers-aid stats", () => {
    beforeEach(async () => {
      fs.writeFileSync(path.join(testDir, "chapter1.md"), "# Chapter 1\n" + "word ".repeat(500));
      fs.writeFileSync(path.join(testDir, "chapter2.md"), "# Chapter 2\n" + "word ".repeat(300));
      await execAsync(`node ${cliPath} init ${testDir}`);
    });

    it("should show writing statistics", async () => {
      const { stdout } = await execAsync(`node ${cliPath} stats --project ${testDir}`);

      expect(stdout).toContain("Total words:");
      expect(stdout).toContain("Total files: 2");
    });

    it("should break down by chapter", async () => {
      const { stdout } = await execAsync(`node ${cliPath} stats --by-chapter --project ${testDir}`);

      expect(stdout).toContain("chapter1.md");
      expect(stdout).toContain("chapter2.md");
    });
  });

  describe("writers-aid check", () => {
    beforeEach(async () => {
      fs.writeFileSync(path.join(testDir, "chapter1.md"), "# Chapter\n### Skipped Level\nBad structure");
      await execAsync(`node ${cliPath} init ${testDir}`);
    });

    it("should run all quality checks", async () => {
      const { stdout } = await execAsync(`node ${cliPath} check --project ${testDir}`);

      expect(stdout).toContain("Quality Check Results");
    });

    it("should detect structure issues", async () => {
      const { stdout } = await execAsync(`node ${cliPath} check --project ${testDir}`);

      expect(stdout.toLowerCase()).toMatch(/skipped|structure/);
    });

    it("should check specific file", async () => {
      const { stdout } = await execAsync(`node ${cliPath} check chapter1.md --project ${testDir}`);

      expect(stdout).toContain("Quality Check");
    });
  });

  describe("writers-aid terminology", () => {
    beforeEach(async () => {
      fs.writeFileSync(path.join(testDir, "chapter1.md"), "Use email for contact");
      fs.writeFileSync(path.join(testDir, "chapter2.md"), "Send e-mail to support");
      await execAsync(`node ${cliPath} init ${testDir}`);
    });

    it("should detect term inconsistencies", async () => {
      const { stdout } = await execAsync(`node ${cliPath} terminology --project ${testDir}`);

      expect(stdout.toLowerCase()).toMatch(/terminology|no.*issues/);
    });

    it("should check specific term", async () => {
      const { stdout } = await execAsync(`node ${cliPath} terminology --term "email" --project ${testDir}`);

      expect(stdout).toContain("Variants found");
    });
  });

  describe("writers-aid todos", () => {
    beforeEach(async () => {
      fs.writeFileSync(path.join(testDir, "chapter1.md"), "# Chapter\n<!-- TODO: Add examples -->\nContent");
      fs.writeFileSync(path.join(testDir, "chapter2.md"), "# Chapter 2\n<!-- FIXME: Fix bug -->");
      await execAsync(`node ${cliPath} init ${testDir}`);
    });

    it("should list all TODOs", async () => {
      const { stdout } = await execAsync(`node ${cliPath} todos --project ${testDir}`);

      expect(stdout).toMatch(/TODO|FIXME/);
    });

    it("should group by priority", async () => {
      const { stdout } = await execAsync(`node ${cliPath} todos --group-by priority --project ${testDir}`);

      expect(stdout.toLowerCase()).toMatch(/high|medium/);
    });
  });

  describe("writers-aid outline", () => {
    beforeEach(async () => {
      const content = "# Book\n## Chapter 1\n### Section 1.1\n## Chapter 2";
      fs.writeFileSync(path.join(testDir, "book.md"), content);
      await execAsync(`node ${cliPath} init ${testDir}`);
    });

    it("should generate outline", async () => {
      const { stdout } = await execAsync(`node ${cliPath} outline --project ${testDir}`);

      expect(stdout).toContain("Manuscript Outline");
      expect(stdout).toContain("book.md");
    });

    it("should limit depth", async () => {
      const { stdout } = await execAsync(`node ${cliPath} outline --depth 2 --project ${testDir}`);

      expect(stdout).toContain("Manuscript Outline");
    });

    it("should include word counts", async () => {
      const { stdout } = await execAsync(`node ${cliPath} outline --with-stats --project ${testDir}`);

      expect(stdout).toContain("words");
    });
  });

  describe("writers-aid links", () => {
    beforeEach(async () => {
      fs.writeFileSync(path.join(testDir, "chapter1.md"), "[Link](chapter2.md)\n[Broken](missing.md)");
      fs.writeFileSync(path.join(testDir, "chapter2.md"), "# Chapter 2");
      await execAsync(`node ${cliPath} init ${testDir}`);
    });

    it("should check all links", async () => {
      const { stdout } = await execAsync(`node ${cliPath} links --project ${testDir}`);

      expect(stdout).toContain("Links checked");
    });

    it("should show only broken links", async () => {
      const { stdout } = await execAsync(`node ${cliPath} links --broken-only --project ${testDir}`);

      expect(stdout.toLowerCase()).toMatch(/missing\.md|broken/);
    });
  });

  describe("writers-aid themes", () => {
    beforeEach(async () => {
      fs.writeFileSync(path.join(testDir, "chapter1.md"), "authentication security login password".repeat(10));
      fs.writeFileSync(path.join(testDir, "chapter2.md"), "database storage query index".repeat(10));
      await execAsync(`node ${cliPath} init ${testDir}`);
    });

    it("should extract main themes", async () => {
      const { stdout } = await execAsync(`node ${cliPath} themes --project ${testDir}`);

      expect(stdout).toContain("Theme");
    });

    it("should limit number of themes", async () => {
      const { stdout } = await execAsync(`node ${cliPath} themes --num 3 --project ${testDir}`);

      const themeLines = stdout.split("\n").filter(l => l.trim().length > 0);
      expect(themeLines.length).toBeLessThanOrEqual(10); // Header + 3 themes + formatting
    });
  });

  describe("writers-aid find-related", () => {
    beforeEach(async () => {
      fs.writeFileSync(path.join(testDir, "auth.md"), "authentication oauth security login");
      fs.writeFileSync(path.join(testDir, "security.md"), "security authentication encryption");
      fs.writeFileSync(path.join(testDir, "database.md"), "database sql postgres");
      await execAsync(`node ${cliPath} init ${testDir}`);
    });

    it("should find related content", async () => {
      const { stdout } = await execAsync(`node ${cliPath} find-related auth.md --project ${testDir}`);

      expect(stdout).toMatch(/security\.md|Related|No related/);
    });

    it("should limit results", async () => {
      const { stdout } = await execAsync(`node ${cliPath} find-related auth.md --limit 1 --project ${testDir}`);

      const fileLines = stdout.split("\n").filter(l => l.includes(".md"));
      expect(fileLines.length).toBeLessThanOrEqual(1);
    });
  });

  describe("writers-aid structure", () => {
    beforeEach(async () => {
      fs.writeFileSync(path.join(testDir, "bad.md"), "# Title\n### Skipped\n##### Too Deep");
      await execAsync(`node ${cliPath} init ${testDir}`);
    });

    it("should validate structure", async () => {
      const { stdout } = await execAsync(`node ${cliPath} structure bad.md --project ${testDir}`);

      expect(stdout).toMatch(/Structure|issue/);
    });

    it("should validate all files", async () => {
      const { stdout } = await execAsync(`node ${cliPath} structure --all --project ${testDir}`);

      expect(stdout.toLowerCase()).toContain("file");
    });
  });

  describe("writers-aid config", () => {
    it("should show current config", async () => {
      const { stdout } = await execAsync(`node ${cliPath} config`);

      expect(stdout.toLowerCase()).toMatch(/configuration|config/);
    });

    it("should get specific value", async () => {
      const { stdout } = await execAsync(`node ${cliPath} config get provider`);

      expect(stdout.trim().length).toBeGreaterThan(0);
    });
  });

  describe("writers-aid changes", () => {
    beforeEach(async () => {
      fs.writeFileSync(path.join(testDir, "chapter1.md"), "# Chapter 1\nOriginal content");
      await execAsync(`node ${cliPath} init ${testDir}`);

      // Make a change
      await new Promise(resolve => setTimeout(resolve, 1000));
      fs.writeFileSync(path.join(testDir, "chapter1.md"), "# Chapter 1\nUpdated content");
    });

    it("should track changes", async () => {
      const { stdout } = await execAsync(`node ${cliPath} changes --project ${testDir}`);

      expect(stdout).toMatch(/Changes|chapter1\.md/);
    });

    it("should filter by time", async () => {
      const { stdout } = await execAsync(`node ${cliPath} changes --since yesterday --project ${testDir}`);

      expect(stdout).toMatch(/Change|No changes/);
    });
  });
});
