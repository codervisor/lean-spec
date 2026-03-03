---
status: planned
created: 2026-03-03
priority: medium
tags:
- testing
- infrastructure
- quality
- coverage
created_at: 2026-03-03T02:34:39.779887Z
updated_at: 2026-03-03T02:34:39.779887Z
---

# Testing Architecture Improvements

> Strengthen the testing infrastructure across TypeScript and Rust, close coverage gaps, and align docs with current state.

## Overview

A comprehensive review of the current testing architecture revealed a mature Rust test suite (~370 tests) but several gaps in TypeScript coverage, CI enforcement, and documentation accuracy.

### Current State

| Layer | Files | Tests | Notes |
|-------|-------|-------|-------|
| Rust inline unit (`#[cfg(test)]`) | 41 modules | ~181 (core) | Excellent coverage of validators, parsers, AI, sessions |
| Rust integration (`tests/`) | 40 files | ~188 | Full CLI, MCP, HTTP endpoint coverage |
| TypeScript (Vitest) | 10 files | ~50-60 | Only `packages/ui` — hooks, utils, stores |

**Strengths:**
- Rust test pyramid is well-executed across all crates
- Test isolation via `tempfile` (Rust) and mocked globals (TS)
- CI pipeline enforces fmt, clippy, typecheck, tests, and binding freshness
- Regression test naming convention (`REGRESSION #ISSUE:`) is documented

**Gaps identified:**

1. **No TS tests outside `packages/ui`** — `cli`, `mcp`, `http-server`, `chat-server` have zero TS tests
2. **No coverage enforcement in CI** — `pnpm test:coverage` exists but isn't run in CI
3. **No Rust coverage tooling** — no `tarpaulin` or `llvm-cov` configured
4. **Stale E2E documentation** — CONTRIBUTING.md references `packages/cli/src/__e2e__/` files that no longer exist
5. **HTTP integration tests appear sparse** — needs `#[tokio::test]` verification
6. **No shared TS test utilities at monorepo level**

## Plan

### Phase 1: Documentation &amp; Hygiene
- [ ] Update CONTRIBUTING.md E2E section to reflect Rust integration tests
- [ ] Verify HTTP integration test count (check `#[tokio::test]` vs `#[test]`)
- [ ] Update test pyramid docs if E2E layer shape has changed

### Phase 2: Coverage Visibility
- [ ] Add `pnpm test:coverage` to CI pipeline (report-only, no threshold initially)
- [ ] Evaluate `cargo-tarpaulin` or `cargo-llvm-cov` for Rust coverage
- [ ] Set baseline coverage thresholds once numbers are established

### Phase 3: Gap Assessment
- [ ] Audit TS packages (`cli`, `mcp`, `http-server`, `chat-server`) — determine if TS tests needed or Rust tests suffice
- [ ] Document rationale if thin wrappers ("tested via Rust integration tests")
- [ ] Add targeted unit tests for any TS business logic found

### Phase 4: Test DX
- [ ] Consider shared test setup at monorepo root for non-UI packages
- [ ] Evaluate Rust test parallelization (`--test-threads=1` may be overly conservative)

## Test

- [ ] All existing tests still pass after documentation changes
- [ ] Coverage report generates successfully in CI
- [ ] No stale references remain in CONTRIBUTING.md test section

## Notes

- The TS packages may intentionally have no tests if they're thin wrappers delegating to Rust binaries
- HTTP tests likely use `#[tokio::test]` (async) which wouldn't show up in a simple `#[test]` grep
- `--test-threads=1` in CI exists for filesystem isolation — may be relaxable with better test directory isolation

### Out of Scope
- Rewriting existing passing tests
- Snapshot/visual regression testing
- E2E browser testing for web UI
- Performance/load testing

### References
- CI: `.github/workflows/ci.yml`
- Vitest configs: `vitest.config.ts`, `packages/ui/vitest.config.ts`
- Test setup: `packages/ui/src/test/setup.ts`
- Rust helpers: `rust/leanspec-cli/tests/common/mod.rs`, `rust/leanspec-mcp/tests/helpers/mod.rs`
- Rules: `.agents/skills/leanspec-development/references/RULES.md`
- CONTRIBUTING: lines 227–310