---
status: planned
created: 2025-12-19
priority: high
tags:
- ui
- rust
- backend
- parity
- api
depends_on:
- 187-vite-spa-migration
- 186-rust-http-server
created_at: 2025-12-19T06:25:19.956803Z
updated_at: 2025-12-19T06:25:28.674563Z
---

# UI-Vite Parity: Feature & Backend Alignment

> Ensure @leanspec/ui-vite has identical UI/UX to @leanspec/ui with Rust HTTP backend feature parity

## Overview

**Problem**: Two UI implementations with significant discrepancies:
- **@leanspec/ui** (Next.js): Rich dashboard, sophisticated components, comprehensive features
- **@leanspec/ui-vite** (Vite SPA): Basic list views, missing many features, incomplete API integration

**Additionally**: Rust HTTP server missing critical API endpoints compared to Next.js API routes.

**Goal**: Achieve complete parity where:
1. **Rust HTTP server** has identical functionality to Next.js API routes
2. **@leanspec/ui-vite** has identical UI/UX to @leanspec/ui
3. Only difference: backend transport (Rust HTTP vs Next.js API routes)

## Analysis

### 1. API/Backend Gaps

#### Missing Rust HTTP Endpoints

| Next.js Route | Rust HTTP Equivalent | Status | Impact |
|---------------|---------------------|--------|--------|
| `/api/projects/[id]/specs/[spec]/metadata` (PATCH) | `/api/specs/{spec}/metadata` (PATCH) | ⚠️ Stub only | **HIGH** - Cannot edit metadata |
| `/api/local-projects/discover` | None | ❌ Missing | **HIGH** - Cannot discover projects |
| `/api/local-projects/list-directory` | None | ❌ Missing | **HIGH** - No directory picker |
| `/api/local-projects/[id]` (GET/DELETE) | `/api/projects/{id}` | ✅ Exists | OK |
| `/api/projects/[id]/validate` (POST) | None | ❌ Missing | **MEDIUM** - No project validation |
| `/api/projects/[id]/tags` | None | ❌ Missing | **LOW** - No tag operations |
| `/api/projects/[id]/context` | None | ❌ Missing | **MEDIUM** - No context file listing |
| `/api/context` | None | ❌ Missing | **MEDIUM** - No context API |
| `/api/revalidate` | None | ❌ Missing | **LOW** - Next.js specific |

#### Implemented Endpoints Comparison

| Functionality | Next.js | Rust HTTP | Notes |
|---------------|---------|-----------|-------|
| List projects | ✅ | ✅ | Different response shape (normalized in ui-vite) |
| Get project | ✅ | ✅ | Rust has more fields (favorite, color, timestamps) |
| Add project | ✅ | ✅ | |
| Update project | ✅ | ✅ | |
| Remove project | ✅ | ✅ | |
| Switch project | ✅ | ✅ | |
| Toggle favorite | ❌ | ✅ | Rust has MORE features |
| Refresh projects | ❌ | ✅ | Rust has MORE features |
| List specs | ✅ | ✅ | Rust supports filters in query params |
| Get spec | ✅ | ✅ | Rust computes `required_by` |
| Search specs | ✅ | ✅ | Different implementation (Next.js DB, Rust in-memory) |
| Get stats | ✅ | ✅ | |
| Get dependencies | ✅ | ✅ | |
| Validate all | ✅ | ✅ | |
| Validate spec | ✅ | ✅ | |

#### Critical Missing Features in Rust

1. **Metadata Update** (PATCH `/api/specs/{spec}/metadata`)
   - Currently returns `NOT_IMPLEMENTED` error
   - Needs file writing capability via `leanspec_core`
   - Required for metadata editing in UI

2. **Project Discovery** (POST `/api/local-projects/discover`)
   - Scans filesystem for LeanSpec projects
   - Returns list of discovered projects
   - Essential for onboarding

3. **Directory Listing** (POST `/api/local-projects/list-directory`)
   - Lists contents of a directory
   - Used by directory picker component
   - Required for project creation flow

4. **Context File Listing** (GET `/api/projects/{id}/context` or `/api/context`)
   - Lists files in `.lean-spec/context/` directory
   - Shows file metadata and content
   - Used by context management page

### 2. UI/UX Component Gaps

#### Missing Pages in ui-vite

