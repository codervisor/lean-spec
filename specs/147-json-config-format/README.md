---
status: planned
created: '2025-12-05'
tags:
  - ui
  - config
  - breaking-change
priority: medium
created_at: '2025-12-05T04:42:31.397Z'
---

# Switch UI Config from YAML to JSON

> **Status**: 📅 Planned · **Priority**: Medium · **Created**: 2025-12-05

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

- [ ] Update `registry.ts` to use JSON format
- [ ] Add migration logic: detect `.yaml` → convert → save as `.json`
- [ ] Remove `js-yaml` dependency from `packages/ui/package.json`
- [ ] Test with fresh install (no config)
- [ ] Test migration from existing YAML config

## Test

- [ ] Fresh start creates `projects.json`
- [ ] Existing `projects.yaml` migrates to `projects.json`
- [ ] Long descriptions don't corrupt the config
- [ ] All project operations (add, remove, update) work correctly

## Notes

- Breaking change for users with existing YAML configs (migration handles this)
- JSON is less human-editable but config editing is rare (UI-managed)
