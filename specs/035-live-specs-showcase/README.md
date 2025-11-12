---
status: in-progress
created: '2025-11-03'
tags:
  - docs
  - dogfooding
  - web
  - v0.3.0-launch
priority: high
created_at: '2025-11-03T00:00:00Z'
updated_at: '2025-11-11T15:21:48.941Z'
depends_on:
  - 067-monorepo-core-extraction
transitions:
  - status: in-progress
    at: '2025-11-11T15:21:48.941Z'
---

# LeanSpec Web: Fullstack Spec Showcase Platform

> **Status**: ⏳ In progress · **Priority**: High · **Created**: 2025-11-03 · **Tags**: docs, dogfooding, web, v0.3.0-launch

**Project**: lean-spec  
**Team**: Core Development

## Overview

Build a fullstack web application for browsing and showcasing LeanSpec specifications in rich, interactive format. The platform will support both the LeanSpec project's own specs (dogfooding) and public GitHub repositories that use LeanSpec, creating a community showcase and discovery platform.

**Core Value Props:**
1. **Interactive Spec Browser**: Beautiful, rich-formatted spec viewing experience
2. **GitHub Integration**: Automatically sync specs from public GitHub repos
3. **Community Showcase**: Discover how teams use LeanSpec in production
4. **Living Documentation**: Real-time view of project progress and specs

**Why now?** 
- We're actively using LeanSpec to build LeanSpec (dogfooding)
- Users need a low-friction way to explore specs without installing CLI
- GitHub integration enables community growth and real-world examples
- Web UI lowers adoption barrier for teams evaluating LeanSpec

## Design

### High-Level Architecture

**Three-Tier Fullstack Application:**
- **Frontend**: Next.js 14+ with React, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes with GitHub integration (Octokit)
- **Database**: PostgreSQL (production) / SQLite (dev) for caching and performance
- **Storage Strategy**: GitHub as source of truth, database as performance layer

### Key Features

**MVP (Phase 1):**
- Browse LeanSpec's own specs (dogfooding)
- Rich markdown rendering with syntax highlighting
- Kanban board view by status
- Stats dashboard with metrics
- Search and filtering

**Phase 2: GitHub Integration**
- Add public GitHub repos by URL
- Automatic sync from GitHub to database
- Multi-project support
- Scheduled sync (cron jobs)

**Phase 3: Community**
- Public project discovery
- Featured projects showcase
- Cross-project search
- Export and sharing features

**Phase 4: Advanced (Future)**
- GitHub OAuth for private repos
- Real-time sync via webhooks
- Version history and diffs
- Team collaboration features

### UI/UX Enhancement Requirements

**Professional Design System:**
- shadcn/ui component library fully integrated (Button, Card, Badge, Input, Select, Dialog, Tabs, Tooltip, Dropdown, etc.)
- Tailwind CSS v3 with consistent design tokens (v4 was causing compatibility issues with shadcn/ui)
- Lucide React icon library for visual clarity
- Refined spacing scale (4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px)
- Professional elevation system (shadow-sm, shadow-md, shadow-lg, shadow-xl)
- Typography hierarchy (font sizes, weights, line heights)
- Color refinement with better contrast ratios (WCAG AA compliance)
- Icons for all status, priority, and content types (visual identification)

**Theme Switching:**
- Dark/light theme toggle with smooth transitions
- System preference detection
- Theme persistence in localStorage
- next-themes integration
- Refined dark mode colors (less harsh blacks, better contrast)
- Theme-aware syntax highlighting for code blocks

**Navigation & Layout:**
- Sticky header with blur backdrop effect
- Active page indicators in navigation
- Breadcrumb navigation for spec pages
- Mobile-responsive hamburger menu
- Quick search modal (Cmd+K) with fuzzy search
- Footer with proper links and branding

**Spec Detail Page Enhancements:**
- **Timeline & Metadata Display:**
  - Visual timeline showing spec evolution (created → in-progress → complete)
  - Timestamp display with relative time ("2 days ago")
  - Status transitions history with icons
  - Time-to-completion metrics
  - Assignee display with avatar
  - Icons for all metadata fields (status, priority, tags, etc.)
