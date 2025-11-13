# Architecture & Technical Design

Technical architecture, technology stack, database schema, and GitHub integration strategy for LeanSpec Web.

## System Architecture

**Three-Tier Architecture:**
```
Frontend (Next.js + React)
    ↓
API Layer (Next.js API Routes)
    ↓
Database (PostgreSQL/SQLite) + GitHub API
```

**Data Flow:**
1. Frontend requests data from API
2. API checks database cache
3. If cache miss/stale, fetch from GitHub
4. Parse and store in database
5. Return to frontend

**Storage Strategy:**
- **GitHub**: Source of truth (authoritative, versioned)
- **Database**: Performance layer (fast queries, caching)
- Best of both: Reliability + Speed + Decoupled from API limits

## Technology Stack

### Frontend
- **Framework**: Next.js 16+ (App Router, Server Components)
- **Styling**: Tailwind CSS v3 + shadcn/ui
- **Markdown**: react-markdown + rehype-highlight + remark-gfm
- **State**: React Query (TanStack Query)
- **Theme**: next-themes (dark/light/system)

### Backend
- **API**: Next.js API Routes (serverless)
- **Database**: PostgreSQL (prod) / SQLite (dev)
- **ORM**: Drizzle ORM with type-safe queries
- **GitHub**: Octokit.js (official client)
- **Cache**: Redis (optional, for rate limiting)

### Infrastructure
- **Hosting**: Vercel (recommended) or Railway/Fly.io
- **Database**: Neon (PostgreSQL) or Turso (SQLite on edge)
- **Deployment**: Zero-config CI/CD via Vercel

## Database Schema

### Projects
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  github_owner TEXT NOT NULL,
  github_repo TEXT NOT NULL,
  display_name TEXT,
  description TEXT,
  stars INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(github_owner, github_repo)
);
```

### Specs
```sql
CREATE TABLE specs (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  spec_number INTEGER,
  spec_name TEXT NOT NULL,
  title TEXT,
  status TEXT CHECK(status IN ('planned', 'in-progress', 'complete', 'archived')),
  priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'critical')),
  tags TEXT[],
  assignee TEXT,
  content_md TEXT NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  completed_at TIMESTAMP,
  file_path TEXT NOT NULL,
  github_url TEXT,
  synced_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, spec_number)
);

CREATE INDEX idx_specs_project ON specs(project_id);
CREATE INDEX idx_specs_status ON specs(status);
```

### Spec Relationships
```sql
CREATE TABLE spec_relationships (
  id UUID PRIMARY KEY,
  spec_id UUID REFERENCES specs(id) ON DELETE CASCADE,
  related_spec_id UUID REFERENCES specs(id) ON DELETE CASCADE,
  relationship_type TEXT CHECK(relationship_type IN ('depends_on', 'related')),
  UNIQUE(spec_id, related_spec_id, relationship_type)
);
```

### Sync Logs
```sql
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT CHECK(status IN ('pending', 'running', 'success', 'failed')),
  specs_added INTEGER DEFAULT 0,
  specs_updated INTEGER DEFAULT 0,
  specs_deleted INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

## API Design

### Endpoints
```
GET  /api/projects              - List all projects
GET  /api/projects/:id          - Get project details
POST /api/projects              - Add new project
GET  /api/projects/:id/specs    - List project specs
GET  /api/specs/:id             - Get spec details
GET  /api/stats                 - Global statistics
GET  /api/search?q=query        - Full-text search
POST /api/projects/:id/sync     - Trigger sync
```

### Response Format
```json
{
  "data": { /* resource */ },
  "meta": { "total": 42, "page": 1 }
}
```

## GitHub Integration

### Sync Mechanisms

**1. Manual Trigger (MVP)**
User adds GitHub URL → immediate sync

**2. Scheduled Sync (Phase 2)**
- Featured projects: Every 6 hours
- Active projects: Daily
- Inactive projects: Weekly

**3. Webhooks (Phase 4)**
Real-time updates when repo changes

### Sync Process

**Discovery:**
1. Fetch repository tree via API (recursive)
2. Filter files matching `specs/*/README.md` pattern
3. Exclude `specs/archived/**`

**Parsing:**
1. Download file content from GitHub
2. Parse frontmatter (reuse `spec-loader.ts` from CLI)
3. Extract markdown content
4. Generate GitHub URL

**Storage:**
1. Upsert project record
2. Upsert specs (match by spec_number or file_path)
3. Handle deletions (soft delete)
4. Upsert relationships
5. Log results in sync_logs

### Rate Limiting

GitHub API limits:
- Authenticated: 5000 req/hour
- Unauthenticated: 60 req/hour

**Strategies:**
- Conditional requests (ETags)
- Response caching (Redis/database)
- Request batching (tree API)
- Rate limit monitoring
- Exponential backoff on errors
- Prioritization (manual > featured > active)

### Error Handling

- **404 Repo Not Found**: Mark unavailable, keep for history
- **429 Rate Limit**: Pause until reset, queue job
- **Parse Errors**: Log error, continue with other specs
- **Network Timeouts**: Retry with backoff, alert if persistent

## Caching Strategy

**Layer 1: Database (Primary)**
- Parsed spec content
- Fast indexed queries
- TTL: Until next sync (~24h)

**Layer 2: React Query (Client)**
- In-memory cache
- Background refetch
- TTL: 5min stale / 30min cache

**Layer 3: Redis (Optional)**
- GitHub API responses
- Rate limit tracking
- TTL: 1 hour

**Invalidation:**
- Manual/scheduled sync → invalidate project
- Stale-while-revalidate pattern
- Optimistic updates for mutations

## Security

- Sanitize user inputs (prevent SSRF, XSS)
- Validate GitHub URLs (whitelist domains)
- Rate limit API endpoints
- Parameterized queries (prevent SQL injection)
- Environment variables for secrets
- CORS configuration

## Performance

- Database indexes on frequent queries
- Connection pooling
- Code splitting per route
- Image optimization (Next.js Image)
- Lazy loading heavy components
- Response compression (gzip/brotli)

## Future Enhancements

- Private repo support (OAuth)
- Real-time webhooks
- Multi-branch support
- Cross-repo relationships
- Version history/diffs
