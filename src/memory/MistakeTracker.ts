/**
 * MistakeTracker - Track writing mistakes to prevent repetition
 *
 * Enables writers to:
 * - Record mistakes made during writing
 * - Categorize errors (logical fallacy, factual error, poor structure, etc.)
 * - Document corrections and how they were fixed
 * - Search for similar mistakes before making the same error
 * - Learn from past mistakes
 */

import { nanoid } from "nanoid";
import type { SQLiteManager } from "../storage/SQLiteManager.js";

export interface WritingMistake {
  id: string;
  sessionId?: string;
  filePath: string;
  lineRange?: string; // e.g., "45-52"
  mistakeType: MistakeType;
  description: string;
  correction?: string;
  howFixed?: string;
  timestamp: number;
  createdAt: number;
}

export type MistakeType =
  | "logical_fallacy"
  | "factual_error"
  | "poor_structure"
  | "inconsistency"
  | "unclear_writing"
  | "citation_error"
  | "redundancy"
  | "other";

export interface MistakeQuery {
  filePath?: string;
  mistakeType?: MistakeType;
  sessionId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export class MistakeTracker {
  private db: SQLiteManager;

  constructor(db: SQLiteManager) {
    this.db = db;
  }

  /**
   * Record a new mistake
   */
  markMistake(mistake: Omit<WritingMistake, "id" | "createdAt">): WritingMistake {
    const now = Date.now();
    const newMistake: WritingMistake = {
      id: nanoid(),
      ...mistake,
      createdAt: now,
    };

    this.db
      .prepare(
        `INSERT INTO writing_mistakes
         (id, session_id, file_path, line_range, mistake_type, description, correction, how_fixed, timestamp, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newMistake.id,
        newMistake.sessionId || null,
        newMistake.filePath,
        newMistake.lineRange || null,
        newMistake.mistakeType,
        newMistake.description,
        newMistake.correction || null,
        newMistake.howFixed || null,
        newMistake.timestamp,
        newMistake.createdAt
      );

    return newMistake;
  }

  /**
   * Update a mistake with correction details
   */
  updateMistake(
    mistakeId: string,
    update: { correction?: string; howFixed?: string }
  ): void {
    const mistake = this.getMistake(mistakeId);
    if (!mistake) {
      throw new Error(`Mistake ${mistakeId} not found`);
    }

    this.db
      .prepare(
        `UPDATE writing_mistakes
         SET correction = ?, how_fixed = ?
         WHERE id = ?`
      )
      .run(update.correction || null, update.howFixed || null, mistakeId);
  }

  /**
   * Get a mistake by ID
   */
  getMistake(mistakeId: string): WritingMistake | undefined {
    const row = this.db
      .prepare(
        `SELECT id, session_id, file_path, line_range, mistake_type, description, correction, how_fixed, timestamp, created_at
         FROM writing_mistakes
         WHERE id = ?`
      )
      .get(mistakeId) as MistakeRow | undefined;

    return row ? this.rowToMistake(row) : undefined;
  }

  /**
   * Find mistakes matching query criteria
   */
  findMistakes(query: MistakeQuery): WritingMistake[] {
    let sql = `SELECT id, session_id, file_path, line_range, mistake_type, description, correction, how_fixed, timestamp, created_at
               FROM writing_mistakes
               WHERE 1=1`;
    const params: unknown[] = [];

    if (query.filePath) {
      sql += ` AND file_path = ?`;
      params.push(query.filePath);
    }

    if (query.mistakeType) {
      sql += ` AND mistake_type = ?`;
      params.push(query.mistakeType);
    }

    if (query.sessionId) {
      sql += ` AND session_id = ?`;
      params.push(query.sessionId);
    }

    if (query.startDate) {
      sql += ` AND timestamp >= ?`;
      params.push(query.startDate.getTime());
    }

    if (query.endDate) {
      sql += ` AND timestamp <= ?`;
      params.push(query.endDate.getTime());
    }

    sql += ` ORDER BY timestamp DESC`;

    if (query.limit) {
      sql += ` LIMIT ?`;
      params.push(query.limit);
    }

    const rows = this.db.prepare(sql).all(...params) as MistakeRow[];
    return rows.map((row) => this.rowToMistake(row));
  }

  /**
   * Get mistakes for a specific file
   */
  getMistakesForFile(filePath: string, limit = 10): WritingMistake[] {
    return this.findMistakes({ filePath, limit });
  }

  /**
   * Get mistakes by type
   */
  getMistakesByType(mistakeType: MistakeType, limit = 20): WritingMistake[] {
    return this.findMistakes({ mistakeType, limit });
  }

  /**
   * Search for similar mistakes by description
   * (Basic text search - will be enhanced with embeddings in Phase 4)
   */
  searchSimilarMistakes(
    description: string,
    limit = 5
  ): WritingMistake[] {
    const keywords = description
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    if (keywords.length === 0) {
      return [];
    }

    // Use LIKE for basic text matching
    let sql = `SELECT id, session_id, file_path, line_range, mistake_type, description, correction, how_fixed, timestamp, created_at
               FROM writing_mistakes
               WHERE `;

    const conditions = keywords.map(() => `LOWER(description) LIKE ?`);
    sql += conditions.join(" OR ");
    sql += ` ORDER BY timestamp DESC LIMIT ?`;

    const params: unknown[] = keywords.map((kw) => `%${kw}%`);
    params.push(limit);

    const rows = this.db.prepare(sql).all(...params) as MistakeRow[];
    return rows.map((row) => this.rowToMistake(row));
  }

  /**
   * Get mistake statistics
   */
  getMistakeStats(filePath?: string): MistakeStats {
    let sql = `SELECT
                 COUNT(*) as total_mistakes,
                 COUNT(CASE WHEN correction IS NOT NULL THEN 1 END) as corrected_mistakes,
                 mistake_type,
                 COUNT(*) as type_count
               FROM writing_mistakes`;
    const params: unknown[] = [];

    if (filePath) {
      sql += ` WHERE file_path = ?`;
      params.push(filePath);
    }

    sql += ` GROUP BY mistake_type`;

    const rows = this.db.prepare(sql).all(...params) as MistakeStatsRow[];

    const byType: Record<string, number> = {};
    let totalMistakes = 0;
    let correctedMistakes = 0;

    for (const row of rows) {
      byType[row.mistake_type] = row.type_count;
      totalMistakes += row.type_count;
      correctedMistakes += row.corrected_mistakes;
    }

    return {
      totalMistakes,
      correctedMistakes,
      uncorrectedMistakes: totalMistakes - correctedMistakes,
      byType,
    };
  }

  /**
   * Get correction history for a mistake
   */
  getCorrectionHistory(mistakeId: string): {
    mistake: WritingMistake;
    relatedMistakes: WritingMistake[];
  } | undefined {
    const mistake = this.getMistake(mistakeId);
    if (!mistake) {
      return undefined;
    }

    // Find related mistakes (same file, similar type)
    const relatedMistakes = this.findMistakes({
      filePath: mistake.filePath,
      mistakeType: mistake.mistakeType,
      limit: 5,
    }).filter((m) => m.id !== mistakeId);

    return {
      mistake,
      relatedMistakes,
    };
  }

  /**
   * Delete a mistake
   */
  deleteMistake(mistakeId: string): void {
    this.db.prepare(`DELETE FROM writing_mistakes WHERE id = ?`).run(mistakeId);
  }

  /**
   * Convert database row to WritingMistake
   */
  private rowToMistake(row: MistakeRow): WritingMistake {
    return {
      id: row.id,
      sessionId: row.session_id || undefined,
      filePath: row.file_path,
      lineRange: row.line_range || undefined,
      mistakeType: row.mistake_type as MistakeType,
      description: row.description,
      correction: row.correction || undefined,
      howFixed: row.how_fixed || undefined,
      timestamp: row.timestamp,
      createdAt: row.created_at,
    };
  }
}

// Database row types
interface MistakeRow {
  id: string;
  session_id: string | null;
  file_path: string;
  line_range: string | null;
  mistake_type: string;
  description: string;
  correction: string | null;
  how_fixed: string | null;
  timestamp: number;
  created_at: number;
}

interface MistakeStatsRow {
  total_mistakes: number;
  corrected_mistakes: number;
  mistake_type: string;
  type_count: number;
}

export interface MistakeStats {
  totalMistakes: number;
  correctedMistakes: number;
  uncorrectedMistakes: number;
  byType: Record<string, number>;
}
