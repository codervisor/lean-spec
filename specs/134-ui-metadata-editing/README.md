---
status: complete
created: '2025-11-28'
tags:
  - ui
  - ux
  - feature
  - dx
priority: medium
created_at: '2025-11-28T05:14:14.341Z'
updated_at: '2025-12-05T03:22:43.085Z'
depends_on:
  - 085-cli-relationship-commands
  - 137-ui-dependencies-page
transitions:
  - status: in-progress
    at: '2025-12-05T03:05:06.635Z'
  - status: complete
    at: '2025-12-05T03:22:43.085Z'
completed_at: '2025-12-05T03:22:43.085Z'
completed: '2025-12-05'
---

# UI Lightweight Metadata Editing

> **Status**: ✅ Complete · **Priority**: Medium · **Created**: 2025-11-28 · **Tags**: ui, ux, feature, dx

**Project**: lean-spec  
**Team**: Core Development

## Overview

Enable quick metadata edits (status, priority, tags, assignee) directly in `@leanspec/ui` without requiring a code editor or CLI.

### Problem

Currently, changing spec metadata requires:
1. Opening the spec file in an editor
2. Editing YAML frontmatter manually
3. Or using CLI: `lean-spec update <spec> --status in-progress`

This friction slows down common workflows like updating status during standup or triaging specs.

### Solution

Add inline editing controls for metadata fields in the spec detail view:
- **Status**: Dropdown selector (planned → in-progress → complete → archived)
- **Priority**: Dropdown selector (low, medium, high, critical)
- **Tags**: Tag input with autocomplete from existing tags
- **Assignee**: Text input or dropdown from known assignees

> **Note**: Dependencies editing moved to [Spec 146](../146-dependencies-editor-ui/) for separate tracking.

### Non-Goals

- Full markdown/content editing (requires code editor complexity)
- Creating new specs (use CLI or future dedicated form)
- Bulk editing multiple specs at once

## Design

### API Layer

**New API Route**: `POST /api/specs/[id]/metadata`

```typescript
// app/api/specs/[id]/metadata/route.ts
interface MetadataUpdateRequest {
  status?: 'planned' | 'in-progress' | 'complete' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  assignee?: string;
  dependsOn?: string[];  // Spec IDs to depend on
}
```

**New API Route for Dependencies**: `POST /api/specs/[id]/dependencies`

```typescript
// app/api/specs/[id]/dependencies/route.ts
interface DependencyUpdateRequest {
  add?: string[];     // Spec IDs to add as dependencies
  remove?: string[];  // Spec IDs to remove from dependencies
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { add, remove } = await req.json();
  // Validate spec IDs exist
  // Call lean-spec link/unlink commands
  // Return updated spec with new dependencies
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const updates = await req.json();
  // Validate updates
  // Call spec-updater service
  // Return updated spec
}
```

### Backend Service

**Option A: CLI Integration** (Recommended for MVP)
```typescript
// lib/specs/updater.ts
import { exec } from 'child_process';

export async function updateSpecMetadata(specId: string, updates: MetadataUpdateRequest) {
  const args = [];
  if (updates.status) args.push(`--status ${updates.status}`);
  if (updates.priority) args.push(`--priority ${updates.priority}`);
  if (updates.tags) args.push(`--tags ${updates.tags.join(',')}`);
  
  await exec(`lean-spec update ${specId} ${args.join(' ')}`);
}
```

**Dependency Updates via CLI**:
```typescript
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

**Option B: Direct Frontmatter Manipulation**
```typescript
import matter from 'gray-matter';
import { writeFile, readFile } from 'fs/promises';

export async function updateSpecMetadata(specPath: string, updates: MetadataUpdateRequest) {
  const content = await readFile(specPath, 'utf-8');
  const { data, content: body } = matter(content);
  
  const updated = { ...data, ...updates, updated_at: new Date().toISOString() };
  const newContent = matter.stringify(body, updated);
  
  await writeFile(specPath, newContent);
}
```

**Recommendation**: Start with Option A (CLI) for consistency with existing tooling, migrate to Option B for performance if needed.

### UI Components

**1. Status Selector** (`spec-status-editor.tsx`)
```tsx
interface StatusEditorProps {
  specId: string;
  currentStatus: string;
  onUpdate: (newStatus: string) => void;
}
```
- Dropdown with status options
- Color-coded badges matching existing `StatusBadge`
- Optimistic update with rollback on error

**2. Priority Selector** (`spec-priority-editor.tsx`)
- Similar dropdown pattern
- Uses existing `PriorityBadge` styling

**3. Tags Editor** (`spec-tags-editor.tsx`)
- Multi-select input with autocomplete
- Shows existing tags across all specs
- Add/remove individual tags

**4. Inline Edit Wrapper** (`inline-edit.tsx`)
- Generic wrapper for edit mode toggle
- Shows view mode by default, click to edit
- Save/Cancel buttons or click-outside to save

**5. Dependencies Editor** (`spec-dependencies-editor.tsx`)
```tsx
interface DependenciesEditorProps {
  specId: string;
  currentDependencies: string[];  // Current depends_on spec IDs
  allSpecs: Spec[];               // All specs for picker dropdown
  onUpdate: (add: string[], remove: string[]) => void;
}
```
- Display current dependencies as chips/badges
- "X" button to remove each dependency
- "+" button opens spec picker dropdown
- Spec picker shows searchable list of all specs (excluding self and existing deps)
- Shows spec name + status badge in dropdown for context
- Prevents circular dependencies (can't depend on specs that depend on this)

### Integration Point

Modify `spec-metadata.tsx` to include edit controls:

```tsx
// Current: read-only display
<StatusBadge status={spec.status} />

