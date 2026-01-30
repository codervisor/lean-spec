---
status: planned
created: 2026-01-30
priority: medium
tags:
- testing
- quality
parent: 259-technical-debt-refactoring
created_at: 2026-01-30T09:20:10.092472Z
updated_at: 2026-01-30T09:20:14.615968Z
---

# Test Coverage Improvements

## Overview

Improve test coverage in @leanspec/ui, @leanspec/desktop, and leanspec-sync-bridge with focused, high-value tests.

## Design

- Prioritize critical logic paths (hooks, context providers, core APIs).
- Keep tests minimal but meaningful; avoid snapshot-only coverage.

## Plan

- [ ] Add tests for @leanspec/ui (hooks and context providers first).
- [ ] Add tests for @leanspec/desktop covering critical UI flows or core logic.
- [ ] Add tests for leanspec-sync-bridge covering key sync behaviors.
- [ ] Establish a baseline coverage metric and define a near-term target for each package.

## Test

- [ ] pnpm pre-release
- [ ] All new tests pass

## Notes

Capture baseline coverage numbers before starting to track improvements.