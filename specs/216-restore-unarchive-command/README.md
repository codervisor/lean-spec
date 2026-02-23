---
status: planned
created: 2026-01-14
priority: low
tags:
- cli
- mcp
- lifecycle
- archiving
depends_on:
- 077-archiving-strategy
parent: 319-spec-lifecycle-enhancements
created_at: 2026-01-14T13:42:47.864515Z
updated_at: 2026-02-06T14:20:48.567508Z
---

# Restore/Unarchive Command for Spec Lifecycle Management

## Overview

**Problem**: We have an `archive` command to move specs to `archived/` folder, but no exposed command to reverse this operation (restore/unarchive specs back to active workspace).

**Current State**:
- ✅ Core `unarchive()` functionality exists in `spec_archiver.rs`
- ❌ Not exposed via CLI command
- ❌ Not exposed via MCP tool
- ❌ Not documented in workflows/guides
- ⚠️ Spec 077-archiving-strategy exists but doesn't mention restore

**Real-World Use Cases**:
1. **Accidentally archived**: User archives wrong spec and needs quick undo
2. **Work revival**: Previously completed work needs updates or becomes relevant again
3. **Reference restoration**: Archived spec needed for active reference/context
4. **Phased rollback**: Feature partially rolled back, need to reactivate spec

**Goal**: Expose the existing `unarchive()` functionality through user-facing interfaces (CLI + MCP) and establish clear spec lifecycle management patterns.

## Design

### Command Design

**CLI Command**:
```bash
lean-spec restore <spec>           # Restore from archived/
lean-spec restore archived/045-*   # Support both paths

# With preview
lean-spec restore <spec> --dry-run

# Alternative naming (pick one)
lean-spec unarchive <spec>         # More explicit
lean-spec restore <spec>           # More intuitive
```

**Recommendation**: Use `restore` as primary command name (more user-friendly), keep `unarchive` as alias for power users.

**MCP Tool**:
```json
{
  "name": "restore",
  "description": "Restore (unarchive) a spec from archived/ back to specs/",
  "inputSchema": {
    "type": "object",
    "properties": {
      "specPath": {
        "type": "string",
        "description": "Spec path or number (e.g., 'archived/045-feature' or 'archived/045')"
      }
    },
    "required": ["specPath"]
  }
}
```

### Behavior Specification

**Input Normalization**:
- Accept: `"045-feature"`, `"archived/045-feature"`, `"archived/045-*"`
- Auto-detect if spec is in archived/ or not
- Error if spec not found in archived/

**Status Handling**:
- Restore to `status: planned` by default (safe default)
- Alternative: Preserve original status if it was `complete` before archiving
- **Decision needed**: Should we track pre-archive status?

**Conflict Handling**:
```
Error: Target already exists: specs/045-feature
Suggestion: Use a different name or manually resolve conflict
```

**Dry Run Output**:
```
[Dry Run] Would restore spec:
  From: specs/archived/045-feature
  To:   specs/045-feature
  Status: archived → planned
```

### Lifecycle State Machine

```
┌─────────┐  create   ┌─────────┐  start    ┌─────────────┐
│ (none)  │ ────────> │ planned │ ────────> │ in-progress │
└─────────┘           └─────────┘           └─────────────┘
                           ↑                        │
                           │                        │ complete
                      restore                       ↓
                           │                  ┌──────────┐
                           │                  │ complete │
                           │                  └──────────┘
                           │                        │
                           │                        │ archive
                           │                        ↓
                           │                  ┌──────────┐
                           └──────────────────│ archived │
                                              └──────────┘
```

**Key Transitions**:
- `archive`: `complete` → `archived` (move to archived/)
- `restore`: `archived` → `planned` (move back to specs/)
- Archive doesn't delete, just relocates + changes status

### Error Cases

| Scenario | Error | User Action |
|----------|-------|-------------|
| Spec not in archived/ | `Error: Spec not found in archived/` | Check path with `lean-spec list --status archived` |
| Target exists | `Error: Target already exists: specs/045-*` | Rename or delete existing spec first |
| Invalid path | `Error: Invalid spec path` | Verify path format |

## Plan

