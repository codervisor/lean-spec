---
status: complete
created: 2026-01-30
priority: high
tags:
- refactoring
- types
- api
parent: 259-technical-debt-refactoring
created_at: 2026-01-30T09:19:40.583464Z
updated_at: 2026-02-01T15:24:31.630208Z
completed_at: 2026-02-01T15:24:31.630208Z
transitions:
- status: in-progress
  at: 2026-01-30T09:53:32.214168Z
- status: complete
  at: 2026-02-01T15:24:31.630208Z
---

# Type Definitions Consolidation

## Overview

Consolidate spec/API types into a single canonical source to remove fragmentation across UI and desktop packages.

## Design

- Canonical types live in packages/ui-components/src/types/specs.ts.
- Field naming standard: use contentMd (not content) to align with existing ui-components and desktop types.
- @leanspec/ui and @leanspec/desktop import from ui-components types.

## Plan

- [x] Identify current spec/API type definitions in packages/ui/src/types/api.ts and packages/desktop/src/types.ts.
- [x] Define canonical interfaces in packages/ui-components/src/types/specs.ts and ensure they include all required fields.
- [x] Update @leanspec/ui and @leanspec/desktop to import these types instead of local copies.
- [x] Replace content field usage with contentMd where needed, adding compatibility adapters only if required.
- [x] Remove or deprecate the duplicated type definitions.

## Test

- [x] pnpm pre-release
- [x] No TypeScript errors after consolidation

## Notes

If any API responses still use content, document the conversion strategy in this spec before removing the old types.