---
status: archived
created: 2026-05-13
priority: critical
tags:
- strategy
- architecture
- pivot
- github-adapter
- cli
depends_on: []
created_at: 2026-05-13T00:00:00Z
updated_at: 2026-05-16T00:00:00Z
---

> **Archived 2026-05-16.** The phases described here have been crystallized
> into concrete specs **383–401**. This document is kept for historical
> context — see those specs for the live plan.


# Pivot Implementation Plan

## Overview

Execution plan for completing the pivot from "lightweight markdown spec tool" to
"tool-agnostic spec coding framework" (spec 381). The adapter architecture and
trait are in place; this spec tracks the work required to make non-markdown
adapters real and usable end-to-end.

### Reality check

Only `leanspec capabilities` routes through `AdapterRegistry`. The remaining
22 of ~30 command files still import `SpecLoader`/`SpecInfo` directly. The CLI
is a markdown tool with an adapter facade. The gap is real and structured across
five phases below.

## Design

### Phase 1 — GitHub Issues Adapter (backend only)

No CLI changes in this phase. Build the adapter in isolation so the trait
interface is validated before 22 commands are rewired.

**Technical decisions:**

- Use `reqwest` blocking client, not `block_on` with a shared tokio runtime.
  The CLI has a plain `fn main()`. Blocking avoids runtime-in-runtime issues
  when called from the HTTP server's async Axum handlers (those use
  `spawn_blocking`).
- Token stored in env (`GITHUB_TOKEN` by default), not in the YAML file, so
  `leanspec.adapter.yaml` is safe to commit.
- `delete()` semantics = close issue (GitHub has no hard delete).

**Field mapping:**

| GitHub field | `SpecItem` | `SemanticHint` |
|---|---|---|
| `state` (open/closed) | `metadata["state"]` | `Status` |
| `labels[].name` | `metadata["labels"]` | `Tags` |
| `assignees[0].login` | `metadata["assignee"]` | `Assignee` |
| `milestone.due_on` | `metadata["due_date"]` | `DueDate` |
| — | — | `Priority` (no native field) |

**Config shape** (extend `AdapterConfig` enum):

```rust
GitHub {
    owner: String,
    repo: String,
    #[serde(default = "default_token_env")]
    token_env: String, // defaults to "GITHUB_TOKEN"
}
```

**Files to create/modify:**

- `rust/leanspec-core/src/adapters/github.rs` — new
- `rust/leanspec-core/src/adapters/mod.rs` — add `pub mod github`, extend `AdapterConfig`
- `rust/leanspec-core/src/adapters/registry.rs` — wire `GitHub` arm into factory
- `rust/leanspec-core/Cargo.toml` — add `reqwest` with `blocking` + `json` features behind a `github` feature flag

**Tests:** Unit tests with canned JSON responses (no network). Integration tests
guarded by `#[cfg(feature = "github-integration-tests")]` requiring
`GITHUB_TOKEN`, `TEST_GITHUB_OWNER`, `TEST_GITHUB_REPO`.

**Rate limiting:** Surface GitHub Search API limit (30 req/min) as
`AdapterError::BackendError` with reset time from `X-RateLimit-Reset` header.
Do not retry internally.

**Done when:** `leanspec capabilities` works against a GitHub-configured
project; test harness can create, read, update, and close a GitHub Issue
end-to-end.

---

### Phase 2 — CLI Adaptation

Route `list`, `board`, `view`, `create`, `update`, `search`, `archive` through
`AdapterRegistry::from_project()`. Redesign `init`. This is the largest phase.

**Commands to adapt (in priority order):**

1. `list.rs` — reference implementation. Translate `--status`, `--tag`,
   `--priority`, `--assignee` flags → `ListFilter::metadata` using
   `caps.key_for_semantic()`. Get this pattern right first; the other commands
   follow it.
2. `board.rs` — deepest coupling. Five `print_by_*` functions pattern-match
   `SpecStatus`/`SpecPriority` variants by name. Replace with generic grouping:
   look up `caps.key_for_semantic(SemanticHint::Status)`, pull the key from
   `item.metadata`, group by the resulting string. Group order follows
   `MetadataKind::Enum { values }` declaration.
