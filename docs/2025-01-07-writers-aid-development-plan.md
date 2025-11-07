# Writer's Aid MCP - Complete Development Plan

**Document Created**: 2025-01-07
**Project Name**: `claude-writers-aid-mcp`
**Fork From**: `claude-conversation-memory-mcp` v1.0.0
**Target Audience**: Nonfiction writers, technical documentation authors, content creators
**Working Directory**: `/Users/joker/github/xiaolai/claude-writers-aid-mcp`
**Target Release**: v0.1.0 (6 weeks from start)

---

## Executive Summary

This document outlines the complete development plan for forking `claude-conversation-memory-mcp` to create `claude-writers-aid-mcp`, a specialized MCP server for nonfiction writers. The new tool provides AI-powered manuscript assistance including semantic search, structure validation, quality checks, and progress tracking.

###

 Key Differences

| Aspect | Conversation Memory | Writer's Aid |
|--------|-------------------|--------------|
| **Audience** | Developers using Claude Code | Nonfiction writers |
| **Content Source** | JSONL conversation files | Markdown manuscripts |
| **Primary Use** | Remember past decisions | Draft, revise, publish |
| **Search Focus** | What did we discuss? | What have I written? |
| **Quality Checks** | Code decisions, mistakes | Terminology, structure, readability |
| **Integration** | Git commits, tool uses | Writing workflow, publishing |

---

## Table of Contents

