---
status: planned
created: '2025-11-13'
tags:
  - refactor
  - mcp
  - architecture
priority: medium
created_at: '2025-11-13T14:18:24.298Z'
related: ['079']
---

# MCP Server Modular Architecture

> **Status**: 📅 Planned · **Priority**: Medium · **Created**: 2025-11-13

**Project**: lean-spec  
**Team**: Core Development

## Overview

The `mcp-server.ts` file has grown to **1,302 lines** and **9,807 tokens** (🔴 critical threshold) with 14 tools, 3 resources, and 3 prompts, making it difficult to maintain and extend. All MCP definitions are in a single monolithic file.

**Goal**: Refactor MCP server architecture to be maintainable at scale with clear modular organization patterns, following the same principles as spec 079 (CLI refactoring).

**Context Economy Impact**: At 9,807 tokens (8.2x the baseline), this file violates our first principle. AI effectiveness drops to ~70%, and the file is difficult to navigate and maintain.

## Problems

1. **Size**: 1,302 lines / 9,807 tokens in single file (🔴 critical)
2. **Order**: Tools/resources/prompts not alphabetically sorted
3. **Duplication**: Data transformation logic scattered throughout
4. **Mixed concerns**: Helper functions, tool logic, resources, prompts all in one file
5. **Maintainability**: Adding MCP tools requires editing massive file
6. **Scalability**: Pattern doesn't scale as we add more integrations

## Current Structure

```
mcp-server.ts (1,302 lines)
├── Type definitions (30 lines)
├── Helper functions (100 lines)
│   ├── formatErrorMessage()
│   ├── specToData()
│   ├── listSpecsData()
│   ├── searchSpecsData()
│   ├── readSpecData()
│   ├── getStatsData()
│   ├── getBoardData()
│   └── getDepsData()
├── 14 Tools (~800 lines)
│   ├── list, search, view, create, update
│   ├── stats, board, deps
│   ├── archive, files, check, validate
│   ├── backfill, tokens
├── 3 Resources (~150 lines)
│   ├── spec://{specPath}
│   ├── board://kanban
│   └── stats://overview
├── 3 Prompts (~100 lines)
│   ├── create-feature-spec
│   ├── update-spec-status
│   └── find-related-specs
└── Main entry (~20 lines)
```

## Design

### Pattern: Modular MCP Components

Extract MCP definitions into separate modules, following Model Context Protocol patterns used by servers like `@modelcontextprotocol/server-postgres`, `@modelcontextprotocol/server-filesystem`:

```
mcp/
  types.ts          - Shared type definitions
  helpers.ts        - Utility functions (formatErrorMessage, specToData)
  tools/
    registry.ts     - registerTools(server)
    list.ts         - listTool definition + listSpecsData()
    search.ts       - searchTool definition + searchSpecsData()
    view.ts         - viewTool definition + readSpecData()
    create.ts       - createTool definition
    update.ts       - updateTool definition
    stats.ts        - statsTool definition + getStatsData()
    board.ts        - boardTool definition + getBoardData()
    deps.ts         - depsTool definition + getDepsData()
    archive.ts      - archiveTool definition
    files.ts        - filesTool definition
    check.ts        - checkTool definition
    validate.ts     - validateTool definition
    backfill.ts     - backfillTool definition
    tokens.ts       - tokensTool definition
  resources/
    registry.ts     - registerResources(server)
    spec.ts         - spec://{specPath} resource
    board.ts        - board://kanban resource
    stats.ts        - stats://overview resource
  prompts/
    registry.ts     - registerPrompts(server)
    create-feature-spec.ts
    update-spec-status.ts
    find-related-specs.ts
```

Each tool file exports:
1. **Tool definition function**: e.g., `listTool()` that returns MCP tool config
2. **Tool handler function**: e.g., `listSpecsData()` with business logic

### Architecture

**Before (current)**:
```typescript
// mcp-server.ts (1,302 lines)
async function createMcpServer() {
  const server = new McpServer(...);
  
  // Tool: list
  server.registerTool('list', {...}, async (input) => {
    // 50 lines of logic
  });
  
  // Tool: search
  server.registerTool('search', {...}, async (input) => {
    // 60 lines of logic
  });
  
  // ... 12 more tools
  // ... 3 resources
  // ... 3 prompts
}
```

