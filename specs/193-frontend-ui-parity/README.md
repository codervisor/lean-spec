---
status: in-progress
created: '2025-12-19'
priority: critical
tags:
  - ui
  - frontend
  - vite
  - react
  - ui-parity
depends_on:
  - 192-backend-api-parity
created_at: '2025-12-19T06:36:15.645303Z'
updated_at: '2025-12-24T00:00:00.000Z'
transitions:
  - status: in-progress
    at: '2025-12-22T14:01:35.592Z'
---

# Frontend UI Parity: Achieve 100% UI/UX Match Between Next.js and Vite

> **Status**: ⏳ In progress · **Priority**: Critical · **Created**: 2025-12-19 · **Tags**: ui, frontend, vite, react, ui-parity

> Achieve **identical UI/UX** between @leanspec/ui (Next.js) and @leanspec/ui-vite (Vite SPA). Zero compromise on appearance, look, feel, and interactions.

## Overview

**Part of**: [Spec 190](../190-ui-vite-parity-rust-backend/) - UI-Vite Parity

**Problem**: @leanspec/ui-vite lacks UI parity with @leanspec/ui:
- Missing 16 critical components (dashboard, sidebar, ToC, etc.)
- API response formats differ between Next.js and Rust backend
- Different framework patterns (Next.js vs React Router)
- No systematic mapping for component porting
- Visual inconsistencies in badges, colors, spacing

**Goal**: Port **every component** and **every page** from @leanspec/ui to @leanspec/ui-vite with **pixel-perfect visual parity** and **identical interactions**.

**Non-Negotiable**: UI/UX must be indistinguishable between the two implementations.

**Depends on**: [Spec 192](../192-backend-api-parity/) - Backend APIs must be functional first

## Analysis

### Complete Component Audit

**From**: `packages/ui/src/components/`
**To**: `packages/ui-vite/src/components/`

| #   | Component                    | Status | Lines | Complexity | Dependencies                       |
| --- | ---------------------------- | ------ | ----- | ---------- | ---------------------------------- |
| 1   | `dashboard-client.tsx`       | ✅ Done | 285   | Medium     | Next Link, useProject, Card        |
| 2   | `specs-nav-sidebar.tsx`      | ✅ Done | 520   | High       | react-window, Next Link, useRouter |
| 3   | `quick-search.tsx`           | ✅ Done | 150   | Medium     | cmdk, fuse.js, useRouter           |
| 4   | `sub-spec-tabs.tsx`          | ✅ Done | 120   | Low        | Tabs, ReactMarkdown                |
| 5   | `table-of-contents.tsx`      | ✅ Done | 180   | Medium     | Dialog, github-slugger             |
| 6   | `editable-spec-metadata.tsx` | ✅ Done | 140   | Medium     | Status/Priority/TagsEditor         |
| 7   | `spec-dependency-graph.tsx`  | ✅ Done | 85    | Low        | ReactFlow wrapper                  |
| 8   | `dependencies-client.tsx`    | ✅ Done | 650   | High       | ReactFlow, dagre                   |
| 9   | `create-project-dialog.tsx`  | ✅ Done | 220   | High       | Dialog, DirectoryPicker            |
| 10  | `directory-picker.tsx`       | ✅ Done | 180   | High       | Desktop API integration            |
| 11  | `specs-client.tsx`           | ✅ Done | 280   | Medium     | Grid/List toggle                   |
| 12  | `stats-client.tsx`           | ✅ Done | 320   | Medium     | recharts                           |
| 13  | `status-editor.tsx`          | ✅ Done | 95    | Low        | Select, API call                   |
| 14  | `priority-editor.tsx`        | ✅ Done | 95    | Low        | Select, API call                   |
| 15  | `tags-editor.tsx`            | ✅ Done | 130   | Medium     | Input, Badge                       |
| 16  | `mermaid-diagram.tsx`        | ✅ Done | 110   | Medium     | mermaid                            |
| 17  | `context-client.tsx`         | ✅ Done | 240   | High       | File tree, viewer                  |
| 18  | `color-picker.tsx`           | ✅ Done | 85    | Low        | Popover, color input               |
| 19  | `project-avatar.tsx`         | ✅ Done | 45    | Low        | Avatar with color                  |
| 20  | `back-to-top.tsx`            | ✅ Done | 60    | Low        | Button, scroll listener            |
| 21  | `skeletons.tsx`              | ✅ Done | 120   | Low        | Skeleton components                |

**Summary**:
- **Total**: 21 components
- **Complete** (✅): 21 (100%)
- **Partial** (⚠️): 0 (0%)
- **Missing** (❌): 0 (0%)

### Page/Route Mapping

**From**: `packages/ui/src/app/projects/[projectId]/**/page.tsx`
**To**: `packages/ui-vite/src/pages/*Page.tsx`

| Page         | Next.js Route                 | Vite Route      | Status | Priority |
| ------------ | ----------------------------- | --------------- | ------ | -------- |
| Dashboard    | `/projects/[id]`              | `/`             | ✅ Done | HIGH     |
| Specs List   | `/projects/[id]/specs`        | `/specs`        | ✅ Done | HIGH     |
| Spec Detail  | `/projects/[id]/specs/[spec]` | `/specs/:id`    | ✅ Done | HIGH     |
| Dependencies | `/projects/[id]/dependencies` | `/dependencies` | ✅ Done | HIGH     |
| Stats        | `/projects/[id]/stats`        | `/stats`        | ✅ Done | HIGH     |
| Context      | `/projects/[id]/context`      | `/context`      | ✅ Done | MEDIUM   |
| Settings     | `/projects`                   | `/settings`     | ✅ Done | MEDIUM   |

### API Contract Alignment

**Critical**: API response formats differ between Next.js and Rust backend.

#### Next.js API Format (packages/ui/src/app/api/)

```typescript
// GET /api/projects/[id]/specs
{ 
  specs: Spec[]  // Array directly
}

// GET /api/projects/[id]/stats
{
  totalSpecs: number,
  completionRate: number,
  specsByStatus: { status: string, count: number }[]
}

// Spec shape
{
  id: string,
  specNumber: number | null,
  specName: string,
  title: string | null,  // Extracted from content
  status: string | null,
  priority: string | null,
  tags: string[] | null,
  createdAt: Date | null,
  updatedAt: Date | null
}
```

#### Rust API Format (rust/leanspec-http/)

```typescript
// GET /api/specs
{ 
  specs: Spec[]  // Matches!
}

// GET /api/stats
{
  total: number,
  by_status: Record<string, number>,
  by_priority: Record<string, number>,
  by_tag: Record<string, number>
}

// Spec shape
{
  name: string,  // Different!
  title: string,
  status: 'planned' | 'in-progress' | 'complete' | 'archived',
  priority?: 'low' | 'medium' | 'high',
  tags?: string[],
  created?: string,
  updated?: string,
  depends_on?: string[],
  required_by?: string[]
}
```

**Mismatches**:
1. ❌ Stats structure completely different (`totalSpecs` vs `total`, `specsByStatus` vs `by_status`)
2. ❌ Spec field names different (`specNumber` vs missing, `specName` vs `name`)
3. ❌ Date types different (`Date` vs `string`)
4. ❌ Null handling different (explicit `null` vs optional `?`)

**Solution**: Create adapter layer in `ui-vite/src/lib/api.ts` to normalize responses.

### Framework Pattern Mapping

| Pattern                | Next.js (@leanspec/ui)                     | Vite (@leanspec/ui-vite)                           |
| ---------------------- | ------------------------------------------ | -------------------------------------------------- |
| **Routing**            | `next/link` → `Link href="/path"`          | `react-router-dom` → `Link to="/path"`             |
| **Navigation**         | `useRouter()` → `router.push()`            | `useNavigate()` → `navigate()`                     |
| **Query Params**       | `useSearchParams()` → `searchParams.get()` | `useSearchParams()` → `searchParams.get()` (same!) |
| **Dynamic Routes**     | `[id]` → `params.id`                       | `:id` → `useParams().id`                           |
| **Data Fetching**      | `fetch('/api/...')` in Server Component    | `api.getSpecs()` in Client Component               |
| **Image Optimization** | `<Image src="..." />`                      | `<img src="..." />`                                |
| **Metadata**           | `export const metadata`                    | `<Helmet>` (or skip)                               |
| **Client Marker**      | `'use client'` directive                   | Not needed (all client)                            |