1. [Project Setup](#project-setup)
2. [Cleanup Phase](#cleanup-phase)
3. [Implementation Phases (6 weeks)](#implementation-phases)
4. [MCP Tool Definitions](#mcp-tool-definitions)
5. [CLI Commands](#cli-commands)
6. [Database Schema](#database-schema)
7. [Testing Strategy](#testing-strategy)
8. [Release Checklist](#release-checklist)
9. [Post-Release Roadmap](#post-release-roadmap)

---

## Project Setup

### Fork Process

```bash
# Fork by copying
cd /Users/joker/github/xiaolai
cp -R claude-conversation-memory-mcp claude-writers-aid-mcp
cd claude-writers-aid-mcp

# Update git remotes (after creating GitHub repo)
git remote rename origin upstream
git remote add origin https://github.com/xiaolai/claude-writers-aid-mcp.git

# Create feature branch
git checkout -b feature/initial-fork-setup
```

### Initial File Updates

**package.json**:
```json
{
  "name": "claude-writers-aid-mcp",
  "version": "0.1.0",
  "description": "MCP server for nonfiction writers - AI-powered manuscript assistant",
  "keywords": [
    "mcp",
    "writing",
    "manuscript",
    "documentation",
    "nonfiction",
    "markdown",
    "author-tools",
    "semantic-search"
  ],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/xiaolai/claude-writers-aid-mcp.git"
  }
}
```

---

## Cleanup Phase

### Files to Delete (41 files)

**Parsers** (5):
- `src/parsers/ConversationParser.ts`
- `src/parsers/DecisionExtractor.ts`
- `src/parsers/MistakeExtractor.ts`
- `src/parsers/RequirementsExtractor.ts`
- `src/parsers/GitIntegrator.ts`

**Storage** (2):
- `src/storage/ConversationStorage.ts`
- `src/storage/schema.sql`

**Search** (1):
- `src/search/SemanticSearch.ts`

**Documentation** (6):
- All files in `src/documentation/`

**Tools** (3):
- `src/tools/ToolHandlers.ts`
- `src/tools/ToolDefinitions.ts`
- `src/tools/MigrationToolHandlers.ts`

**Utils** (1):
- `src/utils/ProjectMigration.ts`

**Main** (1):
- `src/ConversationMemory.ts`

**Tests** (20+):
- All conversation-specific test files

**Documentation**:
- Clear `docs/` except this development plan

### Directories to Delete

```bash
rm -rf src/parsers
rm -rf src/documentation
rm -rf src/__tests__/integration
rm -rf src/__tests__/regression
```

### Files to Keep (Core Infrastructure)

**Storage**:
- `src/storage/SQLiteManager.ts` ✓
- `src/storage/migrations.ts` ✓

**Embeddings** (all files):
- `src/embeddings/VectorStore.ts` ✓
- `src/embeddings/EmbeddingGenerator.ts` ✓
- `src/embeddings/providers/*` ✓
- `src/embeddings/ConfigManager.ts` ✓
- `src/embeddings/ModelRegistry.ts` ✓

**Cache**:
- `src/cache/QueryCache.ts` ✓

**Utils**:
- `src/utils/Logger.ts` ✓
- `src/utils/sanitization.ts` ✓
- `src/utils/constants.ts` ✓

**CLI** (will update):
- `src/cli/index.ts`
- `src/cli/commands.ts`
- `src/cli/help.ts`

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal**: Clean fork with basic infrastructure

**Tasks**:
1. ✅ Complete fork and cleanup
2. ✅ Create `src/storage/writing-schema.sql`
3. ✅ Create `src/storage/WritingStorage.ts`
   - CRUD for files, chunks, headings, links
   - Caching support (reuse QueryCache)
   - Transaction-based operations
4. ✅ Create `src/markdown/types.ts`
5. ✅ Update `src/index.ts`
6. ✅ Create basic tests (20+ tests)

**Deliverables**:
- Clean fork with conversation features removed
- New database schema
- WritingStorage implementation
- All builds passing
- Commit: "Phase 1: Foundation complete"

---

### Phase 2: Markdown Processing (Week 2)

**Goal**: Parse and index markdown files

**Components**:

**1. MarkdownParser** (`src/markdown/MarkdownParser.ts`):
- Parse frontmatter (YAML/TOML/JSON)
- Extract headings with hierarchy
- Extract content sections
- Extract code blocks
- Tests: 15+

**2. MarkdownChunker** (`src/markdown/MarkdownChunker.ts`):
- Heading-based chunking
- Max 1000 tokens per chunk
- 100-token overlap
- Preserve heading context
- Tests: 12+

**3. MetadataExtractor** (`src/markdown/MetadataExtractor.ts`):
- Extract frontmatter
- Parse tags, dates, authors
- Custom metadata support
- Tests: 10+

**4. LinkAnalyzer** (`src/markdown/LinkAnalyzer.ts`):
- Extract [[wiki-links]]
- Extract [markdown](links)
- Detect broken links
- Build graph structure
- Tests: 15+

**Deliverables**:
- 4 core markdown components
- 52+ tests total
- Commit: "Phase 2: Markdown processing complete"

---

### Phase 3: Search & Embeddings (Week 3)

**Goal**: Semantic search for manuscripts

**Components**:

**1. VectorStore Extension** (`src/embeddings/VectorStore.ts`):
- Add `storeMarkdownChunkEmbedding()`
- Add `searchMarkdownChunks()`
- Reuse vec0/BLOB dual-mode
- Tests: 8+

**2. ManuscriptSearch** (`src/search/ManuscriptSearch.ts`):
- Semantic search with filters
- Fallback to FTS5
- Batch embedding generation
- Result ranking
- Tests: 20+

**3. ThemeExtractor** (`src/search/ThemeExtractor.ts`):
- Cluster chunks by similarity
- Extract representative sections
- Generate theme names
- Tests: 10+

**4. RelatedContentFinder** (`src/search/RelatedContentFinder.ts`):
- Find similar chunks/files
- Exclude duplicates
- Tests: 12+

**Deliverables**:
- Semantic search working
- Theme extraction
- 50+ tests total
- Commit: "Phase 3: Search and embeddings complete"

---

### Phase 4: Quality Tools (Week 4)

**Goal**: Automated quality checks

**Components**:

**Analysis Tools** (`src/analysis/`):
1. **TerminologyChecker.ts** - Detect term variants (12 tests)
2. **StructureValidator.ts** - Check heading hierarchy (15 tests)
3. **ReadabilityAnalyzer.ts** - Flesch-Kincaid scores (10 tests)
4. **DuplicateFinder.ts** - Find redundancy (10 tests)
5. **GapFinder.ts** - Undefined terms (8 tests)

**Quality Tools** (`src/quality/`):
1. **TodoExtractor.ts** - Find TODO/FIXME markers (8 tests)
2. **LinkHealthChecker.ts** - Check links (12 tests)
3. **ConsistencyChecker.ts** - Cross-document checks (10 tests)

**Deliverables**:
- 8 quality/analysis components
- 85+ tests total
- Commit: "Phase 4: Quality tools complete"

---

### Phase 5: MCP Tools & CLI (Week 5)

**Goal**: Expose functionality through MCP and CLI

**MCP Tools** (`src/tools/`):
1. **WriterToolDefinitions.ts** - Define 20 tools
2. **WriterToolHandlers.ts** - Implement handlers
3. **Tests**: 25+

**Main Orchestrator** (`src/WritersAid.ts`):
- Coordinate all components
- Indexing pipeline
- Caching enabled by default
- Tests: 15+

**CLI Updates** (`src/cli/`):
- Rewrite `commands.ts` with 12 writer-focused commands
- Update `help.ts`
- Colorful output with chalk
- Tests: 12+

**MCP Server** (`src/mcp-server.ts`):
- Register writer tools
- Remove conversation tools

**Deliverables**:
- 20 MCP tools working
- 12 CLI commands working
- 52+ tests total
- Commit: "Phase 5: MCP tools and CLI complete"

---

### Phase 6: Testing & Documentation (Week 6)

**Goal**: Production-ready release

**Testing**:
1. Create sample manuscript
   - Multiple chapters
   - Frontmatter examples
   - Cross-references
   - Intentional issues
2. End-to-end tests (20+)
3. Integration tests
4. Performance testing

**Documentation**:
1. Rewrite `README.md` for writers
2. Create `docs/USER-GUIDE.md`
3. Create `docs/TOOL-REFERENCE.md`
4. Create `docs/CLI-REFERENCE.md`
5. Update `CHANGELOG.md` for v0.1.0

**Quality Assurance**:
- `npm run type-check` ✓
- `npm run lint` ✓ (0 warnings)
- `npm run build` ✓
- `npm test` ✓ (200+ tests)

**Performance Validation**:
- Index 100+ markdown files
- Search latency < 2 seconds
- Quality checks < 5 seconds

**Deliverables**:
- Complete documentation
- All quality checks passing
- Ready for v0.1.0 release
- Commit: "Phase 6: Testing and documentation complete"

---

## MCP Tool Definitions

### Content Discovery (5 tools)

**1. search_content**
```typescript
{
  name: "search_content",
  description: "Semantic search across all manuscript content",
  inputSchema: {
    query: string,          // Search query
    scope?: string,         // e.g., "chapters/*.md"
    limit?: number,         // Max results (default: 10)
    context_size?: number   // Paragraphs around match
  }
}
```

**2. find_related_sections**
```typescript
{
  name: "find_related_sections",
  description: "Find content semantically similar to given text",
  inputSchema: {
    reference_text: string,
    limit?: number,
    exclude_file?: string
  }
}
```

**3. extract_themes**
```typescript
{
  name: "extract_themes",
  description: "Cluster content into main themes/topics",
  inputSchema: {
    scope?: string,
    num_themes?: number
  }
}
```

**4. track_concept_evolution**
```typescript
{
  name: "track_concept_evolution",
  description: "Show how concept is discussed across documents",
  inputSchema: {
    concept: string,
    chronological?: boolean
  }
}
```

**5. find_gaps**
```typescript
{
  name: "find_gaps",
  description: "Find terms mentioned but not explained",
  inputSchema: {
    scope?: string
  }
}
```

### Structure (4 tools)

**6. generate_outline**
```typescript
{
  name: "generate_outline",
  description: "Create hierarchical outline from content",
  inputSchema: {
    scope?: string,
    depth?: number,
    include_word_counts?: boolean
  }
}
```

**7. suggest_reorganization**
```typescript
{
  name: "suggest_reorganization",
  description: "Suggest better content organization",
  inputSchema: {
    current_structure?: string,
    optimization?: "coherence" | "flow" | "complexity"
  }
}
```

**8. find_orphaned_sections**
```typescript
{
  name: "find_orphaned_sections",
  description: "Find sections with no incoming links",
  inputSchema: {
    scope?: string
  }
}
```

**9. validate_structure**
```typescript
{
  name: "validate_structure",
  description: "Check heading hierarchy and section balance",
  inputSchema: {
    file_path?: string,
    checks?: string[]
  }
}
```

### Links (4 tools)

**10. analyze_link_graph**
```typescript
{
  name: "analyze_link_graph",
  description: "Visualize connections between documents",
  inputSchema: {
    scope?: string,
    format?: "mermaid" | "json" | "dot"
  }
}
```

**11. find_broken_links**
```typescript
{
  name: "find_broken_links",
  description: "Detect broken internal and external links",
  inputSchema: {
    check_external?: boolean,
    scope?: string
  }
}
```

**12. suggest_cross_references**
```typescript
{
  name: "suggest_cross_references",
  description: "Suggest where to add links between sections",
  inputSchema: {
    min_similarity?: number,
    exclude_existing_links?: boolean
  }
}
```

**13. trace_reference_chain**
```typescript
{
  name: "trace_reference_chain",
  description: "Follow concept through linked documents",
  inputSchema: {
    start_file: string,
    end_file: string,
    concept?: string
  }
}
```

### Quality (4 tools)

**14. check_terminology**
```typescript
{
  name: "check_terminology",
  description: "Find inconsistent term usage",
  inputSchema: {
    scope?: string,
    auto_detect?: boolean,
    terms?: string[]
  }
}
```

**15. find_todos**
```typescript
{
  name: "find_todos",
  description: "Extract all TODO/FIXME/DRAFT markers",
  inputSchema: {
    scope?: string,
    markers?: string[],
    group_by?: "file" | "priority" | "marker"
  }
}
```

**16. check_readability**
```typescript
{
  name: "check_readability",
  description: "Analyze readability metrics",
  inputSchema: {
    file_path?: string,
    metrics?: string[]
  }
}
```

**17. find_duplicates**
```typescript
{
  name: "find_duplicates",
  description: "Find near-duplicate content",
  inputSchema: {
    scope?: string,
    similarity_threshold?: number,
    min_length?: number
  }
}
```

### Progress (3 tools)

**18. get_writing_stats**
```typescript
{
  name: "get_writing_stats",
  description: "Overall project statistics",
  inputSchema: {
    scope?: string,
    breakdown_by?: "chapter" | "date" | "tag"
  }
}
```

**19. track_changes**
```typescript
{
  name: "track_changes",
  description: "Show what changed since timestamp",
  inputSchema: {
    since?: string,
    scope?: string,
    summary_level?: "section" | "file" | "line"
  }
}
```

**20. generate_progress_report**
```typescript
{
  name: "generate_progress_report",
  description: "Create progress dashboard",
  inputSchema: {
    target_word_count?: number,
    scope?: string,
    include_todos?: boolean
  }
}
```

---

## CLI Commands

### 1. Setup Commands

**writers-aid init [directory]**
```bash
writers-aid init ./my-book
writers-aid init .  # Current directory
```
Initialize writing project, scan files, create index.

**writers-aid config [get|set] [key] [value]**
```bash
writers-aid config
writers-aid config set model nomic-embed-text
writers-aid config set provider ollama
```
View/edit configuration.

---

### 2. Search Commands

**writers-aid search \<query\>**
```bash
writers-aid search "async programming"
writers-aid search "climate change" --file chapter-3.md
writers-aid search "microservices" --context 3
```
Semantic search across manuscript.

**writers-aid find-related \<file\>**
```bash
writers-aid find-related chapter-3.md
writers-aid find-related chapter-3.md --limit 5
```
Find content similar to file/section.

**writers-aid themes**
```bash
writers-aid themes
writers-aid themes --num 8 --scope "chapters/*.md"
```
Extract main themes.

---

### 3. Structure Commands

**writers-aid outline**
```bash
writers-aid outline
writers-aid outline --depth 2 --with-stats
```
Generate hierarchical outline.

**writers-aid structure [file]**
```bash
writers-aid structure chapter-5.md
writers-aid structure --all
```
Validate document structure.

---

### 4. Quality Commands

**writers-aid check [file]**
```bash
writers-aid check
writers-aid check --file chapter-3.md
writers-aid check --quick
```
Run all quality checks.

**writers-aid links**
```bash
writers-aid links
writers-aid links --broken-only
writers-aid links --graph
```
Check link health.

**writers-aid todos**
```bash
writers-aid todos
writers-aid todos --priority high
writers-aid todos --group-by file
```
List all TODOs.

**writers-aid terminology**
```bash
writers-aid terminology
writers-aid terminology --term "email"
```
Check term consistency.

---

### 5. Progress Commands

**writers-aid stats**
```bash
writers-aid stats
writers-aid stats --by-chapter
writers-aid stats --since "7 days ago"
```
Show writing statistics.

**writers-aid changes**
```bash
writers-aid changes
writers-aid changes --since yesterday
writers-aid changes --since "2025-01-01"
```
Show recent changes.

---

## Database Schema

See `src/storage/writing-schema.sql` for complete schema.

### Core Tables

**markdown_files**
- id, file_path, title, content
- content_hash, word_count
- created_at, last_modified, indexed_at

**markdown_chunks**
- id, file_id, chunk_index
- heading, content
- start_offset, end_offset
- token_count, word_count

**markdown_headings**
- id, file_id, level, text, slug
- line_number, parent_id

**markdown_links**
- id, source_file_id, target_file_path
- link_text, link_type
- source_line, is_broken

**markdown_metadata**
- id, file_id, key, value

**markdown_todos**
- id, file_id, line_number
- marker, text, priority

**markdown_terms**
- id, canonical_form, variants
- usage_count, last_checked

**markdown_chunk_embeddings**
- id, chunk_id, embedding
- model_name, dimensions

---

## Testing Strategy

### Test Categories

**Unit Tests** (150+ tests):
- Storage layer (20 tests)
- Markdown processing (52 tests)
- Search & embeddings (50 tests)
- Quality tools (85 tests)
- MCP tools (25 tests)
- CLI commands (12 tests)

**Integration Tests** (30+ tests):
- End-to-end workflows
- MCP server integration
- CLI integration

**Performance Tests**:
- Index 100+ files
- Search latency
- Quality check speed

### Test Files Structure

```
src/__tests__/
├── unit/
│   ├── markdown/
│   │   ├── MarkdownParser.test.ts
│   │   ├── MarkdownChunker.test.ts
│   │   ├── MetadataExtractor.test.ts
│   │   └── LinkAnalyzer.test.ts
│   ├── analysis/
│   │   ├── TerminologyChecker.test.ts
│   │   ├── StructureValidator.test.ts
│   │   └── ...
│   ├── quality/
│   ├── search/
│   └── storage/
│       └── WritingStorage.test.ts
├── integration/
│   ├── writing-end-to-end.test.ts
│   └── cli-integration.test.ts
└── fixtures/
    └── sample-manuscripts/
        ├── chapter-01.md
        ├── chapter-02.md
        └── ...
```

---

## Release Checklist

### Pre-Release (v0.1.0)

- [ ] All 200+ tests passing
- [ ] Zero TypeScript errors/warnings
- [ ] Build succeeds
- [ ] Lint passes (0 warnings)
- [ ] Sample manuscript indexes successfully
- [ ] All 20 MCP tools working
- [ ] All 12 CLI commands working
- [ ] Documentation complete
- [ ] README updated for writers
- [ ] CHANGELOG.md updated
- [ ] Performance validated

### Release Process

```bash
# Merge to main
git checkout main
git merge --no-ff feature/complete-implementation

# Update version
npm version 0.1.0

# Update CHANGELOG
# (Add v0.1.0 entry)

# Commit
git add .
git commit -m "Release v0.1.0 - Initial Writer's Aid MCP"

# Push
git pull origin main --rebase
git push origin main

# Tag
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0

# Publish
npm publish
```

### Post-Release

- [ ] Create GitHub Release
- [ ] Share on social media
- [ ] Post in MCP community
- [ ] Gather user feedback
- [ ] Start v0.2.0 planning

---

## Post-Release Roadmap

### v0.2.0 (Advanced Features)
- Citation management
- Bibliography generation
- Export to EPUB/PDF
- Version comparison
- Multi-language support

### v0.3.0 (Collaboration)
- Multi-author attribution
- Review workflow
- Comment tracking
- Change approval system

### v0.4.0 (AI Integration)
- Writing suggestions using Claude
- Grammar and style improvements
- Content generation assistance
- Automated summaries

---

## Success Criteria

### Functionality
- ✅ Index 100+ markdown files in < 10 seconds
- ✅ Search returns results in < 2 seconds
- ✅ Quality checks complete in < 5 seconds
- ✅ Link graph correctly tracks relationships
- ✅ Theme extraction produces meaningful clusters
- ✅ Terminology checker finds inconsistencies
- ✅ Structure validator catches issues

### Quality
- ✅ 0 TypeScript errors
- ✅ 0 TypeScript warnings
- ✅ 200+ tests passing
- ✅ 100% type safety
- ✅ Comprehensive documentation

### User Experience
- ✅ Clear, actionable tool responses
- ✅ Helpful error messages
- ✅ Readable CLI output
- ✅ No configuration required for basic usage
- ✅ Works on macOS, Linux, Windows

---

## Timeline Summary

| Phase | Duration | Deliverable | Tests |
|-------|----------|-------------|-------|
| Phase 1 | 1 week | Storage layer | 20+ |
| Phase 2 | 1 week | Markdown processing | 52+ |
| Phase 3 | 1 week | Search & embeddings | 50+ |
| Phase 4 | 1 week | Quality tools | 85+ |
| Phase 5 | 1 week | MCP & CLI | 52+ |
| Phase 6 | 1 week | Testing & docs | 20+ |
| **Total** | **6 weeks** | **v0.1.0 Release** | **280+ tests** |

---

## Maintenance Plan

### Ongoing Tasks
- Monitor GitHub issues
- Respond to user feedback
- Update dependencies monthly
- Add new embedding models as available
- Expand tool set based on user needs

### Version Cadence
- Patch releases (0.1.x): Bug fixes, weekly if needed
- Minor releases (0.x.0): New features, monthly
- Major releases (x.0.0): Breaking changes, yearly

---

## Contributors

- **Lead Developer**: Xiaolai
- **AI Assistant**: Claude (Anthropic)
- **Community**: Contributions welcome!

---

## License

MIT License - Same as original project

---

**Document Version**: 1.0
**Last Updated**: 2025-01-07
**Status**: Ready for Implementation
