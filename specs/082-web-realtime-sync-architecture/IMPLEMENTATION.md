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
