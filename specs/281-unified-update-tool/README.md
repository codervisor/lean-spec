---
status: complete
created: 2026-02-02
priority: medium
tags:
- mcp
- cli
- dx
- optimization
created_at: 2026-02-02T05:56:56.279069429Z
updated_at: 2026-02-02T07:05:01.756170883Z
completed_at: 2026-02-02T07:05:01.756170883Z
transitions:
- status: complete
  at: 2026-02-02T07:05:01.756170883Z
---

# Unified Update Tool for Combined Metadata and Content Changes

> **Status**: planned · **Priority**: medium · **Created**: 2026-02-02

## Overview

Currently spec updates require multiple tool calls for combined metadata + content changes:

1. `update` - Metadata only (status, priority, tags, assignee)
2. `update_spec` - Full content replacement
3. `update_spec_section` - Section-level edits
4. `toggle_checklist_item` - Checklist toggle

**Problems:**
- Full content replacement is error-prone and wasteful
- Multiple round-trips increase latency and token usage
- Race conditions between separate calls (content hash conflicts)
- Common workflow (update status + check items) requires 2+ calls
- AI agents must orchestrate multiple tools for simple operations

**Solution:** Extend the `update` tool with string-based replacements (like VS Code's `replace_string_in_file`), enabling surgical edits without full content replacement. All updates become atomic in a single call.

## Design

### Option Analysis

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A. Extend `update` with string replacements** | Add `replacements` array | Surgical, AI-friendly, backward compatible | Requires exact matching |
| B. Full content replacement | Replace entire body | Simple API | Wasteful, conflict-prone |
| C. Section-level edits | Replace by heading | Structured | Requires knowing section |
| D. New `patch` tool | Combined atomic updates | Clean slate | New tool, more to learn |

**Decision: Option A** - Extend existing `update` tool with string-based replacements as the primary edit method, keeping section updates and full replacement as alternatives.

### Extended Schema

```json
{
  "specPath": "string (required)",
  
  // Existing metadata operations
  "status": "planned | in-progress | complete | archived",
  "priority": "low | medium | high | critical",
  "assignee": "string",
  "addTags": ["string"],
  "removeTags": ["string"],
  
  // NEW: Content operations (all optional)
  
  // Option 1: String replacement (PREFERRED - surgical edits)
  "replacements": [{
    "oldString": "string",   // Exact text to find (include context lines)
    "newString": "string",   // Replacement text
    "matchMode": "unique | all | first"  // Default: unique (error if multiple matches)
  }],
  
  // Option 2: Section-level changes (for structured updates)
  "sectionUpdates": [{
    "section": "string",     // Section heading to find
    "content": "string",     // New content for section
    "mode": "replace | append | prepend"  // Default: replace
  }],
  
  // Option 3: Checklist operations (specialized)
  "checklistToggles": [{
    "itemText": "string",    // Text to match (partial OK)
    "checked": "boolean"     // true = [x], false = [ ]
  }],
  
  // Option 4: Full replacement (DISCOURAGED - use only when necessary)
  "content": "string",  // Full body replacement (excludes other content ops)
  
  // Optimistic concurrency
  "expectedContentHash": "string"  // Ensures no conflicts
}
```

### Why String Replacement is Preferred

Like VS Code's `replace_string_in_file`, the `replacements` approach:

1. **Surgical precision** - Only modifies targeted text, preserving surrounding content
2. **Context-aware** - Include surrounding lines to ensure unique match
3. **Diff-friendly** - Changes are minimal and review-friendly
4. **AI-optimized** - Matches how agents naturally think about edits
5. **Conflict-resistant** - Smaller changes = fewer merge conflicts

```json
// Example: Update a checklist item
{
  "specPath": "281",
  "replacements": [{
    "oldString": "- [ ] Add section update logic to `update_frontmatter`",
    "newString": "- [x] Add section update logic to `update_frontmatter`"
  }]
}

// Example: Add a note
{
  "specPath": "281", 
  "replacements": [{
    "oldString": "## Notes\n\n### Alternatives Considered",
    "newString": "## Notes\n\n### Decision Log\n\n2026-02-02: Adopted string replacement as primary edit method.\n\n### Alternatives Considered"
  }]
}
```

**When to use each method:**

| Method | Use Case |
|--------|----------|
| `replacements` | Any targeted edit (preferred) |
| `checklistToggles` | Quick checklist operations |
| `sectionUpdates` | Regenerating entire sections |
| `content` | Complete spec rewrites (rare) |

### Duplicate Match Resolution

When `oldString` matches multiple locations in the spec:

| `matchMode` | Behavior | Use Case |
|-------------|----------|----------|
| **`unique`** (default) | Error if >1 match | Safe edits, requires context |
| `all` | Replace all occurrences | Bulk find-replace |
| `first` | Replace first match only | When order is predictable |

**Default behavior (`unique`):**
```json
{
  "replacements": [{
    "oldString": "- [ ] Task",  // Matches 3 times
    "newString": "- [x] Task"
  }]
}
// Error: "Found 3 matches for oldString. Include more context to disambiguate."
```

**Resolution: Add context lines:**
```json
{
  "replacements": [{
    "oldString": "### Phase 1\n- [ ] Task",  // Now unique
    "newString": "### Phase 1\n- [x] Task"
  }]
}
```

**Bulk replacement with `all`:**
```json
{
  "replacements": [{
    "oldString": "TODO",
    "newString": "DONE",
    "matchMode": "all"  // Replace all occurrences
  }]
}
```

**Error messages should be helpful:**
- "Found 0 matches" → Suggest checking for typos or whitespace
- "Found N matches" → Suggest adding 2-3 lines of surrounding context
- Include line numbers of matches to help debugging

### Operation Priority

When multiple content operations are provided:
1. `content` (full replacement) takes precedence - **all other content ops ignored**
2. `replacements` applied in array order (first match wins per replacement)
3. `sectionUpdates` applied in array order  
4. `checklistToggles` applied last
5. Metadata always applied regardless of content operations

**Recommendation:** Use `replacements` for surgical edits. Avoid `content` unless rewriting the entire spec.

### CLI Interface

```bash
# Existing (unchanged)
lean-spec update 001 --status in-progress

# NEW: String replacement (preferred for surgical edits)
lean-spec update 001 --replace "old text" "new text"

# NEW: Replace all occurrences
lean-spec update 001 --replace "TODO" "DONE" --match-all

# NEW: Multiple replacements
lean-spec update 001 \
  --replace "- [ ] Task 1" "- [x] Task 1" \
  --replace "- [ ] Task 2" "- [x] Task 2"

# NEW: Check off items while updating status (shorthand)
lean-spec update 001 --status in-progress --check "Implement core logic"

# NEW: Uncheck item (shorthand)
lean-spec update 001 --uncheck "Add tests"

# NEW: Update section content
lean-spec update 001 --section "Notes" --append "Decision: Use Option A"

# Combined operations
lean-spec update 001 \
  --status complete \
  --check "All tests pass" \
  --check "Code reviewed"
```

### MCP Tool Interface

The MCP `update` tool schema for AI agents:

```json
{
  "name": "update",
  "description": "Update spec metadata and/or content. Use 'replacements' for surgical edits (preferred).",
  "inputSchema": {
    "type": "object",
    "properties": {
      "specPath": { "type": "string", "description": "Spec ID or path" },
      "status": { "type": "string", "enum": ["planned", "in-progress", "complete", "archived"] },
      "priority": { "type": "string", "enum": ["low", "medium", "high", "critical"] },
      "replacements": {
        "type": "array",
        "description": "String replacements (preferred). Include context lines for unique matching.",
        "items": {
          "type": "object",
          "properties": {
            "oldString": { "type": "string", "description": "Exact text to find" },
            "newString": { "type": "string", "description": "Replacement text" },
            "matchMode": { 
              "type": "string", 
              "enum": ["unique", "all", "first"],
              "default": "unique",
              "description": "unique=error if multiple matches, all=replace all, first=first only"
            }
          },
          "required": ["oldString", "newString"]
        }
      },
      "checklistToggles": {
        "type": "array",
        "items": {
          "type": "object", 
          "properties": {
            "itemText": { "type": "string" },
            "checked": { "type": "boolean" }
          }
        }
      }
    },
    "required": ["specPath"]
  }
}
```

### Implementation Location

**MCP (Rust):**
- `rust/leanspec-mcp/src/tools/specs.rs` - Extend `tool_update()` function
- Add content parsing and section manipulation

**CLI (Rust):**
- `rust/leanspec-cli/src/commands/update.rs` - Add new flags
- Reuse core logic from mcp module

**HTTP API:**
- `PATCH /api/projects/:id/specs/:spec` already supports content updates
- May need minor extension for batch section updates

## Plan

### Phase 1: Core Implementation
- [ ] Extend `UpdateSpecInput` struct with content fields
- [ ] Implement string replacement logic (`replacements` array)
- [ ] Add section update logic to `update_frontmatter`
- [ ] Implement checklist toggle batch processing
- [ ] Add operation priority enforcement

### Phase 2: MCP Tool Update
- [ ] Update `tool_update` in specs.rs to handle new params
- [ ] Update tool schema with `replacements` as primary content edit method
- [ ] Handle content hash for concurrency control
- [ ] Add error handling for non-matching oldString

### Phase 3: CLI Extension
- [ ] Add `--replace` flag to update command (takes two args)
- [ ] Add `--match-all` and `--match-first` flags for match mode
- [ ] Add `--check`, `--uncheck` flags to update command
- [ ] Add `--section`, `--append`, `--prepend` flags
- [ ] Update help text and documentation

### Phase 4: Testing
- [ ] Unit tests for combined operations
- [ ] E2E tests for CLI new flags
- [ ] MCP integration tests
- [ ] Conflict resolution tests (hash mismatch)

### Phase 5: Documentation
- [ ] Update cli.mdx reference
- [ ] Update MCP README
- [ ] Update COMMANDS.md skill reference

## Test

### Unit Tests
- [ ] Metadata-only update still works (regression)
- [ ] Content-only update works
- [ ] Combined metadata + content in single call
- [ ] **String replacement - single match**
- [ ] **String replacement - multiple replacements in order**
- [ ] **String replacement - error on no match (fail fast)**
- [ ] **String replacement - error on multiple matches (matchMode: unique)**
- [ ] **String replacement - replace all matches (matchMode: all)**
- [ ] **String replacement - first match only (matchMode: first)**
- [ ] **Error message includes line numbers of matches**
- [ ] Section replace mode
- [ ] Section append mode  
- [ ] Multiple checklist toggles
- [ ] Content hash validation blocks stale updates
- [ ] Full content replacement ignores partial ops

### E2E Tests
- [ ] `lean-spec update 001 --replace "old" "new"`
- [ ] `lean-spec update 001 --replace "TODO" "DONE" --match-all`
- [ ] `lean-spec update 001 --status complete --check "Done"`
- [ ] `lean-spec update 001 --section Overview --append "More info"`
- [ ] Error on hash mismatch
- [ ] **Error message suggests context lines when replacement fails**
- [ ] **Error message includes line numbers of duplicate matches**

## Notes

### Design Rationale: String Replacement as Primary Method

Inspired by VS Code's `replace_string_in_file`, which agents like GitHub Copilot use successfully:

**Why full replacement is problematic:**
- Requires knowing entire file content
- Easy to accidentally overwrite concurrent changes  
- Large payloads increase token usage
- Hard to review what actually changed

**Why string replacement works:**
- Agents naturally describe changes as "replace X with Y"
- Context lines ensure unique matching
- Minimal payload = faster, cheaper
- Clear diff for review

**Error handling with `matchMode`:**
- **No match found**: Error with suggestion to check for typos/whitespace
- **Multiple matches + `unique`**: Error listing line numbers, suggest adding context
- **Multiple matches + `all`**: Replace all occurrences
- **Multiple matches + `first`**: Replace first occurrence only

**Why `unique` is the default:**
- Safest for AI agents (prevents unintended bulk changes)
- Forces explicit context, reducing errors
- Matches VS Code's `replace_string_in_file` behavior

### Alternatives Considered

**Batch Endpoint:** Considered a `/batch` endpoint accepting an array of operations. Rejected because:
- Over-engineered for the common case
- Harder for AI agents to reason about
- Validation complexity increases

**New `patch` Tool:** Considered a separate `patch` tool. Rejected because:
- Fragments the API surface
- Agents must learn when to use `update` vs `patch`
- Backward compatibility concerns

### Open Questions

1. Should `content` replacement preserve frontmatter, or require the full file including `---` blocks?
   - **Proposed:** Preserve frontmatter automatically (matches `update_spec` behavior)

2. Should checklist toggles match partial text or require exact match?
   - **Proposed:** Partial match (substring) with first-match wins

3. Priority on invalid section name?
   - **Proposed:** Error if section not found (fail fast)

4. **How to handle whitespace in string replacements?**
   - **Proposed:** Exact match required (agents should copy text precisely)
   - Alternative: Normalize whitespace before matching (risk: false positives)

5. **Should replacements support regex?**
   - **Proposed:** No - plain string matching only for predictability
   - Future: Consider `regexReplacements` array for advanced use cases

### Resolved Questions

6. **How to handle duplicate matches?**
   - **Resolved:** Added `matchMode` parameter with options:
     - `unique` (default): Error if multiple matches - forces context inclusion
     - `all`: Replace all occurrences  
     - `first`: Replace first occurrence only
