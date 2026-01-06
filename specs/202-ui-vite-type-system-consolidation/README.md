---
status: planned
created: 2026-01-06
priority: high
tags:
- ui-vite
- typescript
- refactoring
- tech-debt
- types
depends_on:
- 201-ui-vite-backend-adapter-migration
created_at: 2026-01-06T15:16:21.998231Z
updated_at: 2026-01-06T15:17:21.793402Z
---

# UI-Vite Type System Consolidation

> **Status**: 🗓️ Planned · **Created**: 2026-01-06 · **Priority**: High · **Tags**: ui-vite, typescript, refactoring, tech-debt, types

## Overview

**Problem**: @leanspec/ui-vite has **duplicate type definitions** and unnecessary data transformation layers. The same data is represented in three formats: `RustSpec`, `NextJsSpec`, and various intermediate shapes, requiring constant conversion via adapter functions.

**Current State**:
- Two parallel type hierarchies: `RustSpec`/`NextJsSpec`, `RustStats`/`NextJsStats`, `RustSpecDetail`/`NextJsSpecDetail`
- ~200 lines of adapter code transforming between identical formats
- Redundant fields: both `name` and `specName` exist for the same value
- Date type confusion: `string` vs `Date` objects
- Performance overhead: Every API response gets transformed unnecessarily

**Discovery**: The Rust backend **already returns camelCase** JSON that matches `RustSpec` types. The "Next.js" types were created for the old Next.js UI, but now they just add complexity without benefit.

**Goal**: Consolidate on **one canonical type system**, eliminate ~80% of adapter code, improve type safety, and reduce bundle size.

**Why Now**: While working on Spec 201 (backend adapter migration), discovered that adapter functions are duplicated and serve no real purpose. This blocks clean architecture.

## Design

### Decision: Standardize on Rust Backend Types

**Keep**: `RustSpec`, `RustSpecDetail`, `RustStats` (rename to canonical names)  
**Delete**: `NextJsSpec`, `NextJsSpecDetail`, `NextJsStats`  
**Simplify**: Keep only minimal date parsing utilities

**Rationale**:
1. Rust types are **authoritative** - they define the actual API contract
2. Already use camelCase serialization (`#[serde(rename_all = "camelCase")]`)
3. Well-typed and complete (no missing fields)
4. Maintained in one place (Rust backend types.rs)
5. No impedance mismatch between API and frontend

### Current Type Duplication

**Example: Spec Types**

```typescript
// RustSpec (actual API response)
interface RustSpec {
  id: string;
  specName: string;
  specNumber?: number | null;
  title?: string | null;
  status: SpecStatus;
  // ... 10 more fields
}

// NextJsSpec (legacy UI format - UNNECESSARY)
interface NextJsSpec {
  id: string;
  name: string;        // ❌ Duplicate of specName
  specName: string;    // ✅ Same as RustSpec
  specNumber: number | null;  // ❌ Different null handling
  title: string | null;
  status: SpecStatus | null;  // ❌ Different null handling
  // ... 10 more fields
}
```

**What adapters do**:
```typescript
function adaptSpec(rustSpec: RustSpec): NextJsSpec {
  return {
    ...rustSpec,
    name: rustSpec.specName,  // ❌ Add redundant field
    specNumber: rustSpec.specNumber ?? null,  // ❌ Convert undefined to null
    // ... more pointless transformations
  };
}
```

### Proposed Type System

**Single source of truth**:

```typescript
// packages/ui-vite/src/types/api.ts

// Rename RustSpec → Spec (it's not Rust-specific)
export interface Spec {
  id: string;
  specName: string;
  specNumber?: number | null;
  title?: string | null;
  status: SpecStatus;
  priority?: SpecPriority | null;
  tags?: string[];
  assignee?: string | null;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  filePath?: string;
  dependsOn?: string[];
  requiredBy?: string[];
  relationships?: {
    dependsOn: string[];
    requiredBy?: string[];
  };
}

export interface SpecDetail extends Spec {
  contentMd?: string;
  content?: string;
  subSpecs?: SubSpecItem[];
}

export interface Stats {
  totalProjects: number;
  totalSpecs: number;
  specsByStatus: { status: string; count: number }[];
  specsByPriority: { priority: string; count: number }[];
  completionRate: number;
  projectId?: string;
}
```

**Keep minimal date utilities** (optional, if components need Date objects):

```typescript
// packages/ui-vite/src/lib/date-utils.ts
export function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

// Use in components when needed
const createdDate = spec.createdAt ? parseDate(spec.createdAt) : null;
```

### Migration Strategy

**Phase 1: Type Renaming**
1. Rename `RustSpec` → `Spec` (canonical name)
2. Rename `RustSpecDetail` → `SpecDetail`
3. Rename `RustStats` → `Stats`
4. Mark old types as `@deprecated`

**Phase 2: Remove Adapters**
1. Delete `adaptSpec()`, `adaptSpecDetail()`, `adaptStats()`
2. Remove adapter calls from backend-adapter.ts
3. Remove adapter calls from api.ts
4. Keep only `parseDate()` utility

**Phase 3: Update Components**
1. Update all imports: `NextJsSpec` → `Spec`
2. Remove redundant field access (use `specName` not `name`)
3. Update date handling to use `parseDate()` helper
4. Test all pages

**Phase 4: Cleanup**
1. Delete `NextJsSpec`, `NextJsSpecDetail`, `NextJsStats` types
2. Remove `normalizeProjectsResponse()` (after old API is gone)
3. Remove test mocks for old types
4. Update documentation