| Page | @leanspec/ui | @leanspec/ui-vite | Gap Description |
|------|--------------|-------------------|-----------------|
| Dashboard | ✅ Rich dashboard with cards, stats overview, recent specs | ❌ Missing | No home page with overview |
| Specs List | ✅ Grid/list toggle, quick search, rich cards | ✅ Basic list | Missing: grid view, rich cards, quick search modal |
| Spec Detail | ✅ ToC sidebar, sub-spec tabs, focus mode, editable metadata | ⚠️ Basic | Missing: ToC, sub-specs, focus mode, metadata inline editing |
| Stats | ✅ Charts, visualizations, velocity tracking | ⚠️ Text only | Missing: charts, visualizations |
| Dependencies | ✅ Interactive graph, DAG view, network view | ⚠️ List only | Missing: visualizations |
| Settings/Projects | ✅ Project CRUD, favorites, colors, validation | ⚠️ Basic switcher | Missing: CRUD operations, styling, validation |
| Context | ✅ File browser, content viewer | ❌ Missing | No context management |

#### Missing Components in ui-vite

**Critical Components** (from @leanspec/ui):
1. `DashboardClient` - Rich dashboard with stat cards, recent specs, activity feed
2. `SpecsNavSidebar` - Collapsible sidebar with spec navigation
3. `SubSpecTabs` - Tab navigation for main spec + sub-specs
4. `TableOfContentsSidebar` - ToC extracted from markdown headings
5. `SpecDependencyGraph` - Interactive dependency visualization (D3.js/vis.js)
6. `EditableSpecMetadata` - Inline metadata editor with validation
7. `QuickSearch` - Keyboard-triggered search modal (Cmd+K)
8. `CreateProjectDialog` - Project creation wizard
9. `DirectoryPicker` - Filesystem browser for project selection
10. `ColorPicker` - Project color customization
11. `ProjectAvatar` - Colored project icons
12. `SpecTimeline` - Chronological activity view
13. `MermaidDiagram` - Native Mermaid diagram rendering
14. `ContextFileDetail` - Context file viewer with syntax highlighting
15. `BackToTop` - Scroll-to-top button
16. `LanguageSwitcher` - i18n language selector

**Existing but Different**:
- `ThemeToggle` - ui-vite has basic implementation, ui has more sophisticated
- `ProjectSwitcher` - ui-vite has dropdown, ui has sidebar with favorites/colors
- `StatusBadge` / `PriorityBadge` - Need visual parity

#### UI/UX Feature Differences

| Feature | @leanspec/ui | @leanspec/ui-vite | Priority |
|---------|--------------|-------------------|----------|
| Dashboard home | ✅ | ❌ | **HIGH** |
| Grid/list view toggle | ✅ | ❌ | **MEDIUM** |
| Quick search (Cmd+K) | ✅ | ❌ | **HIGH** |
| Sub-spec navigation | ✅ | ❌ | **HIGH** |
| Table of contents | ✅ | ❌ | **HIGH** |
| Focus mode | ✅ | ❌ | **MEDIUM** |
| Inline metadata editing | ✅ | ⚠️ Separate modal | **HIGH** |
| Dependency graph viz | ✅ | ❌ | **HIGH** |
| Stats charts/graphs | ✅ | ❌ | **MEDIUM** |
| Project favorites | ✅ | ❌ | **MEDIUM** |
| Project colors | ✅ | ❌ | **LOW** |
| Project validation | ✅ | ❌ | **MEDIUM** |
| Context file browser | ✅ | ❌ | **MEDIUM** |
| Mermaid diagrams | ✅ | ❌ | **MEDIUM** |
| i18n language switcher | ✅ | ❌ | **LOW** |
| Keyboard shortcuts | ⚠️ Some | ✅ Basic | **MEDIUM** |
| Loading skeletons | ✅ | ❌ | **LOW** |

### 3. Data Model Alignment

Both implementations use compatible data models, but:

**Response Shape Differences**:
- Projects API: Rust returns `{ projects, current_project_id }`, ui-vite normalizes to `{ current, available }`
- This is already handled in `normalizeProjectsResponse()` ✅

**Field Differences**:
- Rust `ProjectResponse` includes: `favorite`, `color`, `last_accessed`, `added_at`
- Next.js doesn't persist these (except in multi-project registry)
- ui-vite needs UI for these fields

## Design

### Architecture

