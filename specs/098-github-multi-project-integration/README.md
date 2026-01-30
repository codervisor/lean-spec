---
status: archived
created: 2025-11-17
priority: low
tags:
- web
- github
- integration
- v0.3
depends_on:
- 082-web-realtime-sync-architecture
- 151-multi-project-architecture-refactoring
created_at: 2025-11-17T08:19:16.821Z
updated_at: 2026-01-30T01:46:09.246613Z
transitions:
- status: archived
  at: 2026-01-30T01:46:09.246613Z
---

# GitHub Multi-Project Integration

> **Status**: 🗓️ Planned · **Priority**: High · **Created**: 2025-11-17 · **Tags**: web, github, integration, v0.3

**Project**: lean-spec  
**Team**: Core Development  
**Depends On**: Spec 082 (web-realtime-sync-architecture)

## Overview

**The Problem**: LeanSpec Web currently only displays specs from the LeanSpec monorepo itself. We need to support **external GitHub repositories** so teams can showcase their specs on https://lean-spec-web.vercel.app, creating a community discovery platform.

**Current Limitation:**
- Web app only reads local `specs/` directory (filesystem mode from spec 082)
- No way to add external GitHub repositories
- Can't showcase how other teams use LeanSpec
- Misses opportunity for community growth and real-world examples

**Why This Matters:**
- **Community Growth**: Let teams showcase their LeanSpec usage publicly
- **Social Proof**: Real-world examples help adoption
- **Discovery**: Find projects using LeanSpec methodology
- **Validation**: See how different teams adapt the framework

**What We Need**: Implement Phase 2 of spec 082's dual-mode architecture:
1. Database-backed storage for external repo specs
2. GitHub API integration for syncing specs
3. Project management UI (add/remove repos)
4. Scheduled sync with GitHub repos
5. Multi-project showcase interface

## Design

### Architecture (from Spec 082)

Building on the dual-mode architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                      Web App (Next.js)                       │
├─────────────────────────────────────────────────────────────┤
│                    Unified Service Layer                     │
│                  (SpecsService - Already Built)              │
├──────────────────────────┬──────────────────────────────────┤
│   Mode 1: Filesystem     │   Mode 2: Database + GitHub      │
│   (LeanSpec specs)       │   (External Repos) ← IMPLEMENT   │
│   ✅ COMPLETE            │   🚧 THIS SPEC                   │
└──────────────────────────┴──────────────────────────────────┘
```

**Key Components to Implement:**

1. **DatabaseSource** (already stubbed in spec 082)
   - PostgreSQL/SQLite schema for specs and projects
   - Store spec metadata and content
   - Query optimization for performance (<50ms)

2. **GitHubSyncService** (new)
   - Octokit integration for GitHub API
   - Discover specs in external repos
   - Parse frontmatter and content
   - Handle rate limits (5000 req/hour)
   - Parallel fetching for performance

3. **Project Management UI** (new)
   - Add repository by GitHub URL
   - View sync status and last update
   - Remove/disable projects
   - Sync history and logs

4. **Scheduled Sync** (new)
   - Vercel Cron job for periodic sync
   - Configurable intervals (5-60 min)
   - Graceful error handling
   - Sync metrics and monitoring

### Database Schema

```sql
-- Projects table (external GitHub repos)
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  github_url TEXT NOT NULL UNIQUE,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  branch TEXT DEFAULT 'main',
  specs_dir TEXT DEFAULT 'specs/',
  enabled BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP,
  sync_status TEXT, -- 'pending', 'syncing', 'success', 'error'
  sync_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Specs table (cached from GitHub)
CREATE TABLE specs (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  sequence INTEGER,
  name TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  frontmatter JSONB,
  status TEXT,
  priority TEXT,
  tags TEXT[],
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  github_path TEXT,
  github_url TEXT,
  UNIQUE(project_id, sequence)
);

