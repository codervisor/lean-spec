---
status: in-progress
created: '2025-11-14'
tags:
  - web
  - architecture
  - deployment
  - realtime
  - v0.3.0
priority: critical
created_at: '2025-11-14T05:33:26.170Z'
updated_at: '2025-11-14T05:35:02.854Z'
transitions:
  - status: in-progress
    at: '2025-11-14T05:35:02.854Z'
related:
  - 035-live-specs-showcase
  - 081-web-app-ux-redesign
  - 068-live-specs-ux-enhancements
  - 065-v03-planning
---

# Web App Realtime Spec Sync Architecture

> **Status**: ⏳ In progress · **Priority**: Critical · **Created**: 2025-11-14 · **Tags**: web, architecture, deployment, realtime, v0.3.0

**Project**: lean-spec  
**Team**: Core Development

## Overview

**Critical architectural decision for v0.3 release**: Design a **dual-mode architecture** that supports both local filesystem reads (for LeanSpec's own specs) and database-backed multi-project showcase (for external GitHub repos).

**The Problem:**

The web app serves two distinct use cases with different requirements:

1. **LeanSpec's Own Specs** (Primary Use Case):
   - Specs live in same monorepo (`specs/` directory)
   - Need realtime updates during development
   - Need automatic sync on git push/deployment
   - Fast filesystem reads available
   - No API rate limits or latency concerns

2. **External GitHub Repos** (Multi-Project Showcase - spec 035):
   - Specs live in external public GitHub repositories
   - GitHub API has rate limits (5000 req/hour authenticated)
   - API latency: 200-500ms per file fetch
   - Need caching layer for performance
   - Need scheduled sync (not realtime)

**Current Architecture (Insufficient):**
```
CLI (specs/) → Manual seed script → SQLite DB → Next.js Web App
                    ↓
            No automatic sync
            Only supports local specs
            Manual re-seeding required
```

**Why This Matters:**
- Web app becomes stale immediately after spec changes (bad DX)
- Manual re-seeding is unacceptable for production use
- Cannot support multi-project showcase (spec 035) without DB
- Breaks the "single source of truth" principle (specs/ directory)
- GitHub API latency makes direct reads too slow for UX
- Critical blocker for v0.3 launch

**What We Need:**
A **configurable dual-mode architecture** that:
1. **Mode 1 (Filesystem)**: Direct reads from local `specs/` directory
   - For LeanSpec's own specs
   - Realtime updates with in-memory caching
   - No database dependency
   - Fast performance (<100ms)
   
2. **Mode 2 (Database + GitHub)**: Database-backed multi-project support
   - For external GitHub repos (spec 035 vision)
   - GitHub API → DB cache layer
   - Scheduled sync (webhooks optional)
   - Handles rate limits gracefully
   
3. **Configuration-driven**: Environment variable determines mode
4. **Backwards compatible**: Can run both modes simultaneously

## Design

### Recommended Solution: Dual-Mode Architecture

**Architecture Overview:**

```
┌─────────────────────────────────────────────────────────────┐
│                      Web App (Next.js)                       │
├─────────────────────────────────────────────────────────────┤
│                    Unified Service Layer                     │
│                  (SpecsService Abstraction)                  │
├──────────────────────────┬──────────────────────────────────┤
│   Mode 1: Filesystem     │   Mode 2: Database + GitHub      │
│   (Local Specs)          │   (External Repos)               │
├──────────────────────────┼──────────────────────────────────┤
│  specs/ → @leanspec/core │  GitHub API → PostgreSQL         │
│  In-Memory Cache (60s)   │  Scheduled Sync (cron)           │
│  Fast (<100ms)           │  Cached (<50ms)                  │
│  Realtime Updates        │  Near-Realtime (5-60 min)        │
└──────────────────────────┴──────────────────────────────────┘
```

**Key Design Principles:**

1. **Configuration-Driven**: Environment variable determines which mode(s) to use
2. **Unified Interface**: Same API for both modes (transparent to UI)
3. **Performance First**: Aggressive caching for both modes
4. **Backwards Compatible**: Can enable both modes simultaneously
5. **Graceful Degradation**: Falls back if one mode fails

### Mode 1: Filesystem-Based (Local Specs)

**Use Case:** LeanSpec's own specs in monorepo

**Data Flow:**
```
specs/ directory → @leanspec/core → In-Memory Cache → Web App
         ↓
   Single source of truth
   Git is the version control
```

**Architecture:**
```typescript
// packages/web/src/lib/specs/sources/filesystem-source.ts
export class FilesystemSource implements SpecSource {
  private cache = new Map<string, CachedSpec>();
  private reader = new SpecReader({ specsDir: '../../specs' });
  
  async getAllSpecs(): Promise<Spec[]> {
    const cacheKey = '__all_specs__';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
    
    const specs = await this.reader.getAllSpecs();
    this.cache.set(cacheKey, {
      data: specs,
      expiresAt: Date.now() + CACHE_TTL,
    });
    
    return specs;
  }
  
  async getSpec(specPath: string): Promise<Spec | null> {
    const cached = this.cache.get(specPath);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
    
    const spec = await this.reader.readSpec(specPath);
    this.cache.set(specPath, {
      data: spec,
      expiresAt: Date.now() + CACHE_TTL,
    });
    
    return spec;
  }
  
  invalidateCache(specPath?: string) {
    if (specPath) {
      this.cache.delete(specPath);
    } else {
      this.cache.clear();
    }
  }
}
```

**Pros:**
- ✅ **Realtime sync**: Changes appear within cache TTL (60s)
- ✅ **No database dependency**: Simpler deployment
- ✅ **Fast**: In-memory cache keeps performance <100ms
- ✅ **Source of truth**: Filesystem is authoritative
- ✅ **Works everywhere**: Dev, staging, production (Vercel)

**Cons:**
- ⚠️ Cache invalidation: TTL-based (not event-driven)
- ⚠️ Cold starts: Cache empty after deployment
- ⚠️ No cross-instance cache: Each Vercel function has own cache

**Mitigation:**
- Use Next.js `revalidate` for additional CDN caching
- File watcher in dev mode for instant invalidation (optional)
- Acceptable trade-off for simplicity

### Mode 2: Database-Backed (External GitHub Repos)

**Use Case:** Multi-project showcase (spec 035), external public repos

**Data Flow:**
```
GitHub API → Sync Service → PostgreSQL → Web App
     ↓              ↓             ↓
Rate limits    Orchestration   Cache layer
(5000/hr)      (scheduled)     (fast queries)
```

**Architecture:**
```typescript
// packages/web/src/lib/specs/sources/database-source.ts
export class DatabaseSource implements SpecSource {
  async getAllSpecs(projectId?: string): Promise<Spec[]> {
    const query = projectId 
      ? db.select().from(specs).where(eq(specs.projectId, projectId))
      : db.select().from(specs);
    
    return await query.orderBy(specs.specNumber);
  }
  
  async getSpec(specPath: string, projectId: string): Promise<Spec | null> {
    // Parse spec number from path (e.g., "035" or "035-my-spec")
    const specNum = parseInt(specPath.split('-')[0], 10);
    
    const results = await db.select()
      .from(specs)
      .where(and(
        eq(specs.projectId, projectId),
        eq(specs.specNumber, specNum)
      ))
      .limit(1);
    
    return results[0] || null;
  }
}

// packages/web/src/lib/github/sync-service.ts
export class GitHubSyncService {
  private octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  
  async syncProject(owner: string, repo: string, projectId: string) {
    // 1. Fetch specs from GitHub
    const repoSpecs = await this.discoverSpecs(owner, repo);
    
    // 2. Compare with database
    const dbSpecs = await db.select()
      .from(specs)
      .where(eq(specs.projectId, projectId));
    
    // 3. Compute diff (added, updated, deleted)
    const diff = this.computeDiff(repoSpecs, dbSpecs);
    
    // 4. Apply changes
    await this.applyDiff(projectId, diff);
    
    // 5. Log sync result
    await db.insert(syncLogs).values({
      projectId,
      status: 'success',
      specsAdded: diff.added.length,
      specsUpdated: diff.updated.length,
      specsDeleted: diff.deleted.length,
      completedAt: new Date(),
    });
  }
  
  private async discoverSpecs(owner: string, repo: string) {
    // Fetch specs directory listing
    const { data } = await this.octokit.repos.getContent({
      owner,
      repo,
      path: 'specs',
    });
    
    // Filter directories (ignore archived)
    const specDirs = Array.isArray(data)
      ? data.filter(item => item.type === 'dir' && item.name !== 'archived')
      : [];
    
    // Fetch each spec's README.md
    const specs = await Promise.all(
      specDirs.map(dir => this.fetchSpec(owner, repo, dir.name))
    );
    
    return specs.filter(Boolean);
  }
}
```

**Pros:**
- ✅ **Handles rate limits**: Database caches GitHub data
- ✅ **Fast queries**: Database optimized for filtering/sorting/search
- ✅ **Multi-project support**: Can showcase many repos
- ✅ **Scheduled sync**: Background jobs handle updates
- ✅ **Relationships**: Can query cross-spec dependencies
- ✅ **Audit trail**: Sync logs track changes

**Cons:**
- ⚠️ **Not realtime**: Sync delay (5-60 min typical)
- ⚠️ **Database dependency**: PostgreSQL required (Vercel Postgres)
- ⚠️ **Sync orchestration**: Need cron jobs or webhooks
- ⚠️ **Complexity**: More moving parts

**Mitigation:**
- Webhooks for near-realtime (optional, Phase 2+)
- Database is cache layer, not source of truth
- Fallback to GitHub API if sync fails

### Unified Service Layer (Abstraction)

**Configuration-driven routing:**

```typescript
// packages/web/src/lib/specs/service.ts
interface SpecSource {
  getAllSpecs(projectId?: string): Promise<Spec[]>;
  getSpec(specPath: string, projectId?: string): Promise<Spec | null>;
  getSpecsByStatus(status: string, projectId?: string): Promise<Spec[]>;
  searchSpecs(query: string, projectId?: string): Promise<Spec[]>;
}

export class SpecsService {
  private filesystemSource?: FilesystemSource;
  private databaseSource?: DatabaseSource;
  
  constructor() {
    const mode = process.env.SPECS_MODE || 'filesystem'; // 'filesystem' | 'database' | 'both'
    
    if (mode === 'filesystem' || mode === 'both') {
      this.filesystemSource = new FilesystemSource();
    }
    
    if (mode === 'database' || mode === 'both') {
      this.databaseSource = new DatabaseSource();
    }
  }
  
  async getAllSpecs(projectId?: string): Promise<Spec[]> {
    // If projectId provided, use database (external repo)
    if (projectId && this.databaseSource) {
      return await this.databaseSource.getAllSpecs(projectId);
    }
    
    // Otherwise use filesystem (LeanSpec's own specs)
    if (this.filesystemSource) {
      return await this.filesystemSource.getAllSpecs();
    }
    
    throw new Error('No spec source configured');
  }
  
  // ... other methods follow same pattern
}

export const specsService = new SpecsService();
```

**Environment Variables:**

```bash
# Mode configuration
SPECS_MODE=both  # 'filesystem' | 'database' | 'both'

# Filesystem mode
SPECS_DIR=../../specs

# Database mode
DATABASE_URL=postgres://...  # Vercel Postgres
GITHUB_TOKEN=ghp_...         # For API access

# Cache settings
CACHE_TTL=60000              # 60 seconds
```

### Performance Comparison

| Metric | Filesystem Mode | Database Mode |
|--------|----------------|---------------|
| **First Load** | ~100ms (file read) | ~50ms (DB query) |
| **Cached Load** | ~10ms (memory) | ~10ms (memory) |
| **Sync Latency** | 0-60s (cache TTL) | 5-60 min (scheduled) |
| **Multi-Project** | ❌ Not supported | ✅ Supported |
| **Rate Limits** | ✅ None | ⚠️ 5000 req/hr |
| **Cold Start** | ~100ms | ~50ms |
| **Deployment** | Simple (specs/ in repo) | Complex (DB + cron) |

### Migration Strategy

**Phase 1 (v0.3)**: Filesystem mode only
- Remove database dependency for simplicity
- Focus on LeanSpec's own specs
- Get to production fast

**Phase 2 (v0.3.1)**: Add database mode
- Keep filesystem mode working
- Add database + GitHub sync
- Run both modes in parallel

**Phase 3 (v0.4)**: Full multi-project showcase
- Webhooks for realtime sync
- Advanced features (search, relationships)
- Community showcase

### v0.3 Implementation Plan

#### Phase 1: Filesystem Mode (v0.3.0 - Days 1-4)

**Goal**: Ship filesystem-based architecture for LeanSpec's own specs

**Changes Required:**

1. **Create Unified Service Layer**
   ```typescript
   // packages/web/src/lib/specs/service.ts
   export interface SpecSource { ... }
   export class SpecsService { ... }
   ```

2. **Implement Filesystem Source**
   ```typescript
   // packages/web/src/lib/specs/sources/filesystem-source.ts
   export class FilesystemSource implements SpecSource {
     private cache: Map<string, CachedSpec>;
     private reader: SpecReader;
     // ... implementation
   }
   ```

3. **Update All Data Fetching**
   - Replace `db.select()` calls with `specsService.getAllSpecs()`
   - Update API routes to use service layer
   - Update page components to use service layer

4. **Add Cache Invalidation API** (optional, nice-to-have)
   ```typescript
   // packages/web/src/app/api/revalidate/route.ts
   export async function POST(request: Request) {
     const { secret, specPath } = await request.json();
     if (secret !== process.env.REVALIDATION_SECRET) {
       return Response.json({ error: 'Unauthorized' }, { status: 401 });
     }
     specsService.invalidateCache(specPath);
     revalidatePath('/specs');
     return Response.json({ revalidated: true });
   }
   ```

5. **Environment Configuration**
   ```bash
   # .env.local (development)
   SPECS_MODE=filesystem
   SPECS_DIR=../../specs
   CACHE_TTL=60000
   
   # Vercel (production)
   SPECS_MODE=filesystem
   SPECS_DIR=../../specs
   CACHE_TTL=60000
   ```

6. **Keep Database Schema (for Phase 2)**
   - Don't delete database code yet
   - Add feature flag to switch between modes
   - Document migration path for Phase 2

**Testing:**
- [ ] All specs load from filesystem
- [ ] Cache works (verify hit rate)
- [ ] Performance <100ms
- [ ] Deployment to Vercel succeeds
- [ ] Specs update within 60s of file change

#### Phase 2: Database Mode (v0.3.1 - Days 5-8)

**Goal**: Add multi-project support with GitHub integration

**Changes Required:**

1. **Implement Database Source**
   ```typescript
   // packages/web/src/lib/specs/sources/database-source.ts
   export class DatabaseSource implements SpecSource {
     async getAllSpecs(projectId?: string): Promise<Spec[]> { ... }
     async getSpec(specPath: string, projectId: string): Promise<Spec | null> { ... }
   }
   ```

2. **Implement GitHub Sync Service**
   ```typescript
   // packages/web/src/lib/github/sync-service.ts
   export class GitHubSyncService {
     async syncProject(owner: string, repo: string, projectId: string) { ... }
     private async discoverSpecs(owner: string, repo: string) { ... }
     private computeDiff(repoSpecs: Spec[], dbSpecs: Spec[]) { ... }
   }
   ```

3. **Add Project Management UI**
   - Add project page (admin only)
   - Add project form (owner, repo, sync frequency)
   - Add sync status dashboard

4. **Add Scheduled Sync (Vercel Cron)**
   ```typescript
   // packages/web/src/app/api/cron/sync/route.ts
   export async function GET(request: Request) {
     // Verify cron secret
     if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
       return Response.json({ error: 'Unauthorized' }, { status: 401 });
     }
     
     // Sync all projects
     const projects = await db.select().from(schema.projects);
     for (const project of projects) {
       await syncService.syncProject(project.githubOwner, project.githubRepo, project.id);
     }
     
     return Response.json({ synced: projects.length });
   }
   ```

5. **Update Configuration**
   ```bash
   # Vercel (production)
   SPECS_MODE=both  # Enable both modes
   DATABASE_URL=postgres://...
   GITHUB_TOKEN=ghp_...
   CRON_SECRET=...
   ```

6. **Update Service Layer Routing**
   - If `projectId` provided → use database source
   - Otherwise → use filesystem source
   - Graceful fallback if one fails

**Testing:**
- [ ] Can add external GitHub repo
- [ ] Sync discovers all specs
- [ ] Database stores specs correctly
- [ ] UI shows both local and external specs
- [ ] Cron job runs successfully

#### Phase 3: Webhooks & Optimization (v0.4 - Future)

**Goal**: Near-realtime sync with webhooks

**Changes Required:**

1. **GitHub Webhook Endpoint**
   ```typescript
   // packages/web/src/app/api/webhooks/github/route.ts
   export async function POST(request: Request) {
     const payload = await request.json();
     const event = request.headers.get('X-GitHub-Event');
     
     if (event === 'push') {
       const { repository, commits } = payload;
       const changedFiles = commits.flatMap(c => c.modified);
       
       if (changedFiles.some(f => f.startsWith('specs/'))) {
         // Trigger sync for this project
         await syncService.syncProject(
           repository.owner.login,
           repository.name,
           projectId
         );
       }
     }
     
     return Response.json({ ok: true });
   }
   ```

2. **Webhook Management UI**
   - Auto-configure webhook on project add
   - Show webhook status and delivery logs
   - Retry failed deliveries

3. **Incremental Sync**
   - Only sync changed specs (not full resync)
   - Use webhook payload to identify changed files
   - Much faster than full sync

**Testing:**
- [ ] Webhook receives push events
- [ ] Only changed specs are synced
- [ ] Latency <10 seconds from push to UI update

### Production Deployment Configuration

#### v0.3.0 (Filesystem Mode)

**Vercel Configuration:**
```json
// vercel.json (web app deployment)
{
  "buildCommand": "pnpm -F @leanspec/web build",
  "outputDirectory": "packages/web/.next",
  "framework": "nextjs",
  "installCommand": "pnpm install"
}
```

**Environment Variables (Vercel Dashboard):**
```bash
SPECS_MODE=filesystem
SPECS_DIR=../../specs
CACHE_TTL=60000
REVALIDATION_SECRET=<random-secret>
```

**Key Points:**
- Specs directory (`specs/`) must be in git repo
- No database required for v0.3.0
- Specs read at runtime from filesystem
- In-memory cache keeps performance <100ms
- Vercel serverless functions have filesystem access

#### v0.3.1+ (Dual Mode)

**Vercel Configuration:**
```json
// vercel.json (unchanged)
{
  "buildCommand": "pnpm -F @leanspec/web build",
  "outputDirectory": "packages/web/.next",
  "framework": "nextjs",
  "installCommand": "pnpm install",
  "crons": [{
    "path": "/api/cron/sync",
    "schedule": "0 * * * *"
  }]
}
```

**Environment Variables (Vercel Dashboard):**
```bash
SPECS_MODE=both
SPECS_DIR=../../specs
CACHE_TTL=60000
DATABASE_URL=postgres://...
GITHUB_TOKEN=ghp_...
CRON_SECRET=<random-secret>
REVALIDATION_SECRET=<random-secret>
```

**Database Setup (Vercel Postgres):**
1. Create Vercel Postgres database
2. Run migrations: `pnpm -F @leanspec/web db:migrate`
3. Seed LeanSpec project: `pnpm -F @leanspec/web db:seed`
4. Cron job handles external repos

**Key Points:**
- Both filesystem and database sources active
- LeanSpec's specs use filesystem (fast, realtime)
- External repos use database (cached, scheduled sync)
- Cron job syncs external repos every hour

## Plan

### Phase 1: Filesystem Mode (v0.3.0 - Days 1-4)
- [x] Create spec and analyze requirements ✅
- [x] Design dual-mode architecture ✅
- [ ] Create unified `SpecsService` abstraction
- [ ] Implement `FilesystemSource` with caching
- [ ] Refactor all data fetching to use service layer
- [ ] Update API routes and page components
- [ ] Add cache invalidation endpoint (optional)
- [ ] Test filesystem mode thoroughly
- [ ] Deploy to Vercel staging
- [ ] Deploy to production

### Phase 2: Database Mode (v0.3.1 - Days 5-8)
- [ ] Implement `DatabaseSource` with PostgreSQL
- [ ] Implement `GitHubSyncService` (Octokit integration)
- [ ] Add project management UI (add/remove repos)
- [ ] Add sync status dashboard
- [ ] Implement scheduled sync (Vercel Cron)
- [ ] Update `SpecsService` routing logic
- [ ] Test both modes in parallel
- [ ] Deploy to production with `SPECS_MODE=both`

### Phase 3: Webhooks (v0.4 - Future)
- [ ] Implement GitHub webhook endpoint
- [ ] Add webhook management UI
- [ ] Implement incremental sync (only changed files)
- [ ] Test near-realtime updates (<10s latency)
- [ ] Update specs board page
- [ ] Update spec detail pages
- [ ] Add Next.js cache revalidation

### Phase 3: Cache & Performance (Days 7-8)
- [ ] Implement cache invalidation API endpoint
- [ ] Add file watcher for local development (optional)
- [ ] Performance testing and optimization
- [ ] Add monitoring/logging for cache hits/misses

### Phase 4: Testing & Deployment (Days 9-10)
- [ ] Test in local environment
- [ ] Test cache invalidation
- [ ] Test performance under load
- [ ] Test near-realtime updates (<10s latency)

## Test

### Phase 1 Testing (Filesystem Mode)

**Functional:**
- [ ] All specs load from filesystem
- [ ] Cache hit rate >90% after warmup
- [ ] Cache invalidation works correctly
- [ ] Stats calculations accurate
- [ ] Search and filtering work
- [ ] Board view displays correctly
- [ ] Spec detail pages render markdown
- [ ] Sub-specs navigation works

**Performance:**
- [ ] Initial page load <100ms (filesystem read)
- [ ] Cached page load <10ms (memory hit)
- [ ] Memory usage <100MB per instance
- [ ] No memory leaks over 24 hours
- [ ] Cold start acceptable (<500ms)

**Deployment:**
- [ ] Build succeeds on Vercel
- [ ] Specs directory accessible at runtime
- [ ] Environment variables configured
- [ ] Cache works in serverless functions
- [ ] Updates appear within 60s

### Phase 2 Testing (Database Mode)

**Functional:**
- [ ] Can add external GitHub repo
- [ ] Sync discovers all specs correctly
- [ ] Database stores specs with metadata
- [ ] Multi-project UI works
- [ ] Cron job executes successfully
- [ ] Sync logs recorded properly
- [ ] Rate limiting handled gracefully

**Performance:**
- [ ] Database queries <50ms
- [ ] GitHub sync <30s for typical repo
- [ ] Parallel fetching works (not sequential)
- [ ] Database connections pooled correctly

**Integration:**
- [ ] Both filesystem and database modes work
- [ ] Service layer routes correctly
- [ ] No conflicts between sources
- [ ] Graceful fallback on errors

## Notes

### Key Design Decisions

**Why Dual-Mode Architecture?**
1. **Different Requirements**: Local specs need realtime, external repos need caching
2. **Performance**: Filesystem reads (<100ms) vs GitHub API (200-500ms)
3. **Flexibility**: Can disable either mode via config
4. **Simplicity**: v0.3 can ship without database complexity
5. **Future-Proof**: Easy to add database mode in v0.3.1

**Why Keep Database for External Repos?**
- GitHub API has rate limits (5000 req/hour)
- API latency too high for good UX (200-500ms per file)
- Need scheduled sync, not on-demand fetching
- Database enables advanced features (search, relationships, analytics)
- Database is cache layer, not source of truth

**Why NOT Database for Local Specs?**
- Adds complexity (migrations, seeding, sync logic)
- Filesystem is already source of truth
- In-memory cache provides similar performance
- Simpler deployment (no database required)
- Easier local development (no DB setup)

### Cache TTL Trade-offs

| TTL | Pros | Cons | Recommendation |
|-----|------|------|----------------|
| 30s | More realtime | More filesystem reads | Dev mode |
| 60s | Good balance | 1-minute delay | **Production default** |
| 120s | Better performance | Slower updates | High-traffic sites |

**Configurable via `CACHE_TTL` environment variable**

### GitHub API Rate Limits

**Without Authentication:**
- 60 requests per hour
- Not viable for production

**With Authentication (`GITHUB_TOKEN`):**
- 5,000 requests per hour
- Sufficient for scheduled sync
- ~1 request per spec (README.md + metadata)
- Can sync ~100 specs every 5 minutes

**Mitigation:**
- Database caching layer (essential)
- Scheduled sync (hourly or less)
- Webhooks for near-realtime (Phase 3)
- Conditional requests (ETags) to avoid re-fetching

### Performance Benchmarks

**Filesystem Mode:**
```
Cold start (no cache):  ~100ms  (read file + parse)
Warm cache (in-memory): ~10ms   (memory lookup)
Cache miss penalty:     ~90ms   (acceptable)
```

**Database Mode:**
```
Database query:         ~50ms   (PostgreSQL)
GitHub API fetch:       ~300ms  (per file, avoided via cache)
Sync full repo (50 specs): ~15s (parallel fetching)
```

**Comparison:**
- Filesystem: Faster for single project (LeanSpec)
- Database: Necessary for multi-project (spec 035)
- Both: Optimal for production

### Dependencies & Relationships

**This spec enables:**
- v0.3 release (filesystem mode)
- Spec 035 (multi-project showcase) - database mode required
- Spec 081 (UX redesign) - needs stable data layer

**This spec blocks:**
- v0.3 production deployment
- Community showcase features
- External repo integration

**Related specs:**
- Spec 035 (live-specs-showcase) - Web app being fixed
- Spec 068 (live-specs-ux-enhancements) - UI/UX improvements
- Spec 065 (v03-planning) - Release planning
- Spec 059 (programmatic-spec-management) - API design overlap

**This spec depends on:**
- `@leanspec/core` APIs (SpecReader, SpecParser)
- Existing database schema (keep for Phase 2)
- Vercel serverless functions (filesystem access)

### Open Questions

- [x] Should we keep database for v0.3? → **Keep schema, don't use yet (Phase 2)**
- [x] What should cache TTL be? → **60s (configurable via env)**
- [x] Do we really need database if it's only cache? → **Yes, for multi-project showcase**
- [x] How to manage GitHub API latency? → **Scheduled sync + database caching**
- [ ] Should we use PostgreSQL or SQLite? → **PostgreSQL (Vercel Postgres)**
- [ ] Should cache invalidation API be authenticated? → **Yes, use REVALIDATION_SECRET**
- [ ] File watcher in dev mode? → **Nice-to-have, not critical for v0.3**

### Success Criteria

**v0.3.0 (Filesystem Mode):**
- ✅ LeanSpec's specs load from filesystem
- ✅ Performance <100ms (filesystem) / <10ms (cached)
- ✅ Updates appear within 60s (cache TTL)
- ✅ Works in local dev and Vercel production
- ✅ No manual re-seeding required

**v0.3.1 (Database Mode):**
- ✅ Can add external GitHub repos
- ✅ Sync discovers and stores specs
- ✅ Performance <50ms (database queries)
- ✅ Scheduled sync works (hourly)
- ✅ Both modes work simultaneously

**v0.4 (Webhooks):**
- ✅ Near-realtime updates (<10s)
- ✅ Incremental sync (only changed files)
- ✅ Webhook management UI
