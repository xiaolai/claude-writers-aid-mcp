# Writer's Aid MCP - User Guide

Complete guide for nonfiction writers using Writer's Aid MCP for manuscript management, quality control, and AI-assisted writing.

## Table of Contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI Commands](#cli-commands)
- [MCP Tools](#mcp-tools)
- [Workflows](#workflows)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Introduction

Writer's Aid MCP is an AI-powered manuscript assistant designed specifically for nonfiction writers. It helps you:

- **Organize** large manuscripts with semantic search and cross-referencing
- **Validate** structure, terminology consistency, and document quality
- **Track** progress, TODOs, and writing statistics
- **Discover** themes, related content, and knowledge gaps
- **Maintain** link health and document consistency

### Key Features

✅ **20 MCP Tools** - Claude Code integration for AI-assisted writing
✅ **12 CLI Commands** - Standalone command-line interface
✅ **Semantic Search** - Find content by meaning, not just keywords
✅ **Quality Validation** - Structure, terminology, readability checks
✅ **Link Health** - Track internal and external link integrity
✅ **TODO Tracking** - Extract and prioritize TODOs, FIXMEs
✅ **Statistics** - Word counts, progress tracking, writing analytics

## Installation

### Prerequisites

- Node.js 18+ ([download](https://nodejs.org/))
- Git ([download](https://git-scm.com/))

### Install via npm

```bash
npm install -g claude-writers-aid-mcp
```

### Install from Source

```bash
git clone https://github.com/xiaolai/claude-writers-aid-mcp.git
cd claude-writers-aid-mcp
npm install
npm run build
npm link
```

### Configure for Claude Code

Add to your `~/.claude/config.json`:

```json
{
  "mcpServers": {
    "writers-aid": {
      "command": "writers-aid",
      "args": []
    }
  }
}
```

Restart Claude Code to enable the MCP tools.

## Quick Start

### 1. Initialize Your Project

Navigate to your manuscript directory and initialize:

```bash
cd ~/my-book
writers-aid init
```

This creates `.writers-aid/manuscript.db` and indexes all markdown files.

### 2. Run Your First Search

```bash
writers-aid search "authentication"
```

### 3. Check Quality

```bash
writers-aid check
```

### 4. View Statistics

```bash
writers-aid stats --by-chapter
```

## CLI Commands

### Setup Commands

#### `writers-aid init [directory]`

Initialize a new writing project.

```bash
writers-aid init                    # Current directory
writers-aid init ./my-book          # Specific directory
```

Creates database and indexes all `.md` files.

#### `writers-aid config [action] [key] [value]`

View or edit configuration.

```bash
writers-aid config                  # View all config
writers-aid config get provider     # Get specific value
writers-aid config set key value    # Set value
```

### Search Commands

#### `writers-aid search <query>`

Search across manuscript content.

```bash
writers-aid search "API design"
writers-aid search "authentication" --limit 5
writers-aid search "oauth" --file chapter3.md
```

**Options:**
- `-p, --project <path>` - Project directory (default: current)
- `-l, --limit <number>` - Maximum results (default: 10)
- `-f, --file <file>` - Search specific file

#### `writers-aid find-related <file>`

Find content similar to a file.

```bash
writers-aid find-related chapter1.md
writers-aid find-related intro.md --limit 3
```

**Options:**
- `-p, --project <path>` - Project directory
- `-l, --limit <number>` - Maximum results (default: 5)

#### `writers-aid themes`

Extract main themes from manuscript.

```bash
writers-aid themes                  # All themes
writers-aid themes --num 10         # Top 10 themes
writers-aid themes --scope chapters/*
```

**Options:**
- `-p, --project <path>` - Project directory
- `-n, --num <number>` - Number of themes (default: 5)
- `-s, --scope <pattern>` - File scope pattern

### Structure Commands

#### `writers-aid outline`

Generate hierarchical outline.

```bash
writers-aid outline
writers-aid outline --with-stats
writers-aid outline --depth 2
```

**Options:**
- `-p, --project <path>` - Project directory
- `-d, --depth <number>` - Outline depth (default: 3)
- `-w, --with-stats` - Include word counts

#### `writers-aid structure [file]`

Validate document structure.

```bash
writers-aid structure chapter1.md
writers-aid structure --all
```

**Options:**
- `-p, --project <path>` - Project directory
- `-a, --all` - Validate all files

**Detects:**
- Skipped heading levels (H1 → H3)
- Duplicate headings
- Deep nesting (H5+)
- Missing headings

### Quality Commands

#### `writers-aid check [file]`

Run comprehensive quality checks.

```bash
writers-aid check                   # All files
writers-aid check chapter1.md       # Specific file
writers-aid check --quick           # Quick mode
```

**Options:**
- `-p, --project <path>` - Project directory
- `-q, --quick` - Skip slow checks

**Includes:**
- Structure validation
- Readability analysis
- Duplicate detection
- TODO extraction

#### `writers-aid terminology`

Check term consistency.

```bash
writers-aid terminology             # Auto-detect
writers-aid terminology --term "email"
```

**Options:**
- `-p, --project <path>` - Project directory
- `-t, --term <term>` - Specific term to check

**Detects:**
- email/e-mail/Email variants
- API/api/Api inconsistencies
- database/data-base variants
- Custom term variations

#### `writers-aid todos`

List all TODOs.

```bash
writers-aid todos
writers-aid todos --group-by priority
writers-aid todos --priority high
```

**Options:**
- `-p, --project <path>` - Project directory
- `-g, --group-by <field>` - Group by: file, priority, marker
- `--priority <level>` - Filter by priority

**Markers Detected:**
- TODO (medium priority)
- FIXME (high priority)
- HACK (high priority)
- WIP (medium priority)
- NOTE (low priority)

#### `writers-aid links`

Check link health.

```bash
writers-aid links                   # All links
writers-aid links --broken-only
```

**Options:**
- `-p, --project <path>` - Project directory
- `-b, --broken-only` - Show only broken links
- `-g, --graph` - Show link graph

**Checks:**
- Internal markdown links
- Wiki-style links [[page]]
- External URLs
- Anchor links

### Progress Commands

#### `writers-aid stats`

Show writing statistics.

```bash
writers-aid stats
writers-aid stats --by-chapter
writers-aid stats --since yesterday
```

**Options:**
- `-p, --project <path>` - Project directory
- `-c, --by-chapter` - Break down by chapter
- `-s, --since <date>` - Changes since date

**Displays:**
- Total word count
- File count
- Average words per file
- Chapter breakdown

#### `writers-aid changes`

Show recent changes.

```bash
writers-aid changes
writers-aid changes --since yesterday
```

**Options:**
- `-p, --project <path>` - Project directory
- `-s, --since <time>` - Time filter (today, yesterday, week)

## MCP Tools

When using Claude Code, Writer's Aid provides 20 MCP tools:

### Content Discovery (5 tools)

- `search_content` - Semantic search across manuscript
- `find_related_content` - Find similar content
- `extract_themes` - Extract main themes
- `find_gaps` - Find undefined terms
- `find_duplicates` - Detect duplicate content

### Structure (4 tools)

- `get_outline` - Generate outline
- `validate_structure` - Check heading hierarchy
- `get_stats` - Get statistics
- `get_progress` - Track progress

### Links (4 tools)

- `check_links` - Validate link health
- `get_link_graph` - Visualize connections
- `find_broken_links` - Find broken links
- `suggest_links` - Suggest cross-references

### Quality (4 tools)

- `check_terminology` - Check term consistency
- `analyze_readability` - Analyze readability
- `find_todos` - Extract TODOs
- `check_consistency` - Check style consistency

### Progress (3 tools)

- `get_word_count` - Get word counts
- `track_changes` - Track changes over time
- `get_timeline` - View writing timeline

See [TOOL-REFERENCE.md](TOOL-REFERENCE.md) for complete tool documentation.

## Workflows

### Daily Writing Workflow

1. **Start Writing**
   ```bash
   writers-aid stats
   ```

2. **Search for Related Content**
   ```bash
   writers-aid search "topic"
   ```

3. **Check Progress**
   ```bash
   writers-aid stats --by-chapter
   ```

4. **Review TODOs**
   ```bash
   writers-aid todos --priority high
   ```

### Weekly Review Workflow

1. **Quality Check**
   ```bash
   writers-aid check
   ```

2. **Structure Validation**
   ```bash
   writers-aid structure --all
   ```

3. **Terminology Consistency**
   ```bash
   writers-aid terminology
   ```

4. **Link Health**
   ```bash
   writers-aid links
   ```

5. **Progress Review**
   ```bash
   writers-aid changes --since week
   ```

### Pre-Publication Workflow

1. **Comprehensive Check**
   ```bash
   writers-aid check
   ```

2. **Validate All Structure**
   ```bash
   writers-aid structure --all
   ```

3. **Check All Links**
   ```bash
   writers-aid links
   ```

4. **Review All TODOs**
   ```bash
   writers-aid todos
   ```

5. **Terminology Audit**
   ```bash
   writers-aid terminology
   ```

6. **Readability Check**
   - Review files with low Flesch Reading Ease scores
   - Simplify complex sentences
   - Break up long paragraphs

## Best Practices

### File Organization

**Recommended structure:**

```
my-book/
├── chapters/
│   ├── 01-introduction.md
│   ├── 02-background.md
│   └── ...
├── appendix/
│   ├── glossary.md
│   └── references.md
├── drafts/
│   └── ...
└── README.md
```

### Writing Markdown

**Use consistent heading levels:**

```markdown
# Chapter Title (H1)
## Section (H2)
### Subsection (H3)
#### Details (H4)
```

**Avoid skipping levels:**

```markdown
# Title
### Subsection    ❌ Skipped H2
```

```markdown
# Title
## Section        ✅ Correct
### Subsection
```

### Terminology Consistency

**Pick one variant and stick to it:**

- ✅ Consistent: `email` throughout
- ❌ Inconsistent: `email`, `e-mail`, `Email`

- ✅ Consistent: `API` throughout
- ❌ Inconsistent: `API`, `api`, `Api`

### TODO Management

**Use priority markers:**

```markdown
<!-- TODO: Add examples -->          (medium)
<!-- FIXME: Fix incorrect data -->   (high)
<!-- WIP: Section in progress -->    (medium)
<!-- NOTE: Remember to update -->    (low)
```

### Link Management

**Use relative paths for internal links:**

```markdown
[Chapter 2](chapter2.md)           ✅ Good
[Chapter 2](./chapter2.md)         ✅ Good
[Chapter 2](/full/path/chapter2.md) ❌ Avoid
```

**Test external links regularly:**

```bash
writers-aid links
```

## Troubleshooting

### Database Issues

**Problem:** Database is corrupted

**Solution:**
```bash
rm -rf .writers-aid
writers-aid init
```

### Search Not Finding Content

**Problem:** Recently added files not appearing in search

**Solution:** Re-index the project
```bash
writers-aid init
```

### Performance Issues

**Problem:** Commands are slow on large manuscripts

**Solution:**
- Use file scope filters: `--file chapter1.md`
- Use quick mode: `--quick`
- Limit results: `--limit 5`

### Memory Issues

**Problem:** Out of memory errors on large projects

**Solution:**
- Process files in batches
- Increase Node.js memory:
  ```bash
  NODE_OPTIONS="--max-old-space-size=4096" writers-aid init
  ```

## Support

- **Issues:** [GitHub Issues](https://github.com/xiaolai/claude-writers-aid-mcp/issues)
- **Documentation:** [docs/](https://github.com/xiaolai/claude-writers-aid-mcp/tree/main/docs)
- **Examples:** [examples/](https://github.com/xiaolai/claude-writers-aid-mcp/tree/main/examples)

## Next Steps

- Read [TOOL-REFERENCE.md](TOOL-REFERENCE.md) for MCP tool details
- Read [CLI-REFERENCE.md](CLI-REFERENCE.md) for command-line reference
- Check [CHANGELOG.md](../CHANGELOG.md) for recent updates

---

**Version:** 0.1.0
**Last Updated:** January 2025
