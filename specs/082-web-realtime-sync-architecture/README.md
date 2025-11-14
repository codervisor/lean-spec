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

**Critical architectural flaw identified before v0.3 release**: The web app currently uses a **static seed-based architecture** that doesn't support realtime updates from the filesystem.

**The Problem:**

1. **Local Development**: Specs are seeded into SQLite DB from `specs/` directory once. Changes to spec files require manual re-seeding (`pnpm db:seed`). No realtime updates.

2. **Production (Vercel)**: 
   - How do we seed the database on deployment?
   - How do we keep the DB in sync when specs change?
   - Static builds mean no access to filesystem after build time
   - No automatic updates when specs are updated via CLI or git push

**Current Architecture:**
```
CLI (specs/) → Manual seed script → SQLite DB → Next.js Web App
                    ↓
            No automatic sync
            No realtime updates
```

**Why This Matters:**
- Web app becomes stale immediately after spec changes
- Manual re-seeding is unacceptable for production use
- Breaks the "single source of truth" principle (specs/ directory)
- Bad UX: users see outdated information
- Critical blocker for v0.3 launch

**What We Need:**
A robust architecture that:
1. Keeps web app in sync with spec files (both local and production)
2. Supports realtime or near-realtime updates
3. Works seamlessly in both development and production environments
4. Maintains performance (no expensive rebuilds on every change)
5. Leverages existing LeanSpec CLI/core infrastructure

## Design

### Solution Options Analysis

#### Option 1: File-Based Direct Read (No Database)

**Architecture:**
```
specs/ directory → @leanspec/core APIs → Next.js Server Components
                         ↓
                  Read on every request
                  Cache with revalidation
```

**Pros:**
- ✅ Always in sync (single source of truth)
- ✅ No seeding required
- ✅ Simple architecture
- ✅ Works in both dev and production (if specs/ is in repo)
- ✅ Leverages existing `@leanspec/core` APIs