- **Sub-Spec Navigation & Display:**
  - Automatic detection of sub-spec files (DESIGN.md, IMPLEMENTATION.md, etc.)
  - Tab-based navigation for main spec + sub-specs with icons
  - Sidebar navigation with sub-spec links
  - Sub-spec table of contents
  - Proper layout for each sub-spec type
  - Breadcrumb showing current sub-spec location
  - Visual indicators for sub-spec relationships
  - Color-coded icons for different sub-spec types
  - Visual indicators for sub-spec relationships
  
- **Reading Experience:**
  - Sticky table of contents sidebar
  - Scroll spy with active section highlighting
  - Smooth scroll to anchors
  - Read time estimation
  - Progress indicator (% of page read)
  - Font size controls
  - Print-friendly view

**Interactive Components:**
- Smooth transitions (150-200ms ease-in-out)
- Hover states with subtle scale transforms
- Loading skeletons for async data
- Empty states with helpful messaging
- Error boundaries with recovery actions
- Toast notifications for actions
- Pagination or infinite scroll for long lists
**Stats Dashboard:**
- Cards with gradient backgrounds and icons
- Mini sparkline charts showing trends
- Trend indicators (↑ ↓ with percentages)
- Interactive hover tooltips
- Responsive grid layout
- Color-coded icons (FileText, CheckCircle, PlayCircle, Clock)tips
- Responsive grid layout

**Specs Browser:**
- Toggle between table/grid/kanban views
- Advanced filtering sidebar (collapsible)
- Tag-based filtering with counts
- Status and priority filters
- Date range picker for timeline filtering
- Sort options (date, priority, status, name)
**Kanban Board:**
- Color-coded column headers by status
- Card priority indicators (left border colors)
- Quick actions on card hover (view, edit status)
- Drag-and-drop support (future)
- Compact/expanded card view toggle
- Column collapse/expand functionality
- Horizontal scroll on mobile
- Status icons for visual clarity (Clock, PlayCircle, CheckCircle, Archive)toggle
- Column collapse/expand functionality
- Horizontal scroll on mobile

**Accessibility:**
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader optimized
- Focus indicators
- Skip links
- Alt text for all images
- Proper heading hierarchy
- Color contrast validation

**Performance:**
- Code splitting per route
- Image optimization (Next.js Image)
- Lazy loading for heavy components
- Virtual scrolling for long lists
- Suspense boundaries
- Streaming server components
- Optimistic UI updates

### Sub-Specifications

This spec is split into detailed sub-specs for maintainability:

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technology stack, database schema, API design, caching strategy
- **[UI-UX-DESIGN.md](./UI-UX-DESIGN.md)** - Comprehensive UI/UX design system, theme switching, navigation, accessibility
- **[GITHUB-INTEGRATION.md](./GITHUB-INTEGRATION.md)** - GitHub sync mechanism, rate limiting, error handling
- **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** - Phased implementation plan with timelines
- **[TASKS.md](./TASKS.md)** - Detailed task-by-task breakdown with code examples (reference document)

**See sub-specs for complete technical details.**

## Progress

**Current Status**: Phase 1 ~40% Complete (revised 2025-11-13 after realistic assessment)

**Reality Check (2025-11-13)**: Previous 70% estimate was overly optimistic. While foundational work is solid, many core pages and features are incomplete or have significant UX issues.

**✅ Major UI/UX Improvements Completed (2025-11-12)**:

### Icon System Integration ✅
- ✅ Lucide React icons integrated throughout the application
- ✅ Status icons: Clock (planned), PlayCircle (in-progress), CheckCircle (complete), Archive (archived)
- ✅ Priority icons: AlertCircle (critical), ArrowUp (high), Minus (medium), ArrowDown (low)
- ✅ Navigation icons enhanced (Home, LayoutGrid, Github)
- ✅ Action icons: Search for filters

### Visual Design System ✅
- ✅ Color-coded Kanban columns with status-specific colors and icons
- ✅ Priority indicators with colored left borders on Kanban cards
- ✅ Stats cards enhanced with:
  - Gradient backgrounds (blue/green/orange based on type)
  - Icons for each stat (FileText, CheckCircle, PlayCircle, Clock)
  - Completion rate percentage display
