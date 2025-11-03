---
status: complete
created: '2025-11-03'
tags:
  - ux
  - visualization
  - pm-tools
priority: high
completed: '2025-11-03'
---

# gantt-ux-improvements

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-03 · **Tags**: ux, visualization, pm-tools

## Overview

The current `lspec gantt` command has significant UX/UI issues that make it confusing and not very useful:

**Current Problems:**

1. **All bars look the same without due dates** - Every planned spec shows a 2-week bar starting from creation date, making it impossible to distinguish urgency or actual timelines
2. **Bars start from creation date** - This clutters the past with already-created specs instead of focusing on future work
3. **No visual priority** - All specs get equal visual weight regardless of priority
4. **Redundant metadata** - Shows status emoji + status text + created date (which is already in the timeline)
5. **Poor information density** - Takes 4 lines per spec but doesn't show enough useful info
6. **No grouping** - All specs are flat, making it hard to see patterns or organize work
7. **Today marker (○)** is often invisible when it overlaps with bars

**Why Fix This:**
Gantt charts are meant to show timeline planning and dependencies. The current implementation doesn't help users plan or prioritize work effectively.

## Design

### Option A: Simplified Timeline (Recommended)

Focus on **future work** with **clear visual hierarchy**:

```
📅 Gantt Chart (4 weeks from Nov 3, 2025)

Spec                                       Timeline
                                           Nov 3   Nov 10  Nov 17  Nov 24  
─────────────────────────────────────────  ────────────────────────────────
                                           │ Today

🔴 CRITICAL (0)

🟠 HIGH (2)
  ⚡ 002-complete-custom-frontmatter       ████████░░░░░░░░░░░░░░░░
  📋 016-created-date-format-bug           (no due date set)

🟡 MEDIUM (5)
  📋 005-pattern-aware-list-grouping       (no due date set)
  📋 012-init-pattern-selection            (no due date set)
  📋 004-github-action                     (no due date set)
  📋 006-vscode-extension                  (no due date set)
  📋 008-spec-validation                   (no due date set)

🟢 LOW (1)
  📋 006-template-config-updates           (no due date set)

Summary: 1 in-progress · 7 planned · 0 overdue
💡 Tip: Add "due: YYYY-MM-DD" to frontmatter for timeline planning
```

**Key Changes:**
- Group by priority (visual hierarchy)
- Fixed-width columns: Spec (43 chars) + Timeline (32 chars)
- Status emoji merged into spec name
- Timeline bars only show if there's a due date
- Timeline starts from today, not from creation dates
- "(no due date set)" encourages adding due dates

### Option B: Dependency-First View

Focus on **critical path** and **blockers**:

```
📅 Gantt Chart - Dependency View

Spec                                       Timeline
─────────────────────────────────────────  ────────────────────────────────

⚠️  BLOCKED (0 specs waiting on dependencies)

⚡ IN PROGRESS (1)
  ⚡ 002-complete-custom-frontmatter       ████████░░░░░░░░  started Nov 2
     [HIGH]

📋 READY TO START (7 specs with no blockers)
  🟠 High Priority (2)
    📋 016-created-date-format-bug
  
  🟡 Medium Priority (5)
    📋 005-pattern-aware-list-grouping
    📋 012-init-pattern-selection
    📋 004-github-action
    📋 006-vscode-extension
    📋 008-spec-validation
  
  🟢 Low Priority (1)
    📋 006-template-config-updates

✅ COMPLETE (22) - use --show-complete to view
```

### Option C: Hybrid Approach (Table-Based)

Combine timeline + priority + dependencies with **table alignment**:

```
📅 Gantt Chart (4 weeks from Nov 3, 2025)

Spec                                       Timeline
                                           Nov 3   Nov 10  Nov 17  Nov 24  
─────────────────────────────────────────  ────────────────────────────────
                                           │ Today

🔴 CRITICAL (0)

🟠 HIGH (2)
  ⚡ 002-complete-custom-frontmatter       ████████░░░░░░░░░░░░░░░░
  📋 016-created-date-format-bug           (no due date set)

🟡 MEDIUM (5)
  📋 005-pattern-aware-list-grouping       (no due date set)
  📋 012-init-pattern-selection            (no due date set)
  📋 004-github-action                     (no due date set)
  📋 006-vscode-extension                  (no due date set)
  📋 008-spec-validation                   (no due date set)

🟢 LOW (1)
  📋 006-template-config-updates           (no due date set)

Summary: 1 in-progress · 7 planned · 0 overdue
💡 Add "due: YYYY-MM-DD" to see timeline bars
```

