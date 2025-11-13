/**
 * RequirementsManager - Manage publisher requirements and style constraints
 *
 * Enables writers to:
 * - Store publisher requirements (word counts, citation styles, deadlines)
 * - Track style decisions (canonical terminology, formatting rules)
 * - Validate manuscript against requirements
 * - Maintain consistency across the manuscript
 */

import { nanoid } from "nanoid";
import type { SQLiteManager } from "../storage/SQLiteManager.js";

export interface WritingRequirement {
  id: string;
  requirementType: RequirementType;
  description: string;
  value?: string; // Target value (e.g., "50000" for word count, "Chicago" for citation style)
  enforced: boolean;
  createdAt: number;
}

export type RequirementType =
  | "word_count"
  | "citation_style"
  | "formatting"
  | "deadline"
  | "target_audience"
  | "tone"
  | "reading_level"
  | "chapter_count"
  | "other";

export interface StyleDecision {
  id: string;
  category: StyleCategory;
  canonicalChoice: string;
  alternativesRejected?: string[];
  rationale?: string;
  examples?: string[];
  createdAt: number;
}

export type StyleCategory =
  | "terminology"
  | "formatting"
  | "citations"
  | "tone"
  | "headings"
  | "lists"
  | "code_blocks"
  | "quotes"
  | "other";

export class RequirementsManager {
  private db: SQLiteManager;

  constructor(db: SQLiteManager) {
    this.db = db;
  }

  // ============================================================================
  // Requirements Management
  // ============================================================================

