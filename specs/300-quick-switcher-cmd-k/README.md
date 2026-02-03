---
status: planned
created: 2026-02-03
priority: medium
parent: 297-multi-tasking-ui-architecture
created_at: 2026-02-03T14:13:43.897665Z
updated_at: 2026-02-03T14:14:25.793516Z
---

# Quick Switcher (Cmd+K)

## Overview

Keyboard-driven command palette for fast navigation across specs, sessions, projects, and commands without touching the mouse.

**Problem:**
- Finding a spec requires: click sidebar → scroll list → find spec → click
- No keyboard-first navigation for power users
- Project switching requires opening dropdown and scanning
- No unified search across specs, sessions, and pages
- Context switching takes 3-5 clicks minimum

**Solution:**
VS Code/Raycast-style quick switcher overlay activated by Cmd/Ctrl+K. Fuzzy search across all navigable content with instant keyboard selection.

## Design

### Quick Switcher Modal

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍  search specs, sessions, projects...                    [⌘K] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ RECENT                                                           │
│  📄 168-orchestration-platform          lean-spec      ↵ Enter  │
│  🤖 Session #a1b2c3                     lean-spec               │
│  📋 Board                               lean-spec               │
│                                                                  │
│ ALL SPECS                                                        │
│  📄 297-multi-tasking-ui-architecture   lean-spec               │
│  📄 298-browser-style-tabs              lean-spec               │
│  📄 244-session-ui-enhancement          lean-spec               │
│                                                                  │
│ COMMANDS                                                         │
│  ⚡ Create new spec                                              │
│  ⚡ Open project settings                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Search Modes

**Default Mode (Cmd+K):**
- Search everything: specs, sessions, pages, commands
- Recent items shown first
- Grouped by type for clarity

**Scoped Modes:**
| Prefix | Scope | Example |
|--------|-------|---------|
| `>` | Commands only | `>create spec` |
| `@` | Projects only | `@lean-spec` |
| `#` | Sessions only | `#running` |
| `:` | Navigate to page | `:board`, `:stats` |
| No prefix | Specs + all | `orchestration` |

### Search Behavior

**Fuzzy Matching:**
- Matches anywhere in string: `orch` → `168-**orch**estration`
- Word boundary boost: `ui arch` → `multi-tasking-**ui-arch**itecture`
- Recent items ranked higher
- Open tabs ranked higher

**Live Results:**
- Results update as user types (debounced 100ms)
- Maximum 20 results per category
- Keyboard navigation preserves scroll position

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate results |
| `Enter` | Open selected item |
| `Cmd/Ctrl+Enter` | Open in new tab |
| `Tab` | Focus next section |
| `Esc` | Close switcher |
| `Cmd/Ctrl+Backspace` | Clear search |

### Result Types

**Specs:**
```
📄 168-orchestration-platform         lean-spec   in-progress
   └── Title and project indicator
```

**Sessions:**
```
🤖 Session #a1b2c3                    lean-spec   🟢 running
   └── Spec: 168-orchestration        Duration: 12m
```

**Pages:**
```
📋 Board                              Quick access
📊 Stats Dashboard                    Quick access
🔗 Dependencies                       Quick access
⚙️ Settings                           Quick access
```

**Commands:**
```
⚡ Create new spec                    Cmd+N
⚡ Switch project                     Cmd+Shift+P
⚡ Open settings                      Cmd+,
⚡ Toggle theme                       Cmd+Shift+T
```

### Cross-Project Search

When in multi-project mode:
- Show project name next to each result
- Selecting item switches project context automatically
- Option to filter to current project only

```
┌─────────────────────────────────────────────────────┐
│ 🔍  authentication                            [⌘K] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ SPECS                                               │
│  📄 042-auth-flow-redesign          my-saas-app    │
│  📄 089-oauth-integration           client-proj    │
│  📄 156-cursor-agent-support        lean-spec      │
│                                                     │
│ [ ] Search current project only                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Implementation

### Component Architecture

```typescript
// src/components/quick-switcher/QuickSwitcher.tsx
interface QuickSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: QuickSwitcherItem) => void;
}

// src/components/quick-switcher/SearchInput.tsx
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

// src/components/quick-switcher/ResultList.tsx
interface ResultListProps {
  groups: ResultGroup[];
  selectedIndex: number;
  onSelect: (item: QuickSwitcherItem) => void;
}

// src/types/quick-switcher.ts
type QuickSwitcherItem = 
  | { type: 'spec'; spec: Spec; project: string }
  | { type: 'session'; session: Session; project: string }
  | { type: 'page'; page: Page }
  | { type: 'command'; command: Command };

