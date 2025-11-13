/**
 * HolisticSearcher - Unified search across all memory layers
 *
 * Enables writers to search across:
 * - Content (WHAT was written)
 * - Decisions (WHY choices were made)
 * - Mistakes (errors to avoid)
 * - Concepts (definition evolution)
 * - Sessions (WHEN work happened)
 * - Commits (version control context)
 */

import type { SQLiteManager } from "../storage/SQLiteManager.js";
import type { ManuscriptSearch } from "../search/ManuscriptSearch.js";
import type { SessionManager } from "./SessionManager.js";
import type { DecisionExtractor } from "./DecisionExtractor.js";
import type { MistakeTracker } from "./MistakeTracker.js";
import type { ConceptTracker } from "./ConceptTracker.js";
import type { GitIntegrator } from "./GitIntegrator.js";

export interface HolisticSearchQuery {
  query: string;
  layers?: SearchLayer[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  limit?: number;
  minRelevance?: number;
}

export type SearchLayer =
  | "content"
  | "decisions"
  | "mistakes"
  | "concepts"
  | "sessions"
  | "commits";

export interface HolisticSearchResult {
  query: string;
  results: SearchResult[];
  totalResults: number;
  layerStats: Record<SearchLayer, number>;
  searchedLayers: SearchLayer[];
  executionTime: number;
}

export interface SearchResult {
  layer: SearchLayer;
  type: string;
  title: string;
  content: string;
  relevance: number;
  timestamp?: number;
  filePath?: string;
  metadata?: Record<string, unknown>;
  context?: {
    session?: string;
    commit?: string;
    rationale?: string;
    correction?: string;
  };
}

export class HolisticSearcher {
  private db: SQLiteManager;
  private manuscriptSearch: ManuscriptSearch;
  private sessionManager: SessionManager;
  private conceptTracker: ConceptTracker;

  constructor(
    db: SQLiteManager,
    manuscriptSearch: ManuscriptSearch,
    sessionManager: SessionManager,
    _decisionExtractor: DecisionExtractor,
    _mistakeTracker: MistakeTracker,
    conceptTracker: ConceptTracker,
    _gitIntegrator: GitIntegrator
  ) {
    this.db = db;
    this.manuscriptSearch = manuscriptSearch;
    this.sessionManager = sessionManager;
    this.conceptTracker = conceptTracker;
  }

  /**
   * Unified search across all memory layers
   */
  async search(query: HolisticSearchQuery): Promise<HolisticSearchResult> {
    const startTime = Date.now();
    const layers = query.layers || [
      "content",
      "decisions",
      "mistakes",
      "concepts",
      "sessions",
      "commits",
    ];
    const limit = query.limit || 20;

    const allResults: SearchResult[] = [];
    const layerStats: Record<SearchLayer, number> = {
      content: 0,
      decisions: 0,
      mistakes: 0,
      concepts: 0,
      sessions: 0,
      commits: 0,
    };

    // Search each layer in parallel
    const promises = [];

    if (layers.includes("content")) {
      promises.push(this.searchContent(query));
    }

    if (layers.includes("decisions")) {
      promises.push(this.searchDecisions(query));
    }

    if (layers.includes("mistakes")) {
      promises.push(this.searchMistakes(query));
    }

    if (layers.includes("concepts")) {
      promises.push(this.searchConcepts(query));
    }

    if (layers.includes("sessions")) {
      promises.push(this.searchSessions(query));
    }

    if (layers.includes("commits")) {
      promises.push(this.searchCommits(query));
    }

    const results = await Promise.all(promises);

    // Merge and sort results by relevance
    for (const layerResults of results) {
      for (const result of layerResults) {
        allResults.push(result);
        layerStats[result.layer]++;
      }
    }

    // Sort by relevance (highest first)
    allResults.sort((a, b) => b.relevance - a.relevance);

    // Apply minimum relevance filter
    const minRelevance = query.minRelevance || 0;
    const filtered = allResults.filter((r) => r.relevance >= minRelevance);

    // Apply limit
    const limited = filtered.slice(0, limit);

    const executionTime = Date.now() - startTime;

    return {
      query: query.query,
      results: limited,
      totalResults: filtered.length,
      layerStats,
      searchedLayers: layers,
      executionTime,
    };
  }

