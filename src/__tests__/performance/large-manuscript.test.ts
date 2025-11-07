/**
 * Performance Tests - Large Manuscript Handling
 * Tests performance with 100+ files and large content
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { WritersAid } from "../../WritersAid.js";
import fs from "fs";
import os from "os";
import path from "path";

describe("Performance: Large Manuscript", () => {
  const perfTestDir = path.join(os.tmpdir(), "writers-aid-perf-test");
  let writersAid: WritersAid;

  beforeAll(async () => {
    // Create test directory structure
    if (fs.existsSync(perfTestDir)) {
      fs.rmSync(perfTestDir, { recursive: true, force: true });
    }
    fs.mkdirSync(perfTestDir, { recursive: true });

    // Generate 100+ markdown files with realistic content
    for (let i = 1; i <= 100; i++) {
      const chapterDir = path.join(perfTestDir, `chapter-${Math.floor(i / 10)}`);
      if (!fs.existsSync(chapterDir)) {
        fs.mkdirSync(chapterDir, { recursive: true });
      }

      const content = generateChapterContent(i);
      fs.writeFileSync(path.join(chapterDir, `section-${i}.md`), content);
    }

    // Add some larger files
    for (let i = 1; i <= 10; i++) {
      const largeContent = generateLargeContent(i);
      fs.writeFileSync(path.join(perfTestDir, `large-${i}.md`), largeContent);
    }

    writersAid = new WritersAid({ projectPath: perfTestDir });
  }, 60000); // 60 second timeout for setup

  afterAll(() => {
    if (writersAid) {
      writersAid.close();
    }

    if (fs.existsSync(perfTestDir)) {
      fs.rmSync(perfTestDir, { recursive: true, force: true });
    }
  });

  describe("Indexing Performance", () => {
    it("should index 100+ files in under 30 seconds", async () => {
      const startTime = Date.now();

      const result = await writersAid.indexManuscript();

      const elapsed = Date.now() - startTime;

      expect(result.filesIndexed).toBeGreaterThanOrEqual(100);
      expect(result.chunksCreated).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(30000); // 30 seconds

      console.log(`Indexed ${result.filesIndexed} files in ${elapsed}ms`);
      console.log(`Created ${result.chunksCreated} chunks`);
      console.log(
        `Average: ${(elapsed / result.filesIndexed).toFixed(2)}ms per file`
      );
    }, 40000);
  });

  describe("Search Performance", () => {
    beforeAll(async () => {
      await writersAid.indexManuscript();
    }, 40000);

    it("should search 100+ files in under 2 seconds", async () => {
      const startTime = Date.now();

      const results = await writersAid.searchContent("technology", { limit: 10 });

      const elapsed = Date.now() - startTime;

      expect(results.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(2000); // 2 seconds

      console.log(`Search completed in ${elapsed}ms`);
      console.log(`Found ${results.length} results`);
    }, 5000);

    it("should handle multiple concurrent searches", async () => {
      const startTime = Date.now();

      const searches = [
        writersAid.searchContent("API", { limit: 5 }),
        writersAid.searchContent("database", { limit: 5 }),
        writersAid.searchContent("testing", { limit: 5 }),
        writersAid.searchContent("performance", { limit: 5 }),
        writersAid.searchContent("security", { limit: 5 }),
      ];

      const results = await Promise.all(searches);

      const elapsed = Date.now() - startTime;

      expect(results.length).toBe(5);
      expect(elapsed).toBeLessThan(5000); // 5 seconds for 5 searches

      console.log(`5 concurrent searches completed in ${elapsed}ms`);
    }, 10000);
  });

  describe("Quality Check Performance", () => {
    beforeAll(async () => {
      await writersAid.indexManuscript();
    }, 40000);

    it("should validate structure in under 5 seconds", async () => {
      const startTime = Date.now();

      const report = await writersAid.validateStructure();

      const elapsed = Date.now() - startTime;

      expect(report.filesChecked).toBeGreaterThanOrEqual(100);
      expect(elapsed).toBeLessThan(5000); // 5 seconds

      console.log(`Structure validation completed in ${elapsed}ms`);
      console.log(`Checked ${report.filesChecked} files`);
      console.log(`Found ${report.issues.length} issues`);
    }, 10000);

    it("should check terminology in under 10 seconds", async () => {
      const startTime = Date.now();

      const report = await writersAid.checkTerminology({ autoDetect: true });

      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(10000); // 10 seconds

      console.log(`Terminology check completed in ${elapsed}ms`);
      console.log(`Found ${report.totalIssues} issues in ${report.groups.length} groups`);
    }, 15000);

    it("should find TODOs in under 3 seconds", async () => {
      const startTime = Date.now();

      const todos = await writersAid.findTodos();

      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(3000); // 3 seconds

      console.log(`TODO extraction completed in ${elapsed}ms`);
      console.log(`Found ${todos.length} TODOs`);
    }, 5000);

    it("should check links in under 5 seconds", async () => {
      const startTime = Date.now();

      const issues = await writersAid.checkLinks();

      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(5000); // 5 seconds

      console.log(`Link checking completed in ${elapsed}ms`);
      console.log(`Found ${issues.length} link issues`);
    }, 10000);
  });

  describe("Statistics Performance", () => {
    beforeAll(async () => {
      await writersAid.indexManuscript();
    }, 40000);

    it("should calculate stats in under 2 seconds", async () => {
      const startTime = Date.now();

      const stats = await writersAid.getStats();

      const elapsed = Date.now() - startTime;

      expect(stats.totalFiles).toBeGreaterThanOrEqual(100);
      expect(stats.totalWords).toBeGreaterThan(10000);
      expect(elapsed).toBeLessThan(2000); // 2 seconds

      console.log(`Stats calculation completed in ${elapsed}ms`);
      console.log(`Total files: ${stats.totalFiles}`);
      console.log(`Total words: ${stats.totalWords.toLocaleString()}`);
      console.log(`Average words per file: ${stats.averageWordsPerFile}`);
    }, 5000);
  });

  describe("Memory Usage", () => {
    beforeAll(async () => {
      await writersAid.indexManuscript();
    }, 40000);

    it("should not leak memory during multiple operations", async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        await writersAid.searchContent("test", { limit: 5 });
        await writersAid.getStats();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (< 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    }, 20000);
  });

  describe("Concurrent Operations", () => {
    beforeAll(async () => {
      await writersAid.indexManuscript();
    }, 40000);

    it("should handle multiple quality checks concurrently", async () => {
      const startTime = Date.now();

      const [structure, terminology, todos, links] = await Promise.all([
        writersAid.validateStructure(),
        writersAid.checkTerminology({ autoDetect: true }),
        writersAid.findTodos(),
        writersAid.checkLinks(),
      ]);

      const elapsed = Date.now() - startTime;

      expect(structure.filesChecked).toBeGreaterThan(0);
      expect(terminology).toBeDefined();
      expect(todos.length).toBeGreaterThan(0);
      expect(links).toBeDefined();
      expect(elapsed).toBeLessThan(20000); // 20 seconds

      console.log(`4 concurrent quality checks completed in ${elapsed}ms`);
    }, 30000);
  });
});

// Helper functions

function generateChapterContent(chapterNum: number): string {
  return `---
title: Chapter ${chapterNum}
author: Performance Test
date: 2024-01-01
---

# Chapter ${chapterNum}: Advanced Topics

This chapter covers advanced concepts in web development including performance optimization, security best practices, and scalability patterns.

## Introduction

In modern web development, performance is crucial. Users expect fast, responsive applications that work seamlessly across devices. This chapter explores techniques for achieving optimal performance.

## Core Concepts

### Performance Optimization

Performance optimization involves multiple strategies:

1. Minimize bundle size
2. Optimize images and assets
3. Use lazy loading
4. Implement caching
5. Reduce network requests

<!-- TODO: Add code examples for performance optimization -->

### Security Best Practices

Security should be a top priority:

* Use HTTPS
* Validate all inputs
* Sanitize user data
* Implement proper authentication
* Use secure headers

### API Development

Modern applications rely on well-designed APIs. Consider these principles:

- RESTful design
- Proper status codes
- Error handling
- Documentation
- Versioning

<!-- FIXME: Update API examples -->

### Database Optimization

Efficient database usage is critical:

1. Use indexes
2. Optimize queries
3. Implement connection pooling
4. Cache frequently accessed data
5. Monitor performance

## Testing Strategies

### Unit Testing

Test individual components in isolation.

### Integration Testing

Test component interactions.

### End-to-End Testing

Test complete user flows.

<!-- TODO: Add testing framework recommendations -->

## Deployment

### CI/CD Pipelines

Automate your deployment process:

* Automated testing
* Code quality checks
* Security scanning
* Automated deployment
* Rollback capabilities

### Monitoring

Monitor application health:

- Performance metrics
- Error tracking
- User analytics
- Server health
- Security events

## Conclusion

This chapter covered essential topics for building production-ready web applications. Continue to Chapter ${chapterNum + 1} for more advanced patterns.

---

**Related:** See Chapter ${chapterNum - 1} for prerequisites, and Chapter ${chapterNum + 1} for advanced topics.
`;
}

function generateLargeContent(fileNum: number): string {
  const sections = [];

  for (let i = 1; i <= 50; i++) {
    sections.push(`## Section ${i}

This is section ${i} of large file ${fileNum}. It contains detailed information about various aspects of web development.

### Subsection ${i}.1

Content for subsection ${i}.1 with examples and explanations.

### Subsection ${i}.2

More content for subsection ${i}.2 including best practices.

<!-- TODO: Expand this section -->
`);
  }

  return `# Large File ${fileNum}

This is a large file for performance testing purposes.

${sections.join("\n\n")}

## Conclusion

This concludes large file ${fileNum}.
`;
}
