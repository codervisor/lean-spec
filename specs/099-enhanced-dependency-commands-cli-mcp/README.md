---
status: planned
created: '2025-11-17'
tags:
  - cli
  - mcp
  - dependencies
  - core
priority: high
created_at: '2025-11-17T08:45:47.025Z'
depends_on:
  - 097-dag-visualization-library
updated_at: '2025-11-17T08:45:57.054Z'
---

# Enhanced Dependency Commands for CLI/MCP

> **Status**: 🗓️ Planned · **Priority**: High · **Created**: 2025-11-17 · **Tags**: cli, mcp, dependencies, core

**Project**: lean-spec  
**Team**: Core Development

## Overview

**Problem**: Current `lean-spec deps` command and MCP `deps` tool only show the current spec's perspective (dependencies declared in its frontmatter). Missing critical information:

1. **Downstream Impact**: Specs that depend on THIS spec (requiredBy)
2. **Bidirectional Related**: Specs that list THIS spec in their `related` field
3. **Full Dependency Graph**: Complete view of relationships across the project

**Why Now**: Spec 097 (DAG Visualization) is implementing complete dependency graph for the web app. This spec extends that capability to CLI and MCP, sharing the core implementation.

**Example Problem**:
```bash
# Spec A depends on Spec B
$ lean-spec deps B
# ❌ Can't see that Spec A is blocked by Spec B
# ❌ Can't assess impact of changes to Spec B
# ❌ Can't see full dependency chain
```

**What We Need**:
- **CLI**: Enhanced `deps` command with `--complete`, `--upstream`, `--downstream`, `--impact` flags
- **MCP**: New tools for complete dependency graph queries
- **Core Package**: Shared `SpecDependencyGraph` class (from spec 097)
- **Consistency**: Web, CLI, and MCP all show same dependency information

**Impact**: Better dependency awareness → informed decisions about spec work order, change impact, and blocking relationships.

## Design

### Architecture: Shared Core Implementation

**From Spec 097 (DAG Visualization) - In-Memory Graph:**

```typescript
// packages/core/src/dependency-graph.ts (NEW)

interface DependencyNode {
  dependsOn: Set<string>;    // Upstream (current depends on these)
  requiredBy: Set<string>;   // Downstream (these depend on current)
  related: Set<string>;      // Bidirectional connections
}

export class SpecDependencyGraph {
  private graph: Map<string, DependencyNode>;
  
  constructor(allSpecs: SpecInfo[]) {
    this.buildGraph(allSpecs);
  }
  
  private buildGraph(specs: SpecInfo[]) {
    // Initialize all nodes
    for (const spec of specs) {
      this.graph.set(spec.path, {
        dependsOn: new Set(spec.frontmatter.depends_on || []),
        requiredBy: new Set(),
        related: new Set(spec.frontmatter.related || []),
      });
    }
    
    // Build reverse edges
    for (const [specPath, node] of this.graph.entries()) {
      // For each dependsOn, add reverse requiredBy
      for (const dep of node.dependsOn) {
        this.graph.get(dep)?.requiredBy.add(specPath);
      }
      // For each related, add bidirectional link
      for (const rel of node.related) {
        this.graph.get(rel)?.related.add(specPath);
      }
    }
  }
  
  getCompleteGraph(specPath: string): {
    current: SpecInfo;
    dependsOn: SpecInfo[];      // Upstream (current depends on these)
    requiredBy: SpecInfo[];     // Downstream (these depend on current)
    related: SpecInfo[];        // Bidirectional (includes both directions)
  } {
    // Implementation returns full graph view
  }
  
  getUpstream(specPath: string, maxDepth: number = 3): SpecInfo[] {
    // Recursive traversal of dependsOn chain
  }
  
  getDownstream(specPath: string, maxDepth: number = 3): SpecInfo[] {
    // Recursive traversal of requiredBy chain
  }
  
  getImpactRadius(specPath: string): {
    upstream: SpecInfo[];       // What this spec needs
    downstream: SpecInfo[];     // What needs this spec
    related: SpecInfo[];        // Connected work
  } {
    // All specs affected by changes to this spec
  }
}
```

