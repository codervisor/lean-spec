# Validation Rules

This document details what gets validated by `lean-spec validate` and the specific rules for each validation type.

**Note:** This spec originally proposed expanding `lean-spec check`, but the implementation created `lean-spec validate` as a separate command.

## Implementation Status

- ✅ **Line Count Validation** - Phase 1a Complete
- ✅ **Frontmatter Validation** - Phase 1b Complete
- ⏳ **Structure Validation** - Phase 2 (Planned)
- ⏳ **Corruption Detection** - Phase 3 (High Priority)
- ⏳ **Sub-Spec Validation** - Phase 3.5 (High Priority)
- ⏳ **Content Validation** - Phase 4 (Optional)
- ⏳ **Staleness Detection** - Phase 5 (Optional)

---

## Line Count Validation ✅

**Status:** Implemented in Phase 1a

**Thresholds:**
- **Warning**: 300-400 lines (approaching limit)
- **Error**: >400 lines (exceeds limit)
- **Configurable**: `--max-lines` flag to customize limit

**Rationale:**
Enforces **Context Economy** principle - specs must fit in working memory (human and AI). Files >400 lines become difficult to read, edit, and maintain.

**Suggestions:**
- Warns: "Consider simplification or splitting"
- Errors: "Consider splitting into sub-specs using spec 012 pattern"

---

## Frontmatter Validation ✅

**Status:** Implemented in Phase 1b (27 tests passing)

**Required Fields:**
- `status` - Must be present
- `created` - Must be present

**Status Values:**
- Valid: `planned`, `in-progress`, `complete`, `archived`
- Invalid: Any other value (e.g., `wip`, `draft`, `done`)

**Priority Values:**
- Valid: `low`, `medium`, `high`, `critical`
- Optional field, but if present must be valid

**Date Formats:**
- ISO 8601 format (YYYY-MM-DD or full ISO timestamp)
- `created` field must be valid date
- Other date fields (if present) must be valid

**Tags:**
- Must be array of strings
- Example: `["quality", "validation", "cli"]`

**Custom Fields:**
- If config schema defined, custom fields must match
- Type validation based on config

## Structure Validation

**File Requirements:**
- `README.md` must exist in spec directory
- Frontmatter must be valid YAML
- Must have title (H1 heading: `# Title`)

**Section Requirements:**
- Required sections based on template
- Typically: Overview, Design, Plan, Test
- No empty required sections (content beyond just comment)
- No duplicate section headers at same level

## Sub-Spec Validation

**File Naming Conventions (from spec 012):**
- Sub-spec files should follow recommended naming patterns
- Standard names: `DESIGN.md`, `IMPLEMENTATION.md`, `TESTING.md`, `API.md`, `ARCHITECTURE.md`, `MIGRATION.md`, `CONFIGURATION.md`, etc.
- Custom names allowed but should be descriptive (e.g., `PHASE1.md`, `RESEARCH.md`)
- Assets should be in `assets/` subdirectory

**README.md Integration:**
- Main `README.md` should reference all sub-spec files
- Links can be in any section (Overview, Design, etc.)
- Missing links to sub-specs generate warnings
- Example: `[Testing Strategy](TESTING.md)` or `See [DESIGN.md](DESIGN.md)`

**Line Count Per Sub-Spec (Context Economy):**
- Each sub-spec file should be < 400 lines (error threshold)
- Warning at 300 lines (same as main spec)
- Rationale: Context Economy applies to each file independently
- Sub-specs exist to split complexity - they shouldn't become bloated

**Orphan Detection:**
- Detect sub-spec markdown files not referenced from README.md
- Warn about orphaned sub-specs (may be deprecated)
- Exception: README.md itself is never orphaned
- Assets (.png, .svg, etc.) are checked separately

**Cross-Document Validation:**
- Validate internal links between sub-specs work correctly
- Check relative paths are correct
- Detect circular references (if spec A links to B, B to C, C to A)

**Sub-Spec Structure:**
- Each sub-spec should have clear heading structure
- Should include backlink to main spec (recommended)
- Example: `> Part of spec: [018-spec-validation](README.md)`

## Content Validation

**Minimum Requirements:**
- Spec must have minimum content length (avoid stub specs)
- Default: 100 characters (configurable)

**Quality Checks:**
- No TODO/FIXME in complete specs
- Internal links should be valid (no broken references)
- No placeholder text in complete specs

## Corruption Detection

**Duplicate Content:**
- No duplicate section headers at same level
- Detect sections appearing multiple times
- Example: "## Plan" appearing twice in same spec

**Code Block Validation:**
- All code blocks properly closed (unclosed blocks break syntax highlighting)
- Matching number of opening ``` and closing ```
- This is the #1 indicator of corruption humans notice visually

**Formatting Validation:**
- Unclosed bold formatting (**) in actual content
- Unclosed italic formatting (*) in actual content
- Excludes code blocks, inline code, and list markers from checks
- Only validates markdown content outside code fences

