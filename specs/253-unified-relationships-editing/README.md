---
status: planned
created: 2026-01-29
priority: high
tags:
- ui
- ux
- mcp
- cli
- relationships
- hierarchy
- dependencies
- editing
depends_on:
- 250-structured-spec-hierarchy-management
- 252-leanspec-ui-hierarchy-support
- 134-ui-metadata-editing
parent: 250-structured-spec-hierarchy-management
created_at: 2026-01-29T13:53:10.363790Z
updated_at: 2026-01-29T13:53:27.379850Z
---

# Unified Relationships Editing UI (Optimized Experience)

## Overview

**Builds on**: [252-leanspec-ui-hierarchy-support](../252-leanspec-ui-hierarchy-support/README.md) (foundational display components)

### Problem

Spec relationships are currently fragmented across UI, CLI, and MCP:

1. **Two separate UI entrypoints** - "View Dependencies" and "View Hierarchy" buttons in spec detail are read-only and disconnected
2. **No in-UI editing** - Users must use CLI (`lean-spec link`/`set-parent`) or edit YAML frontmatter manually
3. **Hidden from AI agents** - When agents use `view` (MCP/CLI), relationship context is buried or missing, leading to poor decision-making
4. **ADO-style workflows unsupported** - Users familiar with Azure DevOps expect searchable relationship editing inline

### Solution

Create a **unified Relationships panel** that:
- Combines dependencies and hierarchy into one coherent view
- Enables ADO-style inline editing (search → select → link)
- Exposes all relationship types: `parent`, `children`, `depends_on`, `required_by`
- Integrates seamlessly with MCP/CLI for AI agent workflows
- Enhances `view` output to surface relationships prominently

### Non-Goals

- Bulk relationship editing across multiple specs (use CLI batch commands)
- Full dependency graph editing (use dedicated `/dependencies` page)
- Replacing the existing `link`/`unlink`/`set_parent` MCP tools (this complements them)

## Design

### UI: Unified Relationships Panel

**Location**: Replace separate "View Dependencies" and "View Hierarchy" buttons with single "Relationships" button.

**Panel Structure** (Dialog or slide-over):

```
┌─ Relationships ─────────────────────────────────────────┐
│                                                         │
│ 🏠 HIERARCHY                                            │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Parent:  [#168 Orchestration Platform      × ] [+]  │ │
│ │ Children: #244 Session UI  ×  #249 Sidebar  ×  [+]  │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ 🔗 DEPENDENCIES                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Depends On:   #239 Session Mgmt  ×  #243 Watch  × [+]│ │
│ │ Required By:  #251 MCP Apps  ×                   [+]│ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [Close]                                                 │
└─────────────────────────────────────────────────────────┘
```

**Interaction Patterns** (ADO-style):

1. **Click [+]** → Opens searchable spec picker dropdown
2. **Search** → Type to filter specs by number, name, or title
3. **Select** → Clicking a spec adds the relationship immediately
4. **Click [×]** → Removes the relationship with confirmation
5. **Click spec chip** → Navigates to that spec

**Relationship Types Editable**:
| Field       | Direction                       | Action                            |
| ----------- | ------------------------------- | --------------------------------- |
| Parent      | Set                             | `set_parent` / `lean-spec parent` |
| Children    | Add (sets parent on child)      | `set_parent` on target spec       |
| Depends On  | Add/Remove                      | `link`/`unlink --depends-on`      |
| Required By | Add (sets depends_on on target) | `link` on target spec             |

### MCP/CLI: Enhanced `view` Output

Make relationships **prominently visible** to AI agents:

**Current:**
```
# #244 Session UI Enhancement
Status: in-progress | Priority: high
...
```

**Proposed:**
```
# #244 Session UI Enhancement
Status: in-progress | Priority: high

## Relationships
Parent: #168 Orchestration Platform
Depends On: #239 Session Management, #243 Realtime Watch
Required By: (none)
Children: (none)

## Content
...
```

### Component Architecture

**New Components:**
1. **`RelationshipsEditor`** - Main dialog/panel component
2. **`RelationshipSection`** - Renders one relationship type
3. **`SpecSearchPicker`** - Reusable searchable dropdown

### API Changes

Extend existing `/api/specs/[id]` PATCH:

```typescript
interface SpecUpdateRequest {
  parent?: string | null;        // Set parent (null to clear)
  addDependsOn?: string[];       // Add to depends_on
  removeDependsOn?: string[];    // Remove from depends_on
}
```

## Plan

### Phase 1: Component Foundation
- [x] Create `SpecSearchPicker` component (searchable spec dropdown)
- [x] Create `RelationshipSection` component (renders one relationship type)
- [x] Create `RelationshipsEditor` dialog component
- [x] Add i18n translations for new UI strings

### Phase 2: Hierarchy Editing
- [x] Implement parent selection (set/clear)
- [x] Implement children display with add/remove (updates child's parent)
- [x] Wire to `set_parent` API endpoint
- [x] Handle self-reference and cycle detection

### Phase 3: Dependencies Editing  
- [x] Implement "Depends On" add/remove
- [x] Implement "Required By" display with add
- [x] Wire to `link`/`unlink` API endpoints

### Phase 4: Integration
- [x] Replace "View Dependencies" + "View Hierarchy" buttons with "Relationships"
- [x] Update MCP `view` tool to output relationships section
- [x] Update CLI `view` command similarly

### Phase 5: Polish
- [x] Keyboard navigation, loading states, accessibility

## Test

**UI Tests**
- [x] "Relationships" button opens unified panel
- [x] All 4 relationship types display correctly
- [x] Spec search filters by number, name, title
- [x] Adding/removing relationships works
- [x] Clicking spec chip navigates to spec

**API Tests**
- [x] Setting parent updates frontmatter
- [x] Adding/removing deps works
- [x] Circular dependency prevented

**MCP/CLI Tests**
- [x] `view` output includes Relationships section

## Notes

### Relationship to Sibling Specs

This is part of the **spec 250 hierarchy management** initiative:

| Spec           | Focus             | Scope                                             |
| -------------- | ----------------- | ------------------------------------------------- |
| **252**        | Foundational UI   | Read-only display, visualization, tree components |
| **253 (this)** | Optimized UI      | Unified editing experience (builds on 252)        |
| **254**        | Optimized CLI/MCP | Streamlined `rel` command interface               |

### Relationship to Other Specs

**Supersedes**:
- **146-dependencies-editor-ui** - Dependencies only, now unified

**Extends**:
- **252-leanspec-ui-hierarchy-support** - Foundational hierarchy display
- **250-structured-spec-hierarchy-management** - Data model done, adds UI

**Depends On**:
- 252 for foundational hierarchy UI components
- 250 for parent/children fields (✅ in-progress)
- 134-ui-metadata-editing for patterns (✅ complete)

### ADO Comparison

| ADO                   | LeanSpec                        |
| --------------------- | ------------------------------- |
| Parent/Child          | parent/children                 |
| Predecessor/Successor | depends_on/required_by          |
| Related               | (not implemented, per spec 139) |

### AI Agent Benefits

With relationships in `view` output, agents can:
1. **Understand context** - "This is part of #168 umbrella"
2. **Check blockers** - "Depends on #239 which is in-progress"
3. **Assess impact** - "Required by #251, changes here affect it"