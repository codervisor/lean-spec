# Architecture & Technology Stack

This document details the technical architecture, technology choices, and system design for LeanSpec Web.

## Architecture Overview

**Three-Tier Architecture:**

```
Frontend (React/Next.js)
    ↓
API Layer (Next.js API Routes / Node.js)
    ↓
Database (PostgreSQL/SQLite) + GitHub API
```

**Data Flow:**
1. Frontend requests data from API
2. API checks database cache
3. If cache miss or stale, fetch from GitHub API
4. Parse and store in database
5. Return to frontend

## Technology Stack

### Frontend

**Framework**: Next.js 14+ (App Router)
- Full-stack framework with API routes
- Server-side rendering + static generation
- Built-in optimizations (Image, Link, Font)
- Great DX, fast builds, excellent Vercel integration

**Styling**: Tailwind CSS + shadcn/ui
- Utility-first CSS framework
- Pre-built accessible components (Button, Card, Badge, Input, Select, Dialog, Tabs, Tooltip, Dropdown, etc.)
- Consistent design system with design tokens
- Easy customization with CSS variables
- Dark/light theme support via next-themes
- Professional elevation system (shadow-sm, shadow-md, shadow-lg)
- Responsive design utilities
- Animation and transition utilities

**Markdown Rendering**: react-markdown or MDX
- Rich markdown parsing
- Syntax highlighting (Prism/Shiki)
- Custom component mapping
- Frontmatter support

**State Management**: React Query (TanStack Query)
- Declarative data fetching
- Automatic caching and invalidation
- Optimistic updates
- Background refetching

**Theme Management**: next-themes
- Dark/light/system mode support
- Automatic theme detection
- Theme persistence in localStorage
- No flash on page load
- CSS variable based theme switching

## UI/UX Design System

### Design Principles

**Professional Quality:**
- Consistent spacing using 8px grid system (4, 8, 12, 16, 24, 32, 48, 64)
- Clear visual hierarchy with typography scale
- Refined color palette with WCAG AA contrast ratios
- Smooth transitions and micro-interactions
- Responsive design with mobile-first approach

