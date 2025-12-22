---
status: in-progress
created: '2025-12-19'
priority: high
tags:
  - ui
  - frontend
  - vite
  - react
depends_on:
  - 192-backend-api-parity
created_at: '2025-12-19T06:36:15.645303Z'
updated_at: '2025-12-22T14:01:35.592Z'
transitions:
  - status: in-progress
    at: '2025-12-22T14:01:35.592Z'
---

# Frontend UI Parity: Port @leanspec/ui Components to ui-vite

> **Status**: ⏳ In progress · **Priority**: High · **Created**: 2025-12-19 · **Tags**: ui, frontend, vite, react


> Achieve identical UI/UX between @leanspec/ui (Next.js) and @leanspec/ui-vite (Vite SPA)

## Overview

**Part of**: [Spec 190](../190-ui-vite-parity-rust-backend/) - UI-Vite Parity

**Problem**: @leanspec/ui-vite has basic UI with missing features:
- No dashboard page (home with overview)
- Missing 30+ sophisticated components (ToC, sub-specs, dependency graph, quick search)
- No charts/visualizations
- Basic list views instead of rich cards
- Missing project management features (favorites, colors, CRUD)
- No context management page

**Goal**: Port all components and pages from @leanspec/ui to @leanspec/ui-vite to achieve **identical UI/UX**.

**Depends on**: [Spec 192](../192-backend-api-parity/) - Backend APIs must be functional first

## Analysis

### Component Inventory

**Critical Components** (must port):
1. ✅ `DashboardClient` - Rich dashboard with stat cards, recent specs
2. ✅ `SpecsNavSidebar` - Collapsible sidebar with spec navigation
3. ✅ `SubSpecTabs` - Tab navigation for main spec + sub-specs
4. ✅ `TableOfContentsSidebar` - ToC extracted from markdown headings
5. ✅ `EditableSpecMetadata` - Inline metadata editor
6. ✅ `QuickSearch` - Keyboard-triggered search modal (Cmd+K)
7. ✅ `SpecDependencyGraph` - Interactive dependency visualization
8. ✅ `CreateProjectDialog` - Project creation wizard
9. ✅ `DirectoryPicker` - Filesystem browser for project selection

**Nice-to-Have Components**:
10. ⚠️ `ColorPicker` - Project color customization (low priority)
11. ⚠️ `ProjectAvatar` - Colored project icons (depends on colors)
12. ⚠️ `SpecTimeline` - Chronological activity view (future)
13. ✅ `MermaidDiagram` - Native Mermaid diagram rendering
14. ⚠️ `ContextFileDetail` - Context file viewer (context page)
15. ⚠️ `BackToTop` - Scroll-to-top button (polish)
16. ⚠️ `LanguageSwitcher` - i18n language selector (i18n feature)

**Existing Components** (need enhancement):
- `ThemeToggle` - Already exists ✅
- `ProjectSwitcher` - Already exists ✅
- `StatusBadge` / `PriorityBadge` - Need visual parity
- `MetadataEditor` - Exists as modal, need inline version

### Page Inventory

| Page              | Current State    | Target State                               | Priority   |
| ----------------- | ---------------- | ------------------------------------------ | ---------- |
| Dashboard (/)     | ❌ Missing        | Dashboard with stats, recent specs         | **HIGH**   |
| Specs List        | ⚠️ Basic list     | Grid/list toggle, rich cards, quick search | **HIGH**   |
| Spec Detail       | ⚠️ Basic view     | ToC sidebar, sub-spec tabs, focus mode     | **HIGH**   |
| Stats             | ⚠️ Text only      | Charts, visualizations, velocity tracking  | **MEDIUM** |
| Dependencies      | ⚠️ List only      | Interactive graph (DAG + network views)    | **HIGH**   |
| Settings/Projects | ⚠️ Basic switcher | Full CRUD, favorites, colors, validation   | **MEDIUM** |
| Context           | ❌ Missing        | File browser, content viewer               | **LOW**    |

## Design

### Component Porting Strategy

**Approach**:
1. Copy component from `packages/ui/src/components/`
2. Replace Next.js-specific imports:
   - `next/link` → `react-router-dom` `Link`
   - `next/image` → regular `<img>` (or Vite image optimization)
   - `useRouter` → `useNavigate` / `useLocation`
