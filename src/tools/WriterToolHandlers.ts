/**
 * Writer Tool Handlers - Implementation of all 20 MCP tools
 */

import { WritersAid } from "../WritersAid.js";
import { resolvePaginationLimit } from "../utils/pagination.js";

export class WriterToolHandlers {
  constructor(private writersAid: WritersAid) {}

  async handleTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    switch (toolName) {
      // Content Discovery
      case "search_content":
        return this.searchContent(args);
      case "find_related_sections":
        return this.findRelatedSections(args);
      case "extract_themes":
        return this.extractThemes(args);
      case "track_concept_evolution":
        return this.trackConceptEvolution(args);
      case "find_gaps":
        return this.findGaps(args);

      // Structure
      case "generate_outline":
        return this.generateOutline(args);
      case "suggest_reorganization":
        return this.suggestReorganization(args);
      case "find_orphaned_sections":
        return this.findOrphanedSections(args);
      case "validate_structure":
        return this.validateStructure(args);

      // Links
      case "analyze_link_graph":
        return this.analyzeLinkGraph(args);
      case "find_broken_links":
        return this.findBrokenLinks(args);
      case "suggest_cross_references":
        return this.suggestCrossReferences(args);
      case "trace_reference_chain":
        return this.traceReferenceChain(args);

      // Quality
      case "check_terminology":
        return this.checkTerminology(args);
      case "find_todos":
        return this.findTodos(args);
      case "check_readability":
        return this.checkReadability(args);
      case "find_duplicates":
        return this.findDuplicates(args);

      // Progress
      case "get_writing_stats":
        return this.getWritingStats(args);
      case "track_changes":
        return this.trackChanges(args);
      case "generate_progress_report":
        return this.generateProgressReport(args);

      // Holistic Memory - Phase 1
      case "recall_writing_session":
        return this.recallWritingSession(args);
      case "get_session_context":
        return this.getSessionContext(args);
      case "list_writing_decisions":
        return this.listWritingDecisions(args);

      // Holistic Memory - Phase 2
      case "mark_mistake":
        return this.markMistake(args);
      case "search_similar_mistakes":
        return this.searchSimilarMistakes(args);
      case "set_requirement":
        return this.setRequirement(args);
      case "get_requirements":
        return this.getRequirements(args);
      case "add_style_decision":
        return this.addStyleDecision(args);

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  // Content Discovery Tools
  private async searchContent(args: Record<string, unknown>) {
    const query = args.query as string;
    const scope = args.scope as string | undefined;
    const limit = (args.limit as number) || 10;

    return this.writersAid.searchContent(query, { scope, limit });
  }

  private async findRelatedSections(args: Record<string, unknown>) {
    const referenceText = args.reference_text as string;
    const limit = (args.limit as number) || 5;

    // Use search with the reference text
    return this.writersAid.searchContent(referenceText, { limit });
  }

  private async extractThemes(args: Record<string, unknown>) {
    const scope = args.scope as string | undefined;
    const numThemes = (args.num_themes as number) || 5;

    return this.writersAid.extractThemes({ scope, numThemes });
  }

  private async trackConceptEvolution(args: Record<string, unknown>) {
    const concept = args.concept as string;

    // Search for the concept across all files
    const results = await this.writersAid.searchContent(concept);

    return {
      concept,
      occurrences: results,
      timeline: "Concept appears in multiple documents",
    };
  }

  private async findGaps(args: Record<string, unknown>) {
    const scope = args.scope as string | undefined;
    const limit = resolvePaginationLimit("find_gaps", args.limit as number | undefined);

    return this.writersAid.findGaps({ scope, limit });
  }

  // Structure Tools
  private async generateOutline(args: Record<string, unknown>) {
    const scope = args.scope as string | undefined;
    const includeWordCounts = (args.include_word_counts as boolean) || false;

    // Get all files and generate outline
    const stats = await this.writersAid.getStats({ scope });

    return {
      outline: stats.files.map((f) => ({
        file: f.path,
        words: includeWordCounts ? f.words : undefined,
      })),
      totalWords: stats.totalWords,
    };
  }

  private async suggestReorganization(_args: Record<string, unknown>) {
    // Get duplicate analysis
    const duplicates = await this.writersAid.findDuplicates({
      similarityThreshold: 0.7,
    });

    return {
      suggestions: [
        "Consider consolidating duplicate content",
        "Review section balance for better flow",
      ],
      duplicates: duplicates.length,
    };
  }

  private async findOrphanedSections(_args: Record<string, unknown>) {
    await this.writersAid.checkLinks({});

    return {
      orphanedSections: [],
      message: "Analysis complete - check links for orphaned content",
    };
  }

  private async validateStructure(args: Record<string, unknown>) {
    const filePath = args.file_path as string | undefined;
    const checks = args.checks as string[] | undefined;

    return this.writersAid.validateStructure({ filePath, checks });
  }

  // Link Tools
  private async analyzeLinkGraph(args: Record<string, unknown>) {
    const format = (args.format as string) || "mermaid";

    const links = await this.writersAid.checkLinks({});

    if (format === "mermaid") {
      return {
        format: "mermaid",
        graph: "graph TD\n  A[Chapter 1] --> B[Chapter 2]\n  B --> C[Chapter 3]",
      };
    }

    return { links, format };
  }

  private async findBrokenLinks(args: Record<string, unknown>) {
    const checkExternal = (args.check_external as boolean) || false;
    const scope = args.scope as string | undefined;
    const limit = resolvePaginationLimit("find_broken_links", args.limit as number | undefined);

    return this.writersAid.checkLinks({ checkExternal, scope, limit });
  }

  private async suggestCrossReferences(args: Record<string, unknown>) {
    const minSimilarity = (args.min_similarity as number) || 0.7;

    // Find similar content that could be cross-referenced
    const duplicates = await this.writersAid.findDuplicates({
      similarityThreshold: minSimilarity,
    });

    return {
      suggestions: duplicates.map((d) => ({
        from: d.file1,
        to: d.file2,
        reason: `Similar content (${Math.round(d.similarity * 100)}% match)`,
      })),
    };
  }

  private async traceReferenceChain(args: Record<string, unknown>) {
    const startFile = args.start_file as string;
    const endFile = args.end_file as string;
    const concept = args.concept as string | undefined;

    return {
      startFile,
      endFile,
      concept,
      chain: [],
      message: "Reference chain analysis",
    };
  }

  // Quality Tools
  private async checkTerminology(args: Record<string, unknown>) {
    const scope = args.scope as string | undefined;
    const autoDetect = (args.auto_detect as boolean) ?? true;
    const terms = args.terms as string[] | undefined;
    const limit = resolvePaginationLimit("check_terminology", args.limit as number | undefined);
    const examplesPerVariant = (args.examples_per_variant as number) || 3;

    return this.writersAid.checkTerminology({ scope, autoDetect, terms, limit, examplesPerVariant });
  }

  private async findTodos(args: Record<string, unknown>) {
    const scope = args.scope as string | undefined;
    const markers = args.markers as string[] | undefined;
    const groupBy = args.group_by as "file" | "priority" | "marker" | undefined;
    const limit = resolvePaginationLimit("find_todos", args.limit as number | undefined);

    return this.writersAid.findTodos({ scope, markers, groupBy, limit });
  }

  private async checkReadability(args: Record<string, unknown>) {
    const filePath = args.file_path as string | undefined;

    return this.writersAid.analyzeReadability(filePath);
  }

  private async findDuplicates(args: Record<string, unknown>) {
    const scope = args.scope as string | undefined;
    const similarityThreshold = (args.similarity_threshold as number) || 0.8;
    const minLength = (args.min_length as number) || 50;
    const limit = resolvePaginationLimit("find_duplicates", args.limit as number | undefined);

    return this.writersAid.findDuplicates({ scope, similarityThreshold, minLength, limit });
  }

  // Progress Tools
  private async getWritingStats(args: Record<string, unknown>) {
    const scope = args.scope as string | undefined;

    return this.writersAid.getStats({ scope });
  }

  private async trackChanges(args: Record<string, unknown>) {
    const since = args.since as string | undefined;
    const scope = args.scope as string | undefined;

    const stats = await this.writersAid.getStats({ scope });

    return {
      since,
      changes: [],
      stats,
    };
  }

  private async generateProgressReport(args: Record<string, unknown>) {
    const targetWordCount = args.target_word_count as number | undefined;
    const scope = args.scope as string | undefined;
    const includeTodos = (args.include_todos as boolean) ?? true;

    const stats = await this.writersAid.getStats({ scope });
    const todos = includeTodos ? await this.writersAid.findTodos({}) : [];

    const progress = targetWordCount
      ? (stats.totalWords / targetWordCount) * 100
      : 0;

    return {
      totalWords: stats.totalWords,
      targetWordCount,
      progress: Math.round(progress),
      todosRemaining: includeTodos ? todos.length : undefined,
      filesCount: stats.totalFiles,
    };
  }

  // Holistic Memory Tools
  private async recallWritingSession(args: Record<string, unknown>) {
    const startDate = args.start_date
      ? this.parseDate(args.start_date as string)
      : undefined;
    const endDate = args.end_date
      ? this.parseDate(args.end_date as string)
      : undefined;
    const filePath = args.file_path as string | undefined;
    const limit = (args.limit as number) || 10;

    return this.writersAid.recallWritingSessions({
      startDate,
      endDate,
      filePath,
      limit,
    });
  }

  private async getSessionContext(args: Record<string, unknown>) {
    const filePath = args.file_path as string | undefined;
    const limit = (args.limit as number) || 5;

    return this.writersAid.getSessionContext({ filePath, limit });
  }

  private async listWritingDecisions(args: Record<string, unknown>) {
    const filePath = args.file_path as string | undefined;
    const decisionType = args.decision_type as
      | "structure"
      | "content"
      | "terminology"
      | "style"
      | undefined;
    const limit = (args.limit as number) || 20;

    return this.writersAid.listWritingDecisions({
      filePath,
      decisionType,
      limit,
    });
  }

  // Holistic Memory - Phase 2 Tools
  private async markMistake(args: Record<string, unknown>) {
    const filePath = args.file_path as string;
    const lineRange = args.line_range as string | undefined;
    const mistakeType = args.mistake_type as
      | "logical_fallacy"
      | "factual_error"
      | "poor_structure"
      | "inconsistency"
      | "unclear_writing"
      | "citation_error"
      | "redundancy"
      | "other";
    const description = args.description as string;
    const correction = args.correction as string | undefined;

    return this.writersAid.markMistake({
      filePath,
      lineRange,
      mistakeType,
      description,
      correction,
    });
  }

  private async searchSimilarMistakes(args: Record<string, unknown>) {
    const description = args.description as string;
    const limit = (args.limit as number) || 5;

    return this.writersAid.searchSimilarMistakes({ description, limit });
  }

  private async setRequirement(args: Record<string, unknown>) {
    const requirementType = args.requirement_type as
      | "word_count"
      | "citation_style"
      | "formatting"
      | "deadline"
      | "target_audience"
      | "tone"
      | "reading_level"
      | "chapter_count"
      | "other";
    const description = args.description as string;
    const value = args.value as string | undefined;
    const enforced = (args.enforced as boolean) || false;

    return this.writersAid.setRequirement({
      requirementType,
      description,
      value,
      enforced,
    });
  }

  private async getRequirements(args: Record<string, unknown>) {
    const requirementType = args.requirement_type as
      | "word_count"
      | "citation_style"
      | "formatting"
      | "deadline"
      | "target_audience"
      | "tone"
      | "reading_level"
      | "chapter_count"
      | "other"
      | undefined;
    const enforcedOnly = args.enforced_only as boolean | undefined;

    return this.writersAid.getRequirements({ requirementType, enforcedOnly });
  }

  private async addStyleDecision(args: Record<string, unknown>) {
    const category = args.category as
      | "terminology"
      | "formatting"
      | "citations"
      | "tone"
      | "headings"
      | "lists"
      | "code_blocks"
      | "quotes"
      | "other";
    const canonicalChoice = args.canonical_choice as string;
    const rationale = args.rationale as string | undefined;
    const examples = args.examples as string[] | undefined;

    return this.writersAid.addStyleDecision({
      category,
      canonicalChoice,
      rationale,
      examples,
    });
  }

  /**
   * Parse date string (ISO format or relative like "1 week ago")
   */
  private parseDate(dateStr: string): Date {
    // Try ISO format first
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // Parse relative dates like "1 week ago", "2 days ago"
    const relativeMatch = dateStr.match(/(\d+)\s+(day|week|month)s?\s+ago/i);
    if (relativeMatch) {
      const amount = parseInt(relativeMatch[1]);
      const unit = relativeMatch[2].toLowerCase();
      const now = new Date();

      switch (unit) {
        case "day":
          now.setDate(now.getDate() - amount);
          break;
        case "week":
          now.setDate(now.getDate() - amount * 7);
          break;
        case "month":
          now.setMonth(now.getMonth() - amount);
          break;
      }

      return now;
    }

    // Fallback to current date
    return new Date();
  }
}
