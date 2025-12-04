---
status: planned
created: '2025-11-28'
tags:
  - ui
  - ux
  - feature
  - dx
priority: medium
created_at: '2025-11-28T05:14:14.341Z'
updated_at: '2025-11-28T05:15:08.052Z'
---

# UI Lightweight Metadata Editing

> **Status**: 🗓️ Planned · **Priority**: Medium · **Created**: 2025-11-28 · **Tags**: ui, ux, feature, dx

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

### Phase 1: API & Backend
- [ ] Create `POST /api/specs/[id]/metadata` route
- [ ] Implement `updateSpecMetadata` service using CLI
- [ ] Add input validation (zod schema)
- [ ] Handle errors gracefully

### Phase 2: UI Components
- [ ] Create `StatusEditor` component with dropdown
- [ ] Create `PriorityEditor` component
- [ ] Create `TagsEditor` with autocomplete
- [ ] Add edit mode toggle to `spec-metadata.tsx`

### Phase 3: State & UX
- [ ] Integrate React Query for mutations
- [ ] Implement optimistic updates
- [ ] Add loading states and error handling
- [ ] Toast notifications for success/failure

### Phase 4: Polish
- [ ] Keyboard navigation (Enter to save, Escape to cancel)
- [ ] Mobile-friendly touch targets
- [ ] Accessibility (ARIA labels, focus management)

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
