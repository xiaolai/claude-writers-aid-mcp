/**
 * Writer Tool Definitions - MCP tool schemas for Writer's Aid
 */

export const writerToolDefinitions = [
  // Content Discovery Tools (5)
  {
    name: "search_content",
    description: "Semantic search across all manuscript content",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        query: { type: "string", description: "Search query" },
        scope: { type: "string", description: "File scope pattern (e.g., 'chapters/*.md')" },
        limit: { type: "number", description: "Maximum results", default: 10 },
      },
      required: ["query"],
    },
  },
  {
    name: "find_related_sections",
    description: "Find content semantically similar to given text",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        reference_text: { type: "string", description: "Text to find related content for" },
        limit: { type: "number", description: "Maximum results", default: 5 },
        exclude_file: { type: "string", description: "File to exclude from results" },
      },
      required: ["reference_text"],
    },
  },
  {
    name: "extract_themes",
    description: "Cluster content into main themes/topics",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        scope: { type: "string", description: "File scope pattern" },
        num_themes: { type: "number", description: "Number of themes to extract", default: 5 },
      },
    },
  },
  {
    name: "track_concept_evolution",
    description: "Show how concept is discussed across documents",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        concept: { type: "string", description: "Concept to track" },
        chronological: { type: "boolean", description: "Sort chronologically", default: true },
      },
      required: ["concept"],
    },
  },
  {
    name: "find_gaps",
    description: "Find terms mentioned but not explained",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        scope: { type: "string", description: "File scope pattern" },
        limit: { type: "number", description: "Maximum results", default: 20 },
      },
    },
  },

  // Structure Tools (4)
  {
    name: "generate_outline",
    description: "Create hierarchical outline from content",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        scope: { type: "string", description: "File scope pattern" },
        depth: { type: "number", description: "Outline depth", default: 3 },
        include_word_counts: { type: "boolean", description: "Include word counts", default: false },
      },
    },
  },
  {
    name: "suggest_reorganization",
    description: "Suggest better content organization",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        current_structure: { type: "string", description: "Description of current structure" },
        optimization: {
          type: "string",
          enum: ["coherence", "flow", "complexity"],
          description: "Optimization goal",
        },
      },
    },
  },
  {
    name: "find_orphaned_sections",
    description: "Find sections with no incoming links",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        scope: { type: "string", description: "File scope pattern" },
      },
    },
  },
  {
    name: "validate_structure",
    description: "Check heading hierarchy and section balance",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        file_path: { type: "string", description: "Specific file to validate" },
        checks: {
          type: "array",
          items: { type: "string" },
          description: "Checks to run (heading-levels, duplicates, balance, deep-nesting)",
        },
      },
    },
  },

  // Link Tools (4)
  {
    name: "analyze_link_graph",
    description: "Visualize connections between documents",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        scope: { type: "string", description: "File scope pattern" },
        format: {
          type: "string",
          enum: ["mermaid", "json", "dot"],
          description: "Output format",
          default: "mermaid",
        },
      },
    },
  },
  {
    name: "find_broken_links",
    description: "Detect broken internal and external links",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        check_external: { type: "boolean", description: "Check external links", default: false },
        scope: { type: "string", description: "File scope pattern" },
        limit: { type: "number", description: "Maximum results", default: 50 },
      },
    },
  },
  {
    name: "suggest_cross_references",
    description: "Suggest where to add links between sections",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        min_similarity: {
          type: "number",
          description: "Minimum similarity threshold",
          default: 0.7,
        },
        exclude_existing_links: {
          type: "boolean",
          description: "Exclude existing links",
          default: true,
        },
      },
    },
  },
  {
    name: "trace_reference_chain",
    description: "Follow concept through linked documents",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        start_file: { type: "string", description: "Starting file" },
        end_file: { type: "string", description: "Target file" },
        concept: { type: "string", description: "Concept to track" },
      },
      required: ["start_file", "end_file"],
    },
  },

  // Quality Tools (4)
  {
    name: "check_terminology",
    description: "Find inconsistent term usage",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        scope: { type: "string", description: "File scope pattern" },
        auto_detect: { type: "boolean", description: "Auto-detect variants", default: true },
        terms: {
          type: "array",
          items: { type: "string" },
          description: "Specific terms to check",
        },
        limit: { type: "number", description: "Maximum term groups to return", default: 20 },
        examples_per_variant: { type: "number", description: "Examples per term variant", default: 3 },
      },
    },
  },
  {
    name: "find_todos",
    description: "Extract all TODO/FIXME/DRAFT markers",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        scope: { type: "string", description: "File scope pattern" },
        markers: {
          type: "array",
          items: { type: "string" },
          description: "Markers to search for",
        },
        group_by: {
          type: "string",
          enum: ["file", "priority", "marker"],
          description: "Grouping method",
        },
        limit: { type: "number", description: "Maximum results", default: 50 },
      },
    },
  },
  {
    name: "check_readability",
    description: "Analyze readability metrics",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        file_path: { type: "string", description: "Specific file to analyze" },
        metrics: {
          type: "array",
          items: { type: "string" },
          description: "Metrics to calculate",
        },
      },
    },
  },
  {
    name: "find_duplicates",
    description: "Find near-duplicate content",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        scope: { type: "string", description: "File scope pattern" },
        similarity_threshold: {
          type: "number",
          description: "Similarity threshold (0-1)",
          default: 0.8,
        },
        min_length: { type: "number", description: "Minimum content length", default: 50 },
        limit: { type: "number", description: "Maximum results", default: 30 },
      },
    },
  },

  // Progress Tools (3)
  {
    name: "get_writing_stats",
    description: "Overall project statistics",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        scope: { type: "string", description: "File scope pattern" },
        breakdown_by: {
          type: "string",
          enum: ["chapter", "date", "tag"],
          description: "Breakdown method",
        },
      },
    },
  },
  {
    name: "track_changes",
    description: "Show what changed since timestamp",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        since: { type: "string", description: "Timestamp or relative time" },
        scope: { type: "string", description: "File scope pattern" },
        summary_level: {
          type: "string",
          enum: ["section", "file", "line"],
          description: "Summary detail level",
          default: "file",
        },
      },
    },
  },
  {
    name: "generate_progress_report",
    description: "Create progress dashboard",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        target_word_count: { type: "number", description: "Target word count goal" },
        scope: { type: "string", description: "File scope pattern" },
        include_todos: { type: "boolean", description: "Include TODO count", default: true },
      },
    },
  },

  // Holistic Memory Tools - Phase 1: Sessions & Decisions (3)
  {
    name: "recall_writing_session",
    description: "Search writing session history by date range or query",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        start_date: { type: "string", description: "Start date (ISO format or relative like '1 week ago')" },
        end_date: { type: "string", description: "End date (ISO format)" },
        file_path: { type: "string", description: "Filter sessions that touched this file" },
        limit: { type: "number", description: "Maximum sessions to return", default: 10 },
      },
    },
  },
  {
    name: "get_session_context",
    description: "Get detailed context for a specific file or concept from past sessions",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        file_path: { type: "string", description: "File to get session context for" },
        limit: { type: "number", description: "Maximum sessions to return", default: 5 },
      },
    },
  },
  {
    name: "list_writing_decisions",
    description: "List writing decisions by file, type, or date range",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        file_path: { type: "string", description: "Filter decisions for this file" },
        decision_type: {
          type: "string",
          enum: ["structure", "content", "terminology", "style"],
          description: "Filter by decision type",
        },
        limit: { type: "number", description: "Maximum decisions to return", default: 20 },
      },
    },
  },

  // Holistic Memory Tools - Phase 2: Mistakes & Requirements (5)
  {
    name: "mark_mistake",
    description: "Record a writing mistake to avoid repeating it",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        file_path: { type: "string", description: "File where mistake occurred" },
        line_range: { type: "string", description: "Line range (e.g., '45-52')" },
        mistake_type: {
          type: "string",
          enum: ["logical_fallacy", "factual_error", "poor_structure", "inconsistency", "unclear_writing", "citation_error", "redundancy", "other"],
          description: "Type of mistake",
        },
        description: { type: "string", description: "Description of the mistake" },
        correction: { type: "string", description: "How it should be corrected" },
      },
      required: ["file_path", "mistake_type", "description"],
    },
  },
  {
    name: "search_similar_mistakes",
    description: "Search for similar mistakes to avoid repeating them",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        description: { type: "string", description: "Description to search for similar mistakes" },
        limit: { type: "number", description: "Maximum results", default: 5 },
      },
      required: ["description"],
    },
  },
  {
    name: "set_requirement",
    description: "Store a publisher or style requirement",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        requirement_type: {
          type: "string",
          enum: ["word_count", "citation_style", "formatting", "deadline", "target_audience", "tone", "reading_level", "chapter_count", "other"],
          description: "Type of requirement",
        },
        description: { type: "string", description: "Description of the requirement" },
        value: { type: "string", description: "Target value (e.g., '50000' for word count)" },
        enforced: { type: "boolean", description: "Whether this requirement is enforced", default: false },
      },
      required: ["requirement_type", "description"],
    },
  },
  {
    name: "get_requirements",
    description: "Get all requirements or filter by type",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        requirement_type: {
          type: "string",
          enum: ["word_count", "citation_style", "formatting", "deadline", "target_audience", "tone", "reading_level", "chapter_count", "other"],
          description: "Filter by requirement type",
        },
        enforced_only: { type: "boolean", description: "Show only enforced requirements" },
      },
    },
  },
  {
    name: "add_style_decision",
    description: "Record a style decision for consistency",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        category: {
          type: "string",
          enum: ["terminology", "formatting", "citations", "tone", "headings", "lists", "code_blocks", "quotes", "other"],
          description: "Style category",
        },
        canonical_choice: { type: "string", description: "The chosen canonical form" },
        rationale: { type: "string", description: "Why this choice was made" },
        examples: {
          type: "array",
          items: { type: "string" },
          description: "Example usages",
        },
      },
      required: ["category", "canonical_choice"],
    },
  },

  // Holistic Memory Tools - Phase 3: Git Integration & Evolution (4)
  {
    name: "track_file_evolution",
    description: "Show how a file evolved through git commits with rationale",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        file_path: { type: "string", description: "File to track evolution for" },
        limit: { type: "number", description: "Maximum commits to return", default: 10 },
      },
      required: ["file_path"],
    },
  },
  {
    name: "track_concept_evolution",
    description: "Track how a concept's definition evolved over time",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        concept_name: { type: "string", description: "Name of the concept to track" },
      },
      required: ["concept_name"],
    },
  },
  {
    name: "find_concept_contradictions",
    description: "Detect contradictions in concept definitions across versions",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        concept_name: { type: "string", description: "Concept to check for contradictions" },
      },
      required: ["concept_name"],
    },
  },
  {
    name: "link_commits_to_sessions",
    description: "Link git commits to writing sessions for context",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        since: { type: "string", description: "Start date (ISO format or relative)" },
        limit: { type: "number", description: "Maximum commits to process", default: 20 },
      },
    },
  },

  // Holistic Memory Tools - Phase 4: Unified Search (2)
  {
    name: "holistic_search",
    description: "Unified search across all memory layers (content, decisions, mistakes, concepts, sessions, commits)",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        query: { type: "string", description: "Search query" },
        layers: {
          type: "array",
          items: {
            type: "string",
            enum: ["content", "decisions", "mistakes", "concepts", "sessions", "commits"],
          },
          description: "Memory layers to search (default: all)",
        },
        start_date: { type: "string", description: "Filter results after this date (ISO format or relative)" },
        end_date: { type: "string", description: "Filter results before this date (ISO format or relative)" },
        limit: { type: "number", description: "Maximum results to return", default: 20 },
        min_relevance: { type: "number", description: "Minimum relevance score (0-1)", default: 0 },
      },
      required: ["query"],
    },
  },
  {
    name: "get_file_context",
    description: "Get all context for a file (sessions, decisions, mistakes, commits)",
    inputSchema: {
      type: "object",
      properties: {
        project_path: { type: "string", description: "Path to manuscript directory (defaults to current directory)" },
        file_path: { type: "string", description: "File to get context for" },
      },
      required: ["file_path"],
    },
  },
];
