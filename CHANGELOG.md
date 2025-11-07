# Changelog

All notable changes to Writer's Aid MCP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-07

### 🎉 Initial Release - Writer's Aid MCP

First release of Writer's Aid MCP - AI-powered manuscript assistant for nonfiction writers. Complete implementation with 20 MCP tools, 13 CLI commands, and comprehensive testing.

### Added

#### Core Infrastructure
- **SQLite Database** with sqlite-vec extension for vector storage
- **Markdown Parsing** with frontmatter, heading, and link extraction
- **Semantic Search** with hybrid FTS5 + vector search
- **Embedding Support** for transformers, OpenAI, and Ollama providers
- **Query Caching** with LRU cache for performance

#### 20 MCP Tools
- **Content Discovery** (5): search_content, find_related_content, extract_themes, find_gaps, find_duplicates
- **Structure** (4): get_outline, validate_structure, get_stats, get_progress
- **Links** (4): check_links, get_link_graph, find_broken_links, suggest_links
- **Quality** (4): check_terminology, analyze_readability, find_todos, check_consistency
- **Progress** (3): get_word_count, track_changes, get_timeline

#### 13 CLI Commands
- **Setup**: init, config
- **Search**: search, find-related, themes
- **Structure**: outline, structure
- **Quality**: check, terminology, todos, links
- **Progress**: stats, changes

#### Analysis & Quality Tools
- StructureValidator, TerminologyChecker, ReadabilityAnalyzer
- DuplicateFinder, GapFinder, TodoExtractor
- LinkHealthChecker, ConsistencyChecker

#### Documentation
- USER-GUIDE.md (400+ lines) - Installation, workflows, best practices
- TOOL-REFERENCE.md (600+ lines) - Complete MCP tool documentation
- CLI-REFERENCE.md (500+ lines) - Detailed CLI command reference

### Testing
- **401 passing tests** (E2E, integration, performance, unit)
- **E2E Tests** (35+ cases) - Full workflow validation
- **Integration Tests** (40+ cases) - Component interactions
- **Performance Tests** (12+ cases) - 100+ file handling
- **Sample Manuscript** with intentional issues for testing
- **Zero TypeScript errors and ESLint warnings**

### Performance
- Index 100+ files in under 30 seconds
- Search in under 2 seconds
- Structure validation in under 5 seconds
- Terminology check in under 10 seconds
- Memory efficient - No leaks during extended operations

### Quality Metrics
- **0 errors, 0 warnings** across entire codebase
- **401 tests passing** with comprehensive coverage
- **100% type safety** with strict TypeScript
- **TDD approach** - Tests written FIRST for all features
- **Production-ready** code quality standards

## [Unreleased]

### Planned Features
- Interactive CLI with TUI
- Real-time file watching and auto-reindexing
- Export to various formats (PDF, EPUB, HTML)
- Custom quality rule definitions
- Team collaboration features
- Version control integration (git blame, history)

---

[0.1.0]: https://github.com/xiaolai/claude-writers-aid-mcp/releases/tag/v0.1.0
