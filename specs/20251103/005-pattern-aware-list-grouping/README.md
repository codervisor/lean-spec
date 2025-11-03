---
status: planned
created: 2025-11-03
tags: [ux, polish]
priority: medium
---

# Pattern-Aware List Grouping

> Make `lspec list` adapt to flat vs date-grouped folder patterns

## Overview

Currently `list.ts` has hardcoded date grouping logic that assumes the `{YYYYMMDD}/{NNN}-{name}/` pattern. When users configure flat patterns like `{NNN}-{name}/` or custom patterns, the list command still tries to group by date, which doesn't make sense.

**Issue:** List command doesn't adapt to configured folder pattern.

**Solution:** Detect pattern type and adjust grouping accordingly.

## Design

Make `lspec list` respect the configured folder pattern:

1. **For date-grouped patterns** (contains `{YYYYMMDD}/`):
   - Group by date as it does now
   - Show date headers

2. **For flat patterns**:
   - Show flat list, no date grouping
   - Or group by prefix if present

3. **For custom patterns**:
   - Adapt based on pattern structure
   - Default to flat list if unclear

**Implementation:**
- Read `folderPattern` from config
- Detect if pattern includes date component
- Adjust grouping logic in `list.ts` accordingly

## Plan

- [ ] Extract grouping logic from `list.ts`
- [ ] Add pattern detection utility
- [ ] Implement adaptive grouping
- [ ] Add tests for flat/date/custom patterns
- [ ] Update documentation

## Test

- [ ] List command adapts to configured pattern
- [ ] Date grouping works for date-grouped patterns
- [ ] Flat list works for flat patterns
- [ ] No breaking changes to existing behavior

## Notes

Related to spec 20251103/002-folder-structure-improvements - this is a polish issue split out for focused tracking.
