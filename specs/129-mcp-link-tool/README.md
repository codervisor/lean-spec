---
status: planned
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
updated_at: '2025-11-28T01:27:53.931Z'
---

# Add `link` and `unlink` MCP Tools

> **Status**: 🗓️ Planned · **Priority**: High · **Created**: 2025-11-28 · **Tags**: mcp, tooling, dx, ai-agents

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

- [ ] Create `packages/cli/src/mcp/tools/link.ts`
- [ ] Create `packages/cli/src/mcp/tools/unlink.ts`
- [ ] Register tools in `packages/cli/src/mcp/tools/registry.ts`
- [ ] Add tests for new MCP tools
- [ ] Update AGENTS.md MCP Tools table (remove "CLI only" note after impl)
- [ ] Rebuild and test with MCP client

## Test

- [ ] `mcp_lean-spec_link` successfully adds relationships
- [ ] `mcp_lean-spec_unlink` successfully removes relationships
- [ ] Bidirectional links work correctly via MCP
- [ ] Error handling for invalid spec paths

## Notes

Related: [085-cli-relationship-commands](../085-cli-relationship-commands) - original `link`/`unlink` CLI implementation

### Interim AGENTS.md Update

Until this is implemented, update AGENTS.md to note `link` requires CLI fallback.
