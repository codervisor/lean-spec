---
status: complete
created: 2026-01-30
priority: high
tags:
- refactoring
- ui
- dedupe
parent: 259-technical-debt-refactoring
created_at: 2026-01-30T09:19:24.223247Z
updated_at: 2026-02-01T15:22:52.957908Z
completed_at: 2026-02-01T15:22:52.957908Z
transitions:
- status: in-progress
  at: 2026-01-30T09:35:24.076141Z
- status: complete
  at: 2026-02-01T15:22:52.957908Z
---

# UI Component Deduplication

## Overview

Remove duplicated UI primitives under packages/ui/src/components/ui and standardize on @leanspec/ui-components as the canonical source to reduce duplication and drift.

## Design

- Canonical components live in packages/ui-components/src/components/ui.
- @leanspec/ui consumes or re-exports from ui-components; no duplicate component sources remain in packages/ui/src/components/ui.
- Any ui-only wrapper or styling tweaks must be explicit and documented.

## Plan

- [x] Inventory duplicated components in packages/ui/src/components/ui and map them to their equivalents in packages/ui-components/src/components/ui.
- [x] Update import/export paths in @leanspec/ui to use ui-components versions.
- [x] Add or adjust re-exports (if needed) so external imports remain stable.
- [x] Remove duplicated component files from packages/ui/src/components/ui once imports are updated.
- [x] Verify no remaining references to deleted files.

## Test

- [x] pnpm pre-release
- [x] @leanspec/ui builds without TypeScript errors

## Notes

No API differences detected; @leanspec/ui already imports from @leanspec/ui-components directly, so the per-component wrappers were removed.