### Phase 1: CLI Command
- [x] Verify core `unarchive()` works correctly (already tested)
- [ ] Add `Restore` command variant to CLI enum
- [ ] Implement `commands/restore.rs` module
- [ ] Wire up command in main.rs
- [ ] Add help text and examples
- [ ] Test edge cases (conflicts, invalid paths)

### Phase 2: MCP Tool
- [ ] Add `restore` tool definition to MCP tools.rs
- [ ] Implement tool handler
- [ ] Update MCP tool documentation
- [ ] Test with AI assistants (Claude, Cursor)

### Phase 3: Documentation
- [ ] Update AGENTS.md with restore workflow
- [ ] Add restore example to tutorials
- [ ] Update spec 077-archiving-strategy to include restore
- [ ] Document lifecycle transitions clearly

### Phase 4: UX Enhancements (Optional)
- [ ] Add `--status` flag to restore to specific status
- [ ] List restoration suggestions when viewing archived specs
- [ ] Track archive history in frontmatter (optional)

## Test

### CLI Testing
- [ ] `lean-spec restore archived/045-feature` - Basic restore
- [ ] `lean-spec restore 045-feature` - Auto-detect archived prefix
- [ ] `lean-spec restore archived/045-*` - Glob pattern support
- [ ] `lean-spec restore active-spec` - Error: spec not archived
- [ ] `lean-spec restore archived/nonexistent` - Error: not found
- [ ] Restore when target exists - Error: conflict
- [ ] `--dry-run` flag - Preview without changes

### MCP Testing
- [ ] AI assistant calls `restore` tool successfully
- [ ] Proper error messages returned to AI
- [ ] Tool appears in available tools list

### Integration Testing
- [ ] Archive then restore roundtrip - spec unchanged
- [ ] Status transitions correctly (archived → planned)
- [ ] Dependencies preserved after restore
- [ ] Filesystem operations atomic (no partial states)

### User Workflows
- [ ] Developer accidentally archives wrong spec - quick restore
- [ ] Team revives old feature work - restore + update status
- [ ] AI agent needs archived spec context - suggest restore

## Notes

### Design Decisions

**Why "restore" over "unarchive"?**
- More intuitive for non-technical users
- Matches common UX patterns (Gmail, macOS Trash)
- "Unarchive" sounds technical/jargony
- Keep `unarchive` as alias for discoverability

**Default status after restore?**
- `planned` is safest default (assumes work may need review)
- User can immediately update status if needed
- Alternative: Add `--status` flag for flexibility

**Should we track archive history?**
- Could add `archived_at`, `archived_by` to frontmatter
- Would enable "restore to previous status" feature
- **Defer** to later spec if needed

### Related Workflows

**Archive → Restore Roundtrip**:
```bash
# Archive
lean-spec archive 045-feature
# Status: complete → archived
# Location: specs/ → specs/archived/

# Restore
lean-spec restore archived/045-feature
# Status: archived → planned
# Location: specs/archived/ → specs/
```

**Viewing Archived Specs**:
```bash
# List all archived
lean-spec list --status archived

# View archived spec
lean-spec view archived/045-feature

# Search includes archived (maybe add flag?)
lean-spec search "feature" --include-archived
```

### Future Enhancements

1. **Bulk operations**: `lean-spec restore --all --before 2025-01-01`
2. **Archive tags**: Mark specs as "archive candidate" for review
3. **Auto-suggest**: "Spec archived, did you mean to restore?"
4. **History tracking**: Full lifecycle audit trail
5. **Status preservation**: Restore to pre-archive status

### Implementation Notes

**Core Function Exists**:
```rust
// rust/leanspec-core/src/utils/spec_archiver.rs
impl SpecArchiver {
    pub fn unarchive(&self, spec_path: &str) -> Result<(), ArchiveError> {
        // Moves from archived/ back to specs/
        // Updates status to Planned
    }
}
```

**What's Missing**:
- CLI command definition
- MCP tool definition
- User documentation
- Workflow examples

### Links to Other Specs

- 077-archiving-strategy: Should be updated with restore workflow
- 174-completion-status-verification-hook: Lifecycle state tracking