**User Experience:**
- Progressive disclosure (don't overwhelm users)
- Clear feedback for all interactions
- Accessible by default (keyboard nav, screen readers)
- Fast loading with skeleton loaders
- Helpful error messages and empty states

### Component Library

**shadcn/ui Components to Use:**
```typescript
// Navigation & Layout
- NavigationMenu (main nav)
- Breadcrumb (page location)
- Separator (visual dividers)

// Interactive
- Button (primary, secondary, outline, ghost variants)
- Input (search, filters)
- Select (dropdowns)
- Dialog (modals)
- Dropdown Menu (actions)
- Tabs (sub-spec navigation)
- Switch (toggles)
- Checkbox (bulk selection)

// Display
- Card (spec cards, stats cards)
- Badge (status, priority, tags)
- Avatar (assignees)
- Tooltip (helpful hints)
- Skeleton (loading states)
- Alert (notifications)
- Progress (completion bars)

// Advanced
- Command (Cmd+K search)
- Calendar (date filters)
- Table (spec listing)
- Toast (action feedback)
```

### Typography Hierarchy

```css
/* Headings */
h1: 2rem (32px), font-weight: 700, line-height: 1.2
h2: 1.75rem (28px), font-weight: 600, line-height: 1.3
h3: 1.5rem (24px), font-weight: 600, line-height: 1.4
h4: 1.25rem (20px), font-weight: 600, line-height: 1.4

/* Body */
Large: 1.125rem (18px), font-weight: 400, line-height: 1.6
Base: 1rem (16px), font-weight: 400, line-height: 1.5
Small: 0.875rem (14px), font-weight: 400, line-height: 1.5
XSmall: 0.75rem (12px), font-weight: 400, line-height: 1.4

/* Code */
Code: 0.875rem (14px), font-family: monospace
```

### Color System

**Light Mode:**
```css
--background: 0 0% 100% (white)
--foreground: 222.2 84% 4.9% (near-black)
--primary: 221.2 83.2% 53.3% (blue)
--secondary: 210 40% 96.1% (light gray)
--accent: 210 40% 96.1% (light blue-gray)
--muted: 210 40% 96.1% (subtle background)
--destructive: 0 84.2% 60.2% (red)
--border: 214.3 31.8% 91.4% (light border)
--ring: 221.2 83.2% 53.3% (focus ring)
```

**Dark Mode:**
```css
--background: 222.2 84% 4.9% (dark blue-black)
--foreground: 210 40% 98% (off-white)
--primary: 217.2 91.2% 59.8% (lighter blue)
--secondary: 217.2 32.6% 17.5% (dark gray-blue)
--accent: 217.2 32.6% 17.5% (dark blue-gray)
--muted: 217.2 32.6% 17.5% (subtle dark)
--destructive: 0 62.8% 30.6% (dark red)
--border: 217.2 32.6% 17.5% (dark border)
--ring: 224.3 76.3% 48% (focus ring)
```

**Status Colors:**
```css
Complete: 142 76% 36% (green)
In Progress: 221 83% 53% (blue)
Planned: 38 92% 50% (orange)
Archived: 215 16% 47% (gray)
```

**Priority Colors:**
```css
Critical: 0 84% 60% (red)
High: 38 92% 50% (orange)
Medium: 221 83% 53% (blue)
Low: 215 16% 47% (gray)
```

### Spacing Scale

```css
xs: 0.25rem (4px)
sm: 0.5rem (8px)
md: 0.75rem (12px)
base: 1rem (16px)
lg: 1.5rem (24px)
xl: 2rem (32px)
2xl: 3rem (48px)
3xl: 4rem (64px)
```

### Animation & Transitions

```css
/* Standard transitions */
transition: all 150ms ease-in-out

/* Hover effects */
hover:scale-105 (1.05 scale)
hover:shadow-lg (elevation increase)

/* Loading states */
animate-pulse (skeleton loaders)
animate-spin (spinners)

/* Page transitions */
fade-in: opacity 200ms ease-in
slide-in: transform 200ms ease-out
```

### Spec Detail Page Layout

**Main Layout:**
```
┌────────────────────────────────────────────┐
│ Sticky Header (theme toggle, breadcrumb)  │
├────────────────────────────────────────────┤
│ ┌────────┐ ┌──────────────────────────┐   │
│ │        │ │ Spec Title               │   │
│ │ TOC    │ │ Timeline (created→done)  │   │
│ │ Sticky │ │ Metadata (status, etc.)  │   │
│ │ Scroll │ ├──────────────────────────┤   │
│ │ Spy    │ │ Tabs: README | DESIGN |  │   │
│ │        │ │       IMPLEMENTATION     │   │
│ │        │ ├──────────────────────────┤   │
│ │        │ │ Markdown Content         │   │
│ │        │ │ (rich formatting)        │   │
│ │        │ │                          │   │
│ └────────┘ └──────────────────────────┘   │
└────────────────────────────────────────────┘
```

**Timeline Visualization:**
```
Created ─────○─────○─────○───── Completed
        Nov 3    Nov 5    Nov 11
        
Status: planned → in-progress → complete
Time: 8 days to complete
```

**Sub-Spec Navigation:**
- Tab-based (horizontal) for main navigation
- Sidebar TOC for within-document navigation
- Breadcrumb: Project / Spec / Sub-spec
- Smooth transitions between sub-specs
- Highlight active tab/section

### Backend

**API**: Next.js API Routes
- Co-located with frontend
- Serverless deployment on Vercel
- TypeScript end-to-end
- Alternative: Standalone Node.js/Hono for flexibility

**Database**: 
- **PostgreSQL** (Production): Neon or Supabase
  - ACID compliance
  - Complex queries with joins
  - Full-text search
  - Mature ecosystem
  
- **SQLite** (Development): Local or Turso (edge)
  - Zero configuration
  - Fast local development
  - Same schema as PostgreSQL
  - Can deploy to edge with Turso

**ORM**: Drizzle or Prisma
- **Drizzle**: Lightweight, SQL-like, great DX
- **Prisma**: Full-featured, migrations, admin UI
- Type-safe queries
- Schema versioning

**GitHub Integration**: Octokit.js
- Official GitHub REST API client
- Automatic rate limiting
- TypeScript support
- Webhook support

**Caching**: Redis (Optional)
- GitHub API response caching
- Rate limit token buckets
- Session storage (future)
- Celery-style task queues (future)

### Infrastructure

**Hosting**: Vercel (Recommended)
- Native Next.js support
- Edge functions
- Preview deployments
- Zero-config CI/CD
- Alternative: Railway, Fly.io, Render

**Database Hosting**:
- **Neon**: Serverless PostgreSQL, generous free tier
- **Supabase**: PostgreSQL + real-time + auth
- **Turso**: SQLite on the edge, great performance

**Storage Strategy**:
- **GitHub**: Source of truth (authoritative)
- **Database**: Performance/caching layer
- No file uploads (GitHub repos only)

## Database Schema

### Projects Table
Stores GitHub repositories using LeanSpec.

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_owner TEXT NOT NULL,
  github_repo TEXT NOT NULL,
  display_name TEXT,
  description TEXT,
  homepage_url TEXT,
  stars INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(github_owner, github_repo)
);

