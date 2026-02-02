---
status: complete
created: 2026-01-30
priority: medium
tags:
- testing
- quality
parent: 259-technical-debt-refactoring
created_at: 2026-01-30T09:20:10.092472Z
updated_at: 2026-02-02T10:10:00.000000Z
completed_at: 2026-02-02T10:10:00.000000Z
---

# Test Coverage Improvements

## Overview

Improve test coverage in @leanspec/ui with focused, high-value tests for hooks and context providers.

## Design

- Prioritize critical logic paths (hooks, context providers, core APIs).
- Keep tests minimal but meaningful; avoid snapshot-only coverage.

## Plan

- [x] Add tests for @leanspec/ui hooks
  - [x] `use-media-query.ts` - 6 tests covering query matching and event handling
  - [x] `useKeyboardShortcuts.ts` - 14 tests covering key combos and input filtering
- [x] Add tests for @leanspec/ui context providers
  - [x] `ThemeContext` - 11 tests covering theme persistence and switching
- [x] Existing tests verified:
  - [x] `i18n.test.ts` - 8 tests for internationalization
  - [x] `chat.test.tsx` - 12 tests for chat component

## Test

- [x] pnpm test passes (51 tests in @leanspec/ui)
- [x] All new tests pass

## Notes

Test coverage increased from 2 test files to 5 test files in @leanspec/ui.

Total tests: 51
- Hooks: 20 tests (use-media-query + useKeyboardShortcuts)
- Contexts: 11 tests (ThemeContext)  
- Components: 12 tests (chat)
- Lib: 8 tests (i18n)