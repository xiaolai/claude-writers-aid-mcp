/**
 * Type definitions for Writer's Aid MCP
 * These types correspond to database tables in writing-schema.sql
 */

// ============================================================================
// Core Content Types
// ============================================================================

/**
 * Represents a markdown file in the manuscript
 */
export interface MarkdownFile {
  id: string;
  file_path: string;
  title: string | null;
  content: string;
  content_hash: string;
  word_count: number;
  created_at: number;
  last_modified: number;
  indexed_at: number;
}

/**
 * Content chunk for semantic search
 */
export interface MarkdownChunk {
  id: string;
  file_id: string;
  chunk_index: number;
  heading: string | null;
  content: string;
  start_offset: number;
  end_offset: number;
  token_count: number;
  word_count: number;
}

/**
 * Heading structure (h1, h2, h3, etc.)
 */
export interface MarkdownHeading {
  id: string;
  file_id: string;
  level: number;
  text: string;
  slug: string;
  line_number: number;
  parent_id: string | null;
}

// ============================================================================
// Graph & Links
// ============================================================================

/**
 * Link types in markdown
 */
export type LinkType = 'wiki' | 'markdown' | 'external' | 'anchor';

/**
 * Link between documents
 */
export interface MarkdownLink {
  id: string;
  source_file_id: string;
  target_file_path: string;
  link_text: string | null;
  link_type: LinkType;
  source_line: number | null;
  is_broken: boolean;
}

// ============================================================================
// Metadata & Frontmatter
// ============================================================================

/**
 * Frontmatter key-value pair
 */
export interface MarkdownMetadata {
  id: string;
  file_id: string;
  key: string;
  value: string;
}

/**
 * Parsed frontmatter object
 */
export interface Frontmatter {
  [key: string]: unknown;
  title?: string;
  author?: string;
  date?: string;
  tags?: string[];
  draft?: boolean;
}

// ============================================================================
// Quality Tracking
// ============================================================================

/**
 * TODO marker types
 */
export type TodoMarker = 'TODO' | 'FIXME' | 'DRAFT' | 'XXX' | 'NOTE';

/**
 * Priority levels for TODOs
 */
export type TodoPriority = 'low' | 'medium' | 'high';

/**
 * TODO/FIXME/DRAFT marker
 */
export interface MarkdownTodo {
  id: string;
  file_id: string;
  line_number: number;
  marker: TodoMarker;
  text: string;
  priority: TodoPriority;
  created_at: number;
}

/**
 * Terminology variant for consistency checking
 */
export interface MarkdownTerm {
  id: string;
  canonical_form: string;
  variants: string; // JSON array of variants
  usage_count: number;
  last_checked: number;
}

/**
 * Code block
 */
export interface MarkdownCodeBlock {
  id: string;
  file_id: string;
  chunk_id: string | null;
  language: string | null;
  code: string;
  line_number: number;
}

// ============================================================================
// Embeddings & Search
// ============================================================================

/**
 * Chunk embedding for semantic search
 */
export interface MarkdownChunkEmbedding {
  id: string;
  chunk_id: string;
  embedding: Buffer; // BLOB in database
  model_name: string;
  dimensions: number;
  created_at: number;
}

/**
 * Search result with similarity score
 */
export interface SearchResult {
  chunk: MarkdownChunk;
  file: MarkdownFile;
  similarity: number;
  context?: string; // Surrounding paragraphs
}

// ============================================================================
// Parser Output Types
// ============================================================================

/**
 * Output from parsing a markdown file
 */
export interface ParsedMarkdown {
  file: MarkdownFile;
  headings: MarkdownHeading[];
  chunks: MarkdownChunk[];
  links: MarkdownLink[];
  metadata: MarkdownMetadata[];
  todos: MarkdownTodo[];
  codeBlocks: MarkdownCodeBlock[];
}

/**
 * Chunking configuration
 */
export interface ChunkConfig {
  maxChunkSize: number; // Max tokens per chunk
  overlapSize: number; // Overlap between chunks
  splitOnHeadings: boolean; // Split at heading boundaries
  preserveContext: boolean; // Include parent headings
}

/**
 * Link analysis result
 */
export interface LinkGraph {
  nodes: LinkGraphNode[];
  edges: LinkGraphEdge[];
}