- ✅ Professional elevation system implemented (hover shadows, transitions)
- ✅ Refined spacing scale applied consistently
- ✅ Smooth transitions (150ms ease-in-out) on all interactive elements

### Component Library ✅
- ✅ Replaced HTML `<select>` with shadcn/ui Select component
- ✅ Added @radix-ui/react-select dependency
- ✅ StatusBadge and PriorityBadge components using icons
- ✅ Consistent component usage across all pages

### Sub-Spec Navigation System ✅
- ✅ Created sub-spec detection system (detectSubSpecs utility)
- ✅ Tab-based navigation component (SubSpecTabs)
- ✅ Automatic detection of sub-spec files (DESIGN.md, IMPLEMENTATION.md, ARCHITECTURE.md, etc.)
- ✅ Icon-coded tabs with color indicators
- ✅ Integrated into spec detail page

### Timeline Enhancement ✅
- ✅ Enhanced timeline with status-specific icons
- ✅ Larger icon circles (10x10) with proper hover states
- ✅ Relative time display already present ("2 days ago")
- ✅ Color-coded timeline events (orange/blue/green/gray)
- ✅ Current status highlighted with stronger visual emphasis

### Design Polish ✅
- ✅ Blur backdrop effect on sticky header (already present)
- ✅ Smooth transitions added globally via CSS
- ✅ Enhanced hover effects with scale transforms on Kanban cards
- ✅ Better empty states with icons on Kanban board
- ✅ Color-coded Kanban column headers with gradient backgrounds

### Previously Completed
- ✅ Next.js 16 project initialized with TypeScript, Tailwind CSS
- ✅ SQLite database with Drizzle ORM fully configured
- ✅ Database schema created (projects, specs, spec_relationships, sync_logs)
- ✅ Migrations generated and applied
- ✅ Core database queries implemented (`queries.ts`)
- ✅ API routes: `/api/specs/[id]`, `/api/projects`, `/api/stats`, `/api/projects/[id]/specs`
- ✅ Home page with stats dashboard and specs table
- ✅ Spec detail page with rich markdown rendering
- ✅ Syntax highlighting (highlight.js) + GitHub-flavored markdown (remarkGfm)
- ✅ Database seeded with 32 LeanSpec specs
- ✅ Responsive layout with status/priority badges
- ✅ Theme switching with next-themes (basic implementation)
- ✅ Basic navigation with sticky header
- ✅ Kanban board page (basic implementation)
- ✅ Breadcrumb navigation (basic implementation)
- ✅ Timeline component (basic implementation)

### 🚧 Critical Issues & Missing Features (2025-11-13)

**Major UX/UI Problems - Must Fix:**
- [ ] **Color Scheme Issue** - Planned (orange) and In-Progress (blue) colors are backwards - swap them
- [ ] **Stats Page Incomplete** - Major page with missing/incomplete sections
- [ ] **Spec Detail Page - No Sidebar for Spec Navigation** - Missing sidebar to quickly switch between different specs (not TOC)
- [ ] **Sub-Spec Navigation Poor Design** - Current tab design doesn't make sense, needs complete redesign
- [ ] **Spec Detail - No Sticky Left Info** - Metadata/info area should be sticky on left side
- [ ] **Spec Detail - No Sticky Header** - Header should stick on scroll for navigation
- [ ] **Spec Detail - Poor Frontmatter Display** - Frontmatter metadata display is very bad, needs redesign
- [ ] **Missing Logo & Favicon** - No logo beside "LeanSpec" in top left header, no favicon for browser tab
- [ ] **Dark Theme Typography Issues** - Bold text (e.g., "Recent Improvements (2025-11-05):") has wrong color in dark theme
- [ ] **Dark Theme Strong Tags** - Similar color issues with `<strong>` elements throughout

**High Priority - Still Needed:**
- [ ] **Quick Search Modal (Cmd+K)** - Fuzzy search with keyboard shortcuts
- [ ] **Loading Skeletons** - Add Suspense boundaries and skeleton loaders for async content
- [ ] **Enhanced Empty States** - More helpful messaging with actions (currently basic)
- [ ] **Toast Notifications** - System for user feedback (create/update/delete actions)