**Duplicate Content Detection:**
- Detects duplicated content blocks (5+ consecutive lines, 100+ chars)
- Excludes code blocks to prevent false positives from code examples
- Tuned to reduce noise: was 3 lines/50 chars (too sensitive)
- Helps find merge artifacts and failed edits
- Warnings only (not errors) as some duplication is intentional

**Intentionally Excluded:**
- ❌ JSON/YAML validation in code blocks (examples often show invalid syntax)
- ❌ Table and list structure validation (too noisy, not actual corruption)

**Sub-Spec Duplication:**
- Detect if same content appears in multiple sub-specs
- Warn about significant content overlap between files
- Helps identify when content should be consolidated

### Corruption Detection Philosophy

**Focus on visually apparent corruption:**
- What breaks rendering (unclosed code blocks, unclosed formatting)
- What humans actually notice when reading specs
- Not semantic issues or style preferences

**Why we exclude certain checks:**
- JSON/YAML in code blocks: Examples intentionally show invalid syntax
- Duplicate content detection: Many false positives from boilerplate/templates
- Table/list validation: Too noisy, rarely indicates actual corruption

**Tuning for signal-to-noise:**
- Originally: 3 lines, 50 chars → 13 duplicate warnings across all specs
- Improved: 5 lines, 100 chars, exclude code blocks → More targeted detection
- Goal: Only flag genuine corruption, not common patterns

## Staleness Detection

**In-Progress Specs:**
- Warn if status is `in-progress` for > 30 days
- Suggests spec might be stalled

**No Updates:**
- Warn if no updates in > 90 days
- Based on git history or file mtime
- Suggests spec might be abandoned

**Planned Specs:**
- Warn if status is `planned` for > 60 days
- Suggests planning without execution

**Archived Specs:**
- No staleness warnings for archived specs
- Archived specs are expected to be static

## Auto-Fix Capabilities

### Fixable Issues

**Frontmatter:**
- Add missing required fields (use defaults)
- Format dates to ISO 8601 standard
- Sort frontmatter fields alphabetically
- Update visual badges to match frontmatter

**Structure:**
- Add missing required sections (as comments)
- Remove duplicate sections (keep first occurrence)
- Close unclosed code blocks (where unambiguous)

**Sub-Specs:**
- Add missing links to sub-specs in README.md
- Generate suggested backlinks for sub-specs
- Create "Documentation Structure" section if missing (when sub-specs exist)

### Non-Fixable Issues

These require manual intervention:
- Invalid status/priority values (requires decision)
- Empty required sections (requires content)
- Broken links (requires investigation)
- Stale specs (requires status update or work)
- Complex corruption (requires human judgment)

## Error Severity Levels

**Error (blocks passing):**
- Missing required fields
- Invalid status/priority values
- Duplicate sections
- Corrupted code blocks
- Invalid JSON/YAML syntax
- Malformed markdown structure

**Warning (passes with warning):**
- Stale specs
- Suggested improvements
- Minor formatting issues
- Empty optional sections

**Info (informational):**
- Best practice suggestions
- Style recommendations
- Optimization hints

## Validation Rules Configuration

Rules can be customized in `.lspec/config.json`:

```json
{
  "check": {
    "rules": {
      "frontmatter": {
        "required": ["status", "created"],
        "allowedStatus": ["planned", "in-progress", "complete", "archived"],
        "allowedPriority": ["low", "medium", "high", "critical"]
      },
      "structure": {
        "requireReadme": true,
        "requiredSections": ["Overview", "Design", "Plan"],
        "forbidEmptySections": true
      },
      "content": {
        "minLength": 100,
        "forbidTodoInComplete": true,
        "validateLinks": true
      },
      "corruption": {
        "detectDuplicateSections": true,
        "validateCodeBlocks": true,
        "validateJsonYaml": true,
        "detectFragments": true
      },
      "staleness": {
        "inProgressMaxDays": 30,
        "noUpdateMaxDays": 90,
        "plannedMaxDays": 60
      },
      "subSpecs": {
        "validateNaming": true,
        "requireReferences": true,
        "detectOrphans": true,
        "maxLinesPerFile": 400,
        "warnLinesPerFile": 300,
        "validateCrossReferences": true,
        "standardNames": [
          "DESIGN.md",
          "IMPLEMENTATION.md",
          "TESTING.md",
          "API.md",
          "ARCHITECTURE.md",
          "MIGRATION.md",
          "CONFIGURATION.md"
        ]
      }
    }
  }
}
```

## Why These Rules?

**Frontmatter:**
- Ensures specs are trackable and categorizable
- Required fields enable automation and reporting
- Valid values prevent typos and inconsistencies

**Structure:**
- Maintains consistency across team
- Makes specs easier to navigate
- Enables automated processing

**Content:**
- Prevents stub specs from cluttering project
- Ensures specs are complete before marking done
- Maintains quality standards

**Corruption:**
- Catches errors from failed AI edits
- Prevents shipping broken specs
- Early detection saves debugging time

**Staleness:**
- Identifies abandoned work
- Prompts status updates
- Keeps project health visible