### Visual Parity Requirements

**Colors** (must match exactly):

```typescript
// Status badges
planned: "bg-blue-500/20 text-blue-700 dark:text-blue-300"
in-progress: "bg-orange-500/20 text-orange-700 dark:text-orange-300"
complete: "bg-green-500/20 text-green-700 dark:text-green-300"
archived: "bg-gray-500/20 text-gray-600 dark:text-gray-300"

// Priority badges  
low: "bg-gray-500/20 text-gray-600"
medium: "bg-blue-500/20 text-blue-600"
high: "bg-orange-500/20 text-orange-600"
critical: "bg-red-500/20 text-red-600"

// Stat cards gradients
total: "bg-gradient-to-br from-blue-500/10"
planned: "bg-gradient-to-br from-purple-500/10"
in-progress: "bg-gradient-to-br from-orange-500/10"
complete: "bg-gradient-to-br from-green-500/10"
```

**Typography**:
- Dashboard title: `text-3xl sm:text-4xl font-bold tracking-tight`
- Section headers: `text-lg font-semibold`
- Metadata labels: `text-sm font-medium text-muted-foreground`
- Spec titles: `text-sm font-medium`
- Spec numbers: `text-xs font-mono text-muted-foreground`

**Spacing**:
- Page container: `p-4 sm:p-8`
- Section gaps: `space-y-6 sm:space-y-8`
- Card padding: `p-4` or `pt-6` (CardContent)
- Grid gaps: `gap-3 sm:gap-4`

**Interactions**:
- Hover: `hover:bg-accent transition-colors`
- Focus: `focus:outline-none focus:ring-2 focus:ring-primary`
- Active: `data-[state=active]:border-primary`
- Disabled: `opacity-50 cursor-not-allowed`

## Design

### Systematic Porting Strategy

**Phase 1: API Alignment** (Prerequisites)
1. Create response adapters in `api.ts`
2. Add type definitions matching Next.js shapes
3. Test all API endpoints return expected data
4. Document any unavoidable differences

**Phase 2: Component Porting** (Copy → Adapt → Test)
For each component:

1. **Copy** source file from `packages/ui/src/components/X.tsx`
2. **Adapt** framework-specific code:
   - Replace `next/link` with `react-router-dom`
   - Replace `useRouter` with `useNavigate`/`useLocation`
   - Replace `fetch('/api/...')` with `api.method()`
   - Remove `'use client'` directive
3. **Verify** visual parity:
   - Screenshot comparison (side-by-side)
   - Check colors match design system
   - Verify spacing/typography
4. **Test** interactions:
   - Click handlers work
   - Keyboard shortcuts work
   - Loading states display
   - Error states display

**Phase 3: Integration** (Wire up → Verify)
1. Import component in target page
2. Pass props from API data
3. Test with real backend
4. Handle edge cases (empty, loading, error)

### API Adapter Layer

**Location**: `packages/ui-vite/src/lib/api.ts`

**Purpose**: Normalize Rust API responses to match Next.js API shapes.

```typescript
// Add to api.ts

/** Adapter: Convert Rust spec to Next.js spec shape */
function adaptSpec(rustSpec: RustSpec): NextJsSpec {
  return {
    id: rustSpec.name, // Use name as ID
    specNumber: extractSpecNumber(rustSpec.name), // Extract from "123-name"
    specName: rustSpec.name,
    title: rustSpec.title,
    status: rustSpec.status,
    priority: rustSpec.priority || null,
    tags: rustSpec.tags || null,
    createdAt: rustSpec.created ? new Date(rustSpec.created) : null,
    updatedAt: rustSpec.updated ? new Date(rustSpec.updated) : null,
  };
}

/** Adapter: Convert Rust stats to Next.js stats shape */
function adaptStats(rustStats: RustStats): NextJsStats {
  return {
    totalSpecs: rustStats.total,
    completionRate: calculateCompletionRate(rustStats.by_status),
    specsByStatus: Object.entries(rustStats.by_status).map(([status, count]) => ({
      status,
      count,
    })),
  };
}

/** Extract spec number from name (e.g., "123-feature" → 123) */
function extractSpecNumber(name: string): number | null {
  const match = name.match(/^(\d+)-/);
  return match ? parseInt(match[1], 10) : null;
}

/** Calculate completion rate from status counts */
function calculateCompletionRate(byStatus: Record<string, number>): number {
  const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);
  const complete = byStatus.complete || 0;
  return total > 0 ? (complete / total) * 100 : 0;
}

// Update existing methods to use adapters
export const api = {
  async getSpecs(): Promise<NextJsSpec[]> {
    const data = await fetchAPI<{ specs: RustSpec[] }>('/api/specs');
    return data.specs.map(adaptSpec);
  },

  async getSpec(name: string): Promise<NextJsSpecDetail> {
    const data = await fetchAPI<{ spec: RustSpecDetail }>(`/api/specs/${encodeURIComponent(name)}`);
    return {
      ...adaptSpec(data.spec),
      // Add detail-specific fields
    };
  },

  async getStats(): Promise<NextJsStats> {
    const data = await fetchAPI<RustStats>('/api/stats');
    return adaptStats(data);
  },
  
  // ... rest of methods
};
```

### Component-by-Component Porting Guide

#### 1. DashboardClient → Extract Components

**Source**: `packages/ui/src/app/dashboard-client.tsx` (285 lines)
**Target**: 
- `packages/ui-vite/src/pages/DashboardPage.tsx` (main)
- `packages/ui-vite/src/components/dashboard/DashboardClient.tsx` (logic)
- `packages/ui-vite/src/components/dashboard/StatCard.tsx` (extracted)
- `packages/ui-vite/src/components/dashboard/SpecListItem.tsx` (extracted)
- `packages/ui-vite/src/components/dashboard/ActivityItem.tsx` (extracted)

**Changes**:
```diff
- import Link from 'next/link';
+ import { Link } from 'react-router-dom';

- import { useProject } from '@/contexts/project-context';
+ import { useProject } from '@/contexts/ProjectContext';

- const specUrl = `/projects/${projectId}/specs/${spec.specNumber}`;
+ const specUrl = `/specs/${spec.specNumber}`;  // No project prefix in Vite

- <Link href={specUrl}>
+ <Link to={specUrl}>
```

**Completion Criteria**:
- [ ] All 4 stat cards render with gradients
- [ ] Recent specs section shows last 5 specs
- [ ] Planned/In-progress sections show filtered specs
- [ ] Activity timeline shows recent updates
- [ ] Quick actions navigate correctly
- [ ] Visual match: Screenshot side-by-side with Next.js version

#### 2. SpecsNavSidebar → Complex Port

**Source**: `packages/ui/src/components/specs-nav-sidebar.tsx` (520 lines)
**Target**: `packages/ui-vite/src/components/SpecsNavSidebar.tsx`

**Complexity**: HIGH (uses react-window, URL sync, scroll persistence)

**Changes**:
```diff
- import { useRouter, useSearchParams, usePathname } from 'next/navigation';
+ import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
+ const navigate = useNavigate();
+ const location = useLocation();

- import Link from 'next/link';
+ import { Link } from 'react-router-dom';

- const specUrl = getSpecUrl(spec.specNumber || spec.id);
+ const specUrl = `/specs/${spec.specNumber || spec.id}`;

- router.replace(newUrl, { scroll: false });
+ navigate(newUrl, { replace: true });
```

**Completion Criteria**:
- [ ] Sidebar renders with search input
- [ ] Filter dropdowns work (status, priority, tags)
- [ ] Virtual scrolling works (react-window)
- [ ] Active spec highlights correctly
- [ ] Scroll position persists between navigations
- [ ] Collapse/expand works
- [ ] Mobile overlay works
- [ ] Keyboard navigation works

#### 3. QuickSearch → Use cmdk or Custom

**Source**: `packages/ui/src/components/quick-search.tsx` (150 lines)
**Current**: `packages/ui-vite/src/components/QuickSearch.tsx` (custom modal)

**Decision**: Keep custom modal OR port cmdk-based version.

**If porting cmdk version**:
```diff
- import { useRouter } from 'next/navigation';
+ import { useNavigate } from 'react-router-dom';

- router.push(getSpecUrl(specId));
+ navigate(`/specs/${specId}`);

- import { CommandDialog, ... } from "@/components/ui/command";
+ // Need to install cmdk: pnpm add cmdk
```