3. Update API calls:
   - Replace direct API route calls with `api` client
   - Adapt response handling for Rust API format
4. Update imports:
   - UI primitives from `@leanspec/ui-components` (if available)
   - Or inline from ui package for now
5. Test in isolation, then integrate

**Dependencies to Add**:
- `cmdk` - Command palette (Cmd+K search)
- `recharts` - Charts for stats page
- `vis-network` or `@visx/network` - Dependency graph
- `mermaid` - Diagram rendering
- `react-syntax-highlighter` - Code highlighting (context viewer)
- `i18next` + `react-i18next` - i18n (if implementing)

### Key Adaptations

**1. Routing**:
```typescript
// Next.js (ui)
import Link from 'next/link';
<Link href="/specs/123">View Spec</Link>

// Vite (ui-vite)
import { Link } from 'react-router-dom';
<Link to="/specs/123">View Spec</Link>
```

**2. API Calls**:
```typescript
// Next.js (ui)
const res = await fetch('/api/specs');

// Vite (ui-vite)
const specs = await api.getSpecs();
```

**3. Project Context**:
```typescript
// Next.js (ui) - Uses URL params
const { projectId } = useParams();

// Vite (ui-vite) - Uses ProjectContext
const { currentProject } = useProject();
```

### Architecture

```
packages/ui-vite/
├── src/
│   ├── pages/
│   │   ├── DashboardPage.tsx       # NEW: Home with overview
│   │   ├── SpecsPage.tsx           # ENHANCE: Grid view, quick search
│   │   ├── SpecDetailPage.tsx      # ENHANCE: ToC, sub-specs, focus mode
│   │   ├── StatsPage.tsx           # ENHANCE: Charts, visualizations
│   │   ├── DependenciesPage.tsx    # ENHANCE: Graph visualization
│   │   ├── SettingsPage.tsx        # ENHANCE: Full CRUD, favorites
│   │   └── ContextPage.tsx         # NEW: Context file browser
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── DashboardClient.tsx
│   │   │   ├── StatCard.tsx
│   │   │   └── RecentSpecs.tsx
│   │   ├── navigation/
│   │   │   ├── SpecsNavSidebar.tsx
│   │   │   └── QuickSearch.tsx
│   │   ├── spec-detail/
│   │   │   ├── SubSpecTabs.tsx
│   │   │   ├── TableOfContents.tsx
│   │   │   └── EditableMetadata.tsx
│   │   ├── dependencies/
│   │   │   └── DependencyGraph.tsx
│   │   ├── stats/
│   │   │   └── StatsCharts.tsx
│   │   ├── projects/
│   │   │   ├── CreateProjectDialog.tsx
│   │   │   └── DirectoryPicker.tsx
│   │   └── markdown/
│   │       └── MermaidDiagram.tsx
│   ├── lib/
│   │   └── api.ts                  # Already exists
│   └── contexts/
│       ├── ProjectContext.tsx      # Already exists
│       └── ThemeContext.tsx        # Already exists
```

## Plan

### Week 1: Core Components
**Day 1: Dashboard**
- [x] Create `DashboardPage.tsx` (Implemented inline, components not yet extracted)
- [ ] Port `DashboardClient` component (Currently inline in DashboardPage)
- [ ] Port `StatCard` component (Currently inline in DashboardPage)
- [x] Port recent specs section (Inline)
- [x] Wire up API calls to `/api/stats` and `/api/specs`
- [x] Test dashboard rendering

**Day 2: Navigation**
- [ ] Port `SpecsNavSidebar` component
- [ ] Implement collapsible sidebar logic
- [x] Port `QuickSearch` (Cmd+K) component (Implemented as custom modal, not cmdk)
- [x] Add `cmdk` dependency (Added but unused, custom implementation used)
- [x] Integrate search with API
- [x] Add keyboard shortcuts

**Day 3: Spec Detail Enhancements**
- [ ] Port `SubSpecTabs` component
- [ ] Implement sub-spec detection (parse for `SPLIT.md`)
- [ ] Port `TableOfContentsSidebar`
- [ ] Implement heading extraction from markdown
- [ ] Add focus mode toggle
- [x] Update `SpecDetailPage.tsx` (with Mermaid support)

