/**
 * Unit tests for LinkAnalyzer
 */

import { LinkAnalyzer } from "../../parsers/LinkAnalyzer.js";
import type { MarkdownFile, MarkdownLink } from "../../markdown/types.js";

describe("LinkAnalyzer", () => {
  let analyzer: LinkAnalyzer;

  beforeEach(() => {
    analyzer = new LinkAnalyzer();
  });

  describe("Wiki-Style Links", () => {
    it("should extract simple wiki links", () => {
      const content = "See [[Other Page]] for more info.";
      const links = analyzer.extractLinks("file1", "/test.md", content);

      expect(links).toHaveLength(1);
      expect(links[0].target_file_path).toBe("Other Page");
      expect(links[0].link_type).toBe("wiki");
      expect(links[0].link_text).toBeNull();
    });

    it("should extract wiki links with custom text", () => {
      const content = "Check [[custom text|target-page]] here.";
      const links = analyzer.extractLinks("file1", "/test.md", content);

      expect(links).toHaveLength(1);
      expect(links[0].target_file_path).toBe("target-page");
      expect(links[0].link_text).toBe("custom text");
      expect(links[0].link_type).toBe("wiki");
    });

    it("should extract multiple wiki links", () => {
      const content = "See [[Page 1]] and [[Page 2]] and [[Page 3]].";
      const links = analyzer.extractLinks("file1", "/test.md", content);

      expect(links).toHaveLength(3);
      expect(links[0].target_file_path).toBe("Page 1");
      expect(links[1].target_file_path).toBe("Page 2");
      expect(links[2].target_file_path).toBe("Page 3");
    });

    it("should track line numbers for wiki links", () => {
      const content = `Line 1
Link on [[line 2]]
Line 3
Another [[link]] on line 4`;

      const links = analyzer.extractLinks("file1", "/test.md", content);

      expect(links[0].source_line).toBe(2);
      expect(links[1].source_line).toBe(4);
    });
  });

  describe("Markdown Links", () => {
    it("should extract markdown links", () => {
      const content = "Visit [GitHub](https://github.com) for more.";
      const links = analyzer.extractLinks("file1", "/test.md", content);

      expect(links).toHaveLength(1);
      expect(links[0].target_file_path).toBe("https://github.com");
      expect(links[0].link_text).toBe("GitHub");
      expect(links[0].link_type).toBe("external");
    });

    it("should extract relative file links", () => {
      const content = "See [other document](./docs/other.md) here.";
      const links = analyzer.extractLinks("file1", "/test.md", content);

      expect(links).toHaveLength(1);
      expect(links[0].target_file_path).toBe("./docs/other.md");
      expect(links[0].link_type).toBe("markdown");
    });

    it("should extract multiple markdown links", () => {
      const content = "[Link 1](url1) and [Link 2](url2) and [Link 3](url3).";
      const links = analyzer.extractLinks("file1", "/test.md", content);

      expect(links).toHaveLength(3);
      expect(links[0].link_text).toBe("Link 1");
      expect(links[1].link_text).toBe("Link 2");
      expect(links[2].link_text).toBe("Link 3");
    });
  });

  describe("Link Types", () => {
    it("should identify external HTTP links", () => {
      const content = "[Website](http://example.com)";
      const links = analyzer.extractLinks("file1", "/test.md", content);

      expect(links[0].link_type).toBe("external");
    });

    it("should identify external HTTPS links", () => {
      const content = "[Website](https://example.com)";
      const links = analyzer.extractLinks("file1", "/test.md", content);

      expect(links[0].link_type).toBe("external");
    });

    it("should identify anchor links", () => {
      const content = "[Jump to section](#section-name)";
      const links = analyzer.extractLinks("file1", "/test.md", content);

      expect(links[0].link_type).toBe("anchor");
      expect(links[0].target_file_path).toBe("#section-name");
    });

    it("should identify internal markdown links", () => {
      const content = "[Other doc](./other.md)";
      const links = analyzer.extractLinks("file1", "/test.md", content);

      expect(links[0].link_type).toBe("markdown");
    });

    it("should identify wiki links", () => {
      const content = "[[Page Name]]";
      const links = analyzer.extractLinks("file1", "/test.md", content);

      expect(links[0].link_type).toBe("wiki");
    });
  });

  describe("Mixed Link Types", () => {
    it("should extract both wiki and markdown links", () => {
      const content = "See [[Wiki Page]] and [Markdown Link](./page.md).";
      const links = analyzer.extractLinks("file1", "/test.md", content);

      expect(links).toHaveLength(2);
      expect(links[0].link_type).toBe("wiki");
      expect(links[1].link_type).toBe("markdown");
    });

    it("should handle multiple links on same line", () => {
      const content = "[[Wiki]] [MD](link) [External](https://example.com)";
      const links = analyzer.extractLinks("file1", "/test.md", content);

      expect(links).toHaveLength(3);
    });
  });

  describe("Link Graph", () => {
    it("should build link graph from files and links", () => {
      const files: MarkdownFile[] = [
        {
          id: "file1",
          file_path: "/docs/page1.md",
          title: "Page 1",
          content: "",
          content_hash: "hash1",
          word_count: 0,
          created_at: 0,
          last_modified: 0,
          indexed_at: 0,
        },
        {
          id: "file2",
          file_path: "/docs/page2.md",
          title: "Page 2",
          content: "",
          content_hash: "hash2",
          word_count: 0,
          created_at: 0,
          last_modified: 0,
          indexed_at: 0,
        },
      ];

      const links: MarkdownLink[] = [
        {
          id: "link1",
          source_file_id: "file1",
          target_file_path: "/docs/page2.md",
          link_text: "Page 2",
          link_type: "markdown",
          source_line: 1,
          is_broken: false,
        },
      ];

      const graph = analyzer.buildLinkGraph(files, links);

      expect(graph.nodes).toHaveLength(2);
      expect(graph.edges).toHaveLength(1);
      expect(graph.edges[0].source).toBe("file1");
      expect(graph.edges[0].target).toBe("file2");
    });

    it("should count incoming and outgoing links", () => {
      const files: MarkdownFile[] = [
        {
          id: "file1",
          file_path: "/page1.md",
          title: "Page 1",
          content: "",
          content_hash: "hash1",
          word_count: 0,
          created_at: 0,
          last_modified: 0,
          indexed_at: 0,
        },
        {
          id: "file2",
          file_path: "/page2.md",
          title: "Page 2",
          content: "",
          content_hash: "hash2",
          word_count: 0,
          created_at: 0,
          last_modified: 0,
          indexed_at: 0,
        },
      ];

      const links: MarkdownLink[] = [
        {
          id: "link1",
          source_file_id: "file1",
          target_file_path: "/page2.md",
          link_text: null,
          link_type: "markdown",
          source_line: 1,
          is_broken: false,
        },
        {
          id: "link2",
          source_file_id: "file1",
          target_file_path: "/page2.md",
          link_text: null,
          link_type: "markdown",
          source_line: 2,
          is_broken: false,
        },
      ];

      const graph = analyzer.buildLinkGraph(files, links);

      const page1Node = graph.nodes.find((n) => n.id === "file1");
      const page2Node = graph.nodes.find((n) => n.id === "file2");

      expect(page1Node?.outgoingLinks).toBe(2);
      expect(page1Node?.incomingLinks).toBe(0);
      expect(page2Node?.incomingLinks).toBe(2);
      expect(page2Node?.outgoingLinks).toBe(0);
    });

    it("should not create edges for external links", () => {
      const files: MarkdownFile[] = [
        {
          id: "file1",
          file_path: "/page1.md",
          title: "Page 1",
          content: "",
          content_hash: "hash1",
          word_count: 0,
          created_at: 0,
          last_modified: 0,
          indexed_at: 0,
        },
      ];

      const links: MarkdownLink[] = [
        {
          id: "link1",
          source_file_id: "file1",
          target_file_path: "https://example.com",
          link_text: "External",
          link_type: "external",
          source_line: 1,
          is_broken: false,
        },
      ];

      const graph = analyzer.buildLinkGraph(files, links);

      expect(graph.edges).toHaveLength(0);
    });
  });

  describe("Orphaned Files", () => {
    it("should find files with no links", () => {
      const files: MarkdownFile[] = [
        {
          id: "file1",
          file_path: "/connected.md",
          title: "Connected",
          content: "",
          content_hash: "hash1",
          word_count: 0,
          created_at: 0,
          last_modified: 0,
          indexed_at: 0,
        },
        {
          id: "file2",
          file_path: "/orphan.md",
          title: "Orphan",
          content: "",
          content_hash: "hash2",
          word_count: 0,
          created_at: 0,
          last_modified: 0,
          indexed_at: 0,
        },
      ];

      const links: MarkdownLink[] = [
        {
          id: "link1",
          source_file_id: "file1",
          target_file_path: "https://example.com",
          link_text: null,
          link_type: "external",
          source_line: 1,
          is_broken: false,
        },
      ];

      const orphaned = analyzer.findOrphanedFiles(files, links);

      expect(orphaned).toContain("/orphan.md");
      expect(orphaned).not.toContain("/connected.md");
    });
  });

  describe("Backlinks", () => {
    it("should find backlinks to a file", () => {
      const links: MarkdownLink[] = [
        {
          id: "link1",
          source_file_id: "file1",
          target_file_path: "/target.md",
          link_text: null,
          link_type: "markdown",
          source_line: 1,
          is_broken: false,
        },
        {
          id: "link2",
          source_file_id: "file2",
          target_file_path: "/target.md",
          link_text: null,
          link_type: "markdown",
          source_line: 1,
          is_broken: false,
        },
        {
          id: "link3",
          source_file_id: "file3",
          target_file_path: "/other.md",
          link_text: null,
          link_type: "markdown",
          source_line: 1,
          is_broken: false,
        },
      ];

      const backlinks = analyzer.getBacklinks("target", "/target.md", links);

      expect(backlinks).toHaveLength(2);
      expect(backlinks[0].source_file_id).toBe("file1");
      expect(backlinks[1].source_file_id).toBe("file2");
    });
  });

  describe("Outgoing Links", () => {
    it("should find outgoing links from a file", () => {
      const links: MarkdownLink[] = [
        {
          id: "link1",
          source_file_id: "file1",
          target_file_path: "/target1.md",
          link_text: null,
          link_type: "markdown",
          source_line: 1,
          is_broken: false,
        },
        {
          id: "link2",
          source_file_id: "file1",
          target_file_path: "/target2.md",
          link_text: null,
          link_type: "markdown",
          source_line: 2,
          is_broken: false,
        },
        {
          id: "link3",
          source_file_id: "file2",
          target_file_path: "/target3.md",
          link_text: null,
          link_type: "markdown",
          source_line: 1,
          is_broken: false,
        },
      ];

      const outgoing = analyzer.getOutgoingLinks("file1", links);

      expect(outgoing).toHaveLength(2);
      expect(outgoing[0].target_file_path).toBe("/target1.md");
      expect(outgoing[1].target_file_path).toBe("/target2.md");
    });
  });

  describe("Broken Links", () => {
    it("should not mark external links as broken", () => {
      const content = "[External](https://example.com)";
      const links = analyzer.extractLinks("file1", "/test.md", content);

      expect(links[0].is_broken).toBe(false);
    });

    it("should not mark anchor links as broken", () => {
      const content = "[Anchor](#section)";
      const links = analyzer.extractLinks("file1", "/test.md", content);

      expect(links[0].is_broken).toBe(false);
    });

    it("should get all broken links", () => {
      const links: MarkdownLink[] = [
        {
          id: "link1",
          source_file_id: "file1",
          target_file_path: "/exists.md",
          link_text: null,
          link_type: "markdown",
          source_line: 1,
          is_broken: false,
        },
        {
          id: "link2",
          source_file_id: "file1",
          target_file_path: "/missing.md",
          link_text: null,
          link_type: "markdown",
          source_line: 2,
          is_broken: true,
        },
      ];

      const broken = analyzer.getBrokenLinks(links);

      expect(broken).toHaveLength(1);
      expect(broken[0].target_file_path).toBe("/missing.md");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty content", () => {
      const links = analyzer.extractLinks("file1", "/test.md", "");

      expect(links).toHaveLength(0);
    });

    it("should handle content with no links", () => {
      const content = "Just plain text with no links at all.";
      const links = analyzer.extractLinks("file1", "/test.md", content);

      expect(links).toHaveLength(0);
    });

    it("should handle nested brackets", () => {
      const content = "[[Link with [nested] brackets]]";
      const links = analyzer.extractLinks("file1", "/test.md", content);

      // Nested brackets break the regex pattern - this is a known limitation
      // The regex stops at the first closing bracket
      expect(links).toHaveLength(0);
    });

    it("should trim whitespace from link targets", () => {
      const content = "[[  Spaced Link  ]]";
      const links = analyzer.extractLinks("file1", "/test.md", content);

      expect(links[0].target_file_path).toBe("Spaced Link");
    });

    it("should generate unique IDs for each link", () => {
      const content = "[[Link1]] [[Link2]]";
      const links = analyzer.extractLinks("file1", "/test.md", content);

      expect(links[0].id).not.toBe(links[1].id);
    });

    it("should handle empty link graph", () => {
      const graph = analyzer.buildLinkGraph([], []);

      expect(graph.nodes).toHaveLength(0);
      expect(graph.edges).toHaveLength(0);
    });
  });
});
