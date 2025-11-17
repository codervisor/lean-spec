---
status: complete
created: '2025-11-16'
tags:
  - web
  - performance
  - ux
  - v0.3
priority: high
created_at: '2025-11-16T13:27:26.767Z'
updated_at: '2025-11-17T01:09:49.197Z'
completed_at: '2025-11-17T01:09:49.197Z'
completed: '2025-11-17'
transitions:
  - status: complete
    at: '2025-11-17T01:09:49.197Z'
---

# Web App Navigation Performance Optimization

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-16 · **Tags**: web, performance, ux, v0.3

**Project**: lean-spec  
**Team**: Core Development

## Overview

**The Problem**: Navigating between specs and sub-specs on https://lean-spec-web.vercel.app feels slow (600ms-1.2s per navigation), creating a sluggish user experience that undermines the "realtime" feel we want for v0.3.

**Root Cause**: The spec detail page (`/specs/[id]`) uses full server-side rendering with `export const dynamic = 'force-dynamic'`, meaning every navigation:

1. Makes a full page server request (no client-side navigation)
2. Triggers filesystem reads even with 60s cache (cold starts: ~500ms-1s)
3. Fetches ALL specs for sidebar on every page load
4. Parses markdown on server for every render
5. No prefetching, no client-side caching, no optimistic UI

**Why It Matters**: 
- Users navigate between specs frequently during spec review/writing
- Slow navigation breaks flow state and creates frustration
- Competitive apps (Notion, Linear, GitHub) feel instant (<100ms)
- Critical for v0.3 launch credibility

**What We Need**: Hybrid rendering architecture that achieves:
- **Initial load**: Server-rendered for SEO and fast first paint (~200ms)
- **Subsequent navigation**: Client-side transitions (<100ms)
- **Data fetching**: API routes with aggressive caching and prefetching
- **Optimistic UI**: Instant feedback while data loads in background

## Design

### Current Architecture (Slow)

```
User clicks spec → Full page request → Vercel serverless function
                                       ↓
                                    Cold start (~500ms)
                                       ↓
                                    Filesystem read (~50-100ms)
                                       ↓
                                    Load ALL specs for sidebar (~50ms)
                                       ↓
                                    Parse markdown (~50-100ms)
                                       ↓
                                    Server render HTML
                                       ↓
                                    Send to client
                                       ↓
                                    Client hydrates
                                       
Total: 600ms-1.2s per navigation 😱
```

### Target Architecture (Fast)

```
Initial Load (Server-Rendered):
  User → Server → Filesystem → Parse → HTML (200ms)
  
Subsequent Navigation (Client-Side):
  User clicks → Client state update (instant)
            ↓
            Check cache → Hit? Render immediately (<50ms)
            ↓
            Miss? → API request → Response (~100ms)
            ↓
            Background: Prefetch adjacent specs
            
Total: <100ms per navigation ✨
```

### Three-Tier Optimization Strategy

**Tier 1: Route Segment Config (Immediate - 30 min)**
```tsx
// packages/web/src/app/specs/[id]/page.tsx
export const revalidate = 60; // Cache rendered pages for 60s
export const dynamicParams = true; // Generate new pages on demand
```

**Impact**: 50-70% faster for repeat visits to same spec
**Trade-off**: Stale data for up to 60s (acceptable given filesystem cache is also 60s)

**Tier 2: Hybrid Rendering (Primary - 1-2 days)**

Split page into server + client components:

