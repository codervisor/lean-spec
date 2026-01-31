---
status: planned
created: 2026-01-31
priority: high
tags:
- performance
- rust
- http-server
created_at: 2026-01-31T06:50:39.922992Z
updated_at: 2026-01-31T06:50:39.922992Z
---

# Optimize Token Counter and Validator Instantiation

> **Status**: planned · **Priority**: high · **Created**: 2026-01-31

## Overview

The `From<&SpecInfo> for SpecSummary` implementation in `leanspec-http/src/types.rs` creates performance bottlenecks by instantiating expensive objects for every spec conversion:

1. **TokenCounter** - Loads tiktoken BPE encoder (`cl100k_base()`) on every call
2. **Three validators** - `FrontmatterValidator`, `StructureValidator`, `LineCountValidator` created per-spec

This impacts:
- Non-sync list endpoint (`specs.rs:469`)
- Search endpoint (`specs.rs:1235`)

## Design

### Option A: Lazy Static Singleton (Recommended)
Use `once_cell::sync::Lazy` for the BPE encoder and validators:

```rust
use once_cell::sync::Lazy;

static TOKEN_COUNTER: Lazy<TokenCounter> = Lazy::new(TokenCounter::new);
static FM_VALIDATOR: Lazy<FrontmatterValidator> = Lazy::new(FrontmatterValidator::new);
static STRUCT_VALIDATOR: Lazy<StructureValidator> = Lazy::new(StructureValidator::new);
static LINE_VALIDATOR: Lazy<LineCountValidator> = Lazy::new(LineCountValidator::new);
```

### Option B: AppState Cache
Store shared instances in `AppState` and pass to conversion functions.

### Option C: Skip in List Views
Don't compute token/validation for list views; only compute on-demand for detail views.

**Decision**: Combine A + C for maximum impact.

## Plan

- [ ] Add `once_cell` dependency to `leanspec-core` Cargo.toml
- [ ] Create lazy static `TokenCounter` in `token_counter.rs`
- [ ] Expose `global_token_counter()` function
- [ ] Create lazy static validators in `validators/mod.rs`
- [ ] Refactor `SpecSummary::from()` to use lazy statics
- [ ] Add `SpecSummary::from_without_computed()` for list views
- [ ] Update list/search handlers to use lightweight conversion
- [ ] Add benchmark test comparing before/after

## Test

- [ ] Verify `cargo test` passes
- [ ] Benchmark: List 100+ specs should be <50ms (vs current ~200ms+)
- [ ] Verify token/validation still computed correctly for detail views
- [ ] Memory footprint stable (no leaks from lazy statics)

## Notes

**Affected files:**
- `rust/leanspec-core/src/utils/token_counter.rs`
- `rust/leanspec-core/src/validators/mod.rs`
- `rust/leanspec-http/src/types.rs`
- `rust/leanspec-http/src/handlers/specs.rs`

**Sync path already mitigated**: `summary_from_record()` sets token/validation to `None`.
