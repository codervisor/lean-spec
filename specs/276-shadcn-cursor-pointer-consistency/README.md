---
status: complete
created: 2026-02-02
priority: medium
tags:
- ui-components
- ux
- shadcn
- consistency
created_at: 2026-02-02T03:56:57.848126699Z
updated_at: 2026-02-02T03:59:27.627707626Z
completed_at: 2026-02-02T03:59:27.627707626Z
transitions:
- status: complete
  at: 2026-02-02T03:59:27.627707626Z
---

# shadcn/ui Dropdown/Select cursor-pointer Consistency

## Overview

Interactive dropdown/select items in our shadcn/ui components use inconsistent cursor styles. Some components (like project-switcher `CommandItem`) have `cursor-pointer` added manually, while the base components use `cursor-default`, creating an inconsistent UX.

**Problem**: Users hovering over clickable dropdown items don't get consistent visual feedback that items are interactive.

**Impact**: Poor UX consistency across the application.

## Design

### Affected Components (ui-components/src/components/ui/)

1. **dropdown-menu.tsx**
   - `DropdownMenuItem`: has `cursor-default`
   - `DropdownMenuCheckboxItem`: has `cursor-default`
   - `DropdownMenuRadioItem`: has `cursor-default`
   - `DropdownMenuSubTrigger`: has `cursor-default`

2. **select.tsx**
   - `SelectItem`: has `cursor-default`
   - `SelectScrollUpButton`: has `cursor-default`
   - `SelectScrollDownButton`: has `cursor-default`

3. **command.tsx**
   - `CommandItem`: has `cursor-default`

### Solution

Change `cursor-default` to `cursor-pointer` for all interactive items in base shadcn/ui components. This ensures consistent behavior without requiring manual overrides at usage sites.

### Rule to Add

Add a new rule to development RULES.md:
> All interactive shadcn/ui items (DropdownMenuItem, SelectItem, CommandItem, etc.) must use `cursor-pointer`, not `cursor-default`.

## Plan

- [x] Audit components for cursor inconsistencies
- [x] Update `dropdown-menu.tsx` items to use `cursor-pointer`
- [x] Update `select.tsx` items to use `cursor-pointer`
- [x] Update `command.tsx` items to use `cursor-pointer`
- [x] Update RULES.md with cursor-pointer rule
- [x] Update SKILL.md to reference the new rule
- [x] Verify no regressions in existing usage

## Test

- [x] All dropdown items show pointer cursor on hover
- [x] All select items show pointer cursor on hover
- [x] All command items show pointer cursor on hover
- [x] Build passes without errors
- [x] Visual verification in UI

## Notes

- Some usage sites already override with `cursor-pointer` (e.g., project-switcher.tsx lines 174, 186) - these can remain as-is or be cleaned up later
- Non-interactive items (labels, separators, shortcuts) should remain `cursor-default`
