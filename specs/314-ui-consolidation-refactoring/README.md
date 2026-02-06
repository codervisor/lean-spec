---
status: planned
created: 2026-02-06
priority: medium
tags:
- ui
- refactoring
- dx
- architecture
created_at: 2026-02-06T01:51:49.885954530Z
updated_at: 2026-02-06T01:51:49.885954530Z
---

# UI Consolidation: Merge Packages, Standardize Naming, Eliminate Duplication

## Overview

`@leanspec/ui` and `@leanspec/ui-components` have significant overlap: 6 structurally duplicated components, 3 divergent duplicates, 3x duplicated badge config data, inconsistent file naming (PascalCase in `ui` vs kebab-case in `ui-components`), and ~400-500 lines of redundant code. This spec consolidates the two packages, standardizes naming, and eliminates DRY violations.

## Non-Goals

- Changing visual design or UX behavior
- Refactoring the chat/AI components
- Touching the desktop package's internal code beyond updating imports

## Design

### 1. Package Consolidation Strategy

**Approach: Absorb `ui-components` into `ui` with a library sub-export.**

`@leanspec/ui` becomes both the application AND component library via Vite's library mode + app mode builds:

```
@leanspec/ui
├── src/
│   ├── components/     ← all components (merged)
│   ├── lib/            ← shared utilities
│   ├── hooks/          ← all hooks
│   └── app/            ← app-specific (router, pages, layouts, stores)
├── vite.config.ts      ← app build
└── vite.lib.config.ts  ← library build (exports components/hooks/types)
```

**Package exports** (for desktop and external consumers):
```json
{
  "exports": {
    ".": { "import": "./dist/lib/index.js", "types": "./dist/lib/index.d.ts" },
    "./styles.css": "./dist/ui.css"
  }
}
```

**Deprecation**: Publish a final `@leanspec/ui-components` version that re-exports from `@leanspec/ui` with a console deprecation notice.

### 2. File Naming Convention

**Standardize on kebab-case** for all component files (matching `ui-components` convention and React community standard):

| Current (`ui`) | New |
|---|---|
| `PriorityBadge.tsx` | `priority-badge.tsx` |
| `StatusBadge.tsx` | `status-badge.tsx` |
| `BackToTop.tsx` | `back-to-top.tsx` |
| `EmptyState.tsx` | `empty-state.tsx` |
| `ProjectAvatar.tsx` | `project-avatar.tsx` |
| `ThemeToggle.tsx` | `theme-toggle.tsx` |

Component **exports remain PascalCase** (only file names change). Barrel `index.ts` files in each directory for clean imports.

### 3. DRY Consolidation Plan

**True duplicates → delete `ui` version, use merged component:**
- `PriorityEditor` / `StatusEditor` / `TagsEditor` — keep callback-based versions, add i18n prop
- `BackToTop` — keep configurable version, add `ariaLabel` prop
- `Tooltip` — keep one, reconcile z-index/colors via CSS variables
- `ProjectAvatar` — remove inlined color utils, use `color-utils.ts`

**Divergent duplicates → extend library component:**
- `PriorityBadge` / `StatusBadge` — add `editable` + `onChange` props to single version
- `EmptyState` — merge to support both `actions: ReactNode` and simple action

**Config dedup:**
- Centralize badge config (icons, colors) in one `badge-config.ts`, export for both display and edit use
- `ui` app layer adds i18n label resolution on top

**Utility dedup:**
- Remove inlined `getInitials` / `getContrastColor` / `getColorForName` from component files → import from `lib/color-utils.ts`

## Plan

### Phase 1: DRY Elimination (within current structure)
- [ ] Centralize badge config into `ui-components`, export it
- [ ] Add `editable` + `onChange` to PriorityBadge/StatusBadge in `ui-components`
- [ ] Add callback props (i18n, API) to editors in `ui-components`
- [ ] Replace `ui` duplicates with imports from `ui-components`
- [ ] Remove inlined color utils from ProjectAvatar, import from `ui-components`
- [ ] Consolidate Tooltip to single implementation
- [ ] Consolidate BackToTop and EmptyState

### Phase 2: File Naming Standardization
- [ ] Rename all PascalCase component files in `ui/src/components` to kebab-case
- [ ] Update all import paths across the codebase
- [ ] Verify build and tests pass

### Phase 3: Package Merge
- [ ] Move `ui-components/src/` contents into `ui/src/components/` and `ui/src/lib/`
- [ ] Add Vite library build config (`vite.lib.config.ts`)
- [ ] Update `package.json` exports for library consumers
- [ ] Update `desktop` package imports from `@leanspec/ui-components` → `@leanspec/ui`
- [ ] Publish deprecation shim for `@leanspec/ui-components`
- [ ] Remove `packages/ui-components/` from monorepo
- [ ] Update pnpm-workspace.yaml and turbo.json

## Test

- [ ] All existing tests pass in `ui` and `desktop` after each phase
- [ ] `pnpm build` succeeds for all affected packages
- [ ] Desktop app runs and renders correctly with imports from `@leanspec/ui`
- [ ] `ui` dev server and production build both work
- [ ] No duplicate component exports in final bundle (tree-shaking check)

## Notes

- **Prior art**: Spec 103 consolidated `@leanspec/web` → `@leanspec/ui` (Next.js merge). This is the logical next step.
- **Risk**: `@leanspec/ui-components` is published to npm. External consumers need migration path via deprecation shim.
- **Desktop impact**: Desktop only imports types and CSS from `ui-components`. Migration is low-effort (update import paths + CSS import).
- **Package count**: `ui` has 81 component files, `ui-components` has 99. Merged total ~150 after dedup.
- **Duplicate elimination**: ~400-500 lines of redundant code removed (6 true dupes + 3 divergent dupes + 3x config).
