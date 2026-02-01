---
status: complete
created: 2026-01-30
priority: medium
tags:
- refactoring
- config
- tooling
parent: 259-technical-debt-refactoring
created_at: 2026-01-30T09:20:04.859416Z
updated_at: 2026-02-01T15:41:18.927020Z
completed_at: 2026-02-01T15:41:18.927020Z
transitions:
- status: in-progress
  at: 2026-01-30T09:58:56.382402Z
- status: complete
  at: 2026-02-01T15:41:18.927020Z
---

# Config Standardization

## Overview

Align build and tooling configurations across UI packages to remove inconsistent versions and targets.

## Design

- Standardize Vite, TypeScript target, PostCSS config, and ESLint configuration across packages/ui, packages/ui-components, and packages/desktop.
- Create a shared tsconfig base that each package extends.

## Plan

- [x] Decide target Vite version and align in packages/ui/package.json, packages/ui-components/package.json, and packages/desktop/package.json.
- [x] Create tsconfig.base.json and update package tsconfigs to extend it.
- [x] Standardize PostCSS config format and version across UI packages.
- [x] Add a working ESLint config for desktop or remove its lint script.

## Test

- [x] pnpm pre-release

## Notes

Changes made:
- Aligned Vite to ^7.3.0 across all UI packages
- Created packages/tsconfig.base.json with shared compiler options
- Updated ui-components, desktop, and ui tsconfigs to extend the base
- PostCSS configs were already consistent (just different file extensions)
- Desktop ESLint config already existed
- Fixed unused variable TypeScript errors in desktop package to comply with base tsconfig