```tsx
// Server component (initial load only)
export default async function SpecDetailPage({ params }) {
  const [spec, allSpecs] = await Promise.all([
    getSpecById(id),
    getSpecs() // For sidebar
  ]);
  
  return (
    <SpecDetailClient 
      initialSpec={spec}
      initialSpecs={allSpecs}
    />
  );
}

// Client component (handles all navigation)
'use client';
function SpecDetailClient({ initialSpec, initialSpecs }) {
  const [currentSpec, setCurrentSpec] = useState(initialSpec);
  const [currentSubSpec, setCurrentSubSpec] = useState<string | null>(null);
  
  // Client-side cache with SWR
  const { data: spec, isLoading } = useSWR(
    `/api/specs/${currentSpec.id}`,
    { fallbackData: currentSpec, revalidateOnFocus: false }
  );
  
  // Prefetch on hover
  const prefetchSpec = (specId: string) => {
    fetch(`/api/specs/${specId}`); // Warm cache
  };
  
  // Instant sub-spec switching (no network)
  const switchSubSpec = (fileName: string) => {
    setCurrentSubSpec(fileName); // Instant UI update
  };
  
  return (
    <div>
      <SpecsNavSidebar 
        specs={initialSpecs}
        onSpecHover={prefetchSpec}
        onSpecClick={(id) => {
          setCurrentSpec(specs.find(s => s.id === id)!);
          router.push(`/specs/${id}`, { scroll: false });
        }}
      />
      
      <SubSpecTabs
        subSpecs={spec.subSpecs}
        current={currentSubSpec}
        onChange={switchSubSpec} // Instant
      />
      
      <MarkdownContent content={currentContent} />
    </div>
  );
}
```

**Key Changes:**
1. **API routes** for data fetching (not in page component)
2. **SWR** for client-side caching with stale-while-revalidate
3. **Prefetching** on sidebar hover (warm cache before click)
4. **Optimistic UI** for sub-spec switching (instant, no network)
5. **Shallow routing** (`scroll: false`) to avoid full page loads

**Tier 3: Advanced Optimizations (Future - 2-3 days)**

1. **React Query** (more powerful than SWR)
   - Automatic background refetching
   - Optimistic updates
   - Mutation support for future edit features
   
2. **Virtual scrolling** for sidebar (if >100 specs)
   
3. **Service worker caching** for offline support

### API Routes Design

```typescript
// packages/web/src/app/api/specs/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const spec = await getSpecById(id);
  
  return NextResponse.json({ spec }, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
    }
  });
}

// packages/web/src/app/api/specs/[id]/subspecs/[file]/route.ts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; file: string }> }
) {
  const { id, file } = await params;
  const spec = await getSpecById(id);
  const subSpec = spec?.subSpecs?.find(s => s.file === file);
  
  return NextResponse.json({ subSpec }, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
    }
  });
}
```

### Performance Targets

| Metric | Current | Tier 1 | Tier 2 | Tier 3 |
|--------|---------|--------|--------|--------|
| **Initial Page Load** | ~600ms | ~300ms | ~200ms | ~150ms |
| **Same Spec (Cached)** | ~600ms | ~100ms | ~50ms | ~10ms |
| **Different Spec** | ~800ms | ~400ms | ~100ms | ~50ms |
| **Sub-Spec Switch** | ~600ms | ~600ms | **~10ms** | **~5ms** |
| **Prefetched Spec** | ~800ms | ~400ms | **~50ms** | **~10ms** |
| **Cold Start Penalty** | Yes (500ms) | Yes | Yes | Yes |

**Success Criteria:**
- ✅ Sub-spec navigation feels instant (<50ms perceived)
- ✅ Spec navigation <100ms for cached/prefetched
- ✅ Initial load still fast (<300ms)
- ✅ No degradation in SEO or accessibility
- ✅ Memory usage remains reasonable (<50MB client cache)

## Plan

### Phase 1: Tier 1 - Quick Cache Config (Day 1 - 1-2 hours)

**Goal**: Test route segment caching to validate approach

- [ ] Add `revalidate: 60` to spec detail page
- [ ] Add `dynamicParams: true` for on-demand generation
- [ ] Deploy to Vercel staging
- [ ] Measure performance with Chrome DevTools
- [ ] Document improvement (expect 50-70% on repeat visits)
- [ ] If successful, proceed to Tier 2; if minimal gain, skip Tier 1

### Phase 2: Tier 2 - Hybrid Rendering (Days 2-3 - 2 days)