**Completion Criteria**:
- [ ] Cmd+K opens search modal
- [ ] Fuzzy search works (fuse.js)
- [ ] Recent searches persist in localStorage
- [ ] Selecting spec navigates correctly
- [ ] Tag filtering works
- [ ] ESC closes modal

#### 4. SubSpecTabs → Straightforward Port

**Source**: `packages/ui/src/components/sub-spec-tabs.tsx` (120 lines)
**Target**: `packages/ui-vite/src/components/spec-detail/SubSpecTabs.tsx`

**Changes**:
```diff
- No Next.js imports, should work as-is!
+ Just copy and verify ReactMarkdown integration
```

**Completion Criteria**:
- [ ] Overview tab shows main content
- [ ] Sub-spec tabs render dynamically
- [ ] Tab icons display with correct colors
- [ ] Markdown renders correctly
- [ ] Navigation card shows when >2 sub-specs

#### 5. TableOfContents → Two Variants

**Source**: `packages/ui/src/components/table-of-contents.tsx` (180 lines)
**Target**: `packages/ui-vite/src/components/spec-detail/TableOfContents.tsx`

**Note**: Has both `TableOfContentsSidebar` (desktop) and `TableOfContents` (mobile FAB + dialog)

**Changes**:
```diff
- No framework-specific code
+ Just copy, verify heading extraction works
```

**Completion Criteria**:
- [ ] Headings extracted from markdown
- [ ] Sidebar variant works (desktop)
- [ ] FAB + Dialog variant works (mobile)
- [ ] Clicking heading scrolls to section
- [ ] URL hash updates on scroll

#### 6. EditableSpecMetadata → Complex with Editors

**Source**: `packages/ui/src/components/editable-spec-metadata.tsx` (140 lines)
**Dependencies**: `status-editor`, `priority-editor`, `tags-editor`
**Target**: `packages/ui-vite/src/components/spec-detail/EditableMetadata.tsx`

**Sub-components to port**:
1. `status-editor.tsx` (95 lines) - Select with API call
2. `priority-editor.tsx` (95 lines) - Select with API call
3. `tags-editor.tsx` (130 lines) - Input with badges

**Changes**:
```diff
// In status-editor.tsx
- const res = await fetch(`/api/projects/${projectId}/specs/${specId}/status`, ...);
+ await api.updateSpec(specId, { status: newStatus });

// In editable-spec-metadata.tsx
- import { formatDate, formatRelativeTime } from '@/lib/date-utils';
+ // Port date-utils.ts or implement inline
```

**Completion Criteria**:
- [ ] Status dropdown works, updates persist
- [ ] Priority dropdown works, updates persist
- [ ] Tags can be added/removed
- [ ] Created/Updated dates display correctly
- [ ] Assignee displays (if present)
- [ ] GitHub URL link works
- [ ] `onMetadataUpdate` callback fires

#### 7-9. Project Management Components

**7. CreateProjectDialog**
- Source: `packages/ui/src/components/create-project-dialog.tsx` (220 lines)
- Complexity: HIGH (form validation, API integration)

**8. DirectoryPicker**
- Source: `packages/ui/src/components/directory-picker.tsx` (180 lines)
- Complexity: HIGH (filesystem browser, desktop API)

**9. ProjectSwitcher**
- Already exists in ui-vite, needs enhancement

**Completion Criteria**:
- [ ] Create dialog opens from settings
- [ ] Directory picker browses filesystem
- [ ] Project validation works
- [ ] Project creation persists
- [ ] Project switching works
- [ ] Favorites toggle works (if implemented)

#### 10-11. Context Page Components

**10. ContextClient**
- Source: `packages/ui/src/components/context-client.tsx` (240 lines)
- Target: `packages/ui-vite/src/components/context/ContextClient.tsx`

**11. ContextFileDetail**
- Source: `packages/ui/src/components/context-file-detail.tsx`
- Dependency: syntax highlighter

**Completion Criteria**:
- [x] Context page renders file tree
- [x] Clicking file shows content
- [x] Syntax highlighting works
- [x] Search/filter works

#### 12-14. Polish Components

**12. ColorPicker** (optional)
**13. BackToTop** (polish)
**14. Skeletons** (loading states)

**Completion Criteria**:
- [x] Loading skeletons show during data fetch
- [x] Back-to-top button appears on scroll
- [x] Color picker works (if implementing project colors)

### Dependencies to Add

```bash
cd packages/ui-vite
pnpm add cmdk fuse.js github-slugger react-syntax-highlighter
pnpm add -D @types/react-syntax-highlighter
```

**Already installed**:
- ✅ `reactflow` + `@dagrejs/dagre`
- ✅ `recharts`
- ✅ `mermaid`
- ✅ `react-markdown` + `remark-gfm` + `rehype-highlight`

### File Structure After Port

```
packages/ui-vite/src/
├── components/
│   ├── dashboard/
│   │   ├── DashboardClient.tsx          # ← Port from dashboard-client.tsx
│   │   ├── StatCard.tsx                 # ← Extract from dashboard-client.tsx
│   │   ├── SpecListItem.tsx             # ← Extract from dashboard-client.tsx
│   │   └── ActivityItem.tsx             # ← Extract from dashboard-client.tsx
│   ├── navigation/
│   │   ├── SpecsNavSidebar.tsx          # ← Port from specs-nav-sidebar.tsx
│   │   └── QuickSearch.tsx              # ← Port from quick-search.tsx (or keep custom)
│   ├── spec-detail/
│   │   ├── SubSpecTabs.tsx              # ← Port from sub-spec-tabs.tsx
│   │   ├── TableOfContents.tsx          # ← Port from table-of-contents.tsx
│   │   └── EditableMetadata.tsx         # ← Port from editable-spec-metadata.tsx
│   ├── metadata-editors/
│   │   ├── StatusEditor.tsx             # ← Port from status-editor.tsx
│   │   ├── PriorityEditor.tsx           # ← Port from priority-editor.tsx
│   │   └── TagsEditor.tsx               # ← Port from tags-editor.tsx
│   ├── projects/
│   │   ├── CreateProjectDialog.tsx      # ← Port from create-project-dialog.tsx
│   │   └── DirectoryPicker.tsx          # ← Port from directory-picker.tsx
│   ├── context/
│   │   ├── ContextClient.tsx            # ← Port from context-client.tsx
│   │   └── ContextFileDetail.tsx        # ← Port from context-file-detail.tsx
│   ├── stats/
│   │   └── StatsCharts.tsx              # ✅ Already done
│   ├── dependencies/
│   │   └── DependencyGraph.tsx          # ✅ Already done
│   └── shared/
│       ├── BackToTop.tsx                # ← Port from back-to-top.tsx
│       ├── ColorPicker.tsx              # ← Port from color-picker.tsx
│       ├── Skeletons.tsx                # ← Port from skeletons.tsx
│       └── ProjectAvatar.tsx            # ← Port from project-avatar.tsx
├── lib/
│   ├── api.ts                           # ← Add adapters
│   ├── date-utils.ts                    # ← Port from @leanspec/ui
│   └── markdown-utils.ts                # ← Port heading extraction
├── pages/
│   ├── DashboardPage.tsx                # ← Refactor to use DashboardClient
│   ├── SpecsPage.tsx                    # ← Enhance with grid/list toggle
│   ├── SpecDetailPage.tsx               # ← Integrate ToC + SubSpecs + Metadata
│   ├── StatsPage.tsx                    # ✅ Already enhanced
│   ├── DependenciesPage.tsx             # ✅ Already enhanced
│   ├── ContextPage.tsx                  # ← NEW: Create
│   └── SettingsPage.tsx                 # ← Enhance with project CRUD
└── types/
    ├── api.ts                           # ← Add Next.js-compatible types
    └── specs.ts                         # ← Shared types
```

## Plan

### Phase 0: API Alignment (1-2 days)

**Goal**: Ensure Rust backend APIs match Next.js shapes via adapters.

- [x] **Task 0.1**: Create type definitions
  - [x] Copy types from `packages/ui/src/types/` to `packages/ui-vite/src/types/`
  - [x] Add `NextJsSpec`, `NextJsStats`, `NextJsSpecDetail` interfaces
  - [x] Add `RustSpec`, `RustStats`, `RustSpecDetail` interfaces