**Day 4: Metadata & Search**
- [ ] Port inline `EditableSpecMetadata` component
- [x] Wire up to metadata update API (existing)
- [ ] Enhance `SpecsPage` with grid/list toggle
- [ ] Add rich spec cards
- [ ] Integrate `QuickSearch` globally

**Day 5: Visual Parity**
- [x] Update `StatusBadge` styling (using Badge from ui-components)
- [x] Update `PriorityBadge` styling (using Badge from ui-components)
- [ ] Port loading skeletons
- [ ] Add transitions and animations
- [ ] Test on different screen sizes

### Week 2: Advanced Components
**Day 1-2: Dependency Graph**
- [x] Port `SpecDependencyGraph` component
- [x] Add `reactflow` and `@dagrejs/dagre` dependency
- [x] Implement graph rendering
- [x] Add node interactions (click, hover)
- [x] Add DAG layout view
- [x] Update `DependenciesPage.tsx`

**Day 3: Charts & Stats**
- [x] Add `recharts` dependency
- [x] Port stats chart components
- [x] Implement bar charts (by status, priority)
- [x] Implement pie chart (distribution)
- [ ] Add velocity tracking chart
- [x] Update `StatsPage.tsx`

**Day 4: Mermaid Diagrams**
- [x] Add `mermaid` dependency
- [x] Port `MermaidDiagram` component
- [x] Implement client-side rendering
- [x] Add error handling for invalid syntax
- [x] Integrate into markdown renderer

**Day 5: Project Management**
- [ ] Port `CreateProjectDialog` component
- [ ] Port `DirectoryPicker` component
- [ ] Add project discovery integration
- [ ] Implement project CRUD in settings
- [ ] Add favorites UI
- [ ] Add color picker (optional)

### Week 3: Polish & Testing
**Day 1-2: Context Page (Optional)**
- [ ] Create `ContextPage.tsx`
- [ ] Port context file browser
- [ ] Port context file viewer
- [ ] Add syntax highlighting
- [ ] Wire up context APIs

**Day 3: i18n (Optional)**
- [ ] Add `i18next` dependencies
- [ ] Set up i18n configuration
- [ ] Port `LanguageSwitcher` component
- [ ] Extract strings for translation
- [ ] Add Chinese translations

**Day 4-5: Final Polish**
- [ ] Add loading states everywhere
- [ ] Add error boundaries
- [ ] Add empty states
- [ ] Implement back-to-top button
- [ ] Add page transitions
- [x] Keyboard shortcut help dialog (exists in Layout)
- [ ] Mobile responsive testing

## Test

**Component Tests**:
- [ ] Dashboard renders with real data
- [ ] Sidebar navigation works
- [ ] Quick search finds and navigates to specs
- [ ] Sub-spec tabs switch correctly
- [ ] ToC links scroll to headings
- [ ] Metadata editor saves changes
- [ ] Dependency graph renders and is interactive
- [ ] Charts display correct data
- [ ] Mermaid diagrams render without errors
- [ ] Project dialogs create/edit projects

**Integration Tests**:
- [ ] Dashboard → Spec detail navigation
- [ ] Quick search → Spec detail
- [ ] Metadata edit → Updates display
- [ ] Project switch → All views update
- [ ] Dependency graph → Click → Navigate

**Visual Regression**:
- [ ] Compare screenshots with @leanspec/ui
- [ ] Verify color palette matches
- [ ] Verify spacing and typography
- [ ] Verify dark mode consistency

## Success Criteria

**Must Have**:
- [ ] All 7 pages exist and functional
- [ ] All critical components ported (9 components)
- [ ] Dashboard shows stats and recent specs
- [ ] Quick search works with Cmd+K
- [ ] Sub-spec navigation works
- [ ] ToC sidebar works
- [ ] Dependency graph interactive
- [ ] Metadata editing persists
- [ ] Project CRUD operations work

**Should Have**:
- [ ] Charts in stats page
- [ ] Grid/list toggle
- [ ] Focus mode
- [ ] Mermaid diagrams
- [ ] Visual parity with @leanspec/ui
- [ ] Loading skeletons

**Nice to Have**:
- [ ] Context page
- [ ] i18n language switcher
- [ ] Project colors/favorites
- [ ] Spec timeline
- [ ] Advanced keyboard shortcuts

## Notes

### Porting Priorities

**Week 1 (MVP)**:
- Core navigation and viewing experience
- Metadata editing (critical user need)
- Dashboard for overview

