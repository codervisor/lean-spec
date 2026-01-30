---
status: planned
created: 2026-01-30
priority: high
tags:
- refactoring
- tech-debt
- cleanup
created_at: 2026-01-30T03:54:24.939926Z
updated_at: 2026-01-30T03:54:24.939926Z
---

# Technical Debt & Refactoring

## Overview

Full codebase analysis identifying technical debt, redundancy, and inconsistency for potential refactoring and optimization.

**38 issues identified** across 6 categories. Estimated **~3500+ lines** of duplicate code can be eliminated.

| Category                    | Critical | High   | Medium | Low   | Total  |
| --------------------------- | -------- | ------ | ------ | ----- | ------ |
| Code Duplication            | 1        | 4      | 3      | 0     | 8      |
| Configuration Inconsistency | 0        | 3      | 5      | 3     | 11     |
| Type Fragmentation          | 1        | 1      | 1      | 0     | 3      |
| Dead/Stale Code             | 0        | 1      | 1      | 2     | 4      |
| Test Coverage Gaps          | 0        | 2      | 2      | 1     | 5      |
| Dependency Issues           | 0        | 1      | 3      | 3     | 7      |

## Design

### Critical Issues

1. **UI Component Duplication** - 24+ identical components in `packages/ui/` duplicate `ui-components/` (~2000 lines)
2. **Type Definition Fragmentation** - Same types in 3 packages with field name conflicts (`content` vs `contentMd`)

### High Priority Issues

- Deprecated `packages/chat-server/` still active (~500 lines)
- Duplicated utilities: `date-utils.ts`, `utils.ts`, `use-local-storage.ts`
- MCP/HTTP handler duplication in Rust (~300 lines)
- `hash_content()` duplicated 3 times in Rust
- Test coverage gaps: `@leanspec/ui` ~2%, `desktop` 0%, `sync-bridge` 0%

### Medium Priority Issues

- Vite version mismatch (v7 vs v6)
- TypeScript target inconsistency (ES2020/ES2022/ESNext)
- Missing ESLint config for desktop (has lint script that will fail)
- Error handling inconsistency in Rust (`anyhow` vs `thiserror`)
- `tools.rs` is 950+ lines, needs splitting

## Plan

### Phase 1: Quick Wins (1-2 hours)
- [ ] Remove duplicate `darkMode` in ui-components tailwind config
- [ ] Delete empty `packages/ui/src/lib/__tests__/` folder
- [ ] Run `pnpm sync-versions` to fix version drift
- [ ] Add ESLint config to desktop or remove lint script

### Phase 2: Consolidation (4-8 hours)
- [ ] Delete `packages/chat-server/` (deprecated)
- [ ] Move utilities to ui-components, re-export from ui
- [ ] Delete duplicated UI primitives from `@leanspec/ui/src/components/ui/`
- [ ] Consolidate type definitions in ui-components

### Phase 3: Rust Refactoring (8-16 hours)
- [ ] Extract shared spec operations into `leanspec-core` service layer
- [ ] Move `hash_content()` to core utils
- [ ] Split `leanspec-mcp/src/tools.rs` into modules
- [ ] Migrate `leanspec-sync-bridge` from `anyhow` to `thiserror`

### Phase 4: Config Standardization (2-4 hours)
- [ ] Align Vite versions across packages
- [ ] Create shared `tsconfig.base.json`
- [ ] Standardize PostCSS config extensions

### Phase 5: Test Coverage (Ongoing)
- [ ] Add tests for `@leanspec/ui` (priority: hooks, context)
- [ ] Add tests for `@leanspec/desktop`
- [ ] Add tests for `leanspec-sync-bridge`

## Test

- [ ] `pnpm pre-release` passes after each phase
- [ ] No TypeScript errors after type consolidation
- [ ] `cargo clippy -- -D warnings` passes after Rust refactoring
- [ ] All existing tests still pass

## Notes

### Files to Delete
```
packages/chat-server/
packages/ui/src/lib/date-utils.ts
packages/ui/src/lib/utils.ts
packages/ui/src/hooks/use-local-storage.ts
packages/ui/src/components/ui/*.tsx (24 files)
packages/ui/src/lib/__tests__/
```

### Verification Commands
```bash
pnpm add -g depcheck && cd packages/ui && depcheck
cargo +nightly udeps --workspace
pnpm pre-release
```

### Expected Impact
| Metric                 | Before | After |
| ---------------------- | ------ | ----- |
| Duplicate Lines        | ~3500+ | ~500  |
| Type Definition Files  | 3      | 1     |
| Config Inconsistencies | 11     | ~2    |
