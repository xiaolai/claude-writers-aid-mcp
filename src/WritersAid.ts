/**
 * WritersAid - Main orchestrator for Writer's Aid MCP
 * Coordinates all writing-focused components
 */

import { WritingStorage } from "./storage/WritingStorage.js";
import { SQLiteManager, type SQLiteConfig } from "./storage/SQLiteManager.js";
import { MarkdownParser } from "./parsers/MarkdownParser.js";
import { MarkdownChunker } from "./parsers/MarkdownChunker.js";
import { LinkAnalyzer } from "./parsers/LinkAnalyzer.js";
import { ManuscriptSearch } from "./search/ManuscriptSearch.js";
import { ThemeExtractor } from "./search/ThemeExtractor.js";
import { TerminologyChecker } from "./analysis/TerminologyChecker.js";
import { StructureValidator } from "./analysis/StructureValidator.js";
import { ReadabilityAnalyzer } from "./analysis/ReadabilityAnalyzer.js";
import { DuplicateFinder } from "./analysis/DuplicateFinder.js";
import { GapFinder } from "./analysis/GapFinder.js";
import { TodoExtractor } from "./quality/TodoExtractor.js";
import { LinkHealthChecker } from "./quality/LinkHealthChecker.js";
import { ConsistencyChecker } from "./quality/ConsistencyChecker.js";
import { SessionManager } from "./memory/SessionManager.js";
import { DecisionExtractor } from "./memory/DecisionExtractor.js";
import { SessionIndexer } from "./memory/SessionIndexer.js";
import fs from "fs";
import path from "path";

export interface WritersAidConfig {
  projectPath: string;
  dbPath?: string;
  enableCache?: boolean;
}

export class WritersAid {
  private storage: WritingStorage;
  private parser: MarkdownParser;
  private chunker: MarkdownChunker;
  private linkAnalyzer: LinkAnalyzer;
  private search: ManuscriptSearch;
  private themeExtractor: ThemeExtractor;
  private terminologyChecker: TerminologyChecker;
  private structureValidator: StructureValidator;
  private readabilityAnalyzer: ReadabilityAnalyzer;
  private duplicateFinder: DuplicateFinder;
  private gapFinder: GapFinder;
  private todoExtractor: TodoExtractor;
  private linkHealthChecker: LinkHealthChecker;
  private consistencyChecker: ConsistencyChecker;
  private sessionManager: SessionManager;
  private decisionExtractor: DecisionExtractor;
  private sessionIndexer: SessionIndexer;

  constructor(private config: WritersAidConfig) {
    // Determine database path
    const dbPath =
      config.dbPath ||
      path.join(config.projectPath, ".writers-aid", "manuscript.db");

    // Ensure .writers-aid directory exists
    const writersAidDir = path.dirname(dbPath);
    if (!fs.existsSync(writersAidDir)) {
      fs.mkdirSync(writersAidDir, { recursive: true });
    }

    // Initialize storage with SQLiteManager
    const sqliteConfig: SQLiteConfig = { dbPath };
    const sqliteManager = new SQLiteManager(sqliteConfig);
    this.storage = new WritingStorage(sqliteManager);

    // Initialize parsers
    this.parser = new MarkdownParser();
    this.chunker = new MarkdownChunker();
    this.linkAnalyzer = new LinkAnalyzer();

    // Initialize search
    this.search = new ManuscriptSearch(this.storage);
    this.themeExtractor = new ThemeExtractor(this.storage);

    // Initialize analysis tools
    this.terminologyChecker = new TerminologyChecker(this.storage);
    this.structureValidator = new StructureValidator(this.storage);
    this.readabilityAnalyzer = new ReadabilityAnalyzer(this.storage);
    this.duplicateFinder = new DuplicateFinder(this.storage);
    this.gapFinder = new GapFinder(this.storage);

    // Initialize quality tools
    this.todoExtractor = new TodoExtractor(this.storage);
    this.linkHealthChecker = new LinkHealthChecker(this.storage);
    this.consistencyChecker = new ConsistencyChecker(this.storage);

    // Initialize holistic memory components
    this.sessionManager = new SessionManager(sqliteManager);
    this.decisionExtractor = new DecisionExtractor(sqliteManager);
    this.sessionIndexer = new SessionIndexer(sqliteManager);
  }