- [x] **Task 0.2**: Implement adapters in `api.ts`
  - [x] Add `adaptSpec()` function
  - [x] Add `adaptStats()` function
  - [x] Add `extractSpecNumber()` helper
  - [x] Add `calculateCompletionRate()` helper
  - [x] Update all `api.*` methods to use adapters

- [x] **Task 0.3**: Port utility functions
  - [x] Port `date-utils.ts` (formatDate, formatRelativeTime)
  - [x] Port heading extraction logic (from table-of-contents)
  - [x] Test utilities work with real data

- [x] **Task 0.4**: Verify API alignment
  - [x] Test `/api/specs` returns adapted data
  - [x] Test `/api/stats` returns adapted data
  - [x] Test spec detail endpoint
  - [x] Document any remaining differences

### Phase 1: Core Navigation (3-4 days)

**Goal**: User can navigate between pages and find specs easily.

#### Day 1: Specs Navigation Sidebar

- [x] **Task 1.1**: Port SpecsNavSidebar component
  - [x] Copy `packages/ui/src/components/specs-nav-sidebar.tsx`
  - [x] Replace `next/link` → `react-router-dom Link`
  - [x] Replace `useRouter` → `useNavigate`
  - [x] Replace `useSearchParams` → keep (same in both!)
  - [x] Update imports (Tooltip, Select, Input, Button from ui-components)
  - [x] Fix `getSpecUrl` helper (remove project prefix)

- [x] **Task 1.2**: Integrate sidebar into layout
  - [x] Create `SpecsLayout.tsx` wrapper
  - [x] Update router to use layout for `/specs` routes
  - [x] Test collapse/expand functionality
  - [x] Test mobile overlay

- [x] **Task 1.3**: Implement filtering
  - [x] Verify status filter works
  - [x] Verify priority filter works
  - [x] Verify tag filter works
  - [x] Test "Clear Filters" button

- [x] **Task 1.4**: Test virtual scrolling
  - [x] Verify react-window renders large lists
  - [x] Test scroll position persistence
  - [x] Test active spec highlighting
  - [x] Test search input

**Acceptance**: 
- Sidebar matches Next.js version visually
- All filters work
- Virtual scrolling smooth with 100+ specs
- Active spec highlighted correctly

#### Day 2: Quick Search (Cmd+K)

**Decision Point**: Use existing custom modal OR port cmdk-based version?

**Option A: Port cmdk version** (if want feature parity)
- [x] **Task 2.1**: Install dependencies
  - [x] `pnpm add cmdk fuse.js`
  - [x] Verify cmdk styles load

- [x] **Task 2.2**: Port QuickSearch component
  - [x] Copy `packages/ui/src/components/quick-search.tsx`
  - [x] Replace navigation logic
  - [x] Update Command components import
  - [x] Test fuzzy search (fuse.js)

**Option B: Keep custom modal** (superseded by Option A cmdk port)
- [x] **Task 2.1**: Enhance existing QuickSearch *(not needed — Option A delivered cmdk/fuse-based search)*
  - [x] Add fuzzy search (fuse.js)
  - [x] Add recent searches
  - [x] Add tag filtering

- [x] **Task 2.3**: Wire up globally *(covered by Option A implementation)*
  - [x] Add to Layout component
  - [x] Test Cmd+K shortcut
  - [x] Test spec selection navigates
  - [x] Test recent searches persist

**Acceptance**:
- Cmd+K opens search
- Fuzzy search works
- Navigation works
- Visual match with Next.js

#### Day 3: Dashboard Refactor

- [x] **Task 3.1**: Extract dashboard components
  - [x] Extract `StatCard.tsx` from inline
  - [x] Extract `SpecListItem.tsx` from inline
  - [x] Extract `ActivityItem.tsx` from inline
  - [x] Create `DashboardClient.tsx` (logic component)

- [x] **Task 3.2**: Port DashboardClient logic
  - [x] Copy from `packages/ui/src/app/dashboard-client.tsx`
  - [x] Replace navigation (Link)
  - [x] Update useProject context usage
  - [x] Test stat cards render

- [x] **Task 3.3**: Refactor DashboardPage
  - [x] Import DashboardClient
  - [x] Pass API data as props
  - [x] Remove inline components
  - [x] Test renders correctly

- [x] **Task 3.4**: Visual parity check
  - [x] Screenshot comparison
  - [x] Verify gradients match
  - [x] Verify spacing matches
  - [x] Verify typography matches

**Acceptance**:
- Dashboard looks identical to Next.js
- All sections render (stats, recent, planned, in-progress, activity)
- Navigation works
- Loading states work

### Phase 2: Spec Detail Enhancements (3-4 days)

**Goal**: Spec detail page has all features (ToC, sub-specs, metadata editing).

#### Day 1: Table of Contents

- [x] **Task 1.1**: Port TableOfContents components
  - [x] Copy `packages/ui/src/components/table-of-contents.tsx`
  - [x] Verify github-slugger integration
  - [x] Test heading extraction

- [x] **Task 1.2**: Add sidebar variant (desktop)
  - [x] Create `TableOfContentsSidebar` component
  - [x] Add to SpecDetailPage layout
  - [x] Position as sticky sidebar
  - [x] Test scrolling to headings

- [x] **Task 1.3**: Add FAB + Dialog variant (mobile)
  - [x] Add floating action button
  - [x] Test dialog opens
  - [x] Test navigation works
  - [x] Hide on desktop, show on mobile

- [x] **Task 1.4**: URL hash synchronization
  - [x] Update URL hash on heading click
  - [x] Scroll to heading on page load if hash present
  - [x] Test with long documents

**Acceptance**:
- ToC extracts all headings (H2-H6)
- Clicking heading scrolls smoothly
- URL hash updates
- Mobile and desktop variants work

#### Day 2: Sub-Spec Tabs

- [x] **Task 2.1**: Port SubSpecTabs component
  - [x] Copy `packages/ui/src/components/sub-spec-tabs.tsx`
  - [x] Verify Tabs component integration
  - [x] Test ReactMarkdown rendering

- [ ] **Task 2.2**: Detect sub-specs
  - [ ] Implement sub-spec detection logic (look for `DESIGN.md`, etc.)
  - [ ] Load sub-spec content from API
  - [ ] Map icon names to lucide icons

- [x] **Task 2.3**: Integrate into SpecDetailPage
  - [x] Replace plain markdown with SubSpecTabs
  - [x] Pass main content + sub-specs
  - [x] Test tab switching

- [x] **Task 2.4**: Add navigation card
  - [x] Show overview card when >2 sub-specs
  - [x] List all sub-specs with icons
  - [x] Test clicking navigates to tab

**Acceptance**:
- Main spec shows in "Overview" tab
- Sub-specs render in separate tabs
- Icons display correctly
- Navigation card works
- Markdown renders correctly in all tabs

#### Day 3-4: Editable Metadata

- [x] **Task 3.1**: Port metadata editor components
  - [x] Copy `status-editor.tsx` (95 lines)
  - [x] Copy `priority-editor.tsx` (95 lines)
  - [x] Copy `tags-editor.tsx` (130 lines)
  - [x] Replace API calls with `api.updateSpec()`

- [x] **Task 3.2**: Port EditableSpecMetadata
  - [x] Copy `editable-spec-metadata.tsx` (140 lines)
  - [x] Import editor components
  - [x] Port ClientOnly wrapper (or remove if not needed)
  - [x] Test metadata display

- [x] **Task 3.3**: Wire up to API
  - [x] Implement `api.updateSpec()` method
  - [x] Test status update persists
  - [x] Test priority update persists
  - [x] Test tags update persists

- [x] **Task 3.4**: Add optimistic updates
  - [x] Update local state immediately
  - [x] Show loading indicator
  - [x] Revert on error
  - [x] Show error toast

- [x] **Task 3.5**: Integrate into SpecDetailPage
  - [x] Add EditableMetadata component
  - [x] Position in sidebar or below header
  - [x] Test inline editing works
  - [x] Test `onMetadataUpdate` callback

**Acceptance**:
- Status can be changed via dropdown
- Priority can be changed via dropdown
- Tags can be added/removed
- Changes persist to backend
- Optimistic updates feel instant
- Error handling works

### Phase 3: Project Management (2-3 days)