  /**
   * Search content layer (manuscript search)
   */
  private async searchContent(
    query: HolisticSearchQuery
  ): Promise<SearchResult[]> {
    const results = await this.manuscriptSearch.search(query.query, {
      limit: query.limit || 10,
    });

    return results.map((r) => ({
      layer: "content" as const,
      type: "content",
      title: r.file,
      content: r.content,
      relevance: r.relevance,
      filePath: r.file,
    }));
  }

  /**
   * Search decisions layer
   */
  private async searchDecisions(
    query: HolisticSearchQuery
  ): Promise<SearchResult[]> {
    // Query decisions directly from database with LIKE search
    let sql = `SELECT id, session_id, file_path, section, decision_text, rationale, timestamp, decision_type
               FROM writing_decisions
               WHERE decision_text LIKE ? OR rationale LIKE ?`;

    const params: unknown[] = [`%${query.query}%`, `%${query.query}%`];

    if (query.dateRange?.start) {
      sql += ` AND timestamp >= ?`;
      params.push(query.dateRange.start.getTime());
    }

    if (query.dateRange?.end) {
      sql += ` AND timestamp <= ?`;
      params.push(query.dateRange.end.getTime());
    }

    sql += ` ORDER BY timestamp DESC LIMIT ?`;
    params.push(query.limit || 10);

    const rows = this.db.prepare(sql).all(...params) as Array<{
      id: string;
      session_id: string | null;
      file_path: string | null;
      section: string | null;
      decision_text: string;
      rationale: string | null;
      timestamp: number;
      decision_type: string | null;
    }>;

    return rows.map((row) => ({
      layer: "decisions" as const,
      type: row.decision_type || "decision",
      title: row.section || "Decision",
      content: row.decision_text,
      relevance: 0.8, // LIKE search doesn't provide relevance scores
      timestamp: row.timestamp,
      filePath: row.file_path || undefined,
      context: {
        session: row.session_id || undefined,
        rationale: row.rationale || undefined,
      },
    }));
  }

  /**
   * Search mistakes layer
   */
  private async searchMistakes(
    query: HolisticSearchQuery
  ): Promise<SearchResult[]> {
    // Query mistakes directly from database with LIKE search
    let sql = `SELECT id, file_path, line_range, mistake_type, description, correction, how_fixed, timestamp
               FROM writing_mistakes
               WHERE description LIKE ? OR correction LIKE ?`;

    const params: unknown[] = [`%${query.query}%`, `%${query.query}%`];

    if (query.dateRange?.start) {
      sql += ` AND timestamp >= ?`;
      params.push(query.dateRange.start.getTime());
    }

    if (query.dateRange?.end) {
      sql += ` AND timestamp <= ?`;
      params.push(query.dateRange.end.getTime());
    }

    sql += ` ORDER BY timestamp DESC LIMIT ?`;
    params.push(query.limit || 10);

    const rows = this.db.prepare(sql).all(...params) as Array<{
      id: string;
      file_path: string;
      line_range: string | null;
      mistake_type: string;
      description: string;
      correction: string | null;
      how_fixed: string | null;
      timestamp: number;
    }>;

    return rows.map((row) => ({
      layer: "mistakes" as const,
      type: row.mistake_type,
      title: `Mistake in ${row.file_path}`,
      content: row.description,
      relevance: 0.75,
      timestamp: row.timestamp,
      filePath: row.file_path,
      context: {
        correction: row.correction || undefined,
      },
      metadata: {
        howFixed: row.how_fixed,
        lineRange: row.line_range,
      },
    }));
  }

  /**
   * Search concepts layer
   */
  private async searchConcepts(
    query: HolisticSearchQuery
  ): Promise<SearchResult[]> {
    const concepts = this.conceptTracker.searchConcepts({
      conceptName: query.query,
      startDate: query.dateRange?.start,
      endDate: query.dateRange?.end,
      limit: query.limit || 10,
    });

    return concepts.map((c) => ({
      layer: "concepts" as const,
      type: "concept",
      title: c.conceptName,
      content: c.definition,
      relevance: 0.7,
      timestamp: c.timestamp,
      filePath: c.filePath,
      context: {
        rationale: c.changeRationale,
        commit: c.commitHash,
        session: c.sessionId,
      },
      metadata: {
        versionNumber: c.versionNumber,
        context: c.context,
      },
    }));
  }

