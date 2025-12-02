---
status: complete
created: '2025-11-28'
tags:
  - ui
  - ux
  - feature
  - dx
priority: medium
created_at: '2025-11-28T03:30:16.605Z'
related:
  - 119-ui-diagram-rendering
  - 107-ui-ux-refinements
  - 106-ui-package-documentation
  - 133-ui-web-code-editor
  - 134-ui-metadata-editing
updated_at: '2025-11-28T08:57:36.497Z'
completed_at: '2025-11-28T08:57:36.497Z'
completed: '2025-11-28'
transitions:
  - status: complete
    at: '2025-11-28T08:57:36.497Z'
---

# UI Project Context Visibility

> **Status**: ✅ Complete · **Priority**: Medium · **Created**: 2025-11-28 · **Tags**: ui, ux, feature, dx

**Project**: lean-spec  
**Team**: Core Development

## Overview

Enhance `@leanspec/ui` to display project-level context beyond specs:

## Problem

Currently `@leanspec/ui` only shows specs. Users have no visibility into:
- **SOP/System Prompts**: `AGENTS.md`, other agent instructions
- **Configuration**: `.lean-spec` config file, project settings
- **Supporting docs**: README, CONTRIBUTING, other project context

This limits the usefulness of the UI for comprehensive spec management.

## Proposed Solution

Add a "Project Context" section to the UI showing:

1. **Agent Instructions** - Display `AGENTS.md` and similar files
2. **Configuration** - Show `.lean-spec` config with current settings
3. **Project Overview** - README, project structure info

## Considerations

- Read-only display is sufficient for initial implementation
- Should integrate with existing sidebar navigation
- Consider collapsible sections for large files
- Token count display for agent context budgeting
- Syntax highlighting for markdown/JSON content

## Design

### Architecture

**New Route**: `/context` - Project context page showing all contextual files

**Data Layer** (`service-queries.ts`):
```typescript
interface ProjectContext {
  agentInstructions: ContextFile[];  // AGENTS.md, GEMINI.md, etc.
  config: LeanSpecConfig | null;     // .lean-spec/config.json
  projectDocs: ContextFile[];        // README.md, CONTRIBUTING.md
}

interface ContextFile {
  name: string;
  path: string;
  content: string;
  tokenCount: number;
  lastModified: Date;
}
```

**Service Functions**:
```typescript
// New functions in service-queries.ts
export async function getProjectContext(): Promise<ProjectContext>
export async function getAgentInstructions(): Promise<ContextFile[]>
export async function getProjectConfig(): Promise<LeanSpecConfig | null>
```

### UI Components

**New Components**:
1. `context-file-viewer.tsx` - Displays a single context file with:
   - Collapsible content area
   - Token count badge
   - Copy button
   - Last modified timestamp
   - Syntax highlighting via `rehypeHighlight`

2. `project-context-page.tsx` - Main page layout with:
   - Three sections: Agent Instructions, Configuration, Project Docs
   - Collapsible cards for each file
   - Total token count summary

**Sidebar Integration** (`main-sidebar.tsx`):
Add new navigation item:
```tsx
<SidebarLink 
  href="/context" 
  icon={BookOpen}  // or FileCode2
  currentPath={pathname}
  description="Project context"
>
  Context
</SidebarLink>
```

### File Discovery Logic

**Agent Instructions** (search in project root):
- `AGENTS.md` (primary)
- `GEMINI.md`, `CLAUDE.md`, `COPILOT.md` (secondary)
- `.github/copilot-instructions.md`
- `docs/agents/*.md`

**Configuration**:
- `.lean-spec/config.json`
- `.lean-spec/*.md` (custom templates)

**Project Docs**:
- `README.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`

### Token Counting

Reuse existing token counter from `@leanspec/core`:
```typescript
import { countTokens } from '@leanspec/core/utils/token-counter';
```

Display token count per file and total for context budgeting.

## Plan

### Phase 1: Core Infrastructure
- [x] Add `getProjectContext()` to `service-queries.ts`
- [x] Create `ContextFile` and `ProjectContext` types
- [x] Implement file discovery for agent instructions
- [x] Add token counting integration

### Phase 2: UI Components
- [x] Create `context-file-viewer.tsx` component
- [x] Create `/app/context/page.tsx` route
- [x] Add collapsible sections with shadcn Accordion
- [x] Implement syntax highlighting for markdown/JSON

### Phase 3: Navigation & Polish
- [x] Add "Context" link to `main-sidebar.tsx`
- [x] Add icon (BookOpen or FileCode2 from lucide-react)
- [x] Style consistency with existing pages
- [x] Mobile responsive layout

### Phase 4: Enhancement
- [x] Add search/filter within context files
- [x] Copy full context button (for LLM paste)
- [x] Link to edit file (open in editor)

## Test

**File Discovery**
- [ ] Detects `AGENTS.md` in project root
- [ ] Detects `.lean-spec/config.json`
- [ ] Handles missing files gracefully (shows "not configured")
- [ ] Works with different project structures

**Token Counting**
- [ ] Displays accurate token counts per file
- [ ] Shows total context token count
- [ ] Highlights files exceeding recommended limits

**UI Rendering**
- [ ] Markdown content renders with proper formatting
- [ ] JSON config displays with syntax highlighting
- [ ] Collapsible sections work correctly
- [ ] Copy button copies full file content

**Responsive Design**
- [ ] Desktop: Three-column or card grid layout
- [ ] Mobile: Stacked collapsible cards
- [ ] Sidebar link visible in both collapsed and expanded states

**Error States**
- [ ] Shows helpful message when no context files found
- [ ] Handles file read errors gracefully
- [ ] Empty state with guidance on creating `AGENTS.md`

## Notes

### Why This Matters

Users managing specs need visibility into:
1. **What AI agents see**: `AGENTS.md` defines agent behavior
2. **How project is configured**: `.lean-spec/config.json` settings
3. **Project context**: README provides background for specs

Currently this requires browsing the filesystem separately.

### Token Budget Awareness

AI agents have context limits. Showing token counts helps users:
- Know how much context they're providing
- Identify verbose files that need trimming
- Make informed decisions about what to include

### Future Considerations

- **Editing**: Phase 1 is read-only. Future spec could add inline editing
- **Multi-project**: When database mode supports multiple projects, show context per project
- **Template Preview**: Show rendered template output, not just template source

### Related Patterns

- Spec #119 (diagram rendering) - Similar custom component integration
- Spec #107 (UX refinements) - Layout and navigation patterns
- Spec #106 (UI documentation) - Component documentation approach
