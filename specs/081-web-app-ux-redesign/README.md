---
status: planned
created: '2025-11-14'
tags:
  - web
  - ux
  - design
  - enhancement
priority: high
created_at: '2025-11-14T03:21:43.076Z'
depends_on:
  - '068'
related:
  - 052-branding-assets
  - 068-live-specs-ux-enhancements
---

# Web App UX/UI Comprehensive Redesign

> **Status**: 📅 Planned · **Priority**: High · **Created**: 2025-11-14

**Project**: lean-spec  
**Team**: Core Development  
**Dependencies**: Spec 068 (live-specs-ux-enhancements)  
**Related**: Spec 052 (branding-assets)

## Overview

Comprehensive UX/UI redesign for the LeanSpec Web application (`@leanspec/web`) addressing critical layout, navigation, branding, and usability issues. This spec consolidates feedback from initial user testing and aims to create a professional, intuitive interface that aligns with LeanSpec's core principles.

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
- **Left sidebar navigation** for all pages (specs list tree with sub-specs)
- **Compact top navbar** with logo, breadcrumbs, search, and theme toggle
- **Full-width content** without artificial constraints
- **Integrated metadata** in spec header (no separate sidebar)
- **Vertical timeline** design with better visual hierarchy
- **Unified List/Board experience** with consistent navigation

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

```
┌─────────────────────────────────────────────────────┐
│ Top Navbar (sticky, h-14)                          │
│ [Logo] [Breadcrumb...] [Search] [Theme] [GitHub]   │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│ Left     │ Main Content Area                        │
│ Sidebar  │ (full width, no max constraints)         │
│ (sticky) │                                          │
│          │                                          │
│ • Home   │                                          │
│ • Board  │                                          │
│ • Stats  │                                          │
│ ────     │                                          │
│ Specs:   │                                          │
│ ▼ 080-x  │                                          │
│   • Over │                                          │
│   • IMPL │                                          │
│ ▼ 079-y  │                                          │
│ ...      │                                          │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

**Implementation Details:**

**Top Navbar Changes:**
- Remove horizontal nav items (Home, Board, Stats, GitHub)
- Move breadcrumb from spec detail page to navbar (always visible)
- Keep search and theme toggle at right edge
- Logo on left, breadcrumb next to it
- Height: 56px (h-14)

**Left Sidebar (New):**
- Width: 280px (expandable), collapsible to 60px
- Sticky positioning (top: 56px, height: calc(100vh - 56px))
- Sections:
  1. **Navigation** (Home, Board, Stats, GitHub)
  2. **Separator**
  3. **Specs Tree** (all specs with expand/collapse)
- Current page highlighted
- Specs sorted by ID descending (newest first)
- Sub-specs shown as indented tree items under parent

**Component Structure:**
```tsx
// New: src/components/global-sidebar.tsx
export function GlobalSidebar({ specs, currentPath }: Props) {
  return (
    <aside className="sticky top-14 h-[calc(100vh-3.5rem)] w-[280px] border-r">
      {/* Navigation Section */}
      <nav className="p-4 space-y-1">
        <SidebarLink href="/" icon={Home}>Home</SidebarLink>
        <SidebarLink href="/board" icon={LayoutGrid}>Board</SidebarLink>
        <SidebarLink href="/stats" icon={BarChart3}>Stats</SidebarLink>
        <SidebarLink href="https://..." external icon={Github}>GitHub</SidebarLink>
      </nav>
      
      <Separator />
      
      {/* Specs Section */}
      <div className="p-4">
        <h3 className="text-sm font-semibold mb-2">Specifications</h3>
        <SpecsTree specs={specs} currentPath={currentPath} />
      </div>
    </aside>
  );
}
```

### 3. Spec Detail Page Redesign

**Current Issues:**
- Metadata sidebar duplicates info from header
- Content has max-width constraint (artificially narrow on wide screens)
- Timeline is horizontal (poor use of space)
- Title area and info box separated
- "Back to Specs" button redundant (sidebar navigation exists)

**New Design:**

```
┌─────────────────────────────────────────────────────┐
│ Top Navbar with Breadcrumb                          │
├──────────┬──────────────────────────────────────────┤
│ Sidebar  │ Spec Header (sticky, compact)            │
│ (with    │ ┌──────────────────────────────────────┐ │
│ sub-spec │ │ #080 Title                           │ │
│ tree)    │ │ [Status] [Priority] [Tags...] [↓Edit]│ │
│          │ │ Created: X | Updated: Y | Name: Z    │ │
│          │ └──────────────────────────────────────┘ │
│          │                                          │
│          │ Content (full-width, no max constraint) │
│          │ ┌──────────────────────────────────────┐ │
│          │ │                                      │ │
│          │ │  Markdown content with timeline      │ │
│          │ │  embedded at natural position        │ │
│          │ │                                      │ │
│          │ │  ◉ Created (date)                    │ │
│          │ │  │                                    │ │
│          │ │  ◉ In Progress (date)                │ │
│          │ │  │                                    │ │
│          │ │  ○ Complete                           │ │
│          │ │                                      │ │
│          │ └──────────────────────────────────────┘ │
└──────────┴──────────────────────────────────────────┘
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

### 5. Spec List (Home Page) Improvements

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

### 6. Board and List Integration

**Current Issue**: Clicking board card goes directly to spec detail, feels disconnected from List page

**Solution**: Unified experience with consistent navigation