**Day 2: API Routes + Client Components**
- [ ] Create API route: `GET /api/specs/[id]`
- [ ] Create API route: `GET /api/specs/[id]/subspecs/[file]`
- [ ] Add cache headers (`s-maxage=60, stale-while-revalidate=120`)
- [ ] Split `SpecDetailPage` into server + client components
- [ ] Install SWR: `pnpm add swr`
- [ ] Implement `SpecDetailClient` with SWR caching
- [ ] Test API routes return correct data

**Day 3: Prefetching + Optimistic UI**
- [ ] Add hover prefetch to `SpecsNavSidebar`
- [ ] Implement instant sub-spec switching (no network)
- [ ] Add loading states (skeleton) for slow connections
- [ ] Add error boundaries for failed fetches
- [ ] Update routing to use shallow navigation
- [ ] Test navigation feels instant (<100ms)

### Phase 3: Performance Testing (Day 4 - 1 day)

**Benchmarking:**
- [ ] Initial page load time (target: <300ms)
- [ ] Sub-spec switch time (target: <50ms)
- [ ] Spec navigation (cached) (target: <100ms)
- [ ] Spec navigation (prefetched) (target: <100ms)
- [ ] Cold start penalty on Vercel (measure only)
- [ ] Memory usage after 50 navigations (<50MB)

**Real-World Testing:**
- [ ] Test on slow 3G connection
- [ ] Test with 100+ specs (sidebar performance)
- [ ] Test browser back/forward buttons work
- [ ] Test deep linking to sub-specs works
- [ ] Test SEO still works (view-source shows content)

### Phase 4: Deployment (Day 5 - 0.5 days)

- [ ] Deploy to Vercel staging
- [ ] Run Lighthouse audit (target: 90+ performance)
- [ ] Test on mobile devices
- [ ] Verify no regressions in functionality
- [ ] Deploy to production
- [ ] Monitor Vercel analytics for improvements

### Phase 5: Tier 3 - Advanced (Future - Optional)

- [ ] Replace SWR with React Query (if needed)
- [ ] Add virtual scrolling to sidebar (if >100 specs)
- [ ] Add service worker for offline caching
- [ ] Measure sub-10ms navigation times

## Test

### Performance Testing

**Automated Benchmarks:**
```bash
# Run Lighthouse CI
pnpm test:lighthouse

# Custom performance tests
pnpm test:perf
```

**Manual Testing Checklist:**

**Initial Load (Server-Rendered):**
- [ ] Spec detail page loads in <300ms (Fast 3G)
- [ ] Content visible before JavaScript loads
- [ ] SEO tags present in HTML source
- [ ] Lighthouse Performance score >90

**Client-Side Navigation:**
- [ ] Sub-spec switching feels instant (<50ms perceived)
- [ ] Spec navigation <100ms when cached
- [ ] Prefetching works (hover → faster click)
- [ ] Loading states appear for slow requests (>200ms)
- [ ] No flash of wrong content

**Browser Features:**
- [ ] Back button works correctly
- [ ] Forward button works correctly  
- [ ] Deep links to sub-specs work (`/specs/82?subspec=DESIGN.md`)
- [ ] URL updates on navigation
- [ ] Page refresh loads correct content

**Edge Cases:**
- [ ] Offline → online transition works
- [ ] Cache invalidation works (API endpoint)
- [ ] Network error shows graceful fallback
- [ ] 404 for non-existent specs
- [ ] Memory doesn't leak over 100 navigations

### Regression Testing

**Functionality:**
- [ ] All existing features work (sidebar, search, filters)
- [ ] Markdown rendering correct
- [ ] Code highlighting works
- [ ] Table of contents works
- [ ] Back to top button works

**Accessibility:**
- [ ] Keyboard navigation works
- [ ] Screen reader announces page changes
- [ ] Focus management correct
- [ ] ARIA labels correct

**SEO:**
- [ ] Meta tags correct
- [ ] Open Graph tags work
- [ ] Twitter cards work
- [ ] Structured data present

## Notes

### Performance Measurement Tools

**Chrome DevTools:**
```javascript
// Measure navigation time
performance.mark('nav-start');
// ... navigation happens
performance.mark('nav-end');
performance.measure('navigation', 'nav-start', 'nav-end');
console.log(performance.getEntriesByName('navigation')[0].duration);
```

