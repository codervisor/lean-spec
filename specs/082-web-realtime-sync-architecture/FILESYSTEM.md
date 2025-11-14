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