**Core Functionality:**
- [ ] Advanced search and filtering functionality (beyond basic filters)
- [ ] Error boundaries and error pages (404, 500) - currently basic
- [ ] Unit tests for database queries
- [ ] Integration tests for API routes
- [ ] Update README with proper documentation

**Accessibility & Performance:**
- [ ] WCAG AA compliance audit and fixes
- [ ] Keyboard navigation testing (Cmd+K support)
- [ ] Mobile responsive refinements
- [ ] Performance optimization (code splitting, lazy loading)

**Deployment:**
- [ ] Deploy MVP to Vercel

## Plan

### Phase 1: Foundation & MVP (2-3 weeks) - ~70% Complete
- [x] Initialize Next.js project with TypeScript, Tailwind, shadcn/ui
- [x] Setup database (Drizzle + PostgreSQL/SQLite)
- [x] Create schema and migrations
- [x] Build core API routes (projects, specs, stats, sync)
- [x] Implement frontend pages (home, browser, detail, board, stats) - *partial: missing board*
- [x] Rich markdown rendering with syntax highlighting
- [x] Seed with LeanSpec's own specs
- [ ] Deploy MVP to Vercel

### Phase 2: GitHub Integration (2-3 weeks) - Not Started
- [ ] GitHub API client with Octokit
- [ ] Repo validation and spec discovery
- [ ] Sync orchestrator (fetch, parse, store)
- [ ] Add project UI and API
- [ ] Multi-project support
- [ ] Scheduled sync (cron jobs)
- [ ] Error handling and logging

### Phase 3: Community & Discovery (2-3 weeks) - Not Started
- [ ] Public project explorer
- [ ] Full-text search across projects
- [ ] Spec relationship visualization
- [ ] Advanced statistics and metrics
- [ ] Export to PDF
- [ ] Performance optimization (caching, SEO)

### Phase 4: Advanced Features (Future) - Not Started
- [ ] GitHub OAuth for private repos
- [ ] Real-time webhooks
- [ ] Version history and diffs
- [ ] Team collaboration
- [ ] Analytics dashboard
- [ ] Public API

**See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for detailed task breakdown.**

## Test

### Unit Tests
- [ ] Database queries and mutations
- [ ] GitHub API client functions
- [ ] Spec parser (frontmatter + markdown)
- [ ] Utility functions

### Integration Tests
- [ ] API routes with test database
- [ ] Full GitHub sync flow (mocked)
- [ ] Database migrations
- [ ] Spec relationship resolution

### E2E Tests (Playwright)
- [ ] Browse and search specs
- [ ] Spec detail page rendering
- [ ] Add project flow
- [ ] Kanban board interaction
- [ ] Mobile responsiveness
- [ ] Cross-browser compatibility

### Performance Tests
- [ ] Page load times < 2s
- [ ] Database queries < 100ms
- [ ] Sync completion time for typical repo
- [ ] Concurrent user load testing

### Accessibility
- [ ] WCAG 2.1 AA compliance
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] Color contrast

## Notes

### Implementation Details

**Database:**
- SQLite (331KB) with 32 seeded specs from LeanSpec project
- Tables: `projects`, `specs`, `spec_relationships`, `sync_logs`
- Drizzle ORM with full relations and cascading deletes
- Migration: `drizzle/0000_reflective_thena.sql`

**Technology Stack:**
- Next.js 16.0.1 with App Router
- React 19.2.0 with Server Components
- Drizzle ORM 0.38.3 with better-sqlite3
- react-markdown 9.0.2 + rehype-highlight + remark-gfm
- Tailwind CSS v3 (downgraded from v4 for shadcn/ui compatibility)

**Package Location:** `packages/web/` (monorepo structure)

### Known Issues

1. **Dependencies** - Need `pnpm install` in packages/web before running
2. **No Error Handling** - Missing try/catch blocks, error boundaries, error pages
3. **No Tests** - Zero test coverage currently
4. **README Outdated** - Still contains Next.js boilerplate

### UI/UX Implementation Progress (Updated 2025-11-12)

