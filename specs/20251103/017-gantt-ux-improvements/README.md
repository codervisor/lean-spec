---
status: planned
created: 2025-11-03T00:00:00.000Z
tags:
  - ux
  - visualization
  - pm-tools
priority: high
---

# gantt-ux-improvements

> **Status**: 📋 Planned · **Priority**: High · **Created**: 2025-11-03 · **Tags**: ux, visualization, pm-tools

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

Nov 3   Nov 10  Nov 17  Nov 24  
────────────────────────────────
│ Today

🔴 CRITICAL (0)

🟠 HIGH (2)
  002-complete-custom-frontmatter          ⚡ ████████░░░░░░░░░░░░░░░░  (no due)
  016-created-date-format-bug              📋 ░░░░░░░░░░░░░░░░░░░░░░░░  (no due)

🟡 MEDIUM (5)
  005-pattern-aware-list-grouping          📋 ░░░░░░░░░░░░░░░░░░░░░░░░  (no due)
  012-init-pattern-selection               📋 ░░░░░░░░░░░░░░░░░░░░░░░░  (no due)
  004-github-action                        📋 ░░░░░░░░░░░░░░░░░░░░░░░░  (no due)
  006-vscode-extension                     📋 ░░░░░░░░░░░░░░░░░░░░░░░░  (no due)
  008-spec-validation                      📋 ░░░░░░░░░░░░░░░░░░░░░░░░  (no due)

🟢 LOW (1)
  006-template-config-updates              📋 ░░░░░░░░░░░░░░░░░░░░░░░░  (no due)

💡 Tip: Add "due: YYYY-MM-DD" to frontmatter for timeline planning
```

**Key Changes:**
- Group by priority (visual hierarchy)
- Fixed-width columns: spec name (40 chars) + status emoji + timeline bar (32 chars) + due info
- Bars only show if there's a due date (otherwise show placeholder)
- More compact: 1 line per spec
- Timeline starts from today, not from creation dates
- Clear "today" marker
- Show (no due) to encourage adding due dates

### Option B: Dependency-First View

Focus on **critical path** and **blockers**:

```
📅 Gantt Chart - Dependency View

⚠️  BLOCKED (0 specs waiting on dependencies)

⚡ IN PROGRESS (1)
  002-complete-custom-frontmatter          [HIGH]  ████████░░░░░░░░  started Nov 2

📋 READY TO START (7 specs with no blockers)
  High Priority (2)
    016-created-date-format-bug
  
  Medium Priority (5)
    005-pattern-aware-list-grouping
    012-init-pattern-selection
    004-github-action
    006-vscode-extension
    008-spec-validation
  
  Low Priority (1)
    006-template-config-updates

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

- [ ] Analyze which option resonates best with team
- [ ] Design final layout with exact spacing and characters
- [ ] Implement priority grouping
- [ ] Implement compact 1-line-per-spec format
- [ ] Add "(no due)" indicator for specs without timelines
- [ ] Change timeline to start from "today" instead of spec creation dates
- [ ] Add --deps flag for dependency view
- [ ] Add --compact flag for minimal view
- [ ] Update tests
- [ ] Update documentation

## Test

- [ ] Gantt shows clear visual hierarchy by priority
- [ ] Specs without due dates show "(no due)" indicator
- [ ] Timeline starts from today, not creation dates
- [ ] Each spec takes only 1 line (except with dependencies)
- [ ] --deps flag shows blocker-focused view
- [ ] Works well with 5, 10, 50 specs
- [ ] Handles long spec names gracefully (truncation)

## Notes

**Current Code Location:** `src/commands/gantt.ts`

**Key Issue:** The original design tried to show timeline bars for all specs even without due dates by creating fake 2-week estimates. This creates visual noise and doesn't help with planning.

**Better Approach:** Embrace that most specs don't have due dates yet, and make the gantt chart encourage setting them while still being useful for high-level overview.

**Alternative Considered:** Table-based view with columns [Priority | Status | Spec | Timeline]. Rejected because it's less visual than a grouped list.