// New: editable with permission
<StatusEditor 
  specId={spec.id} 
  currentStatus={spec.status}
  editable={!isReadOnly}
/>
```

### State Management

Use React Query or SWR for:
- Optimistic updates (immediate UI feedback)
- Automatic cache invalidation
- Error handling with rollback

```tsx
const mutation = useMutation({
  mutationFn: (updates) => updateSpecMetadata(specId, updates),
  onMutate: async (updates) => {
    // Optimistic update
    queryClient.setQueryData(['spec', specId], (old) => ({
      ...old,
      ...updates
    }));
  },
  onError: (err, updates, context) => {
    // Rollback on error
    queryClient.setQueryData(['spec', specId], context.previousSpec);
    toast.error('Failed to update spec');
  },
  onSuccess: () => {
    toast.success('Spec updated');
  }
});
```

### Security Considerations

**Filesystem Mode** (default):
- No authentication needed (local user already has file access)
- Validate inputs to prevent path traversal

**Database Mode** (future multi-tenant):
- Require authentication
- Check project membership
- Audit log for changes

## Plan

### Phase 1: API & Backend ✅
- [x] Create `PATCH /api/specs/[id]/metadata` route
- [x] Implement `updateSpecMetadata` service using @leanspec/core
- [x] Add input validation (status, priority, tags, assignee)
- [x] Handle errors gracefully

### Phase 2: UI Components ✅
- [x] Create `StatusEditor` component with dropdown
- [x] Create `PriorityEditor` component
- [x] Create `TagsEditor` with add/remove
- [x] Integrate editors into `spec-detail-client.tsx`

> **Note**: `DependenciesEditor` moved to [Spec 146](../146-dependencies-editor-ui/)

### Phase 3: State & UX ✅
- [x] Implement optimistic updates with rollback
- [x] Add loading states and error handling
- [x] Toast notifications for errors (inline display)

### Phase 4: Polish
- [x] Keyboard navigation (Enter/Escape in TagsEditor)
- [x] Basic accessibility (button labels, disabled states)

### Multi-Project Support
- [x] Project-scoped metadata API route

## Test

**API Tests**
- [ ] Valid status update returns 200 and updated spec
- [ ] Invalid status value returns 400 validation error
- [ ] Non-existent spec returns 404
- [ ] Concurrent updates don't corrupt frontmatter

**UI Tests**
- [ ] Clicking status badge opens dropdown
- [ ] Selecting new status triggers API call
- [ ] Optimistic update shows immediately
- [ ] Error triggers rollback and toast

**Integration Tests**
- [ ] Update via UI reflects in filesystem
- [ ] CLI can read changes made via UI
- [ ] Frontmatter structure remains valid

**Edge Cases**
- [ ] Empty tags array handled correctly
- [ ] Very long assignee names truncated
- [ ] Special characters in tags escaped properly
- [ ] Circular dependency prevention works correctly
- [ ] Removing last dependency leaves empty array (not undefined)
- [ ] Adding same dependency twice is idempotent

## Notes

### Why Not a Full Editor?

| Approach | Bundle Size | Complexity | Use Cases Covered |
|----------|-------------|------------|-------------------|
| **Metadata only** | +5KB | Low | 80% of quick edits |
| **Monaco Editor** | +500KB | High | 100% but overkill |
| **CodeMirror** | +200KB | Medium | 100% but complex |

Metadata editing covers the common workflow: updating status during standups, adding tags for organization, changing priority during triage.

### Future Extensions

- **Bulk status update**: Select multiple specs, change status together
- **Quick actions**: "Mark complete" button in list view
- **Keyboard shortcuts**: `s` to change status, `p` for priority
- **Audit trail**: Show who changed what and when

### Related Specs

- **Spec 131**: Project context visibility (read-only complement)
- **Spec 107**: UI/UX refinements (design patterns)
- **Spec 017**: VS Code extension (full editing capability)
- **Spec 137-138**: Dependencies visualization (shows deps, this spec enables editing them)
- **Spec 085**: CLI relationship commands (`link`/`unlink` that backend will invoke)
