---
status: complete
created: '2025-11-14'
tags:
  - web
  - ux
  - design
  - enhancement
priority: high
created_at: '2025-11-14T03:21:43.076Z'
depends_on:
  - 068
  - 082-web-realtime-sync-architecture
related:
  - 052-branding-assets
  - 068-live-specs-ux-enhancements
updated_at: '2025-11-17T01:14:24.924Z'
transitions:
  - status: in-progress
    at: '2025-11-14T04:08:03.555Z'
  - status: complete
    at: '2025-11-17T01:14:24.924Z'
completed_at: '2025-11-17T01:14:24.924Z'
completed: '2025-11-17'
---

# Web App UX/UI Comprehensive Redesign

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-14 · **Tags**: web, ux, design, enhancement

**Project**: lean-spec  
**Team**: Core Development  
**Dependencies**: Spec 068 (live-specs-ux-enhancements), **Spec 082 (web-realtime-sync-architecture) - CRITICAL BLOCKER**  
**Related**: Spec 052 (branding-assets)

## Overview

Comprehensive UX/UI redesign for the LeanSpec Web application (`@leanspec/web`) addressing critical layout, navigation, branding, and usability issues. This spec consolidates feedback from initial user testing and aims to create a professional, intuitive interface that aligns with LeanSpec's core principles.

**⚠️ CRITICAL BLOCKER IDENTIFIED**: This spec is **blocked** by spec 082 (web-realtime-sync-architecture). The current database-seeding architecture has a fundamental flaw - no realtime updates from filesystem. Spec 082 proposes removing the database entirely and using direct filesystem reads with smart caching. **This must be resolved before continuing with UX redesign** to avoid building on unstable foundations.

**Why now?**
- Current implementation (spec 068) completed foundational features but has UX issues
- User testing revealed navigation confusion and layout inefficiencies
- Missing branding integration (logo/favicon from spec 052)
- Need to align UI with LeanSpec first principles (Context Economy, Signal-to-Noise)
- Critical for broader adoption and professional appearance

**What's the problem?**
1. **Layout inefficiency**: Top navbar wastes horizontal space, metadata sidebar redundant with header
2. **Navigation confusion**: Breadcrumbs in wrong location, sub-specs as tabs instead of tree structure
3. **Missing branding**: No logo/favicon integration despite spec 052 completion
4. **Content constraints**: Artificial max-width limits readability on wide screens
5. **UX inconsistencies**: Board and List pages feel disconnected, sorting/filtering incomplete

**What's the solution?**
Complete redesign with:
- **Three-section navigation**: Home (dashboard) / Specs (unified list+board) / Stats
- **GitHub link** moved to top navbar as icon (declutters sidebar)
- **Compact top navbar** with logo, breadcrumbs, search, theme toggle, and GitHub link
- **Main sidebar** for primary navigation (3 items: Home, Specs, Stats)
- **Specs nav sidebar** on detail pages only (specs tree with sub-specs)
- **Full-width content** without artificial constraints
- **Integrated metadata** in spec header (no separate sidebar)
- **Vertical timeline** design with better visual hierarchy

## Design

### 1. Branding Integration

**Current State**: No logo or favicon, uses placeholder text only

**Changes Required:**
- Import logo assets from spec 052 (`specs/052-branding-assets/`)
- Use `logo-with-bg.svg` (theme-safe) for navbar light mode
- Use `logo-dark-bg.svg` (cyan on dark) for navbar dark mode
- Add favicon files: `favicon.ico`, `icon.svg`, `apple-touch-icon.png`
- Update `src/app/layout.tsx` metadata for icons
- Ensure logo scales properly at navbar size (32px height)

