/**
 * GitIntegrator - Integrate git history with writing sessions
 *
 * Enables writers to:
 * - Link commits to writing sessions
 * - Track file revision history
 * - Understand WHEN and WHY content changed
 * - Connect version control to decision memory
 */

import { nanoid } from "nanoid";
import { exec } from "child_process";
import { promisify } from "util";
import type { SQLiteManager } from "../storage/SQLiteManager.js";

const execAsync = promisify(exec);

export interface ManuscriptCommit {
  commitHash: string;
  timestamp: number;
  author?: string;
  message: string;
  filesChanged: string[];
  sessionId?: string;
  createdAt: number;
}

export interface FileRevision {
  id: string;
  filePath: string;
  commitHash: string;
  linesAdded?: number;
  linesRemoved?: number;
  diffSummary?: string;
  rationale?: string;
  createdAt: number;
}

export interface CommitQuery {
  filePath?: string;
  sessionId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export class GitIntegrator {
  private db: SQLiteManager;
  private projectPath: string;

  constructor(db: SQLiteManager, projectPath: string) {
    this.db = db;
    this.projectPath = projectPath;
  }

  /**
   * Check if project is a git repository
   */
  async isGitRepository(): Promise<boolean> {
    try {
      await execAsync("git rev-parse --git-dir", { cwd: this.projectPath });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Index git commits for manuscript files
   */
  async indexCommits(options?: {
    since?: Date;
    filePattern?: string;
  }): Promise<{ commitsIndexed: number; revisionsCreated: number }> {
    const isGit = await this.isGitRepository();
    if (!isGit) {
      throw new Error("Project is not a git repository");
    }

    let gitLogCmd = `git log --all --pretty=format:"%H|%at|%an|%s" --numstat`;

    if (options?.since) {
      const sinceTimestamp = Math.floor(options.since.getTime() / 1000);
      gitLogCmd += ` --since=${sinceTimestamp}`;
    }

    if (options?.filePattern) {
      gitLogCmd += ` -- ${options.filePattern}`;
    }

    const { stdout } = await execAsync(gitLogCmd, { cwd: this.projectPath });

    const commits = this.parseGitLog(stdout);
    let commitsIndexed = 0;
    let revisionsCreated = 0;

    for (const commit of commits) {
      const existing = this.getCommit(commit.commitHash);
      if (existing) {
        continue; // Skip already indexed commits
      }

      this.storeCommit(commit);
      commitsIndexed++;

      // Create revisions for each file change
      for (const filePath of commit.filesChanged) {
        if (filePath.endsWith(".md")) {
          // Only track markdown files
          this.createRevision({
            filePath,
            commitHash: commit.commitHash,
          });
          revisionsCreated++;
        }
      }
    }

    return { commitsIndexed, revisionsCreated };
  }

  /**
   * Link a commit to a writing session
   */
  linkCommitToSession(commitHash: string, sessionId: string): void {
    this.db
      .prepare(
        `UPDATE manuscript_commits
         SET session_id = ?
         WHERE commit_hash = ?`
      )
      .run(sessionId, commitHash);
  }

  /**
   * Get commits for a file
   */
  getCommitsForFile(filePath: string, limit = 10): ManuscriptCommit[] {
    return this.findCommits({ filePath, limit });
  }

  /**
   * Get commit by hash
   */
  getCommit(commitHash: string): ManuscriptCommit | undefined {
    const row = this.db
      .prepare(
        `SELECT commit_hash, timestamp, author, message, files_changed, session_id, created_at
         FROM manuscript_commits
         WHERE commit_hash = ?`
      )
      .get(commitHash) as CommitRow | undefined;

    return row ? this.rowToCommit(row) : undefined;
  }

  /**
   * Find commits matching query criteria
   */
  findCommits(query: CommitQuery): ManuscriptCommit[] {
    let sql = `SELECT commit_hash, timestamp, author, message, files_changed, session_id, created_at
               FROM manuscript_commits
               WHERE 1=1`;
    const params: unknown[] = [];

    if (query.filePath) {
      sql += ` AND files_changed LIKE ?`;
      params.push(`%"${query.filePath}"%`);
    }

    if (query.sessionId) {
      sql += ` AND session_id = ?`;
      params.push(query.sessionId);
    }

    if (query.startDate) {
      sql += ` AND timestamp >= ?`;
      params.push(Math.floor(query.startDate.getTime() / 1000));
    }

    if (query.endDate) {
      sql += ` AND timestamp <= ?`;
      params.push(Math.floor(query.endDate.getTime() / 1000));
    }

    sql += ` ORDER BY timestamp DESC`;

    if (query.limit) {
      sql += ` LIMIT ?`;
      params.push(query.limit);
    }

    const rows = this.db.prepare(sql).all(...params) as CommitRow[];
    return rows.map((row) => this.rowToCommit(row));
  }

  /**
   * Get file revision history
   */
  getFileHistory(filePath: string, limit = 10): FileRevision[] {
    const rows = this.db
      .prepare(
        `SELECT id, file_path, commit_hash, lines_added, lines_removed, diff_summary, rationale, created_at
         FROM file_revisions
         WHERE file_path = ?
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .all(filePath, limit) as RevisionRow[];

    return rows.map((row) => this.rowToRevision(row));
  }

  /**
   * Get file evolution with commit details
   */
  async getFileEvolution(
    filePath: string
  ): Promise<
    Array<{
      revision: FileRevision;
      commit: ManuscriptCommit;
    }>
  > {
    const revisions = this.getFileHistory(filePath, 20);
    const evolution = [];

    for (const revision of revisions) {
      const commit = this.getCommit(revision.commitHash);
      if (commit) {
        evolution.push({ revision, commit });
      }
    }

    return evolution;
  }

  /**
   * Get diff for a specific commit and file
   */
  async getFileDiff(
    commitHash: string,
    filePath: string
  ): Promise<string | undefined> {
    try {
      const { stdout } = await execAsync(
        `git show ${commitHash}:${filePath}`,
        { cwd: this.projectPath }
      );
      return stdout;
    } catch {
      return undefined;
    }
  }

  /**
   * Store a commit in the database
   */
  private storeCommit(commit: ManuscriptCommit): void {
    this.db
      .prepare(
        `INSERT INTO manuscript_commits
         (commit_hash, timestamp, author, message, files_changed, session_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        commit.commitHash,
        commit.timestamp,
        commit.author || null,
        commit.message,
        JSON.stringify(commit.filesChanged),
        commit.sessionId || null,
        commit.createdAt
      );
  }

  /**
   * Create a file revision record
   */
  private createRevision(options: {
    filePath: string;
    commitHash: string;
    linesAdded?: number;
    linesRemoved?: number;
    diffSummary?: string;
    rationale?: string;
  }): FileRevision {
    const revision: FileRevision = {
      id: nanoid(),
      filePath: options.filePath,
      commitHash: options.commitHash,
      linesAdded: options.linesAdded,
      linesRemoved: options.linesRemoved,
      diffSummary: options.diffSummary,
      rationale: options.rationale,
      createdAt: Date.now(),
    };

    this.db
      .prepare(
        `INSERT INTO file_revisions
         (id, file_path, commit_hash, lines_added, lines_removed, diff_summary, rationale, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        revision.id,
        revision.filePath,
        revision.commitHash,
        revision.linesAdded || null,
        revision.linesRemoved || null,
        revision.diffSummary || null,
        revision.rationale || null,
        revision.createdAt
      );

    return revision;
  }

  /**
   * Parse git log output
   */
  private parseGitLog(output: string): ManuscriptCommit[] {
    const commits: ManuscriptCommit[] = [];
    const lines = output.split("\n").filter((l) => l.trim());

    let currentCommit: Partial<ManuscriptCommit> | null = null;
    const filesChanged: Set<string> = new Set();

    for (const line of lines) {
      if (line.includes("|")) {
        // Commit line: hash|timestamp|author|message
        if (currentCommit && currentCommit.commitHash) {
          commits.push({
            ...currentCommit,
            filesChanged: Array.from(filesChanged),
            createdAt: Date.now(),
          } as ManuscriptCommit);
          filesChanged.clear();
        }

        const [hash, timestamp, author, message] = line.split("|");
        currentCommit = {
          commitHash: hash,
          timestamp: parseInt(timestamp),
          author,
          message,
        };
      } else {
        // File change line: added removed filename
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          const filename = parts[2];
          filesChanged.add(filename);
        }
      }
    }

    // Add last commit
    if (currentCommit && currentCommit.commitHash) {
      commits.push({
        ...currentCommit,
        filesChanged: Array.from(filesChanged),
        createdAt: Date.now(),
      } as ManuscriptCommit);
    }

    return commits;
  }

  /**
   * Convert database row to ManuscriptCommit
   */
  private rowToCommit(row: CommitRow): ManuscriptCommit {
    return {
      commitHash: row.commit_hash,
      timestamp: row.timestamp,
      author: row.author || undefined,
      message: row.message,
      filesChanged: JSON.parse(row.files_changed),
      sessionId: row.session_id || undefined,
      createdAt: row.created_at,
    };
  }

  /**
   * Convert database row to FileRevision
   */
  private rowToRevision(row: RevisionRow): FileRevision {
    return {
      id: row.id,
      filePath: row.file_path,
      commitHash: row.commit_hash,
      linesAdded: row.lines_added || undefined,
      linesRemoved: row.lines_removed || undefined,
      diffSummary: row.diff_summary || undefined,
      rationale: row.rationale || undefined,
      createdAt: row.created_at,
    };
  }
}

// Database row types
interface CommitRow {
  commit_hash: string;
  timestamp: number;
  author: string | null;
  message: string;
  files_changed: string;
  session_id: string | null;
  created_at: number;
}

interface RevisionRow {
  id: string;
  file_path: string;
  commit_hash: string;
  lines_added: number | null;
  lines_removed: number | null;
  diff_summary: string | null;
  rationale: string | null;
  created_at: number;
}