3. `view.rs` — replace `spec_info.frontmatter.*` rendering with
   `item.metadata` lookups via semantic hints.
4. `create.rs` — slug (`001-my-spec/`) is markdown-only. For non-markdown
   adapters the name arg becomes a title hint; ID is assigned by the backend.
   Validate `--status`/`--priority` values against declared enum values.
5. `update.rs` — `--status`, `--priority`, `--assignee`, `--add-tags`,
   `--remove-tags` map to `UpdateRequest::metadata`. Body-manipulation flags
   (`--replace`, `--check`, `--section`) work by fetch → transform → push,
   which works for any adapter whose body is markdown.
6. `search.rs` — route through `adapter.search()`.
7. `archive.rs` — replace `SpecArchiver::archive()` with `adapter.delete(id)`.
8. `stats.rs` — add parallel `AdapterStats::compute(items, caps)` using
   semantic hints; keep existing markdown path for markdown projects.

**Commands that stay markdown-only** (guard with a clear error message):
`backfill`, `compact`, `analyze`, `split`, `migrate`, `tokens`, `validate`,
`deps`, `check`, `gantt`, `timeline`, `rel`, `templates`.

Helper to add: `fn require_markdown_adapter()` that checks the resolved adapter
name and returns a user-friendly error like: *"This command is
markdown-specific. Run `leanspec capabilities` to see what your adapter
supports."*

**TUI:** Stays markdown-only in Phase 2. Guard at TUI startup; display
informational message if adapter is non-markdown and point to CLI commands.
Full TUI generalization is Phase 4.

**Transitional shim for TUI compilation:**

```rust
enum DynamicStatus { Named(SpecStatus), Custom(String) }
```

Keeps Phase 2 compiling while Phase 4 removes the `SpecStatus` enum from 8 TUI
files.

**`--specs-dir` flag:** Keep working for markdown (overrides adapter config).
Warn and ignore for non-markdown adapters; do not break existing scripts.

**Init redesign:**

```
leanspec init                    # markdown (default, unchanged behaviour)
leanspec init --adapter github   # prompt/parse owner+repo, write
                                 # leanspec.adapter.yaml, skip specs/ scaffold
leanspec init --adapter ado      # Phase 3
```

For GitHub init:
1. Parse `owner`/`repo` from git remote or prompt.
2. Check `GITHUB_TOKEN` or prompt.
3. Write `leanspec.adapter.yaml`.
4. Do not scaffold `specs/` directory.
5. Write `AGENTS.md` (template already near adapter-agnostic; remove the
   "Never edit frontmatter manually" rule).
6. Validate token by calling `leanspec capabilities` internally.

Add `--adapter` to `Commands::Init` in `cli_args.rs`.

**Done when:** All adapted commands work correctly on both markdown and GitHub
adapter projects. `leanspec init --adapter github` walks a user from zero to
a working GitHub-backed project.

---

### Phase 3 — ADO and Jira Adapters

ADO first, then Jira. Both are independent of each other and can be
parallelized once Phase 2 routing infrastructure is established.

**ADO:**

- Auth: PAT via HTTP Basic (`:token` base64-encoded).
- Body: plain markdown — no conversion needed.
- Hard part: `State` values are project-defined. Must query the process
  definition at init time, cache valid states in `AdapterCapabilities`.
- Field quirks: `priority` is int 1–4 (not named); `tags` are
  semicolon-delimited in `System.Tags`; `assignee` is a display name + email
  object.
- Config: `adapter: ado`, `organization:`, `project:`, `token_env: ADO_TOKEN`.

**Jira:**

- Auth: API token + email via HTTP Basic.
- Hard part: body is ADF (Atlassian Document Format). Need a ~200-line Rust
  ADF↔markdown converter for common node types (paragraph, heading, bullet
  list, code block). No Node.js dependency.