**Technical Approach:**
```tsx
// packages/web/src/components/navigation.tsx
<Link href="/" className="flex items-center space-x-2">
  <img 
    src="/logo-with-bg.svg" 
    alt="LeanSpec" 
    className="h-8 w-8 dark:hidden" 
  />
  <img 
    src="/logo-dark-bg.svg" 
    alt="LeanSpec" 
    className="h-8 w-8 hidden dark:block" 
  />
  <span className="font-bold text-xl">LeanSpec</span>
</Link>
```

**Files:**
- Copy from: `docs-site/static/img/logo-*.svg` and `docs-site/static/*.{ico,png}`
- Copy to: `packages/web/public/`

### 2. Global Layout Restructure

**Current State**: Top navbar with horizontal menu, no global sidebar

**New Layout Architecture:**

**Global Pages (Home, Specs, Stats):**
```
┌─────────────────────────────────────────────────────────────┐
│ Top Navbar (sticky, h-14)                                  │
│ [Logo] [Breadcrumb...] [Search] [Theme] [GitHub Icon]      │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│ Main     │ Main Content Area                                │
│ Sidebar  │ (full width, no max constraints)                 │
│ (sticky) │                                                  │
│          │                                                  │
│ • Home   │ Home: Dashboard with project overview,           │
│ • Specs  │       recent activity, key metrics               │
│ • Stats  │                                                  │
│          │ Specs: Unified list/board view with switcher     │
│          │                                                  │
│          │ Stats: Project analytics and insights            │
│          │                                                  │
│          │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

**Spec Detail Page (Two Sidebars):**
```
┌──────────────────────────────────────────────────────────────┐
│ Top Navbar (sticky, h-14)                                   │
│ [Logo] [Breadcrumb...] [Search] [Theme] [GitHub Icon]       │
├──────────┬──────────┬────────────────────────────────────────┤
│          │          │                                        │
│ Main     │ Specs    │ Main Content Area                      │
│ Sidebar  │ Nav      │ (full width, no max constraints)       │
│ (sticky) │ Sidebar  │                                        │
│          │ (sticky) │                                        │
│ • Home   │ ▼ 080-x  │                                        │
│ • Specs  │   • Over │                                        │
│ • Stats  │   • IMPL │                                        │
│          │ ▼ 079-y  │                                        │
│          │   • Over │                                        │
│          │ ...      │                                        │
│          │          │                                        │
└──────────┴──────────┴────────────────────────────────────────┘
```

**Implementation Details:**

**Top Navbar Changes:**
- Remove horizontal nav items (moved to sidebar)
- Add GitHub icon link at right edge (between theme toggle and nothing)
- Move breadcrumb from spec detail page to navbar (always visible)
- Keep search and theme toggle at right edge
- Logo on left, breadcrumb next to it
- Layout: `[Logo] [Breadcrumb] ... [Search] [Theme] [GitHub Icon]`
- Height: 56px (h-14)

**Main Sidebar (New - Always Visible):**
- Width: 240px, collapsible to 60px
- Sticky positioning (top: 56px, height: calc(100vh - 56px))
- Contains ONLY 3 primary sections:
  1. **Home** (/) - Dashboard with overview, recent activity, key metrics
  2. **Specs** (/specs) - Unified list/board view with layout switcher
  3. **Stats** (/stats) - Project analytics and insights
- Current page highlighted
- Simple, clean, focused navigation
- GitHub moved to top navbar (no longer in sidebar)

**Specs Nav Sidebar (New - Spec Detail Page Only):**
- Width: 280px, collapsible
- Sticky positioning (top: 56px, height: calc(100vh - 56px))
- Positioned to the right of Main Sidebar
- Contains:
  1. **All Specs Tree** (with expand/collapse)
  2. **Sub-specs** (indented under parent)
- Specs sorted by ID descending (newest first)
- Current spec and sub-spec highlighted
- Only visible on spec detail pages

**Component Structure:**
```tsx
// New: src/components/main-sidebar.tsx
export function MainSidebar({ currentPath }: Props) {
  return (
    <aside className="sticky top-14 h-[calc(100vh-3.5rem)] w-[240px] border-r">
      {/* Main Navigation - 3 Primary Sections */}
      <nav className="p-4 space-y-1">
        <SidebarLink href="/" icon={Home}>
          Home
          <span className="text-xs text-muted-foreground">Dashboard</span>
        </SidebarLink>
        <SidebarLink href="/specs" icon={FileText}>
          Specs
          <span className="text-xs text-muted-foreground">All Specifications</span>
        </SidebarLink>
        <SidebarLink href="/stats" icon={BarChart3}>
          Stats
          <span className="text-xs text-muted-foreground">Analytics</span>
        </SidebarLink>
      </nav>
    </aside>
  );
}