## Plan

- [ ] **Audit all type usage** - Find everywhere NextJsSpec/RustSpec are used
- [ ] **Create type aliases** - Add deprecation warnings to old types
- [ ] **Rename canonical types** - RustSpec → Spec, RustSpecDetail → SpecDetail, RustStats → Stats
- [ ] **Remove backend-adapter adapters** - Delete adaptSpec/adaptSpecDetail/adaptStats calls
- [ ] **Remove api.ts adapters** - Delete adapter function calls
- [ ] **Create date-utils.ts** - Extract minimal parseDate() helper
- [ ] **Update all components** (18 files) - Change imports and field access
- [ ] **Update backend-adapter interface** - Use canonical types in BackendAdapter interface
- [ ] **Run type checks** - `pnpm -C packages/ui-vite typecheck`
- [ ] **Test all pages** - Manual verification
- [ ] **Update tests** - Fix broken test mocks
- [ ] **Delete deprecated types** - Remove NextJsSpec, NextJsSpecDetail, NextJsStats
- [ ] **Delete adapter functions** - Remove adaptSpec(), adaptSpecDetail(), adaptStats()
- [ ] **Measure bundle size** - Verify reduction
- [ ] **Update documentation** - Document canonical type system

## Test

**Type Safety**:
- [ ] `pnpm -C packages/ui-vite typecheck` passes with no errors
- [ ] No references to deprecated types remain
- [ ] All components import from canonical types

**Runtime Verification**:
- [ ] Dashboard displays specs correctly (check `specName` field access)
- [ ] Spec detail page shows all metadata
- [ ] Date fields display correctly (created, updated, completed)
- [ ] Status and priority badges work
- [ ] Tags display correctly
- [ ] Dependencies show correct relationships
- [ ] Search results format correctly
- [ ] Stats page calculations correct

**Unit Tests**:
- [ ] `pnpm -C packages/ui-vite test` passes
- [ ] Test mocks use canonical types
- [ ] Date parsing utility has tests

**Performance**:
- [ ] Bundle size decreased (measure before/after)
- [ ] No runtime errors in console
- [ ] API response handling is faster (no transformation overhead)

## Notes

### Type Usage Audit

**Files using NextJsSpec** (need updates):
- `src/lib/api.ts` - Type exports and adapter functions
- `src/lib/backend-adapter.ts` - Interface types
- `src/pages/StatsPage.tsx`
- `src/pages/SpecsPage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/components/SpecsNavSidebar.tsx`
- `src/components/QuickSearch.tsx`
- `src/components/metadata-editors/StatusEditor.tsx`
- `src/components/metadata-editors/TagsEditor.tsx`
- `src/components/metadata-editors/PriorityEditor.tsx`
- `src/components/specs/ListView.tsx`
- `src/components/specs/BoardView.tsx`
- `src/components/dashboard/SpecListItem.tsx`
- Plus type-only imports in ~5 more files

**Files using RustSpec** (already correct):
- `src/types/api.ts` - Type definitions
- Some adapter functions in api.ts

### Redundant Fields to Remove

**After migration, these redundant patterns disappear**:

| Redundant Pattern         | Canonical Field   | Why It Existed                 |
| ------------------------- | ----------------- | ------------------------------ |
| `spec.name`               | `spec.specName`   | Next.js UI wanted both         |
| `spec.specNumber ?? null` | `spec.specNumber` | Different null handling        |
| `spec.status ?? null`     | `spec.status`     | Inconsistent optionality       |
| Date conversion           | ISO string        | Components can parse on-demand |

### Adapter Functions to Delete

**Current adapters** (~200 lines total):
- ❌ `adaptSpec()` - Adds redundant `name` field
- ❌ `adaptSpecDetail()` - Same + handles sub-specs
- ❌ `adaptStats()` - Just passes through unchanged
- ❌ `adaptProject()` - Adds defaults that should be backend's job
- ⚠️  `normalizeProjectsResponse()` - Keep temporarily for migration
- ❌ `adaptContextFileListItem()` - Just parses one date
- ❌ `adaptContextFileContent()` - Adds token count (move to component)

**Keep these utilities**:
- ✅ `extractSpecNumber()` - Useful string parsing
- ✅ `calculateCompletionRate()` - Business logic
- ✅ `toDateOrNull()` → rename to `parseDate()`
- ✅ `estimateTokenCount()` - Useful for context display

### Breaking Changes

**None!** This is a **non-breaking refactor** because:
1. Old type names can remain as aliases during migration
2. Field names stay the same (just stop adding `name` field)
3. Components already handle optional fields
4. Date strings work everywhere Date objects work

**Migration path**:
```typescript
// Step 1: Add aliases (non-breaking)
export type NextJsSpec = Spec;  // @deprecated
export type RustSpec = Spec;

// Step 2: Update components gradually
// (both old and new imports work)

// Step 3: Remove aliases once all updated
```

### Estimated Impact

**Code deletion**: ~200 lines of adapter code  
**Bundle size reduction**: ~5-10KB (minified)  
**Type safety improvement**: Eliminates dual type system confusion  
**Maintenance reduction**: One source of truth for API types  
**Performance**: Eliminates unnecessary object transformations on every API call

### Related Specs

**Depends on**:
- 201-ui-vite-backend-adapter-migration (adapter layer must be stable first)

**Enables**:
- Cleaner API layer in backend-adapter
- Easier Tauri integration (no format juggling)
- Better TypeScript inference

**Part of**: UI-Vite architecture cleanup and tech debt reduction