- Field mapping: `status.name` → Status, `priority.name` → Priority,
  `labels[]` → Tags, `assignee.displayName` → Assignee, `duedate` → DueDate.
- Config: `adapter: jira`, `host:`, `project:`, `email:`, `token_env: JIRA_TOKEN`.

**Done when:** `leanspec list/view/create/update` work against ADO Work Items
and Jira Issues respectively.

---

### Phase 4 — TUI Generalization

Deferred until after Phase 3. The TUI `FilterState`, board grouping, detail
view, and sort options all hard-code `SpecStatus`/`SpecPriority` variants across
8 files. Full generalization requires them all to change together.

**Key changes:**

- `FilterState`: replace `Vec<SpecStatus>` + `Vec<SpecPriority>` with
  `HashMap<String, Vec<String>>` mirroring `ListFilter::metadata`.
- Board groups: load `caps.key_for_semantic(SemanticHint::Status)`, get that
  field's `Enum { values }`, use as group labels in declaration order.
- Detail view: iterate `caps.metadata_fields` in order, render each from
  `item.metadata`.
- `SortOption::PriorityDesc`: guard on `caps.key_for_semantic(SemanticHint::Priority)`.

**Done when:** TUI board, filter panel, and detail view work correctly on both
markdown and GitHub adapter projects.

---

### Phase 5 — Rule Crystallization (Spec 380 Phase 1, parallel with Phase 3)

Start only the **codebase scanner** in parallel with Phase 3. Do not start
anything requiring a backend service (Synodic integration, knowledge graph,
multi-repo scope).

Deliverable: `leanspec crystallize` command that:
1. Scans the local codebase (architecture patterns, naming conventions, error
   handling, test patterns).
2. Analyzes git history (recurring decisions, stable vs volatile areas).
3. Reads LeanSpec specs as intent signals.
4. Outputs L1 rules → `AGENTS.md` / `CLAUDE.md`, L2 procedural knowledge →
   `.claude/skills/`.

This is the first concrete deliverable toward the Codervisor platform vision
(spec 380) without requiring any infrastructure.

---

## Plan

- [ ] Phase 1: GitHub Issues adapter (backend only)
  - [ ] `rust/leanspec-core/src/adapters/github.rs` — implement `GitHubAdapter`
  - [ ] Extend `AdapterConfig` with `GitHub` variant
  - [ ] Wire into `AdapterRegistry`
  - [ ] Add `reqwest` behind `github` feature flag
  - [ ] Unit tests with canned responses
  - [ ] Integration test scaffold
- [ ] Phase 2: CLI adaptation
  - [ ] `list.rs` — reference implementation with semantic hint translation
  - [ ] `board.rs` — generic grouping via capabilities
  - [ ] `view.rs`, `create.rs`, `update.rs`, `search.rs`, `archive.rs`, `stats.rs`
  - [ ] Markdown-only command guards
  - [ ] `init.rs` redesign with `--adapter` flag
  - [ ] `AGENTS.md` template update
  - [ ] TUI markdown-only guard + `DynamicStatus` shim
- [ ] Phase 3: ADO adapter
- [ ] Phase 3: Jira adapter (parallel with ADO)
- [ ] Phase 4: TUI generalization
- [ ] Phase 5: `leanspec crystallize` codebase scanner

## Notes

### Risks

| Risk | Mitigation |
|---|---|
| `--specs-dir` flag conflicts with adapter routing | Keep for markdown; warn + ignore for non-markdown |
| GitHub search rate limit (30 req/min) | `--no-remote-search` flag falls back to local filter on list results |
| TUI `SpecStatus` baked into 8 files | `DynamicStatus` transitional shim in Phase 2 |
| Skills reference file goes stale | Skills-repo update is part of each phase's definition of done |
| `create` slug vs API-assigned ID | Name arg becomes title hint for non-markdown adapters |

### Skills repo

`skills-repo/.agents/skills/leanspec/references/commands.md` notes that most
commands are "still markdown-specific." Update this file as each command is
adapted. Treat skills-repo updates as part of each phase's definition of done.
