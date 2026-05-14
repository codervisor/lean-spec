---
status: planned
created: 2026-05-14
priority: medium
tags:
- schema
- adapter
- dynamic
- enrichment
depends_on:
- "384-github-adapter"
- "396-ado-adapter"
- "398-jira-adapter"
created_at: 2026-05-14T00:00:00Z
updated_at: 2026-05-14T00:00:00Z
---

# Dynamic Schema Enrichment

## Overview

Each adapter implements `resolve_schema()` as part of its specs (384, 396, 398),
but the contract between `AdapterRegistry` and the enrichment lifecycle is not
yet fully defined. This spec formalises:

1. When `resolve_schema()` is called and by whom
2. How enriched schemas are cached and invalidated
3. How enrichment errors are surfaced
4. How the CLI, MCP server, and HTTP server all access the enriched schema

After this spec, running `leanspec capabilities` on any adapter shows the
project's actual field options (real GitHub labels, real ADO states, real Jira
statuses) — not static placeholders.

Done when: all three adapters enrich their schemas on first use, with caching
and error handling working correctly across CLI, MCP, and HTTP server.

## Design

### `resolve_schema()` lifecycle

```
AdapterRegistry::from_project()
  → construct adapter (no network call)
  → call adapter.resolve_schema(&mut schema)
  → cache result in AdapterRegistry
  → return Box<dyn Adapter> with enriched schema
```

`resolve_schema()` is called **once per adapter instance creation**, not per
command invocation. The CLI creates one adapter per invocation; the MCP/HTTP
servers create one per startup (or per project in multi-project mode).

### `AdapterRegistry` cache

For long-running processes (MCP server, HTTP server), the enriched schema
should not be re-fetched on every request. The registry caches the enriched
schema per project root path:

```rust
pub struct AdapterRegistry {
    cache: Mutex<HashMap<PathBuf, CachedAdapter>>,
}

struct CachedAdapter {
    adapter: Arc<dyn Adapter>,
    resolved_at: Instant,
    ttl: Duration,   // configurable, default 5 minutes
}
```

`from_project(root)` checks the cache first. If the entry is fresh, returns
the cached adapter. If stale or missing, constructs a new adapter and calls
`resolve_schema()`.

For the CLI (single-invocation, no caching needed), `AdapterRegistry::from_project()`
is a simple construct-and-resolve with no caching overhead.

### Error handling for `resolve_schema()`

`resolve_schema()` is fallible — the network request might fail (no internet,
invalid credentials). Errors are **warnings, not failures**:

```rust
match adapter.resolve_schema(&mut schema) {
    Ok(()) => {},
    Err(e) => {
        eprintln!("warning: could not enrich schema ({}). Using static defaults.", e);
        // Continue with unenriched schema — do not abort
    }
}
```

This means the CLI still works even if the schema enrichment call fails (e.g.
when running offline). The unenriched schema's static defaults are used.

### What each adapter enriches

**GitHub (`resolve_schema`)**:
- Fetches all repo labels: `GET /repos/{owner}/{repo}/labels`
- Labels prefixed `priority:` → populate `priority` enum options
- All other labels → populate `tags` enum options
- Replaces `options: []` in the static schema

**ADO (`resolve_schema`)**:
- Fetches project state categories: `GET /_apis/work/workitemtypes/{type}/states`
- Populates `status` enum options with real state names + colors
- Fetches priority levels from project config (or uses int 1–4 mapping)

**Jira (`resolve_schema`)**:
- Fetches project statuses: `GET /rest/api/3/project/{key}/statuses`
- Fetches priority scheme: `GET /rest/api/3/priority`
- Populates `status` and `priority` enum options

**Markdown (`resolve_schema`)**:
- No-op (static schema is authoritative)
- May in the future scan existing specs to populate `assignee` and `tags`
  option lists (for autocomplete)

### CLI `capabilities` output improvement

After enrichment, `leanspec capabilities` shows:

```
Adapter: github (acme/backend)
Schema: leanspec:feature

Fields:
  status   Status   enum  [open, closed]          semantic: status
  tags     Tags     enum  [bug, enhancement, ... ] semantic: tags  (14 options)
  assignee Assignee enum  [alice, bob, carol]      semantic: assignee
  content  Content  text

Link types:
  (none declared)
```

Instead of `(dynamic — resolved at runtime)` for enum options.

### Schema cache invalidation

- CLI: no caching, always fresh
- HTTP server: `POST /api/schema/refresh` endpoint forces re-resolution
- MCP server: `reload_schema` tool (or automatic TTL expiry)
- Manual: `leanspec capabilities --refresh` re-fetches the schema

## Plan

- [ ] Define `resolve_schema()` lifecycle in `AdapterRegistry::from_project()`
  - [ ] Call `adapter.resolve_schema(&mut schema)` after construction
  - [ ] Treat errors as warnings (print to stderr, continue)
- [ ] Add `AdapterRegistry` instance cache for long-running processes
  - [ ] `CachedAdapter` struct with TTL
  - [ ] `from_project_cached(root, ttl) -> Arc<dyn Adapter>`
  - [ ] Default TTL: 5 minutes
- [ ] HTTP server: use `from_project_cached()` in `project_registry.rs`
- [ ] HTTP server: add `POST /api/schema/refresh` endpoint
- [ ] MCP server: add `reload_schema` tool
- [ ] CLI: add `--refresh` flag to `capabilities` command
- [ ] Update `leanspec capabilities` output to display resolved enum options
- [ ] Document enrichment behavior and offline fallback in skill reference files

## Test

- [ ] GitHub adapter: `resolve_schema()` populates tags/priority from repo labels
- [ ] ADO adapter: `resolve_schema()` populates status from project states
- [ ] Jira adapter: `resolve_schema()` populates status/priority from project config
- [ ] Network failure during `resolve_schema()`: command continues with static schema + warning
- [ ] `leanspec capabilities` shows resolved enum options (not empty `[]`)
- [ ] HTTP server: schema cache hit on second request (no second network call)
- [ ] HTTP server: `POST /api/schema/refresh` clears cache and re-resolves
- [ ] Cache TTL: after TTL expires, next `from_project_cached()` re-resolves

## Notes

### Enriched schema serialization

The `SpecSchema` struct must be serializable to JSON (`#[derive(Serialize)]` if
not already present) for the MCP `get_schema` tool and HTTP `/api/schema`
endpoint.

### Assignee autocomplete via enrichment

For GitHub: `resolve_schema()` could fetch recent assignees (collaborators or
issue assignees from recent issues) to populate `assignee` enum options. This
enables autocomplete in the TUI filter panel. Mark as an optional enhancement
— the `dynamic: true` flag on assignee field already signals this intent.
