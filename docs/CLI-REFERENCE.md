# Writer's Aid MCP - CLI Reference

Complete command-line interface reference for all 13 commands.

## Table of Contents

- [Global Options](#global-options)
- [Setup Commands](#setup-commands)
- [Search Commands](#search-commands)
- [Structure Commands](#structure-commands)
- [Quality Commands](#quality-commands)
- [Progress Commands](#progress-commands)
- [Exit Codes](#exit-codes)
- [Configuration](#configuration)

## Global Options

All commands support these global options:

```bash
-V, --version          Output version number
-h, --help             Display help for command
```

## Setup Commands

### init

Initialize a new writing project.

**Synopsis:**

```bash
writers-aid init [directory] [options]
```

**Arguments:**

- `directory` - Project directory (default: current directory)

**Description:**

Creates `.writers-aid/` directory with SQLite database and indexes all markdown files in the project.

**Examples:**

```bash
# Initialize in current directory
writers-aid init

# Initialize in specific directory
writers-aid init ./my-book

# Initialize parent directory
writers-aid init ..
```

**Output:**

```
Initializing writing project...
✓ Initialized writing project
  Database: /path/to/project/.writers-aid/manuscript.db
  Indexed 15 files
  Created 47 chunks
```

**What It Does:**

1. Creates `.writers-aid/` directory
2. Initializes SQLite database with schema
3. Loads sqlite-vec extension for embeddings
4. Scans for all `.md` files recursively
5. Parses markdown (frontmatter, headings, links)
6. Chunks content into searchable segments
7. Extracts links and creates link graph

**Files Created:**

- `.writers-aid/manuscript.db` - Main database
- `.writers-aid/` - Project directory (can be gitignored)

---

### config

View or edit configuration settings.

**Synopsis:**

```bash
writers-aid config [action] [key] [value]
```

**Arguments:**

- `action` - Action: get, set (optional)
- `key` - Configuration key (optional)
- `value` - Configuration value (optional)

**Description:**

Manages Writer's Aid configuration. Without arguments, displays all settings.

**Examples:**

```bash
# View all configuration
writers-aid config

# Get specific value
writers-aid config get provider

# Set value
writers-aid config set provider transformers
```

**Configuration Keys:**

- `provider` - Embedding provider (transformers, openai, ollama)
- `model` - Model name
- `dimensions` - Embedding dimensions

**Output:**

```
Configuration:
  Provider: transformers (fallback)
  Model: Xenova/all-MiniLM-L6-v2
  Dimensions: 384
```

## Search Commands

### search

Search across manuscript content.

**Synopsis:**

```bash
writers-aid search <query> [options]
```

**Arguments:**

- `query` - Search query (required)

**Options:**

- `-p, --project <path>` - Project directory (default: ".")
- `-l, --limit <number>` - Maximum results (default: "10")
- `-f, --file <file>` - Search in specific file

**Description:**

Performs semantic search across all manuscript content. Understands meaning, not just keywords.

**Examples:**

```bash
# Basic search
writers-aid search "authentication"

# Limit results
writers-aid search "API design" --limit 5

# Search in specific file
writers-aid search "oauth" --file chapters/03-security.md

# Search in different project
writers-aid search "database" --project ~/other-book
```

**Output:**

```
Found 3 result(s):

📄 chapters/03-security.md
   OAuth 2.0 is the industry-standard protocol for authorization...

📄 chapters/05-api-design.md
   API authentication can use several methods including OAuth, JWT...

📄 appendix/glossary.md
   OAuth: Open standard for access delegation...
```

**Exit Codes:**

- `0` - Success (results found)
- `0` - Success (no results found, not an error)
- `1` - Error (database not initialized, invalid options)

---

### find-related

Find content similar to a file.

**Synopsis:**

```bash
writers-aid find-related <file> [options]
```

**Arguments:**

- `file` - Reference file path (required)

**Options:**

- `-p, --project <path>` - Project directory (default: ".")
- `-l, --limit <number>` - Maximum results (default: "5")

**Description:**

Finds files with similar content to the reference file. Useful for discovering related chapters, redundant content, or cross-reference opportunities.

**Examples:**

```bash
# Find related to chapter
writers-aid find-related chapters/01-intro.md

# Limit results
writers-aid find-related auth.md --limit 3

# Different project
writers-aid find-related chapter1.md --project ~/my-book
```

**Output:**

```
Related to chapters/01-intro.md:

📄 chapters/02-background.md
   Relevance: 0.85

📄 chapters/10-summary.md
   Relevance: 0.72

📄 appendix/references.md
   Relevance: 0.65
```

**Exit Codes:**

- `0` - Success
- `1` - Error (file not found, not indexed)

---

### themes

Extract main themes from manuscript.

**Synopsis:**

```bash
writers-aid themes [options]
```

**Options:**

- `-p, --project <path>` - Project directory (default: ".")
- `-n, --num <number>` - Number of themes (default: "5")
- `-s, --scope <pattern>` - File scope pattern

**Description:**

Analyzes manuscript to extract dominant themes and topics based on word frequency and distribution.

**Examples:**

```bash
# Extract top 5 themes
writers-aid themes

# Get top 10 themes
writers-aid themes --num 10

# Themes from specific scope
writers-aid themes --scope "chapters/*"

# Themes from appendix only
writers-aid themes --scope "appendix/*.md"
```

**Output:**

```
Main Themes:

1. authentication
   Count: 47

2. security
   Count: 39

3. database
   Count: 35

4. testing
   Count: 28

5. deployment
   Count: 24
```

**Exit Codes:**

- `0` - Success
- `1` - Error (no content found)

## Structure Commands

### outline

Generate hierarchical outline.

**Synopsis:**

```bash
writers-aid outline [options]
```

**Options:**

- `-p, --project <path>` - Project directory (default: ".")
- `-d, --depth <number>` - Outline depth (default: "3")
- `-w, --with-stats` - Include word counts

**Description:**

Generates a hierarchical outline showing manuscript structure based on headings.

**Examples:**

```bash
# Basic outline
writers-aid outline

# Include word counts
writers-aid outline --with-stats

# Limit depth to H2
writers-aid outline --depth 2

# Full depth (H1-H6)
writers-aid outline --depth 6
```

**Output:**

```
Manuscript Outline:

📄 chapters/01-introduction.md
   1,234 words

📄 chapters/02-background.md
   2,456 words

📄 chapters/03-security.md
   3,789 words

Total: 12,345 words across 10 files
```

**Exit Codes:**

- `0` - Success
- `1` - Error (project not initialized)

---

### structure

Validate document structure.

**Synopsis:**

```bash
writers-aid structure [file] [options]
```

**Arguments:**

- `file` - File to validate (optional, validates all if omitted)

**Options:**

- `-p, --project <path>` - Project directory (default: ".")
- `-a, --all` - Validate all files

**Description:**

Checks heading hierarchy for issues like skipped levels, duplicates, and deep nesting.

**Examples:**

```bash
# Validate specific file
writers-aid structure chapters/02-setup.md

# Validate all files
writers-aid structure --all

# Equivalent to --all
writers-aid structure
```

**Output:**

```
Structure Validation:

┌─────────────┬──────────────────┬──────┬──────────┐
│ File        │ Issue            │ Line │ Severity │
├─────────────┼──────────────────┼──────┼──────────┤
│ chapter2.md │ skipped-level    │ 15   │ warning  │
│ chapter2.md │ duplicate-heading│ 45   │ warning  │
│ chapter3.md │ deep-nesting     │ 78   │ info     │
└─────────────┴──────────────────┴──────┴──────────┘

Found 1 errors, 2 warnings
```

**Issues Detected:**

- **skipped-level** - Heading levels skip (H1 → H3)
- **duplicate-heading** - Same heading text at same level
- **deep-nesting** - Headings deeper than H4
- **unbalanced-section** - Section length varies significantly
- **missing-heading** - File has no headings

**Exit Codes:**

- `0` - Success (no errors found)
- `0` - Success (warnings found, not errors)
- `1` - Critical errors found

## Quality Commands

### check

Run comprehensive quality checks.

**Synopsis:**

```bash
writers-aid check [file] [options]
```

**Arguments:**

- `file` - File to check (optional, checks all if omitted)

**Options:**

- `-p, --project <path>` - Project directory (default: ".")
- `-q, --quick` - Quick check mode (skip slow checks)

**Description:**

Runs multiple quality checks including structure validation, readability analysis, and duplicate detection.

**Examples:**

```bash
# Check all files
writers-aid check

# Check specific file
writers-aid check chapters/01-intro.md

# Quick check (faster)
writers-aid check --quick
```

**Output:**

```
Quality Check Results:

Structure: 3 issues
Readability: 12 files analyzed
Duplicates: 2 found

Run individual commands for details:
  writers-aid structure --all
  writers-aid terminology
  writers-aid todos
```

**Exit Codes:**

- `0` - Success (issues may exist)
- `1` - Error (check failed to run)

---

### terminology

Check term consistency.

**Synopsis:**

```bash
writers-aid terminology [options]
```

**Options:**

- `-p, --project <path>` - Project directory (default: ".")
- `-t, --term <term>` - Specific term to check

**Description:**

Checks for inconsistent terminology usage across manuscript.

**Examples:**

```bash
# Auto-detect inconsistencies
writers-aid terminology

# Check specific term
writers-aid terminology --term "email"

# Check multiple terms
writers-aid terminology --term "API"
```

**Output:**

```
Terminology Issues:

Term: email
  Variants found: 3
    - email (15 times)
    - e-mail (8 times)
    - Email (3 times)

Term: API
  Variants found: 2
    - API (42 times)
    - api (7 times)
```

**Common Issues:**

- email / e-mail / Email
- API / api / Api
- JavaScript / Javascript / javascript
- database / data-base

**Exit Codes:**

- `0` - Success (issues may exist)
- `1` - Error (check failed)

---

### todos

List all TODOs.

**Synopsis:**

```bash
writers-aid todos [options]
```

**Options:**

- `-p, --project <path>` - Project directory (default: ".")
- `-g, --group-by <field>` - Group by: file, priority, marker
- `--priority <level>` - Filter by priority (high, medium, low)

**Description:**

Extracts TODO markers from manuscript with priority levels.

**Examples:**

```bash
# List all TODOs
writers-aid todos

# Group by priority
writers-aid todos --group-by priority

# Filter high priority
writers-aid todos --priority high

# Group by file
writers-aid todos --group-by file
```

**Output:**

```
Found 18 TODO(s):

┌───────────────┬──────┬────────┬──────────┬─────────────────────────┐
│ File          │ Line │ Marker │ Priority │ Text                    │
├───────────────┼──────┼────────┼──────────┼─────────────────────────┤
│ chapter1.md   │ 45   │ FIXME  │ high     │ Update incorrect data   │
│ chapter2.md   │ 12   │ TODO   │ medium   │ Add code examples       │
│ chapter3.md   │ 78   │ TODO   │ medium   │ Expand this section     │
│ appendix.md   │ 23   │ NOTE   │ low      │ Remember to update      │
└───────────────┴──────┴────────┴──────────┴─────────────────────────┘
```

**Markers and Priorities:**

- `FIXME` - High priority
- `HACK` - High priority
- `XXX` - High priority
- `TODO` - Medium priority
- `WIP` - Medium priority
- `NOTE` - Low priority
- `DRAFT` - Low priority

**Exit Codes:**

- `0` - Success
- `1` - Error

---

### links

Check link health.

**Synopsis:**

```bash
writers-aid links [options]
```

**Options:**

- `-p, --project <path>` - Project directory (default: ".")
- `-b, --broken-only` - Show only broken links
- `-g, --graph` - Show link graph

**Description:**

Validates all links in manuscript, checking for broken internal links and invalid external URLs.

**Examples:**

```bash
# Check all links
writers-aid links

# Show only broken links
writers-aid links --broken-only

# Show link graph
writers-aid links --graph
```

**Output:**

```
Links checked

┌──────────────┬──────┬──────────────────┬─────────────────┐
│ File         │ Line │ Link             │ Issue           │
├──────────────┼──────┼──────────────────┼─────────────────┤
│ chapter2.md  │ 45   │ missing.md       │ File not found  │
│ chapter3.md  │ 78   │ broken-link.md   │ File not found  │
│ appendix.md  │ 12   │ docs-guide.md    │ File not found  │
└──────────────┴──────┴──────────────────┴─────────────────┘
```

**Link Types Checked:**

- Markdown links: `[text](target.md)`
- Wiki links: `[[WikiPage]]`
- External URLs: `https://example.com`
- Anchor links: `[Section](#heading)`

**Exit Codes:**

- `0` - Success (all links valid)
- `0` - Success (broken links found)
- `1` - Error (check failed)

## Progress Commands

### stats

Show writing statistics.

**Synopsis:**

```bash
writers-aid stats [options]
```

**Options:**

- `-p, --project <path>` - Project directory (default: ".")
- `-c, --by-chapter` - Break down by chapter
- `-s, --since <date>` - Show changes since date

**Description:**

Displays comprehensive writing statistics including word counts, file counts, and averages.

**Examples:**

```bash
# Basic statistics
writers-aid stats

# By chapter breakdown
writers-aid stats --by-chapter

# Changes since yesterday
writers-aid stats --since yesterday
```

**Output:**

```
Writing Statistics:

Total words: 45,678
Total files: 15
Average words per file: 3,045

By file:
┌──────────────────┬────────┐
│ File             │ Words  │
├──────────────────┼────────┤
│ chapter1.md      │ 3,456  │
│ chapter2.md      │ 4,567  │
│ chapter3.md      │ 5,678  │
└──────────────────┴────────┘
```

**Exit Codes:**

- `0` - Success
- `1` - Error

---

### changes

Show recent changes.

**Synopsis:**

```bash
writers-aid changes [options]
```

**Options:**

- `-p, --project <path>` - Project directory (default: ".")
- `-s, --since <time>` - Time filter (today, yesterday, week)

**Description:**

Displays recent changes to manuscript.

**Examples:**

```bash
# Changes since today
writers-aid changes

# Changes since yesterday
writers-aid changes --since yesterday

# Changes this week
writers-aid changes --since week
```

**Output:**

```
Changes since today:

15 files in project
3 files modified today
+1,234 words added
```

**Exit Codes:**

- `0` - Success
- `1` - Error

## Exit Codes

All commands follow standard Unix exit code conventions:

- `0` - Success (command completed successfully)
- `1` - Error (command failed to execute)

**Note:** Finding issues (broken links, TODOs, etc.) is considered success (exit code 0), as the command executed correctly.

## Configuration

### Environment Variables

```bash
# Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Database path override
export WRITERS_AID_DB="/custom/path/manuscript.db"
```

### Project Configuration

Create `.writers-aid/config.json` in your project:

```json
{
  "provider": "transformers",
  "model": "Xenova/all-MiniLM-L6-v2",
  "dimensions": 384,
  "exclude": [
    "node_modules/**",
    ".git/**",
    "dist/**"
  ]
}
```

### Global Configuration

User-level config at `~/.writers-aid/config.json`:

```json
{
  "defaultProvider": "transformers",
  "theme": "dark",
  "verbose": false
}
```

## Shell Completion

### Bash

```bash
# Add to ~/.bashrc
eval "$(writers-aid --completion bash)"
```

### Zsh

```zsh
# Add to ~/.zshrc
eval "$(writers-aid --completion zsh)"
```

## Tips and Tricks

### Combine Commands

```bash
# Check everything before committing
writers-aid check && \
writers-aid links && \
writers-aid todos --priority high
```

### Use with Git Hooks

```bash
# .git/hooks/pre-commit
#!/bin/sh
writers-aid check || exit 1
writers-aid links --broken-only || exit 1
```

### Scripting

```bash
#!/bin/bash
# daily-report.sh

echo "Daily Writing Report"
echo "===================="
writers-aid stats
echo
writers-aid changes --since today
echo
writers-aid todos --priority high
```

### Aliases

```bash
# Add to ~/.bashrc or ~/.zshrc
alias wa="writers-aid"
alias was="writers-aid search"
alias wac="writers-aid check"
alias wast="writers-aid stats"
```

## Support

- **Documentation:** [USER-GUIDE.md](USER-GUIDE.md)
- **MCP Tools:** [TOOL-REFERENCE.md](TOOL-REFERENCE.md)
- **Issues:** [GitHub Issues](https://github.com/xiaolai/claude-writers-aid-mcp/issues)

---

**Version:** 0.1.0
**Last Updated:** January 2025
