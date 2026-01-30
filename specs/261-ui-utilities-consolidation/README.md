---
status: planned
created: 2026-01-30
priority: high
tags:
- refactoring
- ui
- dedupe
parent: 259-technical-debt-refactoring
created_at: 2026-01-30T09:19:33.073388Z
updated_at: 2026-01-30T09:20:14.416305Z
---

# UI Utilities Consolidation

## Overview

Consolidate duplicate UI utilities so @leanspec/ui uses the shared implementations from @leanspec/ui-components.

## Design

- Canonical utility implementations live in ui-components.
- @leanspec/ui re-exports from ui-components to avoid breaking imports.

## Plan

- [ ] Locate usages of packages/ui/src/lib/date-utils.ts, packages/ui/src/lib/utils.ts, and packages/ui/src/hooks/use-local-storage.ts.
- [ ] Move or re-create these utilities in packages/ui-components with identical APIs.
- [ ] Update @leanspec/ui imports to point to ui-components equivalents.
- [ ] Add re-export stubs in @leanspec/ui if external imports rely on old paths.
- [ ] Delete the old utility files and remove the empty packages/ui/src/lib/__tests__/ directory.

## Test

- [ ] pnpm pre-release
- [ ] No TypeScript errors in @leanspec/ui

## Notes

Keep API signatures unchanged unless explicitly documented in this spec.