**✅ MAJOR IMPROVEMENTS COMPLETED**: Addressed critical UI/UX gaps identified in earlier audit.

**What Was Improved:**

1. **Icon System Integration** ✅
   - Integrated Lucide React icons throughout (Status, Priority, Navigation, Actions)
   - Status icons: Clock, PlayCircle, CheckCircle2, Archive
   - Priority icons: AlertCircle, ArrowUp, Minus, ArrowDown
   - Visual identification greatly improved

2. **Visual Design System** ✅
   - Color-coded Kanban columns with status-specific backgrounds and borders
   - Priority indicators with colored left borders on Kanban cards (red/orange/blue/gray)
   - Stats cards enhanced with gradient backgrounds and icons
   - Professional elevation system with proper shadows and hover effects
   - Smooth transitions (150ms ease-in-out) applied globally

3. **Component Library Completion** ✅
   - Replaced HTML `<select>` with shadcn/ui Select component
   - Added @radix-ui/react-select dependency
   - StatusBadge and PriorityBadge components now use icons
   - Consistent component usage across all pages

4. **Sub-Spec Navigation System** ✅
   - Created detectSubSpecs utility for automatic sub-spec file detection
   - Built SubSpecTabs component with icon-coded tabs
   - Integrated into spec detail page
   - Supports DESIGN.md, IMPLEMENTATION.md, ARCHITECTURE.md, TESTING.md, etc.

5. **Timeline Enhancement** ✅
   - Enhanced with status-specific icons in circular containers
   - Color-coded events (orange/blue/green/gray)
   - Relative time display already present ("2 days ago")
   - Current status highlighted with stronger visual emphasis

6. **Design Polish** ✅
   - Blur backdrop on sticky header (already present, confirmed working)
   - Smooth transitions added globally via CSS
   - Enhanced hover effects with scale transforms
   - Better empty states with icons on Kanban board
   - Improved spacing and typography throughout

**Current State**: Professional UI/UX that matches spec requirements. Phase 1 MVP now ~70% complete (up from ~40-50%).

**Remaining Work**: Quick search (Cmd+K), loading skeletons, toast notifications, testing, deployment.

### Next Immediate Steps (Updated 2025-11-13)

**Priority 0: Fix Critical UX Issues (3-5 days) - MUST DO FIRST**
1. **Swap Planned/In-Progress Colors** - Orange should be in-progress, blue should be planned
2. **Fix Dark Theme Typography** - Bold/strong text colors in dark mode
3. **Complete Stats Page** - Fill in missing sections and features
4. **Redesign Spec Detail Page**:
   - Add sidebar for quick navigation between different specs (not a TOC)
   - Add sticky left sidebar with metadata + info
   - Add sticky header for navigation
   - Completely redesign frontmatter display (current is very bad)
5. **Redesign Sub-Spec Navigation** - Current design doesn't make sense, needs better UX

**Priority 1: Remaining Features (2-3 days)**
6. **Quick Search Modal (Cmd+K)** - Implement keyboard-triggered search with fuzzy matching
7. **Loading States** - Add Suspense boundaries and skeleton components
8. **Enhanced Empty States** - Better messaging with icons and helpful actions
9. **Toast Notifications** - User feedback system for actions

**Priority 2: Testing & Quality (1-2 days)**
10. **Error Handling** - Proper error boundaries, 404/500 pages with good design
11. **Accessibility Audit** - WCAG AA compliance check, keyboard navigation
12. **Mobile Testing** - Test on real devices, polish responsive behavior
13. **Unit Tests** - Basic coverage for queries and critical paths

**Priority 3: Documentation & Deployment (1 day)**
14. **README Update** - Replace boilerplate with actual project docs
15. **Deploy to Vercel** - Production deployment with environment variables

**Estimated time to complete Phase 1**: 2-3 weeks (revised from 4-6 days based on realistic assessment)