**Performance Analysis** (from spec 097):
- **Memory**: ~100 specs × (3 Sets × ~5 entries × 50 bytes) ≈ 75KB total
- **Startup**: O(n×d) where d = avg dependencies (~5) → 100 specs × 5 deps ≈ <1ms
- **Query**: O(1) graph lookup + O(d) traversal ≈ <1ms
- **Conclusion**: Negligible memory/CPU impact, excellent query performance

### Enhanced CLI Commands

**Current Command** (`lean-spec deps <spec>`):
```bash
$ lean-spec deps 082
Depends On:
  → 067-monorepo-core-extraction [complete]
  
Related Specs:
  ⟷ 097-dag-visualization-library [in-progress]
  ⟷ 081-web-app-ux-redesign [complete]
```

**Enhanced Command Options**:

```bash
# Complete graph (default behavior - backward compatible enhancement)
$ lean-spec deps 082 --complete
Depends On (Upstream):
  → 067-monorepo-core-extraction [complete]
  
Required By (Downstream):
  ← 097-dag-visualization-library [in-progress]  # NEW!
  ← 099-enhanced-dependency-commands [planned]   # NEW!
  
Related Specs (Bidirectional):
  ⟷ 097-dag-visualization-library [in-progress]
  ⟷ 081-web-app-ux-redesign [complete]
  
# Only upstream dependencies
$ lean-spec deps 082 --upstream
→ 067-monorepo-core-extraction [complete]

# Only downstream dependents  
$ lean-spec deps 082 --downstream
← 097-dag-visualization-library [in-progress]
← 099-enhanced-dependency-commands [planned]

# Impact analysis (upstream + downstream + related)
$ lean-spec deps 082 --impact
Changing this spec affects 5 specs:
Upstream Dependencies (1):
  → 067-monorepo-core-extraction [complete]
Downstream Dependents (2):
  ← 097-dag-visualization-library [in-progress]
  ← 099-enhanced-dependency-commands [planned]
Related Specs (3):
  ⟷ 097-dag-visualization-library [in-progress]
  ⟷ 081-web-app-ux-redesign [complete]
  ⟷ 083-web-navigation-performance [planned]

# JSON output (for programmatic use)
$ lean-spec deps 082 --complete --json
{
  "current": { "path": "082-web-realtime-sync-architecture", "status": "complete" },
  "dependsOn": [{ "path": "067-monorepo-core-extraction", "status": "complete" }],
  "requiredBy": [
    { "path": "097-dag-visualization-library", "status": "in-progress" },
    { "path": "099-enhanced-dependency-commands", "status": "planned" }
  ],
  "related": [
    { "path": "097-dag-visualization-library", "status": "in-progress" },
    { "path": "081-web-app-ux-redesign", "status": "complete" }
  ]
}
```

**Backward Compatibility**:
- Default behavior (`lean-spec deps <spec>`) enhanced to show requiredBy
- Existing `--depth`, `--graph`, `--json` flags still work
- New flags are additive, not breaking

### Enhanced MCP Tools

**Extend Existing Tool** (`mcp_lean-spec_deps`):