// Updated: src/components/navbar.tsx (add GitHub icon)
export function Navbar({ breadcrumb }: Props) {
  return (
    <header className="sticky top-0 z-50 h-14 border-b bg-background">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left: Logo + Breadcrumb */}
        <div className="flex items-center gap-4">
          <Logo />
          <Breadcrumb items={breadcrumb} />
        </div>
        
        {/* Right: Search + Theme + GitHub */}
        <div className="flex items-center gap-2">
          <SearchButton />
          <ThemeToggle />
          <Button variant="ghost" size="icon" asChild>
            <a href="https://github.com/codervisor/lean-spec" target="_blank">
              <Github className="h-5 w-5" />
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}

// New: src/components/specs-nav-sidebar.tsx
export function SpecsNavSidebar({ specs, currentPath, currentSpec }: Props) {
  return (
    <aside className="sticky top-14 h-[calc(100vh-3.5rem)] w-[280px] border-r">
      {/* Specs Tree with Sub-specs */}
      <div className="p-4">
        <h3 className="text-sm font-semibold mb-2">Specifications</h3>
        <SpecsTree 
          specs={specs} 
          currentPath={currentPath}
          currentSpec={currentSpec}
        />
      </div>
    </aside>
  );
}
```

### 3. Home Page Dashboard Redesign

**Current State**: Home page (`/`) = Spec List with filters and sorting

**New Purpose**: Comprehensive operational dashboard for daily work

**Dashboard Layout:**

```
┌────────────────────────────────────────────────────────┐
│ Home Dashboard                                         │
├────────────────────────────────────────────────────────┤
│                                                        │
│ ┌─────────────────┐ ┌─────────────────┐ ┌──────────┐ │
│ │ In Progress (5) │ │ Recently Added │ │ Stats    │ │
│ │                 │ │                 │ │          │ │
│ │ • 081 Web UX    │ │ • 081 Web UX    │ │ 82 Total │ │
│ │ • 080 MCP Mod   │ │ • 080 MCP Mod   │ │ 5 Active │ │
│ │ • ...           │ │ • ...           │ │ 68 Done  │ │
│ └─────────────────┘ └─────────────────┘ └──────────┘ │
│                                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Activity Timeline                                │  │
│ │                                                  │  │
│ │ • 081 marked in-progress (2 hours ago)           │  │
│ │ • 080 created (yesterday)                        │  │
│ │ • 079 completed (2 days ago)                     │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Quick Actions                                    │  │
│ │ [+ Create Spec] [View All Specs] [Board View]    │  │
│ └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

**Dashboard Components:**

1. **Status Overview Cards** (top row, 3-4 cards)
   - In Progress count + list
   - Planned count + list
   - Recently Added (last 5)
   - Quick stats (total, active, completed)

2. **Activity Timeline** (middle)
   - Recent status changes
   - Spec creations
   - Completions
   - Time-based (last 7 days)

3. **Quick Actions** (bottom)
   - Create new spec button
   - View all specs (→ /specs)
   - Board view (→ /specs?view=board)

**Purpose**: Give users immediate context on project health and recent activity without needing to navigate to other pages.

### 4. Specs Page (Unified List/Board)

**Current State**: 
- `/` = Spec List (cards with filters)
- `/board` = Board view (kanban columns)

