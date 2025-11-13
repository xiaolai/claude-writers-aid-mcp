/**
 * Database migration system
 * Follows patterns from code-graph-rag-mcp for versioned schema updates
 */

import { SQLiteManager } from "./SQLiteManager.js";
import { createHash } from "crypto";

export interface Migration {
  version: number;
  description: string;
  up: string; // SQL to apply migration
  down?: string; // SQL to rollback migration (optional)
  checksum?: string; // Verify migration integrity
}

export const migrations: Migration[] = [
  {
    version: 1,
    description: "Initial schema with 17 tables for conversation memory",
    up: `
      -- Schema is already created by schema.sql during initialization
      -- This migration just records the version
    `,
  },
  {
    version: 2,
    description: "Add holistic memory Phase 1: Session tracking and decision memory",
    up: `
      -- Add checksum column to schema_version if it doesn't exist
      ALTER TABLE schema_version ADD COLUMN checksum TEXT;

      -- Writing sessions (when/where work happened)
      CREATE TABLE IF NOT EXISTS writing_sessions (
        id TEXT PRIMARY KEY,
        project_path TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        files_touched TEXT,
        summary TEXT,
        conversation_file TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_session_project ON writing_sessions(project_path);
      CREATE INDEX IF NOT EXISTS idx_session_started ON writing_sessions(started_at);

      -- Writing decisions (WHY choices were made)
      CREATE TABLE IF NOT EXISTS writing_decisions (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        file_path TEXT,
        section TEXT,
        decision_text TEXT NOT NULL,
        rationale TEXT,
        alternatives_considered TEXT,
        timestamp INTEGER NOT NULL,
        decision_type TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES writing_sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_decision_session ON writing_decisions(session_id);
      CREATE INDEX IF NOT EXISTS idx_decision_file ON writing_decisions(file_path);
      CREATE INDEX IF NOT EXISTS idx_decision_type ON writing_decisions(decision_type);
      CREATE INDEX IF NOT EXISTS idx_decision_timestamp ON writing_decisions(timestamp);

      -- Session embeddings for semantic search
      CREATE TABLE IF NOT EXISTS session_embeddings (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        embedding BLOB NOT NULL,
        model_name TEXT DEFAULT 'all-MiniLM-L6-v2',
        created_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES writing_sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_session_embed ON session_embeddings(session_id);

      -- Full-text search for sessions and decisions
      CREATE VIRTUAL TABLE IF NOT EXISTS writing_memory_fts USING fts5(
        memory_id UNINDEXED,
        memory_type UNINDEXED,
        text,
        metadata UNINDEXED,
        tokenize = 'porter unicode61'
      );
    `,
    down: `
      DROP TABLE IF EXISTS session_embeddings;
      DROP TABLE IF EXISTS writing_decisions;
      DROP TABLE IF EXISTS writing_sessions;
      DROP TABLE IF EXISTS writing_memory_fts;
    `,
  },
  {
    version: 3,
    description: "Add holistic memory Phase 2: Mistake tracking and requirements",
    up: `
      -- Writing mistakes (errors to avoid repeating)
      CREATE TABLE IF NOT EXISTS writing_mistakes (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        file_path TEXT NOT NULL,
        line_range TEXT,
        mistake_type TEXT NOT NULL,
        description TEXT NOT NULL,
        correction TEXT,
        how_fixed TEXT,
        timestamp INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES writing_sessions(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_mistake_session ON writing_mistakes(session_id);
      CREATE INDEX IF NOT EXISTS idx_mistake_file ON writing_mistakes(file_path);
      CREATE INDEX IF NOT EXISTS idx_mistake_type ON writing_mistakes(mistake_type);
      CREATE INDEX IF NOT EXISTS idx_mistake_timestamp ON writing_mistakes(timestamp);

      -- Publisher requirements & constraints
      CREATE TABLE IF NOT EXISTS writing_requirements (
        id TEXT PRIMARY KEY,
        requirement_type TEXT NOT NULL,
        description TEXT NOT NULL,
        value TEXT,
        enforced BOOLEAN DEFAULT FALSE,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_requirement_type ON writing_requirements(requirement_type);
      CREATE INDEX IF NOT EXISTS idx_requirement_enforced ON writing_requirements(enforced);

      -- Style decisions (canonical choices)
      CREATE TABLE IF NOT EXISTS style_decisions (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        canonical_choice TEXT NOT NULL,
        alternatives_rejected TEXT,
        rationale TEXT,
        examples TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_style_category ON style_decisions(category);

      -- Mistake embeddings for semantic search
      CREATE TABLE IF NOT EXISTS mistake_embeddings (
        id TEXT PRIMARY KEY,
        mistake_id TEXT NOT NULL,
        embedding BLOB NOT NULL,
        model_name TEXT DEFAULT 'all-MiniLM-L6-v2',
        created_at INTEGER NOT NULL,
        FOREIGN KEY (mistake_id) REFERENCES writing_mistakes(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_mistake_embed ON mistake_embeddings(mistake_id);
    `,
    down: `
      DROP TABLE IF EXISTS mistake_embeddings;
      DROP TABLE IF EXISTS style_decisions;
      DROP TABLE IF EXISTS writing_requirements;
      DROP TABLE IF EXISTS writing_mistakes;
    `,
  },
  {
    version: 4,
    description: "Add holistic memory Phase 3: Git integration and concept evolution",
    up: `
      -- Manuscript commits (git history)
      CREATE TABLE IF NOT EXISTS manuscript_commits (
        commit_hash TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        author TEXT,
        message TEXT NOT NULL,
        files_changed TEXT NOT NULL,
        session_id TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES writing_sessions(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_commit_timestamp ON manuscript_commits(timestamp);
      CREATE INDEX IF NOT EXISTS idx_commit_session ON manuscript_commits(session_id);

      -- File revision history
      CREATE TABLE IF NOT EXISTS file_revisions (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        commit_hash TEXT NOT NULL,
        lines_added INTEGER,
        lines_removed INTEGER,
        diff_summary TEXT,
        rationale TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (commit_hash) REFERENCES manuscript_commits(commit_hash) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_revision_file ON file_revisions(file_path);
      CREATE INDEX IF NOT EXISTS idx_revision_commit ON file_revisions(commit_hash);

      -- Concept evolution over time
      CREATE TABLE IF NOT EXISTS concept_evolution (
        id TEXT PRIMARY KEY,
        concept_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        definition TEXT NOT NULL,
        context TEXT,
        previous_version_id TEXT,
        change_rationale TEXT,
        timestamp INTEGER NOT NULL,
        session_id TEXT,
        commit_hash TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES writing_sessions(id) ON DELETE SET NULL,
        FOREIGN KEY (commit_hash) REFERENCES manuscript_commits(commit_hash) ON DELETE SET NULL,
        FOREIGN KEY (previous_version_id) REFERENCES concept_evolution(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_concept_name ON concept_evolution(concept_name);
      CREATE INDEX IF NOT EXISTS idx_concept_file ON concept_evolution(file_path);
      CREATE INDEX IF NOT EXISTS idx_concept_timeline ON concept_evolution(concept_name, timestamp);
      CREATE INDEX IF NOT EXISTS idx_concept_version ON concept_evolution(concept_name, version_number);

      -- Concept embeddings for semantic search
      CREATE TABLE IF NOT EXISTS concept_embeddings (
        id TEXT PRIMARY KEY,
        concept_id TEXT NOT NULL,
        embedding BLOB NOT NULL,
        model_name TEXT DEFAULT 'all-MiniLM-L6-v2',
        created_at INTEGER NOT NULL,
        FOREIGN KEY (concept_id) REFERENCES concept_evolution(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_concept_embed ON concept_embeddings(concept_id);
    `,
    down: `
      DROP TABLE IF EXISTS concept_embeddings;
      DROP TABLE IF EXISTS concept_evolution;
      DROP TABLE IF EXISTS file_revisions;
      DROP TABLE IF EXISTS manuscript_commits;
    `,
  },
];

