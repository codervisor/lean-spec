---
status: in-progress
created: '2025-12-18'
priority: high
tags:
  - ui
  - components
  - architecture
depends_on:
  - 184-ui-packages-consolidation
created_at: '2025-12-18T14:58:08.181281Z'
updated_at: '2025-12-18T15:18:04.045Z'
transitions:
  - status: in-progress
    at: '2025-12-18T15:18:04.045Z'
---

# UI Components Extraction

> **Status**: ⏳ In progress · **Priority**: High · **Created**: 2025-12-18 · **Tags**: ui, components, architecture


> **Part of**: [Spec 184](../184-ui-packages-consolidation/) - Unified UI Architecture
>
> **Token Budget**: Target ~1800 tokens

## Overview

**Problem**: We maintain two separate UI implementations with duplicated components:
- **`packages/ui`** (Next.js): Rich, polished components but coupled to Next.js
- **`packages/desktop`** (Tauri + Vite): Basic components, limited features

This creates duplication, inconsistency, maintenance burden, and tight coupling to frameworks.

**Solution**: Extract and consolidate into **`packages/ui-components`** - a framework-agnostic, tree-shakeable component library that serves both web and desktop.

**Scope**:
- Extract React components from both packages/ui and packages/desktop
- Upgrade to best-in-class implementations
- Create shared hooks, utilities, and types
- Set up Storybook for documentation
- Configure as tree-shakeable Vite library

## Design

### Package Structure

```
packages/ui-components/
├── src/
│   ├── components/          # React components
│   │   ├── spec/            # SpecList, SpecDetail, SpecCard, etc.
│   │   ├── project/         # ProjectSwitcher, ProjectCard, etc.
│   │   ├── graph/           # DependencyGraph, GraphControls
│   │   ├── stats/           # StatsOverview, StatsChart
│   │   ├── search/          # SearchBar, FilterPanel
│   │   └── layout/          # Header, Sidebar, Navigation
│   ├── hooks/               # useSpecs, useSearch, useProjects, etc.
│   ├── lib/                 # formatters, validators, helpers
│   ├── types/               # TypeScript definitions
│   └── index.ts             # Public API
├── .storybook/
├── stories/
├── vite.config.ts           # Library build config
└── package.json
```

### Key Components to Extract

**From packages/ui (Next.js)**:
- SpecList with advanced filters, sorting, grouping
- SpecDetail with sub-specs, metadata panel
- DependencyGraph using reactflow
- StatsCharts using recharts
- SearchBar with debouncing
- FilterPanel with multi-select
- Layout components

**From packages/desktop (Tauri)**:
- ProjectSwitcher with quick access
- Simplified SpecCard
- File tree navigation

**New/Upgraded**:
- ProjectDialog (creation/settings)
- MetadataEditor (standardized form)
- GraphControls (zoom, pan, layout)
- ErrorBoundary, LoadingStates
- Toast notifications

### Technology Stack

- React 18 + TypeScript 5 (strict mode)
- Vite 5 (library build)
- Tailwind CSS 3 (utility-first)
- reactflow (dependency graphs)
- recharts (statistics charts)
- Storybook 8 (documentation)
- Vitest + React Testing Library

### Build Configuration