**Cons:**
- ❌ Performance: filesystem reads on every request
- ❌ Vercel deployment: specs/ directory must be included in build
- ❌ No GitHub integration (can't show external repos)
- ❌ Loses advanced query capabilities (filtering, sorting at DB level)

**Mitigation:**
- Use Next.js data cache with revalidation (`revalidate: 60`)
- Use React Server Components (no client-side data fetching)
- Keep cache in memory between requests

#### Option 2: Hybrid - Direct Read + Smart Caching

**Architecture:**
```
specs/ directory → @leanspec/core → In-Memory Cache → Next.js
                         ↓
                  Cache miss: read file
                  Cache hit: return cached
                  Invalidation: time-based (60s)
```

**Pros:**
- ✅ Always eventually consistent
- ✅ Good performance (in-memory cache)
- ✅ Simple deployment (specs/ in repo)
- ✅ No database complexity
- ✅ Automatic updates (cache expires)

**Cons:**
- ❌ Still no GitHub integration for external repos
- ❌ Cache invalidation strategy needed
- ❌ Cold starts on Vercel (cache empty)

**Implementation:**
```typescript
// packages/web/src/lib/specs-cache.ts
import { SpecReader } from '@leanspec/core';

const CACHE_TTL = 60_000; // 60 seconds

class SpecsCache {
  private cache: Map<string, { data: any; expires: number }> = new Map();
  private reader = new SpecReader();

  async getSpec(specPath: string) {
    const cached = this.cache.get(specPath);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }

    const spec = await this.reader.readSpec(specPath);
    this.cache.set(specPath, {
      data: spec,
      expires: Date.now() + CACHE_TTL,
    });
    
    return spec;
  }

  invalidate(specPath?: string) {
    if (specPath) {
      this.cache.delete(specPath);
    } else {
      this.cache.clear();
    }
  }
}

export const specsCache = new SpecsCache();
```

#### Option 3: Build-Time Generation + ISR

**Architecture:**
```
Build Time: specs/ → Static JSON → .next/cache
Runtime: Read from cache → Revalidate every N seconds
```

**Pros:**
- ✅ Fast (static generation)
- ✅ Works on Vercel
- ✅ Leverages Next.js ISR (Incremental Static Regeneration)

**Cons:**
- ❌ Complex: build-time script + runtime revalidation
- ❌ Still no GitHub integration
- ❌ Revalidation delay (not truly realtime)

#### Option 4: GitHub API Integration (Future-Proof)

**Architecture:**
```
GitHub Repo → GitHub API → Next.js Edge Runtime → Response
                ↓
         Cache with CDN
         Webhook updates (optional)
```

**Pros:**
- ✅ True realtime (via webhooks)
- ✅ Supports external repos (multi-project showcase)
- ✅ No database seeding needed
- ✅ Works on any platform (Vercel, Netlify, etc.)
- ✅ Scales to multiple projects

**Cons:**
- ❌ Requires GitHub API tokens
- ❌ Rate limiting concerns
- ❌ More complex architecture
- ❌ Dependency on GitHub availability
- ❌ Requires webhook setup for realtime updates

**Implementation Sketch:**
```typescript
// packages/web/src/lib/github-specs.ts
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export async function getSpecFromGitHub(
  owner: string, 
  repo: string, 
  specPath: string
) {
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path: `specs/${specPath}/README.md`,
  });
  
  if ('content' in data) {
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return parseSpec(content); // Use @leanspec/core
  }
}
```

### Recommended Solution: Option 2 (Hybrid) for v0.3 + Option 4 (GitHub) for v0.4

**v0.3 (Immediate)**: Option 2 - Hybrid Direct Read + Smart Caching
- Solves the immediate problem (realtime sync)
- Simple deployment (specs/ directory in repo)
- No database complexity
- Good performance with in-memory caching
- Works for LeanSpec's own specs (primary use case)

**v0.4 (Future)**: Option 4 - GitHub API Integration
- Enables multi-project showcase (original vision for spec 035)
- True realtime updates via webhooks
- Supports external repositories
- More scalable architecture

### v0.3 Implementation Plan

#### Phase 1: Remove Database Dependency

**Changes Required:**

1. **Remove SQLite + Drizzle ORM** (simplify)
   - Delete `packages/web/src/lib/db/` directory
   - Remove Drizzle dependencies from package.json
   - Remove database-related npm scripts

2. **Create Specs Service** (new abstraction)
   ```typescript
   // packages/web/src/lib/specs/service.ts
   import { SpecReader, SpecParser } from '@leanspec/core';
   
   export class SpecsService {
     private reader: SpecReader;
     private cache: Map<string, CachedSpec>;
     
     async getAllSpecs() { ... }
     async getSpec(specPath: string) { ... }
     async getSpecsByStatus(status: string) { ... }
     async searchSpecs(query: string) { ... }
     invalidateCache() { ... }
   }
   ```

3. **Update All Data Fetching**
   - Replace database queries with SpecsService calls
   - Use React Server Components
   - Add Next.js cache revalidation

4. **Update Environment Setup**
   - Set `SPECS_DIR` environment variable (defaults to `../../specs`)
   - Production: specs/ must be in repo (include in git)

#### Phase 2: Implement Caching Strategy

**Caching Layers:**

1. **In-Memory Cache** (Node.js process)
   - TTL: 60 seconds (configurable)
   - Invalidation: time-based + manual API endpoint

2. **Next.js Data Cache** (fetch cache)
   - Use `revalidate: 60` in fetch options
   - Automatic background revalidation

3. **CDN Cache** (Vercel Edge)
   - Cache static spec content
   - Bypass for dynamic queries

**Cache Invalidation API:**
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

#### Phase 3: Development Experience

**Local Development:**
- File watcher to detect spec changes (optional, nice-to-have)
- Auto-invalidate cache on file change
- Fast refresh for instant updates

**Script:**
```typescript
// packages/web/src/lib/specs/watcher.ts (optional)
import { watch } from 'fs';

if (process.env.NODE_ENV === 'development') {
  watch('../../specs', { recursive: true }, (event, filename) => {
    console.log(`Spec changed: ${filename}`);
    specsService.invalidateCache();
  });
}
```

### Production Deployment (Vercel)

**Build Configuration:**
```json
// vercel.json (updated)
{
  "buildCommand": "pnpm -F @leanspec/web build",
  "outputDirectory": "packages/web/.next",
  "framework": "nextjs",
  "installCommand": "pnpm install",
  "env": {
    "SPECS_DIR": "../../specs"
  }
}
```

**Key Points:**
- Specs directory must be in repo (it already is)
- No build-time seeding required
- Specs are read at runtime from filesystem
- Cache keeps performance acceptable
- Vercel Edge Functions support filesystem reads

### Migration Path

**Step 1: Feature Flag (Safety)**
```typescript
const USE_DATABASE = process.env.USE_DATABASE === 'true';

async function getSpecs() {
  if (USE_DATABASE) {
    return getSpecsFromDB(); // Old way
  } else {
    return getSpecsFromFilesystem(); // New way
  }
}
```

**Step 2: Parallel Implementation**
- Keep database code working
- Add new filesystem-based service
- Test both in parallel

**Step 3: Gradual Rollout**
- Dev environment: filesystem first
- Test thoroughly
- Production: flip feature flag
- Monitor performance

**Step 4: Cleanup**
- Remove database code after successful rollout
- Delete migration files
- Update documentation

## Plan

### Phase 1: Core Architecture (Days 1-3)
- [x] Create spec and analyze problem ✅
- [ ] Remove database dependency (SQLite, Drizzle)
- [ ] Create `SpecsService` with `@leanspec/core` integration
- [ ] Implement in-memory caching layer
- [ ] Update environment configuration

### Phase 2: Data Layer Migration (Days 4-6)
- [ ] Refactor all data fetching to use `SpecsService`
- [ ] Update dashboard page (stats, recent activity)
- [ ] Update specs list page
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
- [ ] Update Vercel configuration
- [ ] Deploy to staging
- [ ] Production deployment
- [ ] Monitor for issues

### Phase 5: Cleanup & Documentation (Day 11)
- [ ] Remove database code completely
- [ ] Update README and docs
- [ ] Document caching strategy
- [ ] Update deployment guide
- [ ] Close spec

## Test

### Functional Testing
- [ ] All specs load correctly from filesystem
- [ ] Cache works (verify with console logs)
- [ ] Cache invalidation API works
- [ ] Stats calculations are accurate
- [ ] Search and filtering work
- [ ] Board view displays correctly
- [ ] Spec detail pages load all content

### Performance Testing
- [ ] Initial page load <2s
- [ ] Cached page load <500ms
- [ ] Cache hit rate >90% after warmup
- [ ] Memory usage acceptable (<200MB)
- [ ] No memory leaks over 24 hours

### Deployment Testing
- [ ] Build succeeds on Vercel
- [ ] Specs directory accessible at runtime
- [ ] Environment variables set correctly
- [ ] Cache works in production
- [ ] Realtime updates work (after cache TTL)

### Regression Testing
- [ ] All existing features still work
- [ ] No broken links
- [ ] Search functionality intact
- [ ] Filtering and sorting work
- [ ] Mobile responsiveness maintained

## Notes

### Why Not Keep the Database?

**Complexity vs Value:**
- Database adds complexity (migrations, seeding, sync logic)
- SQLite is single-instance (doesn't scale horizontally on Vercel)
- Filesystem is already the source of truth
- Cache provides similar performance benefits
- Simpler architecture is easier to maintain

**When Would We Need a Database?**
- Multi-project showcase (external repos)
- User authentication and permissions
- Comments, annotations, collaborative features
- Analytics and tracking
- These are all v0.4+ features

### Performance Considerations

**Cache TTL Trade-offs:**
- **60s**: Good balance (updates appear within 1 minute)
- **30s**: More realtime but more filesystem reads
- **120s**: Better performance but slower updates

**Recommendation**: Start with 60s, make it configurable

### Future: GitHub API Integration (v0.4)

This architecture change makes GitHub integration easier:
```typescript
// Future: packages/web/src/lib/specs/sources.ts
interface SpecSource {
  getAllSpecs(): Promise<Spec[]>;
  getSpec(path: string): Promise<Spec>;
}

class FilesystemSource implements SpecSource { ... }
class GitHubSource implements SpecSource { ... }

// Pluggable architecture
const source = config.sourceType === 'github' 
  ? new GitHubSource() 
  : new FilesystemSource();
```

### Dependencies & Relationships

**This spec blocks:**
- Spec 081 (web-app-ux-redesign) - needs stable data layer
- Spec 035 (live-specs-showcase) - web app foundation must be solid
- v0.3 release - critical blocker

**Related to:**
- Spec 035 (live-specs-showcase) - This is the web app being fixed
- Spec 068 (live-specs-ux-enhancements) - UX work for the web app
- Spec 065 (v03-planning) - v0.3 release planning, includes this as critical deliverable

**This spec depends on:**
- `@leanspec/core` APIs for reading specs
- Specs directory structure stability

### Open Questions

- [x] Should we keep database for v0.3 or remove it? → **Remove it**
- [ ] What should cache TTL be? (30s, 60s, 120s?) → **Recommend 60s**
- [ ] Do we need file watching in dev mode? → **Nice-to-have, not critical**
- [ ] Should cache invalidation API be authenticated? → **Yes, use secret**

## Notes

<!-- Optional: Research findings, alternatives considered, open questions -->
