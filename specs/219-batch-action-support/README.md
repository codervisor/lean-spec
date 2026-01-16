---
status: complete
created: 2026-01-16
priority: high
tags:
- cli
- ux
created_at: 2026-01-16T07:13:55.473739Z
updated_at: 2026-01-16T07:26:30.995177Z
completed_at: 2026-01-16T07:26:30.995177Z
transitions:
- status: complete
  at: 2026-01-16T07:26:30.995177Z
---

# Batch Action Support for Core Commands

> **Status**: ✅ Complete · **Created**: 2026-01-16 · **Priority**: High · **Tags**: cli, ux

## Overview

Enable batch operations on critical CLI commands to improve developer productivity and reduce repetitive command execution. Users should be able to perform common operations on multiple specs simultaneously.

**Problems:**
1. Archive command previously used fuzzy matching, risking accidental spec archival
2. No batch operation support meant repetitive commands for bulk actions
3. Similar limitations exist in other important commands (update, link, unlink)

**Value Proposition:**
- **Efficiency**: Perform operations on multiple specs in one command
- **Safety**: Exact path matching prevents accidental operations
- **UX**: Natural CLI experience aligned with Unix conventions
- **Productivity**: Reduce context switching and command repetition

## Design

### Architectural Decisions

**1. Exact Matching for Destructive Operations**
- Add `SpecLoader::load_exact()` method for safe spec resolution
- Only accept exact paths or numbers (e.g., `001-my-spec` or `001`)
- No fuzzy/partial matching for destructive commands like archive
- Keep fuzzy matching in `load()` for read-only operations (view, deps, etc.)

**2. Batch Operation Patterns**

Two patterns for batch support:

**Pattern A: Multiple Target Specs** (archive, update)
```bash
lean-spec archive 001-spec-a 002-spec-b 003-spec-c
lean-spec update 001-spec-a 002-spec-b --status complete
```

**Pattern B: Single Spec, Multiple References** (link, unlink)
```bash
lean-spec link 001-my-spec --depends-on 002-dep-a 003-dep-b
lean-spec unlink 001-my-spec --depends-on 002-dep-a 003-dep-b
```

**3. Error Handling Strategy**
- Validate all inputs before executing
- Continue processing valid items when errors occur
- Report all errors at the end
- Return non-zero exit code if any errors occurred
- Show summary: "Successfully {action} X spec(s), Y errors"

**4. Command Interface**

Use `Vec<String>` in clap with appropriate attributes:
```rust
Archive {
    #[arg(required = true)]
    specs: Vec<String>,  // Multiple positional args
}

Link {
    spec: String,
    #[arg(long, required = true)]
    depends_on: Vec<String>,  // Multiple via repeated flag
}
```

### Commands Status

| Command      | Batch Support | Pattern | Priority |
| ------------ | ------------- | ------- | -------- |
| **archive**  | ✅ Implemented | A       | -        |
| **backfill** | ✅ Existing    | A       | -        |
| **compact**  | ✅ Existing    | B       | -        |
| **update**   | ✅ Implemented | A       | High     |
| **link**     | ✅ Implemented | B       | Medium   |
| **unlink**   | ✅ Implemented | B       | Medium   |

## Plan

### Phase 1: Archive Command (✅ Complete)

- [x] Add `SpecLoader::load_exact()` method
- [x] Update archive command signature to accept `Vec<String>`
- [x] Implement batch processing with error collection
- [x] Update tests for batch and exact matching
- [x] Verify help text reflects new capabilities

### Phase 2: Update Command Batch Support

- [x] Change `spec: String` to `specs: Vec<String>`
- [x] Update command handler to iterate over specs
- [x] Apply same frontmatter changes to all specs
- [x] Add batch update tests
- [x] Document batch update usage

### Phase 3: Link/Unlink Batch Support

- [x] Change `depends_on: String` to `depends_on: Vec<String>`
- [x] Update link command to handle multiple dependencies
- [x] Update unlink command to handle multiple dependencies
- [x] Add batch link/unlink tests
- [x] Update help text and examples

### Phase 4: Documentation & Polish

- [x] Update CLI help text for all modified commands
- [x] Update AGENTS.md with batch operation patterns
- [x] Add batch operation examples to docs site
- [x] Create integration tests covering common workflows

## Test

### Archive Command (✅ Complete)

- [x] Batch archive multiple specs
- [x] Exact path matching (no fuzzy)
- [x] Number-based matching (001 or 1)
- [x] Error handling for mixed valid/invalid
- [x] Dry-run with batch operations
- [x] Preserve all spec metadata

### Update Command

- [x] Batch update status on multiple specs
- [x] Batch update priority on multiple specs
- [x] Batch add/remove tags on multiple specs
- [x] Mixed valid/invalid specs handling
- [x] Completion verification with batch

### Link/Unlink Command

- [x] Link one spec to multiple dependencies
- [x] Unlink one spec from multiple dependencies
- [x] Detect already-linked dependencies
- [x] Error handling for non-existent targets

## Notes

### Implementation Learnings

**Archive Command Refactor (2026-01-16)**

Original issues:
1. Used `SpecLoader::load()` which does fuzzy matching - dangerous for destructive ops
2. Only supported single spec archival

Solution:
- Created `load_exact()` that only matches:
  - Exact directory names: `001-my-spec`
  - Exact numbers with proper prefix matching: `001` or `1` both work
  - No partial/fuzzy matching

Key insight: Number matching needs to handle both formats:
```rust
// Match both "001" and "1" formats
if Some(num) == spec_num || spec.path.starts_with(&format!("{}-", spec_path))
```

Error handling pattern:
```rust
// Collect errors but continue processing
let mut errors = Vec::new();
for spec in specs {
    match process(spec) {
        Ok(_) => success_count += 1,
        Err(e) => errors.push(e),
    }
}
// Return error if any failed
if !errors.is_empty() {
    return Err(...)
}
```

### Future Considerations

**Other Commands for Batch Support:**
- `open` - Open multiple specs in editor
- `validate` - Validate specific specs
- `tokens` - Count tokens for multiple specs
- `deps` - Show dependencies for multiple specs

**MCP Tool Alignment:**
- MCP tools should mirror CLI batch capabilities
- Consider array parameters in MCP tool schemas
- Maintain consistency between CLI and MCP interfaces

**Performance:**
- Batch operations load specs once vs N times
- Consider parallel processing for large batches
- Add progress indicator for >10 specs

**User Experience:**
- Consider interactive mode: "Archive these 5 specs? [y/N]"
- Add `--all` flag for common patterns (e.g., archive all complete specs)
- Support shell globbing patterns in future: `archive 0{01..05}-*`