```typescript
// packages/cli/src/mcp/tools/deps.ts (ENHANCED)

export interface DepsInput {
  specPath: string;
  mode?: 'complete' | 'upstream' | 'downstream' | 'impact';  // NEW
  depth?: number;
}

export async function getDepsData(specPath: string, mode: string = 'complete') {
  const config = await loadConfig();
  const allSpecs = await loadAllSpecs(config.specsDir);
  const graph = new SpecDependencyGraph(allSpecs);  // NEW: Use shared graph
  
  const spec = getSpec(specPath, allSpecs);
  if (!spec) throw new Error(`Spec not found: ${specPath}`);
  
  switch (mode) {
    case 'complete':
      return graph.getCompleteGraph(spec.path);
    case 'upstream':
      return { current: spec, dependsOn: graph.getUpstream(spec.path) };
    case 'downstream':
      return { current: spec, requiredBy: graph.getDownstream(spec.path) };
    case 'impact':
      return graph.getImpactRadius(spec.path);
    default:
      return graph.getCompleteGraph(spec.path);
  }
}

export function depsTool(): ToolDefinition {
  return [
    'deps',
    {
      title: 'Get Dependencies',
      description: 'Analyze complete spec dependency graph (upstream, downstream, bidirectional). Shows which specs this depends on, which depend on this spec, and related work.',
      inputSchema: {
        specPath: z.string().describe('Spec to analyze'),
        mode: z.enum(['complete', 'upstream', 'downstream', 'impact']).optional()
          .describe('View mode: complete (all relationships), upstream (dependencies only), downstream (dependents only), impact (all affected specs)'),
        depth: z.number().optional().describe('Traversal depth (default: 3)'),
      },
      outputSchema: {
        current: z.object({ path: z.string(), status: z.string() }),
        dependsOn: z.array(z.object({ path: z.string(), status: z.string() })).optional(),
        requiredBy: z.array(z.object({ path: z.string(), status: z.string() })).optional(),
        related: z.array(z.object({ path: z.string(), status: z.string() })).optional(),
      },
    },
    async (input) => {
      const deps = await getDepsData(input.specPath, input.mode || 'complete');
      return { content: [{ type: 'text', text: JSON.stringify(deps, null, 2) }] };
    }
  ];
}
```

**New MCP Tool** (`mcp_lean-spec_dependency-graph`):

```typescript
// packages/cli/src/mcp/tools/dependency-graph.ts (NEW)

export function dependencyGraphTool(): ToolDefinition {
  return [
    'dependency-graph',
    {
      title: 'Get Full Dependency Graph',
      description: 'Get complete project-wide dependency graph with all relationships. Useful for analyzing project structure, finding dependency chains, and understanding spec interconnections.',
      inputSchema: {
        includeArchived: z.boolean().optional().describe('Include archived specs (default: false)'),
        format: z.enum(['adjacency-list', 'edge-list']).optional()
          .describe('Output format: adjacency-list (grouped by spec) or edge-list (flat list of relationships)'),
      },
      outputSchema: {
        specs: z.array(z.object({
          path: z.string(),
          status: z.string(),
          dependsOn: z.array(z.string()),
          requiredBy: z.array(z.string()),
          related: z.array(z.string()),
        })),
      },
    },
    async (input) => {
      const config = await loadConfig();
      const allSpecs = await loadAllSpecs(config.specsDir, input.includeArchived);
      const graph = new SpecDependencyGraph(allSpecs);
      const output = graph.toJSON(input.format || 'adjacency-list');
      return { content: [{ type: 'text', text: JSON.stringify(output, null, 2) }] };
    }
  ];
}
```

### Implementation Strategy

**Phase 1: Core Package** (Foundation)
- Extract `SpecDependencyGraph` class to `@leanspec/core`
- Implement graph building and query methods
- Add unit tests for graph construction and traversal
- Export for use in CLI, MCP, and web

**Phase 2: CLI Enhancement** (User-Facing)
- Enhance `packages/cli/src/commands/deps.ts`
- Add `--complete`, `--upstream`, `--downstream`, `--impact` flags
- Update output formatting for new sections
- Ensure backward compatibility

**Phase 3: MCP Enhancement** (AI-Facing)
- Update `packages/cli/src/mcp/tools/deps.ts`
- Add `dependency-graph.ts` new tool
- Update tool registry
- Add examples to AGENTS.md

**Phase 4: Web Integration** (Spec 097)
- Web API uses same `SpecDependencyGraph` class
- Ensures consistency across interfaces
- Completed in spec 097 (Phase 2)

## Plan

