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

**Current Status**: Phase 1 ~70% Complete (as of 2025-11-11)

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

### 🚧 In Progress / Remaining for Phase 1

**Core Functionality:**
- [ ] Kanban board view by status
- [ ] Search and filtering functionality
- [ ] Error boundaries and error pages (404, 500)
- [ ] Unit tests for database queries
- [ ] Integration tests for API routes
- [ ] Update README with proper documentation

**UI/UX Enhancements:**
- [ ] Integrate shadcn/ui component library fully (Button, Card, Input, Select, Dialog, Tabs, etc.)
- [ ] Theme switching with next-themes (dark/light mode toggle)
- [ ] Professional design polish:
  - Consistent spacing and padding
  - Refined color palette
  - Typography hierarchy
  - Shadow and elevation system
  - Smooth transitions and hover effects
- [ ] Navigation improvements:
  - Sticky header with blur backdrop
  - Active page indicators
  - Breadcrumb navigation
  - Mobile hamburger menu
  - Quick search modal (Cmd+K)
- [ ] Loading states and skeleton loaders
- [ ] Timeline display for spec evolution
- [ ] Sub-spec navigation and display:
  - Tab-based or sidebar navigation
  - Automatic sub-spec detection
  - Table of contents for sub-specs
  - Proper layout for different sub-spec types
- [ ] Accessibility audit and fixes (WCAG AA)
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
3. **Basic UI Design** - Current issues:
   - Not using shadcn/ui component library
   - Inconsistent spacing, padding, alignment
   - No theme switching (dark/light mode)
   - Basic navigation without breadcrumbs or active indicators
   - No sticky header or mobile menu
   - Poor visual hierarchy and typography
   - Lack of smooth transitions and micro-interactions
4. **Poor Spec UX** - Navigation issues:
   - No timeline showing spec evolution
   - Sub-specs not properly detected or displayed
   - Missing table of contents for long specs
   - No breadcrumb navigation
   - Difficult to understand spec history and transitions
5. **No Tests** - Zero test coverage currently
6. **README Outdated** - Still contains Next.js boilerplate

### Next Immediate Steps

**Priority 1: UI/UX Foundation (2-3 days)**
1. **Theme Switching** - Install next-themes, add theme toggle to navigation, refine dark mode colors
2. **Component Library** - Install and configure shadcn/ui components (Button, Card, Badge, Input, Select, Dialog, Tabs, Tooltip)
3. **Design Polish** - Implement consistent spacing, refined shadows, typography hierarchy, smooth transitions
4. **Navigation** - Sticky header with blur, breadcrumbs, active indicators, mobile menu
5. **Loading States** - Skeleton loaders for all async content, Suspense boundaries

**Priority 2: Core Features (2-3 days)**
6. **Kanban Board** - Complete `/board` route with color-coded columns, card interactions
7. **Search/Filter** - Advanced filtering sidebar, tag filters, date range, sort options
8. **Spec Timeline** - Display spec evolution timeline, status transitions, metadata visualization
9. **Sub-Spec Navigation** - Tab-based or sidebar navigation for sub-specs, TOC, proper layouts
10. **Error Handling** - Error boundaries, 404/500 pages, toast notifications

**Priority 3: Testing & Deployment (1-2 days)**
11. **Tests** - Unit tests for queries.ts, integration tests for API routes
12. **Accessibility** - Keyboard navigation, screen reader testing, WCAG AA compliance
13. **Mobile Polish** - Responsive refinements, touch interactions
14. **Deploy** - Vercel deployment with environment variables

**Estimated time to complete Phase 1 MVP**: 5-8 days

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
