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

### Sub-Specifications

This spec is split into detailed sub-specs for maintainability:

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technology stack, database schema, API design, caching strategy
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
- [ ] Kanban board view by status
- [ ] Search and filtering functionality
- [ ] Integrate shadcn/ui component library (currently using basic Tailwind)
- [ ] Proper navigation header/layout
- [ ] Error boundaries and error pages (404, 500)
- [ ] Loading states and skeleton loaders
- [ ] Unit tests for database queries
- [ ] Integration tests for API routes
- [ ] Update README with proper documentation
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
3. **Basic Styling** - Not yet using shadcn/ui as specified in design
4. **No Tests** - Zero test coverage currently
5. **README Outdated** - Still contains Next.js boilerplate

### Next Immediate Steps

1. **Kanban Board** - Create `/board` route with drag-and-drop status columns
2. **Search/Filter** - Add search input and tag/status/priority filters to home page
3. **UI Components** - Integrate shadcn/ui for Button, Card, Badge, Input, etc.
4. **Error Handling** - Add NotFound, ErrorBoundary, and error state handling
5. **Loading States** - Implement Suspense boundaries and skeleton loaders
6. **Tests** - Write unit tests for queries.ts and integration tests for API routes

**Estimated time to complete Phase 1 MVP**: 2-3 days

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
