---
status: planned
created: 2026-03-02
priority: critical
tags:
- architecture
- rust
- refactoring
- quality
parent: 341-codebase-refactoring-overhaul
created_at: 2026-03-02T02:39:26.182409089Z
updated_at: 2026-03-02T02:41:39.234476842Z
---

# Phase 1: Split Rust God Modules

> **Parent**: 341-codebase-refactoring-overhaul · **Priority**: Critical

## Goal

Break down the 10 largest Rust files (all >800 LOC) into focused, single-responsibility modules. No API or behavioral changes — purely structural.

## Scope

### 1a. `leanspec-http/src/handlers/specs.rs` (2,285 LOC → 4 files)

Current: 15 handler functions spanning CRUD, search, analytics, metadata, and batch operations.

**Split plan:**
```
handlers/specs/
├── mod.rs          — Re-exports all handlers
├── read.rs         — list_project_specs, get_project_spec, get_project_spec_raw, get_project_subspec_raw, search_project_specs (5 fns)
├── write.rs        — create_project_spec, update_project_spec_raw, update_project_subspec_raw, toggle_project_spec_checklist, update_project_metadata, batch_spec_metadata (6 fns)
└── compute.rs      — get_project_spec_tokens, get_project_spec_validation, get_project_stats, get_project_dependencies (4 fns)
```

### 1b. `leanspec-core/src/sessions/manager.rs` (1,858 LOC → 3 files)

Current: 21 methods on `SessionManager` covering lifecycle, control flow, querying, logging, and admin.

**Split plan:**
```
sessions/manager/
├── mod.rs          — SessionManager struct + re-exports
├── lifecycle.rs    — new, create_session, start_session, stop_session, delete_session, archive_session (6 methods)
├── control.rs      — prompt_session, cancel_session_turn, respond_to_permission_request, pause_session, resume_session (5 methods)
└── queries.rs      — get_session, update_session, list_sessions, get_logs, rotate_logs, get_events, subscribe_to_logs, list_available_runners (8 methods)
```

### 1c. `leanspec-http/src/handlers/sessions.rs` (1,550 LOC → 2 files)

Current: 22 handlers mixing session operations (16) with runner management (10). Plus 13 request/response structs.

**Split plan:**
```
handlers/sessions/
├── mod.rs          — Re-exports
├── sessions.rs     — create_session, get_session, list_sessions, start_session, stop_session, prompt_session, cancel_session_turn, respond_session_permission, archive_session, rotate_session_logs, pause_session, resume_session, get_session_logs, get_session_events, delete_session, ws_session_logs (16 fns)
└── runners.rs      — list_available_runners, list_runners, get_runner, create_runner, update_runner, patch_runner, delete_runner, get_runner_version, validate_runner, set_default_runner (10 fns)
```

### 1d. `leanspec-http/src/types.rs` (831 LOC → 4 files)

Current: 37 structs mixing spec, session, runner, and config types.

**Split plan:**
```
types/
├── mod.rs          — Re-exports
├── specs.rs        — SpecSummary, CreateSpecRequest, SearchRequest, SpecRawResponse, SubspecRawResponse, etc.
├── sessions.rs     — SessionResponse, ActiveToolCallResponse, PlanProgressResponse, ArchiveSessionRequest, etc.
├── runners.rs      — RunnerCreateRequest, RunnerUpdateRequest, RunnerListResponse, etc.
└── common.rs       — StatsResponse, ValidationResponse, LeanSpecConfig, ConfigStructure, ConfigFeatures
```

### 1e. `leanspec-cli/src/main.rs` (1,053 LOC → modular commands)

Current: Single `Commands` enum with 30 variants + `SessionSubcommand` + `RunnerSubcommand` all defined inline with full clap attributes.

**Split plan:**
- Each command module (already in `commands/`) exports its own `clap::Args` struct
- `main.rs` keeps only top-level `Cli` struct + dispatch match
- Target: `main.rs` < 200 LOC

### 1f. Additional candidates (if time permits)

| File | LOC | Action |
|---|---|---|
| `ai_native/chat.rs` | 1,086 | Only 2 pub fns — low priority, skip unless refactoring nearby |
| `sessions/runner.rs` | 1,071 | Extract `RunnerDetector`, `RunnerValidator` as separate modules |
| `sessions/database.rs` | 1,065 | Already well-organized by concern — defer |
| `utils/spec_loader.rs` | 934 | Consider extracting validation pass into separate module |
| `mcp/tools/specs.rs` | 799 | Mirror 1a pattern: split into read/write tool modules |

## Checklist

- [ ] 1a: Split `handlers/specs.rs` into `specs/{mod,read,write,compute}.rs`
- [ ] 1b: Split `sessions/manager.rs` into `manager/{mod,lifecycle,control,queries}.rs`
- [ ] 1c: Split `handlers/sessions.rs` into `sessions/{mod,sessions,runners}.rs`
- [ ] 1d: Split `types.rs` into `types/{mod,specs,sessions,runners,common}.rs`
- [ ] 1e: Extract clap `Args` structs from `main.rs` into command modules
- [ ] Update `routes.rs` imports to match new handler module structure
- [ ] `cargo build` — compiles without errors
- [ ] `cargo test` — all tests pass
- [ ] `cargo clippy` — no new warnings
- [ ] No public API changes (routes, MCP tools, CLI commands identical)

## Approach

1. Start with 1d (types.rs) — least risk, no logic moves, just struct relocations
2. Then 1a (specs handler) — highest impact, most LOC reduction
3. Then 1c (sessions handler) — clear session/runner boundary
4. Then 1b (session manager) — requires careful method splitting with shared state
5. Finally 1e (CLI main.rs) — independent from HTTP changes

## Test

```bash
cargo build --workspace
cargo test --workspace
cargo clippy --workspace -- -D warnings
# Manual: verify HTTP endpoints still work via UI
# Manual: verify CLI commands still work
```