### Phase 1: Core Package Implementation (Days 1-2)
- [ ] Create `packages/core/src/dependency-graph.ts`
  - [ ] Define `DependencyNode` interface
  - [ ] Implement `SpecDependencyGraph` class
  - [ ] Add `buildGraph()` method (bidirectional edge construction)
  - [ ] Add `getCompleteGraph()` method
  - [ ] Add `getUpstream()` method (recursive traversal)
  - [ ] Add `getDownstream()` method (recursive traversal)
  - [ ] Add `getImpactRadius()` method
  - [ ] Add `toJSON()` method for serialization
- [ ] Export from `packages/core/src/index.ts`
- [ ] Add unit tests for `SpecDependencyGraph`
  - [ ] Test graph construction (forward + reverse edges)
  - [ ] Test upstream traversal (depth limiting)
  - [ ] Test downstream traversal
  - [ ] Test circular dependency handling
  - [ ] Test bidirectional related connections
  - [ ] Test edge cases (no dependencies, orphaned specs)
- [ ] Build and verify compilation (`pnpm build`)

### Phase 2: CLI Enhancement (Days 3-4)
- [ ] Update `packages/cli/src/commands/deps.ts`
  - [ ] Import `SpecDependencyGraph` from `@leanspec/core`
  - [ ] Add command options: `--complete`, `--upstream`, `--downstream`, `--impact`
  - [ ] Instantiate graph in `showDeps()` function
  - [ ] Add `displayCompleteGraph()` helper (requiredBy section)
  - [ ] Add `displayUpstream()` helper
  - [ ] Add `displayDownstream()` helper
  - [ ] Add `displayImpact()` helper
  - [ ] Update JSON output format (include requiredBy)
  - [ ] Preserve existing `--depth`, `--graph`, `--json` behavior
- [ ] Update CLI help text in `packages/cli/src/cli.ts`
- [ ] Add examples to CLI docs
- [ ] Manual testing
  - [ ] Test `lean-spec deps 082 --complete`
  - [ ] Test `lean-spec deps 082 --upstream`
  - [ ] Test `lean-spec deps 082 --downstream`
  - [ ] Test `lean-spec deps 082 --impact`
  - [ ] Test `lean-spec deps 082 --complete --json`
  - [ ] Test backward compatibility (no flags)

### Phase 3: MCP Enhancement (Days 5-6)
- [ ] Update `packages/cli/src/mcp/tools/deps.ts`
  - [ ] Import `SpecDependencyGraph` from `@leanspec/core`
  - [ ] Add `mode` parameter to `getDepsData()` function
  - [ ] Implement mode routing (complete, upstream, downstream, impact)
  - [ ] Update tool schema (add mode parameter)
  - [ ] Update output schema (include requiredBy)
  - [ ] Update tool description
- [ ] Create `packages/cli/src/mcp/tools/dependency-graph.ts` (NEW)
  - [ ] Implement `dependencyGraphTool()` definition
  - [ ] Implement graph handler (project-wide view)
  - [ ] Add format options (adjacency-list, edge-list)
  - [ ] Add includeArchived option
- [ ] Update `packages/cli/src/mcp/tools/registry.ts`
  - [ ] Import `dependencyGraphTool`
  - [ ] Register new tool (alphabetical order)
- [ ] Update AGENTS.md
  - [ ] Document enhanced `deps` tool
  - [ ] Document new `dependency-graph` tool
  - [ ] Add usage examples
  - [ ] Update dependency analysis workflow

### Phase 4: Documentation & Testing (Day 7)
- [ ] Update docs-site documentation
  - [ ] Update CLI reference (`docs/reference/cli.mdx`)
  - [ ] Update MCP reference (`docs/reference/mcp-server.mdx`)
  - [ ] Add examples to usage guide
- [ ] Integration testing
  - [ ] Test CLI → Core graph integration
  - [ ] Test MCP → Core graph integration
  - [ ] Verify consistency (CLI output matches MCP output)
  - [ ] Test with complex dependency chains (5+ levels)
  - [ ] Test with circular dependencies (error handling)
- [ ] Performance benchmarking
  - [ ] Measure graph construction time (100 specs)
  - [ ] Measure query time (<1ms target)
  - [ ] Measure memory usage (<100KB target)