**After (proposed)**:
```typescript
// mcp-server.ts (~100 lines)
import { registerTools } from './mcp/tools/registry.js';
import { registerResources } from './mcp/resources/registry.js';
import { registerPrompts } from './mcp/prompts/registry.js';

async function createMcpServer() {
  const server = new McpServer({
    name: 'lean-spec',
    version: packageJson.version,
  });
  
  registerTools(server);
  registerResources(server);
  registerPrompts(server);
  
  return server;
}

// mcp/tools/registry.ts
export function registerTools(server: McpServer) {
  // Alphabetically sorted
  server.registerTool(...archiveTool());
  server.registerTool(...backfillTool());
  server.registerTool(...boardTool());
  server.registerTool(...checkTool());
  server.registerTool(...createTool());
  server.registerTool(...depsTool());
  server.registerTool(...filesTool());
  server.registerTool(...listTool());
  server.registerTool(...searchTool());
  server.registerTool(...statsTool());
  server.registerTool(...tokensTool());
  server.registerTool(...updateTool());
  server.registerTool(...validateTool());
  server.registerTool(...viewTool());
}

// mcp/tools/list.ts (~80 lines)
import { specToData } from '../helpers.js';
import { ToolDefinition } from '../types.js';

export function listTool(): ToolDefinition {
  return {
    name: 'list',
    config: {
      title: 'List Specs',
      description: '...',
      inputSchema: {...},
      outputSchema: {...},
    },
    handler: async (input) => {
      const specs = await listSpecsData(input);
      return {
        content: [{ type: 'text', text: JSON.stringify({ specs }, null, 2) }],
        structuredContent: { specs },
      };
    },
  };
}

export async function listSpecsData(options: {
  status?: SpecStatus | SpecStatus[];
  tags?: string[];
  priority?: SpecPriority | SpecPriority[];
  assignee?: string;
  includeArchived?: boolean;
}): Promise<SpecData[]> {
  // existing logic (60 lines)
}
```

### Benefits

1. **Context Economy**: Files <500 tokens each (vs 9,807 in monolith)
2. **Alphabetical by default**: Registry enforces order
3. **Single responsibility**: Each file = one tool/resource/prompt
4. **Easier to extend**: Create file, export definition, add to registry
5. **Testable**: Can test tools independently
6. **Clear structure**: Tool definition co-located with data logic
7. **Reusable helpers**: Shared types/utilities in dedicated modules

### File Size Estimates

Based on current code:
- `mcp-server.ts`: 1,302 lines → **~100 lines** (92% reduction)
- `mcp/types.ts`: **~50 lines** (type definitions)
- `mcp/helpers.ts`: **~80 lines** (shared utilities)
- Each tool file: **~60-100 lines** (definition + logic)
- Each resource file: **~40-60 lines**
- Each prompt file: **~30-50 lines**
- Registry files: **~20-30 lines each**

**Total impact**: Same functionality, but maximum file size ~150 lines vs 1,302 lines.

## Plan

### Phase 1: Create Module Structure
- [ ] Create `packages/cli/src/mcp/` directory structure
- [ ] Create `types.ts` with shared type definitions
- [ ] Create `helpers.ts` with utility functions (formatErrorMessage, specToData)
- [ ] Create registry files: `tools/registry.ts`, `resources/registry.ts`, `prompts/registry.ts`

### Phase 2: Extract Tools (14 tools)
- [ ] Extract alphabetically sorted tools to individual files:
  - [ ] `archive.ts` - archiveTool + archiveSpec logic
  - [ ] `backfill.ts` - backfillTool + backfillTimestamps logic
  - [ ] `board.ts` - boardTool + getBoardData logic
  - [ ] `check.ts` - checkTool + sequence conflict detection
  - [ ] `create.ts` - createTool + createSpec logic
  - [ ] `deps.ts` - depsTool + getDepsData logic
  - [ ] `files.ts` - filesTool + file listing logic
  - [ ] `list.ts` - listTool + listSpecsData logic
  - [ ] `search.ts` - searchTool + searchSpecsData logic
  - [ ] `stats.ts` - statsTool + getStatsData logic
  - [ ] `tokens.ts` - tokensTool + token counting logic
  - [ ] `update.ts` - updateTool + updateSpec logic
  - [ ] `validate.ts` - validateTool + validation logic
  - [ ] `view.ts` - viewTool + readSpecData logic
- [ ] Implement `registerTools()` in registry with alphabetical order

### Phase 3: Extract Resources (3 resources)
- [ ] Extract resources to individual files:
  - [ ] `resources/board.ts` - board://kanban resource
  - [ ] `resources/spec.ts` - spec://{specPath} resource
  - [ ] `resources/stats.ts` - stats://overview resource
