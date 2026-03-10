---
status: planned
created: 2026-03-10
priority: high
tags:
- deprecation
- redesign
- artifacts
- sub-specs
- ux
created_at: 2026-03-10T07:04:50.554684423Z
updated_at: 2026-03-10T07:26:29.034502059Z
---
# Deprecate SubSpec Display and Redesign as Artifacts Sub-Tree

## Overview

The current "subspec" display conflates two different concepts (child specs and additional markdown files) and uses confusing terminology. This spec deprecates and removes the current subspec display, replacing it with a redesigned **artifacts** concept — sub-tree items under a spec representing any associated file (spec markdown files, code, diagrams, etc.).

**Supersedes**: Spec 303 (Unified Spec Terminology) proposed renaming to "sections", but this spec takes a broader approach: deprecate the feature entirely and redesign it as an artifacts tree.

## Requirements

### Phase 1: Deprecate Current SubSpec Display
- [ ] Remove `subSpecsCount` from `LightweightSpec` type and API responses
- [ ] Remove subspec count badge from `spec-card.tsx` (the `hasChildren` logic mixing `children` and `subSpecsCount`)
- [ ] Remove `loadSubFiles()` function from core spec loading
- [ ] Remove `--files` / sub-spec visibility from CLI `view` command
- [ ] Remove sub-spec file listing from MCP `view` tool response
- [ ] Update MCP `children` tool to no longer return sub-spec files

### Phase 2: Design Artifacts Sub-Tree
- [ ] Define `Artifact` type: `{ name, path, kind, size }` where kind is `document | code | asset | config`
- [ ] Artifacts are displayed as a collapsible sub-tree under each spec in the UI
- [ ] Artifacts include ALL files in a spec folder (excluding README.md)
- [ ] Support future extension: code file references outside the spec folder
- [ ] Keep artifacts lightweight — metadata only, content loaded on demand

### Phase 3: Implement Artifacts Display
- [ ] Add `artifacts` field to spec detail response (not list/board — too heavy)
- [ ] Add collapsible artifacts tree to spec detail view in web UI
- [ ] Add `lean-spec artifacts <spec>` CLI command (replaces `lean-spec files`)
- [ ] Add `artifacts` MCP tool for listing spec artifacts
- [ ] Show artifact count (not list) in spec card as an indicator

## Non-Goals

- Changing parent/child spec hierarchy (that stays as-is)
- Implementing artifact content editing/creation
- Tracking code files outside the spec folder in this iteration
- Removing the spec folder file structure itself

## Technical Notes

### Current Code to Remove/Modify

- `spec-card.tsx`: `hasChildren` mixes `children` + `subSpecsCount` — decouple these
- `loadSubFiles()` in core: replace with `loadArtifacts()`  
- MCP `children` tool: stop including sub-spec files
- CLI `view --files`: replace with dedicated `artifacts` command

### Terminology Change

| Old | New | Notes |
|-----|-----|-------|
| sub-spec file | **artifact** | Any file in a spec folder (except README.md) |
| subSpecs | `artifacts` | Code property name |
| subSpecsCount | `artifactsCount` | Lightweight count for cards |
| loadSubFiles() | `loadArtifacts()` | Function name |
| `lean-spec files` | `lean-spec artifacts` | CLI command |

### Artifact Kinds

- `document` — Markdown files (DESIGN.md, TESTING.md, etc.)
- `code` — Source code files referenced by the spec
- `asset` — Images, diagrams, data files
- `config` — Configuration files (JSON, YAML, TOML)

## Acceptance Criteria

- [ ] No references to "subspec" or "sub-spec" remain in UI/CLI/MCP output
- [ ] Spec detail view shows artifacts as a collapsible tree
- [ ] `lean-spec artifacts <spec>` lists all artifacts with kind and size
- [ ] Spec card shows artifact count indicator (not conflated with children count)
- [ ] Existing spec folders with extra files are correctly detected as artifacts

## Notes

- Spec 303 (Unified Spec Terminology) should be archived/superseded by this spec
- Spec 084 (Sub-Spec Visibility) becomes historical context
- Spec 053 (Spec Assets Philosophy) informs artifact classification decisions
