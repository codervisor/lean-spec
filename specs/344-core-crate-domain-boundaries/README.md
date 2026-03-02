---
status: in-progress
created: 2026-03-02
priority: medium
tags:
- architecture
- rust
- refactoring
- quality
depends_on:
- 342-rust-god-modules-split
parent: 341-codebase-refactoring-overhaul
created_at: 2026-03-02T02:40:27.978630551Z
updated_at: 2026-03-02T03:02:29.433016985Z
transitions:
- status: in-progress
  at: 2026-03-02T03:02:29.433016985Z
---

# Phase 3: Reorganize leanspec-core Internals

> **Parent**: 341-codebase-refactoring-overhaul · **Priority**: Medium

## Goal

Improve the internal module structure of `leanspec-core` (19,377 LOC, 60 files) by establishing clearer domain boundaries. The crate currently houses 6+ distinct domains behind feature flags — this phase reorganizes without splitting into separate crates.

## Current Structure Problems

The `utils/` module is a grab-bag of 15+ modules with no clear domain grouping:
- `spec_loader.rs` (934 LOC) — file I/O + validation + caching
- `content_ops.rs` (713 LOC) — content manipulation
- `dependency_graph.rs` — graph algorithms
- `spec_writer.rs` — file I/O
- `spec_archiver.rs` — archive logic
- `template_loader.rs` — template I/O
- `token_counter.rs` — LLM token counting
- `project_discovery.rs` — project root detection
- `insights.rs` — statistics computation
- `hash.rs` — content hashing

These mix spec operations, I/O, compute, and discovery with no pattern.

## Proposed Reorganization

```
leanspec-core/src/
├── lib.rs              — Module declarations + re-exports
├── error.rs            — CoreError (unchanged)
│
├── types/              — Data types (unchanged)
│   ├── mod.rs
│   └── spec.rs
│
├── parsers/            — Parsing (unchanged)
│   ├── mod.rs
│   └── frontmatter.rs
│
├── validators/         — Validation (unchanged)
│   ├── mod.rs
│   ├── frontmatter.rs
│   ├── structure.rs
│   └── token_count.rs
│
├── search/             — Search engine (unchanged — already well-organized)
│   ├── mod.rs
│   ├── query.rs
│   ├── fuzzy.rs
│   ├── filters.rs
│   └── scorer.rs
│
├── spec_ops/           — NEW: Spec-focused operations (from utils/)
│   ├── mod.rs
│   ├── loader.rs       — ← utils/spec_loader.rs
│   ├── writer.rs       — ← utils/spec_writer.rs
│   ├── archiver.rs     — ← utils/spec_archiver.rs
│   ├── content.rs      — ← utils/content_ops.rs
│   └── graph.rs        — ← utils/dependency_graph.rs
│
├── io/                 — NEW: I/O and discovery (from utils/)
│   ├── mod.rs
│   ├── templates.rs    — ← utils/template_loader.rs
│   ├── discovery.rs    — ← utils/project_discovery.rs
│   └── hash.rs         — ← utils/hash.rs
│
├── compute/            — NEW: Computation utilities (from utils/)
│   ├── mod.rs
│   ├── tokens.rs       — ← utils/token_counter.rs
│   └── insights.rs     — ← utils/insights.rs
│
├── relationships.rs    — Relationship validation (unchanged)
│
├── sessions/           — Session management (feature: "sessions")
│   ├── manager/        — Split per Phase 1b (if completed)
│   ├── database.rs
│   ├── runner.rs
│   └── types.rs
│
├── storage/            — Storage layer (feature: "storage") (unchanged)
│   ├── config.rs
│   ├── project_registry.rs
│   ├── chat_store.rs
│   └── chat_config.rs
│
├── ai/                 — AI providers (feature: "ai") (unchanged)
├── ai_native/          — Native AI orchestration (feature: "ai") (unchanged)
├── models_registry/    — Model registry (feature: "ai") (unchanged)
└── db/                 — Database layer (unchanged)
```

## Key Changes

1. **`utils/` → `spec_ops/` + `io/` + `compute/`** — Clear domain grouping
2. **Re-exports maintained** — `lib.rs` re-exports everything from new paths for backward compatibility
3. **Deprecation path** — Keep `utils::` re-exports temporarily, mark as `#[deprecated]`

## Checklist

- [ ] Create `spec_ops/` module with loader, writer, archiver, content, graph
- [ ] Create `io/` module with templates, discovery, hash
- [ ] Create `compute/` module with tokens, insights
- [ ] Update `lib.rs` re-exports to include both old and new paths
- [ ] Update all internal references within `leanspec-core`
- [ ] Update `leanspec-cli` imports
- [ ] Update `leanspec-http` imports
- [ ] Update `leanspec-mcp` imports
- [ ] `cargo build --workspace` — compiles
- [ ] `cargo test --workspace` — all pass
- [ ] Remove deprecated `utils/` re-exports after dependents are updated

## Test

```bash
cargo build --workspace
cargo test --workspace
cargo clippy --workspace -- -D warnings
# Verify: no unused import warnings
# Verify: no circular dependency issues
```

## Notes

- This is Option A from the umbrella spec (internal reorganization, not crate splitting)
- Option B (crate extraction) should only be pursued if compile times become an issue
- Feature flags remain unchanged — this is purely about file/module organization