  /**
   * Index all markdown files in the project
   */
  async indexManuscript(options: { scope?: string } = {}): Promise<{
    filesIndexed: number;
    chunksCreated: number;
  }> {
    const { scope = "**/*.md" } = options;

    // Find all markdown files
    const files = this.findMarkdownFiles(this.config.projectPath, scope);

    let filesIndexed = 0;
    let chunksCreated = 0;

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, "utf-8");
      const relativePath = path.relative(this.config.projectPath, filePath);

      // Parse markdown
      const parsed = this.parser.parse(relativePath, content);

      // Add file to storage
      await this.storage.addFile({
        filePath: relativePath,
        content,
        title: parsed.headings[0]?.text || path.basename(filePath, ".md"),
      });

      // Create chunks
      const chunks = this.chunker.chunk(relativePath, content, parsed.headings);

      for (const chunk of chunks) {
        await this.storage.addChunk(relativePath, {
          heading: chunk.heading || "",
          content: chunk.content,
          chunkIndex: chunk.chunk_index,
          tokenCount: chunk.token_count,
        });
        chunksCreated++;
      }

      // Analyze links
      const links = this.linkAnalyzer.extractLinks(relativePath, relativePath, content);

      for (const link of links) {
        await this.storage.addLink({
          sourceFile: relativePath,
          targetFile: link.target_file_path || "",
          linkText: link.link_text || "",
          linkType: link.link_type,
        });
      }