**New Structure**:
- Route: `/specs` (primary specs page)
- Layout switcher: List view (default) or Board view
- URL param: `?view=list` or `?view=board`

**This is the full spec collection page** - replaces both old Home and Board pages.

### 5. Spec Detail Page Redesign

**Current Issues:**
- Metadata sidebar duplicates info from header
- Content has max-width constraint (artificially narrow on wide screens)
- Timeline is horizontal (poor use of space)
- Title area and info box separated
- "Back to Specs" button redundant (sidebar navigation exists)

**New Design (Two Sidebars):**

```
┌──────────────────────────────────────────────────────────────┐
│ Top Navbar with Breadcrumb                               │
├──────────┬──────────┬────────────────────────────────────────┤
│ Main     │ Specs    │ Spec Header (sticky, compact)      │
│ Sidebar  │ Nav      │ ┌────────────────────────────────┐ │
│          │ Sidebar  │ │ #080 Title                     │ │
│ • Home   │          │ │ [Status] [Priority] [Tags...]  │ │
│ • Specs  │ ▼ 080-x  │ │ Created: X | Updated: Y        │ │
│ • Stats  │   • Over │ └────────────────────────────────┘ │
│          │   • IMPL │                                    │
│          │   • TEST │ Content (full-width, no max)       │
│          │ ▼ 079-y  │ ┌────────────────────────────────┐ │
│          │   • Over │ │                                │ │
│          │ ...      │ │  Markdown content with         │ │
│          │          │ │  timeline embedded             │ │
│          │          │ │                                │ │
│          │          │ │  ◉ Created (date)              │ │
│          │          │ │  │                              │ │
│          │          │ │  ◉ In Progress (date)          │ │
│          │          │ │  │                              │ │
│          │          │ │  ○ Complete                     │ │
│          │          │ │                                │ │
│          │          │ └────────────────────────────────┘ │
└──────────┴──────────┴────────────────────────────────────────┘
```

**Key Changes:**

**Spec Header (Compact):**
- Line 1: Spec number + Title
- Line 2: Status badge, Priority badge, Tags, Actions dropdown
- Line 3: Small metadata row: `Created: X · Updated: Y · Name: spec-name`
- Remove separate info box sidebar completely
- Sticky position: below navbar

**Content Layout:**
- Remove `max-w-6xl` constraint - use full available width
- Remove left sidebar (metadata) entirely
- Single column layout for content
- Timeline embedded in markdown at appropriate section (not sidebar)

