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
