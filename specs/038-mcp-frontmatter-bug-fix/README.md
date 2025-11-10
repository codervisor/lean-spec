---
status: complete
created: '2025-11-04'
tags:
  - bug
  - mcp
  - frontmatter
priority: high
completed: '2025-11-04'
---

# Fix MCP Server Frontmatter Parsing

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-04 · **Tags**: bug, mcp, frontmatter

**Project**: lean-spec  
**Team**: Core Development

## Overview

The MCP server's `specToData` function incorrectly accesses frontmatter properties directly on the `SpecInfo` object (e.g., `spec.status`) instead of through the `frontmatter` property (e.g., `spec.frontmatter.status`).

**Impact:**
- `lean-spec_board` command crashes with "Cannot read properties of undefined"
- `lean-spec_stats` shows all specs with `undefined` status
- All frontmatter fields (status, priority, tags, etc.) are not populated in MCP responses

**Root cause:** `SpecInfo` type has structure:
```typescript
{
  path: string;
  name: string;
  frontmatter: {
    status: SpecStatus;
    priority?: SpecPriority;
    tags?: string[];
    // ...
  }
}
```

But `specToData()` tries to access `spec.status` instead of `spec.frontmatter.status`.

## Design

**Fix approach:**
Update `specToData()` function in `src/mcp-server.ts` to correctly access frontmatter properties:

```typescript
function specToData(spec: any): SpecData {
  return {
    name: spec.name,
    path: spec.path,
    status: spec.frontmatter.status,           // Fix: access via frontmatter
    created: spec.frontmatter.created,         // Fix: access via frontmatter
    title: spec.frontmatter.title,             // Fix: access via frontmatter
    tags: spec.frontmatter.tags,               // Fix: access via frontmatter
    priority: spec.frontmatter.priority,       // Fix: access via frontmatter
    assignee: spec.frontmatter.assignee,       // Fix: access via frontmatter
    description: spec.frontmatter.description, // Fix: access via frontmatter
    customFields: spec.frontmatter.custom,     // Fix: access via frontmatter
  };
}
```

**Additional fixes needed:**
- `getBoardData()` - accesses `spec.status` directly (line ~215)
- `getStatsData()` - accesses `spec.status`, `spec.priority`, `spec.tags` directly (lines ~188-201)

These need to use `spec.frontmatter.*` as well.

## Plan

- [x] Identify the bug through testing MCP commands
- [x] Locate the root cause in `specToData()` function
- [ ] Update `specToData()` to access `spec.frontmatter.*` properties
- [ ] Fix `getBoardData()` to use `spec.frontmatter.status`
- [ ] Fix `getStatsData()` to use `spec.frontmatter.*` fields
- [ ] Add proper TypeScript typing to avoid this issue (use SpecInfo type)
- [ ] Test all MCP commands (list, board, stats, search, read)
- [ ] Add unit tests for `specToData()` transformation

## Test

Verify all MCP commands work correctly:

- [ ] `lean-spec_list` returns specs with correct status/priority/tags
- [ ] `lean-spec_board` successfully groups specs by status columns
- [ ] `lean-spec_stats` shows correct counts by status/priority/tags
- [ ] `lean-spec_search` includes proper metadata in results
- [ ] `lean-spec_read` shows correct frontmatter in spec data
- [ ] No "undefined" values in any MCP responses
- [ ] Board command doesn't crash with undefined errors

**Manual test:**
```bash
# Via MCP in VS Code
- Call board tool → should show specs grouped by status
- Call stats tool → should show counts > 0 for statuses
- Call list tool → should show status field populated
```

## Notes

**Discovery process:**
1. Tested `lean-spec_board` → got "Cannot read properties of undefined (reading 'push')" error
2. Tested `lean-spec_stats` → all 11 specs showed as `status: undefined`
3. Tested `lean-spec_read` on spec 037 → spec file has `status: planned` in frontmatter
4. Reviewed `mcp-server.ts` → found `specToData()` accessing wrong properties
5. Checked `spec-loader.ts` → confirmed SpecInfo structure uses `frontmatter` sub-object

**Files affected:**
- `src/mcp-server.ts` - Main fix location (lines ~51, ~188-201, ~215)

**Related:**
- Spec 034: Copilot slash commands (uses MCP server)
- MCP integration testing script: `test-mcp-integration.sh`