- [ ] Build and deploy
  - [ ] Run `pnpm build` (verify compilation)
  - [ ] Run `pnpm test:run` (all tests pass)
  - [ ] Update spec 099 status to `complete`

## Test

### Phase 1 Tests (Core Package)

**Graph Construction**:
- [ ] Build graph from 100 specs in <1ms
- [ ] Correctly identify all dependsOn relationships
- [ ] Correctly build reverse requiredBy edges
- [ ] Handle bidirectional related connections
- [ ] Handle specs with no dependencies
- [ ] Handle orphaned specs (not referenced by any other spec)

**Graph Queries**:
- [ ] `getCompleteGraph()` returns all 3 relationship types
- [ ] `getUpstream()` traverses dependsOn chain correctly
- [ ] `getDownstream()` traverses requiredBy chain correctly
- [ ] `getImpactRadius()` includes upstream + downstream + related
- [ ] Depth limiting works (stops at maxDepth)
- [ ] Circular dependency detection works (prevents infinite loops)

**Edge Cases**:
- [ ] Empty spec list returns empty graph
- [ ] Spec with no relationships returns empty sets
- [ ] Non-existent spec throws error
- [ ] Duplicate relationships deduplicated

### Phase 2 Tests (CLI Enhancement)

**Functional**:
- [ ] `lean-spec deps <spec>` shows requiredBy section (backward compatible enhancement)
- [ ] `--complete` flag shows all relationships
- [ ] `--upstream` flag shows only dependsOn
- [ ] `--downstream` flag shows only requiredBy
- [ ] `--impact` flag shows all affected specs
- [ ] `--json` output includes requiredBy field
- [ ] `--depth` flag still works with new modes
- [ ] `--graph` flag still works (ASCII tree)

**Output Format**:
- [ ] Required By section uses ← arrow
- [ ] Depends On section uses → arrow
- [ ] Related section uses ⟷ arrow
- [ ] Status indicators appear correctly
- [ ] JSON output is valid and parseable

**Backward Compatibility**:
- [ ] Existing scripts using `lean-spec deps` still work
- [ ] JSON output is superset (no removed fields)
- [ ] Exit codes unchanged
- [ ] Error messages unchanged

### Phase 3 Tests (MCP Enhancement)

**MCP Tool - deps (enhanced)**:
- [ ] Tool accepts `mode` parameter
- [ ] Mode 'complete' returns all relationships
- [ ] Mode 'upstream' returns only dependsOn
- [ ] Mode 'downstream' returns only requiredBy
- [ ] Mode 'impact' returns full impact radius
- [ ] Output includes requiredBy field
- [ ] Backward compatible (no mode defaults to complete)

**MCP Tool - dependency-graph (new)**:
- [ ] Tool returns project-wide graph
- [ ] Adjacency list format correct
- [ ] Edge list format correct
- [ ] includeArchived flag works
- [ ] Output includes all 3 relationship types per spec

**Integration**:
- [ ] MCP server starts without errors
- [ ] Tools appear in alphabetical order
- [ ] Tool schemas validate correctly
- [ ] AI assistants can call tools successfully

### Phase 4 Tests (Integration & Performance)

**Cross-Interface Consistency**:
- [ ] CLI and MCP return identical dependency data for same spec
- [ ] Web API (spec 097) returns identical dependency data
- [ ] All interfaces use same `SpecDependencyGraph` class
- [ ] Graph construction identical across interfaces

**Performance**:
- [ ] Graph construction <1ms for 100 specs
- [ ] Query time <1ms for typical spec
- [ ] Memory usage <100KB for graph
- [ ] No memory leaks over 100 queries
- [ ] Cold start acceptable (<10ms)

**Real-World Scenarios**:
- [ ] LeanSpec's own specs (100+ specs)
- [ ] Spec with 10+ dependencies (spec 082)
- [ ] Spec with 10+ dependents
- [ ] Deep dependency chain (5+ levels)
- [ ] Circular dependency handling (error message)
- [ ] Complex related network (10+ bidirectional connections)

