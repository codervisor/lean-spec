---
status: in-progress
created: 2026-02-04
priority: medium
tags:
- ui
- layout
- alignment
created_at: 2026-02-04T07:31:57.784868Z
updated_at: 2026-02-04T07:32:04.695038Z
transitions:
- status: in-progress
  at: 2026-02-04T07:32:04.695038Z
---
# UI Layout Alignment Overhaul

## Overview

The @leanspec/ui pages have inconsistent layout alignment, width constraints, and padding. This creates uneven visual structure and allows some sub-elements to ignore the intended page grid. We need a consistent, enforceable layout system that applies to all pages, keeps desktop content at a minimum width (min-w-4xl), and preserves a centered column with shared padding and max width.

## Design

- Introduce a shared page container pattern for all pages in @leanspec/ui.
- Enforce: desktop min width (min-w-4xl), consistent horizontal padding, and a max width (max-w-7xl) centered column.
- Ensure layout works with left and right sidebars, using a scrollable main content region for horizontal overflow.
- Identify and fix page-level components that override or violate the shared alignment.

## Plan

- [x] Audit all page-level components in @leanspec/ui for layout wrappers and width/padding rules.
- [x] Define a shared layout container (component or utility) and update pages to use it.
- [ ] Align sub-elements that currently break the rules (full-bleed sections, mismatched padding).
- [ ] Verify desktop min width and horizontal scroll behavior with sidebars open/closed.
- [ ] Ensure mobile/responsive behavior is preserved.

## Test

- [ ] Verify all pages align to the same max width and padding on desktop.
- [ ] Confirm min-w-4xl applies and horizontal scrolling appears when sidebars shrink content.
- [ ] Check responsive layouts on tablet and mobile widths.
- [ ] Visual sanity check on dashboard, specs list/detail, stats, context, sessions, settings, projects, machines.

## Notes

- Keep changes DRY by centralizing layout behavior.
- Avoid page-specific overrides unless explicitly required.