      filesIndexed++;
    }

    return { filesIndexed, chunksCreated };
  }

  /**
   * Search manuscript content
   */
  async searchContent(query: string, options?: { scope?: string; limit?: number }) {
    return this.search.search(query, options);
  }

  /**
   * Extract main themes from manuscript
   */
  async extractThemes(options?: { scope?: string; numThemes?: number }) {
    return this.themeExtractor.extractThemes(options);
  }

  /**
   * Check terminology consistency
   */
  async checkTerminology(options?: {
    scope?: string;
    autoDetect?: boolean;
    terms?: string[];
    limit?: number;
    examplesPerVariant?: number;
  }) {
    return this.terminologyChecker.checkTerminology(options || {});
  }

  /**
   * Validate document structure
   */
  async validateStructure(options?: { filePath?: string; checks?: string[] }) {
    return this.structureValidator.validateStructure(options || {});
  }

  /**
   * Analyze readability
   */
  async analyzeReadability(filePath?: string) {
    return this.readabilityAnalyzer.analyzeReadability(filePath);
  }

  /**
   * Find duplicate content
   */
  async findDuplicates(options?: {
    scope?: string;
    similarityThreshold?: number;
    minLength?: number;
    limit?: number;
  }) {
    return this.duplicateFinder.findDuplicates(options || {});
  }

  /**
   * Find content gaps (undefined terms)
   */
  async findGaps(options?: { scope?: string; limit?: number }) {
    return this.gapFinder.findGaps(options || {});
  }

  /**
   * Extract TODOs
   */
  async findTodos(options?: {
    scope?: string;
    markers?: string[];
    groupBy?: "file" | "priority" | "marker";
    limit?: number;
  }) {
    return this.todoExtractor.findTodos(options || {});
  }

  /**
   * Check link health
   */
  async checkLinks(options?: { checkExternal?: boolean; scope?: string; limit?: number }) {
    return this.linkHealthChecker.checkLinks(options || {});
  }

  /**
   * Check cross-document consistency
   */
  async checkConsistency(options?: { scope?: string }) {
    return this.consistencyChecker.checkConsistency(options || {});
  }

  /**
   * Get writing statistics
   */
  async getStats(_options?: { scope?: string }) {
    const files = await this.storage.getAllFiles();
    const totalWords = files.reduce((sum, f) => sum + (f.word_count || 0), 0);
    const totalFiles = files.length;

    return {
      totalWords,
      totalFiles,
      averageWordsPerFile: totalFiles > 0 ? Math.round(totalWords / totalFiles) : 0,
      files: files.map((f) => ({
        path: f.file_path,
        words: f.word_count || 0,
        lastModified: f.last_modified,
      })),
    };
  }

  /**
   * Find markdown files matching glob pattern
   */
  private findMarkdownFiles(dir: string, _pattern: string): string[] {
    const files: string[] = [];

    const walk = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        // Skip hidden directories and node_modules
        if (entry.name.startsWith(".") || entry.name === "node_modules") {
          continue;
        }

        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
          files.push(fullPath);
        }
      }
    };

    walk(dir);
    return files;
  }

  // ============================================================================
  // Holistic Memory Tools
  // ============================================================================

  /**
   * Recall writing sessions by date range or file
   */
  async recallWritingSessions(options: {
    startDate?: Date;
    endDate?: Date;
    filePath?: string;
    limit?: number;
  }) {
    const query = {
      projectPath: this.config.projectPath,
      startDate: options.startDate,
      endDate: options.endDate,
      fileInvolved: options.filePath,
      limit: options.limit || 10,
    };

    const sessions = this.sessionManager.findSessions(query);

    return {
      sessions: sessions.map((session) => ({
        id: session.id,
        startedAt: new Date(session.startedAt).toISOString(),
        endedAt: session.endedAt
          ? new Date(session.endedAt).toISOString()
          : null,
        filesTouched: session.filesTouched || [],
        summary: session.summary || "Writing session",
        conversationFile: session.conversationFile,
      })),
      total: sessions.length,
    };
  }

  /**
   * Get session context for a file
   */
  async getSessionContext(options: { filePath?: string; limit?: number }) {
    if (!options.filePath) {
      return {
        sessions: [],
        decisions: [],
        message: "No file path provided",
      };
    }

    const sessions = this.sessionManager.getSessionsForFile(
      options.filePath,
      options.limit || 5
    );

    const decisions = this.decisionExtractor.getDecisionsByFile(
      options.filePath,
      options.limit || 5
    );

    return {
      file: options.filePath,
      sessions: sessions.map((session) => ({
        id: session.id,
        startedAt: new Date(session.startedAt).toISOString(),
        summary: session.summary || "Writing session",
      })),
      decisions: decisions.map((decision) => ({
        decisionText: decision.decisionText,
        rationale: decision.rationale,
        decisionType: decision.decisionType,
        timestamp: new Date(decision.timestamp).toISOString(),
      })),
    };
  }

  /**
   * List writing decisions by file or type
   */
  async listWritingDecisions(options: {
    filePath?: string;
    decisionType?: "structure" | "content" | "terminology" | "style";
    limit?: number;
  }) {
    let decisions;

    if (options.filePath) {
      decisions = this.decisionExtractor.getDecisionsByFile(
        options.filePath,
        options.limit || 20
      );
    } else if (options.decisionType) {
      decisions = this.decisionExtractor.getDecisionsByType(
        options.decisionType,
        options.limit || 20
      );
    } else {
      // Get all recent decisions
      decisions = this.decisionExtractor.getDecisionsByType(
        "structure",
        options.limit || 20
      );
    }

    return {
      decisions: decisions.map((decision) => ({
        id: decision.id,
        decisionText: decision.decisionText,
        rationale: decision.rationale,
        decisionType: decision.decisionType,
        filePath: decision.filePath,
        section: decision.section,
        timestamp: new Date(decision.timestamp).toISOString(),
        alternativesConsidered: decision.alternativesConsidered,
      })),
      total: decisions.length,
    };
  }

  /**
   * Index writing sessions from conversation history
   */
  async indexWritingSessions(options?: {
    conversationsDir?: string;
  }): Promise<{
    sessionsIndexed: number;
    decisionsExtracted: number;
    filesProcessed: number;
  }> {
    const result = await this.sessionIndexer.indexProject({
      projectPath: this.config.projectPath,
      conversationsDir: options?.conversationsDir,
    });

    return {
      sessionsIndexed: result.sessionsIndexed,
      decisionsExtracted: result.decisionsExtracted,
      filesProcessed: result.filesProcessed,
    };
  }

  /**
   * Close storage connection
   */
  close() {
    this.storage.close();
  }
}