export interface LinkGraphNode {
  id: string;
  file_path: string;
  title: string | null;
  incomingLinks: number;
  outgoingLinks: number;
}

export interface LinkGraphEdge {
  source: string;
  target: string;
  text: string | null;
  type: LinkType;
}

// ============================================================================
// Quality Check Types
// ============================================================================

/**
 * Terminology inconsistency
 */
export interface TerminologyIssue {
  term: string;
  variants: Array<{
    variant: string;
    count: number;
    locations: Array<{ file: string; line: number }>;
  }>;
  suggestion: string;
}

/**
 * Structure validation issue
 */
export interface StructureIssue {
  type: 'heading_skip' | 'section_imbalance' | 'depth_limit' | 'missing_content';
  severity: 'error' | 'warning' | 'info';
  message: string;
  file_path: string;
  line_number?: number;
  suggestion?: string;
}

/**
 * Readability metrics
 */
export interface ReadabilityMetrics {
  flesch_kincaid_grade: number;
  average_sentence_length: number;
  average_word_length: number;
  passive_voice_ratio: number;
  complex_words_ratio: number;
  readability_score: number; // 0-100, higher is easier
}

/**
 * Duplicate content finding
 */
export interface DuplicateContent {
  chunk1: MarkdownChunk;
  chunk2: MarkdownChunk;
  similarity: number;
  type: 'exact' | 'near';
}

// ============================================================================
// Progress Tracking Types
// ============================================================================

/**
 * Writing statistics
 */
export interface WritingStats {
  total_files: number;
  total_words: number;
  total_sections: number;
  average_words_per_section: number;
  files_by_type: Record<string, number>;
  words_by_file: Array<{ file: string; words: number; percentage: number }>;
}

/**
 * Change tracking
 */
export interface FileChange {
  file_path: string;
  change_type: 'added' | 'modified' | 'deleted';
  words_added: number;
  words_removed: number;
  net_change: number;
  timestamp: number;
}

/**
 * Progress report
 */
export interface ProgressReport {
  current_word_count: number;
  target_word_count: number;
  completion_percentage: number;
  words_remaining: number;
  velocity: number; // Words per day
  estimated_completion_date: Date | null;
  todos_remaining: number;
  files_with_issues: number;
}

// ============================================================================
// Tool Response Types
// ============================================================================

/**
 * Response from search_content tool
 */
export interface SearchContentResponse {
  query: string;
  results: SearchResult[];
  total_found: number;
}

/**
 * Response from generate_outline tool
 */
export interface OutlineNode {
  level: number;
  text: string;
  file_path: string;
  line_number: number;
  word_count?: number;
  children: OutlineNode[];
}

export interface GenerateOutlineResponse {
  outline: OutlineNode[];
  total_sections: number;
  total_words: number;
}

/**
 * Response from check_terminology tool
 */
export interface CheckTerminologyResponse {
  issues: TerminologyIssue[];
  total_terms_checked: number;
  inconsistencies_found: number;
}

/**
 * Response from analyze_link_graph tool
 */
export interface AnalyzeLinkGraphResponse {
  graph: LinkGraph;
  orphaned_files: string[];
  broken_links: MarkdownLink[];
  format: 'json' | 'mermaid' | 'dot';
  visualization?: string;
}

// ============================================================================
// Database Row Types (for SQL queries)
// ============================================================================

/**
 * Raw row from markdown_files table
 */
export interface MarkdownFileRow {
  id: string;
  file_path: string;
  title: string | null;
  content: string;
  content_hash: string;
  word_count: number;
  created_at: number;
  last_modified: number;
  indexed_at: number;
}

/**
 * Raw row from markdown_chunks table
 */
export interface MarkdownChunkRow {
  id: string;
  file_id: string;
  chunk_index: number;
  heading: string | null;
  content: string;
  start_offset: number;
  end_offset: number;
  token_count: number;
  word_count: number;
}

// Type guard functions
export function isMarkdownFile(obj: unknown): obj is MarkdownFile {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'file_path' in obj &&
    'content' in obj
  );
}

export function isMarkdownChunk(obj: unknown): obj is MarkdownChunk {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'file_id' in obj &&
    'content' in obj &&
    'chunk_index' in obj
  );
}