  /**
   * Search sessions layer
   */
  private async searchSessions(
    query: HolisticSearchQuery
  ): Promise<SearchResult[]> {
    // Full-text search in writing_memory_fts
    let sql = `SELECT memory_id, text, metadata
               FROM writing_memory_fts
               WHERE memory_type = 'session' AND text MATCH ?
               LIMIT ?`;

    const params: unknown[] = [query.query, query.limit || 10];

    const rows = this.db.prepare(sql).all(...params) as Array<{
      memory_id: string;
      text: string;
      metadata: string;
    }>;

    // Get session details
    const results: SearchResult[] = [];
    for (const row of rows) {
      const session = this.sessionManager.getSession(row.memory_id);
      if (session) {
        // Filter by date range if provided
        if (
          query.dateRange?.start &&
          session.startedAt < query.dateRange.start.getTime()
        ) {
          continue;
        }
        if (
          query.dateRange?.end &&
          session.endedAt &&
          session.endedAt > query.dateRange.end.getTime()
        ) {
          continue;
        }

        results.push({
          layer: "sessions" as const,
          type: "session",
          title: `Session ${new Date(session.startedAt).toLocaleDateString()}`,
          content: session.summary || "Writing session",
          relevance: 0.65,
          timestamp: session.startedAt,
          metadata: {
            filesTouched: session.filesTouched,
            conversationFile: session.conversationFile,
          },
        });
      }
    }

    return results;
  }

  /**
   * Search commits layer
   */
  private async searchCommits(
    query: HolisticSearchQuery
  ): Promise<SearchResult[]> {
    // Search by commit message
    let sql = `SELECT commit_hash, timestamp, author, message, files_changed, session_id
               FROM manuscript_commits
               WHERE message LIKE ?`;

    const params: unknown[] = [`%${query.query}%`];

    if (query.dateRange?.start) {
      sql += ` AND timestamp >= ?`;
      params.push(Math.floor(query.dateRange.start.getTime() / 1000));
    }

    if (query.dateRange?.end) {
      sql += ` AND timestamp <= ?`;
      params.push(Math.floor(query.dateRange.end.getTime() / 1000));
    }

    sql += ` ORDER BY timestamp DESC LIMIT ?`;
    params.push(query.limit || 10);

    const rows = this.db.prepare(sql).all(...params) as Array<{
      commit_hash: string;
      timestamp: number;
      author: string | null;
      message: string;
      files_changed: string;
      session_id: string | null;
    }>;

    return rows.map((r) => ({
      layer: "commits" as const,
      type: "commit",
      title: r.message.split("\n")[0], // First line of commit message
      content: r.message,
      relevance: 0.6,
      timestamp: r.timestamp * 1000,
      context: {
        session: r.session_id || undefined,
        commit: r.commit_hash,
      },
      metadata: {
        author: r.author,
        filesChanged: JSON.parse(r.files_changed),
      },
    }));
  }

  /**
   * Get related context for a file
   */
  async getFileContext(filePath: string): Promise<{
    recentSessions: SearchResult[];
    recentDecisions: SearchResult[];
    recentMistakes: SearchResult[];
    commits: SearchResult[];
  }> {
    const results = await this.search({
      query: filePath,
      layers: ["sessions", "decisions", "mistakes", "commits"],
      limit: 5,
    });

    const byLayer = {
      recentSessions: results.results.filter((r) => r.layer === "sessions"),
      recentDecisions: results.results.filter((r) => r.layer === "decisions"),
      recentMistakes: results.results.filter((r) => r.layer === "mistakes"),
      commits: results.results.filter((r) => r.layer === "commits"),
    };

    return byLayer;
  }

  /**
   * Get stats about indexed memory
   */
  getStats(): {
    totalSessions: number;
    totalDecisions: number;
    totalMistakes: number;
    totalConcepts: number;
    totalCommits: number;
  } {
    const sessionStats = this.sessionManager.getSessionStats();
    const conceptStats = this.conceptTracker.getConceptStats();
    const decisionCount = (
      this.db
        .prepare(`SELECT COUNT(*) as count FROM writing_decisions`)
        .get() as { count: number }
    ).count;
    const mistakeCount = (
      this.db
        .prepare(`SELECT COUNT(*) as count FROM writing_mistakes`)
        .get() as { count: number }
    ).count;
    const commitCount = (
      this.db
        .prepare(`SELECT COUNT(*) as count FROM manuscript_commits`)
        .get() as { count: number }
    ).count;

    return {
      totalSessions: sessionStats.totalSessions,
      totalDecisions: decisionCount,
      totalMistakes: mistakeCount,
      totalConcepts: conceptStats.totalConcepts,
      totalCommits: commitCount,
    };
  }
}
