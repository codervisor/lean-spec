---
status: planned
created: '2025-12-05'
tags:
  - ui
  - ux
  - feature
priority: medium
created_at: '2025-12-05T03:19:35.444Z'
depends_on:
  - 134-ui-metadata-editing
updated_at: '2025-12-05T03:19:35.470Z'
---

# Dependencies Editor Component for UI

> **Status**: 🗓️ Planned · **Priority**: Medium · **Created**: 2025-12-05 · **Tags**: ui, ux, feature

## Overview

Add inline dependencies editor to `@leanspec/ui` allowing users to add/remove spec dependencies (`depends_on`) directly from the spec detail view. Extracted from [spec 134](../134-ui-metadata-editing/) to track separately.

### Problem

Currently, managing spec dependencies requires:
1. Opening the spec file in a code editor
2. Editing YAML frontmatter manually (`depends_on:` array)
3. Or using CLI: `lean-spec link <spec> --depends-on <other>`

This friction slows down common workflows like linking related work during planning.

### Solution

Add a `DependenciesEditor` component to the spec detail header, following the existing patterns from `TagsEditor`, `StatusEditor`, and `PriorityEditor`. The editor will:

- Display current `depends_on` specs as clickable chips/badges
- Provide "X" button to remove dependencies
- Offer "+" button to open a spec picker dropdown
- Show spec name + status badge in dropdown for context
- Prevent circular dependencies (can't depend on specs that depend on this)

### Non-Goals

- Editing `related` relationships (different semantics, can be phase 2)
- Bulk dependency editing across multiple specs
- Visual dependency graph editing (use dedicated `/dependencies` page)

## Design

### API Layer

**New API Route**: `PATCH /api/specs/[id]/dependencies` (or extend existing metadata route)

```typescript
// Option A: Dedicated route
// app/api/specs/[id]/dependencies/route.ts
interface DependencyUpdateRequest {
  add?: string[];     // Spec IDs/names to add as dependencies
  remove?: string[];  // Spec IDs/names to remove from dependencies
}

// Option B: Extend existing metadata route
// Already exists: PATCH /api/specs/[id]/metadata
interface MetadataUpdateRequest {
  status?: string;
  priority?: string;
  tags?: string[];
  dependsOn?: string[];  // Add full replacement
}
```

**Recommendation**: Use Option B (extend metadata route) for consistency with other editors.

### Backend Service

Leverage existing CLI integration pattern from spec 134:

```typescript
// lib/specs/updater.ts
export async function updateSpecDependencies(
  specId: string, 
  add?: string[], 
  remove?: string[]
) {
  // Add new dependencies
  if (add?.length) {
    await exec(`lean-spec link ${specId} --depends-on ${add.join(',')}`);
  }
  // Remove dependencies  
  if (remove?.length) {
    await exec(`lean-spec unlink ${specId} --depends-on ${remove.join(',')}`);
  }
}
```

### UI Component

**New Component**: `dependencies-editor.tsx`

```tsx
interface DependenciesEditorProps {
  specId: string;
  currentDependencies: string[];  // Current depends_on spec names
  allSpecs: Array<{ id: string; specNumber: number; title: string; status: string }>;
  projectId?: string;
  onUpdate?: (newDeps: string[]) => void;
}
```

**Component Structure**:
1. **Display Mode**: Show dependencies as `Badge` components with "X" remove button
2. **Add Mode**: Popover with searchable `Command` dropdown (Cmdk pattern)
3. **Dropdown Items**: Show `#NNN Title` with `StatusBadge` for each spec
4. **Filtering**: Exclude self, existing deps, and specs that would create cycles

### Integration Point

Add to `spec-detail-client.tsx` header alongside existing editors:

```tsx
// After TagsEditor
<DependenciesEditor
  specId={spec.specNumber?.toString() || spec.id}
  currentDependencies={spec.relationships?.dependsOn || []}
  allSpecs={allSpecs} // Need to pass from parent or fetch
  projectId={projectId}
/>
```

### State Management

Follow existing pattern from `TagsEditor`:
- Optimistic updates with rollback on error
- Toast notifications for success/failure
- Loading spinner during API call

## Plan

### Phase 1: API & Backend
- [ ] Extend metadata API route to handle `dependsOn` updates
- [ ] Add `updateSpecDependencies` service function
- [ ] Handle both filesystem mode and project mode

### Phase 2: UI Component
- [ ] Create `DependenciesEditor` component following `TagsEditor` pattern
- [ ] Implement searchable spec picker dropdown
- [ ] Add remove button functionality
- [ ] Show spec status in dropdown for context

### Phase 3: Integration
- [ ] Add to `spec-detail-client.tsx` header
- [ ] Add to `editable-spec-metadata.tsx` card
- [ ] Pass allSpecs data (may need API adjustment)

### Phase 4: Polish
- [ ] Circular dependency prevention
- [ ] Keyboard navigation (Enter/Escape)
- [ ] Loading and error states
- [ ] Accessibility (ARIA labels)

## Test

**API Tests**
- [ ] Adding dependency updates frontmatter correctly
- [ ] Removing dependency updates frontmatter correctly  
- [ ] Non-existent spec returns 404
- [ ] Invalid spec ID returns validation error

**UI Tests**
- [ ] Clicking "+" opens spec picker dropdown
- [ ] Selecting spec adds to dependencies list
- [ ] Clicking "X" removes dependency
- [ ] Optimistic update shows immediately
- [ ] Error triggers rollback and toast

**Edge Cases**
- [ ] Circular dependency prevention works (A→B→A blocked)
- [ ] Self-dependency blocked
- [ ] Empty dependencies handled correctly
- [ ] Adding duplicate is idempotent
- [ ] Works in both filesystem and multi-project mode

## Notes

### Related Components

| Component | Status | Description |
|-----------|--------|-------------|
| `StatusEditor` | ✅ Complete | Dropdown for status changes |
| `PriorityEditor` | ✅ Complete | Dropdown for priority changes |
| `TagsEditor` | ✅ Complete | Tag chips with add/remove |
| `DependenciesEditor` | 🗓️ This spec | Dependency chips with add/remove |

### Data Flow Consideration

The spec detail page currently receives `relationships.dependsOn` but doesn't have access to the full specs list for the picker dropdown. Options:

1. **Fetch on demand**: When picker opens, fetch specs list
2. **Pass from parent**: Sidebar already has specs list, bubble up
3. **SWR cache**: Reuse cached specs from sidebar

**Recommendation**: Option 1 (fetch on demand) keeps component self-contained.

### Related Specs

- [134-ui-metadata-editing](../134-ui-metadata-editing/) - Parent spec, provides patterns
- [137-ui-dependencies-page](../137-ui-dependencies-page/) - Shows dependencies in graph view
- [138-ui-dependencies-dual-view](../138-ui-dependencies-dual-view/) - DAG + network views
- [085-cli-relationship-commands](../085-cli-relationship-commands/) - CLI `link`/`unlink` commands
