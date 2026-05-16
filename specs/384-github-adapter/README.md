---
status: planned
created: 2026-05-14
priority: critical
tags:
- adapter
- github
- backend
- rust
depends_on:
- "383-markdown-adapter-domain-isolation"
created_at: 2026-05-14T00:00:00Z
updated_at: 2026-05-14T00:00:00Z
---

# GitHub Adapter

## Overview

Implement `GitHubAdapter` — the first non-markdown `Adapter` implementation.
This validates the adapter trait interface end-to-end before 22 CLI commands
depend on it. No CLI changes in this spec; the adapter is built and tested in
isolation.

Done when: `leanspec capabilities` works against a GitHub-configured project,
and the test harness can create, read, update, close, and search a GitHub Issue
end-to-end.

## Design

### HTTP client

Use `reqwest` blocking client. The CLI has a plain `fn main()`; blocking avoids
runtime-in-runtime panics when called from `leanspec-http`'s async Axum
handlers (which use `spawn_blocking`). Feature-gate behind `github` in
`leanspec-core/Cargo.toml` so the dependency is not compiled for users who
don't need it.

```toml
[features]
github = ["reqwest/blocking", "reqwest/json"]

[dependencies]
reqwest = { version = "0.12", optional = true, features = [] }
```

### Authentication

Token read from an environment variable at construction time. The env var name
is configurable (`token_env` field in config, defaults to `"GITHUB_TOKEN"`).
The token is never written to `leanspec.adapter.yaml` — that file is safe to
commit.

```yaml
# leanspec.adapter.yaml
adapter: github
settings:
  owner: acme
  repo: backend
  token_env: GITHUB_TOKEN   # optional, this is the default
```

### Field mapping

| GitHub REST field | `SpecDoc` key | Semantic hint | Notes |
|---|---|---|---|
| `state` (open/closed) | `status` | `status` | Enum options: open, closed |
| `labels[].name` | `tags` | `tags` | Multi-value |
| `assignees[0].login` | `assignee` | `assignee` | First assignee only |
| `milestone.due_on` | `due` | `due_date` | ISO date string |
| `title` | — | — | Stored in `SpecDoc.title` |
| `body` | `content` | — | Markdown string |
| `number` | — | — | Stored in `SpecDoc.id` as string |
| `html_url` | — | — | Stored in `SpecDoc.url` |
| Full JSON | — | — | Stored in `SpecDoc.raw` |

Priority has no native GitHub field. The adapter declares it as a label-backed
field: labels prefixed `priority:` (e.g. `priority:high`) are mapped to the
`priority` field. If no priority label is present, the field is absent from
`SpecDoc.fields`.

### `resolve_schema()`

Called by `AdapterRegistry` after construction. Fetches all repository labels
via `GET /repos/{owner}/{repo}/labels`. Labels are grouped:
- Labels prefixed `priority:` → populate `priority` enum options
- All other labels → populate `tags` enum options (replacing the empty
  `options: []` declared in the static schema)

This makes `leanspec capabilities` show the project's actual labels rather than
generic placeholders.

### `delete()` semantics

GitHub has no hard-delete for issues. `delete(id)` closes the issue (sets
`state: closed`). This matches the "archive" semantics used by the CLI.

### Rate limiting

GitHub Search API: 30 requests/minute. Other endpoints: 5000 requests/hour.
When a response has HTTP 403 or 429, return
`AdapterError::RateLimit { reset_at: DateTime<Utc> }` parsed from the
`X-RateLimit-Reset` header. Do not retry internally — let the caller decide.

### Error mapping

| HTTP status | `AdapterError` variant |
|---|---|
| 401 | `AuthError("GITHUB_TOKEN is invalid or missing")` |
| 403/429 + rate limit header | `RateLimit { reset_at }` |
| 404 | `NotFound(id)` |
| 422 | `ValidationError(body)` |
| 5xx | `BackendError(status, body)` |
| Network error | `BackendError("network: {msg}")` |

### Unit test strategy