**Goal**: Full project CRUD in settings page.

#### Day 1: Create Project Dialog

- [x] **Task 1.1**: Port CreateProjectDialog
  - [x] Copy `create-project-dialog.tsx` (220 lines)
  - [x] Update form validation logic
  - [x] Update API integration

- [x] **Task 1.2**: Port DirectoryPicker
  - [x] Copy `directory-picker.tsx` (180 lines)
  - [x] Implement desktop API calls (or mock for web)
  - [x] Test filesystem browsing
  - [x] Handle errors gracefully

- [x] **Task 1.3**: Integrate into SettingsPage
  - [x] Add "Create Project" button
  - [x] Wire up dialog open/close
  - [x] Test project creation flow
  - [x] Test validation (name, path required)

**Acceptance**:
- Dialog opens from settings
- Directory picker works (desktop app)
- Project validation works
- Creating project persists
- List updates after creation

#### Day 2: Project CRUD Operations

- [x] **Task 2.1**: Enhance SettingsPage
  - [x] Show all projects in list
  - [x] Add edit button per project
  - [x] Add delete button per project
  - [x] Add search/filter

- [x] **Task 2.2**: Implement edit functionality
  - [x] Open dialog with pre-filled data
  - [x] Update project API call
  - [x] Test name change persists
  - [x] Test color change persists (if implementing)

