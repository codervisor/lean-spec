---
status: complete
created: 2026-01-30
priority: high
tags:
- refactoring
- tech-debt
- cleanup
created_at: 2026-01-30T03:54:24.939926Z
updated_at: 2026-02-02T10:11:00.000000Z
completed_at: 2026-02-02T10:11:00.000000Z
transitions:
- status: in-progress
  at: 2026-01-30T09:20:46.918577Z
- status: complete
  at: 2026-02-02T10:11:00.000000Z
---

# Technical Debt & Refactoring

## Overview

Umbrella spec to track technical-debt refactors across UI, Rust, tooling, and testing. Work is split into focused child specs for implementation readiness.

**Key outcomes**: remove UI duplication, consolidate shared types/utilities, reduce Rust handler duplication, standardize configs, retire deprecated packages, and improve test coverage.

| Category                    | Critical | High | Medium | Low | Total |
| --------------------------- | -------- | ---- | ------ | --- | ----- |
| Code Duplication            | 1        | 4    | 3      | 0   | 8     |
| Configuration Inconsistency | 0        | 3    | 5      | 3   | 11    |
| Type Fragmentation          | 1        | 1    | 1      | 0   | 3     |
| Dead/Stale Code             | 0        | 1    | 1      | 2   | 4     |
| Test Coverage Gaps          | 0        | 2    | 2      | 1   | 5     |
| Dependency Issues           | 0        | 1    | 3      | 3   | 7     |

## Design

This umbrella spec captures cross-cutting decisions that guide the child refactors.

### Decisions

- **Canonical UI primitives** live in `packages/ui-components/src/components/ui`.
- **Canonical spec/API types** live in `packages/ui-components/src/types/specs.ts` with `contentMd` as the standard field name.
- **Shared Rust helpers** (e.g., hashing, spec transformations) move into `leanspec-core` utilities.
- **Chat server removal** is blocked until `@leanspec/ai-worker` exists in-repo (see dependency on spec 237).
- **Config standardization** aligns Vite, TypeScript targets, PostCSS config, and ESLint in UI packages.

## Plan

Work is tracked in child specs:

- [x] UI component deduplication: specs/260-ui-component-dedup/README.md
- [x] UI utilities consolidation: specs/261-ui-utilities-consolidation/README.md
- [x] Type definitions consolidation: specs/262-type-definitions-consolidation/README.md
- [x] Rust spec handler consolidation: specs/263-rust-spec-handler-consolidation/README.md
- [x] Chat server retirement: specs/264-chat-server-retirement/README.md
- [x] Config standardization: specs/265-config-standardization/README.md
- [x] Test coverage improvements: specs/266-test-coverage-improvements/README.md

## Test

- [x] pnpm pre-release
- [x] cargo clippy -- -D warnings
- [x] No TypeScript errors after type consolidation

## Notes

See child specs for detailed file lists, commands, and acceptance criteria.
