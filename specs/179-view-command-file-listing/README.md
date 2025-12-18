---
status: planned
created: '2025-12-18'
tags:
  - cli
  - mcp
  - ux
  - enhancement
priority: medium
created_at: '2025-12-18T08:11:21.446795738+00:00'
---

# Add File Listing to View Command Output

> **Status**: 🗓️ Planned · **Created**: 2025-12-18 · **Priority**: Medium · **Tags**: cli, mcp, ux, enhancement

## Overview

**Problem**: Both CLI and MCP `view` commands only return the README.md content but don't list additional files in multi-file specs. Users and AI agents need to make a separate `files` call (CLI only) to discover sub-spec files.

**Current State:**
- ✅ CLI has separate `files` command that lists all markdown files
- ❌ MCP has no `files` tool at all
- ❌ CLI `view` output doesn't include file list
- ❌ MCP `view` output doesn't include file list

**Example**: Spec 018 has 7 markdown files:
- README.md (main spec)
- CLI-DESIGN.md
- CONFIGURATION-EXAMPLES.md
- CONFIGURATION.md
- IMPLEMENTATION.md
- TESTING.md
- VALIDATION-RULES.md

But `lean-spec view 018` only shows README.md content without mentioning the other files exist.

**Goal**: Add a `files` array to the `view` command JSON output in both CLI and MCP, making it easy to discover multi-file specs in a single call.

**Value**:
- AI agents discover multi-file specs without extra tool calls
- Better UX: `view` shows complete picture of spec structure
- Parity: CLI and MCP have consistent behavior
- Keep CLI `files` command for backwards compatibility

## Design

See [DESIGN.md](./DESIGN.md) for complete implementation details.

**Summary**: Add `files: Vec<String>` field to `SpecInfo` struct, populate in `SpecLoader`, and include in both CLI and MCP `view` output. README.md appears first in sorted list.

## Plan

- [ ] Update `SpecInfo` struct to include `files: Vec<String>` field
- [ ] Implement `list_spec_files()` in `SpecLoader` with README.md-first sorting
- [ ] Update CLI `view` command to include `files` in JSON output
- [ ] Update CLI `view` command to display files in text output
- [ ] Update MCP `view` tool to include `files` in response
- [ ] Add tests for file listing functionality
- [ ] Test with single-file specs (only README.md)
- [ ] Test with multi-file specs (e.g., spec 018 with 7 files)
- [ ] Verify backwards compatibility (CLI `files` command still works)

## Test

### Single-File Spec
```bash
$ lean-spec view 178 --output json | jq '.files'
[
  "README.md"
]
```

### Multi-File Spec
```bash
$ lean-spec view 018 --output json | jq '.files'
[
  "README.md",
  "CLI-DESIGN.md",
  "CONFIGURATION-EXAMPLES.md",
  "CONFIGURATION.md",
  "IMPLEMENTATION.md",
  "TESTING.md",
  "VALIDATION-RULES.md"
]
```

### MCP Tool
```json
{
  "path": "018-spec-validation",
  "files": ["README.md", "CLI-DESIGN.md", "..."],
  "content": "..."
}
```

## Notes

_Additional context, decisions, and learnings._
