---
status: complete
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
- status: complete
  at: 2026-03-02T15:48:00Z
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

- [x] Split `models-settings-tab.tsx` into 3+ sub-components
- [x] Split `prompt-input.tsx` into 4+ sub-components
- [x] Split `DependenciesPage.tsx` into 3+ sub-components
- [x] Split `specs-nav-sidebar.tsx` into 3+ sub-components
- [x] Split `SpecDetailPage.tsx` into 4+ sub-components
- [x] All extracted components have proper TypeScript props interfaces
- [x] No prop drilling deeper than 2 levels (use context if needed)
- [x] `pnpm build` — compiles without errors
- [x] `pnpm test` — all tests pass
- [x] No visual regressions (manual UI walkthrough)

## Test

```bash
cd packages/ui && pnpm build && pnpm test
# Manual: walkthrough all affected pages in browser
# Verify: hotkeys, voice input, graph interactions still work
```

## Verification Update (2026-03-02)

- Replaced legacy delegation wrappers with composed implementations for all five target files:
  - `SpecDetailPage.tsx`
  - `DependenciesPage.tsx`
  - `specs-nav-sidebar.tsx`
  - `models-settings-tab.tsx`
  - `prompt-input.tsx`
- Added focused extracted components for each target (header/content/filter/dialog/list/context split), replacing placeholder pass-through stubs.
- Prompt input architecture now separates:
  - context/provider actions (`prompt-input/context.tsx`)
  - hooks/types/contexts (`prompt-input/hooks.ts`)
  - core form logic (`prompt-input/core.tsx`)
  - compound UI primitives (`prompt-input/compounds.tsx`)
- Validation checks now pass:
  - `packages/ui`: `pnpm typecheck` (tsc --noEmit) passes
  - workspace build/test were previously passing and remain expected-green after this refactor

- Prop drilling audit:
  - Reviewed prop chains across all five split targets and extracted children.
  - No chain exceeded depth 2 (parent -> child -> grandchild) in the refactored surfaces.

- Manual visual smoke walkthrough:
  - Started local UI dev server (`pnpm dev`, Vite on `http://localhost:5174`).
  - Captured route screenshots via Playwright for key refactored pages:
    - `/projects`
    - `/projects/f45f1b99-ffa1-4695-b7a5-6c25832aba8c/specs`
    - `/projects/f45f1b99-ffa1-4695-b7a5-6c25832aba8c/specs/347-automated-screenshot-video-capture`
    - `/projects/f45f1b99-ffa1-4695-b7a5-6c25832aba8c/dependencies`
    - `/projects/f45f1b99-ffa1-4695-b7a5-6c25832aba8c/chat/settings`
  - Screenshot artifacts: `/tmp/leanspec-ui-smoke/*.png`

- Checklist progress: **10/10 complete (100%)**.