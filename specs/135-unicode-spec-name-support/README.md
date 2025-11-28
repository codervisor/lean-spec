---
status: complete
created: '2025-11-28'
tags:
  - bug
  - i18n
  - cli
priority: high
created_at: '2025-11-28T11:00:53.455Z'
updated_at: '2025-11-28T11:06:15.696Z'
transitions:
  - status: in-progress
    at: '2025-11-28T11:01:23.391Z'
  - status: complete
    at: '2025-11-28T11:06:15.696Z'
completed_at: '2025-11-28T11:06:15.696Z'
completed: '2025-11-28'
---

# Unicode/Chinese Spec Name Support

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-28 · **Tags**: bug, i18n, cli

## Overview

Fix issue where Chinese/Unicode characters in spec names cause sequence number to always be 1. The regex pattern in createSpecDirPattern() requires [a-z] after the dash, which doesn't match Unicode characters.

## Design

The root cause is in `packages/cli/src/utils/path-helpers.ts`:

```typescript
// Current pattern - requires [a-z] after dash
return /(?:^|\D)(\d{2,4})-[a-z]/i;
```

This regex requires ASCII letters after the dash, which excludes Chinese and other Unicode characters.

**Solution**: Change `[a-z]` to a pattern that matches any non-digit, non-dash character, including Unicode:
- Use `[^0-9-]` to match any character that is not a digit or dash
- This allows Chinese characters like `测试`, Japanese, Korean, and other Unicode scripts

## Plan

- [x] Identify the regex pattern in `createSpecDirPattern()`
- [x] Update regex to support Unicode characters
- [x] Add unit tests for Chinese/Unicode spec names
- [x] Verify the fix manually

## Test

- [x] Chinese spec name `001-测试` should be recognized
- [x] Japanese spec name `002-テスト` should work
- [x] Mixed name `003-test测试` should work  
- [x] Existing ASCII names continue to work
- [x] Sequential numbering works correctly

## Notes

GitHub Issue: https://github.com/codervisor/lean-spec/issues/82
