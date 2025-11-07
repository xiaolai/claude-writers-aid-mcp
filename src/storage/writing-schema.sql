-- ============================================================================
-- Writer's Aid MCP Database Schema
-- Version: 1.0
-- Purpose: Store and index markdown manuscripts for nonfiction writers
-- ============================================================================

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL,
  description TEXT
);

-- ============================================================================
-- Core Content Tables
-- ============================================================================

-- Markdown files in the manuscript
CREATE TABLE IF NOT EXISTS markdown_files (
  id TEXT PRIMARY KEY,
  file_path TEXT UNIQUE NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_modified INTEGER NOT NULL,
  indexed_at INTEGER NOT NULL
);

-- Content chunks for semantic search
CREATE TABLE IF NOT EXISTS markdown_chunks (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  heading TEXT,
  content TEXT NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  token_count INTEGER NOT NULL DEFAULT 0,
  word_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (file_id) REFERENCES markdown_files(id) ON DELETE CASCADE,
  UNIQUE(file_id, chunk_index)
);

-- Heading structure (h1, h2, h3, etc.)
CREATE TABLE IF NOT EXISTS markdown_headings (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  level INTEGER NOT NULL,
  text TEXT NOT NULL,
  slug TEXT NOT NULL,
  line_number INTEGER NOT NULL,
  parent_id TEXT,
  FOREIGN KEY (file_id) REFERENCES markdown_files(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES markdown_headings(id) ON DELETE SET NULL
);

-- ============================================================================
-- Graph & Links
-- ============================================================================

-- Links between documents
CREATE TABLE IF NOT EXISTS markdown_links (
  id TEXT PRIMARY KEY,
  source_file_id TEXT NOT NULL,
  target_file_path TEXT NOT NULL,
  link_text TEXT,
  link_type TEXT NOT NULL,
  source_line INTEGER,
  is_broken BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (source_file_id) REFERENCES markdown_files(id) ON DELETE CASCADE
);

-- ============================================================================
-- Metadata & Frontmatter
-- ============================================================================

-- Frontmatter key-value pairs
CREATE TABLE IF NOT EXISTS markdown_metadata (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  FOREIGN KEY (file_id) REFERENCES markdown_files(id) ON DELETE CASCADE,
  UNIQUE(file_id, key)
);

-- ============================================================================
-- Quality Tracking
-- ============================================================================

-- TODO/FIXME/DRAFT markers
CREATE TABLE IF NOT EXISTS markdown_todos (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  line_number INTEGER NOT NULL,
  marker TEXT NOT NULL,
  text TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (file_id) REFERENCES markdown_files(id) ON DELETE CASCADE
);

-- Terminology variants for consistency checking
CREATE TABLE IF NOT EXISTS markdown_terms (
  id TEXT PRIMARY KEY,
  canonical_form TEXT NOT NULL UNIQUE,
  variants TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_checked INTEGER NOT NULL
);

-- Code blocks
CREATE TABLE IF NOT EXISTS markdown_code_blocks (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  chunk_id TEXT,
  language TEXT,
  code TEXT NOT NULL,
  line_number INTEGER NOT NULL,
  FOREIGN KEY (file_id) REFERENCES markdown_files(id) ON DELETE CASCADE,
  FOREIGN KEY (chunk_id) REFERENCES markdown_chunks(id) ON DELETE SET NULL
);

-- ============================================================================
-- Embeddings & Search
-- ============================================================================

-- Chunk embeddings (BLOB storage)
CREATE TABLE IF NOT EXISTS markdown_chunk_embeddings (
  id TEXT PRIMARY KEY,
  chunk_id TEXT NOT NULL,
  embedding BLOB NOT NULL,
  model_name TEXT NOT NULL,
  dimensions INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (chunk_id) REFERENCES markdown_chunks(id) ON DELETE CASCADE
);

-- Vector search (sqlite-vec virtual table)
-- Created dynamically based on embedding dimensions
-- Example: CREATE VIRTUAL TABLE vec_markdown_chunk_embeddings USING vec0(
--   id TEXT PRIMARY KEY,
--   embedding float[384]
-- );

-- Full-text search fallback
CREATE VIRTUAL TABLE IF NOT EXISTS markdown_chunks_fts USING fts5(
  chunk_id UNINDEXED,
  file_path UNINDEXED,
  heading,
  content,
  tokenize = 'porter unicode61'
);

-- ============================================================================
-- Performance & Caching
-- ============================================================================

-- Query cache (reuse from QueryCache)
CREATE TABLE IF NOT EXISTS query_cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  ttl_ms INTEGER NOT NULL
);

-- ============================================================================
-- VectorStore Infrastructure Tables
-- ============================================================================
-- Note: These tables are required by VectorStore from the reused infrastructure
-- They store vector embeddings for semantic search

CREATE TABLE IF NOT EXISTS message_embeddings (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding BLOB NOT NULL,
  model_name TEXT DEFAULT 'all-MiniLM-L6-v2',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_embed_msg ON message_embeddings(message_id);
CREATE INDEX IF NOT EXISTS idx_embed_model ON message_embeddings(model_name);

-- Decision embeddings (for reused infrastructure)
CREATE TABLE IF NOT EXISTS decision_embeddings (
  id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL,
  embedding BLOB NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dec_embed ON decision_embeddings(decision_id);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- File lookups
CREATE INDEX IF NOT EXISTS idx_file_path ON markdown_files(file_path);
CREATE INDEX IF NOT EXISTS idx_file_modified ON markdown_files(last_modified);
CREATE INDEX IF NOT EXISTS idx_file_hash ON markdown_files(content_hash);

-- Chunk lookups
CREATE INDEX IF NOT EXISTS idx_chunk_file ON markdown_chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_chunk_heading ON markdown_chunks(heading);

-- Heading hierarchy
CREATE INDEX IF NOT EXISTS idx_heading_file ON markdown_headings(file_id);
CREATE INDEX IF NOT EXISTS idx_heading_parent ON markdown_headings(parent_id);
CREATE INDEX IF NOT EXISTS idx_heading_level ON markdown_headings(level);

-- Link graph
CREATE INDEX IF NOT EXISTS idx_link_source ON markdown_links(source_file_id);
CREATE INDEX IF NOT EXISTS idx_link_target ON markdown_links(target_file_path);
CREATE INDEX IF NOT EXISTS idx_link_broken ON markdown_links(is_broken);

-- Metadata lookups
CREATE INDEX IF NOT EXISTS idx_metadata_file ON markdown_metadata(file_id);
CREATE INDEX IF NOT EXISTS idx_metadata_key ON markdown_metadata(key);

-- TODO tracking
CREATE INDEX IF NOT EXISTS idx_todo_file ON markdown_todos(file_id);
CREATE INDEX IF NOT EXISTS idx_todo_priority ON markdown_todos(priority);

-- Code blocks
CREATE INDEX IF NOT EXISTS idx_code_file ON markdown_code_blocks(file_id);
CREATE INDEX IF NOT EXISTS idx_code_language ON markdown_code_blocks(language);

-- Embeddings
CREATE INDEX IF NOT EXISTS idx_embedding_chunk ON markdown_chunk_embeddings(chunk_id);
CREATE INDEX IF NOT EXISTS idx_embedding_model ON markdown_chunk_embeddings(model_name);

-- ============================================================================
-- Initial Data
-- ============================================================================

-- Note: Initial schema version is inserted by SQLiteManager after schema initialization
