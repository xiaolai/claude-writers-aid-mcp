/**
 * Tests for Pagination Utilities
 */

import { describe, it, expect } from "@jest/globals";
import {
  resolvePaginationLimit,
  paginateResults,
  paginateNestedResults,
  PAGINATION_DEFAULTS,
} from "../../utils/pagination.js";

describe("Pagination Utilities", () => {
  describe("PAGINATION_DEFAULTS", () => {
    it("should define defaults for all at-risk tools", () => {
      const expectedTools = [
        "find_gaps",
        "find_todos",
        "find_duplicates",
        "check_terminology",
        "find_broken_links",
        "track_concept_evolution",
        "suggest_cross_references",
        "analyze_link_graph",
      ];

      for (const tool of expectedTools) {
        expect(PAGINATION_DEFAULTS[tool]).toBeDefined();
        expect(PAGINATION_DEFAULTS[tool].default).toBeGreaterThan(0);
        expect(PAGINATION_DEFAULTS[tool].max).toBeGreaterThan(0);
        expect(PAGINATION_DEFAULTS[tool].max).toBeGreaterThanOrEqual(
          PAGINATION_DEFAULTS[tool].default
        );
      }
    });
  });

  describe("resolvePaginationLimit", () => {
    it("should return default limit when user doesn't provide one", () => {
      const limit = resolvePaginationLimit("find_gaps");
      expect(limit).toBe(PAGINATION_DEFAULTS.find_gaps.default);
    });

    it("should return user limit when within bounds", () => {
      const limit = resolvePaginationLimit("find_gaps", 15);
      expect(limit).toBe(15);
    });

    it("should cap user limit at maximum", () => {
      const limit = resolvePaginationLimit("find_gaps", 500);
      expect(limit).toBe(PAGINATION_DEFAULTS.find_gaps.max);
    });

    it("should handle tools without pagination config", () => {
      const limit = resolvePaginationLimit("unknown_tool", 50);
      expect(limit).toBe(50);
    });

    it("should handle tools without pagination config and no user limit", () => {
      const limit = resolvePaginationLimit("unknown_tool");
      expect(limit).toBe(Number.MAX_SAFE_INTEGER);
    });

    it("should use default for each configured tool", () => {
      expect(resolvePaginationLimit("find_todos")).toBe(50);
      expect(resolvePaginationLimit("find_duplicates")).toBe(30);
      expect(resolvePaginationLimit("check_terminology")).toBe(20);
    });

    it("should enforce minimum limit of 1 (prevent bypass with 0)", () => {
      const limit = resolvePaginationLimit("find_gaps", 0);
      expect(limit).toBe(1);
    });

    it("should enforce minimum limit of 1 (prevent bypass with negative)", () => {
      const limit = resolvePaginationLimit("find_gaps", -1);
      expect(limit).toBe(1);
    });

    it("should enforce minimum limit of 1 for unconfigured tools with 0", () => {
      const limit = resolvePaginationLimit("unknown_tool", 0);
      expect(limit).toBe(1);
    });

    it("should enforce minimum limit of 1 for unconfigured tools with negative", () => {
      const limit = resolvePaginationLimit("unknown_tool", -100);
      expect(limit).toBe(1);
    });
  });

  describe("paginateResults", () => {
    const testArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    it("should return all items when no limit provided", () => {
      const result = paginateResults(testArray);
      expect(result).toEqual(testArray);
    });

    it("should return all items when limit is undefined", () => {
      const result = paginateResults(testArray, undefined);
      expect(result).toEqual(testArray);
    });

    it("should return limited items when limit provided", () => {
      const result = paginateResults(testArray, 5);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it("should return all items when limit exceeds array length", () => {
      const result = paginateResults(testArray, 100);
      expect(result).toEqual(testArray);
    });

    it("should return empty array when limit is 0", () => {
      const result = paginateResults(testArray, 0);
      expect(result).toEqual(testArray); // 0 means no limit
    });

    it("should handle empty arrays", () => {
      const result = paginateResults([], 5);
      expect(result).toEqual([]);
    });

    it("should work with complex objects", () => {
      const objects = [
        { id: 1, name: "A" },
        { id: 2, name: "B" },
        { id: 3, name: "C" },
      ];
      const result = paginateResults(objects, 2);
      expect(result).toEqual([
        { id: 1, name: "A" },
        { id: 2, name: "B" },
      ]);
    });
  });

  describe("paginateNestedResults", () => {
    interface TermGroup {
      term: string;
      variants: string[];
      examples: { text: string }[];
    }

    const testGroups: TermGroup[] = [
      {
        term: "system prompt",
        variants: ["SystemPrompt", "system_prompt", "SYSTEM_PROMPT"],
        examples: [
          { text: "example 1" },
          { text: "example 2" },
          { text: "example 3" },
        ],
      },
      {
        term: "LLM",
        variants: ["llm", "Large Language Model"],
        examples: [{ text: "example A" }, { text: "example B" }],
      },
      {
        term: "RAG",
        variants: ["rag", "retrieval"],
        examples: [{ text: "example X" }],
      },
    ];

    it("should limit number of groups", () => {
      const result = paginateNestedResults(testGroups, 2);
      expect(result).toHaveLength(2);
      expect(result[0].term).toBe("system prompt");
      expect(result[1].term).toBe("LLM");
    });

    it("should limit items within each group", () => {
      const result = paginateNestedResults(testGroups, undefined, 2);
      expect(result[0].variants).toHaveLength(2);
      expect(result[0].examples).toHaveLength(2);
      expect(result[1].variants).toHaveLength(2);
    });

    it("should limit both groups and items per group", () => {
      const result = paginateNestedResults(testGroups, 2, 1);
      expect(result).toHaveLength(2);
      expect(result[0].variants).toHaveLength(1);
      expect(result[0].examples).toHaveLength(1);
    });

    it("should return all when no limits provided", () => {
      const result = paginateNestedResults(testGroups);
      expect(result).toEqual(testGroups);
    });

    it("should handle empty arrays", () => {
      const result = paginateNestedResults([], 5, 2);
      expect(result).toEqual([]);
    });

    it("should preserve non-array properties", () => {
      const result = paginateNestedResults(testGroups, 1, 1);
      expect(result[0].term).toBe("system prompt");
    });
  });
});