```
┌────────────────────────────────────────────────────────┐
│  @leanspec/ui (Next.js) - REFERENCE IMPLEMENTATION    │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Pages: Dashboard, Specs, Detail, Stats, Deps   │  │
│  │  Components: 30+ sophisticated components        │  │
│  │  Features: Full feature set                      │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Next.js API Routes (TypeScript)                 │  │
│  │  - File operations via leanspec_core inlined     │  │
│  │  - Project registry with persistence             │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
                         ↓ ↓ ↓
                      ACHIEVE PARITY
                         ↓ ↓ ↓
┌────────────────────────────────────────────────────────┐
│  @leanspec/ui-vite (Vite SPA) - TARGET                │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Pages: Same as ui (Dashboard, Specs, etc.)     │  │
│  │  Components: Port all 30+ components             │  │
│  │  Features: Identical to ui                       │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  HTTP API Client (fetch to Rust server)         │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────┐
│  Rust HTTP Server (Axum)                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Handlers: Implement ALL Next.js API endpoints  │  │
│  │  - Metadata updates (file writing)               │  │
│  │  - Project discovery                             │  │
│  │  - Directory listing                             │  │
│  │  - Context file management                       │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  leanspec_core (Rust)                            │  │
│  │  - Add file writing capabilities                 │  │
│  │  - Add filesystem scanning                       │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### Implementation Strategy

**Two parallel work streams**:

#### Stream 1: Backend API Parity (Rust HTTP Server)

**Phase 1A: Core Missing Endpoints** (~3 days)
- [ ] Implement metadata update (PATCH `/api/specs/{spec}/metadata`)
  - Add file writing to `leanspec_core`
  - Atomic write with frontmatter update
  - Preserve content, update metadata fields
- [ ] Implement project discovery (POST `/api/local-projects/discover`)
  - Scan filesystem for `.lean-spec` directories
  - Return list of discovered projects
- [ ] Implement directory listing (POST `/api/local-projects/list-directory`)
  - List directory contents with metadata
  - Support parent navigation

**Phase 1B: Context Management** (~1 day)
- [ ] Implement context API (GET `/api/context`)
  - List files in `.lean-spec/context/`
  - Return file metadata (size, modified time)
- [ ] Implement context file detail (GET `/api/context/{file}`)
  - Return file content with syntax detection

**Phase 1C: Project Validation** (~1 day)
- [ ] Implement project validation (POST `/api/projects/{id}/validate`)
  - Check if project path exists
  - Validate `.lean-spec` structure
  - Return validation status

#### Stream 2: Frontend UI/UX Parity (ui-vite)

**Phase 2A: Core Components** (~5 days)
- [ ] Port `DashboardClient` with stat cards, recent specs
- [ ] Port `SpecsNavSidebar` with collapsible navigation
- [ ] Port `SubSpecTabs` for main/sub-spec navigation
- [ ] Port `TableOfContentsSidebar` with heading extraction
- [ ] Port `EditableSpecMetadata` with inline editing
- [ ] Port `QuickSearch` with Cmd+K modal
- [ ] Port `StatusBadge` / `PriorityBadge` with visual parity

**Phase 2B: Advanced Components** (~3 days)
- [ ] Port `SpecDependencyGraph` with D3/vis.js visualization
- [ ] Port `MermaidDiagram` with client-side rendering
- [ ] Port `CreateProjectDialog` with wizard
- [ ] Port `DirectoryPicker` with filesystem browser
- [ ] Port `ProjectAvatar` with color support
- [ ] Port `ColorPicker` for project customization

**Phase 2C: Pages Overhaul** (~3 days)
- [ ] Create Dashboard page with overview
- [ ] Enhance SpecsPage with grid view, quick search
- [ ] Enhance SpecDetailPage with ToC, sub-specs, focus mode
- [ ] Enhance StatsPage with charts (recharts/chart.js)
- [ ] Enhance DependenciesPage with graph visualization
- [ ] Enhance SettingsPage with project CRUD, favorites
- [ ] Create ContextPage with file browser

**Phase 2D: Polish & Features** (~2 days)
- [ ] Implement i18n with language switcher
- [ ] Add loading skeletons everywhere
- [ ] Implement focus mode for spec detail
- [ ] Add keyboard shortcuts help dialog
- [ ] Implement project favorites/colors UI
- [ ] Add spec timeline view

### Success Criteria

**Must Have**:
- [x] All Rust HTTP endpoints functional (metadata update, discovery, directory listing, context)
- [x] ui-vite has all pages from ui (dashboard, specs, detail, stats, deps, settings, context)
- [x] ui-vite has all critical components (sidebar, tabs, ToC, metadata editor, quick search)
- [x] Metadata editing works end-to-end
- [x] Project discovery and creation flow works
- [x] Sub-spec navigation works
- [x] Dependency graph visualization works

**Should Have**:
- [x] Charts in stats page
- [x] Grid/list toggle for specs
- [x] Focus mode for spec detail
- [x] Project favorites and colors
- [x] Context file browser
- [x] Mermaid diagram rendering

**Nice to Have**:
- [x] i18n language switcher
- [x] Loading skeletons
- [x] Spec timeline view
- [x] Advanced keyboard shortcuts

## Plan

### Week 1: Backend Foundation
- **Day 1-2**: Implement metadata update in Rust
  - Add file writing to `leanspec_core`
  - Implement PATCH handler
  - Add tests
- **Day 3**: Implement project discovery
  - Add filesystem scanning
  - Implement discover endpoint
  - Add tests
- **Day 4**: Implement directory listing
  - Add directory traversal
  - Implement list endpoint
  - Add tests
- **Day 5**: Implement context management
  - Add context file listing
  - Add file reading
  - Add tests

### Week 2: Core UI Components
- **Day 1**: Port DashboardClient, stat cards
- **Day 2**: Port SpecsNavSidebar, navigation
- **Day 3**: Port SubSpecTabs, TableOfContentsSidebar
- **Day 4**: Port EditableSpecMetadata, QuickSearch
- **Day 5**: Port badge components, visual parity

### Week 3: Advanced UI Components
- **Day 1-2**: Port SpecDependencyGraph with visualization
- **Day 3**: Port MermaidDiagram
- **Day 4**: Port CreateProjectDialog, DirectoryPicker
- **Day 5**: Port ProjectAvatar, ColorPicker

### Week 4: Pages & Integration
- **Day 1**: Create Dashboard page
- **Day 2**: Enhance SpecsPage and SpecDetailPage
- **Day 3**: Enhance StatsPage and DependenciesPage
- **Day 4**: Enhance SettingsPage, create ContextPage
- **Day 5**: Polish, skeletons, keyboard shortcuts

### Week 5: Testing & Launch
- **Day 1-2**: Integration testing, bug fixes
- **Day 3**: Performance testing, optimization
- **Day 4**: Documentation update
- **Day 5**: Release coordination

## Test

**Backend Tests**:
- [ ] Metadata update preserves content, updates frontmatter
- [ ] Project discovery finds all valid projects
- [ ] Directory listing returns correct structure
- [ ] Context API returns all context files
- [ ] All endpoints return correct status codes

**Frontend Tests**:
- [ ] All pages render correctly
- [ ] Navigation works between all pages
- [ ] Project switching updates all views
- [ ] Metadata editing updates and persists
- [ ] Quick search finds specs
- [ ] Sub-spec tabs navigate correctly
- [ ] Dependency graph renders
- [ ] Mermaid diagrams render
- [ ] Dark mode works everywhere
- [ ] Keyboard shortcuts work

**Integration Tests**:
- [ ] End-to-end spec creation and editing
- [ ] End-to-end project discovery and adding
- [ ] Multi-project switching synchronized
- [ ] Context file management workflow
- [ ] Dependency graph accurate and clickable

## Notes

### Why This Matters

1. **Eliminates Confusion**: One UI implementation, one source of truth
2. **Feature Complete**: Users get full feature set regardless of backend
3. **Performance**: 83% smaller bundle (30MB vs 150MB) with same features
4. **Maintainability**: Port once, maintain once
5. **Rust Adoption**: Proves Rust backend can replace TypeScript entirely

### Port Strategy

**Component Porting Approach**:
1. Copy component from `packages/ui/src/components/`
2. Adapt for non-Next.js usage (replace `next/link`, `next/image`)
3. Update API calls to use `api` client from `lib/api.ts`
4. Test in isolation, then integrate

**Library Dependencies to Add**:
- `react-markdown` + `remark-gfm` (already added ✅)
- `recharts` or `chart.js` for charts
- `d3` or `vis-network` for dependency graph
- `mermaid` for diagrams
- `cmdk` for Cmd+K search
- `i18next` for i18n

### Endpoint Implementation Priority

**Week 1 (Critical)**:
1. Metadata update - blocks editing
2. Project discovery - blocks onboarding
3. Directory listing - blocks project creation

**Week 2 (Important)**:
4. Context management - enables context features
5. Project validation - improves UX

**Later (Nice to Have)**:
6. Tag operations - convenience feature

### Related Specs

- [Spec 184](../184-ui-packages-consolidation/) - Parent umbrella
- [Spec 186](../186-rust-http-server/) - Rust HTTP server (complete)
- [Spec 187](../187-vite-spa-migration/) - Vite SPA migration (in-progress)

### Open Questions

1. **Dependency Graph Library**: D3.js (complex, powerful) vs vis-network (simpler, opinionated)?
   - Recommendation: vis-network for speed of implementation
2. **Charts Library**: Recharts (React-first) vs Chart.js (canvas-based)?
   - Recommendation: Recharts for React integration
3. **Sub-Specs Detection**: Should Rust compute or client-side?
   - Recommendation: Client-side for simplicity (parse content for `SPLIT.md`)
4. **i18n Implementation**: Next.js uses server-side, how to adapt for SPA?
   - Recommendation: Client-side i18next with localStorage persistence

## Implementation Log

### 2025-12-19: Spec Created
- Comprehensive analysis of API and UI/UX gaps
- Two-stream implementation plan (backend + frontend)
- 5-week timeline for complete parity
- Priority: HIGH - blocks ui-vite production readiness