export class MigrationManager {
  private db: SQLiteManager;

  constructor(db: SQLiteManager) {
    this.db = db;
  }

  /**
   * Get current schema version
   */
  getCurrentVersion(): number {
    return this.db.getSchemaVersion();
  }

  /**
   * Get all pending migrations
   */
  getPendingMigrations(): Migration[] {
    const currentVersion = this.getCurrentVersion();
    return migrations.filter((m) => m.version > currentVersion);
  }

  /**
   * Apply a single migration
   */
  applyMigration(migration: Migration): void {
    console.log(
      `Applying migration v${migration.version}: ${migration.description}`
    );

    // Calculate checksum
    const checksum = this.calculateChecksum(migration);

    // Execute migration in a transaction
    this.db.transaction(() => {
      // Execute the migration SQL
      if (migration.up && migration.up.trim()) {
        const statements = migration.up
          .split(";")
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && !s.startsWith("--"));

        for (const statement of statements) {
          this.db.exec(statement);
        }
      }

      // Record migration
      this.db
        .prepare(
          "INSERT INTO schema_version (version, applied_at, description, checksum) VALUES (?, ?, ?, ?)"
        )
        .run(migration.version, Date.now(), migration.description, checksum);
    });

    console.log(`Migration v${migration.version} applied successfully`);
  }

  /**
   * Apply all pending migrations
   */
  applyPendingMigrations(): void {
    const pending = this.getPendingMigrations();

    if (pending.length === 0) {
      console.log("No pending migrations");
      return;
    }

    console.log(`Found ${pending.length} pending migrations`);

    for (const migration of pending) {
      this.applyMigration(migration);
    }

    console.log("All migrations applied successfully");
  }

  /**
   * Rollback to a specific version
   */
  rollbackTo(targetVersion: number): void {
    const currentVersion = this.getCurrentVersion();

    if (targetVersion >= currentVersion) {
      console.log("Nothing to rollback");
      return;
    }

    // Get migrations to rollback (in reverse order)
    const toRollback = migrations
      .filter((m) => m.version > targetVersion && m.version <= currentVersion)
      .sort((a, b) => b.version - a.version);

    for (const migration of toRollback) {
      if (!migration.down) {
        throw new Error(
          `Migration v${migration.version} does not support rollback`
        );
      }

      console.log(`Rolling back migration v${migration.version}`);

      const downSql = migration.down;
      if (!downSql) {
        throw new Error(`Migration v${migration.version} has no rollback SQL`);
      }

      this.db.transaction(() => {
        // Execute rollback SQL
        this.db.exec(downSql);

        // Remove migration record
        this.db
          .prepare("DELETE FROM schema_version WHERE version = ?")
          .run(migration.version);
      });

      console.log(`Migration v${migration.version} rolled back`);
    }
  }

  /**
   * Calculate migration checksum for verification
   */
  private calculateChecksum(migration: Migration): string {
    const content = `${migration.version}:${migration.description}:${migration.up}`;
    return createHash("sha256").update(content).digest("hex");
  }

  /**
   * Verify migration integrity
   */
  verifyMigrations(): boolean {
    const applied = this.db
      .prepare(
        "SELECT version, checksum FROM schema_version WHERE version > 0 ORDER BY version"
      )
      .all() as Array<{ version: number; checksum: string | null }>;

    for (const record of applied) {
      const migration = migrations.find((m) => m.version === record.version);

      if (!migration) {
        console.error(`Migration v${record.version} not found in code`);
        return false;
      }

      const expectedChecksum = this.calculateChecksum(migration);
      if (record.checksum && record.checksum !== expectedChecksum) {
        console.error(
          `Migration v${record.version} checksum mismatch - database may be corrupted`
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Get migration history
   */
  getHistory(): Array<{
    version: number;
    description: string;
    applied_at: number;
  }> {
    return this.db
      .prepare(
        "SELECT version, description, applied_at FROM schema_version ORDER BY version"
      )
      .all() as Array<{
      version: number;
      description: string;
      applied_at: number;
    }>;
  }
}
