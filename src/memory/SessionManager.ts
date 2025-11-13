/**
 * SessionManager - Track writing sessions and their context
 *
 * Manages writing sessions by:
 * - Creating session records when work begins
 * - Tracking files touched during the session
 * - Linking to conversation files for context
 * - Generating session summaries
 */

import { nanoid } from "nanoid";
import type { SQLiteManager } from "../storage/SQLiteManager.js";

export interface WritingSession {
  id: string;
  projectPath: string;
  startedAt: number;
  endedAt?: number;
  filesTouched?: string[];
  summary?: string;
  conversationFile?: string;
  createdAt: number;
}

export interface SessionQuery {
  projectPath?: string;
  startDate?: Date;
  endDate?: Date;
  fileInvolved?: string;
  limit?: number;
}

export class SessionManager {
  private db: SQLiteManager;
  private currentSession?: WritingSession;

  constructor(db: SQLiteManager) {
    this.db = db;
  }

  /**
   * Start a new writing session
   */
  startSession(projectPath: string, conversationFile?: string): WritingSession {
    const now = Date.now();
    const session: WritingSession = {
      id: nanoid(),
      projectPath,
      startedAt: now,
      filesTouched: [],
      conversationFile,
      createdAt: now,
    };

    this.db
      .prepare(
        `INSERT INTO writing_sessions (id, project_path, started_at, files_touched, conversation_file, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        session.id,
        session.projectPath,
        session.startedAt,
        JSON.stringify(session.filesTouched || []),
        session.conversationFile || null,
        session.createdAt
      );

    this.currentSession = session;
    return session;
  }

  /**
   * End the current session
   */
  endSession(sessionId: string, summary?: string): void {
    const now = Date.now();

    this.db
      .prepare(
        `UPDATE writing_sessions
         SET ended_at = ?, summary = ?
         WHERE id = ?`
      )
      .run(now, summary || null, sessionId);

    if (this.currentSession?.id === sessionId) {
      this.currentSession = undefined;
    }
  }

  /**
   * Record that a file was touched during this session
   */
  touchFile(sessionId: string, filePath: string): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const filesTouched = session.filesTouched || [];
    if (!filesTouched.includes(filePath)) {
      filesTouched.push(filePath);

      this.db
        .prepare(
          `UPDATE writing_sessions
           SET files_touched = ?
           WHERE id = ?`
        )
        .run(JSON.stringify(filesTouched), sessionId);
    }
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): WritingSession | undefined {
    const row = this.db
      .prepare(
        `SELECT id, project_path, started_at, ended_at, files_touched, summary, conversation_file, created_at
         FROM writing_sessions
         WHERE id = ?`
      )
      .get(sessionId) as SessionRow | undefined;

    if (!row) {
      return undefined;
    }

    return this.rowToSession(row);
  }

  /**
   * Get current active session (if any)
   */
  getCurrentSession(): WritingSession | undefined {
    return this.currentSession;
  }

  /**
   * Find sessions matching query criteria
   */
  findSessions(query: SessionQuery): WritingSession[] {
    let sql = `SELECT id, project_path, started_at, ended_at, files_touched, summary, conversation_file, created_at
               FROM writing_sessions
               WHERE 1=1`;
    const params: unknown[] = [];

    if (query.projectPath) {
      sql += ` AND project_path = ?`;
      params.push(query.projectPath);
    }

    if (query.startDate) {
      sql += ` AND started_at >= ?`;
      params.push(query.startDate.getTime());
    }

    if (query.endDate) {
      sql += ` AND started_at <= ?`;
      params.push(query.endDate.getTime());
    }

    if (query.fileInvolved) {
      // Search in JSON array (SQLite JSON functions)
      sql += ` AND files_touched LIKE ?`;
      params.push(`%"${query.fileInvolved}"%`);
    }

    sql += ` ORDER BY started_at DESC`;

    if (query.limit) {
      sql += ` LIMIT ?`;
      params.push(query.limit);
    }

    const rows = this.db.prepare(sql).all(...params) as SessionRow[];
    return rows.map((row) => this.rowToSession(row));
  }

  /**
   * Get sessions for a specific file
   */
  getSessionsForFile(filePath: string, limit = 10): WritingSession[] {
    return this.findSessions({ fileInvolved: filePath, limit });
  }

  /**
   * Get recent sessions for a project
   */
  getRecentSessions(projectPath: string, limit = 10): WritingSession[] {
    return this.findSessions({ projectPath, limit });
  }

  /**
   * Get session statistics
   */
  getSessionStats(projectPath?: string): SessionStats {
    let sql = `SELECT
                 COUNT(*) as total_sessions,
                 COUNT(CASE WHEN ended_at IS NOT NULL THEN 1 END) as completed_sessions,
                 COUNT(CASE WHEN ended_at IS NULL THEN 1 END) as active_sessions,
                 MIN(started_at) as earliest_session,
                 MAX(started_at) as latest_session
               FROM writing_sessions`;
    const params: unknown[] = [];

    if (projectPath) {
      sql += ` WHERE project_path = ?`;
      params.push(projectPath);
    }

    const row = this.db.prepare(sql).get(...params) as SessionStatsRow;

    return {
      totalSessions: row.total_sessions,
      completedSessions: row.completed_sessions,
      activeSessions: row.active_sessions,
      earliestSession: row.earliest_session
        ? new Date(row.earliest_session)
        : undefined,
      latestSession: row.latest_session
        ? new Date(row.latest_session)
        : undefined,
    };
  }

  /**
   * Delete a session and all associated data
   */
  deleteSession(sessionId: string): void {
    this.db.transaction(() => {
      // Cascade delete will handle writing_decisions and session_embeddings
      this.db.prepare(`DELETE FROM writing_sessions WHERE id = ?`).run(sessionId);
    });

    if (this.currentSession?.id === sessionId) {
      this.currentSession = undefined;
    }
  }

  /**
   * Convert database row to WritingSession object
   */
  private rowToSession(row: SessionRow): WritingSession {
    return {
      id: row.id,
      projectPath: row.project_path,
      startedAt: row.started_at,
      endedAt: row.ended_at || undefined,
      filesTouched: row.files_touched
        ? JSON.parse(row.files_touched)
        : undefined,
      summary: row.summary || undefined,
      conversationFile: row.conversation_file || undefined,
      createdAt: row.created_at,
    };
  }
}

// Database row types
interface SessionRow {
  id: string;
  project_path: string;
  started_at: number;
  ended_at: number | null;
  files_touched: string | null;
  summary: string | null;
  conversation_file: string | null;
  created_at: number;
}

interface SessionStatsRow {
  total_sessions: number;
  completed_sessions: number;
  active_sessions: number;
  earliest_session: number | null;
  latest_session: number | null;
}

export interface SessionStats {
  totalSessions: number;
  completedSessions: number;
  activeSessions: number;
  earliestSession?: Date;
  latestSession?: Date;
}
