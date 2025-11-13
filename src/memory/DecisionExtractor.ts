/**
 * DecisionExtractor - Extract writing decisions from conversation history
 *
 * Parses Claude Code conversation files to identify and extract:
 * - Structural decisions (reorganization, chapter order)
 * - Content decisions (what to include/exclude)
 * - Terminology decisions (word choices, naming)
 * - Style decisions (tone, formatting)
 *
 * Captures the WHY behind decisions for holistic memory.
 */

import { nanoid } from "nanoid";
import type { SQLiteManager } from "../storage/SQLiteManager.js";

export interface WritingDecision {
  id: string;
  sessionId?: string;
  filePath?: string;
  section?: string;
  decisionText: string;
  rationale?: string;
  alternativesConsidered?: string[];
  timestamp: number;
  decisionType?: DecisionType;
  createdAt: number;
}

export type DecisionType = "structure" | "content" | "terminology" | "style";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string | unknown[];
  timestamp?: number;
}

export class DecisionExtractor {
  private db: SQLiteManager;

  constructor(db: SQLiteManager) {
    this.db = db;
  }

  /**
   * Extract decisions from conversation messages
   */
  extractDecisions(
    messages: ConversationMessage[],
    sessionId?: string,
    projectPath?: string
  ): WritingDecision[] {
    const decisions: WritingDecision[] = [];

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const nextMessage = i < messages.length - 1 ? messages[i + 1] : undefined;

      // Look for decision patterns in user-assistant exchanges
      if (message.role === "user" && nextMessage?.role === "assistant") {
        const extracted = this.analyzeExchange(
          message,
          nextMessage,
          sessionId,
          projectPath
        );
        if (extracted) {
          decisions.push(extracted);
        }
      }
    }