**Board Card Behavior:**
- Click card → Navigate to spec detail (keep current behavior)
- Add "View in List" link/icon on card hover
- Breadcrumb on detail page shows: Home → Board → Spec (if came from board)
- Add "Back to Board" in sidebar when navigating from board context

**Visual Connection:**
- Board and List should share same spec card component (different layouts)
- Consistent status/priority indicators
- Consistent hover states and interactions

### 7. Display `title` vs `name`

**Current Issue**: Spec 014 uses `name` field internally, but displays `title` to users

**Fix:**
- Always display `title` field as main heading
- Show `name` (spec folder name) as metadata field
- Metadata row: `Name: complete-custom-frontmatter`
- Keep `title` editable via frontmatter
- Use `name` for URLs and internal references only

### 8. Sub-Spec Icons

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
- [ ] Copy logo assets from spec 052 to `packages/web/public/`
- [ ] Update favicon references in `layout.tsx`
- [ ] Implement theme-aware logo switching in navbar
- [ ] Test logo rendering in light/dark modes

**Day 3-5: Global Sidebar Implementation**
- [ ] Create `GlobalSidebar` component
- [ ] Implement navigation section (Home, Board, Stats, GitHub)
- [ ] Build collapsible specs tree with expand/collapse
- [ ] Add search/filter within sidebar
- [ ] Integrate sidebar into `layout.tsx`

**Day 6-7: Top Navbar Redesign**
- [ ] Remove horizontal nav items from navbar
- [ ] Move breadcrumb to navbar (next to logo)
- [ ] Reposition search and theme toggle to right edge
- [ ] Add GitHub link to sidebar instead of navbar
- [ ] Test responsive behavior (mobile collapse)

### Phase 2: Spec Detail Redesign (Week 2)

**Day 8-9: Compact Header**
- [ ] Redesign spec header with integrated metadata
- [ ] Remove "Back to Specs" button
- [ ] Add small metadata row (created, updated, name)
- [ ] Make header sticky with proper z-index
- [ ] Display `title` prominently, `name` as metadata

**Day 10-11: Content Layout**
- [ ] Remove max-width constraint on content
- [ ] Remove left metadata sidebar entirely
- [ ] Implement full-width single-column layout
- [ ] Ensure proper responsive behavior

**Day 12-13: Sub-Spec Integration**
- [ ] Move sub-specs from tabs to sidebar tree
- [ ] Implement sub-spec icon mapping system
- [ ] Add expand/collapse for specs with sub-specs
- [ ] Merge "Overview" and "README.md" (no duplication)
- [ ] Fix sub-spec navigation routing

**Day 14: Timeline Redesign**
- [ ] Implement vertical timeline component
- [ ] Embed timeline in content area (not sidebar)
- [ ] Add proper icons and visual states
- [ ] Test with different status transitions

### Phase 3: List/Board Improvements (Week 3)

**Day 15-16: Spec List Enhancements**
- [ ] Add sorting controls (ID desc, ID asc, updated, title)
- [ ] Set default sort to ID descending
- [ ] Implement table view option (toggle with card view)
- [ ] Ensure sorting persists in URL params

**Day 17-18: Board Integration**
- [ ] Maintain current board card → spec detail behavior
- [ ] Add breadcrumb context (Board → Spec)
- [ ] Share spec card component between List and Board
- [ ] Test navigation flow consistency

**Day 19-21: Polish & Testing**
- [ ] Fix any navigation routing issues
- [ ] Ensure all links work correctly
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
- [ ] Logo displays correctly in navbar (light mode)
- [ ] Logo switches to dark variant in dark mode
- [ ] Favicon appears in browser tabs
- [ ] All icon sizes render correctly

**Layout:**
- [ ] Global sidebar appears on all pages
- [ ] Sidebar is sticky and doesn't scroll with content
- [ ] Sidebar collapsible function works
- [ ] Top navbar breadcrumb updates correctly on navigation
- [ ] Search and theme toggle positioned at right edge

**Spec Detail:**
- [ ] Spec header shows all metadata in compact format
- [ ] Title displays correctly (`title` field, not `name`)
- [ ] Name field shown in metadata row
- [ ] Content uses full width (no artificial constraints)
- [ ] Timeline renders vertically with correct states
- [ ] Sub-specs appear in sidebar tree (not tabs)
- [ ] Sub-spec navigation works (no 404 errors)
- [ ] Overview and README.md merged (no duplication)

**Spec List:**
- [ ] Specs sorted by ID descending by default
- [ ] Sort controls change order correctly
- [ ] Table view displays properly
- [ ] Filters work in conjunction with sorting

**Board:**
- [ ] Card click navigates to spec detail
- [ ] Breadcrumb shows Board context
- [ ] Navigation back to board works

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

**Why move navigation to sidebar?**
- **Horizontal space**: Top navbar wastes precious horizontal space on wide screens
- **Scalability**: Sidebar scales better as spec count grows (current 80+ specs)
- **Context**: Always-visible spec tree provides better context while navigating
- **Standard pattern**: Matches user expectations from tools like Notion, Linear, GitHub

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

- [ ] Should sidebar be resizable (drag to adjust width)?
- [ ] Do we need keyboard shortcuts for navigation (j/k for next/prev spec)?
- [ ] Should we add "recently viewed" section in sidebar?
- [ ] Do we need a "favorites" system for frequently accessed specs?

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
