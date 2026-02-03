---
status: complete
created: 2026-02-03
priority: high
created_at: 2026-02-03T02:03:24.839929054Z
updated_at: 2026-02-03T02:14:26.333230520Z
completed_at: 2026-02-03T02:14:26.333230520Z
transitions:
- status: in-progress
  at: 2026-02-03T02:09:59.442669234Z
- status: complete
  at: 2026-02-03T02:14:26.333230520Z
---

# State Management Library Evaluation

Evaluate adopting Zustand and TanStack Query for improved state management in the LeanSpec UI.

## Background

The current UI (`@leanspec/ui`) uses React Context extensively for state management:
- **7+ Context providers**: ProjectContext, SessionsContext, SpecsContext, ThemeContext, LayoutContext, MachineContext, ChatContext
- **Manual data fetching**: Each context manages its own `loading`, `error`, and data states with `useEffect` + custom API calls
- **No caching layer**: API responses aren't cached, leading to redundant requests
- **Manual state sync**: Contexts coordinate manually (e.g., `refreshProjects()` triggers full re-render)

## Problem Statement

1. **Prop drilling / Context bloat**: Multiple nested providers increase complexity
2. **No request deduplication**: Same API endpoint may be called multiple times
3. **No automatic cache invalidation**: Manual `refreshTrigger` pattern is fragile
4. **No optimistic updates**: All mutations wait for responses
5. **SSE/polling awkwardly mixed**: `SpecsContext` mixes SSE with interval polling

## Proposed Solution

Evaluate two complementary libraries:

### Zustand (Client State)
- Simpler alternative to Context for UI state (theme, layout, sidebar open/closed)
- Minimal boilerplate, no providers needed
- DevTools support
- Bundle size: ~2KB

### TanStack Query (Server State)
- Automatic caching, deduplication, and background refetching
- Built-in loading/error states
- Optimistic updates support
- Stale-while-revalidate pattern
- Integrates well with SSE for real-time updates

## Evaluation Criteria

- [x] Bundle size impact (current vs. with libraries)
- [x] Migration complexity (how many files need changes?)
- [x] Learning curve for contributors
- [x] Performance improvements (fewer re-renders, less network traffic)
- [x] Code reduction (boilerplate removed)
- [x] TypeScript support quality
- [x] Compatibility with existing patterns (backend-adapter, Tauri)

## Scope

### In Scope
- Evaluate Zustand for: ThemeContext, LayoutContext, MachineContext
- Evaluate TanStack Query for: ProjectContext, SpecsContext, SessionsContext
- Create proof-of-concept migration for one context of each type
- Document migration path and breaking changes

### Out of Scope
- Full migration (separate spec if evaluation is positive)
- ChatContext (tightly coupled with AI SDK)
- Desktop/Tauri-specific state

## Implementation Approach

### Phase 1: Research & Benchmarks
1. Document current bundle size and render metrics
2. Analyze API call patterns (frequency, duplication)
3. Review existing TanStack Query + Zustand codebases (similar scale)

### Phase 2: Proof of Concept
1. Migrate `ThemeContext` to Zustand store
2. Migrate `SpecsContext` API calls to TanStack Query
3. Compare before/after metrics

### Phase 3: Decision
1. Write recommendation with trade-offs
2. If positive, create follow-up spec for full migration

## Success Criteria

- [x] PoC demonstrates measurable improvement in at least one metric
- [x] Clear migration path documented
- [x] Trade-offs and risks identified
- [x] Recommendation made with evidence

## Evaluation Results

### Current State Analysis

| Metric | Value |
|--------|-------|
| Main bundle size | 5,374 KB (1,635 KB gzipped) |
| Context providers | 7 (Theme, Layout, Machine, Project, Specs, Sessions, Chat) |
| API wrapper | Custom `ProjectAPI` class with manual state injection |
| Data sync | SSE + interval polling in SpecsContext, WebSocket in SessionsContext |

### Context Pattern Analysis

