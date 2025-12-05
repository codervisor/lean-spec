---
status: planned
created: '2025-12-05'
tags:
  - refactoring
  - architecture
  - multi-project
  - tech-debt
  - ui
  - maintainability
priority: high
created_at: '2025-12-05T07:00:41.655Z'
depends_on:
  - 149-ui-multi-project-improvements
  - 142-multi-project-mode-fixes
  - 141-multi-project-management-ui-improvements
  - 109-local-project-switching
---

# Multi-Project Architecture Deep Refactoring

> **Status**: 📅 Planned · **Priority**: High · **Created**: 2025-12-05

## Overview

Deep refactoring to address technical debt accumulated from rapid multi-project mode implementation (specs 109, 141, 142, 149). The current implementation evolved through incremental fixes, resulting in:

- **Inconsistent data flow** between single-project and multi-project modes
- **Duplicated logic** for spec lookups, relationships, and metadata
- **Fragile state management** causing bugs on mode/project switches
- **Missing abstractions** forcing UI components to handle mode differences
- **API endpoint proliferation** with overlapping responsibilities

### Problem Evidence

Recent bug pattern across 4 specs shows systemic issues:
- Spec 142: URL routing, SSR inconsistencies, path overflow
- Spec 149: Navigation, duplicate icons, board drag-drop, dependencies not working
- Recurring theme: Code paths diverge unexpectedly between modes

### Goal

Create a unified, mode-agnostic architecture where multi-project is the default mental model, with single-project as a special case (1 project).

## Design

### Current Architecture Problems

```
┌─────────────────────────────────────────────────────────────┐
│ CURRENT: Parallel Code Paths (Source of Bugs)              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Single-Project Mode          Multi-Project Mode            │
│  ──────────────────          ───────────────────            │
│  /specs/* routes             /projects/[id]/* routes        │
│  filesystem-source.ts        multi-project-source.ts        │
│  getSpecs()                  getSpecsWithMetadata(projId)   │
│  getSpec(id)                 getSpecById(projId, specId)    │
│  Full relationships ✓        Partial relationships ⚠️       │
│  SSR ✓                       Mixed SSR/CSR ⚠️               │
│                                                              │
│  Components branch on mode → duplicated logic, missed cases │
└─────────────────────────────────────────────────────────────┘
```

### Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ TARGET: Unified Project-Centric Architecture                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ProjectContext (single source of truth)                    │
│  ├── currentProject: Project | null                         │
│  ├── projects: Project[]                                    │
│  └── mode: 'single' | 'multi' (derived, not stored)         │
│                                                              │
│  SpecsService (project-scoped, mode-agnostic)               │
│  ├── getSpecs(projectId): Spec[]                            │
│  ├── getSpec(projectId, specId): Spec                       │
│  ├── getRelationships(projectId, specId): Relationships     │
│  └── updateSpec(projectId, specId, updates): Spec           │
│                                                              │
│  Routes: Always /projects/[id]/* (single uses default id)   │
│  API: /api/projects/[id]/* (unified endpoints)              │
│  Components: Receive projectId, never check mode            │
└─────────────────────────────────────────────────────────────┘
```

### Key Refactoring Areas

#### 1. Unified Specs Service

Replace `filesystem-source.ts` + `multi-project-source.ts` with single `specs-service.ts`:

```typescript
// Current: Two sources with different APIs
// filesystem-source.ts
export async function getSpecs() { ... }
export async function getSpec(id: string) { ... }

// multi-project-source.ts  
export async function getSpecsWithMetadata(projectId: string) { ... }
export async function getSpecById(projectId: string, specId: string) { ... }

// Target: Single service, always project-scoped
class SpecsService {
  constructor(private projectRegistry: ProjectRegistry) {}
  
  async getSpecs(projectId: string): Promise<Spec[]> {
    const project = this.projectRegistry.getProject(projectId);
    return this.readSpecsFromPath(project.specsDir);
  }
  
  async getSpec(projectId: string, specId: string): Promise<SpecWithRelationships> {
    const specs = await this.getSpecs(projectId);
    const spec = specs.find(s => s.id === specId);
    return this.enrichWithRelationships(spec, specs);
  }
}
```

#### 2. Single-Project as Default Project

Instead of mode branching, treat single-project as "1 project named 'default'":

```typescript
// Current: Mode check everywhere
if (mode === 'multi-project') {
  return `/projects/${projectId}/specs`;
} else {
  return `/specs`;
}

// Target: Always project-scoped, single-project uses 'default'
const projectId = currentProject?.id ?? 'default';
return `/projects/${projectId}/specs`;

// Route handling
// /specs/* → redirect to /projects/default/*
// /projects/default/* → reads from SPECS_DIR (backward compat)
```

#### 3. Relationship Computation Consolidation

Current: Relationships computed differently in each source
Target: Single `computeRelationships()` function

```typescript
// Current problem: multi-project source skips relationship enrichment
// causing "View Dependencies" button to be disabled

// Target: Always compute relationships consistently
function computeRelationships(
  spec: Spec, 
  allSpecs: Spec[]
): SpecRelationships {
  const dependsOn = spec.frontmatter.depends_on || [];
  const requiredBy = allSpecs
    .filter(s => s.frontmatter.depends_on?.includes(spec.name))
    .map(s => s.name);
  
  return { dependsOn, requiredBy };
}
```

#### 4. URL Routing Simplification

Current: `/specs/*` and `/projects/[id]/*` with complex redirects
Target: Single route structure with smart defaults

```
app/
├── projects/
│   ├── [projectId]/
│   │   ├── layout.tsx        # Project layout (same for all)
│   │   ├── specs/
│   │   ├── dependencies/
│   │   └── stats/
│   └── page.tsx              # Projects list
├── specs/                    # Redirect to /projects/default/specs
└── middleware.ts             # Handle redirects cleanly
```

#### 5. Component Props Standardization

Current: Components receive mode flag and branch internally
Target: Components always receive projectId, never know about modes

```typescript
// Current
interface SpecBoardProps {
  specs: Spec[];
  mode: 'single' | 'multi';  // Components shouldn't know this
}

// Target
interface SpecBoardProps {
  projectId: string;
  specs: Spec[];
}
```

## Plan

### Phase 1: Unified Specs Service
- [ ] Create `specs-service.ts` with project-scoped API
- [ ] Implement consistent relationship computation
- [ ] Add comprehensive unit tests
- [ ] Migrate filesystem-source consumers

### Phase 2: Single-Project as Default
- [ ] Add 'default' project concept for single-project mode
- [ ] Update ProjectRegistry to handle default project
- [ ] Ensure backward compatibility with existing URLs

### Phase 3: Route Consolidation
- [ ] Migrate all `/specs/*` routes to `/projects/[id]/*`
- [ ] Add redirect middleware for legacy URLs
- [ ] Update all internal links to use new structure
- [ ] Verify SSR works consistently across all routes

### Phase 4: Component Cleanup
- [ ] Audit components for mode checks
- [ ] Refactor to receive projectId only
- [ ] Remove mode prop from component interfaces
- [ ] Update Storybook stories

### Phase 5: API Unification
- [ ] Consolidate duplicate API endpoints
- [ ] Ensure all endpoints use projectId parameter
- [ ] Add API documentation
- [ ] Deprecate old endpoints

### Phase 6: Testing & Documentation
- [ ] Add integration tests for mode switching
- [ ] Test URL sharing/bookmarking scenarios
- [ ] Update developer documentation
- [ ] Add architecture decision records

## Test

- [ ] Single-project mode works identically to current behavior
- [ ] Multi-project mode: all features work (board, dependencies, stats)
- [ ] Switching projects preserves expected behavior
- [ ] Deep links work: `/projects/[id]/specs/[spec]` loads correctly
- [ ] Legacy URLs (`/specs/*`) redirect correctly
- [ ] Drag-drop on board works in both modes
- [ ] "View Dependencies" works in both modes
- [ ] Metadata editing works in both modes
- [ ] No console errors during project switching
- [ ] SSR works consistently (view page source has data)

## Notes

### Why Now?

The pattern of bugs across specs 142, 149 shows diminishing returns from incremental fixes. Each fix creates more branching logic, increasing future bug probability. A unified architecture will:

1. **Reduce bug surface**: Single code path = fewer edge cases
2. **Improve maintainability**: New features work in both modes automatically
3. **Enable future work**: Desktop app (148), GitHub integration (098) need solid foundation

### Migration Strategy

1. **Feature flag**: New architecture behind `USE_UNIFIED_PROJECT_ARCH` flag
2. **Parallel operation**: Both architectures run during transition
3. **Gradual rollout**: Test internally, then enable for users
4. **Fallback**: Easy revert if issues discovered

### Breaking Changes

**Internal only** - No user-facing breaking changes:
- API endpoints maintain backward compatibility
- URL redirects handle legacy paths
- Config files remain unchanged

### Risks

| Risk | Mitigation |
|------|------------|
| Regression in single-project | Comprehensive test suite before migration |
| Performance degradation | Benchmark before/after, optimize hot paths |
| Incomplete migration | Feature flag allows gradual rollout |

### Success Metrics

- Zero mode-specific bugs in 2 weeks post-migration
- All 149 test cases pass in unified architecture
- No increase in bundle size
- Response times within 10% of current