## Notes

### Design Decisions

**Why Share Implementation in @leanspec/core?**
- **Consistency**: Web, CLI, MCP all show same dependency data
- **Performance**: Shared, optimized graph implementation
- **Maintainability**: Single source of truth for graph logic
- **Testing**: Test once, use everywhere

**Why Enhance Existing `deps` Command Instead of New Command?**
- **User Expectation**: `deps` is the natural place for dependency info
- **Backward Compatible**: Existing usage still works
- **Discoverability**: Users already know `deps` command
- **Consistency**: Matches existing command structure

**Why Add New MCP Tool Instead of Only Enhancing Existing?**
- **Separation of Concerns**: `deps` for single spec, `dependency-graph` for project-wide
- **AI Agent Use Cases**: Sometimes need full graph for analysis
- **Performance**: Project-wide graph cached once, queried many times
- **Flexibility**: Different tools for different needs

**Why Not Add to Web App First?**
- Spec 097 is already implementing complete graph for web
- This spec focuses on CLI/MCP
- Both use same core implementation
- Coordinated rollout ensures consistency

### Relationship to Other Specs

**This spec depends on:**
- **082 (Web Realtime Sync)**: Service layer architecture patterns
- **097 (DAG Visualization)**: Complete dependency graph design (Phase 2 API)
- Existing CLI commands (`deps`, spec path resolution)
- Existing MCP tools (tool registry, helper functions)
- Spec 080 (MCP modular architecture) - Tool organization patterns

**This spec enables:**
- Better AI agent dependency awareness
- Informed spec work order decisions
- Impact analysis before making changes
- Complete dependency visualization in web app (spec 097)
- Future dependency analysis features

**This spec blocks:**
- None (additive enhancement)

**Related specs:**
- **076 (programmatic-spec-relationships)**: Relationship management commands
- **085 (cli-relationship-commands)**: `link`/`unlink` commands
- **097 (dag-visualization-library)**: Web app complete graph (same core implementation)

### Implementation Notes

**Memory Management**:
- Graph built once per command invocation
- 75KB memory for 100 specs (negligible)
- No persistence needed (rebuild is fast)
- Consider caching in long-running MCP server

**Error Handling**:
- Non-existent spec: Clear error message
- Circular dependencies: Detect and prevent infinite loops
- Missing relationships: Graceful degradation (show what's available)
- Corrupt frontmatter: Skip spec and log warning

**Future Enhancements**:
- **Caching**: Cache graph in MCP server (rebuild on spec changes)
- **Visualization**: ASCII art dependency tree
- **Analysis**: Detect orphaned specs, suggest relationships
- **Performance**: Incremental graph updates (not full rebuild)

### Open Questions

- [x] Should we rebuild graph on every command? → **Yes, <1ms startup cost is acceptable**
- [x] Should MCP server cache graph? → **Future enhancement, not critical for v1**
- [x] Should we add `--complete` flag or make it default? → **Make requiredBy default, add mode flags**
- [ ] Should we add `--format` flag for different output styles? → **Future enhancement**
- [ ] Should we add graph visualization (ASCII art)? → **Future enhancement**

### Success Criteria

**Phase 1 (Core)**:
- ✅ `SpecDependencyGraph` class in `@leanspec/core`
- ✅ All tests pass
- ✅ Performance <1ms graph construction

**Phase 2 (CLI)**:
- ✅ `lean-spec deps <spec>` shows requiredBy
- ✅ New flags work (`--complete`, `--upstream`, `--downstream`, `--impact`)
- ✅ Backward compatible (existing scripts work)

**Phase 3 (MCP)**:
- ✅ Enhanced `deps` tool with mode parameter
- ✅ New `dependency-graph` tool for project-wide view
- ✅ AGENTS.md updated with examples

**Phase 4 (Integration)**:
- ✅ CLI, MCP, Web all use same core implementation
- ✅ Consistent output across interfaces
- ✅ Documentation updated
- ✅ All tests pass
