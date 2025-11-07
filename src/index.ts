#!/usr/bin/env node

/**
 * Writer's Aid MCP - Main Entry Point
 * Phase 1: Foundation - Exports core storage and types
 * TODO: Add MCP server and CLI in Phase 5
 */

// Export core storage and types
export { WritingStorage } from "./storage/WritingStorage.js";
export { SQLiteManager } from "./storage/SQLiteManager.js";
export { QueryCache } from "./cache/QueryCache.js";

// Export markdown types
export type {
  MarkdownFile,
  MarkdownChunk,
  MarkdownHeading,
  MarkdownLink,
  MarkdownMetadata,
  MarkdownTodo,
  MarkdownCodeBlock,
  ParsedMarkdown,
  SearchResult,
  LinkGraph,
  WritingStats,
  ProgressReport,
} from "./markdown/types.js";

// Temporary main for Phase 1
console.log("Writer's Aid MCP v0.1.0 - Phase 1: Foundation");
console.log("Storage layer initialized. MCP server coming in Phase 5.");
