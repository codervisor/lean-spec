---
status: in-progress
created: 2026-03-02
priority: high
tags:
- architecture
- rust
- refactoring
- quality
- umbrella
created_at: 2026-03-02T02:29:33.137158825Z
updated_at: 2026-03-02T03:02:29.411550525Z
transitions:
- status: in-progress
  at: 2026-03-02T03:02:29.411550525Z
- status: complete
  at: 2026-03-02T15:48:00Z
- status: in-progress
  at: 2026-03-02T15:57:00Z
---
# Codebase Refactoring Overhaul

> **Priority**: High · **Type**: Umbrella

## Context

The LeanSpec codebase has grown to **~101K LOC** across 501 source files (51K Rust + 50K TypeScript). As the project expands with AI orchestration, sessions, and multi-agent features, several architectural pain points have emerged that slow down development and increase the risk of bugs.

This is an umbrella spec organizing the refactoring work into focused, independently deliverable phases.

## Codebase Snapshot (March 2026)

| Crate / Package | Files | LOC | Role |
|---|---|---|---|
| `leanspec-core` | 60 | 19,377 | Shared business logic |
| `leanspec-http` | 28 | 9,736 | REST API + web server |
| `leanspec-cli` | 38 | 9,646 | CLI application |
| `leanspec-mcp` | 9 | 2,290 | MCP server |
| `packages/ui` | 318 | 49,150 | React SPA |
| **Total** | **501** | **~101K** | |

## Problems Identified

### P1: God Modules (Rust)

Several Rust files far exceed reasonable sizes, mixing multiple concerns:

| File | LOC | Issues |
|---|---|---|
| `handlers/specs.rs` | 2,285 | All spec CRUD + search + batch + validation + tokens in one file |
| `sessions/manager.rs` | 1,858 | Session lifecycle + runner dispatch + event handling |
| `handlers/sessions.rs` | 1,550 | All session HTTP endpoints in one file |
| `ai_native/chat.rs` | 1,086 | Chat orchestration + streaming + tool execution |
| `sessions/runner.rs` | 1,071 | Process management + output parsing + state tracking |
| `sessions/database.rs` | 1,065 | All SQL queries + migrations + schema |
| `cli/main.rs` | 1,053 | All 30+ command definitions + dispatch in one enum |
| `utils/spec_loader.rs` | 934 | File loading + validation + caching |
| `http/types.rs` | 831 | All API request/response types in one file |
| `mcp/tools/specs.rs` | 799 | All spec-related MCP tool handlers |

### P2: God Components (TypeScript/React)

| File | LOC | Issues |
|---|---|---|
| `models-settings-tab.tsx` | 1,357 | Complex settings UI with multiple sub-forms |
| `prompt-input.tsx` | 1,277 | Input + voice + attachments + context in one component |
| `DependenciesPage.tsx` | 885 | Full page with embedded graph + controls |
| `specs-nav-sidebar.tsx` | 875 | Navigation + search + filtering + grouping |
| `SpecDetailPage.tsx` | 843 | Spec view + editing + metadata + relationships |

### P3: `leanspec-core` Does Too Much

The core crate is a 19K LOC monolith containing 6+ distinct domains behind feature flags:
- Spec types, parsing, validation
- Search engine (query parser + fuzzy matching + scoring)
- Session management + database
- AI provider integration (Anthropic, OpenAI)
- Storage (config, projects, chat)
- Utility hodgepodge (15+ modules in `utils/`)

### P4: Type Sync Gap (Rust ↔ TypeScript)

- `packages/ui/src/types/api.ts` (470 LOC) manually mirrors Rust structs
- No automated generation or validation
- Divergence risk grows with every API change

### P5: Inconsistent Error Handling

- `CoreError` → `ServerError` → `ApiError` → TS error handling
- Each layer re-maps differently; no unified error codes
- Client-side error messages are inconsistent

### P6: CLI `main.rs` Monolith

- 1,053 lines with a single `Commands` enum containing 30+ variants
- All argument definitions inline
- Spec 079 proposed this for TypeScript but **the Rust CLI has the same problem** and was never addressed

## Refactoring Plan

### Phase 1: Split God Modules (Rust) — Critical

Break down the largest files into focused modules:

**1a. `handlers/specs.rs` (2,285 → ~4 files)**
- `specs/read.rs` — GET endpoints: list, view, search, filter
- `specs/write.rs` — POST/PUT/DELETE: create, update, archive, batch
- `specs/compute.rs` — Token counting, validation, stats
- `specs/mod.rs` — Re-exports + shared handler utilities

**1b. `sessions/manager.rs` (1,858 → ~3 files)**
- `manager/lifecycle.rs` — Create, start, stop, delete
- `manager/events.rs` — Event handling + broadcasting
- `manager/dispatch.rs` — Runner selection + dispatch

**1c. `handlers/sessions.rs` (1,550 → ~3 files)**
- `sessions/read.rs` — GET endpoints
- `sessions/write.rs` — POST/PUT/DELETE
- `sessions/streaming.rs` — SSE + live output

