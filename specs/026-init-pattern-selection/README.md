---
status: complete
created: '2025-11-03'
tags:
  - ux
  - init
  - v0.2.0
priority: high
related:
  - 043-official-launch-02
created_at: '2025-11-03T00:00:00Z'
updated_at: '2025-11-05T05:44:40.533Z'
completed_at: '2025-11-05T05:44:40.533Z'
completed: '2025-11-05'
transitions:
  - status: complete
    at: '2025-11-05T05:44:40.533Z'
---

# Init Pattern Selection

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-03 · **Tags**: ux, init, v0.2.0


> Let users choose folder pattern during `lspec init`

## Overview

Currently when running `lspec init`, users can only choose a template (minimal/standard/enterprise). The folder pattern is set by the template and users must manually edit `.lspec/config.json` to change it.

**Issue:** No way to choose folder pattern during initialization.

**Solution:** Add pattern selection step to init wizard.

## Design

Enhance the `lspec init` wizard to offer pattern choices:

**Current flow:**
1. Choose template (minimal/standard/enterprise)
2. Confirm → Done

**New flow:**
1. Choose template (minimal/standard/enterprise)
2. Choose folder pattern:
   - `{YYYYMMDD}/{NNN}-{name}/` (Date-grouped - recommended for teams)
   - `{YYYYMMDD}-{NNN}-{name}/` (Flat with date prefix)
   - `{NNN}-{name}/` (Simple sequential)
   - Custom (enter your own)
3. Confirm → Done

**UI mockup:**
```bash
$ lspec init

? Select a template:
  ❯ standard
    minimal
    enterprise

? Select folder pattern:
  ❯ Date-grouped: 20251103/001-my-spec/ (recommended for teams)
    Flat with date: 20251103-001-my-spec/
    Simple: 001-my-spec/
    Custom pattern
```

**Implementation:**
- Add pattern selection prompt to `init.ts`
- Override template's `folderPattern` in generated config
- Provide sensible descriptions for each pattern
- Default to date-grouped (current best practice)

## Plan

**Status (2025-11-04):** Ready to implement - part of Phase 2 UX improvements for v0.2.0

- [ ] Add pattern selection to init wizard
- [ ] Update init command to handle pattern choice
- [ ] Add pattern override logic
- [ ] Update documentation
- [ ] Add tests for pattern selection

**Implementation Notes:**
- Straightforward UX enhancement to init flow
- Improves onboarding by eliminating manual config edits
- Part of spec 043 launch preparation
- Estimated: 3-4 hours implementation
- No blocking dependencies

**Testing Priority:**
- Pattern selection UI is intuitive
- Selected pattern correctly overrides template default
- Custom pattern validation works
- Backward compatibility maintained

## Test

- [ ] Init wizard offers pattern choices
- [ ] Selected pattern overrides template default
- [ ] Custom pattern option works
- [ ] Default pattern is date-grouped
- [ ] Backward compatibility (skip pattern selection if not needed)

## Notes

Related to spec 20251103/002-folder-structure-improvements - this is a polish issue split out for focused tracking.

This improves onboarding by letting users choose the right pattern upfront instead of requiring manual config edits.
