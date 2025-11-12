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
- Tailwind CSS v4 with consistent design tokens
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

**Current Status**: Phase 1 ~40-50% Complete (revised 2025-11-12 after quality audit)

**⚠️ QUALITY ISSUES IDENTIFIED**: Initial 70% completion estimate was inaccurate. Deliverable quality falls significantly short of spec requirements, particularly in UI/UX design system, visual polish, and user experience enhancements. See "Quality Audit Issues" section below.

### ✅ Completed
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

### 🚧 In Progress / Remaining for Phase 1

**Critical UI/UX Gaps (High Priority):**
- [ ] **Icon System Integration** - Add Lucide React icons throughout (status, priority, navigation, metadata)
- [ ] **Visual Design Polish** - Implement professional design system per spec requirements:
  - [ ] Color-coded Kanban columns with status-specific colors
  - [ ] Priority indicators (colored left borders on cards)
  - [ ] Stats cards with gradient backgrounds and icons
  - [ ] Refined spacing and elevation system
  - [ ] Smooth transitions and hover effects
  - [ ] Professional typography hierarchy
- [ ] **Sub-Spec Navigation** - Critical missing feature:
  - [ ] Automatic detection of sub-spec files (DESIGN.md, IMPLEMENTATION.md, etc.)
  - [ ] Tab-based or sidebar navigation for sub-specs
  - [ ] Proper layout for different sub-spec types
  - [ ] Visual indicators and breadcrumbs
- [ ] **Component Library Completion** - Replace basic HTML with shadcn/ui:
  - [ ] Replace `<select>` with shadcn/ui Select component
  - [ ] Add missing components: Dialog, Tabs, Tooltip, Dropdown
  - [ ] Implement loading skeletons with Suspense
- [ ] **Interactive Enhancements**:
  - [ ] Quick search modal (Cmd+K) with fuzzy search
  - [ ] Blur backdrop effect on sticky header
  - [ ] Toast notifications for actions
  - [ ] Enhanced empty states with helpful messaging
  - [ ] Scroll spy and progress indicators on spec pages
- [ ] **Timeline & Metadata Enhancement**:
  - [ ] Visual timeline showing spec evolution (not just basic circles)
  - [ ] Relative time display ("2 days ago")
  - [ ] Status transitions history with icons
  - [ ] Assignee display with avatars

**Core Functionality:**
- [ ] Advanced search and filtering functionality
- [ ] Error boundaries and error pages (404, 500)
- [ ] Unit tests for database queries
- [ ] Integration tests for API routes
- [ ] Update README with proper documentation

**Accessibility & Performance:**
- [ ] WCAG AA compliance audit and fixes
- [ ] Keyboard navigation testing
- [ ] Loading states and skeleton loaders
- [ ] Mobile responsive refinements

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
- Tailwind CSS 4 (shadcn/ui integration pending)

**Package Location:** `packages/web/` (monorepo structure)

### Known Issues

1. **Dependencies** - Need `pnpm install` in packages/web before running
2. **No Error Handling** - Missing try/catch blocks, error boundaries, error pages
3. **No Tests** - Zero test coverage currently
4. **README Outdated** - Still contains Next.js boilerplate

### Quality Audit Issues (2025-11-12)

**⚠️ Deliverable quality falls significantly short of spec requirements. Current implementation is ~40-50% complete, not 70%.**

**Critical Problems Identified:**

**1. Visual Design - Looks Like Early Prototype**
- Stats cards are plain with no icons, gradients, or visual hierarchy
- Kanban board lacks color-coded columns (spec requirement violated)
- No priority visual indicators (colored left borders on cards)
- Tables are functional but bland with no visual polish
- Poor spacing and elevation system implementation
- Minimal hover effects and transitions

**2. Missing Icon System**
- Spec requires Lucide React icons throughout (status, priority, navigation, metadata)
- Current: Only 3 icons in navigation (Home, LayoutGrid, Github)
- Missing: Status icons (Clock, PlayCircle, CheckCircle, Archive)
- Missing: Priority icons, metadata icons, action icons
- Impact: Visual identification and professional appearance severely compromised

**3. Sub-Spec Navigation - Critical Feature Missing**
- Spec requires tab-based or sidebar navigation for sub-specs (DESIGN.md, IMPLEMENTATION.md, etc.)
- Current: No sub-spec detection or navigation at all
- Impact: Can't browse detailed sub-specifications, major UX gap

**4. Component Library Incomplete**
- Using basic HTML `<select>` instead of shadcn/ui Select
- Missing: Dialog, Tabs, Tooltip, Dropdown components
- Many shadcn/ui components not integrated despite being listed as requirement
- Impact: Inconsistent UI, poor accessibility, unprofessional appearance

**5. Interactive Elements Lacking**
- No quick search modal (Cmd+K) - spec requirement
- No blur backdrop on sticky header
- No loading skeletons or Suspense boundaries
- Empty states are too minimal without helpful messaging
- No toast notifications system

**6. Timeline & Metadata Issues**
- Timeline exists but poorly designed (basic circles and text)
- No relative time display ("2 days ago")
- No status transitions history visualization
- No assignee avatars
- Metadata sidebar is cramped and poorly organized

