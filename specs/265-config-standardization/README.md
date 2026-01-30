---
status: planned
created: 2026-01-30
priority: medium
tags:
- refactoring
- config
- tooling
parent: 259-technical-debt-refactoring
created_at: 2026-01-30T09:20:04.859416Z
updated_at: 2026-01-30T09:20:14.593811Z
---

# Config Standardization

## Overview

Align build and tooling configurations across UI packages to remove inconsistent versions and targets.

## Design

- Standardize Vite, TypeScript target, PostCSS config, and ESLint configuration across packages/ui, packages/ui-components, and packages/desktop.
- Create a shared tsconfig base that each package extends.

## Plan

- [ ] Decide target Vite version and align in packages/ui/package.json, packages/ui-components/package.json, and packages/desktop/package.json.
- [ ] Create tsconfig.base.json and update package tsconfigs to extend it.
- [ ] Standardize PostCSS config format and version across UI packages.
- [ ] Add a working ESLint config for desktop or remove its lint script.

## Test

- [ ] pnpm pre-release

## Notes

Document any version bumps that could affect plugin compatibility.