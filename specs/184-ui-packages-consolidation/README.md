---
status: planned
created: 2025-12-18
priority: high
tags:
- ui
- desktop
- architecture
- consolidation
- rust
created_at: 2025-12-18T14:02:41.727119Z
updated_at: 2025-12-18T14:02:41.727119Z
---

# Consolidate packages/ui with Desktop App Frontend Architecture

> **Status**: planned · **Priority**: high · **Created**: 2025-12-18

## Overview

**Problem**: We currently maintain two separate UI implementations:
- **`packages/ui`**: Next.js SSR app with complex TypeScript backend (filesystem/database sources)
- **`packages/desktop`**: Tauri + Vite SPA with Rust backend (spec 169 migration complete)

This creates:
- Duplicate maintenance burden (same features in two codebases)
- Confusion about which UI to use/develop
- Inconsistent user experience between web and desktop
- Wasted development time implementing features twice
- Empty data issue in `pnpm dev:web` due to architectural mismatch

**Solution**: Consolidate on the **desktop app's frontend architecture** (Vite + React SPA) and **Rust backend** for both web and desktop use cases.

## Design

### Current State

```
packages/ui (Next.js)
├── TypeScript backend
│   ├── specs service (filesystem/multi-project/database)
│   ├── project registry
│   ├── database (better-sqlite3)
│   └── API routes
└── React frontend (SSR)

packages/desktop (Tauri)
├── Rust backend
│   ├── specs operations
│   ├── project management
│   ├── Tauri commands
│   └── Native performance
└── React frontend (SPA)
```

### Target Architecture

```
packages/ui (Vite SPA) - NEW
├── Vite + React SPA (from desktop)
├── Data via Rust CLI/MCP backend
├── Lightweight HTTP wrapper (if needed)
└── Shared components with desktop

packages/desktop (Tauri) - UNCHANGED
├── Rust backend (Tauri commands)
└── React frontend (SPA)
    └── Shared with packages/ui

Rust backend (CLI/MCP) - EXISTING
└── All spec operations
```

### Key Architectural Decisions

1. **Frontend**: Use desktop's Vite+React SPA codebase as the foundation
2. **Backend**: Rust CLI/MCP for all spec operations (already exists)
3. **Code Sharing**: Extract common components into `packages/ui-shared` or similar
4. **Data Access**:
   - Desktop: Tauri commands → Rust backend
   - Web UI: HTTP API → Rust CLI (spawned process or HTTP wrapper)
5. **Multi-Project**: Both use Rust backend's project registry

### Migration Strategy

**Phase 1: Extract Shared UI Components**
- Identify common components between desktop and current UI
- Create `packages/ui-shared` for shared React components
- Extract: SpecList, SpecDetail, Dependencies, Stats, Layout components

**Phase 2: Replace packages/ui with SPA**
- Copy desktop's Vite+React structure to new `packages/ui`
- Remove Next.js dependencies
- Adapt data layer to use Rust backend (CLI spawning or HTTP wrapper)
- Implement lightweight API layer if needed

**Phase 3: Update desktop to use shared components**
- Replace desktop's components with shared versions
- Maintain Tauri command integration

**Phase 4: Deprecate old UI**
- Archive old Next.js UI code
- Update documentation
- Update CLI `ui` command to use new package

## Plan

### Phase 1: Analysis & Shared Components (2-3 days)

- [ ] Audit current `packages/ui` features vs `packages/desktop` features
- [ ] Identify components that can be shared (SpecList, SpecDetail, Stats, Dependencies, etc.)
- [ ] Create `packages/ui-shared` package structure
- [ ] Extract 5-10 core components from desktop into shared package
- [ ] Update desktop to import from shared package (verify no regressions)

### Phase 2: New UI Package Setup (2-3 days)

- [ ] Create new `packages/ui-vite` directory with Vite+React setup
- [ ] Copy desktop's frontend structure (pages, router, hooks)
- [ ] Integrate `packages/ui-shared` components
- [ ] Set up data layer abstraction (interface for backend communication)
- [ ] Implement Rust CLI wrapper for data operations

### Phase 3: Backend Integration (3-4 days)