  /**
   * Add a new requirement
   */
  addRequirement(
    requirement: Omit<WritingRequirement, "id" | "createdAt">
  ): WritingRequirement {
    const now = Date.now();
    const newRequirement: WritingRequirement = {
      id: nanoid(),
      ...requirement,
      createdAt: now,
    };

    this.db
      .prepare(
        `INSERT INTO writing_requirements
         (id, requirement_type, description, value, enforced, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        newRequirement.id,
        newRequirement.requirementType,
        newRequirement.description,
        newRequirement.value || null,
        newRequirement.enforced ? 1 : 0,
        newRequirement.createdAt
      );

    return newRequirement;
  }

  /**
   * Update a requirement
   */
  updateRequirement(
    requirementId: string,
    update: Partial<Omit<WritingRequirement, "id" | "createdAt">>
  ): void {
    const requirement = this.getRequirement(requirementId);
    if (!requirement) {
      throw new Error(`Requirement ${requirementId} not found`);
    }

    const fields: string[] = [];
    const params: unknown[] = [];

    if (update.description !== undefined) {
      fields.push("description = ?");
      params.push(update.description);
    }

    if (update.value !== undefined) {
      fields.push("value = ?");
      params.push(update.value);
    }

    if (update.enforced !== undefined) {
      fields.push("enforced = ?");
      params.push(update.enforced ? 1 : 0);
    }

    if (fields.length === 0) {
      return;
    }

    params.push(requirementId);
    const sql = `UPDATE writing_requirements SET ${fields.join(", ")} WHERE id = ?`;

    this.db.prepare(sql).run(...params);
  }

  /**
   * Get a requirement by ID
   */
  getRequirement(requirementId: string): WritingRequirement | undefined {
    const row = this.db
      .prepare(
        `SELECT id, requirement_type, description, value, enforced, created_at
         FROM writing_requirements
         WHERE id = ?`
      )
      .get(requirementId) as RequirementRow | undefined;

    return row ? this.rowToRequirement(row) : undefined;
  }

  /**
   * Get all requirements
   */
  getAllRequirements(enforced?: boolean): WritingRequirement[] {
    let sql = `SELECT id, requirement_type, description, value, enforced, created_at
               FROM writing_requirements`;
    const params: unknown[] = [];

    if (enforced !== undefined) {
      sql += ` WHERE enforced = ?`;
      params.push(enforced ? 1 : 0);
    }

    sql += ` ORDER BY created_at DESC`;

    const rows = this.db.prepare(sql).all(...params) as RequirementRow[];
    return rows.map((row) => this.rowToRequirement(row));
  }

  /**
   * Get requirements by type
   */
  getRequirementsByType(requirementType: RequirementType): WritingRequirement[] {
    const rows = this.db
      .prepare(
        `SELECT id, requirement_type, description, value, enforced, created_at
         FROM writing_requirements
         WHERE requirement_type = ?
         ORDER BY created_at DESC`
      )
      .all(requirementType) as RequirementRow[];

    return rows.map((row) => this.rowToRequirement(row));
  }

  /**
   * Delete a requirement
   */
  deleteRequirement(requirementId: string): void {
    this.db
      .prepare(`DELETE FROM writing_requirements WHERE id = ?`)
      .run(requirementId);
  }

  // ============================================================================
  // Style Decisions Management
  // ============================================================================

  /**
   * Add a style decision
   */
  addStyleDecision(
    decision: Omit<StyleDecision, "id" | "createdAt">
  ): StyleDecision {
    const now = Date.now();
    const newDecision: StyleDecision = {
      id: nanoid(),
      ...decision,
      createdAt: now,
    };

    this.db
      .prepare(
        `INSERT INTO style_decisions
         (id, category, canonical_choice, alternatives_rejected, rationale, examples, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newDecision.id,
        newDecision.category,
        newDecision.canonicalChoice,
        newDecision.alternativesRejected
          ? JSON.stringify(newDecision.alternativesRejected)
          : null,
        newDecision.rationale || null,
        newDecision.examples ? JSON.stringify(newDecision.examples) : null,
        newDecision.createdAt
      );

    return newDecision;
  }

  /**
   * Update a style decision
   */
  updateStyleDecision(
    decisionId: string,
    update: Partial<Omit<StyleDecision, "id" | "createdAt">>
  ): void {
    const decision = this.getStyleDecision(decisionId);
    if (!decision) {
      throw new Error(`Style decision ${decisionId} not found`);
    }

    const fields: string[] = [];
    const params: unknown[] = [];

    if (update.canonicalChoice !== undefined) {
      fields.push("canonical_choice = ?");
      params.push(update.canonicalChoice);
    }

    if (update.alternativesRejected !== undefined) {
      fields.push("alternatives_rejected = ?");
      params.push(JSON.stringify(update.alternativesRejected));
    }

    if (update.rationale !== undefined) {
      fields.push("rationale = ?");
      params.push(update.rationale);
    }

    if (update.examples !== undefined) {
      fields.push("examples = ?");
      params.push(JSON.stringify(update.examples));
    }

    if (fields.length === 0) {
      return;
    }

    params.push(decisionId);
    const sql = `UPDATE style_decisions SET ${fields.join(", ")} WHERE id = ?`;

    this.db.prepare(sql).run(...params);
  }

  /**
   * Get a style decision by ID
   */
  getStyleDecision(decisionId: string): StyleDecision | undefined {
    const row = this.db
      .prepare(
        `SELECT id, category, canonical_choice, alternatives_rejected, rationale, examples, created_at
         FROM style_decisions
         WHERE id = ?`
      )
      .get(decisionId) as StyleDecisionRow | undefined;

    return row ? this.rowToStyleDecision(row) : undefined;
  }

  /**
   * Get all style decisions
   */
  getAllStyleDecisions(): StyleDecision[] {
    const rows = this.db
      .prepare(
        `SELECT id, category, canonical_choice, alternatives_rejected, rationale, examples, created_at
         FROM style_decisions
         ORDER BY created_at DESC`
      )
      .all() as StyleDecisionRow[];

    return rows.map((row) => this.rowToStyleDecision(row));
  }

  /**
   * Get style decisions by category
   */
  getStyleDecisionsByCategory(category: StyleCategory): StyleDecision[] {
    const rows = this.db
      .prepare(
        `SELECT id, category, canonical_choice, alternatives_rejected, rationale, examples, created_at
         FROM style_decisions
         WHERE category = ?
         ORDER BY created_at DESC`
      )
      .all(category) as StyleDecisionRow[];

    return rows.map((row) => this.rowToStyleDecision(row));
  }

  /**
   * Find style decision by canonical choice (for lookups)
   */
  findStyleDecisionByChoice(canonicalChoice: string): StyleDecision | undefined {
    const row = this.db
      .prepare(
        `SELECT id, category, canonical_choice, alternatives_rejected, rationale, examples, created_at
         FROM style_decisions
         WHERE canonical_choice = ?`
      )
      .get(canonicalChoice) as StyleDecisionRow | undefined;

    return row ? this.rowToStyleDecision(row) : undefined;
  }

  /**
   * Delete a style decision
   */
  deleteStyleDecision(decisionId: string): void {
    this.db.prepare(`DELETE FROM style_decisions WHERE id = ?`).run(decisionId);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Get summary of all requirements and style decisions
   */
  getSummary(): {
    requirements: WritingRequirement[];
    styleDecisions: StyleDecision[];
    totalRequirements: number;
    enforcedRequirements: number;
  } {
    const requirements = this.getAllRequirements();
    const styleDecisions = this.getAllStyleDecisions();

    return {
      requirements,
      styleDecisions,
      totalRequirements: requirements.length,
      enforcedRequirements: requirements.filter((r) => r.enforced).length,
    };
  }

  /**
   * Convert database row to WritingRequirement
   */
  private rowToRequirement(row: RequirementRow): WritingRequirement {
    return {
      id: row.id,
      requirementType: row.requirement_type as RequirementType,
      description: row.description,
      value: row.value || undefined,
      enforced: Boolean(row.enforced),
      createdAt: row.created_at,
    };
  }

  /**
   * Convert database row to StyleDecision
   */
  private rowToStyleDecision(row: StyleDecisionRow): StyleDecision {
    return {
      id: row.id,
      category: row.category as StyleCategory,
      canonicalChoice: row.canonical_choice,
      alternativesRejected: row.alternatives_rejected
        ? JSON.parse(row.alternatives_rejected)
        : undefined,
      rationale: row.rationale || undefined,
      examples: row.examples ? JSON.parse(row.examples) : undefined,
      createdAt: row.created_at,
    };
  }
}

// Database row types
interface RequirementRow {
  id: string;
  requirement_type: string;
  description: string;
  value: string | null;
  enforced: number;
  created_at: number;
}

interface StyleDecisionRow {
  id: string;
  category: string;
  canonical_choice: string;
  alternatives_rejected: string | null;
  rationale: string | null;
  examples: string | null;
  created_at: number;
}
