# Writer's Aid MCP - Tool Reference

Complete reference for all 20 MCP tools available through Claude Code integration.

## Table of Contents

- [Overview](#overview)
- [Content Discovery Tools](#content-discovery-tools)
- [Structure Tools](#structure-tools)
- [Link Tools](#link-tools)
- [Quality Tools](#quality-tools)
- [Progress Tools](#progress-tools)
- [Tool Schemas](#tool-schemas)

## Overview

Writer's Aid provides 20 MCP tools organized into 5 categories. All tools are available when the MCP server is configured in Claude Code.

### Tool Categories

| Category | Tools | Purpose |
|----------|-------|---------|
| **Content Discovery** | 5 tools | Search, themes, gaps, duplicates |
| **Structure** | 4 tools | Outline, validation, statistics |
| **Links** | 4 tools | Link health, graph, suggestions |
| **Quality** | 4 tools | Terminology, readability, TODOs |
| **Progress** | 3 tools | Word counts, changes, timeline |

## Content Discovery Tools

### search_content

Search across all manuscript content using semantic understanding.

**Parameters:**

```typescript
{
  query: string;        // Search query
  scope?: string;       // File scope pattern (e.g., "chapters/*")
  limit?: number;       // Maximum results (default: 10)
}
```

**Returns:**

```typescript
{
  results: Array<{
    file: string;       // File path
    content: string;    // Matching content excerpt
    relevance: number;  // Relevance score (0-1)
  }>;
}
```

**Example:**

```
Query: "authentication methods"
Result: Finds relevant sections about OAuth, JWT, API keys, etc.
```

**Use Cases:**
- Find all mentions of a concept
- Discover related content
- Cross-reference topics
- Research existing coverage

---

### find_related_content

Find content similar to a specific file or section.

**Parameters:**

```typescript
{
  file: string;        // Reference file path
  limit?: number;      // Maximum results (default: 5)
  threshold?: number;  // Similarity threshold (0-1, default: 0.5)
}
```

**Returns:**

```typescript
{
  related: Array<{
    file: string;       // Related file path
    relevance: number;  // Similarity score
    excerpt: string;    // Content preview
  }>;
}
```

**Use Cases:**
- Find chapters that should be cross-referenced
- Identify redundant content
- Discover knowledge clusters
- Plan chapter reorganization

---

### extract_themes

Extract main themes and topics from manuscript.

**Parameters:**

```typescript
{
  scope?: string;      // File scope pattern
  numThemes?: number;  // Number of themes (default: 5)
  minCount?: number;   // Minimum word occurrences (default: 3)
}
```

**Returns:**

```typescript
{
  themes: Array<{
    theme: string;      // Theme/topic keyword
    count: number;      // Occurrence count
    files: string[];    // Files where theme appears
  }>;
}
```

**Use Cases:**
- Understand manuscript focus areas
- Identify overemphasized topics
- Find content gaps
- Plan chapter organization

---

### find_gaps

Find terms mentioned but not defined (knowledge gaps).

**Parameters:**

```typescript
{
  limit?: number;      // Maximum results (default: 10)
  scope?: string;      // File scope pattern
}
```

**Returns:**

```typescript
{
  gaps: Array<{
    term: string;       // Undefined term
    mentions: number;   // Number of mentions
    files: string[];    // Files where term appears
  }>;
}
```

**Use Cases:**
- Find terms needing glossary entries
- Identify assumed knowledge
- Improve reader experience
- Plan explanatory sections

---

### find_duplicates

Detect duplicate or near-duplicate content.

**Parameters:**

```typescript
{
  threshold?: number;  // Similarity threshold (0-1, default: 0.8)
  scope?: string;      // File scope pattern
}
```

**Returns:**

```typescript
{
  duplicates: Array<{
    file1: string;      // First file
    file2: string;      // Second file
    similarity: number; // Similarity score (0-1)
    excerpt: string;    // Duplicate content preview
  }>;
}
```

**Use Cases:**
- Find redundant explanations
- Identify copy-paste sections
- Consolidate content
- Improve consistency

## Structure Tools

### get_outline

Generate hierarchical outline of manuscript structure.

**Parameters:**

```typescript
{
  depth?: number;      // Outline depth (1-6, default: 3)
  scope?: string;      // File scope pattern
  includeStats?: boolean; // Include word counts (default: false)
}
```

**Returns:**

```typescript
{
  outline: Array<{
    level: number;      // Heading level (1-6)
    title: string;      // Heading text
    file: string;       // Source file
    wordCount?: number; // Words in section (if includeStats)
    children?: Outline[]; // Sub-sections
  }>;
}
```

**Use Cases:**
- Review manuscript structure
- Plan reorganization
- Identify structural imbalances
- Generate table of contents

---

### validate_structure

Check heading hierarchy and document structure.

**Parameters:**

```typescript
{
  filePath?: string;   // Specific file (or all if omitted)
  checks?: string[];   // Check types (default: all)
}
```

**Check Types:**
- `heading-levels` - Skipped heading levels
- `duplicate-headings` - Duplicate headings
- `section-balance` - Unbalanced sections
- `deep-nesting` - Deeply nested headings (H5+)

**Returns:**

```typescript
{
  filesChecked: number;
  issues: Array<{
    type: string;       // Issue type
    file: string;       // File path
    line?: number;      // Line number
    heading?: string;   // Heading text
    level?: number;     // Heading level
    message: string;    // Issue description
    severity: "error" | "warning" | "info";
  }>;
  errors: number;
  warnings: number;
  info: number;
}
```

**Use Cases:**
- Ensure consistent heading hierarchy
- Find structural issues
- Validate document organization
- Prepare for publication

---

### get_stats

Get comprehensive manuscript statistics.

**Parameters:**

```typescript
{
  scope?: string;      // File scope pattern
  groupBy?: string;    // Group by: file, chapter, section
}
```

**Returns:**

```typescript
{
  totalWords: number;
  totalFiles: number;
  averageWordsPerFile: number;
  files: Array<{
    path: string;
    words: number;
    headings: number;
    links: number;
  }>;
}
```

**Use Cases:**
- Track writing progress
- Plan chapter lengths
- Identify short/long sections
- Report statistics

---

### get_progress

Track writing progress over time.

**Parameters:**

```typescript
{
  since?: string;      // Time filter (today, yesterday, week, month)
  scope?: string;      // File scope pattern
}
```

**Returns:**

```typescript
{
  period: string;
  wordsAdded: number;
  filesModified: number;
  filesAdded: number;
  changes: Array<{
    file: string;
    wordsDelta: number;
    timestamp: number;
  }>;
}
```

**Use Cases:**
- Track daily progress
- Measure productivity
- Plan writing schedule
- Motivate continued work

## Link Tools

### check_links

Validate health of all links in manuscript.

**Parameters:**

```typescript
{
  filePath?: string;   // Specific file (or all if omitted)
  checkExternal?: boolean; // Check external URLs (default: true)
}
```

**Returns:**

```typescript
{
  total: number;
  broken: number;
  issues: Array<{
    file: string;       // Source file
    line: number;       // Line number
    target: string;     // Link target
    linkType: "markdown" | "wiki" | "external" | "anchor";
    issue: string;      // Issue description
  }>;
}
```

**Use Cases:**
- Find broken internal links
- Validate external URLs
- Maintain link integrity
- Prepare for publication

---

### get_link_graph

Visualize connections between files.

**Parameters:**

```typescript
{
  scope?: string;      // File scope pattern
  minLinks?: number;   // Minimum link count (default: 1)
}
```

**Returns:**

```typescript
{
  nodes: Array<{
    file: string;       // File path
    incomingLinks: number;
    outgoingLinks: number;
  }>;
  edges: Array<{
    from: string;       // Source file
    to: string;         // Target file
    count: number;      // Link count
  }>;
}
```

**Use Cases:**
- Visualize document relationships
- Find isolated files
- Identify hub files
- Plan cross-references

---

### find_broken_links

Find all broken links in manuscript.

**Parameters:**

```typescript
{
  scope?: string;      // File scope pattern
  includeExternal?: boolean; // Include external URLs (default: false)
}
```

**Returns:**

Same as `check_links` but filtered to broken links only.

**Use Cases:**
- Quick broken link check
- Pre-publication validation
- Fix references after file renames
- Maintain link health

---

### suggest_links

Suggest potential cross-references between related content.

**Parameters:**

```typescript
{
  file: string;        // Reference file
  threshold?: number;  // Similarity threshold (0-1, default: 0.7)
  limit?: number;      // Maximum suggestions (default: 5)
}
```

**Returns:**

```typescript
{
  suggestions: Array<{
    targetFile: string; // Suggested link target
    relevance: number;  // Relevance score
    reason: string;     // Why this link is suggested
    anchor?: string;    // Suggested anchor text
  }>;
}
```

**Use Cases:**
- Improve cross-referencing
- Connect related topics
- Enhance reader navigation
- Identify missing links

## Quality Tools

### check_terminology

Check term consistency across manuscript.

**Parameters:**

```typescript
{
  terms?: string[];    // Specific terms to check
  autoDetect?: boolean; // Auto-detect variants (default: false)
  scope?: string;      // File scope pattern
}
```

**Returns:**

```typescript
{
  totalIssues: number;
  groups: Array<{
    canonical: string;  // Most common variant
    variants: Array<{
      term: string;     // Term variant
      count: number;    // Occurrence count
      files: string[];  // Files where found
      examples: Array<{
        file: string;
        line: number;
        context: string;
      }>;
    }>;
    totalCount: number;
    inconsistency: "high" | "medium" | "low";
  }>;
}
```

**Common Issues Detected:**
- email / e-mail / Email
- API / api / Api
- database / data-base
- JavaScript / Javascript / javascript

**Use Cases:**
- Ensure term consistency
- Style guide compliance
- Professional polish
- Reader clarity

---

### analyze_readability

Analyze readability metrics for manuscript.

**Parameters:**

```typescript
{
  filePath?: string;   // Specific file (or all if omitted)
  scope?: string;      // File scope pattern
}
```

**Returns:**

```typescript
{
  files: Array<{
    file: string;
    totalWords: number;
    totalSentences: number;
    averageWordsPerSentence: number;
    averageSyllablesPerWord: number;
    fleschReadingEase: number;  // 0-100 (higher = easier)
    fleschKincaidGrade: number; // Grade level
    readingLevel: "elementary" | "middle-school" |
                  "high-school" | "college" | "advanced";
  }>;
}
```

**Flesch Reading Ease Scale:**
- 90-100: Very easy (5th grade)
- 80-90: Easy (6th grade)
- 70-80: Fairly easy (7th grade)
- 60-70: Standard (8th-9th grade)
- 50-60: Fairly difficult (10th-12th grade)
- 30-50: Difficult (college)
- 0-30: Very difficult (college graduate)

**Use Cases:**
- Assess reading difficulty
- Target specific audience levels
- Simplify complex sections
- Ensure accessibility

---

### find_todos

Extract all TODO markers from manuscript.

**Parameters:**

```typescript
{
  groupBy?: "file" | "priority" | "marker";
  scope?: string;      // File scope pattern
}
```

**Markers Detected:**
- `TODO` - Medium priority
- `FIXME` - High priority
- `HACK` - High priority
- `XXX` - High priority
- `WIP` - Medium priority
- `NOTE` - Low priority
- `DRAFT` - Low priority

**Returns:**

```typescript
{
  todos: Array<{
    file: string;
    line: number;
    marker: string;     // TODO, FIXME, etc.
    text: string;       // TODO text
    priority: "high" | "medium" | "low";
  }>;
}
```

**Use Cases:**
- Track pending work
- Prioritize revisions
- Plan next steps
- Pre-publication checklist

---

### check_consistency

Check style consistency across manuscript.

**Parameters:**

```typescript
{
  checks?: string[];   // Check types (default: all)
  scope?: string;      // File scope pattern
}
```

**Check Types:**
- `heading-style` - ATX vs Setext headings
- `list-markers` - Consistent list markers
- `code-fences` - Consistent code fence markers
- `emphasis` - Consistent bold/italic markers

**Returns:**

```typescript
{
  issues: Array<{
    type: string;
    file: string;
    line?: number;
    message: string;
    severity: "warning" | "info";
  }>;
}
```

**Use Cases:**
- Style guide compliance
- Professional appearance
- Editor requirements
- Consistent formatting

## Progress Tools

### get_word_count

Get word count statistics.

**Parameters:**

```typescript
{
  scope?: string;      // File scope pattern
  includeCode?: boolean; // Include code blocks (default: false)
  includeMetadata?: boolean; // Include frontmatter (default: false)
}
```

**Returns:**

```typescript
{
  total: number;
  byFile: Record<string, number>;
  bySection?: Record<string, number>;
}
```

**Use Cases:**
- Track progress toward goals
- Balance chapter lengths
- Meet word count requirements
- Plan writing schedule

---

### track_changes

Track changes over time.

**Parameters:**

```typescript
{
  since?: string;      // Time filter
  scope?: string;      // File scope pattern
  granularity?: "hour" | "day" | "week";
}
```

**Returns:**

```typescript
{
  timeline: Array<{
    timestamp: number;
    wordsAdded: number;
    wordsRemoved: number;
    netChange: number;
    filesChanged: string[];
  }>;
}
```

**Use Cases:**
- Visualize progress
- Identify productive periods
- Plan writing schedule
- Motivate continued work

---

### get_timeline

View writing timeline and history.

**Parameters:**

```typescript
{
  scope?: string;      // File scope pattern
  limit?: number;      // Maximum events (default: 50)
}
```

**Returns:**

```typescript
{
  events: Array<{
    timestamp: number;
    type: "create" | "modify" | "delete";
    file: string;
    wordsDelta: number;
  }>;
}
```

**Use Cases:**
- Review writing history
- Understand manuscript evolution
- Identify major revisions
- Track productivity patterns

## Tool Schemas

All tools follow the MCP tool schema format:

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, SchemaProperty>;
    required?: string[];
  };
}
```

### Example Tool Call (in Claude Code)

```
@writers-aid search_content
query: "authentication methods"
limit: 5
```

### Example Response

```json
{
  "results": [
    {
      "file": "chapters/03-security.md",
      "content": "OAuth 2.0 is the industry-standard protocol...",
      "relevance": 0.95
    },
    {
      "file": "chapters/05-api-design.md",
      "content": "API authentication can use several methods...",
      "relevance": 0.87
    }
  ]
}
```

## Best Practices

### Tool Selection

- **Search** - Use `search_content` for broad queries, `find_related_content` for specific files
- **Structure** - Run `validate_structure` regularly during writing
- **Quality** - Use `check_terminology` before major milestones
- **Links** - Check links before sharing or publishing

### Performance Tips

- Use `scope` parameter to limit search space
- Set appropriate `limit` values
- Run heavy operations (readability, duplicates) periodically, not continuously

### Integration with Workflows

- **Daily:** `search_content`, `get_stats`
- **Weekly:** `validate_structure`, `check_terminology`
- **Pre-publication:** `check_links`, `find_todos`, `check_consistency`

## Error Handling

All tools return structured errors:

```typescript
{
  error: string;       // Error message
  code: string;        // Error code
  details?: any;       // Additional details
}
```

Common error codes:
- `FILE_NOT_FOUND` - Specified file doesn't exist
- `INVALID_SCOPE` - Invalid scope pattern
- `DATABASE_ERROR` - Database operation failed
- `PARSE_ERROR` - Markdown parsing failed

## Support

- **Documentation:** [USER-GUIDE.md](USER-GUIDE.md)
- **CLI Reference:** [CLI-REFERENCE.md](CLI-REFERENCE.md)
- **Issues:** [GitHub Issues](https://github.com/xiaolai/claude-writers-aid-mcp/issues)

---

**Version:** 0.1.0
**Last Updated:** January 2025