CREATE INDEX idx_projects_featured ON projects(is_featured) WHERE is_featured = true;
CREATE INDEX idx_projects_public ON projects(is_public) WHERE is_public = true;
```

### Specs Table
Cached specification content from GitHub.

```sql
CREATE TABLE specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  spec_number INTEGER,
  spec_name TEXT NOT NULL,
  title TEXT,
  status TEXT CHECK(status IN ('planned', 'in-progress', 'complete', 'archived')),
  priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'critical')),
  tags TEXT[], -- PostgreSQL array or JSON for SQLite
  assignee TEXT,
  content_md TEXT NOT NULL, -- full markdown content
  content_html TEXT, -- pre-rendered HTML (optional optimization)
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  completed_at TIMESTAMP,
  file_path TEXT NOT NULL, -- path in repo (e.g., specs/035-live-specs-showcase/README.md)
  github_url TEXT, -- direct link to GitHub file
  synced_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, spec_number),
  UNIQUE(project_id, file_path)
);

CREATE INDEX idx_specs_project ON specs(project_id);
CREATE INDEX idx_specs_status ON specs(status);
CREATE INDEX idx_specs_priority ON specs(priority);
CREATE INDEX idx_specs_tags ON specs USING GIN(tags); -- PostgreSQL only
```

### Spec Relationships Table
Tracks dependencies between specs.

```sql
CREATE TABLE spec_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_id UUID NOT NULL REFERENCES specs(id) ON DELETE CASCADE,
  related_spec_id UUID NOT NULL REFERENCES specs(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK(relationship_type IN ('depends_on', 'related')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(spec_id, related_spec_id, relationship_type),
  CHECK(spec_id != related_spec_id) -- prevent self-reference
);

CREATE INDEX idx_relationships_spec ON spec_relationships(spec_id);
CREATE INDEX idx_relationships_related ON spec_relationships(related_spec_id);
```

### Sync Logs Table
Audit trail for GitHub sync operations.

```sql
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'success', 'failed')),
  specs_added INTEGER DEFAULT 0,
  specs_updated INTEGER DEFAULT 0,
  specs_deleted INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration_ms INTEGER -- computed: completed_at - started_at
);

