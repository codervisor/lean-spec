# Validation Rules

This document details what gets validated by `lspec validate` and the specific rules for each validation type.

**Note:** This spec originally proposed expanding `lspec check`, but the implementation created `lspec validate` as a separate command.

## Frontmatter Validation

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
- All code blocks properly closed
- Matching number of opening ``` and closing ```
- Check for incomplete code blocks

**JSON/YAML Validation:**
- JSON blocks in code fences are valid JSON
- YAML blocks in code fences are valid YAML
- Frontmatter YAML is well-formed
- No incomplete or truncated JSON/YAML

**Content Fragments:**
- Detect duplicated content blocks
- Find remnants from failed edits
- Identify partial duplicates (merge artifacts)

**Markdown Structure:**
- Lists are properly formed
- Tables are valid markdown
- No unclosed formatting (bold, italic, etc.)

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
