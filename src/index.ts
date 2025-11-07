#!/usr/bin/env node

/**
 * Writer's Aid - Main Entry Point
 * Supports both MCP server mode and CLI mode
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { WritersAid } from "./WritersAid.js";
import { writerToolDefinitions } from "./tools/WriterToolDefinitions.js";
import { WriterToolHandlers } from "./tools/WriterToolHandlers.js";
import { createCLI } from "./cli/commands.js";

// Export core components
export { WritersAid } from "./WritersAid.js";
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

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Detect mode: CLI if arguments provided, MCP server otherwise
  const hasCliArgs = process.argv.length > 2;

  if (hasCliArgs) {
    // CLI mode - run commands
    const program = createCLI();
    program.parse(process.argv);
  } else {
    // MCP server mode - start stdio server
    const server = new Server(
      {
        name: "writers-aid",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize WritersAid with current directory
    const projectPath = process.cwd();
    const writersAid = new WritersAid({ projectPath });
    const handlers = new WriterToolHandlers(writersAid);

    // Register tool list handler
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: writerToolDefinitions,
    }));

    // Register tool call handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const result = await handlers.handleTool(name, args || {});

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });

    // Start server
    const transport = new StdioServerTransport();
    server.connect(transport).catch((error) => {
      console.error("Server error:", error);
      process.exit(1);
    });

    console.error("Writer's Aid MCP v0.1.0 - Server started");
  }
}