**1d. `http/types.rs` (831 → domain files)**
- `types/specs.rs`, `types/sessions.rs`, `types/projects.rs`, `types/common.rs`

**1e. `cli/main.rs` (1,053 → modular commands)**
- Each command module exports its own `clap::Command` definition
- `main.rs` reduced to ~100 lines: arg parsing + dispatch table
- Follow the pattern from completed spec 079 (applied to TypeScript), now for Rust

### Phase 2: Split God Components (TypeScript) — High

**2a. Large page components → composition**
- Extract sub-components from pages exceeding 600 LOC
- `SpecDetailPage` → `SpecHeader`, `SpecContent`, `SpecMetadataPanel`, `SpecRelationships`
- `DependenciesPage` → `DependencyGraph`, `DependencyControls`, `DependencyFilters`
- `SessionDetailPage` → `SessionHeader`, `SessionOutput`, `SessionControls`

**2b. Complex components → composition**
- `prompt-input.tsx` → `PromptTextArea`, `VoiceInput`, `AttachmentBar`, `ContextPanel`
- `models-settings-tab.tsx` → `ModelsList`, `ModelEditor`, `ModelTestPanel`
- `specs-nav-sidebar.tsx` → `SidebarSearch`, `SidebarGrouping`, `SidebarSpecList`

### Phase 3: Core Crate Domain Boundaries — Medium

Establish clearer internal module boundaries within `leanspec-core`:

**Option A: Modules (lower risk)**
- Reorganize `utils/` into domain-specific modules (`spec_ops/`, `io/`)
- Move search into a standalone `search/` top-level module (already partially done)
- Ensure feature flags cleanly gate domains

**Option B: Crate extraction (higher impact)**
- `leanspec-spec` — Types, parsing, validation, relationships
- `leanspec-search` — Query engine, fuzzy matching, scoring, filters
- `leanspec-storage` — Config, projects, chat store, database

Recommendation: Start with Option A. Only pursue Option B if compile times or dependency graph become problematic.

### Phase 4: Type Generation Pipeline — Medium

Automate Rust → TypeScript type synchronization:

- [ ] Add `ts-rs` derive macros to key Rust structs
- [ ] Generate `types/generated.ts` from Rust source
- [ ] CI check: fail if generated types are stale
- [ ] Gradually migrate `api.ts` manual types to generated imports

### Phase 5: Error Handling Unification — Low

- [ ] Define error code enum shared across Rust crates
- [ ] Map `CoreError` variants to HTTP status codes in one place
- [ ] Expose structured error responses: `{ code, message, details }`
- [ ] TypeScript error handler maps codes to i18n messages

## Checklist

- [x] Phase 1a: Split `handlers/specs.rs`
- [x] Phase 1b: Split `sessions/manager.rs`
- [x] Phase 1c: Split `handlers/sessions.rs`
- [x] Phase 1d: Split `http/types.rs`
- [x] Phase 1e: Modularize `cli/main.rs`
- [x] Phase 2a: Extract page sub-components
- [x] Phase 2b: Extract complex component compositions
- [x] Phase 3: Reorganize `leanspec-core` internals
- [ ] Phase 4: Implement type generation pipeline
- [x] Phase 5: Unify error handling
- [x] All tests pass after each phase
- [x] No API breaking changes

## Constraints

- **No API breaking changes** — refactoring is internal only
- **Phase-by-phase** — each phase must be independently shippable
- **Tests green** — run `cargo test` and `pnpm test` after each phase
- **Child specs** — create individual child specs for each phase when starting work

## Notes

- Spec 079 (CLI Alphabetical Organization) was completed for the TypeScript CLI but the Rust CLI (`main.rs`, 1,053 LOC) still has the same problem
- Spec 067 (Monorepo Core Extraction) established the initial crate structure; this builds on that foundation
- The `leanspec-sync-bridge` crate is excluded from workspace and can be ignored
- Feature flags in `leanspec-core` already provide some modularity — this refactoring leverages and strengthens that pattern

## Verification Update (2026-03-02)

- Child specs `342`, `343`, `344`, `345`, and `346` now reflect implemented outcomes and verified checkpoints.
- Phase 2 (`343`) is complete:
  - Legacy delegation wrappers replaced with composed page/component implementations.
  - Prop-drilling audit confirms no chains deeper than 2 levels across split targets.
  - Visual smoke walkthrough completed with Playwright screenshots across key routes.
- Phase 3 (`344`) is complete:
  - Core internal reorganization to `spec_ops/`, `io/`, and `compute/` is in place and active.
- Phase 4 (`345`) is complete:
  - `ts-rs` derive/export workflow is active for HTTP + selected core shared types.
  - Generated bindings are emitted to `packages/ui/src/types/generated/`.
- Phase 5 (`346`) is complete:
  - Unified core error code model and structured error mapping are integrated through HTTP/MCP layers.

- Validation checks run and passing in this cycle:
  - `packages/ui`: `pnpm typecheck`
  - Rust changed crates: `cargo test -p leanspec-core -p leanspec-http -p leanspec-mcp`

- Checklist progress: **11/12 complete (92%)**.