No real network calls in unit tests. Tests use `mockito` (or hand-rolled
response fixtures) to return canned JSON. Cover:

- `list()` with label/assignee/state filter combinations
- `get()` happy path and 404
- `create()` maps `CreateRequest` fields to GitHub issue body
- `update()` maps `UpdateRequest` to PATCH payload
- `delete()` closes the issue
- `search()` maps query string to GitHub Search API
- `resolve_schema()` populates enum options from label list
- Rate limit error propagation

### Integration test scaffold

```rust
#[cfg(feature = "github-integration-tests")]
mod integration {
    // Requires: GITHUB_TOKEN, TEST_GITHUB_OWNER, TEST_GITHUB_REPO
    // Creates a real issue, reads it back, updates it, closes it.
    // Cleans up after itself.
}
```

Guard with both the feature flag and `#[ignore]` so they never run in CI
without explicit opt-in.

## Plan

- [ ] Add `reqwest` dependency behind `github` feature in `leanspec-core/Cargo.toml`
- [ ] Create `rust/leanspec-core/src/adapters/github.rs`
  - [ ] `pub struct GitHubAdapter` with `owner`, `repo`, `token`, `client` fields
  - [ ] `impl GitHubAdapter` constructor: `new(owner, repo, token_env) -> Result<Self, AdapterError>`
  - [ ] Implement `capabilities()` — return `AdapterCapabilities` for GitHub
  - [ ] Implement `schema()` — declare static schema with status, tags, assignee, due, priority, content fields
  - [ ] Implement `resolve_schema()` — fetch labels, populate enum options
  - [ ] Implement `list(filter)` — `GET /repos/.../issues` with query params
  - [ ] Implement `get(id)` — `GET /repos/.../issues/{number}`
  - [ ] Implement `create(req)` — `POST /repos/.../issues`
  - [ ] Implement `update(id, req)` — `PATCH /repos/.../issues/{number}`
  - [ ] Implement `delete(id)` — close issue via PATCH
  - [ ] Implement `search(query, opts)` — `GET /search/issues`
  - [ ] Helper: `issue_to_doc(json) -> SpecDoc`
  - [ ] Helper: `map_error(status, headers, body) -> AdapterError`
- [ ] Extend `AdapterConfig::settings` deserialization in `registry.rs`:
  - [ ] Add `"github"` arm to `AdapterRegistry::create()` factory
  - [ ] Deserialize `{ owner, repo, token_env }` from `settings` Value
- [ ] Add unit tests with canned JSON fixtures (full coverage per Design above)
- [ ] Add integration test scaffold (feature-gated + `#[ignore]`)
- [ ] Update `rust/leanspec-core/Cargo.toml` feature list; ensure default features exclude `github`
- [ ] Verify `leanspec capabilities` output against a real GitHub repo (manual test)

## Test

- [ ] `cargo test -p leanspec-core --features github` passes
- [ ] All unit tests use only canned JSON — no network calls
- [ ] `list()` with status filter returns only open/closed issues as expected
- [ ] `create()` + `get()` round-trip: fields survive the journey
- [ ] `update()` correctly patches only the fields present in `UpdateRequest`
- [ ] `delete()` closes the issue (state = closed), does not hard-delete
- [ ] `resolve_schema()` populates tags and priority options from label list
- [ ] `RateLimit` error includes correct `reset_at` timestamp
- [ ] `leanspec capabilities` output (manual): shows project's real labels

## Notes

### Priority via labels convention

Using `priority:high` label prefixes is a convention, not a GitHub standard.
Document this in `leanspec init --adapter github` output so teams know to
create these labels if they want priority support.

### Pagination

GitHub returns max 100 issues per page. `list()` must paginate via
`Link: <url>; rel="next"` header until all results are fetched (or a
configurable `--limit` is hit). Default: fetch up to 1000 items.

### `get_links()` default implementation

The default `get_links()` on the `Adapter` trait calls `self.get(id)` and
returns `doc.links`. GitHub issues don't have native link relationships, so
`links` will always be empty unless the adapter later parses issue body for
`depends_on:` markers.