CREATE INDEX idx_sync_logs_project ON sync_logs(project_id);
CREATE INDEX idx_sync_logs_status ON sync_logs(status);
CREATE INDEX idx_sync_logs_started ON sync_logs(started_at DESC);
```

## API Design

### REST Endpoints

**Projects:**
- `GET /api/projects` - List all projects (with filters)
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Add new project (GitHub URL)
- `DELETE /api/projects/:id` - Remove project (admin only)
- `POST /api/projects/:id/sync` - Trigger sync

**Specs:**
- `GET /api/specs` - List specs (across all projects or filtered)
- `GET /api/specs/:id` - Get spec details
- `GET /api/projects/:projectId/specs` - List specs for project
- `GET /api/search?q=query` - Full-text search

**Stats:**
- `GET /api/stats` - Global statistics
- `GET /api/projects/:projectId/stats` - Project statistics

**Sync:**
- `GET /api/sync/logs` - Recent sync history
- `GET /api/projects/:projectId/sync/logs` - Project sync history

### Response Formats

**Standard Success:**
```json
{
  "data": { /* resource or array */ },
  "meta": {
    "total": 42,
    "page": 1,
    "pageSize": 20
  }
}
```

**Standard Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid GitHub URL",
    "details": { /* field-level errors */ }
  }
}
```

## Caching Strategy

### Multi-Layer Caching

**Layer 1: Database (Primary Cache)**
- Stores parsed spec content
- Fast queries with indexes
- Updated during sync operations
- TTL: Until next sync (typically 24h)

**Layer 2: React Query (Client)**
- In-memory cache on frontend
- Automatic background refetch
- Optimistic updates
- TTL: 5 minutes (stale) / 30 minutes (cache)

**Layer 3: Redis (Optional)**
- GitHub API response caching
- Rate limit tracking
- Session storage (future)
- TTL: 1 hour

### Cache Invalidation

**Triggers:**
- Manual sync via UI → Invalidate project specs
- Scheduled sync completion → Invalidate project specs
- GitHub webhook (future) → Real-time invalidation
- User search → Cache results for 1 minute

**Strategy:**
- Stale-while-revalidate (serve cache, fetch in background)
- Optimistic updates for mutations
- Cache busting with timestamps

## Security Considerations

### Input Validation
- Sanitize all user inputs
- Validate GitHub URLs (prevent SSRF)
- Whitelist allowed domains
- Rate limit form submissions

### Content Security
- Sanitize markdown content (prevent XSS)
- Use DOMPurify or similar
- Content Security Policy headers
- Iframe sandboxing for embeds

### API Security
- Rate limiting (per IP, per API key)
- CORS configuration (restrict origins)
- Environment variables for secrets
- SQL injection prevention (parameterized queries)

### Database Security
- Connection pooling limits
- Read-only database user for queries
- Regular backups
- Encryption at rest (via provider)

## Performance Optimization

### Database
- Indexes on frequently queried columns
- Connection pooling
- Query result caching
- Pagination for large result sets

### Frontend
- Code splitting (per-route bundles)
- Image optimization (Next.js Image)
- Lazy loading for heavy components
- Virtual scrolling for long lists

### API
- Response compression (gzip/brotli)
- Edge caching (Vercel Edge Cache)
- Background jobs for heavy operations
- Streaming for large responses

## Monitoring & Observability

### Metrics to Track
- API response times
- Database query performance
- GitHub API rate limit usage
- Sync success/failure rates
- User engagement (page views, searches)

### Tools
- Vercel Analytics (built-in)
- Sentry for error tracking
- PostHog or Plausible for privacy-friendly analytics
- Database query monitoring (provider-specific)

## Technical Decisions

### Why Next.js?
- Full-stack in one framework
- Excellent DX and performance
- Native Vercel deployment
- Server components + streaming

### Why PostgreSQL/SQLite?
- Structured, relational data
- Complex queries with joins
- Battle-tested reliability
- PostgreSQL for prod, SQLite for dev parity

### Why Database + GitHub Dual Storage?
- **GitHub**: Source of truth (reliable, versioned)
- **Database**: Performance layer (fast queries, search)
- Best of both worlds: Reliability + Speed
- Decouples read performance from GitHub API limits

### Why Not Other Options?

**Why not MongoDB?**
- Relational data (projects ↔ specs ↔ relationships)
- Need for complex joins
- PostgreSQL offers JSON columns if needed

**Why not GraphQL?**
- REST sufficient for simple CRUD
- Less complexity for initial version
- Can add later if needed

**Why not separate frontend/backend repos?**
- Next.js unifies both well
- Simpler deployment
- Shared types and logic
- Can separate later if scaling requires it