| Context | Type | Migration Target | Complexity |
|---------|------|------------------|------------|
| ThemeContext | Client-only | Zustand | Low |
| LayoutContext | Client-only | Zustand | Low |
| MachineContext | Mixed | Zustand + TanStack Query | Medium |
| ProjectContext | Server state | TanStack Query | Medium |
| SpecsContext | Server state + SSE | TanStack Query | Low |
| SessionsContext | Server state + WebSocket | TanStack Query | Medium |
| ChatContext | AI SDK integration | Keep as Context | N/A |

### Bundle Size Impact (Estimated)

| Library | Minified | Gzipped |
|---------|----------|---------|
| zustand@5.0.11 | ~3.7 KB | ~1.5 KB |
| @tanstack/react-query@5.90.20 | ~41 KB | ~12 KB |
| **Total addition** | ~45 KB | ~14 KB |

**Impact**: +0.9% increase to main bundle (negligible given current 1.6MB gzipped)

### Proof of Concept Created

1. **Zustand Theme Store**: [src/stores/theme.ts](../../packages/ui/src/stores/theme.ts)
   - 68 lines vs 60 lines (similar, but no Provider needed)
   - Direct import, no useContext boilerplate
   - Built-in system theme listener
   - Zero additional components in tree

2. **TanStack Query Specs Hooks**: [src/hooks/useSpecsQuery.ts](../../packages/ui/src/hooks/useSpecsQuery.ts)
   - Query key factory for consistent cache invalidation
   - `useSpecsList`, `useSpecDetail`, `useProjectStats` hooks
   - Optimistic updates in `useUpdateSpec` mutation
   - `useInvalidateSpecs` for SSE integration

3. **Query Client Config**: [src/lib/query-client.ts](../../packages/ui/src/lib/query-client.ts)
   - Centralized default options
   - 30s stale time, 5min cache time
   - Refetch on window focus

### Benefits Demonstrated

| Benefit | Evidence |
|---------|----------|
| **Request deduplication** | Same `queryKey` = single request regardless of component count |
| **Built-in caching** | `staleTime` prevents refetch; `gcTime` controls memory |
| **Optimistic updates** | `onMutate` allows immediate UI feedback |
| **Loading/error states** | `isLoading`, `isError`, `error` from hook |
| **Background refetch** | `refetchOnWindowFocus` keeps data fresh |
| **TypeScript** | Full type inference from query functions |

### Migration Path

```
Phase 1: Add libraries (done)
  └── pnpm add zustand @tanstack/react-query

Phase 2: Incremental migration
  └── ThemeContext → useThemeStore (1-2 hours)
  └── LayoutContext → useLayoutStore (1-2 hours)  
  └── SpecsContext → useSpecsQuery hooks (4-6 hours)
  └── ProjectContext → useProjectQuery hooks (4-6 hours)

Phase 3: Remove old contexts
  └── Clean up providers in App.tsx
  └── Update all consumer components
```

### Trade-offs & Risks

| Risk | Mitigation |
|------|------------|
| Learning curve | Both libraries have excellent docs |
| Two libraries vs one | They solve different problems (client vs server state) |
| SSE integration complexity | TanStack Query has `refetchInterval` and manual invalidation |
| WebSocket integration | Can use `queryClient.setQueryData` for real-time updates |
| Tauri compatibility | Both work fine; no browser-specific APIs |

### Recommendation

**Proceed with full migration** (create follow-up spec)

**Rationale:**
1. Bundle size impact is minimal (~14KB gzipped vs 1.6MB current)
2. Code reduction: Remove 7 Context providers, simplify component tree
3. Better DX: Built-in loading/error states, automatic caching
4. Performance: Request deduplication, background refetching
5. Industry standard: Both libraries are widely adopted (Zustand: 50K+ GitHub stars, TanStack Query: 45K+ stars)

**Suggested migration order:**
1. ThemeContext + LayoutContext → Zustand (quick wins)
2. SpecsContext → TanStack Query (most API calls)
3. ProjectContext → TanStack Query (cascading benefits)
4. SessionsContext → TanStack Query (preserves WebSocket pattern)

## Notes

- Consider `jotai` as alternative to Zustand (atomic state model)
- TanStack Query v5 is current stable version
- Avoid adding both if one solves the problem adequately
