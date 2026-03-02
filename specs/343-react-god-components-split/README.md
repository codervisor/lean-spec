---
status: in-progress
created: 2026-03-02
priority: high
tags:
- ui
- refactoring
- quality
- architecture
parent: 341-codebase-refactoring-overhaul
created_at: 2026-03-02T02:39:55.197981618Z
updated_at: 2026-03-02T03:05:14.531940611Z
transitions:
- status: in-progress
  at: 2026-03-02T03:05:14.531940611Z
---

# Phase 2: Split React God Components

> **Parent**: 341-codebase-refactoring-overhaul · **Priority**: High

## Goal

Break down oversized React components (>600 LOC) into focused, composable sub-components. No visual or behavioral changes — purely structural.

## Scope

### 2a. Page Components → Composition

**`models-settings-tab.tsx` (1,357 LOC)**
Extract into:
- `ModelsList` — Table/list of configured models
- `ModelEditor` — Add/edit model form with provider-specific fields
- `ModelTestPanel` — Model test/ping UI
- `models-settings-tab.tsx` — Composition wrapper (~150 LOC)

**`prompt-input.tsx` (1,277 LOC)**
Extract into:
- `PromptTextArea` — Text input with auto-resize and keyboard shortcuts
- `VoiceInput` — Voice recording + transcription UI
- `AttachmentBar` — File/context attachment display
- `ContextSelector` — Context item picker
- `prompt-input.tsx` — Composition wrapper (~200 LOC)

**`DependenciesPage.tsx` (885 LOC)**
Extract into:
- `DependencyGraph` — D3/Dagre graph visualization (already partially exists)
- `DependencyControls` — Layout, filter, zoom controls
- `DependencyFilters` — Status/priority/tag filters
- `DependenciesPage.tsx` — Page layout + state management (~200 LOC)

**`specs-nav-sidebar.tsx` (875 LOC)**
Extract into:
- `SidebarSearch` — Search input with debounce
- `SidebarGrouping` — Group-by selector + collapsible sections
- `SidebarSpecList` — Virtualized spec list items
- `specs-nav-sidebar.tsx` — Sidebar container (~200 LOC)

**`SpecDetailPage.tsx` (843 LOC)**
Extract into:
- `SpecHeader` — Title, status badge, action buttons
- `SpecContent` — Markdown viewer/editor
- `SpecMetadataPanel` — Priority, tags, dates sidebar
- `SpecRelationships` — Dependencies and parent/children display
- `SpecDetailPage.tsx` — Page layout + data fetching (~200 LOC)

### 2b. Additional candidates

| Component | LOC | Action |
|---|---|---|
| `runner-settings-tab.tsx` | 765 | Extract `RunnerList`, `RunnerEditor`, `RunnerDetection` |
| `code-block.tsx` | 745 | Extract `CodeToolbar`, `CodeHighlighter`, `CopyButton` |
| `loading-skeletons.tsx` | 680 | Keep as-is — skeleton variants are inherently repetitive |
| `SpecsPage.tsx` | 674 | Extract view modes: `SpecsListView`, `SpecsBoardView`, `SpecsTableView` |
| `ChatSettingsPage.tsx` | 645 | Extract `ChatModelSelector`, `ChatBehaviorSettings` |
| `SessionDetailPage.tsx` | 642 | Extract `SessionHeader`, `SessionOutput`, `SessionControls` |

## Approach

1. Start with `prompt-input.tsx` — most complex, highest reuse potential
2. Then `models-settings-tab.tsx` — clear form sub-boundaries
3. Then page components — straightforward page→section extraction
4. Use the existing `components/` directory structure; create sub-folders per feature

## Checklist

- [ ] Split `models-settings-tab.tsx` into 3+ sub-components
- [ ] Split `prompt-input.tsx` into 4+ sub-components
- [ ] Split `DependenciesPage.tsx` into 3+ sub-components
- [ ] Split `specs-nav-sidebar.tsx` into 3+ sub-components
- [ ] Split `SpecDetailPage.tsx` into 4+ sub-components
- [ ] All extracted components have proper TypeScript props interfaces
- [ ] No prop drilling deeper than 2 levels (use context if needed)
- [ ] `pnpm build` — compiles without errors
- [ ] `pnpm test` — all tests pass
- [ ] No visual regressions (manual UI walkthrough)

## Test

```bash
cd packages/ui && pnpm build && pnpm test
# Manual: walkthrough all affected pages in browser
# Verify: hotkeys, voice input, graph interactions still work
```