- [ ] Design API layer: CLI spawning vs HTTP server wrapper
- [ ] Implement spec operations via Rust CLI (list, view, stats, search, etc.)
- [ ] Implement project management via Rust CLI
- [ ] Add caching layer for performance
- [ ] Test data operations match old UI functionality

### Phase 4: Feature Parity (3-4 days)

- [ ] Port remaining UI features from Next.js UI:
  - Spec detail with sub-specs
  - Dependencies visualization (DAG + network)
  - Project switching
  - Search & filters
  - Metadata editing
  - Stats dashboard
- [ ] Implement missing features if any
- [ ] Style and UX consistency pass

### Phase 5: Migration & Deprecation (1-2 days)

- [ ] Rename `packages/ui` → `packages/ui-nextjs-archived`
- [ ] Rename `packages/ui-vite` → `packages/ui`
- [ ] Update `lean-spec ui` command to use new package
- [ ] Update package.json scripts (`dev:web`, etc.)
- [ ] Update documentation and README files
- [ ] Update CI/CD pipelines

### Phase 6: Cleanup (1 day)

- [ ] Remove Next.js dependencies from monorepo
- [ ] Remove database dependencies (better-sqlite3, drizzle-orm) if no longer needed
- [ ] Update TypeScript paths and imports
- [ ] Clean up unused code
- [ ] Update ARCHITECTURE.md and agent instructions

## Test

### Functional Tests

- [ ] All spec operations work (list, view, create, update, search)
- [ ] Project switching works correctly
- [ ] Dependencies visualization renders correctly
- [ ] Stats page displays accurate data
- [ ] Sub-specs are properly displayed
- [ ] Metadata editing saves correctly
- [ ] Search returns correct results
- [ ] Filters and sorting work

### Performance Tests

- [ ] Page load time <2s for 100+ specs
- [ ] Search response time <500ms
- [ ] Dependency graph renders <1s for 50+ specs
- [ ] Memory usage <200MB for typical usage

### Integration Tests

- [ ] Desktop app still works with shared components
- [ ] `lean-spec ui` launches new UI correctly
- [ ] Multi-project switching works in both desktop and web
- [ ] CLI operations reflect in UI immediately

### Compatibility Tests

- [ ] Works on Node.js 20+
- [ ] Works on Chrome, Firefox, Safari
- [ ] Works on macOS, Linux, Windows
- [ ] Existing projects load without migration

## Notes

### Why This Matters

1. **Eliminate Duplication**: One codebase to maintain instead of two
2. **Better Performance**: SPA + Rust is faster than Next.js + TypeScript
3. **Consistency**: Same UX between web and desktop
4. **Faster Development**: New features implemented once
5. **Smaller Bundle**: No SSR overhead (~150MB → ~30MB)

### Alternatives Considered

1. **Keep both UIs**: Rejected - unsustainable maintenance burden
2. **Migrate desktop to Next.js**: Rejected - slower, heavier, wrong direction
3. **Use web components**: Rejected - too much refactoring, limited benefit
4. **Micro-frontends**: Rejected - adds complexity without clear benefit

### Related Specs

- Spec 169: UI Backend Rust/Tauri Migration (desktop migration complete)
- Spec 170: CLI/MCP/Core Rust Migration (backend already in Rust)
- Spec 181: TypeScript Deprecation (core already migrated)

### Dependencies

- Depends on: None (Rust backend already exists)
- Blocks: Future UI development should use consolidated package

### Open Questions

1. **API Layer**: Should we spawn CLI processes or create a lightweight HTTP server wrapper around Rust?
   - **Decision**: Start with CLI spawning for simplicity, evaluate HTTP wrapper if performance issues
2. **Shared Package Name**: `@leanspec/ui-shared` or `@leanspec/ui-components`?
   - **Decision**: `@leanspec/ui-shared` (broader scope, includes hooks/utils)
3. **Migration Timeline**: Can we do this incrementally or all at once?
   - **Decision**: Incremental with new package name, then swap
4. **Old UI Support**: How long to keep archived Next.js code?
   - **Decision**: Archive immediately, can recover from git if needed
