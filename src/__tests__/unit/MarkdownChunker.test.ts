/**
 * Unit tests for MarkdownChunker
 */

import { MarkdownChunker } from "../../parsers/MarkdownChunker.js";
import type { MarkdownHeading } from "../../markdown/types.js";

describe("MarkdownChunker", () => {
  describe("Basic Chunking", () => {
    it("should create chunks from content", () => {
      const chunker = new MarkdownChunker();
      const content = "# Introduction\n\nThis is the introduction section.";
      const headings: MarkdownHeading[] = [
        {
          id: "h1",
          file_id: "file1",
          level: 1,
          text: "Introduction",
          slug: "introduction",
          line_number: 1,
          parent_id: null,
        },
      ];

      const chunks = chunker.chunk("file1", content, headings);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].file_id).toBe("file1");
      expect(chunks[0].chunk_index).toBe(0);
    });

    it("should set chunk indices correctly", () => {
      const chunker = new MarkdownChunker();
      const content = `# Section 1
Content 1

# Section 2
Content 2

# Section 3
Content 3`;

      const headings: MarkdownHeading[] = [
        {
          id: "h1",
          file_id: "file1",
          level: 1,
          text: "Section 1",
          slug: "section-1",
          line_number: 1,
          parent_id: null,
        },
        {
          id: "h2",
          file_id: "file1",
          level: 1,
          text: "Section 2",
          slug: "section-2",
          line_number: 4,
          parent_id: null,
        },
        {
          id: "h3",
          file_id: "file1",
          level: 1,
          text: "Section 3",
          slug: "section-3",
          line_number: 7,
          parent_id: null,
        },
      ];

      const chunks = chunker.chunk("file1", content, headings);

      expect(chunks[0].chunk_index).toBe(0);
      expect(chunks[1].chunk_index).toBe(1);
      expect(chunks[2].chunk_index).toBe(2);
    });
  });

  describe("Heading-Based Chunking", () => {
    it("should split content by headings", () => {
      const chunker = new MarkdownChunker();
      const content = `# Chapter 1
This is chapter 1 content.

# Chapter 2
This is chapter 2 content.`;

      const headings: MarkdownHeading[] = [
        {
          id: "h1",
          file_id: "file1",
          level: 1,
          text: "Chapter 1",
          slug: "chapter-1",
          line_number: 1,
          parent_id: null,
        },
        {
          id: "h2",
          file_id: "file1",
          level: 1,
          text: "Chapter 2",
          slug: "chapter-2",
          line_number: 4,
          parent_id: null,
        },
      ];

      const chunks = chunker.chunk("file1", content, headings);

      expect(chunks).toHaveLength(2);
      expect(chunks[0].content).toContain("Chapter 1");
      expect(chunks[0].content).toContain("chapter 1 content");
      expect(chunks[1].content).toContain("Chapter 2");
      expect(chunks[1].content).toContain("chapter 2 content");
    });

    it("should preserve heading hierarchy in context", () => {
      const chunker = new MarkdownChunker({ preserveContext: true });
      const content = `# Chapter 1
## Section 1.1
### Subsection 1.1.1
Content here`;

      const headings: MarkdownHeading[] = [
        {
          id: "h1",
          file_id: "file1",
          level: 1,
          text: "Chapter 1",
          slug: "chapter-1",
          line_number: 1,
          parent_id: null,
        },
        {
          id: "h2",
          file_id: "file1",
          level: 2,
          text: "Section 1.1",
          slug: "section-1-1",
          line_number: 2,
          parent_id: "h1",
        },
        {
          id: "h3",
          file_id: "file1",
          level: 3,
          text: "Subsection 1.1.1",
          slug: "subsection-1-1-1",
          line_number: 3,
          parent_id: "h2",
        },
      ];

      const chunks = chunker.chunk("file1", content, headings);

      expect(chunks[2].heading).toBe("Chapter 1 > Section 1.1 > Subsection 1.1.1");
    });

    it("should handle content before first heading", () => {
      const chunker = new MarkdownChunker();
      const content = `This is preamble text before any heading.

# First Heading
Content after heading.`;

      const headings: MarkdownHeading[] = [
        {
          id: "h1",
          file_id: "file1",
          level: 1,
          text: "First Heading",
          slug: "first-heading",
          line_number: 3,
          parent_id: null,
        },
      ];

      const chunks = chunker.chunk("file1", content, headings);

      expect(chunks).toHaveLength(2);
      expect(chunks[0].heading).toBeNull();
      expect(chunks[0].content).toContain("preamble text");
      expect(chunks[1].heading).toBe("First Heading");
    });
  });

  describe("Size-Based Chunking", () => {
    it("should split large sections into multiple chunks", () => {
      const chunker = new MarkdownChunker({ maxChunkSize: 20, overlapSize: 5 });
      const content = `# Long Section
${"word ".repeat(100)}`; // 100 words

      const headings: MarkdownHeading[] = [
        {
          id: "h1",
          file_id: "file1",
          level: 1,
          text: "Long Section",
          slug: "long-section",
          line_number: 1,
          parent_id: null,
        },
      ];

      const chunks = chunker.chunk("file1", content, headings);

      expect(chunks.length).toBeGreaterThan(1);
      // Each chunk should be around maxChunkSize
      for (const chunk of chunks) {
        expect(chunk.word_count).toBeLessThanOrEqual(25); // Some tolerance
      }
    });

    it("should create overlapping chunks", () => {
      const chunker = new MarkdownChunker({
        maxChunkSize: 10,
        overlapSize: 3,
        splitOnHeadings: false,
      });
      const content = "one two three four five six seven eight nine ten eleven twelve";

      const chunks = chunker.chunk("file1", content, []);

      expect(chunks.length).toBeGreaterThan(1);

      // Check for overlap (last words of chunk N should appear in chunk N+1)
      if (chunks.length > 1) {
        const chunk0Words = chunks[0].content.split(/\s+/);

        // Should have some overlap
        const lastWordsChunk0 = chunk0Words.slice(-3).join(" ");
        expect(chunks[1].content).toContain(lastWordsChunk0.split(" ")[0]);
      }
    });

    it("should handle size-based chunking without headings", () => {
      const chunker = new MarkdownChunker({
        maxChunkSize: 20,
        overlapSize: 5,
        splitOnHeadings: false,
      });
      const content = "word ".repeat(50);

      const chunks = chunker.chunk("file1", content, []);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].heading).toBeNull();
    });
  });

  describe("Word and Token Counting", () => {
    it("should count words correctly", () => {
      const chunker = new MarkdownChunker();
      const content = `# Test
This is five words total.`;

      const headings: MarkdownHeading[] = [
        {
          id: "h1",
          file_id: "file1",
          level: 1,
          text: "Test",
          slug: "test",
          line_number: 1,
          parent_id: null,
        },
      ];

      const chunks = chunker.chunk("file1", content, headings);

      expect(chunks[0].word_count).toBeGreaterThan(0);
    });

    it("should estimate token count", () => {
      const chunker = new MarkdownChunker();
      const content = `# Test
Some content here.`;

      const headings: MarkdownHeading[] = [
        {
          id: "h1",
          file_id: "file1",
          level: 1,
          text: "Test",
          slug: "test",
          line_number: 1,
          parent_id: null,
        },
      ];

      const chunks = chunker.chunk("file1", content, headings);

      // Token count should be roughly 1.3x word count
      expect(chunks[0].token_count).toBeGreaterThan(chunks[0].word_count);
      expect(chunks[0].token_count).toBeLessThan(chunks[0].word_count * 2);
    });
  });

  describe("Configuration", () => {
    it("should use default configuration", () => {
      const chunker = new MarkdownChunker();
      const content = "Test content";

      const chunks = chunker.chunk("file1", content, []);

      expect(chunks).toBeDefined();
    });

    it("should accept custom configuration", () => {
      const customConfig = {
        maxChunkSize: 100,
        overlapSize: 20,
        splitOnHeadings: false,
        preserveContext: false,
      };

      const chunker = new MarkdownChunker(customConfig);
      const content = "word ".repeat(200);

      const chunks = chunker.chunk("file1", content, []);

      expect(chunks.length).toBeGreaterThan(0);
    });

    it("should disable context preservation when configured", () => {
      const chunker = new MarkdownChunker({ preserveContext: false });
      const content = `# Chapter 1
## Section 1.1
Content`;

      const headings: MarkdownHeading[] = [
        {
          id: "h1",
          file_id: "file1",
          level: 1,
          text: "Chapter 1",
          slug: "chapter-1",
          line_number: 1,
          parent_id: null,
        },
        {
          id: "h2",
          file_id: "file1",
          level: 2,
          text: "Section 1.1",
          slug: "section-1-1",
          line_number: 2,
          parent_id: "h1",
        },
      ];

      const chunks = chunker.chunk("file1", content, headings);

      // Should only have section heading, not full context
      expect(chunks[1].heading).toBe("Section 1.1");
      expect(chunks[1].heading).not.toContain("Chapter 1");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty content", () => {
      const chunker = new MarkdownChunker();
      const chunks = chunker.chunk("file1", "", []);

      expect(chunks).toHaveLength(0);
    });

    it("should handle content with no headings", () => {
      const chunker = new MarkdownChunker({ splitOnHeadings: true });
      const content = "Just plain text without any headings.";

      const chunks = chunker.chunk("file1", content, []);

      // Should fallback to size-based chunking
      expect(chunks).toHaveLength(1);
      expect(chunks[0].heading).toBeNull();
    });

    it("should handle very short content", () => {
      const chunker = new MarkdownChunker({ maxChunkSize: 1000 });
      const content = "# Test\nShort.";

      const headings: MarkdownHeading[] = [
        {
          id: "h1",
          file_id: "file1",
          level: 1,
          text: "Test",
          slug: "test",
          line_number: 1,
          parent_id: null,
        },
      ];

      const chunks = chunker.chunk("file1", content, headings);

      expect(chunks).toHaveLength(1);
    });

    it("should handle single word content", () => {
      const chunker = new MarkdownChunker();
      const content = "Test";

      const chunks = chunker.chunk("file1", content, []);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].word_count).toBe(1);
    });

    it("should prevent infinite loop with invalid overlap config", () => {
      const chunker = new MarkdownChunker({
        maxChunkSize: 10,
        overlapSize: 15, // Overlap > max size
        splitOnHeadings: false,
      });
      const content = "word ".repeat(50);

      const chunks = chunker.chunk("file1", content, []);

      // Should still produce chunks without infinite loop
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.length).toBeLessThan(100); // Sanity check
    });
  });
});