**Sub-Spec Navigation:**
- Move from horizontal tabs to left sidebar tree
- Indent sub-specs under parent spec
- Icons for sub-spec types (DESIGN.md, IMPLEMENTATION.md, etc.)
- Active sub-spec highlighted
- "Overview" = `README.md` (merge, don't duplicate)

**Example Sidebar Tree:**
```
▼ 080 MCP Server Modular Architecture
  • Overview (README.md) ← selected
  • Design
  • Implementation
  • Testing
▼ 079 CLI Alphabetical Organization
  • Overview
```

### 4. Timeline Redesign (Vertical)

**Current**: Horizontal timeline with circles and lines

**New**: Vertical timeline with better visual hierarchy

```tsx
<div className="space-y-4 border-l-2 border-muted pl-4 py-2">
  <TimelineEvent 
    icon={<CheckCircle />} 
    title="Created" 
    date="2025-11-01"
    active
  />
  <TimelineEvent 
    icon={<PlayCircle />} 
    title="In Progress" 
    date="2025-11-05"
    active
  />
  <TimelineEvent 
    icon={<Circle />} 
    title="Complete" 
    date={null}
    active={false}
  />
</div>
```

**Visual Design:**
- Left border line connecting all events
- Icon + title + date for each event
- Active events: solid icon, bold text
- Future events: outline icon, muted text
- Compact spacing, embedded in content flow

### 6. Specs Page - List View Improvements

**Current Issues:**
- No sorting controls (only filters)
- Specs not sorted by ID descending
- Cards are visually heavy

**Changes:**

**Sorting Controls:**
```tsx
<Select value={sortBy} onValueChange={setSortBy}>
  <SelectItem value="id-desc">Newest First (ID ↓)</SelectItem>
  <SelectItem value="id-asc">Oldest First (ID ↑)</SelectItem>
  <SelectItem value="updated-desc">Recently Updated</SelectItem>
  <SelectItem value="title-asc">Title (A-Z)</SelectItem>
</Select>
```

**Default Sort**: ID descending (newest specs at top)

**Table View Option:**
- Add toggle: List view (cards) vs Table view (compact)
- Table columns: ID, Title, Status, Priority, Tags, Updated
- Clickable rows navigate to spec detail

### 7. Board and List Layout Switcher

**Integration**: List and Board are now unified on `/specs` page

**Layout Switcher:**
```tsx
// Add to /specs page
<div className="flex items-center gap-2 mb-4">
  <span className="text-sm text-muted-foreground">View:</span>
  <ToggleGroup type="single" value={layout} onValueChange={setLayout}>
    <ToggleGroupItem value="list" aria-label="List view">
      <List className="h-4 w-4" />
      <span className="ml-2">List</span>
    </ToggleGroupItem>
    <ToggleGroupItem value="board" aria-label="Board view">
      <LayoutGrid className="h-4 w-4" />
      <span className="ml-2">Board</span>
    </ToggleGroupItem>
  </ToggleGroup>
</div>
```

**Implementation:**
- Single route: `/specs`
- URL param: `?view=list` (default) or `?view=board`
- Switcher persists choice in localStorage
- Board view = kanban columns by status
- List view = cards/table sorted/filtered
- Same spec card component, different container layouts

**Navigation:**
- `/` = Home dashboard (new)
- `/specs` = Specs with list/board switcher
- `/specs/[id]` = Spec detail page
- Breadcrumb: Home → Specs (List View) or Home → Specs (Board View)
- Consistent behavior: click spec → detail page
- Back button/sidebar returns to same view mode

### 8. Display `title` vs `name`

**Current Implementation**: 
- `title` field in frontmatter (optional, can be null)
- `name` field = spec folder name (always present)
- H1 heading = first `# Heading` in markdown (always present per validation)

**Clarification Needed**:
- Which field is the "title"? The frontmatter `title` or the H1 heading?
- Current code: `const displayTitle = spec.title || spec.specName`
- This suggests frontmatter `title` is primary, fallback to `name`

**Recommended Approach**:
1. **H1 heading is the canonical title** (always present, validated)
2. **Frontmatter `title`** can be different (for metadata/SEO)
3. **Display logic**:
   - **Primary heading**: Use H1 from markdown content
   - **Metadata**: Show `name` (folder name) in small text
   - **Card/List**: Use H1 title (parse from content)
4. **Fallback**: If H1 parsing fails → use frontmatter `title` → use `name`

**Why H1 over frontmatter title?**
- H1 is required by validation (spec 018)
- H1 is what users see in markdown
- H1 is the "true" document title
- Frontmatter `title` can be stale/inconsistent

### 9. Sub-Spec Icons

**Generic Icons** (default for unknown types):
- 📄 Generic document icon (lucide-react `FileText`)

**Pre-defined Icon Mappings:**
```tsx
const SUB_SPEC_ICONS: Record<string, { icon: LucideIcon, color: string }> = {
  'README.md': { icon: FileText, color: 'text-blue-600' },
  'DESIGN.md': { icon: Palette, color: 'text-purple-600' },
  'IMPLEMENTATION.md': { icon: Code, color: 'text-green-600' },
  'TESTING.md': { icon: TestTube, color: 'text-orange-600' },
  'PLAN.md': { icon: CheckSquare, color: 'text-cyan-600' },
  'TECHNICAL.md': { icon: Wrench, color: 'text-gray-600' },
  'ROADMAP.md': { icon: Map, color: 'text-indigo-600' },
  'MIGRATION.md': { icon: GitBranch, color: 'text-yellow-600' },
  'DOCUMENTATION.md': { icon: BookOpen, color: 'text-pink-600' },
  // ... extend as needed
};
```

**Usage in Sidebar:**
```tsx
<SpecTreeItem icon={Palette} color="text-purple-600">
  Design
</SpecTreeItem>
```

## Plan

### Phase 1: Branding & Layout Foundation (Week 1)

**Day 1-2: Branding Integration**
- [x] Copy logo assets from spec 052 to `packages/web/public/`
- [x] Update favicon references in `layout.tsx`
- [x] Implement theme-aware logo switching in navbar
- [x] Test logo rendering in light/dark modes

**Day 3-5: Sidebar Implementation**
- [x] Create `MainSidebar` component (3 items: Home/Specs/Stats)
- [x] Create `SpecsNavSidebar` component (specs tree with sub-specs)
- [x] Build collapsible specs tree with expand/collapse
- [x] Add search/filter within specs nav sidebar
- [x] Integrate both sidebars into layouts (main sidebar always, specs nav on detail pages only)
- [x] Test two-sidebar layout on spec detail pages

**Day 6-7: Top Navbar Redesign**
- [x] Remove horizontal nav items from navbar
- [x] Move breadcrumb to navbar (next to logo)
- [x] Add GitHub icon link at right edge of navbar
- [x] Reposition: Logo → Breadcrumb ... Search → Theme → GitHub
- [x] Test responsive behavior (mobile collapse)

### Phase 2: Home Dashboard & Spec Detail (Week 2)

**Day 8-9: Home Dashboard Implementation**
- [x] Design dashboard layout (status cards + activity timeline + quick actions)
- [x] Implement status overview cards (In Progress, Planned, Recently Added, Stats)
- [x] Build activity timeline component (recent status changes, creations, completions)
- [x] Add quick actions section (Create Spec, View All Specs, Board View)
- [x] Test dashboard with real data
- [x] Ensure dashboard loads quickly (<1s)

**Day 10-11: Compact Spec Header**
- [x] Redesign spec header with integrated metadata
- [x] Remove "Back to Specs" button
- [x] Add small metadata row (created, updated, name)
- [x] Make header sticky with proper z-index
- [x] Display `title` prominently, `name` as metadata

**Day 10-11: Content Layout**
- [x] Remove max-width constraint on content
- [x] Remove left metadata sidebar entirely
- [x] Implement full-width single-column layout
- [x] Ensure proper responsive behavior

**Day 12-13: Sub-Spec Integration**
- [x] Move sub-specs from tabs to specs nav sidebar tree
- [x] Implement sub-spec icon mapping system
- [x] Add expand/collapse for specs with sub-specs
- [x] Merge "Overview" and "README.md" (no duplication)
- [x] Fix sub-spec navigation routing
- [x] Ensure specs nav sidebar only appears on spec detail pages

**Day 14: Timeline Redesign**
- [x] Implement vertical timeline component
- [x] Embed timeline in content area (not sidebar)
- [x] Add proper icons and visual states
- [x] Test with different status transitions

### Phase 3: Specs Page Unification (Week 3)

**Day 15-16: Specs Page Route Changes**
- [x] Move spec list from `/` to `/specs`
- [x] Implement routing: `/` = dashboard, `/specs` = specs page
- [x] Update all internal links to point to `/specs`
- [x] Add sorting controls (ID desc, ID asc, updated, title)
- [x] Set default sort to ID descending
- [ ] Implement table view option (toggle with card view)

**Day 17-18: Board/List Layout Switcher**
- [x] Add layout switcher component (List/Board toggle) to `/specs`
- [x] Implement URL param handling (?view=list|board)
- [x] Add localStorage persistence for layout preference
- [x] Share spec card component between layouts
- [x] Update breadcrumbs: Home → Specs (List/Board View)
- [x] Remove old `/board` route (redirect to `/specs?view=board`)
- [x] Test navigation flow consistency

**Day 19-21: Polish & Testing**
- [x] Fix any navigation routing issues
- [x] Ensure all links work correctly
- [ ] Test responsive behavior on mobile/tablet
- [ ] Accessibility audit (keyboard navigation, ARIA labels)
- [ ] Performance testing (ensure no regressions)

### Phase 4: Documentation & Deployment

**Day 22-23: Documentation**
- [ ] Update component documentation
- [ ] Document new navigation patterns
- [ ] Create migration notes for any breaking changes
- [ ] Update README with new screenshots

**Day 24-25: QA & Deployment**
- [ ] Full regression testing (all pages)
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile testing (iOS Safari, Android Chrome)
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Deploy to production

## Test

### Functional Testing

**Branding:**
- [x] Logo displays correctly in navbar (light mode)
- [x] Logo switches to dark variant in dark mode
- [x] Favicon appears in browser tabs
- [x] All icon sizes render correctly

**Layout:**
- [x] Main sidebar appears on all pages with 3 items (Home, Specs, Stats)
- [x] Specs nav sidebar appears only on spec detail pages
- [x] Both sidebars are sticky and don't scroll with content
- [x] Both sidebars collapsible function works
- [x] Top navbar has GitHub icon at right edge
- [x] Top navbar breadcrumb updates correctly on navigation
- [x] Search and theme toggle positioned correctly
- [x] Two-sidebar layout doesn't feel cramped on spec detail pages

**Spec Detail:**
- [x] Spec header shows all metadata in compact format
- [x] Title displays correctly (`title` field, not `name`)
- [x] Name field shown in metadata row
- [x] Content uses full width (no artificial constraints)
- [x] Timeline renders vertically with correct states
- [x] Sub-specs appear in sidebar tree (not tabs)
- [x] Sub-spec navigation works (no 404 errors)
- [x] Overview and README.md merged (no duplication)

**Home Dashboard:**
- [x] Dashboard loads quickly (<1s)
- [x] Status overview cards display correct counts
- [x] In Progress and Planned lists show relevant specs
- [x] Recently Added shows last 5 specs
- [x] Activity timeline shows recent changes
- [x] Quick actions navigate correctly
- [x] Dashboard responsive on all screen sizes

**Specs Page:**
- [x] Route `/specs` works correctly
- [x] Specs sorted by ID descending by default
- [x] Sort controls change order correctly
- [ ] Table view displays properly
- [x] Filters work in conjunction with sorting

**Board/List Switcher:**
- [x] Layout switcher appears on `/specs` page
- [x] Switching between List and Board views works
- [x] Layout preference persists via localStorage
- [x] URL param reflects current view (?view=list|board)
- [x] Card click navigates to spec detail from both views
- [x] Breadcrumb shows: Home → Specs (List View) or (Board View)
- [x] Navigation back to `/specs` returns to same view mode
- [x] Old `/board` route redirects to `/specs?view=board`

### Visual Testing

- [ ] Layout consistent across pages
- [ ] Spacing and alignment proper
- [ ] Icons render with correct colors
- [ ] Hover states work on all interactive elements
- [ ] Dark mode styling consistent

### Responsive Testing

- [ ] Mobile: Sidebar collapses to hamburger menu
- [ ] Tablet: Layout adapts appropriately
- [ ] Desktop: Full layout displays correctly
- [ ] Ultra-wide: Content scales properly

### Performance Testing

- [ ] Page load time <2s
- [ ] No layout shift during hydration
- [ ] Smooth animations (60fps)
- [ ] Lighthouse score >90

### Accessibility Testing

- [ ] Keyboard navigation works for all interactive elements
- [ ] Focus indicators visible
- [ ] Screen reader announces navigation changes
- [ ] ARIA labels present where needed
- [ ] Color contrast meets WCAG AA

## Notes

### Design Decisions

**Why three-section navigation (Home/Specs/Stats)?**
- **Clear purpose**: Each section has a distinct role
  - Home = Daily operational dashboard
  - Specs = Full spec collection (list/board)
  - Stats = Project analytics
- **Avoids redundancy**: Old design had Home (list) and Board (also list), confusing
- **GitHub in navbar**: External link, doesn't need sidebar prominence

**Why move GitHub to navbar?**
- **External link**: Doesn't belong in primary navigation
- **Less prominent**: Not a primary workflow destination
- **Space efficiency**: Navbar has room, sidebar is cleaner with 3 items
- **Standard pattern**: Many apps put external links in top-right (GitHub, Twitter, etc.)

**Why two sidebars on spec detail pages?**
- **Separation of concerns**: Main nav (Home/Specs/Stats) vs Specs navigation
- **Context preservation**: Main sidebar always visible for quick navigation
- **Spec focus**: Specs nav sidebar only when needed (detail page)
- **Scalability**: Specs tree sidebar scales better as spec count grows (80+ specs)
- **Standard pattern**: Matches tools like VS Code (activity bar + file explorer)

**Why remove metadata sidebar on spec detail?**
- **Signal-to-Noise**: Metadata in sidebar duplicates info from header (violates principle)
- **Context Economy**: Reduces cognitive load by integrating metadata into header
- **Space efficiency**: Frees up horizontal space for content (more important)

**Why vertical timeline?**
- **Visual hierarchy**: Vertical flow matches natural reading pattern
- **Space efficiency**: Uses vertical space better (screens are wider than tall)
- **Scalability**: Easier to add more events as specs evolve

**Why merge Overview and README.md?**
- **No duplication**: They contain the same content (violates Signal-to-Noise)
- **Simplicity**: Reduces cognitive load (fewer tabs to understand)
- **Clarity**: "Overview" is more intuitive than "README.md" for users

### Technical Considerations

**Sidebar State Persistence:**
- Use `localStorage` to remember collapse state
- Remember expanded specs in tree
- Sync state across tabs (optional, via localStorage events)

**Routing:**
- Sub-spec routes: `/specs/[id]?subspec=DESIGN.md`
- Preserve query params when navigating
- Update breadcrumb based on current sub-spec

**Performance:**
- Virtualize specs tree if count exceeds 100
- Lazy load sub-spec content on demand
- Memoize expensive tree rendering

**Mobile Strategy:**
- Sidebar becomes slide-out drawer (overlay)
- Hamburger menu in navbar triggers drawer
- Breadcrumb remains visible on mobile

### Open Questions

- [ ] Should sidebars be resizable (drag to adjust width)?
- [ ] Do we need keyboard shortcuts for navigation (j/k for next/prev spec)?
- [ ] Should we add "recently viewed" section in specs nav sidebar or Home dashboard?
- [ ] Do we need a "favorites" system for frequently accessed specs?
- [ ] **Title field**: Should we use H1 heading (always present) or frontmatter `title` (can be null)? Recommend H1 as canonical source.
- [ ] **Home dashboard**: What other widgets would be useful? (Blocked specs, overdue specs, contributor activity, etc.)
- [ ] **Home dashboard**: Should it be customizable (user can add/remove/rearrange widgets)?

### Related Work

- **Spec 052**: Provides branding assets (logo, favicon)
- **Spec 068**: Completed initial UX implementation (foundation for this redesign)

### Future Enhancements (Post v1)

- Collaborative features (real-time presence indicators in sidebar)
- Spec bookmarks/favorites
- Drag-and-drop spec reordering
- Customizable sidebar sections
- Keyboard shortcuts panel (Cmd+K → show shortcuts)
- Multi-column layout option for ultra-wide screens
