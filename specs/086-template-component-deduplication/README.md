---
status: in-progress
created: '2025-11-17'
tags:
  - refactoring
  - templates
  - maintenance
priority: high
created_at: '2025-11-17T01:27:01.679Z'
updated_at: '2025-11-17T01:27:44.713Z'
transitions:
  - status: in-progress
    at: '2025-11-17T01:27:44.713Z'
---

# template-component-deduplication

> **Status**: ⏳ In progress · **Priority**: High · **Created**: 2025-11-17 · **Tags**: refactoring, templates, maintenance

**Project**: lean-spec  
**Team**: Core Development

## Overview

### Problem
Template component files in `packages/cli/templates/_shared/agents-components/` contain significant code redundancy. When updating shared content (like status tracking requirements), we must edit multiple files with duplicate content, creating maintenance burden and risk of inconsistency.

**Example redundancy patterns:**
- `core-rules-base.md` and `core-rules-enterprise.md` both have "Never use nested code blocks" rule
- `discovery-commands-{minimal,standard,enterprise}.md` share common intro text and progressive command additions
- `essential-commands-{minimal,standard,enterprise}.md` have massive overlap (15→28→38 lines with shared sections)

### Why Now
We just improved status update instructions in AGENTS.md and had to update the same content in multiple files. This highlighted the maintenance problem and showed we need a DRY solution before making more updates.

### Success Criteria
- Shared content exists in exactly ONE file
- Pattern-specific differences in separate addition files
- Build system composes components automatically
- Future updates to shared content require editing only one file
- Generated AGENTS.md files remain functionally identical

## Design

### Refactoring Strategy

Apply composition pattern (already proven for quality-standards):

**1. Extract Shared Components**
- Create base files with only truly common content
- Name pattern: `{section}-shared.md`

**2. Create Pattern-Specific Additions**
- Files with only differences per pattern
- Name pattern: `{section}-{pattern}-additions.md`

**3. Use Array Composition in Config**
```json
"essentialCommands": [
  "essential-commands-shared.md",
  "essential-commands-standard-additions.md"
]
```

### Files to Refactor

**Priority 1: Essential Commands** (highest redundancy)
- Shared: Header, Discovery, Viewing, Working basics, closing line
- Minimal: Only basic commands
- Standard: + Project Overview, Token Management, more detail
- Enterprise: + Enterprise-specific commands

**Priority 2: Discovery Commands** (progressive additions)
- Shared: Intro text + base commands (stats, board, list, search)
- Standard additions: + deps
- Enterprise additions: + gantt

**Priority 3: Core Rules** (one shared line)
- Shared: "Never use nested code blocks" rule
- Base additions: Base-specific rules
- Enterprise additions: Enterprise-specific rules

## Plan

### Phase 1: Essential Commands Refactoring
- [x] Analyze redundancy in essential-commands files
- [ ] Create `essential-commands-shared.md` with common content
- [ ] Create `essential-commands-minimal-additions.md`
- [ ] Create `essential-commands-standard-additions.md`
- [ ] Create `essential-commands-enterprise-additions.md`
- [ ] Update configs to use arrays
- [ ] Rebuild and verify output
- [ ] Delete old files

### Phase 2: Discovery Commands Refactoring
- [ ] Create `discovery-commands-shared.md`
- [ ] Create pattern-specific addition files
- [ ] Update build script if needed (support for discoveryCommands array)
- [ ] Update configs
- [ ] Rebuild and verify
- [ ] Delete old files

### Phase 3: Core Rules Refactoring
- [ ] Create `core-rules-shared.md`
- [ ] Create pattern-specific addition files
- [ ] Update configs
- [ ] Rebuild and verify
- [ ] Delete old files

### Phase 4: Audit Other Components
- [ ] Review remaining component files for redundancy
- [ ] Document any other refactoring opportunities

## Test

- [ ] All three AGENTS.md templates generate successfully
- [ ] Generated files are functionally identical to pre-refactor versions (diff check)
- [ ] Build script supports arrays for all relevant config fields
- [ ] No broken references to old component files
- [ ] Token counts remain similar (no content lost)
- [ ] Update status tracking instruction as test - should only require 1 file edit

## Notes

### Already Completed (Quality Standards)
We successfully refactored quality-standards using this same approach:
- Created `quality-standards-shared.md` (common standards)
- Created `quality-standards-{minimal,enterprise}-additions.md`
- Created `status-update-triggers.md` (extracted from workflow files)
- Deleted `quality-standards-base.md` and `quality-standards-enterprise.md`

This serves as the proven pattern for the remaining refactorings.

### Build Script Enhancements
Already supports:
- `string | string[]` for workflow and qualityStandards
- `readComponents()` function for composition

May need to extend support to:
- `discoveryCommands` (currently only string)
- `coreRules` (currently only string)
- `essentialCommands` (currently optional string)
