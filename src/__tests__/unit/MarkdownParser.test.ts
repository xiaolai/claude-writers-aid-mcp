/**
 * Unit tests for MarkdownParser
 */

import { MarkdownParser } from "../../parsers/MarkdownParser.js";

describe("MarkdownParser", () => {
  let parser: MarkdownParser;

  beforeEach(() => {
    parser = new MarkdownParser();
  });

  describe("Basic Parsing", () => {
    it("should parse a simple markdown file", () => {
      const content = "# Hello World\n\nThis is a test.";
      const result = parser.parse("/test.md", content);

      expect(result.file).toBeDefined();
      expect(result.file.file_path).toBe("/test.md");
      expect(result.file.content).toBe(content);
      expect(result.file.word_count).toBe(7); // "Hello World" + "This is a test"
    });

    it("should generate unique IDs", () => {
      const content = "# Test";
      const result1 = parser.parse("/test1.md", content);
      const result2 = parser.parse("/test2.md", content);

      expect(result1.file.id).not.toBe(result2.file.id);
    });

    it("should calculate content hash", () => {
      const content = "# Test Content";
      const result = parser.parse("/test.md", content);

      expect(result.file.content_hash).toBeDefined();
      expect(result.file.content_hash.length).toBe(64); // SHA-256 hex
    });

    it("should handle empty file", () => {
      const result = parser.parse("/empty.md", "");

      expect(result.file.word_count).toBe(0);
      expect(result.headings).toHaveLength(0);
      expect(result.frontmatter).toEqual({});
    });
  });

  describe("Frontmatter Extraction", () => {
    it("should extract YAML frontmatter", () => {
      const content = `---
title: My Article
author: John Doe
date: 2025-01-07
---

# Content`;

      const result = parser.parse("/test.md", content);

      expect(result.frontmatter).toEqual({
        title: "My Article",
        author: "John Doe",
        date: "2025-01-07",
      });
    });

    it("should handle frontmatter with tags array", () => {
      const content = `---
title: Test
tags: [writing, tutorial, markdown]
---

Content here`;

      const result = parser.parse("/test.md", content);

      expect(result.frontmatter.tags).toEqual([
        "writing",
        "tutorial",
        "markdown",
      ]);
    });

    it("should handle boolean values in frontmatter", () => {
      const content = `---
title: Draft
draft: true
published: false
---

Content`;

      const result = parser.parse("/test.md", content);

      expect(result.frontmatter.draft).toBe(true);
      expect(result.frontmatter.published).toBe(false);
    });

    it("should handle quoted strings in frontmatter", () => {
      const content = `---
title: "Article: The Guide"
subtitle: 'A comprehensive overview'
---

Content`;

      const result = parser.parse("/test.md", content);

      expect(result.frontmatter.title).toBe("Article: The Guide");
      expect(result.frontmatter.subtitle).toBe("A comprehensive overview");
    });

    it("should return empty frontmatter when none exists", () => {
      const content = "# No Frontmatter\n\nJust content";
      const result = parser.parse("/test.md", content);

      expect(result.frontmatter).toEqual({});
    });

    it("should exclude frontmatter from content", () => {
      const content = `---
title: Test
---

# Heading

Content here`;

      const result = parser.parse("/test.md", content);

      expect(result.contentWithoutFrontmatter).not.toContain("---");
      expect(result.contentWithoutFrontmatter).toContain("# Heading");
      expect(result.contentWithoutFrontmatter).toContain("Content here");
    });
  });

  describe("Heading Extraction", () => {
    it("should extract all heading levels", () => {
      const content = `# H1
## H2
### H3
#### H4
##### H5
###### H6`;

      const result = parser.parse("/test.md", content);

      expect(result.headings).toHaveLength(6);
      expect(result.headings[0].level).toBe(1);
      expect(result.headings[1].level).toBe(2);
      expect(result.headings[5].level).toBe(6);
    });

    it("should extract heading text correctly", () => {
      const content = `# First Heading
## Second Heading
### Third Heading`;

      const result = parser.parse("/test.md", content);

      expect(result.headings[0].text).toBe("First Heading");
      expect(result.headings[1].text).toBe("Second Heading");
      expect(result.headings[2].text).toBe("Third Heading");
    });

    it("should track line numbers correctly", () => {
      const content = `Line 1
# Heading on line 2
Line 3
## Heading on line 4`;

      const result = parser.parse("/test.md", content);

      expect(result.headings[0].line_number).toBe(2);
      expect(result.headings[1].line_number).toBe(4);
    });

    it("should generate slugs from headings", () => {
      const content = `# Hello World
## Getting Started!
### API Reference: Methods`;

      const result = parser.parse("/test.md", content);

      expect(result.headings[0].slug).toBe("hello-world");
      expect(result.headings[1].slug).toBe("getting-started");
      expect(result.headings[2].slug).toBe("api-reference-methods");
    });

    it("should build heading hierarchy", () => {
      const content = `# Chapter 1
## Section 1.1
### Subsection 1.1.1
## Section 1.2
# Chapter 2
## Section 2.1`;

      const result = parser.parse("/test.md", content);

      // Chapter 1 has no parent
      expect(result.headings[0].parent_id).toBeNull();

      // Section 1.1 parent is Chapter 1
      expect(result.headings[1].parent_id).toBe(result.headings[0].id);

      // Subsection 1.1.1 parent is Section 1.1
      expect(result.headings[2].parent_id).toBe(result.headings[1].id);

      // Section 1.2 parent is Chapter 1 (not 1.1.1)
      expect(result.headings[3].parent_id).toBe(result.headings[0].id);

      // Chapter 2 has no parent
      expect(result.headings[4].parent_id).toBeNull();

      // Section 2.1 parent is Chapter 2
      expect(result.headings[5].parent_id).toBe(result.headings[4].id);
    });

    it("should handle headings after frontmatter", () => {
      const content = `---
title: Test
---

# First Heading
## Second Heading`;

      const result = parser.parse("/test.md", content);

      expect(result.headings).toHaveLength(2);
      expect(result.headings[0].line_number).toBe(5); // Line 5 after frontmatter
      expect(result.headings[1].line_number).toBe(6);
    });
  });

  describe("Title Extraction", () => {
    it("should use frontmatter title if available", () => {
      const content = `---
title: Frontmatter Title
---

# Heading Title`;

      const result = parser.parse("/test.md", content);

      expect(result.file.title).toBe("Frontmatter Title");
    });

    it("should fallback to first H1 if no frontmatter title", () => {
      const content = `# Main Title
## Subtitle`;

      const result = parser.parse("/test.md", content);

      expect(result.file.title).toBe("Main Title");
    });

    it("should return null if no title found", () => {
      const content = `## Only H2
### Only H3`;

      const result = parser.parse("/test.md", content);

      expect(result.file.title).toBeNull();
    });
  });

  describe("Word Counting", () => {
    it("should count words in plain text", () => {
      const content = "This is a test with seven words.";
      const result = parser.parse("/test.md", content);

      expect(result.file.word_count).toBe(7);
    });

    it("should exclude code blocks from word count", () => {
      const content = `Some text here.

\`\`\`javascript
const code = "this should not be counted";
more code here
\`\`\`

More text after.`;

      const result = parser.parse("/test.md", content);

      // Only "Some text here" + "More text after" = 6 words
      expect(result.file.word_count).toBe(6);
    });

    it("should exclude inline code from word count", () => {
      const content = "Use the `Array.map()` function to transform arrays.";
      const result = parser.parse("/test.md", content);

      // "Use the function to transform arrays" = 6 words
      expect(result.file.word_count).toBe(6);
    });

    it("should handle multiple paragraphs", () => {
      const content = `First paragraph with five words.

Second paragraph also has five.

Third one too has five.`;

      const result = parser.parse("/test.md", content);

      expect(result.file.word_count).toBe(15);
    });

    it("should return 0 for empty content", () => {
      const result = parser.parse("/test.md", "");

      expect(result.file.word_count).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle headings with special characters", () => {
      const content = `# Hello & Goodbye
## Test (with parentheses)
### 100% Complete!`;

      const result = parser.parse("/test.md", content);

      expect(result.headings[0].text).toBe("Hello & Goodbye");
      expect(result.headings[1].text).toBe("Test (with parentheses)");
      expect(result.headings[2].text).toBe("100% Complete!");
    });

    it("should handle malformed frontmatter", () => {
      const content = `---
missing closing
# This is actually content`;

      const result = parser.parse("/test.md", content);

      // Should treat as no frontmatter
      expect(result.headings).toHaveLength(1);
    });

    it("should handle whitespace in headings", () => {
      const content = `#    Lots    of    spaces
##  \t Tabs and spaces \t`;

      const result = parser.parse("/test.md", content);

      expect(result.headings[0].text).toBe("Lots    of    spaces");
      expect(result.headings[1].text).toBe("Tabs and spaces");
    });

    it("should not treat # in middle of line as heading", () => {
      const content = `This is not a # heading
Also not #heading`;

      const result = parser.parse("/test.md", content);

      expect(result.headings).toHaveLength(0);
    });
  });
});