**Definition of Done for Phase 1:**
- ✅ Icon system throughout (ACHIEVED 2025-11-12)
- ✅ Timeline with icons and relative time (ACHIEVED 2025-11-12)
- ✅ Blur backdrop and smooth transitions (ACHIEVED 2025-11-12)
- ❌ Professional UI/UX matching spec requirements - NEEDS MAJOR FIXES (color swap, spec detail redesign, stats completion)
- ❌ Color-coded status/priority - WRONG COLORS (planned/in-progress swapped)
- ❌ Sub-spec navigation working - POOR DESIGN, needs complete rework
- ❌ Spec detail page design - MISSING sticky sidebar, sticky header, proper frontmatter display
- ❌ Dark theme typography - Bold/strong text has wrong colors
- ⏳ Quick search (Cmd+K) - TODO
- ⏳ Loading states everywhere - TODO
- ⏳ No major accessibility issues - TESTING NEEDED
- ⏳ Basic test coverage (>50%) - TODO
- ⏳ Deployed and viewable - TODO
- ⏳ README documentation complete - TODO

### Technical Decisions

**Why Next.js?**
- Unified full-stack framework (frontend + API)
- Excellent DX, performance, Vercel integration
- Server components and streaming
- Built-in optimizations

**Why PostgreSQL + SQLite?**
- Structured relational data (projects, specs, relationships)
- Complex queries with joins and full-text search
- PostgreSQL for production, SQLite for dev parity

**Why Database + GitHub Dual Storage?**
- **GitHub**: Source of truth (reliable, versioned, authoritative)
- **Database**: Performance layer (fast queries, search, caching)
- Best of both: Reliability + Speed + Decoupling from API limits

**Why Tailwind CSS v3 instead of v4?**
- **Decision made**: 2025-11-13 - Downgrade from v4 to v3
- **Reason**: Tailwind v4 is still in beta/alpha and causing compatibility issues with shadcn/ui
- **Impact**: shadcn/ui components are designed for Tailwind v3, using v4 breaks styling
- **Trade-off**: Lose latest features (native CSS variables, improved performance) but gain stability
- **Migration path**: Can upgrade to v4 once it's stable and shadcn/ui officially supports it
- **Current state**: Using Tailwind CSS v3.4.x with PostCSS configuration

**Caching Strategy:**
- Database caches parsed specs (primary cache)
- React Query caches API responses client-side
- Redis optional for GitHub API rate limit optimization
- Stale-while-revalidate pattern

### Security Considerations

- [ ] Validate and sanitize GitHub URLs (prevent SSRF)
- [ ] Sanitize markdown content (prevent XSS)
- [ ] Rate limit API endpoints (prevent abuse)
- [ ] CORS configuration
- [ ] Environment variables for secrets
- [ ] Database connection pooling limits

### Open Questions

- **Private repos?** → Phase 4 with OAuth
- **Sync frequency?** → Daily for featured, weekly for others
- **Edit specs via web?** → No, GitHub is source of truth (view-only)
- **Full-text search?** → PostgreSQL FTS for MVP, Algolia if needed
- **Show archived specs?** → Yes, but collapsed/hidden by default
- **Monetization?** → Free for public repos, premium for private/teams (future)

### Related Specs

- **spec 010**: Documentation website (integration point)
- **spec 059**: Programmatic spec management (API design overlap)
- **spec 065**: v0.3.0 planning (this is key deliverable)

### Content Strategy

**Launch Narrative:**
1. Hero: "See how LeanSpec builds LeanSpec"
2. Showcase: Live view of our specs
3. Community: "Add your project" CTA
4. Examples: Featured projects using LeanSpec

**SEO Keywords:**
- Specification management
- Agile documentation
- Lightweight specs
- AI-powered development
- Living documentation

### Future Enhancements

- Upvote/favorite projects
- Comments and discussions
- Spec templates marketplace
- Issue tracker integrations
- AI-generated summaries
- Semantic search
- Quality scoring

### Inspiration

- **Linear**: Public roadmap, clean design
- **Stripe Docs**: API reference, search
- **Tailwind**: Visual showcase
- **Vercel**: Deployment UX
- **GitHub**: Repo browser, file viewer

---

**For detailed information, see:**
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture and database design
- [GITHUB-INTEGRATION.md](./GITHUB-INTEGRATION.md) - GitHub sync strategy and implementation
- [IMPLEMENTATION.md](./IMPLEMENTATION.md) - Phased implementation plan with timelines