Tree-shaking enabled Vite library build:
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['react', 'react-dom']
    }
  }
})
```

Import only what you need:
```typescript
import { SpecList, useSpecs } from '@leanspec/ui-components'
```

## Plan

### Phase 1: Package Setup (Day 1) ✅
- [x] Create `packages/ui-components` directory
- [x] Initialize package.json with dependencies
- [x] Configure Vite for library build
- [x] Set up TypeScript config (strict mode)
- [x] Configure Tailwind CSS
- [x] Set up Storybook

### Phase 2: Extract Types & Utilities (Day 1-2) ✅
- [x] Extract TypeScript types from both packages
- [x] Extract formatters (date, status, priority)
- [x] Extract validators and helpers
- [x] Write unit tests

### Phase 3: Extract Core Components (Day 2-4) ✅
- [ ] Extract and upgrade SpecList (filters, sorting, grouping)
- [ ] Extract and upgrade SpecDetail (metadata panel, sub-specs)
- [x] Extract SpecCard (compact view)
- [x] Extract SpecBadge (StatusBadge, PriorityBadge)
- [x] Extract TagBadge and TagList
- [x] Write Storybook stories

### Phase 4: Extract Visualization (Day 4-5)
- [ ] Extract DependencyGraph (reactflow)
- [ ] Extract StatsCharts (recharts)
- [ ] Add controls and legends

### Phase 5: Extract Search & Filter (Day 5-6)
- [ ] Extract SearchBar with debouncing
- [ ] Extract FilterPanel (multi-select)
- [ ] Extract SearchResults
- [ ] Add keyboard shortcuts

### Phase 6: Extract Project Management (Day 6-7) 🚧 Partial
- [ ] Extract ProjectSwitcher (recent, favorites)
- [ ] Extract ProjectCard
- [x] Extract ProjectAvatar
- [ ] Create ProjectDialog (new/edit)

### Phase 7: Extract Layout (Day 7) ✅
- [x] Extract EmptyState component
- [x] Extract loading skeletons (SpecList, SpecDetail, Stats, Kanban, Project, Sidebar)
- [x] Extract base UI components (Button, Card, Input, Skeleton, Separator, Avatar)
- [ ] Ensure responsive design
- [ ] Test dark mode

### Phase 8: Extract Custom Hooks (Day 8) 🚧 Partial
- [ ] Extract useSpecs, useSpecDetail, useSearch
- [ ] Extract useProjects, useDependencyGraph
- [x] Extract useLocalStorage, useDebounce

### Phase 9: Documentation (Day 9) ✅
- [x] Write comprehensive README
- [x] Complete Storybook documentation (EmptyState, Skeletons, SpecCard, TagBadge)
- [ ] Add usage examples and migration guide

### Phase 10: Integration Testing (Day 10)
- [ ] Test all components in isolation
- [ ] Test dark mode and responsive layouts
- [ ] Performance testing (bundle size)
- [ ] Accessibility testing

## Test

- [x] All components render without errors
- [x] Props correctly applied
- [ ] Event handlers work
- [ ] Dark mode works for all components
- [x] Tree-shaking works (bundle ~24KB gzipped)
- [ ] Components work in both web and desktop
- [x] TypeScript types exported correctly

## Notes

### Design Principles

1. **Framework-Agnostic**: Works with any React setup
2. **Composable**: Small, focused components
3. **Accessible**: ARIA labels, keyboard navigation
4. **Performant**: Lazy loading, memoization
5. **Typed**: Full TypeScript coverage
6. **Documented**: Storybook stories for everything

### Why Shared Component Library?

**Pros**: Single source of truth, consistency, easier maintenance, better testing, reusability, tree-shaking

**Cons**: Initial setup effort, need to maintain library

**Decision**: Long-term maintainability worth the investment.

### Related Specs

- [Spec 184](../184-ui-packages-consolidation/): Parent umbrella spec
- [Spec 186](../186-rust-http-server/): HTTP server backend
- [Spec 187](../187-vite-spa-migration/): Vite SPA (consumer)

## Implementation Progress

### Phase 1-2 Completed (2025-12-18)

**Package Setup:**
- Created `packages/ui-components` with Vite library build
- Configured tree-shaking, TypeScript strict mode, Tailwind CSS
- Set up Storybook 8 for component documentation
- Bundle size: ~24KB gzipped

**Extracted Components:**
- `Badge` - Base UI component with variants
- `StatusBadge` - Spec status display (planned, in-progress, complete, archived)
- `PriorityBadge` - Spec priority display (low, medium, high, critical)

**Extracted Utilities:**
- `cn()` - Tailwind class merging
- `extractH1Title()` - Markdown heading extraction
- Date formatters: `formatDate`, `formatDateTime`, `formatRelativeTime`, `formatDuration`

**Extracted Types:**
- All spec types: `Spec`, `LightweightSpec`, `SidebarSpec`, etc.
- Relationship types: `SpecRelationships`, `DependencyGraph`, etc.
- Validation types: `ValidationResult`, `ValidationIssue`

**Extracted Hooks:**
- `useLocalStorage` - State persistence
- `useDebounce`, `useDebouncedCallback` - Input debouncing

**Unit Tests:**
- `cn()` utility tests
- `extractH1Title()` tests
- Date formatter tests

### Phase 3, 7, 9 Progress (2025-12-18)

**New UI Components:**
- `Button` - Button with variants (default, destructive, outline, secondary, ghost, link)
- `Card` - Card container with CardHeader, CardContent, CardFooter, CardTitle, CardDescription
- `Input` - Form input field
- `Skeleton` - Loading placeholder

**New Spec Components:**
- `SpecCard` - Compact spec card for lists with status, priority, tags, updated time
- `TagBadge` - Display a single tag with optional icon and remove button
- `TagList` - Display multiple tags with truncation

**New Layout Components:**
- `EmptyState` - Empty state placeholder with icon, title, description, action
- Loading skeletons: `SpecListSkeleton`, `SpecDetailSkeleton`, `StatsCardSkeleton`, `KanbanBoardSkeleton`, `ProjectCardSkeleton`, `SidebarSkeleton`, `ContentSkeleton`

**New Project Components:**
- `ProjectAvatar` - Avatar with initials and color from project name

**New Utilities:**
- `getColorFromString()` - Generate consistent color from string
- `getContrastColor()` - Get contrasting text color for background
- `getInitials()` - Get initials from name string
- `PROJECT_COLORS` - Predefined color palette

**New Storybook Stories:**
- EmptyState stories (NoSpecs, NoProjects, NoResults, WithLink)
- LoadingSkeletons stories (all skeleton types)
- SpecCard stories (default, planned, complete, selected, many tags, grid)
- TagBadge stories (default, with icon, clickable, removable, list)
- ProjectAvatar stories (default, sizes, colors)
