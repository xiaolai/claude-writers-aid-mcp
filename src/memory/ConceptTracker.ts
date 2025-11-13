/**
 * ConceptTracker - Track how concepts evolve over time
 *
 * Enables writers to:
 * - Record definitions of key concepts
 * - Track how concepts change across versions
 * - Detect concept drift or contradictions
 * - Understand the evolution of ideas
 */

import { nanoid } from "nanoid";
import type { SQLiteManager } from "../storage/SQLiteManager.js";

export interface ConceptVersion {
  id: string;
  conceptName: string;
  filePath: string;
  versionNumber: number;
  definition: string;
  context?: string;
  previousVersionId?: string;
  changeRationale?: string;
  timestamp: number;
  sessionId?: string;
  commitHash?: string;
  createdAt: number;
}

export interface ConceptQuery {
  conceptName?: string;
  filePath?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface ConceptEvolution {
  conceptName: string;
  versions: ConceptVersion[];
  totalVersions: number;
  firstDefinition: ConceptVersion;
  latestDefinition: ConceptVersion;
  changeCount: number;
}

export class ConceptTracker {
  private db: SQLiteManager;

  constructor(db: SQLiteManager) {
    this.db = db;
  }

  /**
   * Track a new concept or version
   */
  trackConcept(options: {
    conceptName: string;
    filePath: string;
    definition: string;
    context?: string;
    changeRationale?: string;
    sessionId?: string;
    commitHash?: string;
  }): ConceptVersion {
    // Find previous version for this concept
    const previousVersions = this.getConceptVersions(options.conceptName);
    const versionNumber = previousVersions.length + 1;
    const previousVersionId =
      previousVersions.length > 0 ? previousVersions[0].id : undefined;

    const now = Date.now();
    const conceptVersion: ConceptVersion = {
      id: nanoid(),
      conceptName: options.conceptName,
      filePath: options.filePath,
      versionNumber,
      definition: options.definition,
      context: options.context,
      previousVersionId,
      changeRationale: options.changeRationale,
      timestamp: now,
      sessionId: options.sessionId,
      commitHash: options.commitHash,
      createdAt: now,
    };

    this.db
      .prepare(
        `INSERT INTO concept_evolution
         (id, concept_name, file_path, version_number, definition, context, previous_version_id, change_rationale, timestamp, session_id, commit_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        conceptVersion.id,
        conceptVersion.conceptName,
        conceptVersion.filePath,
        conceptVersion.versionNumber,
        conceptVersion.definition,
        conceptVersion.context || null,
        conceptVersion.previousVersionId || null,
        conceptVersion.changeRationale || null,
        conceptVersion.timestamp,
        conceptVersion.sessionId || null,
        conceptVersion.commitHash || null,
        conceptVersion.createdAt
      );

    return conceptVersion;
  }

  /**
   * Get all versions of a concept
   */
  getConceptVersions(
    conceptName: string,
    limit?: number
  ): ConceptVersion[] {
    let sql = `SELECT id, concept_name, file_path, version_number, definition, context, previous_version_id, change_rationale, timestamp, session_id, commit_hash, created_at
               FROM concept_evolution
               WHERE concept_name = ?
               ORDER BY version_number DESC`;

    const params: unknown[] = [conceptName];

    if (limit) {
      sql += ` LIMIT ?`;
      params.push(limit);
    }

    const rows = this.db.prepare(sql).all(...params) as ConceptRow[];
    return rows.map((row) => this.rowToConcept(row));
  }

  /**
   * Get concept evolution (timeline with all changes)
   */
  getConceptEvolution(conceptName: string): ConceptEvolution | undefined {
    const versions = this.getConceptVersions(conceptName);

    if (versions.length === 0) {
      return undefined;
    }

    // Versions are sorted DESC, so reverse for chronological order
    const chronological = [...versions].reverse();

    return {
      conceptName,
      versions: chronological,
      totalVersions: versions.length,
      firstDefinition: chronological[0],
      latestDefinition: versions[0], // Latest is first in DESC order
      changeCount: versions.length - 1,
    };
  }

  /**
   * Get latest version of a concept
   */
  getLatestConceptVersion(
    conceptName: string
  ): ConceptVersion | undefined {
    const row = this.db
      .prepare(
        `SELECT id, concept_name, file_path, version_number, definition, context, previous_version_id, change_rationale, timestamp, session_id, commit_hash, created_at
         FROM concept_evolution
         WHERE concept_name = ?
         ORDER BY version_number DESC
         LIMIT 1`
      )
      .get(conceptName) as ConceptRow | undefined;

    return row ? this.rowToConcept(row) : undefined;
  }

  /**
   * Find concepts in a file
   */
  getConceptsInFile(filePath: string): string[] {
    const rows = this.db
      .prepare(
        `SELECT DISTINCT concept_name
         FROM concept_evolution
         WHERE file_path = ?
         ORDER BY concept_name`
      )
      .all(filePath) as Array<{ concept_name: string }>;

    return rows.map((r) => r.concept_name);
  }

  /**
   * Detect concept contradictions
   */
  findContradictions(conceptName: string): Array<{
    version1: ConceptVersion;
    version2: ConceptVersion;
    contradiction: string;
  }> {
    const versions = this.getConceptVersions(conceptName);
    const contradictions: Array<{
      version1: ConceptVersion;
      version2: ConceptVersion;
      contradiction: string;
    }> = [];

    // Simple heuristic: look for negating words between versions
    const negatingWords = [
      "not",
      "never",
      "opposite",
      "contrary",
      "different from",
      "instead of",
    ];

    for (let i = 0; i < versions.length - 1; i++) {
      for (let j = i + 1; j < versions.length; j++) {
        const v1 = versions[i];
        const v2 = versions[j];

        const def1Lower = v1.definition.toLowerCase();
        const def2Lower = v2.definition.toLowerCase();

        // Check for negating words
        const hasNegation = negatingWords.some(
          (word) => def1Lower.includes(word) || def2Lower.includes(word)
        );

        // Check for very different lengths (possible redefinition)
        const lengthDiff = Math.abs(
          v1.definition.length - v2.definition.length
        );
        const avgLength = (v1.definition.length + v2.definition.length) / 2;
        const significantLengthChange = lengthDiff / avgLength > 0.5;

        if (hasNegation || significantLengthChange) {
          contradictions.push({
            version1: v1,
            version2: v2,
            contradiction: hasNegation
              ? "Possible contradiction detected (negating language)"
              : "Significant redefinition detected",
          });
        }
      }
    }

    return contradictions;
  }

  /**
   * Get concept statistics
   */
  getConceptStats(): {
    totalConcepts: number;
    totalVersions: number;
    conceptsByFile: Record<string, number>;
    mostEvolvedConcepts: Array<{ conceptName: string; versions: number }>;
  } {
    const totalConcepts = (
      this.db
        .prepare(`SELECT COUNT(DISTINCT concept_name) as count FROM concept_evolution`)
        .get() as { count: number }
    ).count;

    const totalVersions = (
      this.db
        .prepare(`SELECT COUNT(*) as count FROM concept_evolution`)
        .get() as { count: number }
    ).count;

    const fileRows = this.db
      .prepare(
        `SELECT file_path, COUNT(*) as count
         FROM concept_evolution
         GROUP BY file_path`
      )
      .all() as Array<{ file_path: string; count: number }>;

    const conceptsByFile: Record<string, number> = {};
    for (const row of fileRows) {
      conceptsByFile[row.file_path] = row.count;
    }

    const mostEvolvedRows = this.db
      .prepare(
        `SELECT concept_name, COUNT(*) as versions
         FROM concept_evolution
         GROUP BY concept_name
         ORDER BY versions DESC
         LIMIT 10`
      )
      .all() as Array<{ concept_name: string; versions: number }>;

    const mostEvolvedConcepts = mostEvolvedRows.map((r) => ({
      conceptName: r.concept_name,
      versions: r.versions,
    }));

    return {
      totalConcepts,
      totalVersions,
      conceptsByFile,
      mostEvolvedConcepts,
    };
  }

  /**
   * Search concepts by query
   */
  searchConcepts(query: ConceptQuery): ConceptVersion[] {
    let sql = `SELECT id, concept_name, file_path, version_number, definition, context, previous_version_id, change_rationale, timestamp, session_id, commit_hash, created_at
               FROM concept_evolution
               WHERE 1=1`;
    const params: unknown[] = [];

    if (query.conceptName) {
      sql += ` AND concept_name LIKE ?`;
      params.push(`%${query.conceptName}%`);
    }

    if (query.filePath) {
      sql += ` AND file_path = ?`;
      params.push(query.filePath);
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

    const rows = this.db.prepare(sql).all(...params) as ConceptRow[];
    return rows.map((row) => this.rowToConcept(row));
  }

  /**
   * Delete a concept version
   */
  deleteConceptVersion(versionId: string): void {
    this.db
      .prepare(`DELETE FROM concept_evolution WHERE id = ?`)
      .run(versionId);
  }

  /**
   * Delete all versions of a concept
   */
  deleteConcept(conceptName: string): void {
    this.db
      .prepare(`DELETE FROM concept_evolution WHERE concept_name = ?`)
      .run(conceptName);
  }

  /**
   * Convert database row to ConceptVersion
   */
  private rowToConcept(row: ConceptRow): ConceptVersion {
    return {
      id: row.id,
      conceptName: row.concept_name,
      filePath: row.file_path,
      versionNumber: row.version_number,
      definition: row.definition,
      context: row.context || undefined,
      previousVersionId: row.previous_version_id || undefined,
      changeRationale: row.change_rationale || undefined,
      timestamp: row.timestamp,
      sessionId: row.session_id || undefined,
      commitHash: row.commit_hash || undefined,
      createdAt: row.created_at,
    };
  }
}

// Database row types
interface ConceptRow {
  id: string;
  concept_name: string;
  file_path: string;
  version_number: number;
  definition: string;
  context: string | null;
  previous_version_id: string | null;
  change_rationale: string | null;
  timestamp: number;
  session_id: string | null;
  commit_hash: string | null;
  created_at: number;
}
