---
status: planned
created: 2025-11-03
tags: [ux, init]
priority: medium
---

# Init Pattern Selection

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

- [ ] Add pattern selection to init wizard
- [ ] Update init command to handle pattern choice
- [ ] Add pattern override logic
- [ ] Update documentation
- [ ] Add tests for pattern selection

## Test

- [ ] Init wizard offers pattern choices
- [ ] Selected pattern overrides template default
- [ ] Custom pattern option works
- [ ] Default pattern is date-grouped
- [ ] Backward compatibility (skip pattern selection if not needed)

## Notes

Related to spec 20251103/002-folder-structure-improvements - this is a polish issue split out for focused tracking.

This improves onboarding by letting users choose the right pattern upfront instead of requiring manual config edits.