**7. Theme Implementation Incomplete**
- Theme toggle exists but visual refinement lacking
- Dark mode colors not polished (spec requires "less harsh blacks, better contrast")
- No theme-aware syntax highlighting optimization

**Evidence**: Screenshots show bland, generic interface that doesn't match the "professional design system" detailed in spec requirements. Compare current state to spec's UI-UX-DESIGN.md for full requirements list.

**Root Cause**: Implementation focused on basic functionality without investing in the extensive UI/UX polish and design system integration that the spec explicitly requires. The spec's "UI/UX Enhancement Requirements" section was largely ignored.

**Recommendation**: Re-prioritize visual design and UX polish before claiming Phase 1 MVP complete. Current state is not ready for public showcase or deployment.

### Next Immediate Steps (Revised 2025-11-12)

**These steps must be completed before claiming Phase 1 MVP is done.**

**Priority 1: Visual Design System (3-4 days) - CRITICAL**
1. **Icon System** - Integrate Lucide React icons throughout:
   - Status icons: Clock (planned), PlayCircle (in-progress), CheckCircle (complete), Archive (archived)
   - Priority icons: AlertCircle (critical), ArrowUp (high), Minus (medium), ArrowDown (low)
   - Navigation icons: enhance existing
   - Metadata icons: User (assignee), Calendar (dates), Tag (tags), Link (dependencies)
   - Action icons: Filter, Sort, Search, ExternalLink, etc.
2. **Color System** - Implement status-specific color coding:
   - Kanban columns with status colors (blue for in-progress, green for complete, orange for planned, gray for archived)
   - Priority indicators (red for critical, orange for high, blue for medium, gray for low)
   - Colored left borders on Kanban cards matching priority
3. **Stats Dashboard Polish**:
   - Add gradient backgrounds to stat cards
   - Add icons to each stat (FileText, CheckCircle, PlayCircle, Clock)
   - Add trend indicators (↑ ↓ with percentages) - mock data acceptable
   - Implement mini sparkline charts (optional, but spec requires consideration)
4. **Component Library** - Replace all basic HTML with shadcn/ui:
   - Replace `<select>` with Select component
   - Add Dialog, Tabs, Tooltip components where appropriate
   - Ensure consistent component usage across all pages
5. **Design Polish**:
   - Implement refined spacing scale (consistent 4px/8px/12px/16px/24px/32px grid)
   - Add professional elevation system (shadow-sm to shadow-xl)
   - Typography hierarchy (h1-h6, body, caption with proper weights)
   - Smooth transitions (150-200ms) on all interactive elements
   - Hover effects with subtle transforms

**Priority 2: Sub-Spec Navigation & UX (2-3 days) - CRITICAL**
6. **Sub-Spec System** - Build the missing feature:
   - Automatic detection of sub-spec files in spec directory
   - Tab-based navigation on spec detail page (Main + sub-specs)
   - Or sidebar navigation with collapsible sub-spec links
   - Proper rendering of each sub-spec type
   - Visual indicators showing you're in a sub-spec
7. **Timeline Enhancement**:
   - Redesign timeline component with better visual design
   - Add relative time ("2 days ago", "3 weeks ago")
   - Show status transitions history if available in data
   - Add icons to timeline events
8. **Interactive Elements**:
   - Quick search modal (Cmd+K) with keyboard shortcuts
   - Blur backdrop effect on sticky header
   - Loading skeletons for all async content
   - Enhanced empty states with icons and helpful messaging
   - Toast notification system for future actions
9. **Metadata Display**:
   - Redesign metadata sidebar with icons
   - Add assignee display (mock avatar if no data)
   - Better organization and visual hierarchy
   - Add tooltips for additional context

**Priority 3: Core Features & Quality (2-3 days)**
10. **Search & Filter Enhancement**:
    - Advanced filtering options
    - Tag-based filtering with counts
    - Date range picker (if relevant)
    - Better sort options
11. **Error Handling** - Error boundaries, 404/500 pages with design
12. **Accessibility** - Keyboard navigation, WCAG AA compliance check
13. **Mobile Polish** - Responsive refinements, test on real devices
14. **Theme Refinement** - Polish dark mode colors, ensure proper contrast

**Priority 4: Testing & Deployment (1-2 days)**
15. **Tests** - Basic unit tests for queries, integration tests for API routes
16. **README Update** - Replace boilerplate with actual project documentation
17. **Deploy** - Vercel deployment with environment variables

**Estimated time to complete Phase 1 MVP properly**: 8-12 days (not 5-8 days - previous estimate was too optimistic given the quality gaps)

**Definition of Done for Phase 1:**
- ✅ All UI/UX requirements from spec are implemented
- ✅ Professional visual design matching spec quality standards
- ✅ Sub-spec navigation working
- ✅ Icon system throughout
- ✅ Color-coded status/priority indicators
- ✅ No major accessibility issues
- ✅ Basic test coverage (>50% for critical paths)
- ✅ Deployed and viewable
- ✅ README documentation complete

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