## Recommendation: Option A + Option B Hybrid

Implement **Option A** as the default view (priority-grouped timeline), and add **flags**:
- `lspec gantt` - Priority-grouped with timelines (Option A)
- `lspec gantt --deps` - Dependency-focused view (Option B)
- `lspec gantt --compact` - Ultra-compact list view
- `lspec gantt --traditional` - Classic gantt with all metadata (current style)

## Plan

- [ ] Decide on default view (recommend Option A)
- [ ] **Define column width constants**
  - Spec column: 43 characters (fixed)
  - Timeline column: 32 characters (8 chars per week × 4 weeks default)
  - Separator: 2 spaces between columns
- [ ] **Implement table-based layout system**
  - Create helper functions for column alignment
  - Ensure spec names are truncated/padded to 43 chars
  - Ensure timeline bars are exactly 32 chars (or weeks × 8)
- [ ] Implement priority grouping with section headers
- [ ] Merge status emoji into spec name (⚡ for in-progress, 📋 for planned, ✅ for complete)
- [ ] Add column headers: "Spec" and "Timeline"
- [ ] Add separator line matching column widths
- [ ] Add calendar dates in Timeline column header (Nov 3, Nov 10, etc.)
- [ ] Add "Today" marker aligned to current week
- [ ] Change timeline bars to start from "today" instead of spec creation dates
- [ ] Show "(no due date set)" for specs without due dates instead of fake bars
- [ ] Add --deps flag for Option B (dependency view)
- [ ] Add --compact flag for minimal view
- [ ] Add --traditional flag for old style
- [ ] Update tests to verify column alignment
- [ ] Update documentation

## Test

- [ ] **Column alignment is perfect**
  - Spec column exactly 43 chars wide (including status emoji and padding)
  - Timeline column exactly 32 chars (8 per week)
  - Column separator line matches column widths exactly
  - Calendar dates align with timeline bars
- [ ] Priority groups show clear visual hierarchy
- [ ] Status emoji (⚡📋✅) appears inline with spec names
- [ ] Specs without due dates show "(no due date set)" instead of bars
- [ ] Timeline starts from today, not creation dates
- [ ] "Today" marker aligns with current week boundary
- [ ] --deps flag shows blocker-focused view
- [ ] Works well with 5, 10, 50 specs
- [ ] Long spec names truncate gracefully (with …)
- [ ] Short spec names pad correctly
- [ ] Alignment is consistent across all priority groups

## Notes

**Current Code Location:** `src/commands/gantt.ts`

**Critical Implementation Rules:**

1. **Column Width Constants** (must be enforced):
   ```typescript
   const SPEC_COLUMN_WIDTH = 43;  // Includes status emoji + 1 space + spec name
   const TIMELINE_COLUMN_WIDTH = weeks * 8;  // 8 chars per week
   const COLUMN_SEPARATOR = '  ';  // 2 spaces
   ```

2. **Spec Name Formatting**:
   - Format: `{emoji} {spec-name}` (e.g., `⚡ 002-complete-custom-frontmatter`)
   - Total width must be exactly 43 chars (pad with spaces or truncate with …)
   - Emoji is 1 char, space is 1 char, name is remaining chars

3. **Alignment Pattern** (same as `stats` and `timeline`):
   ```
   Header          Header
   ───────────────  ────────────────────────────────
   Content         Content
   ```

4. **Timeline Calculation**:
   - Start date = today.startOf('week')
   - Each week = 8 characters exactly
   - Timeline bars use: ████ (filled), ░░░░ (empty), │ (today marker)

5. **Priority Groups**:
   - Always show all 4 priorities (CRITICAL, HIGH, MEDIUM, LOW)
   - Show count in parentheses: `🟠 HIGH (2)`
   - Indent specs under priority by 2 spaces

**Key Issue:** The original design tried to show timeline bars for all specs even without due dates by creating fake 2-week estimates. This creates visual noise and doesn't help with planning.

**Better Approach:** Embrace that most specs don't have due dates yet, and make the gantt chart encourage setting them while still being useful for high-level overview. Use "(no due date set)" placeholder text.

**Alignment is Critical:** Following the same column-width discipline as `stats` and `timeline` ensures a consistent, professional CLI experience. All widths must be exact.
