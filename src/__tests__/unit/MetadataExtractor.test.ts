/**
 * Unit tests for MetadataExtractor
 */

import { MetadataExtractor } from "../../parsers/MetadataExtractor.js";
import type { Frontmatter } from "../../markdown/types.js";

describe("MetadataExtractor", () => {
  let extractor: MetadataExtractor;

  beforeEach(() => {
    extractor = new MetadataExtractor();
  });

  describe("Metadata Extraction", () => {
    it("should convert frontmatter to metadata entries", () => {
      const frontmatter: Frontmatter = {
        title: "Test Article",
        author: "John Doe",
        date: "2025-01-07",
      };

      const metadata = extractor.extractMetadata("file1", frontmatter);

      expect(metadata).toHaveLength(3);
      expect(metadata[0].file_id).toBe("file1");
      expect(metadata[0].key).toBe("title");
      expect(metadata[0].value).toBe("Test Article");
    });

    it("should serialize array values to JSON", () => {
      const frontmatter: Frontmatter = {
        tags: ["writing", "tutorial", "markdown"],
      };

      const metadata = extractor.extractMetadata("file1", frontmatter);

      expect(metadata).toHaveLength(1);
      expect(metadata[0].value).toBe('["writing","tutorial","markdown"]');
    });

    it("should serialize object values to JSON", () => {
      const frontmatter: Frontmatter = {
        config: { theme: "dark", fontSize: 14 },
      };

      const metadata = extractor.extractMetadata("file1", frontmatter);

      expect(metadata[0].value).toContain("theme");
      expect(metadata[0].value).toContain("dark");
    });

    it("should handle boolean values", () => {
      const frontmatter: Frontmatter = {
        draft: true,
        published: false,
      };

      const metadata = extractor.extractMetadata("file1", frontmatter);

      expect(metadata[0].value).toBe("true");
      expect(metadata[1].value).toBe("false");
    });

    it("should handle number values", () => {
      const frontmatter: Frontmatter = {
        version: 2,
        rating: 4.5,
      };

      const metadata = extractor.extractMetadata("file1", frontmatter);

      expect(metadata[0].value).toBe("2");
      expect(metadata[1].value).toBe("4.5");
    });

    it("should generate unique IDs for each entry", () => {
      const frontmatter: Frontmatter = {
        title: "Test",
        author: "Author",
      };

      const metadata = extractor.extractMetadata("file1", frontmatter);

      expect(metadata[0].id).not.toBe(metadata[1].id);
    });
  });

  describe("Value Deserialization", () => {
    it("should deserialize JSON arrays", () => {
      const serialized = '["tag1","tag2","tag3"]';
      const value = extractor.deserializeValue(serialized);

      expect(Array.isArray(value)).toBe(true);
      expect(value).toEqual(["tag1", "tag2", "tag3"]);
    });

    it("should deserialize JSON objects", () => {
      const serialized = '{"key":"value","num":42}';
      const value = extractor.deserializeValue(serialized);

      expect(typeof value).toBe("object");
      expect(value).toEqual({ key: "value", num: 42 });
    });

    it("should return plain strings as-is", () => {
      const value = extractor.deserializeValue("Just a string");

      expect(value).toBe("Just a string");
    });

    it("should handle malformed JSON gracefully", () => {
      const value = extractor.deserializeValue("{not valid json");

      expect(value).toBe("{not valid json");
    });
  });

  describe("Get Metadata Value", () => {
    it("should retrieve metadata by key", () => {
      const frontmatter: Frontmatter = {
        title: "Test",
        tags: ["a", "b"],
      };

      const metadata = extractor.extractMetadata("file1", frontmatter);
      const title = extractor.getMetadataValue(metadata, "title");

      expect(title).toBe("Test");
    });

    it("should deserialize complex values", () => {
      const frontmatter: Frontmatter = {
        tags: ["tag1", "tag2"],
      };

      const metadata = extractor.extractMetadata("file1", frontmatter);
      const tags = extractor.getMetadataValue(metadata, "tags");

      expect(Array.isArray(tags)).toBe(true);
      expect(tags).toEqual(["tag1", "tag2"]);
    });

    it("should return null for missing keys", () => {
      const metadata = extractor.extractMetadata("file1", {});
      const value = extractor.getMetadataValue(metadata, "nonexistent");

      expect(value).toBeNull();
    });
  });

  describe("Metadata Validation", () => {
    it("should validate presence of required fields", () => {
      const frontmatter: Frontmatter = {
        title: "Test",
        author: "John",
      };

      const result = extractor.validateMetadata(frontmatter, ["title", "author"]);

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it("should detect missing required fields", () => {
      const frontmatter: Frontmatter = {
        title: "Test",
      };

      const result = extractor.validateMetadata(frontmatter, [
        "title",
        "author",
        "date",
      ]);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(["author", "date"]);
    });

    it("should handle empty frontmatter", () => {
      const result = extractor.validateMetadata({}, ["title"]);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(["title"]);
    });

    it("should handle no required fields", () => {
      const result = extractor.validateMetadata({ title: "Test" }, []);

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it("should treat null values as missing", () => {
      const frontmatter = {
        title: "Test",
        author: null,
      } as unknown as Frontmatter;

      const result = extractor.validateMetadata(frontmatter, ["title", "author"]);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain("author");
    });

    it("should treat undefined values as missing", () => {
      const frontmatter: Frontmatter = {
        title: "Test",
        author: undefined,
      };

      const result = extractor.validateMetadata(frontmatter, ["title", "author"]);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain("author");
    });
  });

  describe("Common Fields Extraction", () => {
    it("should extract standard metadata fields", () => {
      const frontmatter: Frontmatter = {
        title: "My Article",
        author: "Jane Doe",
        date: "2025-01-07",
        tags: ["writing", "tutorial"],
        draft: true,
        description: "A great article",
      };

      const fields = extractor.extractCommonFields(frontmatter);

      expect(fields.title).toBe("My Article");
      expect(fields.author).toBe("Jane Doe");
      expect(fields.date).toBe("2025-01-07");
      expect(fields.tags).toEqual(["writing", "tutorial"]);
      expect(fields.draft).toBe(true);
      expect(fields.description).toBe("A great article");
    });

    it("should handle missing fields gracefully", () => {
      const frontmatter: Frontmatter = {
        title: "Test",
      };

      const fields = extractor.extractCommonFields(frontmatter);

      expect(fields.title).toBe("Test");
      expect(fields.author).toBeUndefined();
      expect(fields.date).toBeUndefined();
      expect(fields.tags).toBeUndefined();
      expect(fields.draft).toBeUndefined();
    });

    it("should filter non-string tags", () => {
      const frontmatter: Frontmatter = {
        tags: ["valid", 123, true, "also-valid"] as unknown as string[],
      };

      const fields = extractor.extractCommonFields(frontmatter);

      expect(fields.tags).toEqual(["valid", "also-valid"]);
    });

    it("should handle empty tags array", () => {
      const frontmatter: Frontmatter = {
        tags: [],
      };

      const fields = extractor.extractCommonFields(frontmatter);

      expect(fields.tags).toBeUndefined();
    });

    it("should handle tags with only non-strings", () => {
      const frontmatter: Frontmatter = {
        tags: [123, true, null] as unknown as string[],
      };

      const fields = extractor.extractCommonFields(frontmatter);

      expect(fields.tags).toBeUndefined();
    });

    it("should handle non-string title", () => {
      const frontmatter = {
        title: 123,
      } as unknown as Frontmatter;

      const fields = extractor.extractCommonFields(frontmatter);

      expect(fields.title).toBeUndefined();
    });

    it("should handle non-boolean draft", () => {
      const frontmatter = {
        draft: "yes",
      } as unknown as Frontmatter;

      const fields = extractor.extractCommonFields(frontmatter);

      expect(fields.draft).toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty frontmatter", () => {
      const metadata = extractor.extractMetadata("file1", {});

      expect(metadata).toHaveLength(0);
    });

    it("should handle special characters in keys", () => {
      const frontmatter: Frontmatter = {
        "custom-key": "value",
        "another_key": "value2",
      };

      const metadata = extractor.extractMetadata("file1", frontmatter);

      expect(metadata).toHaveLength(2);
      expect(metadata[0].key).toBe("custom-key");
      expect(metadata[1].key).toBe("another_key");
    });

    it("should handle very long values", () => {
      const longValue = "x".repeat(10000);
      const frontmatter: Frontmatter = {
        content: longValue,
      };

      const metadata = extractor.extractMetadata("file1", frontmatter);

      expect(metadata[0].value).toBe(longValue);
    });
  });
});
