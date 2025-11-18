---
status: complete
created: '2025-11-03'
tags:
  - docs
  - dogfooding
  - web
  - v0.3.0-launch
priority: high
created_at: '2025-11-03T00:00:00Z'
updated_at: '2025-11-18T14:36:33.079Z'
depends_on:
  - 067-monorepo-core-extraction
transitions:
  - status: in-progress
    at: '2025-11-11T15:21:48.941Z'
  - status: complete
    at: '2025-11-17T08:18:56.995Z'
completed_at: '2025-11-17T08:18:56.995Z'
completed: '2025-11-17'
related:
  - 105-docs-site-enhancements
---

# LeanSpec Web: Fullstack Spec Showcase Platform

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-03 · **Tags**: docs, dogfooding, web, v0.3.0-launch

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

### Core Features (MVP)

**Essential Functionality:**
- Browse LeanSpec's own specs (dogfooding)
- Rich markdown rendering with syntax highlighting
- Kanban board view by status
- Stats dashboard with basic metrics
- Search and filtering
- Responsive design for mobile/desktop

**Basic UI Implementation:**
- shadcn/ui component library (Button, Card, Badge, etc.)
- Tailwind CSS v3 with design tokens
- Lucide React icons for status/priority
- Dark/light theme toggle with next-themes
- Sticky header with breadcrumb navigation

**Note**: Advanced UX enhancements (quick search Cmd+K, loading skeletons, enhanced empty states, improved spec detail layout, etc.) have been moved to **spec 068** to keep this spec focused on core platform functionality.

### Sub-Specifications

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture, database schema, GitHub integration
- **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** - Phased implementation plan with timelines

**Note**: UI/UX design details moved to **spec 068** (live-specs-ux-enhancements).

## Progress

**Current Status**: Phase 1 ~40% Complete

### Foundation Complete (2025-11-12)

**✅ Core UI Implementation:**
- Icon system integrated (Lucide React throughout)
- Visual design system (color-coded status/priority, elevation, transitions)
- Component library (shadcn/ui components replacing raw HTML)
- Sub-spec navigation (automatic detection and tabs)
- Timeline visualization (status progression with icons)
- Theme switching (dark/light modes working)

**Remaining for MVP**: Error handling, testing, documentation, deployment. Advanced UX polish moved to spec 068.

### Previously Completed
- ✅ Next.js 16 project initialized with TypeScript, Tailwind CSS
- ✅ SQLite database with Drizzle ORM fully configured
- ✅ Database schema created and migrations applied
- ✅ Core database queries implemented
- ✅ API routes for specs, projects, stats
- ✅ Home page with stats dashboard and specs table
- ✅ Spec detail page with rich markdown rendering
- ✅ Syntax highlighting + GitHub-flavored markdown
- ✅ Database seeded with 32 LeanSpec specs
- ✅ Responsive layout with badges
- ✅ Kanban board page
- ✅ Breadcrumb navigation

### 🚧 Critical Issues & Missing Features (2025-11-13)

**Note**: Major UX/UI enhancements have been split into **spec 068** (live-specs-ux-enhancements) to keep specs focused. The items below marked with "→ Spec 068" will be addressed there.

**Major UX/UI Problems - Must Fix:**
- [ ] **Color Scheme Issue** - Planned (orange) and In-Progress (blue) colors are backwards - swap them → **Spec 068**
- [ ] **Stats Page Incomplete** - Major page with missing/incomplete sections → **Spec 068**
- [ ] **Spec Detail Page - No Sidebar for Spec Navigation** - Missing sidebar to quickly switch between different specs (not TOC) → **Spec 068**
- [ ] **Sub-Spec Navigation Poor Design** - Current tab design doesn't make sense, needs complete redesign → **Spec 068**
- [ ] **Spec Detail - No Sticky Left Info** - Metadata/info area should be sticky on left side → **Spec 068**
- [ ] **Spec Detail - No Sticky Header** - Header should stick on scroll for navigation → **Spec 068**
- [ ] **Spec Detail - Poor Frontmatter Display** - Frontmatter metadata display is very bad, needs redesign → **Spec 068**
- [ ] **Missing Logo & Favicon** - No logo beside "LeanSpec" in top left header, no favicon for browser tab → **Spec 068**
- [ ] **Dark Theme Typography Issues** - Bold text (e.g., "Recent Improvements (2025-11-05):") has wrong color in dark theme → **Spec 068**
- [ ] **Dark Theme Strong Tags** - Similar color issues with `<strong>` elements throughout → **Spec 068**

**High Priority - Still Needed:**
- [ ] **Quick Search Modal (Cmd+K)** - Fuzzy search with keyboard shortcuts → **Spec 068**
- [ ] **Loading Skeletons** - Add Suspense boundaries and skeleton loaders for async content → **Spec 068**
- [ ] **Enhanced Empty States** - More helpful messaging with actions (currently basic) → **Spec 068**
- [ ] **Toast Notifications** - System for user feedback (create/update/delete actions) → **Spec 068**

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
5. **UI/UX Polish Needed** - Many enhancements deferred to spec 068

### Design Decisions

**Why Next.js?** Full-stack framework, excellent DX, Vercel integration, server components

**Why PostgreSQL + SQLite?** Structured relational data, PostgreSQL for production, SQLite for dev parity

**Why Database + GitHub Dual Storage?** GitHub is source of truth (reliable, versioned), Database is performance layer (fast queries, search). Best of both: Reliability + Speed + Decoupling from API limits.

**Why Tailwind CSS v3 instead of v4?** v4 still in beta, causing compatibility issues with shadcn/ui. Can upgrade once stable.

### Open Questions

- **Private repos?** → Phase 4 with OAuth
- **Sync frequency?** → Daily for featured, weekly for others
- **Edit specs via web?** → No, GitHub is source of truth (view-only)
- **Show archived specs?** → Yes, but collapsed/hidden by default

### Related Specs

- **spec 068**: Live Specs UX Enhancements (depends on this spec, contains Phase 2 UX work)
- **spec 010**: Documentation website (integration point)
- **spec 059**: Programmatic spec management (API design overlap)
- **spec 065**: v0.3.0 planning (this is key deliverable)

---

**For detailed information, see:**
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture, database, GitHub integration
- [IMPLEMENTATION.md](./IMPLEMENTATION.md) - Phased implementation plan with timelines
- **Spec 068** - UI/UX enhancements and polish
