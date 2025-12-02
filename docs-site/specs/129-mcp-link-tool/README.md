---
status: complete
created: '2025-11-28'
tags:
  - mcp
  - tooling
  - dx
  - ai-agents
priority: high
created_at: '2025-11-28T01:27:53.890Z'
related:
  - 085-cli-relationship-commands
  - 128-constant-time-migration
updated_at: '2025-11-28T01:50:23.786Z'
transitions:
  - status: in-progress
    at: '2025-11-28T01:37:15.477Z'
  - status: complete
    at: '2025-11-28T01:41:34.563Z'
completed_at: '2025-11-28T01:41:34.563Z'
completed: '2025-11-28'
---

# Add `link` and `unlink` MCP Tools

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-28 · **Tags**: mcp, tooling, dx, ai-agents

**Project**: lean-spec  
**Team**: Core Development

## Overview

The `link` and `unlink` commands exist in CLI but are not exposed as MCP tools. This creates a gap where AGENTS.md tells AI agents to use tools that don't exist in MCP context.

### Problem

1. **AGENTS.md says**: "ALWAYS link spec references → use `link` tool"
2. **MCP Tools table** lists `link` as available
3. **Reality**: No `link.ts` in `packages/cli/src/mcp/tools/`

This causes AI agents to:
- Try to use a non-existent MCP tool
- Fall back to CLI (extra step, breaks flow)
- Sometimes forget to link at all (spec 128 incident)

### Workarounds (Current)

1. Use `--related` / `--depends-on` at `create` time (works but easy to forget)
2. Fall back to CLI: `lean-spec link <spec> --related <other>`

## Design

### Tooling Fix: Add MCP Tools

Create two new MCP tools following existing patterns:

**`packages/cli/src/mcp/tools/link.ts`**
```typescript
// Expose linkSpec() from commands/link.js
inputSchema: {
  specPath: z.string().describe('Spec to add relationships to'),
  dependsOn: z.string().optional().describe('Comma-separated specs this depends on'),
  related: z.string().optional().describe('Comma-separated related specs'),
}
```

**`packages/cli/src/mcp/tools/unlink.ts`**
```typescript
// Expose unlinkSpec() from commands/unlink.js
inputSchema: {
  specPath: z.string().describe('Spec to remove relationships from'),
  dependsOn: z.string().optional().describe('Comma-separated dependencies to remove'),
  related: z.string().optional().describe('Comma-separated related specs to remove'),
}
```

### Process Fix: Update AGENTS.md

Until tools are added, clarify the workaround:

```markdown
| Action | MCP Tool | CLI Fallback |
|--------|----------|--------------|
| Link specs | `create --related` | `lean-spec link <spec> --related <other>` |
| Unlink specs | ❌ CLI only | `lean-spec unlink <spec> --related <other>` |
```

### Best Practice: Include relationships at creation

When creating a spec that references others, always include `related` or `dependsOn`:

```
mcp_lean-spec_create(
  name: "my-feature",
  related: ["063", "047"]  // ← Don't forget!
)
```

## Plan

- [x] Create `packages/cli/src/mcp/tools/link.ts`
- [x] Create `packages/cli/src/mcp/tools/unlink.ts`
- [x] Register tools in `packages/cli/src/mcp/tools/registry.ts`
- [x] Update AGENTS.md MCP Tools table
- [x] Rebuild and test

## Test

- [x] `mcp_lean-spec_link` tool registered and compiles
- [x] `mcp_lean-spec_unlink` tool registered and compiles
- [x] Build succeeds with new tools
- [ ] Manual test with MCP client (deferred)

## Implementation

### Files Created

1. **`packages/cli/src/mcp/tools/link.ts`**
   - Exposes `linkSpec()` from commands/link.js
   - Input: `specPath`, `dependsOn` (optional), `related` (optional)
   - Output: success, message, updated specs list

2. **`packages/cli/src/mcp/tools/unlink.ts`**
   - Exposes `unlinkSpec()` from commands/unlink.js
   - Input: `specPath`, `dependsOn` (optional), `related` (optional), `removeAll` (optional)
   - Output: success, message, removed count, updated specs list

3. **`packages/cli/src/mcp/tools/registry.ts`**
   - Added imports for `linkTool` and `unlinkTool`
   - Registered tools in alphabetical order

### AGENTS.md Updated

MCP Tools table now shows `link` and `unlink` as available MCP tools (no longer CLI-only).

## Notes

Related: [085-cli-relationship-commands](../085-cli-relationship-commands) - original `link`/`unlink` CLI implementation

### Lesson Learned

When AGENTS.md documents a tool, ensure the MCP implementation exists. The documentation should match actual capability.