**Week 2 (Advanced Features)**:
- Dependency visualization (key differentiator)
- Stats charts (data insights)
- Project management (onboarding)

**Week 3 (Polish)**:
- Context page (niche feature)
- i18n (optional)
- Final polish and testing

### Component Complexity

**Simple** (<1 day each):
- Dashboard stat cards
- Sub-spec tabs
- Table of contents
- Quick search modal
- Project dialogs

**Medium** (1-2 days each):
- Dependency graph visualization
- Stats charts
- Metadata inline editor
- Specs sidebar

**Complex** (2-3 days):
- Full dependency graph with interactions
- i18n infrastructure (if implementing)

### Testing Strategy

**Prefer integration tests** over unit tests for UI:
- Test user flows, not component internals
- Use React Testing Library
- Mock API calls with MSW (Mock Service Worker)
- Visual regression with Playwright

### Related Specs

- [Spec 190](../190-ui-vite-parity-rust-backend/) - Parent umbrella spec
- [Spec 192](../192-backend-api-parity/) - Backend sub-spec (prerequisite)
- [Spec 187](../187-vite-spa-migration/) - Original ui-vite implementation
- [Spec 185](../185-ui-components-extraction/) - Shared components (if extracted)

## Implementation Log

### 2025-12-19: Sub-Spec Created
- Split from parent spec 190
- Focus: Frontend UI/UX only
- Depends on: Spec 192 (Backend APIs)
- Parallel work with backend implementation
- Estimated: 3 weeks (15 days)

### 2025-12-22: Phase 1 & 2 Complete - Core Features Implemented
**Dependencies Added:**
- ✅ cmdk - Command palette support
- ✅ recharts - Charts and visualizations
- ✅ mermaid - Diagram rendering
- ✅ reactflow - Dependency graph visualization
- ✅ @dagrejs/dagre - Graph layout algorithm
- ✅ react-syntax-highlighter - Code highlighting support

**Pages Implemented:**
1. **DashboardPage** (NEW)
   - Stats cards with gradient backgrounds (Total, Planned, In Progress, Complete)
   - Recently added specs section
   - Planned/In-progress specs sections
   - Activity timeline with recent updates
   - Quick actions with navigation buttons
   - Router updated to use Dashboard as index page

2. **StatsPage** (ENHANCED)
   - Added Recharts visualizations (Pie chart for status, Bar chart for priority)
   - Summary cards with key metrics
   - Enhanced tag display with sorting
   - Completion rate calculation

3. **DependenciesPage** (ENHANCED)
   - React Flow interactive graph visualization
   - Dagre automatic layout algorithm
   - Graph/List view toggle
   - Node click navigation to spec details
   - Color-coded nodes by status
   - Animated edges for dependency relationships
   - Pan, zoom, and interaction controls

4. **SpecDetailPage** (ENHANCED)
   - Mermaid diagram rendering in markdown code blocks
   - Theme-aware diagram rendering (light/dark mode)
   - Error handling for invalid diagram syntax
   - Metadata editing (already existed)

**Navigation & UX:**
- Added Dashboard to main navigation with LayoutDashboard icon
- Updated keyboard shortcuts to include 'h' for Dashboard
- Updated Layout component with Dashboard link
- Keyboard shortcuts help dialog (already existed)

**Progress Summary:**
- ✅ 40% of critical components complete
- ✅ All major visualization features implemented
- ✅ Dashboard, Stats, Dependencies pages fully functional
- ✅ Mermaid diagrams working
- 🔄 Remaining: QuickSearch (Cmd+K), SubSpecTabs, TableOfContents, SpecsNavSidebar
- 🔄 Remaining: Enhancements to SpecsPage, SettingsPage

**Key Decisions:**
- Used @leanspec/ui-components for base UI components (Card, Button, Badge)
- Used React Flow instead of vis-network for better React integration
- Used Dagre for automatic graph layouting (cleaner than force-directed)
- Integrated Mermaid directly into ReactMarkdown component pipeline
- Prioritized visual features (charts, graphs) over navigation features

**Technical Notes:**
- Build time increased due to Mermaid (many diagram types bundled)
- Consider code-splitting Mermaid diagrams on demand
- Type imports fixed for React Flow to use `type` keyword
- All TypeScript checks passing, build successful