    return decisions;
  }

  /**
   * Store a decision in the database
   */
  storeDecision(decision: WritingDecision): void {
    this.db
      .prepare(
        `INSERT INTO writing_decisions
         (id, session_id, file_path, section, decision_text, rationale, alternatives_considered, timestamp, decision_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        decision.id,
        decision.sessionId || null,
        decision.filePath || null,
        decision.section || null,
        decision.decisionText,
        decision.rationale || null,
        decision.alternativesConsidered
          ? JSON.stringify(decision.alternativesConsidered)
          : null,
        decision.timestamp,
        decision.decisionType || null,
        decision.createdAt
      );
  }

  /**
   * Get decisions for a session
   */
  getDecisionsBySession(sessionId: string): WritingDecision[] {
    const rows = this.db
      .prepare(
        `SELECT id, session_id, file_path, section, decision_text, rationale, alternatives_considered, timestamp, decision_type, created_at
         FROM writing_decisions
         WHERE session_id = ?
         ORDER BY timestamp ASC`
      )
      .all(sessionId) as DecisionRow[];

    return rows.map((row) => this.rowToDecision(row));
  }

  /**
   * Get decisions for a file
   */
  getDecisionsByFile(filePath: string, limit = 10): WritingDecision[] {
    const rows = this.db
      .prepare(
        `SELECT id, session_id, file_path, section, decision_text, rationale, alternatives_considered, timestamp, decision_type, created_at
         FROM writing_decisions
         WHERE file_path = ?
         ORDER BY timestamp DESC
         LIMIT ?`
      )
      .all(filePath, limit) as DecisionRow[];

    return rows.map((row) => this.rowToDecision(row));
  }

  /**
   * Search decisions by type
   */
  getDecisionsByType(
    decisionType: DecisionType,
    limit = 20
  ): WritingDecision[] {
    const rows = this.db
      .prepare(
        `SELECT id, session_id, file_path, section, decision_text, rationale, alternatives_considered, timestamp, decision_type, created_at
         FROM writing_decisions
         WHERE decision_type = ?
         ORDER BY timestamp DESC
         LIMIT ?`
      )
      .all(decisionType, limit) as DecisionRow[];

    return rows.map((row) => this.rowToDecision(row));
  }

  /**
   * Analyze user-assistant exchange for decision patterns
   */
  private analyzeExchange(
    userMessage: ConversationMessage,
    assistantMessage: ConversationMessage,
    sessionId?: string,
    projectPath?: string
  ): WritingDecision | undefined {
    const userText = this.extractText(userMessage.content);
    const assistantText = this.extractText(assistantMessage.content);

    // Decision indicators in user messages
    const decisionIndicators = [
      /should I (.*)/i,
      /which (approach|method|way|option) (.*)/i,
      /how (should|can) I (.*)/i,
      /what('s| is) (the )?best (way|approach) (.*)/i,
      /reorganize|restructure|refactor/i,
      /move (chapter|section)/i,
      /rename|change (the name|terminology)/i,
    ];

    const hasDecisionIndicator = decisionIndicators.some((pattern) =>
      pattern.test(userText)
    );

    if (!hasDecisionIndicator) {
      return undefined;
    }

    // Extract decision components from assistant response
    const decision = this.parseDecision(
      userText,
      assistantText,
      sessionId,
      projectPath
    );

    return decision;
  }

  /**
   * Parse decision from user question and assistant response
   */
  private parseDecision(
    userText: string,
    assistantText: string,
    sessionId?: string,
    projectPath?: string
  ): WritingDecision | undefined {
    // Extract file path if mentioned
    const fileMatch =
      userText.match(/chapter(\d+)\.md/i) ||
      userText.match(/([a-z-]+)\.md/i) ||
      assistantText.match(/chapter(\d+)\.md/i) ||
      assistantText.match(/([a-z-]+)\.md/i);
    const filePath = fileMatch ? fileMatch[0] : undefined;

    // Extract decision text (first substantive sentence from assistant)
    const sentences = assistantText.split(/[.!?]\s+/);
    const decisionText = sentences.find(
      (s) => s.length > 20 && !s.startsWith("I")
    );

    if (!decisionText) {
      return undefined;
    }

    // Extract rationale (sentences with "because", "since", "to", "for")
    const rationaleMatch = assistantText.match(
      /(because|since|to|for) ([^.!?]+)/i
    );
    const rationale = rationaleMatch ? rationaleMatch[0] : undefined;

    // Determine decision type
    const decisionType = this.classifyDecision(userText, assistantText);

    const now = Date.now();

    return {
      id: nanoid(),
      sessionId,
      filePath: filePath
        ? `${projectPath ? projectPath + "/" : ""}${filePath}`
        : undefined,
      decisionText,
      rationale,
      timestamp: now,
      decisionType,
      createdAt: now,
    };
  }

  /**
   * Classify decision type based on content
   */
  private classifyDecision(
    userText: string,
    assistantText: string
  ): DecisionType | undefined {
    const combined = (userText + " " + assistantText).toLowerCase();

    if (
      /reorganize|restructure|move chapter|reorder|chapter.*before/i.test(
        combined
      )
    ) {
      return "structure";
    }

    if (/rename|terminology|call it|name.*instead|word choice/i.test(combined)) {
      return "terminology";
    }

    if (/tone|style|format|heading|citation/i.test(combined)) {
      return "style";
    }

    if (/add|remove|include|exclude|content|paragraph/i.test(combined)) {
      return "content";
    }

    return undefined;
  }

  /**
   * Extract text from message content (handles both string and array formats)
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
   * Convert database row to WritingDecision
   */
  private rowToDecision(row: DecisionRow): WritingDecision {
    return {
      id: row.id,
      sessionId: row.session_id || undefined,
      filePath: row.file_path || undefined,
      section: row.section || undefined,
      decisionText: row.decision_text,
      rationale: row.rationale || undefined,
      alternativesConsidered: row.alternatives_considered
        ? JSON.parse(row.alternatives_considered)
        : undefined,
      timestamp: row.timestamp,
      decisionType: row.decision_type as DecisionType | undefined,
      createdAt: row.created_at,
    };
  }
}

interface DecisionRow {
  id: string;
  session_id: string | null;
  file_path: string | null;
  section: string | null;
  decision_text: string;
  rationale: string | null;
  alternatives_considered: string | null;
  timestamp: number;
  decision_type: string | null;
  created_at: number;
}
