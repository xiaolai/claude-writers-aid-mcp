/**
 * Centralized Pagination Utilities
 *
 * Provides consistent pagination/limiting logic for all Writer's Aid tools
 * to prevent token overflow in MCP responses.
 */

/**
 * Per-tool pagination configuration
 * - default: Applied when user doesn't specify a limit
 * - max: Maximum allowed limit (prevents abuse/overflow)
 */
export const PAGINATION_DEFAULTS: Record<string, { default: number; max: number }> = {
  find_gaps: { default: 20, max: 100 },
  find_todos: { default: 50, max: 200 },
  find_duplicates: { default: 30, max: 100 },
  check_terminology: { default: 20, max: 50 },
  find_broken_links: { default: 50, max: 200 },
  track_concept_evolution: { default: 10, max: 50 },
  suggest_cross_references: { default: 25, max: 100 },
  analyze_link_graph: { default: 100, max: 500 },
};

/**
 * Resolves the effective pagination limit for a tool
 *
 * @param toolName - Name of the MCP tool
 * @param userLimit - User-provided limit (optional)
 * @returns Validated limit (clamped between 1 and max, defaults if not provided)
 */
export function resolvePaginationLimit(
  toolName: string,
  userLimit?: number
): number {
  const config = PAGINATION_DEFAULTS[toolName];

  if (!config) {
    // Tool doesn't have pagination config
    // If user provided a limit, enforce minimum of 1
    if (userLimit !== undefined) {
      return Math.max(1, userLimit);
    }
    return Number.MAX_SAFE_INTEGER;
  }

  // Use user limit if provided, otherwise use default
  const requestedLimit = userLimit ?? config.default;

  // Clamp between 1 (minimum) and max to prevent abuse
  // This prevents bypassing pagination with limit=0 or limit=-1
  return Math.max(1, Math.min(requestedLimit, config.max));
}

/**
 * Paginates a flat array of results
 *
 * @param items - Array to paginate
 * @param limit - Maximum items to return (optional)
 * @returns Limited array slice
 */
export function paginateResults<T>(items: T[], limit?: number): T[] {
  if (limit === undefined || limit <= 0) {
    return items;
  }

  return items.slice(0, limit);
}

/**
 * Paginates nested array structures (e.g., terminology groups with variants)
 *
 * @param groups - Array of groups, each containing nested arrays
 * @param groupsLimit - Maximum number of groups
 * @param itemsPerGroup - Maximum items per nested array
 * @returns Limited nested structure
 */
export function paginateNestedResults<T extends object>(
  groups: T[],
  groupsLimit?: number,
  itemsPerGroup?: number
): T[] {
  // Limit number of groups
  const limitedGroups = paginateResults(groups, groupsLimit);

  // Limit items within each group (if nested arrays exist)
  if (itemsPerGroup === undefined || itemsPerGroup <= 0) {
    return limitedGroups;
  }

  return limitedGroups.map(group => {
    const result = { ...group } as Record<string, unknown>;

    // Limit any array properties within the group
    for (const key in result) {
      if (Array.isArray(result[key])) {
        result[key] = (result[key] as unknown[]).slice(0, itemsPerGroup);
      }
    }

    return result as T;
  });
}

/**
 * Pagination options for tools
 */
export interface PaginationOptions {
  limit?: number;
  groupsLimit?: number;
  itemsPerGroup?: number;
}
