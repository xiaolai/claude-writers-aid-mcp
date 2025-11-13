/**
 * SessionIndexer - Index writing sessions from conversation history
 *
 * Orchestrates the process of:
 * 1. Finding conversation files in .claude/conversations/
 * 2. Parsing JSONL conversation format
 * 3. Creating session records
 * 4. Extracting decisions from conversations
 * 5. Generating embeddings for semantic search
 * 6. Storing everything in the database
 */

import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import type { SQLiteManager } from "../storage/SQLiteManager.js";
import { SessionManager, type WritingSession } from "./SessionManager.js";
import {
  DecisionExtractor,
  type ConversationMessage,
} from "./DecisionExtractor.js";

export interface IndexingOptions {
  projectPath: string;
  conversationsDir?: string; // Default: ~/.claude/conversations
  includeOldConversations?: boolean; // Index conversations from before holistic memory feature
}

export interface IndexingResult {
  sessionsIndexed: number;
  decisionsExtracted: number;
  filesProcessed: number;
  errors: string[];
}

export class SessionIndexer {
  private db: SQLiteManager;
  private sessionManager: SessionManager;
  private decisionExtractor: DecisionExtractor;

  constructor(db: SQLiteManager) {
    this.db = db;
    this.sessionManager = new SessionManager(db);
    this.decisionExtractor = new DecisionExtractor(db);
  }

  /**
   * Index all conversation files for a project
   */
  async indexProject(options: IndexingOptions): Promise<IndexingResult> {
    const result: IndexingResult = {
      sessionsIndexed: 0,
      decisionsExtracted: 0,
      filesProcessed: 0,
      errors: [],
    };

    const conversationsDir =
      options.conversationsDir || join(homedir(), ".claude", "conversations");

    try {
      const conversationFiles = await this.findConversationFiles(
        conversationsDir
      );

      for (const filePath of conversationFiles) {
        try {
          const indexed = await this.indexConversationFile(
            filePath,
            options.projectPath
          );

          result.sessionsIndexed += indexed.sessions;
          result.decisionsExtracted += indexed.decisions;
          result.filesProcessed++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          result.errors.push(`Failed to index ${filePath}: ${errorMessage}`);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to read conversations directory: ${errorMessage}`);
    }

    return result;
  }

  /**
   * Index a single conversation file
   */
  async indexConversationFile(
    filePath: string,
    projectPath: string
  ): Promise<{ sessions: number; decisions: number }> {
    const content = await readFile(filePath, "utf-8");
    const messages = this.parseConversationFile(content);

    if (messages.length === 0) {
      return { sessions: 0, decisions: 0 };
    }

    // Check if this conversation is about the project
    const isRelevant = await this.isRelevantToProject(messages, projectPath);
    if (!isRelevant) {
      return { sessions: 0, decisions: 0 };
    }

    // Create session record
    const session = this.createSessionFromConversation(
      messages,
      projectPath,
      filePath
    );

    // Extract decisions from conversation
    const decisions = this.decisionExtractor.extractDecisions(
      messages,
      session.id,
      projectPath
    );

    // Store decisions
    for (const decision of decisions) {
      this.decisionExtractor.storeDecision(decision);
    }

    // TODO: Generate embeddings for session and decisions (Phase 4)

    return { sessions: 1, decisions: decisions.length };
  }

  /**
   * Find all conversation files in directory
   */
  private async findConversationFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          // Recursively search subdirectories
          const subFiles = await this.findConversationFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
          files.push(fullPath);
        }
      }
    } catch (_error) {
      // Directory doesn't exist or not accessible
      return [];
    }

    return files;
  }

  /**
   * Parse JSONL conversation file
   */
  private parseConversationFile(content: string): ConversationMessage[] {
    const messages: ConversationMessage[] = [];
    const lines = content.split("\n").filter((line) => line.trim());

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as Record<string, unknown>;

        // Extract message from Claude Code conversation format
        if (parsed.role && (parsed.role === "user" || parsed.role === "assistant")) {
          messages.push({
            role: parsed.role as "user" | "assistant",
            content: parsed.content as string | unknown[],
            timestamp: parsed.timestamp
              ? Number(parsed.timestamp)
              : undefined,
          });
        }
      } catch (_error) {
        // Skip malformed lines
        continue;
      }
    }

    return messages;
  }

  /**
   * Check if conversation is relevant to the project
   */
  private async isRelevantToProject(
    messages: ConversationMessage[],
    projectPath: string
  ): Promise<boolean> {
    const projectName = projectPath.split("/").pop() || "";

    // Check if project path or name is mentioned in first 10 messages
    const earlyMessages = messages
      .slice(0, 10)
      .map((m) => this.extractText(m.content))
      .join(" ")
      .toLowerCase();

    return (
      earlyMessages.includes(projectPath.toLowerCase()) ||
      earlyMessages.includes(projectName.toLowerCase()) ||
      earlyMessages.includes("manuscript") ||
      earlyMessages.includes("chapter") ||
      earlyMessages.includes("writing")
    );
  }

  /**
   * Create session from conversation messages
   */
  private createSessionFromConversation(
    messages: ConversationMessage[],
    projectPath: string,
    conversationFile: string
  ): WritingSession {
    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];

    const startedAt = firstMessage.timestamp || Date.now();
    const endedAt = lastMessage.timestamp;

    // Extract files touched from conversation
    const filesTouched = this.extractFilesTouched(messages);

    // Generate summary from first user message
    const summary = this.generateSummary(messages);

    const session = this.sessionManager.startSession(
      projectPath,
      conversationFile
    );

    // Update session with extracted data
    this.db
      .prepare(
        `UPDATE writing_sessions
         SET started_at = ?, ended_at = ?, files_touched = ?, summary = ?
         WHERE id = ?`
      )
      .run(
        startedAt,
        endedAt || null,
        JSON.stringify(filesTouched),
        summary,
        session.id
      );

    return {
      ...session,
      startedAt,
      endedAt,
      filesTouched,
      summary,
    };
  }

  /**
   * Extract file paths mentioned in conversation
   */
  private extractFilesTouched(messages: ConversationMessage[]): string[] {
    const files = new Set<string>();
    const filePattern = /([a-z0-9-]+\/)*([a-z0-9-]+)\.(md|txt)/gi;

    for (const message of messages) {
      const text = this.extractText(message.content);
      const matches = text.matchAll(filePattern);

      for (const match of matches) {
        files.add(match[0]);
      }
    }

    return Array.from(files);
  }

  /**
   * Generate session summary from messages
   */
  private generateSummary(messages: ConversationMessage[]): string {
    // Use first user message as summary (truncated)
    if (messages.length > 0 && messages[0].role === "user") {
      const firstMessage = this.extractText(messages[0].content);
      return firstMessage.slice(0, 200);
    }

    return "Writing session";
  }

  /**
   * Extract text from message content
   */
  private extractText(content: string | unknown[]): string {
    if (typeof content === "string") {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }
          if (
            typeof item === "object" &&
            item !== null &&
            "text" in item &&
            typeof item.text === "string"
          ) {
            return item.text;
          }
          return "";
        })
        .join(" ");
    }

    return "";
  }

  /**
   * Re-index existing sessions (useful after updates)
   */
  async reindexSessions(projectPath: string): Promise<IndexingResult> {
    // Clear existing sessions for this project
    this.db
      .prepare(`DELETE FROM writing_sessions WHERE project_path = ?`)
      .run(projectPath);

    // Re-index from scratch
    return this.indexProject({ projectPath });
  }
}