**Real User Monitoring:**
```typescript
// Add to SpecDetailClient
useEffect(() => {
  const navigationTime = performance.now();
  analytics.track('spec_navigation', {
    specId: spec.id,
    loadTime: navigationTime,
    cached: !isLoading
  });
}, [spec.id]);
```

**Vercel Analytics:**
- Built-in Web Vitals tracking
- Real-world performance data
- Geographic distribution

### Key Design Decisions

**Why Tier 2 (Hybrid) over Tier 1 (Cache) alone?**
- Tier 1 only helps repeat visits to *same* spec
- Users navigate between *different* specs frequently  
- Tier 2 enables prefetching and client-side transitions
- Sub-spec switching needs client-side (no network round-trip)

**Why SWR over React Query?**
- Simpler API for our use case
- Smaller bundle size (~5KB vs ~13KB)
- Built-in stale-while-revalidate pattern
- Can upgrade to React Query later if needed

**Why keep server rendering?**
- SEO requires server-rendered HTML
- Fast initial load (no client JS required)
- Progressive enhancement (works without JS)
- Best of both worlds: server first load, client subsequent

**Why not ISR immediately?**
**Why not ISR?**
- Filesystem mode already has 60s caching (same benefit)
- Adds build complexity without clear win
- Cold starts acceptable with Tier 1+2 optimizations
- Can revisit if cold starts become issue
### Alternative Approaches Considered

**1. Full Static Generation (SSG)**
- **Pros**: Fastest possible (CDN cached HTML)
- **Cons**: Requires rebuild on every spec change, breaks realtime updates
- **Verdict**: ❌ Conflicts with v0.3 realtime goals

**2. Full Client-Side Rendering (CSR)**
- **Pros**: Instant navigation, simple architecture
- **Cons**: Bad SEO, slow initial load, no progressive enhancement
- **Verdict**: ❌ SEO is critical for public showcase

**3. Server Components Only (Current Approach)**
- **Pros**: Simple, SEO-friendly, no client JS
- **Cons**: Slow navigation, no caching, no prefetching
- **Verdict**: ❌ Too slow for good UX

**4. Hybrid Rendering (Chosen Approach)**
- **Pros**: SEO + fast navigation, best of both worlds
- **Cons**: More complex, requires API routes
- **Verdict**: ✅ Optimal balance

### Dependencies & Relationships

**This spec depends on:**
- Spec 082 (web-realtime-sync-architecture) - Provides filesystem source and service layer
- Existing spec detail page (`/specs/[id]/page.tsx`)
- Next.js 14+ App Router features

**This spec enables:**
- v0.3 launch with acceptable performance
- Better user experience for spec navigation
- Foundation for future features (edit, comments)

**Related specs:**
- Spec 081 (web-app-ux-redesign) - UX/UI improvements
- Spec 068 (live-specs-ux-enhancements) - Phase 2 UX work
- Spec 035 (live-specs-showcase) - Public showcase goals

### Open Questions

- [ ] What's acceptable cache size? (Start with 20 specs × 200KB = 4MB)
- [ ] Prefetch all specs on initial load? (No - only prefetch on hover)
- [ ] Virtual scroll sidebar? (Only if >100 specs becomes issue)
- [ ] React Query vs SWR? (Start with SWR, migrate if needed)

### Success Metrics

**Quantitative:**
- Navigation time: 600ms → <100ms (83% reduction)
- Sub-spec switch: 600ms → <50ms (92% reduction)
- Lighthouse Performance: Unknown → >90
- Time to Interactive: Unknown → <2s

**Qualitative:**
- Navigation feels instant (user perception)
- No more frustration during spec review sessions
- Competitive with modern web apps (Linear, Notion)
- Confidence to launch v0.3 publicly

**Business Impact:**
- Higher engagement (more specs viewed per session)
- Lower bounce rate (users don't leave due to slow navigation)
- Better first impression for new users
- Validates LeanSpec as production-ready tool
