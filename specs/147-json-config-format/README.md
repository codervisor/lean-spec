---
status: complete
created: '2025-12-05'
tags:
  - ui
  - config
  - breaking-change
priority: medium
created_at: '2025-12-05T04:42:31.397Z'
updated_at: '2025-12-10T06:49:33.725Z'
transitions:
  - status: in-progress
    at: '2025-12-10T06:28:34.525Z'
  - status: complete
    at: '2025-12-10T14:48:30.000Z'
completed: '2025-12-10'
---

# Switch UI Config from YAML to JSON

> **Status**: ✅ Complete · **Priority**: Medium · **Created**: 2025-12-05 · **Tags**: ui, config, breaking-change

## Overview

Replace YAML with JSON as the default configuration format for the UI project registry:
- `~/.lean-spec/projects.yaml` → `~/.lean-spec/projects.json`

### Problem

YAML's `js-yaml` library uses line wrapping by default that can corrupt multi-line strings and break array structures. Even with `lineWidth: -1`, YAML's complexity introduces parsing edge cases.

### Why JSON?

| Aspect | YAML | JSON |
|--------|------|------|
| Serialization | Complex, can corrupt | Deterministic |
| Native support | Requires `js-yaml` | Built-in `JSON.stringify/parse` |
| Human editing | More readable | Slightly less readable |
| Error-prone | Indentation-sensitive | Bracket-based, explicit |

## Design

1. **Change config file path**: `PROJECTS_CONFIG_FILE` → `~/.lean-spec/projects.json`
2. **Update save logic**: Replace `yaml.dump()` with `JSON.stringify(data, null, 2)`
3. **Update load logic**: Replace `yaml.load()` with `JSON.parse()`
4. **Migration**: Auto-migrate existing YAML to JSON on first load
5. **Remove dependency**: Remove `js-yaml` from UI package dependencies

## Plan

- [x] Update `registry.ts` to use JSON format
- [x] Add migration logic: detect `.yaml` → convert → save as `.json`
- [x] Remove `js-yaml` dependency from `packages/ui/package.json`
- [x] Test with fresh install (no config)
- [x] Test migration from existing YAML config

## Test

- [x] Fresh start creates `projects.json`
- [x] Existing `projects.yaml` migrates to `projects.json`
- [x] Long descriptions don't corrupt the config
- [x] All project operations (add, remove, update) work correctly

## Notes

- Breaking change for users with existing YAML configs (migration handles this)
- JSON is less human-editable but config editing is rare (UI-managed)
- Added shared lightweight parser (`packages/ui/shared/lean-yaml-parser.js`) so both the UI server and CLI launcher can still read `leanspec.yaml` files without `js-yaml`
- Vitest coverage lives in `packages/ui/src/lib/utils/__tests__/leanYaml.test.ts` and `packages/ui/src/lib/projects/__tests__/registry.test.ts`
