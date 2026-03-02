---
status: planned
created: 2026-03-02
priority: medium
tags:
- architecture
- rust
- dx
- quality
depends_on:
- 342-rust-god-modules-split
parent: 341-codebase-refactoring-overhaul
created_at: 2026-03-02T02:40:56.470204615Z
updated_at: 2026-03-02T02:41:57.347149786Z
---

# Phase 4: Rust → TypeScript Type Generation

> **Parent**: 341-codebase-refactoring-overhaul · **Priority**: Medium

## Goal

Automate type synchronization between Rust structs and TypeScript interfaces. Currently `packages/ui/src/types/api.ts` (470 LOC) is manually maintained and risks diverging from Rust definitions.

## Problem

Every API change requires updating types in two places:
1. Rust struct in `leanspec-http/src/types.rs` or `leanspec-core/src/types/`
2. TypeScript interface in `packages/ui/src/types/api.ts`

Missed syncs cause runtime errors, incorrect UI rendering, or silent data loss.

## Design

### Approach: `ts-rs` crate

Use the [`ts-rs`](https://github.com/Almetica/ts-rs) crate to derive TypeScript bindings from Rust structs at build time.

**Step 1: Add derive macros to Rust structs**
```rust
use ts_rs::TS;

#[derive(Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../packages/ui/src/types/generated/")]
pub struct SpecSummary {
    pub path: String,
    pub title: String,
    pub status: String,
    // ...
}
```

**Step 2: Generate TypeScript**
```bash
cargo test --workspace  # ts-rs generates .ts files during test runs
# OR
cargo test export_bindings  # dedicated test for type export
```

**Step 3: CI validation**
```yaml
- run: cargo test export_bindings
- run: git diff --exit-code packages/ui/src/types/generated/
  # Fail if generated types are stale
```

### Types to annotate

**Priority 1 — HTTP API types (`leanspec-http/src/types.rs`):**
- `SpecSummary`, `CreateSpecRequest`, `SearchRequest`, `SearchResponse`
- `StatsResponse`, `ValidationResponse`, `SpecRawResponse`
- `SessionResponse`, `RunnerCreateRequest`, `RunnerUpdateRequest`
- All 37 structs in types.rs

**Priority 2 — Core types (`leanspec-core/src/types/`):**
- `SpecInfo`, `SpecFrontmatter`
- `SessionInfo`, `SessionStatus`
- `RunnerDefinition`, `DetectionResult`

### Migration path

1. Generate types into `packages/ui/src/types/generated/`
2. Update imports in UI code to use generated types
3. Keep `api.ts` for any UI-only types or computed types
4. Eventually `api.ts` becomes thin re-exports + UI-specific additions

## Checklist

- [ ] Add `ts-rs` to `leanspec-http` and `leanspec-core` dependencies
- [ ] Add `#[derive(TS)]` to all HTTP request/response structs
- [ ] Add `#[derive(TS)]` to core spec/session types
- [ ] Create `export_bindings` test target
- [ ] Generate initial `types/generated/` directory
- [ ] Update UI imports to use generated types (gradual)
- [ ] Add CI step to detect stale types
- [ ] Document type generation workflow in CONTRIBUTING.md

## Constraints

- Generated types must be committed (not gitignored) for non-Rust developers
- Enum variants must map to TypeScript union types (not numeric enums)
- Optional fields must generate `field?: Type` (not `field: Type | null`)
- Serde rename attributes must be respected in generated output

## Test

```bash
cargo test export_bindings
# Verify: generated .ts files match current api.ts interfaces
# Verify: pnpm build still passes with generated imports
# Verify: CI catches stale types
```