- [ ] Implement `registerResources()` in registry

### Phase 4: Extract Prompts (3 prompts)
- [ ] Extract prompts to individual files:
  - [ ] `prompts/create-feature-spec.ts`
  - [ ] `prompts/find-related-specs.ts`
  - [ ] `prompts/update-spec-status.ts`
- [ ] Implement `registerPrompts()` in registry

### Phase 5: Refactor Main Server File
- [ ] Update `mcp-server.ts` to use registries
- [ ] Remove all tool/resource/prompt definitions
- [ ] Keep only server setup + transport initialization
- [ ] Verify reduced to ~100 lines
- [ ] Update imports to use new module structure

### Phase 6: Validation
- [ ] Run `pnpm build` - ensure TypeScript compiles
- [ ] Test MCP server startup: verify no errors
- [ ] Test representative tools:
  - [ ] `list` - basic filtering
  - [ ] `search` - intelligent search
  - [ ] `view` - main spec + sub-spec files
  - [ ] `create` - new spec creation
  - [ ] `tokens` - token counting
- [ ] Verify all 14 tools + 3 resources + 3 prompts registered
- [ ] Run token count: `lean-spec tokens packages/cli/src/mcp-server.ts`
- [ ] Confirm main file <2,000 tokens

## Test

**Validation criteria**:
- ✅ Main `mcp-server.ts` reduced to <150 lines
- ✅ Token count <2,000 (from 9,807)
- ✅ Tools appear alphabetically in MCP tool list
- ✅ All 14 tools + 3 resources + 3 prompts functional
- ✅ MCP server starts without errors
- ✅ No breaking changes to tool behavior

**Manual testing**:
```bash
# Build and verify compilation
pnpm build

# Test MCP server startup
node bin/lean-spec.js mcp

# Test in MCP client (e.g., Claude Desktop)
# - List tools: should show 14 tools alphabetically
# - Test list tool with filters
# - Test search tool with query
# - Test view tool with spec path
# - Test create tool with new spec
# - Test tokens tool with spec path

# Verify token reduction
lean-spec tokens packages/cli/src/mcp-server.ts
# Should show <2,000 tokens (was 9,807)
```

**Automated testing**:
- [ ] Existing MCP integration tests pass (if any)
- [ ] Tool registration tests
- [ ] Resource registration tests
- [ ] Prompt registration tests

## Notes

### Comparison to Spec 079 (CLI Refactoring)

This spec follows the same refactoring pattern as spec 079:

| Aspect | CLI (079) | MCP (080) |
|--------|-----------|-----------|
| **Size** | 702 lines | 1,302 lines |
| **Tokens** | ~5,000 | 9,807 (🔴 critical) |
| **Components** | 20+ commands | 14 tools + 3 resources + 3 prompts |
| **Pattern** | Command registry | Tool/resource/prompt registries |
| **Target** | <200 lines | <150 lines |
| **Reduction** | ~72% | ~88% |

### Alternatives Considered

1. **Keep monolithic, just refactor**: Doesn't solve Context Economy violation
2. **Group tools by category**: Still too large per file, harder to find specific tools
3. **Dynamic tool loading**: Over-engineering, adds complexity
4. **Shared tools/resources file**: Doesn't solve scalability

### Migration Safety

- MCP server interface stays unchanged (same tool names/schemas)
- Business logic moves but doesn't change
- Backward compatible with existing MCP clients
- No breaking changes to tool signatures

### Future Enhancements

- Auto-generate MCP tool schemas from command definitions
- Shared tool/command definitions (DRY between CLI and MCP)
- Plugin system for custom MCP tools
- Tool versioning support
- Tool deprecation workflow

### Related Specs

- **079-cli-alphabetical-organization**: Same pattern, CLI domain
- **067-monorepo-core-extraction**: Module organization principles
- **071-simplified-token-validation**: Token thresholds (this spec violates them)

### Context Economy Analysis

**Current state**: 9,807 tokens = 8.2x baseline
- AI effectiveness: ~70% (hypothesis from spec 066)
- Cost multiplier: 8.2x
- Maintainability: Poor (scrolling, finding tools)

**Target state**: <2,000 tokens per file
- AI effectiveness: 100% (optimal)
- Cost multiplier: ~1.7x (acceptable)
- Maintainability: Excellent (alphabetical, modular)

**Impact**: This refactor is not just about organization—it's about staying within Context Economy thresholds to maintain AI effectiveness and developer productivity.