- [x] **Task 2.3**: Implement delete functionality
  - [x] Add confirmation dialog
  - [x] Delete project API call
  - [x] Update list after deletion
  - [x] Handle errors (e.g., can't delete current project)

- [x] **Task 2.4**: Add favorites (optional)
  - [x] Add star icon to each project
  - [x] Toggle favorite API call
  - [x] Sort favorites to top
  - [x] Persist to backend

**Acceptance**:
- All projects listed
- Can create new project
- Can edit project name/color
- Can delete project (with confirmation)
- Favorites work (if implementing)

#### Day 3: Polish & Testing

- [x] **Task 3.1**: Port ColorPicker (optional)
  - [x] Copy `color-picker.tsx`
  - [x] Integrate into project form
  - [x] Test color selection

- [x] **Task 3.2**: Port ProjectAvatar
  - [x] Copy `project-avatar.tsx`
  - [x] Use in project list
  - [x] Show colored circle with initial

- [x] **Task 3.3**: Visual parity
  - [x] Screenshot comparison
  - [x] Match spacing, colors
  - [x] Test dark mode

**Acceptance**:
- Settings page matches Next.js visually
- All CRUD operations work
- Error handling robust
- Loading states present

### Phase 4: Context Page (1-2 days, OPTIONAL)

**Goal**: View context files in browser.

- [x] **Task 1**: Port ContextClient
  - [x] Copy `context-client.tsx` (240 lines)
  - [x] Update API calls
  - [x] Test file tree rendering

- [x] **Task 2**: Port ContextFileDetail
  - [x] Copy `context-file-detail.tsx`
  - [x] Add syntax highlighting (react-syntax-highlighter)
  - [x] Test file content display

- [x] **Task 3**: Create ContextPage
  - [x] Integrate ContextClient
  - [x] Add to router
  - [x] Test navigation

**Acceptance**:
- [x] Context page renders file tree
- [x] Clicking file shows content
- [x] Syntax highlighting works
- [x] Search/filter works

### Phase 5: Polish & Final Touches (2-3 days)

#### Day 1: Loading States & Skeletons

- [x] **Task 1.1**: Port Skeletons component
  - [x] Copy `skeletons.tsx` (120 lines)
  - [x] Create variants for different pages
  - [x] Test rendering

- [x] **Task 1.2**: Add to all pages
  - [x] DashboardPage: Show skeleton while loading
  - [x] SpecsPage: Show skeleton list
  - [x] SpecDetailPage: Show skeleton content
  - [x] StatsPage: Show skeleton charts

- [x] **Task 1.3**: Add loading indicators
  - [x] Spinner for inline actions
  - [x] Progress bar for navigation
  - [x] Skeleton for delayed loads

**Acceptance**:
- No blank pages during load
- Skeleton shapes match final content
- Smooth transitions

#### Day 2: Error States & Empty States

- [x] **Task 2.1**: Add error boundaries
  - [x] Create ErrorBoundary component
  - [x] Wrap all pages
  - [x] Show friendly error message
  - [x] Add retry button

- [x] **Task 2.2**: Add empty states
  - [x] No specs: Show onboarding message
  - [x] No search results: Show helpful text
  - [x] No dependencies: Show explanation
  - [x] No context files: Show message

- [ ] **Task 2.3**: Improve error messages
  - [ ] Show specific error (network, 404, 500)
  - [ ] Add troubleshooting hints
  - [ ] Add contact/report link

**Acceptance**:
- All error cases handled gracefully
- Empty states helpful
- No cryptic errors

#### Day 3: Animations & Interactions

- [x] **Task 3.1**: Port BackToTop button
  - [x] Copy `back-to-top.tsx` (60 lines)
  - [x] Show when scrolled down
  - [x] Smooth scroll to top

- [x] **Task 3.2**: Add page transitions
  - [x] Fade in/out between pages
  - [ ] Slide animations for modals
  - [x] Test performance

- [ ] **Task 3.3**: Polish interactions
  - [ ] Hover states on all buttons
  - [ ] Focus states for keyboard nav
  - [ ] Active states for tabs/buttons
  - [ ] Disabled states look correct

**Acceptance**:
- Interactions feel smooth
- Animations not janky
- Keyboard navigation works
- Visual feedback for all actions

### Phase 6: Visual Parity Verification (1 day)

**Goal**: Guarantee 100% visual match with Next.js version.

- [ ] **Task 1**: Screenshot comparison
  - [ ] Dashboard page (light + dark)
  - [ ] Specs list (light + dark)
  - [ ] Spec detail (light + dark)
  - [ ] Stats page (light + dark)
  - [ ] Dependencies page (light + dark)
  - [ ] Settings page (light + dark)

- [ ] **Task 2**: Color audit
  - [ ] Status badges match exactly
  - [ ] Priority badges match exactly
  - [ ] Stat card gradients match
  - [ ] Border colors match
  - [ ] Hover states match

- [ ] **Task 3**: Typography audit
  - [ ] Font sizes match
  - [ ] Font weights match
  - [ ] Line heights match
  - [ ] Letter spacing match

- [ ] **Task 4**: Spacing audit
  - [ ] Page padding matches
  - [ ] Section gaps match
  - [ ] Card padding matches
  - [ ] Grid gaps match

- [ ] **Task 5**: Fix discrepancies
  - [ ] Document all differences found
  - [ ] Fix each one
  - [ ] Re-verify
  - [ ] Get approval

**Acceptance**:
- Side-by-side screenshots indistinguishable
- Colors match design system
- Typography matches
- Spacing matches
- Dark mode matches

### Summary Timeline

| Phase                       | Duration       | Deliverable                     |
| --------------------------- | -------------- | ------------------------------- |
| Phase 0: API Alignment      | 1-2 days       | Adapters, types, utilities      |
| Phase 1: Core Navigation    | 3-4 days       | Sidebar, QuickSearch, Dashboard |
| Phase 2: Spec Detail        | 3-4 days       | ToC, SubSpecs, Metadata editing |
| Phase 3: Project Management | 2-3 days       | Create/Edit/Delete projects     |
| Phase 4: Context Page       | 1-2 days       | Context file viewer (optional)  |
| Phase 5: Polish             | 2-3 days       | Loading, errors, animations     |
| Phase 6: Verification       | 1 day          | Visual parity confirmation      |
| **Total**                   | **13-19 days** | **100% UI parity**              |

## Test

### Visual Parity Checklist

For each component and page, verify:

#### Dashboard
- [ ] 4 stat cards display with correct gradients (blue, purple, orange, green)
- [ ] Stat numbers correct (total, planned, in-progress, complete)
- [ ] Completion rate displays with TrendingUp icon
- [ ] Recently Added section shows last 5 specs
- [ ] Planned section shows filtered specs
- [ ] In Progress section shows filtered specs
- [ ] Activity timeline shows recent updates with relative times
- [ ] Quick actions navigate to correct pages
- [ ] Project color bar displays (if project has color)
- [ ] Spacing matches: `p-4 sm:p-8`, `space-y-6 sm:space-y-8`

#### Specs Navigation Sidebar
- [ ] Sidebar width 280px when expanded, 0px when collapsed
- [ ] Search input filters specs in real-time
- [ ] Status filter dropdown works (planned, in-progress, complete, archived)
- [ ] Priority filter dropdown works (low, medium, high, critical)
- [ ] Tag filter dropdown populated with all tags
- [ ] Active spec highlighted with `bg-accent`
- [ ] Spec number displays as `#NNN` (3 digits, padded)
- [ ] Title truncates with ellipsis if too long
- [ ] Status/Priority badges show as icon-only with tooltips
- [ ] Virtual scrolling smooth with 100+ specs
- [ ] Scroll position persists between navigations
- [ ] Collapse button (ChevronLeft) hides sidebar
- [ ] Floating expand button (ChevronRight) shows when collapsed
- [ ] Mobile: Overlay backdrop appears, closes on click

#### Quick Search (Cmd+K)
- [ ] Cmd+K (macOS) / Ctrl+K (Windows) opens modal
- [ ] Search input focuses automatically
- [ ] Fuzzy search finds specs (fuse.js with title/specNumber/tags)
- [ ] Recent searches show at top (max 5)
- [ ] Clicking recent search populates input
- [ ] Spec results show: icon, #NNN, title, status badge, priority badge
- [ ] Tag filter section appears when typing
- [ ] Selecting spec navigates to detail page
- [ ] ESC closes modal
- [ ] Clicking outside closes modal
- [ ] Recent searches persist in localStorage

#### Spec Detail Page
- [ ] Sub-spec tabs display if sub-specs exist (DESIGN.md, IMPLEMENTATION.md, etc.)
- [ ] Overview tab shows main README content
- [ ] Sub-spec tabs show correct icons (Palette, Code, etc.) with colors
- [ ] Navigation card shows when >2 sub-specs
- [ ] Markdown renders correctly (headings, lists, code blocks, tables)
- [ ] Mermaid diagrams render in code blocks (```mermaid)
- [ ] Table of Contents sidebar shows on desktop (sticky)
- [ ] ToC floating button shows on mobile
- [ ] Clicking ToC heading scrolls to section
- [ ] URL hash updates when clicking ToC
- [ ] Editable metadata card displays below content
- [ ] Status dropdown allows changing status
- [ ] Priority dropdown allows changing priority
- [ ] Tags can be added/removed
- [ ] Created/Updated dates display with relative time
- [ ] Assignee displays (if set)
- [ ] GitHub URL link displays (if set)

#### Dependencies Page
- [ ] Dependency graph renders with ReactFlow
- [ ] Nodes display: #NNN, name, status badge
- [ ] Edges show dependencies (amber arrow)
- [ ] Dagre layout positions nodes hierarchically
- [ ] Status filter buttons work (planned, in-progress, complete, archived)
- [ ] "Show Standalone" toggle includes/excludes unconnected specs
- [ ] "Compact" toggle changes node size
- [ ] "Focus Mode" button appears when spec selected
- [ ] Clicking node selects it (highlights connections)
- [ ] Double-clicking node navigates to spec detail
- [ ] Spec selector dropdown filters specs
- [ ] Clicking pane deselects focused spec
- [ ] Sidebar shows focused spec details (upstream/downstream)
- [ ] Minimap shows graph overview
- [ ] Controls allow zoom, pan, fit-view

#### Stats Page
- [ ] Summary cards display (Total, Planned, In Progress, Complete, Archived)
- [ ] Completion rate calculated correctly
- [ ] Pie chart shows status distribution with colors
- [ ] Bar chart shows priority distribution with colors
- [ ] Tag cloud displays with counts
- [ ] Tags sorted by count descending
- [ ] Charts use correct color palette
- [ ] Recharts tooltips work on hover

#### Settings Page
- [ ] All projects listed
- [ ] "Create Project" button opens dialog
- [ ] Create dialog has name input, directory picker
- [ ] Directory picker browses filesystem (desktop app only)
- [ ] Validation shows errors (name required, path required, path must exist)
- [ ] Creating project adds to list
- [ ] Edit button opens dialog with pre-filled data
- [ ] Updating project persists changes
- [ ] Delete button shows confirmation dialog
- [ ] Deleting project removes from list
- [ ] Current project cannot be deleted (error shown)
- [ ] Favorites toggle works (if implementing)
- [ ] Color picker works (if implementing)

#### Context Page (Optional)
- [x] File tree renders context files
- [x] Clicking file shows content in viewer
- [x] Syntax highlighting works for code files
- [x] Search/filter works
- [ ] Breadcrumbs show current path

### Functional Tests

#### API Integration
- [ ] GET /api/specs returns array of specs
- [ ] Specs have correct shape after adapter (id, specNumber, specName, title, status, priority, tags, createdAt, updatedAt)
- [ ] GET /api/stats returns stats with correct shape (totalSpecs, completionRate, specsByStatus)
- [ ] GET /api/specs/:id returns spec detail
- [ ] PATCH /api/specs/:id updates metadata
- [ ] Status update persists to backend
- [ ] Priority update persists to backend
- [ ] Tags update persists to backend

#### Navigation
- [ ] Clicking spec in sidebar navigates to detail
- [ ] Clicking spec in quick search navigates to detail
- [ ] Clicking spec in dashboard navigates to detail
- [ ] Clicking dependency graph node (double-click) navigates to detail
- [ ] Browser back button works
- [ ] Browser forward button works
- [ ] Direct URL navigation works (/specs/123)

#### Project Context
- [ ] Current project shows in header
- [ ] Switching project updates all views
- [ ] Project persists in localStorage
- [ ] Multi-project mode shows project selector
- [ ] Single-project mode hides project selector

#### Dark Mode
- [ ] Theme toggle switches between light/dark
- [ ] Theme persists in localStorage
- [ ] All colors adapt correctly
- [ ] Stat card gradients visible in both modes
- [ ] Badges readable in both modes
- [ ] Charts legible in both modes
- [ ] Dependency graph nodes contrast in both modes

#### Responsive Design
- [ ] Dashboard responsive on mobile (cards stack)
- [ ] Specs sidebar becomes overlay on mobile
- [ ] Spec detail readable on mobile (single column)
- [ ] Stats charts resize on mobile
- [ ] Dependency graph usable on mobile (touch pan/zoom)
- [ ] Quick search modal fits mobile screen
- [ ] Navigation menu accessible on mobile

#### Keyboard Navigation
- [ ] Cmd+K / Ctrl+K opens quick search
- [ ] Tab navigates through interactive elements
- [ ] Enter submits forms
- [ ] ESC closes modals/dialogs
- [ ] Arrow keys navigate lists (where applicable)
- [ ] Shortcuts help dialog accessible (? or Cmd+/)

#### Loading & Error States
- [x] Skeleton shows while loading dashboard
- [x] Skeleton shows while loading spec list
- [x] Skeleton shows while loading spec detail
- [ ] Spinner shows during metadata update
- [ ] Error boundary catches component errors
- [ ] Network errors show friendly message
- [ ] 404 errors show "Spec not found" message
- [ ] Empty states helpful (no specs, no dependencies, etc.)

### Performance Tests

- [ ] Dashboard loads < 1s with 100 specs
- [ ] Specs sidebar scrolling smooth with 200+ specs (virtual)
- [ ] Quick search results appear < 200ms
- [ ] Spec detail renders < 500ms
- [ ] Dependency graph renders < 2s with 50+ nodes
- [ ] Stats charts render < 500ms
- [ ] Page transitions smooth (< 100ms)
- [ ] Metadata updates feel instant (optimistic)

### Cross-Browser Tests

- [ ] Chrome: All features work
- [ ] Firefox: All features work
- [ ] Safari: All features work
- [ ] Edge: All features work
- [ ] Mobile Chrome: All features work
- [ ] Mobile Safari: All features work

### Regression Tests

After completing all porting:

- [ ] All Next.js screenshots saved
- [ ] All Vite screenshots captured
- [ ] Side-by-side comparison done
- [ ] Color hex values match
- [ ] Font sizes match (rem/px)
- [ ] Spacing values match (px)
- [ ] Border radius match
- [ ] Shadow values match
- [ ] Hover states match
- [ ] Active states match
- [ ] Focus rings match

## Success Criteria

### Must Have (100% Requirement)

**All Components Ported**:
- [x] DashboardClient (4 sub-components extracted)
- [x] SpecsNavSidebar (520 lines, virtual scrolling)
- [x] QuickSearch (cmdk-based OR enhanced custom)
- [x] SubSpecTabs (tab navigation)
- [x] TableOfContents (sidebar + FAB variants)
- [x] EditableSpecMetadata (+ 3 editor components)
- [x] SpecDependencyGraph (ReactFlow wrapper)
- [x] DependenciesClient (full graph visualization)
- [x] CreateProjectDialog (project wizard)
- [x] DirectoryPicker (filesystem browser)
- [x] MermaidDiagram (diagram rendering)
- [x] StatsCharts (recharts visualization)

**All Pages Feature-Complete**:
- [x] Dashboard: Stats + recent specs + activity
- [ ] Specs List: Grid/list toggle + rich cards + sidebar
- [x] Spec Detail: ToC + sub-specs + editable metadata
- [x] Dependencies: Interactive graph + focus mode
- [x] Stats: Charts + visualizations
- [x] Settings: Full project CRUD
- [x] Context: File browser + viewer (optional)

**Visual Parity (Pixel-Perfect)**:
- [ ] Colors match design system exactly
  - Status badges: blue/orange/green/gray with exact shades
  - Priority badges: gray/blue/orange/red with exact shades
  - Stat cards: Gradients match (blue/purple/orange/green)
- [ ] Typography matches exactly
  - Dashboard title: `text-3xl sm:text-4xl font-bold tracking-tight`
  - Section headers: `text-lg font-semibold`
  - Body text: `text-sm` or `text-base`
- [ ] Spacing matches exactly
  - Page padding: `p-4 sm:p-8`
  - Section gaps: `space-y-6 sm:space-y-8`
  - Card padding: `p-4` or `pt-6`
  - Grid gaps: `gap-3 sm:gap-4`
- [ ] Interactions match exactly
  - Hover: `hover:bg-accent transition-colors`
  - Focus: `focus:ring-2 focus:ring-primary`
  - Active: `data-[state=active]:border-primary`
  - Disabled: `opacity-50 cursor-not-allowed`

**API Contracts Aligned**:
- [x] Adapter layer transforms Rust responses to Next.js shapes
- [x] All type definitions match Next.js types
- [x] Date handling consistent (Date objects vs strings)
- [x] Null vs optional handling consistent

**Functional Requirements**:
- [ ] All navigation works (Link components, useNavigate)
- [ ] All keyboard shortcuts work (Cmd+K, etc.)
- [ ] All CRUD operations work (create/update/delete)
- [ ] All filters work (status, priority, tags)
- [ ] All search works (fuzzy, recent, tags)
- [ ] Project switching works
- [ ] Theme switching works (light/dark)

### Should Have (High Priority)

**Polish**:
- [ ] Loading skeletons for all async operations
- [ ] Error boundaries catch and display errors gracefully
- [ ] Empty states helpful and actionable
- [ ] Success/error toasts for user actions
- [ ] Optimistic updates feel instant
- [ ] Page transitions smooth

**Responsive**:
- [ ] Mobile layouts work (overlay sidebar, stacked cards)
- [ ] Tablet layouts work (balanced spacing)
- [ ] Desktop layouts work (full features)
- [ ] Touch interactions work (pan, zoom on graphs)

**Accessibility**:
- [ ] Keyboard navigation complete
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Screen reader friendly
- [ ] Color contrast meets WCAG AA

### Nice to Have (Optional)

**Context Page**:
- [ ] File tree browser
- [ ] File content viewer with syntax highlighting
- [ ] Search/filter functionality

**Project Features**:
- [ ] Color picker for project customization
- [ ] Project avatars with colors
- [ ] Favorites/pinning

**Advanced Features**:
- [ ] i18n language switcher
- [ ] Spec timeline view
- [ ] Velocity tracking charts
- [ ] Advanced keyboard shortcuts

## Notes

### Why This Is Harder Than Copy/Paste

1. **Framework Paradigm Differences**
   - Next.js: Server Components + Client Components + API Routes
   - Vite: Pure Client-Side SPA + External HTTP Server
   - AI agents struggle with mental model switching

2. **Hidden Dependencies**
   - Each component imports 5-10 other components
   - Shared utilities (date-utils, markdown-utils, etc.)
   - Context providers (ProjectContext, ThemeContext)
   - Must trace and port entire dependency tree

3. **API Response Shape Differences**
   - Next.js returns `Date` objects, Rust returns ISO strings
   - Next.js uses `specNumber`, Rust uses `name`
   - Stats structure completely different
   - Requires adapter layer, not just URL changes

4. **Scattered Framework-Specific Code**
   - `<Link>`, `<Image>`, `useRouter` throughout components
   - `'use client'` directives
   - Dynamic imports
   - SEO/metadata
   - Must find and replace all instances

5. **Visual Parity Requires Attention**
   - Color values must match exactly (not "close enough")
   - Spacing must match exactly (not "looks similar")
   - Typography must match exactly (same rem/px values)
   - Hover/focus/active states must match
   - Dark mode must match
   - AI agents may overlook subtle differences

6. **Context Window Limitations**
   - Can't see both codebases simultaneously
   - Must search, read, remember, switch, implement
   - Error-prone for large components (500+ lines)
   - Requires systematic checklist to avoid missing pieces

### Lessons Learned So Far

From implementation log:

**What Worked**:
- ✅ Extracting inline components improves maintainability
- ✅ Starting with visualization features (charts, graphs) provides quick wins
- ✅ Using @leanspec/ui-components for base UI ensures consistency
- ✅ React Flow better than vis-network for React integration
- ✅ Dagre layout cleaner than force-directed for dependency graphs

**What Didn't Work**:
- ⚠️ Implementing custom QuickSearch instead of porting cmdk version (feature gap)
- ⚠️ Leaving components inline in pages (DashboardPage was 300+ lines)
- ⚠️ Not documenting API differences upfront (discovered during implementation)

**What's Still Needed**:
- 🔄 Remaining components (projects CRUD, context view, polish: specs-client, skeletons, back-to-top, color picker, project avatar)
- 🔄 Visual parity verification (screenshot comparison)
- 🔄 Comprehensive testing (functional + visual regression)

### Implementation Strategies

**For AI Agents**:

1. **Use this spec as checklist**: Don't skip steps, follow plan phase-by-phase
2. **Port one component at a time**: Copy → Adapt → Test → Integrate
3. **Visual verification required**: Screenshot comparison, not just "looks good"
4. **API adapter first**: Don't fight response format differences, normalize them
5. **Extract before porting**: Large inline components should be split first
6. **Test incrementally**: Verify each component works before moving to next

**For Humans**:

1. **Side-by-side windows**: Have both ui and ui-vite codebases open
2. **Diff tools**: Use IDE diff to compare files
3. **Screenshot tools**: Take before/after screenshots
4. **Design tokens**: Document color/spacing values once, reference everywhere
5. **Component library**: Use @leanspec/ui-components as source of truth
6. **Type-driven development**: Let TypeScript guide the adaptation

### Related Specs

- [Spec 190](../190-ui-vite-parity-rust-backend/) - Parent umbrella spec
- [Spec 192](../192-backend-api-parity/) - Backend sub-spec (prerequisite)
- [Spec 187](../187-vite-spa-migration/) - Original ui-vite implementation
- [Spec 185](../185-ui-components-extraction/) - Shared components (if extracted)

### Design Decisions

**Q: Should we use cmdk for QuickSearch or keep custom modal?**
- A: Port cmdk version for feature parity (fuzzy search, recent searches, tag filtering)
- Custom modal is simpler but lacks features

**Q: Should we implement project colors/favorites?**
- A: Optional, not blocking. Add if time permits.
- Focus on core features first (CRUD, switching)

**Q: Should we build Context page?**
- A: Optional, low priority. Most users don't need it.
- Focus on Dashboard, Specs, Dependencies first

**Q: Should we add i18n?**
- A: Out of scope for this spec. Separate effort.
- English-only for now, ensure strings extractable later

**Q: How to handle API differences?**
- A: Create adapter layer in api.ts to normalize Rust responses to Next.js shapes
- Don't change backend, adapt in frontend

**Q: What about tests?**
- A: Manual testing for MVP, automated visual regression later
- Use playwright for screenshot comparison in future

## Implementation Log

### 2025-12-19: Sub-Spec Created
- Split from parent spec 190
- Focus: Frontend UI/UX only
- Depends on: Spec 192 (Backend APIs)
- Parallel work with backend implementation
- Estimated: 3 weeks (15 days)

### 2025-12-22: Phase 1 & 2 Complete - Core Features Implemented
**Dependencies Added:**
- ✅ cmdk - Command palette support (installed but custom impl used)
- ✅ recharts - Charts and visualizations
- ✅ mermaid - Diagram rendering
- ✅ reactflow - Dependency graph visualization
- ✅ @dagrejs/dagre - Graph layout algorithm

**Pages Implemented:**
1. ✅ DashboardPage (inline, needs extraction)
2. ✅ StatsPage (with Recharts)
3. ✅ DependenciesPage (with ReactFlow + Dagre)
4. ✅ SpecDetailPage (with Mermaid)

**Progress Summary:**
- ✅ 40% of critical components complete
- ✅ All major visualization features implemented
- 🔄 Remaining: 14 components (sidebar, search, ToC, metadata, projects)

### 2025-12-23: Phase 3 - Dashboard Refactor & Navigation
**Refactoring:**
- ✅ Refactored DashboardPage to use extracted components
- ✅ Fixed entry point issues (App.tsx/main.tsx)

**Navigation:**
- ✅ Implemented SpecsNavSidebar with search, filtering, sorting
- ✅ Created SpecsLayout wrapper
- ✅ Polished StatusBadge and PriorityBadge

**Progress Summary:**
- ✅ Dashboard fully componentized
- ✅ Specs navigation sidebar implemented
- ✅ Visual parity improved for badges
- 🔄 Remaining: 12 components (QuickSearch, ToC, metadata, projects, context)

### 2025-12-24: Spec Redesign - Comprehensive Implementation Plan
**Analysis:**
- Audited all 21 components from @leanspec/ui
- Documented API contract differences (Next.js vs Rust)
- Mapped framework patterns (routing, navigation, data fetching)
- Defined visual parity requirements (colors, typography, spacing)

**Design:**
- Created systematic porting strategy (Copy → Adapt → Test)
- Designed API adapter layer to normalize responses
- Component-by-component porting guide with completion criteria
- Detailed file structure after port

**Plan:**
- Phase 0: API Alignment (1-2 days)
- Phase 1: Core Navigation (3-4 days)
- Phase 2: Spec Detail Enhancements (3-4 days)
- Phase 3: Project Management (2-3 days)
- Phase 4: Context Page (1-2 days, optional)
- Phase 5: Polish & Final Touches (2-3 days)
- Phase 6: Visual Parity Verification (1 day)
- **Total: 13-19 days for 100% parity**

**Testing:**
- Comprehensive visual parity checklist (dashboard, sidebar, search, detail, etc.)
- Functional tests (API, navigation, project context, dark mode, responsive, keyboard)
- Performance tests (< 1s loads, smooth scrolling, instant updates)
- Cross-browser tests (Chrome, Firefox, Safari, Edge, mobile)
- Regression tests (screenshot comparison, color/spacing verification)

**Success Criteria:**
- All 21 components ported with zero compromise
- Pixel-perfect visual match with Next.js version
- All interactions identical
- API contracts aligned via adapters
- Comprehensive testing passed

**Next Steps:**
- Begin Phase 0: Create API adapter layer
- Port date-utils and markdown-utils
- Set up type definitions
- Start Phase 1: Port SpecsNavSidebar

### 2025-12-24: Phase 0 - API Alignment Complete
- Added shared Next.js/Rust types in `packages/ui-vite/src/types/api.ts` to mirror Next.js shapes while preserving compatibility fields.
- Implemented adapter helpers in `lib/api.ts` and `backend-adapter.ts` to normalize specs/stats, extract spec numbers, and compute completion rate.
- Ported `date-utils.ts` and markdown heading extraction into `ui-vite` utilities for consistent formatting and ToC parsing.
- Updated dashboard and stats pages to consume normalized stats plus Date objects, keeping spec list rendering on adapted fields.
- Tests: `pnpm --filter @leanspec/ui-vite test src/lib/api.test.ts` (pass).

### 2025-12-24: Phase 1 - Specs Navigation Sidebar Parity
- Rebuilt `SpecsNavSidebar` in `ui-vite` with design-system inputs/selects, status/priority/tag filters, clear-all control, and spec number/title badges.
- Added react-window virtualization with scroll persistence, active spec centering, and relative update timestamps for long lists.
- Implemented collapse persistence and mobile overlay behavior; `SpecsLayout` now provides a sticky mobile opener and passes visibility state to the sidebar.
- Dependency added: `react-window` to `@leanspec/ui-vite` for virtualized rendering.
- Tests: `pnpm --filter @leanspec/ui-vite test -- --runInBand` (pass).

### 2025-12-24: Phase 1 - QuickSearch + Dashboard Client
- Ported QuickSearch to the cmdk-based implementation with Fuse.js fuzzy matching, status/priority badges, tag suggestions, recent-search persistence, and Cmd/Ctrl+K toggle plus desktop menu hook.
- Added `fuse.js` dependency to `@leanspec/ui-vite` and wired tag query handling in `SpecsPage` so `?tag=` navigation filters list views.
- Refactored dashboard into `DashboardClient` with extracted StatCard/SpecListItem/ActivityItem components; `DashboardPage` now focuses on data loading and passes project context for the header bar.
- Tests: `pnpm --filter @leanspec/ui-vite test -- --runInBand` (pass).

### 2025-12-24: Phase 2 - Spec Detail Enhancements
- Ported Table of Contents (sidebar + FAB dialog) with github-slugger heading IDs and smooth hash syncing; added floating action button for mobile and sticky sidebar for desktop.
- Ported SubSpecTabs with mermaid-aware markdown rendering, overview card, and metadata-driven sub-spec listings; integrates into SpecDetailPage alongside dependency chips.
- Ported editable metadata suite (status/priority/tags editors) plus wrapper card; wired to `api.updateSpec`, optimistic local updates, and inline badge display.
- Updated SpecDetailPage layout to include ToC, sub-spec tabs, metadata card, dependency links, and badges; added skeleton fallbacks.
- Dependencies added: `github-slugger` (+ `@types/github-slugger`).
- Tests: `pnpm --filter @leanspec/ui-vite typecheck` (pass).

### 2025-12-24: Phase 3 - Project Management Parity
- Added project CRUD surface in `ui-vite`: ported CreateProjectDialog and DirectoryPicker with filesystem browsing, validation, and error states.
- Expanded `lib/api.ts` and types to cover project creation, update, delete, validation, stats, and directory listing; improved response parsing for 204/empty bodies.
- Rebuilt `ProjectContext` with full CRUD, favorites, validation helper, and state persistence for current project selection.
- Implemented SettingsPage parity: searchable project grid with rename, color picker, favorites, validation badges, stats preview, delete confirmation, and create-project entry point.
- Ported shared UI polish components (ColorPicker, ProjectAvatar) for consistent visuals and spacing.
- Tests: `pnpm --filter @leanspec/ui-vite typecheck` (pass).

### 2025-12-24: Phase 4-5 - Context View & Polish
- Delivered Context page parity with list + detail experience: added context APIs to `lib/api.ts`, new `ContextClient`, `ContextFileDetail`, and grouping/search with markdown rendering and mermaid support.
- Added rehype highlighting/slug deps to ui-vite for consistent markdown rendering and wired BackToTop utility for long documents.
- Introduced shared skeleton pack (dashboard/spec list/spec detail/stats/context) and replaced spinner text with parity loaders; upgraded error cards with retry actions across dashboard/specs/stats/context pages.
- Build: `pnpm -F @leanspec/ui-vite build` (pass).

### 2025-12-24: Phase 5 Polish (Error/Empty States, Transitions)
- Implemented global error boundary, retry affordances, and shared EmptyState component; wrapped Layout outlet and added graceful fallbacks across specs, dependencies, and context pages.
- Added global BackToTop control and page fade-in transitions; moved per-page BackToTop usage to centralized control.
- Introduced actionable empty states for specs (no data vs filtered), dependencies (no relationships), and context (no files or search misses).
- Typecheck: `pnpm -F @leanspec/ui-vite typecheck` (pass).