-- Sync logs for debugging
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  status TEXT, -- 'success', 'error', 'partial'
  specs_synced INTEGER,
  error_message TEXT,
  duration_ms INTEGER
);
```

### GitHub Sync Flow

```typescript
// GitHubSyncService implementation
class GitHubSyncService {
  private octokit: Octokit;
  
  async syncProject(project: Project): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
      // 1. Discover spec directories in repo
      const specDirs = await this.discoverSpecs(project);
      
      // 2. Fetch specs in parallel (respect rate limits)
      const specs = await this.fetchSpecs(project, specDirs);
      
      // 3. Parse frontmatter and content
      const parsed = specs.map(s => this.parseSpec(s));
      
      // 4. Update database
      await this.updateDatabase(project.id, parsed);
      
      // 5. Log sync result
      return {
        status: 'success',
        specsCount: parsed.length,
        duration: Date.now() - startTime
      };
    } catch (error) {
      await this.logError(project.id, error);
      return { status: 'error', error: error.message };
    }
  }
  
  private async discoverSpecs(project: Project): Promise<string[]> {
    // Use GitHub tree API to find NNN-name directories
    const tree = await this.octokit.git.getTree({
      owner: project.owner,
      repo: project.repo,
      tree_sha: project.branch,
      recursive: 'true'
    });
    
    return tree.data.tree
      .filter(item => item.type === 'tree')
      .filter(item => /^\d{3}-[\w-]+$/.test(item.path))
      .map(item => item.path);
  }
}
```

### Project Management UI

**Pages to create:**
1. `/admin/projects` - List all projects with sync status
2. `/admin/projects/add` - Add new GitHub repository
3. `/admin/projects/[id]` - Project details and sync history
4. `/projects/[id]` - Public view of project specs (multi-project showcase)

**UI Components:**
- Project card with sync status indicator
- Add project form with validation
- Sync now button (manual trigger)
- Sync history timeline
- Error display with retry option

### Performance & Rate Limiting

**GitHub API Limits:**
- 5000 requests/hour (authenticated)
- ~1 file per request for content fetching
- Need to batch and parallelize efficiently

**Optimization Strategies:**
1. Use tree API to discover all specs in 1 request
2. Fetch README.md files in parallel (limit: 10 concurrent)
3. Cache responses with appropriate TTL
4. Only sync changed files (compare timestamps/SHA)
5. Graceful degradation on rate limit hit

**Sync Schedule:**
- Default: Every 30 minutes
- Configurable per project
- Manual sync available via UI
- Webhook support (future Phase 3)

## Plan

### Phase 1: Database & Schema (Days 1-2)
- [ ] Set up PostgreSQL on Vercel
- [ ] Create database migration script
- [ ] Implement schema (projects, specs, sync_logs)
- [ ] Add database connection pooling
- [ ] Test CRUD operations

### Phase 2: GitHub Sync Service (Days 3-5)
- [ ] Implement `GitHubSyncService` class
- [ ] Add Octokit integration
- [ ] Implement spec discovery (tree API)
- [ ] Implement parallel spec fetching
- [ ] Add frontmatter parsing
- [ ] Implement rate limit handling
- [ ] Add error handling and logging
- [ ] Test with real GitHub repos

### Phase 3: Database Source Integration (Day 6)
- [ ] Implement `DatabaseSource.getAllSpecs(projectId)`
- [ ] Implement `DatabaseSource.getSpec(projectId, specId)`
- [ ] Update `SpecsService` routing logic
- [ ] Add caching layer for database queries
- [ ] Test database source performance

### Phase 4: Project Management UI (Days 7-9)
- [ ] Create `/admin/projects` list page
- [ ] Create add project form with validation
- [ ] Add GitHub URL parser (extract owner/repo)
- [ ] Implement project CRUD operations
- [ ] Add sync status indicators
- [ ] Create project detail page with history
- [ ] Add manual sync trigger button
- [ ] Test project management flow

### Phase 5: Scheduled Sync (Days 10-11)
- [ ] Create Vercel Cron endpoint (`/api/cron/sync`)
- [ ] Configure `vercel.json` with cron schedule
- [ ] Implement sync job logic (iterate projects)
- [ ] Add sync queue (prevent concurrent syncs)
- [ ] Implement sync logging
- [ ] Add monitoring/alerting
- [ ] Test cron execution

### Phase 6: Multi-Project Showcase (Days 12-13)
- [ ] Create `/projects` landing page (all projects)
- [ ] Create `/projects/[id]` project view
- [ ] Add project selector in navigation
- [ ] Update board view for multi-project
- [ ] Update search to support multi-project
- [ ] Add project metadata display
- [ ] Test multi-project navigation

### Phase 7: Testing & Polish (Days 14-15)
- [ ] End-to-end testing with 3+ real repos
- [ ] Performance testing (100+ specs)
- [ ] Error scenario testing
- [ ] Rate limit testing
- [ ] UI/UX polish
- [ ] Documentation updates
- [ ] Deploy to production

## Test

### Database & Schema
- [ ] Migrations run successfully
- [ ] Can create/read/update/delete projects
- [ ] Can store and retrieve specs
- [ ] Foreign key constraints work
- [ ] Indexes improve query performance (<50ms)

### GitHub Sync Service
- [ ] Can discover specs in test repo
- [ ] Fetches all README.md files correctly
- [ ] Parses frontmatter accurately
- [ ] Handles repos with no specs gracefully
- [ ] Rate limiting works (pauses/retries)
- [ ] Parallel fetching improves performance
- [ ] Error handling logs properly
- [ ] Can sync 50+ specs in <30 seconds

### Integration
- [ ] `SpecsService` routes to correct source
- [ ] Filesystem mode still works (LeanSpec specs)
- [ ] Database mode works (external repos)
- [ ] Can switch between projects seamlessly
- [ ] Cache invalidation works correctly

### Project Management UI
- [ ] Can add new project via form
- [ ] GitHub URL validation works
- [ ] Manual sync triggers correctly
- [ ] Sync status updates in real-time
- [ ] Error messages display clearly
- [ ] Can disable/enable projects
- [ ] Can delete projects (cascades to specs)

### Scheduled Sync
- [ ] Cron job executes on schedule
- [ ] Syncs all enabled projects
- [ ] Skips disabled projects
- [ ] Logs sync results
- [ ] Handles errors gracefully
- [ ] Doesn't run concurrent syncs

### Multi-Project Showcase
- [ ] Projects list displays all repos
- [ ] Project page shows only that project's specs
- [ ] Navigation between projects works
- [ ] Search scopes to current project
- [ ] Board view shows correct project
- [ ] URLs are shareable and bookmarkable

### Performance
- [ ] Database queries <50ms
- [ ] GitHub sync <30s for typical repo
- [ ] Multi-project page loads <200ms
- [ ] No memory leaks during long syncs
- [ ] Handles 10+ projects gracefully

## Notes

### Key Design Decisions

**Why Database for External Repos?**
- GitHub API rate limits (5000 req/hour)
- API latency too high for good UX (200-500ms per file)
- Need scheduled sync, not on-demand fetching
- Enables advanced features (search across projects, analytics)

**Why PostgreSQL?**
- Vercel has native Postgres support
- Better JSONB support for frontmatter
- Scales better than SQLite for multi-project

**Sync Interval Trade-offs:**
- **5 min**: More realtime, higher API usage
- **30 min**: Balanced (recommended)
- **60 min**: Lower API usage, less fresh

**Alternative Considered: Direct GitHub API**
- Pros: No database, always fresh
- Cons: Rate limits, slow UX, no caching
- Decision: Database mode better for multi-project

### Future Enhancements (Phase 3)
- GitHub webhooks for near-realtime sync (<10s)
- Private repo support (GitHub OAuth)
- Incremental sync (only changed files)
- Cross-project search and analytics
- Featured projects and discovery feed

### Related Specs
- **082**: Dual-mode architecture foundation (complete)
- **035**: Live specs showcase vision (complete)
- **068**: Live specs UX enhancements (complete)
