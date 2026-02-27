---
status: planned
created: 2026-02-27
priority: high
tags:
- performance
- rust
- api
- architecture
created_at: 2026-02-27T03:47:58.186849Z
updated_at: 2026-02-27T03:47:58.186849Z
---
# Spec Loading Performance Optimization

## Problem

With 337+ specs, API calls to list/load all specs are slow. Every request triggers a full filesystem traversal, file reads, and YAML frontmatter parsing with no caching layer. The **hierarchy/tree view** compounds this — it requires loading ALL specs to resolve parent-child relationships and build the tree.

### Current Architecture

- `SpecLoader::load_all()` in `rust/leanspec-core/src/utils/spec_loader.rs` walks the entire directory tree on **every** request
- Each spec triggers: `WalkDir` traversal → `fs::read_to_string()` → YAML `serde_yaml::from_str()` → content title search
- **337 disk reads + 337 YAML parses per request** with no caching
- MCP tools (`board`, `list`, `search`) all call `load_all()` unconditionally
- `load_exact()` internally calls `load_all()` to find a single spec
- No pagination support in `ListSpecsQuery`
- SyncState cache exists for synced machines but direct API/CLI calls bypass it

### Tree/Hierarchy View Impact

The `?hierarchy=true` query on `GET /api/projects/:id/specs` triggers additional processing on top of the full spec load:

1. **Full load is mandatory** — tree building requires ALL specs to resolve parent-child links (`list_project_specs()` in `handlers/specs.rs`)
2. **Children map construction** — iterates all specs to build `HashMap<String, Vec<String>>` of parent→children mappings
3. **`required_by` map** — iterates all specs and their `depends_on` lists to build reverse dependency index
4. **Recursive tree building** — `build_hierarchy()` recursively constructs `HierarchyNode` tree from roots down, with sorting at each level
5. **MCP relationship tools** — `relationships` (view), `children`, `set_parent` all call `load_all()` to validate constraints and filter
6. **Client-side fallback** — `packages/ui/src/lib/hierarchy.ts` `buildHierarchy()` can rebuild the tree if server doesn't provide it, duplicating work

**For non-synced machines with 300+ specs, the hierarchy request is the slowest path (~1.5-3s).**

### Affected Code Paths

| Component | File | Function |
|-----------|------|----------|
| HTTP Spec List + Hierarchy | `rust/leanspec-http/src/handlers/specs.rs` | `list_project_specs()`, `build_hierarchy()` |
| Hierarchy Data Model | `rust/leanspec-http/src/types.rs` | `HierarchyNode`, `ListSpecsResponse` |
| Core Loader | `rust/leanspec-core/src/utils/spec_loader.rs` | `load_all()`, `load_spec_from_path()` |
| Frontmatter Parser | `rust/leanspec-core/src/parsers/frontmatter.rs` | `parse()` |
| MCP Board | `rust/leanspec-mcp/src/tools/board.rs` | `tool_board()` |
| MCP List | `rust/leanspec-mcp/src/tools/specs.rs` | `tool_list()` |
| MCP Relationships | `rust/leanspec-mcp/src/tools/relationships.rs` | `tool_relationships()`, `tool_children()` |
| Client Hierarchy Builder | `packages/ui/src/lib/hierarchy.ts` | `buildHierarchy()` |
| Client Tree Renderer | `packages/ui/src/components/library/hierarchy/hierarchy-tree.tsx` | Virtual scrolling with `react-window` |

## Proposed Solution

### Phase 1: In-Memory Spec Cache (High Impact)

- [ ] Add a `SpecCache` with file-watcher-based invalidation (leverage existing `FileWatcher` in `watcher.rs`)
- [ ] Cache parsed spec metadata (frontmatter) in memory after first load
- [ ] Invalidate individual spec entries on file change (not full cache flush)
- [ ] Share cache across HTTP handlers and MCP tools

### Phase 2: Cached Hierarchy / Relationship Index (High Impact)

- [ ] Cache the parent→children map and required_by index alongside the spec cache
- [ ] Incrementally update relationship indices when a single spec changes (re-index only affected entries)
- [ ] Pre-compute `HierarchyNode` tree and invalidate only affected subtrees on spec change
- [ ] Ensure `relationships`, `children`, and `set_parent` MCP tools use cached indices instead of `load_all()`
- [ ] Eliminate redundant client-side `buildHierarchy()` when server provides pre-built tree

### Phase 3: Lazy & Partial Loading (Medium Impact)

- [ ] Separate metadata-only loading from full content loading
- [ ] List/board/hierarchy endpoints return only frontmatter fields (no body content)
- [ ] Load full content only on `view` requests
- [ ] Optimize `load_exact()` to avoid `load_all()` — resolve path directly from spec ID

### Phase 4: Pagination & Streaming (Lower Priority)

- [ ] Add `limit` and `offset` parameters to `ListSpecsQuery`
- [ ] Support cursor-based pagination for large spec sets
- [ ] Consider streaming responses for very large projects
- [ ] For hierarchy mode: support collapsible subtree loading (load children on-demand)

### Phase 5: Parallel Loading (Optimization)

- [ ] Use `rayon` or `tokio::spawn` for parallel file reads during cold cache
- [ ] Batch YAML parsing across multiple files

## Success Criteria

- [ ] Cold load time for 300+ specs under 500ms (flat and hierarchy)
- [ ] Cached/warm load time under 50ms
- [ ] Hierarchy tree build from cache under 10ms
- [ ] No regression in spec data accuracy or relationship integrity
- [ ] MCP and CLI tools benefit from same cache layer
- [ ] Memory usage stays reasonable (< 50MB for 1000 specs)