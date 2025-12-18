---
status: planned
created: 2025-12-18
priority: high
tags:
- ui
- components
- architecture
depends_on:
- 184-ui-packages-consolidation
created_at: 2025-12-18T14:58:08.181281Z
updated_at: 2025-12-18T15:02:45.627211Z
---

# UI Components Extraction

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

### Phase 1: Package Setup (Day 1)
- [ ] Create `packages/ui-components` directory
- [ ] Initialize package.json with dependencies
- [ ] Configure Vite for library build
- [ ] Set up TypeScript config (strict mode)
- [ ] Configure Tailwind CSS
- [ ] Set up Storybook

### Phase 2: Extract Types & Utilities (Day 1-2)
- [ ] Extract TypeScript types from both packages
- [ ] Extract formatters (date, status, priority)
- [ ] Extract validators and helpers
- [ ] Write unit tests

### Phase 3: Extract Core Components (Day 2-4)
- [ ] Extract and upgrade SpecList (filters, sorting, grouping)
- [ ] Extract and upgrade SpecDetail (metadata panel, sub-specs)
- [ ] Extract SpecCard (compact view)
- [ ] Extract SpecBadge (status, priority, tags)
- [ ] Write Storybook stories

### Phase 4: Extract Visualization (Day 4-5)
- [ ] Extract DependencyGraph (reactflow)
- [ ] Extract StatsCharts (recharts)
- [ ] Add controls and legends

### Phase 5: Extract Search & Filter (Day 5-6)
- [ ] Extract SearchBar with debouncing
- [ ] Extract FilterPanel (multi-select)
- [ ] Extract SearchResults
- [ ] Add keyboard shortcuts

### Phase 6: Extract Project Management (Day 6-7)
- [ ] Extract ProjectSwitcher (recent, favorites)
- [ ] Extract ProjectCard
- [ ] Create ProjectDialog (new/edit)

### Phase 7: Extract Layout (Day 7)
- [ ] Extract Header, Sidebar, Layout, Navigation
- [ ] Ensure responsive design
- [ ] Test dark mode

### Phase 8: Extract Custom Hooks (Day 8)
- [ ] Extract useSpecs, useSpecDetail, useSearch
- [ ] Extract useProjects, useDependencyGraph
- [ ] Extract useLocalStorage, useDebounce

### Phase 9: Documentation (Day 9)
- [ ] Write comprehensive README
- [ ] Complete Storybook documentation
- [ ] Add usage examples and migration guide

### Phase 10: Integration Testing (Day 10)
- [ ] Test all components in isolation
- [ ] Test dark mode and responsive layouts
- [ ] Performance testing (bundle size)
- [ ] Accessibility testing

## Test

- [ ] All components render without errors
- [ ] Props correctly applied
- [ ] Event handlers work
- [ ] Dark mode works for all components
- [ ] Tree-shaking works (bundle < 200KB gzipped)
- [ ] Components work in both web and desktop
- [ ] TypeScript types exported correctly

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
