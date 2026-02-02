---
status: planned
created: 2026-02-02
priority: medium
tags:
- mcp
- cli
- dx
- optimization
created_at: 2026-02-02T05:56:56.279069429Z
updated_at: 2026-02-02T05:56:56.279069429Z
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
- Multiple round-trips increase latency and token usage
- Race conditions between separate calls (content hash conflicts)
- Common workflow (update status + check items) requires 2+ calls
- AI agents must orchestrate multiple tools for simple operations

**Solution:** Extend the `update` tool to accept optional content operations, making all updates atomic in a single call.

## Design

### Option Analysis

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A. Extend `update`** | Add content params | Backward compatible, single tool | Interface grows |
| B. New `patch` tool | Combined atomic updates | Clean slate | New tool, more to learn |
| C. Batch endpoint | Array of operations | Max flexibility | Complex, harder to validate |

**Decision: Option A** - Extend existing `update` tool with optional content parameters.

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
  "content": "string",  // Full body replacement (excludes other content ops)
  
  "sectionUpdates": [{
    "section": "string",     // Section heading to find
    "content": "string",     // New content for section
    "mode": "replace | append | prepend"  // Default: replace
  }],
  
  "checklistToggles": [{
    "itemText": "string",    // Text to match (partial OK)
    "checked": "boolean"     // true = [x], false = [ ]
  }],
  
  // Optimistic concurrency
  "expectedContentHash": "string"  // Ensures no conflicts
}
```

### Operation Priority

When multiple content operations are provided:
1. `content` (full replacement) takes precedence - other ops ignored
2. `sectionUpdates` applied in array order
3. `checklistToggles` applied after section updates
4. Metadata always applied

### CLI Interface

```bash
# Existing (unchanged)
lean-spec update 001 --status in-progress

# New: Check off items while updating status
lean-spec update 001 --status in-progress --check "Implement core logic"

# New: Uncheck item
lean-spec update 001 --uncheck "Add tests"

# New: Update section content
lean-spec update 001 --section "Notes" --append "Decision: Use Option A"

# Combined operations
lean-spec update 001 \
  --status complete \
  --check "All tests pass" \
  --check "Code reviewed"
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
- [ ] Add section update logic to `update_frontmatter`
- [ ] Implement checklist toggle batch processing
- [ ] Add operation priority enforcement

### Phase 2: MCP Tool Update
- [ ] Update `tool_update` in specs.rs to handle new params
- [ ] Update tool schema in `get_tool_definitions()`
- [ ] Handle content hash for concurrency control

### Phase 3: CLI Extension
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
- [ ] Section replace mode
- [ ] Section append mode  
- [ ] Multiple checklist toggles
- [ ] Content hash validation blocks stale updates
- [ ] Full content replacement ignores partial ops

### E2E Tests
- [ ] `lean-spec update 001 --status complete --check "Done"`
- [ ] `lean-spec update 001 --section Overview --append "More info"`
- [ ] Error on hash mismatch

## Notes

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