interface ResultGroup {
  title: string;
  items: QuickSwitcherItem[];
}
```

### Search Engine

```typescript
// src/lib/quick-switcher/search.ts
import Fuse from 'fuse.js';

interface SearchOptions {
  query: string;
  mode: 'all' | 'specs' | 'sessions' | 'commands' | 'projects';
  currentProject?: string;
  limit?: number;
}

function search(options: SearchOptions): QuickSwitcherItem[] {
  const { query, mode } = options;
  
  // Parse mode prefix
  if (query.startsWith('>')) {
    return searchCommands(query.slice(1));
  }
  if (query.startsWith('@')) {
    return searchProjects(query.slice(1));
  }
  // ... etc
  
  // Default: search all with Fuse.js
  const fuse = new Fuse(getAllItems(), {
    keys: ['title', 'name', 'path', 'tags'],
    threshold: 0.4,
    includeScore: true,
  });
  
  return fuse.search(query).map(r => r.item);
}
```

### Global Shortcut

```typescript
// Register global Cmd+K
useHotkeys('mod+k', (e) => {
  e.preventDefault();
  openQuickSwitcher();
}, { enableOnFormTags: false });

// Close on Esc
useHotkeys('esc', () => {
  if (isQuickSwitcherOpen) {
    closeQuickSwitcher();
  }
}, { enableOnFormTags: true });
```

### Dependencies

```json
{
  "fuse.js": "^7.x",           // Fuzzy search
  "cmdk": "^1.x",              // Alternative: Vercel's cmdk library
  "react-hotkeys-hook": "^4.x" // Keyboard shortcuts
}
```

## Plan

### Phase 1: Core Modal (Week 1)

- [ ] Create QuickSwitcher modal component
- [ ] Implement search input with styling
- [ ] Add result list with sections
- [ ] Integrate Fuse.js for fuzzy search
- [ ] Register Cmd+K global shortcut
- [ ] Handle Esc to close

### Phase 2: Search Integration (Week 1-2)

- [ ] Index all specs in current project
- [ ] Index all sessions
- [ ] Add page navigation items
- [ ] Implement recent items tracking
- [ ] Add command palette items

### Phase 3: Navigation (Week 2)

- [ ] Keyboard navigation (up/down/enter)
- [ ] Open selected item in current tab
- [ ] Cmd+Enter to open in new tab
- [ ] Cross-project search and switching
- [ ] Tab between sections

### Phase 4: Advanced Features (Week 2-3)

- [ ] Mode prefixes (>, @, #, :)
- [ ] Search highlighting in results
- [ ] Preview on hover (optional)
- [ ] Command shortcuts display
- [ ] Current project filter toggle

### Phase 5: Polish (Week 3)

- [ ] Animation for open/close
- [ ] Empty state messages
- [ ] Loading state for search
- [ ] Result caching for performance
- [ ] Accessibility (ARIA labels)

## Test

- [ ] Cmd+K opens switcher
- [ ] Esc closes switcher
- [ ] Clicking outside closes switcher
- [ ] Fuzzy search finds partial matches
- [ ] Recent items shown first
- [ ] Arrow keys navigate results
- [ ] Enter opens selected item
- [ ] Cmd+Enter opens in new tab
- [ ] > prefix shows only commands
- [ ] @ prefix shows only projects
- [ ] Cross-project items show project name
- [ ] Search updates as user types
- [ ] No lag with 100+ specs

## Notes

### Design Decisions

**Why Cmd+K?**
- Universal shortcut (VS Code, Slack, Notion, Linear, Raycast)
- Ergonomic for left hand
- Doesn't conflict with common browser shortcuts
- Users already expect this behavior

**Why Fuse.js over cmdk?**
- More control over search algorithm
- cmdk is great but opinionated
- Fuse.js is battle-tested for fuzzy search
- Consider cmdk if building from scratch

**Why show recent first?**
- Most navigation is to recently viewed items
- Reduces search effort for common tasks
- Consistent with VS Code / IDE patterns

### Alternatives Considered

**Spotlight-style**
- Full-screen takeover
- Rejected: Too heavy for quick navigation

**Sidebar search**
- Search field in sidebar
- Rejected: Not keyboard-first, takes space

### Related Specs

- 297-multi-tasking-ui-architecture (parent umbrella)
- 298-browser-style-tabs (open results in tabs)
- 109-local-project-switching (project search integration)
