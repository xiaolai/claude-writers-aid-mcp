# Intentional Issues Catalog

This document catalogs all intentional issues in the sample manuscript for testing Writer's Aid MCP quality tools.

## Structure Issues

### Skipped Heading Levels

**File:** `chapters/02-setup.md`
- Line ~4: H1 → H3 (skips H2)
- Line ~70: H2 → H5 (skips H3 and H4)

### Duplicate Headings

**File:** `chapters/02-setup.md`
- Lines ~29-35: "Installation" appears twice as H4

**File:** `chapters/03-html-basics.md`
- Lines ~152-154: "Common Mistakes" appears twice

**File:** `chapters/04-css.md`
- Lines ~105 and ~120: "CSS Grid" appears twice

### Deep Nesting

**File:** `chapters/02-setup.md`
- Lines ~70-80: H5 and H6 heading levels (too deep)

## Terminology Inconsistencies

### email / e-mail / Email

**Files:**
- `chapters/01-introduction.md`
- `chapters/02-setup.md` (line ~40)
- `chapters/03-html-basics.md` (lines ~48, ~75, ~106)
- `appendix/api-guide.md` (line ~37)

### API / api / Api

**Files:**
- `chapters/02-setup.md` (lines ~90-105)
- `appendix/api-guide.md` (multiple locations)

### database / data-base

**Files:**
- `chapters/02-setup.md` (line ~60)

## Quality Issues

### TODO Markers

- `chapters/01-introduction.md` (2 TODOs)
- `chapters/02-setup.md` (3 TODOs, 2 FIXMEs, 1 WIP)
- `chapters/03-html-basics.md` (2 TODOs, 1 HACK)
- `chapters/04-css.md` (2 TODOs, 1 FIXME)
- `appendix/api-guide.md` (2 TODOs, 1 FIXME)
- `appendix/design.md` (3 TODOs, 1 FIXME)

### Broken Links

**Internal links to non-existent files:**
- `chapters/02-setup.md`: Link to `missing-chapter.md`
- `chapters/03-html-basics.md`: Link to `broken-link.md`
- `chapters/04-css.md`: Link to `missing-link.md`
- `appendix/api-guide.md`: Link to `docs-guide.md`

## Style Issues

### Mixed List Markers

**Files:**
- `chapters/01-introduction.md` (lines ~22-26)
- `chapters/03-html-basics.md` (multiple locations)
- `chapters/04-css.md` (multiple locations)
- `appendix/api-guide.md` (lines ~50-55)
- `appendix/design.md` (multiple locations)

Description: Lists use inconsistent markers (mixing `*` and `-`)

### Long Run-on Sentences

**Files:**
- `chapters/03-html-basics.md` (line ~5, opening paragraph)
- `chapters/04-css.md` (line ~68)
- `appendix/design.md` (line ~12)

Description: Extremely long sentences (50+ words) that hurt readability

## Readability Issues

### Flesch Reading Ease

Expected low scores (difficult reading) in:
- Technical sections with complex terminology
- Long sentences in CSS and Design chapters
- Dense paragraphs without breaks

### Average Sentence Length

Several sections have high average sentence length:
- HTML Basics introduction
- CSS performance section
- Design guidelines overview

## Notes for Testing

### Expected Test Results

When running Writer's Aid tools on this manuscript:

1. **Structure Validator** should detect:
   - 3-4 skipped heading level issues
   - 4-5 duplicate heading issues
   - 2 deep nesting warnings (H5+)

2. **Terminology Checker** should detect:
   - email/e-mail/Email variants (6-8 instances)
   - API/api/Api variants (8-10 instances)
   - database/data-base variants (2-3 instances)

3. **TODO Extractor** should find:
   - 12+ TODO markers
   - 5+ FIXME markers
   - 1 WIP marker
   - 1 HACK marker
   - 1 NOTE marker

4. **Link Health Checker** should detect:
   - 4 broken internal links
   - All external links should be valid

5. **Consistency Checker** should detect:
   - Mixed list marker usage in 5+ files
   - No major heading style inconsistencies (all use ATX style)

6. **Readability Analyzer** should flag:
   - 3-4 sections with very long sentences
   - Reading level varies from middle-school to college
   - Low Flesch scores in technical sections

### Testing Workflow

1. Initialize the project: `writers-aid init src/__tests__/fixtures/sample-manuscript`
2. Run full quality check: `writers-aid check --project src/__tests__/fixtures/sample-manuscript`
3. Test specific validators:
   - `writers-aid structure --all`
   - `writers-aid terminology`
   - `writers-aid todos`
   - `writers-aid links`
4. Test search functionality:
   - `writers-aid search "API"`
   - `writers-aid themes`
5. Get statistics:
   - `writers-aid stats`
   - `writers-aid outline`

## Summary

This sample manuscript contains:

- **6 markdown files** (4 chapters + 2 appendix files + 1 README)
- **~600 lines** of content total
- **19 structure issues** (skipped levels, duplicates, deep nesting)
- **17 terminology inconsistencies** (3 different terms)
- **20+ TODO/FIXME markers**
- **4 broken links**
- **10+ mixed list marker instances**
- **3 readability issues** (long sentences)

All issues are intentional and designed to test the full capabilities of Writer's Aid MCP quality tools.
