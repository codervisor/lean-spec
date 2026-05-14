---
status: planned
created: 2026-05-14
priority: high
tags:
- http
- migration
- adapter
- rust
depends_on:
- "383-markdown-adapter-domain-isolation"
- "384-github-adapter"
created_at: 2026-05-14T00:00:00Z
updated_at: 2026-05-14T00:00:00Z
---

# HTTP Read Path Migration

## Overview

`leanspec-http` read handlers (`list`, `get`, `search`, `stats`, `deps`,
`validate`) currently bypass the adapter layer — they call `SpecLoader` directly
and build responses from `SpecInfo`. This spec migrates the read path to go
through `AdapterRegistry::from_project()`, replacing `From<&SpecInfo>`
conversions with `From<&SpecDoc>` on the HTTP response types.

Done when: all read handlers use the adapter, old `SpecLoader`/`SpecInfo`
imports are gone from `leanspec-http`, and all existing HTTP tests pass.

## Design

### Response type conversion

`rust/leanspec-http/src/types/specs.rs` currently defines `SpecSummary` and
`SpecDetail` built from `&SpecInfo`. These are replaced entirely:

```rust
// BEFORE
impl From<&SpecInfo> for SpecSummary { … }
impl From<&SpecInfo> for SpecDetail { … }

// AFTER
impl From<&SpecDoc> for SpecSummary { … }
impl From<&SpecDoc> for SpecDetail { … }
```

The old `From<&SpecInfo>` implementations are deleted in the same commit —
no dual-path compatibility shim.

Field mapping from `SpecDoc` to HTTP types uses semantic hints:

```rust
fn status_str(doc: &SpecDoc, schema: &SpecSchema) -> Option<String> {
    let key = schema.key_for_semantic(semantic::STATUS)?;
    doc.fields.get(key)?.as_string()
}
```

### `helpers.rs` — project loader replacement

`get_loader_and_project()` is replaced by `get_adapter_and_project()`:

```rust
// BEFORE
fn get_loader_and_project(req: &Request) -> Result<(SpecLoader, Project), ApiError>

// AFTER
fn get_adapter_and_project(req: &Request) -> Result<(Box<dyn Adapter>, Project), ApiError>
```

The new helper calls `AdapterRegistry::from_project(&project.root)` using the
project root resolved from the request context.

### Handler migration pattern

Each read handler follows the same pattern:

```rust
async fn list_specs(State(state): State<AppState>, Query(params): Query<ListParams>)
    -> Result<Json<ListResponse>, ApiError>
{
    let (adapter, project) = get_adapter_and_project(&state, &params)?;
    let schema = adapter.schema();

    let filter = ListFilter {
        fields: build_fields_map(&params, schema),
        text: params.search.clone(),
        include_archived: params.include_archived.unwrap_or(false),
        raw: None,
    };

    let docs = adapter.list(&filter).map_err(ApiError::from)?;
    let summaries: Vec<SpecSummary> = docs.iter().map(SpecSummary::from).collect();
    Ok(Json(ListResponse { items: summaries, total: summaries.len() }))
}
```

### Stats handler

The `stats` handler computes token counts and status/priority distributions.
After migration:
- Status distribution: group `docs` by `schema.key_for_semantic(semantic::STATUS)`
- Priority distribution: group by `schema.key_for_semantic(semantic::PRIORITY)`
- Token counting: still operates on `fields["content"]` string value

### Deps and validate handlers

These are markdown-specific operations. After read-path migration, they check
whether the active adapter is markdown and return `HTTP 422 Unprocessable`
with body `{ "error": "This operation requires a markdown adapter" }` if not.
For markdown projects they continue working as before, calling the markdown
adapter's internal graph/validation utilities.

### Schema endpoint

Add `GET /api/schema` → returns the active adapter's `SpecSchema` as JSON.
This enables the UI to render dynamic field sets based on the active adapter.

### `watcher.rs`

File watching is markdown-specific. The watcher holds a `MarkdownAdapter`
reference (not `Box<dyn Adapter>`) for `invalidate_path()`. The watcher is
only activated when the project's adapter config is `"markdown"`. For
non-markdown adapters, file watching is a no-op.

## Plan

- [ ] `rust/leanspec-http/src/types/specs.rs`
  - [ ] Replace `impl From<&SpecInfo> for SpecSummary` with `impl From<&SpecDoc>`
  - [ ] Replace `impl From<&SpecInfo> for SpecDetail` with `impl From<&SpecDoc>`
  - [ ] Use semantic hints for all field lookups (status, priority, tags, assignee)
  - [ ] Delete all `SpecInfo`, `SpecStatus`, `SpecPriority` imports
- [ ] `rust/leanspec-http/src/handlers/specs/helpers.rs`
  - [ ] Replace `get_loader_and_project()` with `get_adapter_and_project()`
  - [ ] Remove `SpecLoader` import
- [ ] `rust/leanspec-http/src/handlers/specs/read.rs`
  - [ ] Migrate list handler
  - [ ] Migrate get-by-id handler
  - [ ] Migrate search handler
  - [ ] Add markdown-only guard to deps handler
  - [ ] Add markdown-only guard to validate handler
  - [ ] Remove `SpecLoader`, `SpecInfo`, `SpecStatus` imports
- [ ] `rust/leanspec-http/src/handlers/specs/` (stats handler)
  - [ ] Migrate stats to semantic-hint grouping from `SpecDoc` fields
- [ ] Add `GET /api/schema` route returning `SpecSchema` as JSON
- [ ] `rust/leanspec-http/src/watcher.rs`
  - [ ] Change watcher to hold `Arc<MarkdownAdapter>` instead of using static `SpecLoader::invalidate_cached_path`
  - [ ] Guard watcher activation behind markdown-adapter check
- [ ] Verify `cargo check -p leanspec-http` passes
- [ ] All existing HTTP integration tests pass

## Test

- [ ] `cargo test -p leanspec-http` passes with zero failures
- [ ] `GET /api/specs` returns correct list for a markdown project
- [ ] `GET /api/specs/:id` returns correct detail for a markdown project
- [ ] `GET /api/schema` returns the active adapter's schema fields
- [ ] Deps and validate endpoints return 422 with clear message when adapter is not markdown
- [ ] No `SpecLoader`, `SpecInfo`, `SpecStatus`, `SpecPriority` imports remain in `leanspec-http`
- [ ] `cargo clippy -p leanspec-http -- -D warnings` passes

## Notes

### JSON shape compatibility

The HTTP API response JSON shape may change slightly because `SpecDoc.fields`
is a `HashMap<String, FieldValue>` while `SpecInfo.frontmatter` had fixed named
fields. Check whether the UI (`packages/ui/`) depends on specific field names
in the JSON response. If yes, spec 386 must include a UI compatibility audit
before merging. Coordinate with the UI package team.

### Multi-project registry

`project_registry.rs` manages multiple projects. Each project should resolve
its own adapter via its own `leanspec.adapter.yaml`. The registry needs to
instantiate and cache `Box<dyn Adapter>` per project rather than per-request.
