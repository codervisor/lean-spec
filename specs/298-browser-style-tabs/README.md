---
status: planned
created: 2026-02-03
priority: medium
parent: 297-multi-tasking-ui-architecture
created_at: 2026-02-03T14:02:56.973462Z
updated_at: 2026-02-03T14:03:24.157033Z
---

# Browser-Style Tabbed Navigation

## Overview

Implement browser-style persistent tabs in LeanSpec UI, enabling users to open multiple specs, sessions, and pages without losing context.

**Problem:**
- Navigating away from a spec loses current scroll position and context
- Comparing specs requires switching back and forth
- No way to "bookmark" frequently accessed specs for quick access
- Reopening closed specs requires navigation through lists
- Power users expect Cmd+T, Cmd+W, Cmd+Tab workflows

**Solution:**
Chrome/VS Code-style tab bar above the main content area. Tabs persist across sessions, support keyboard shortcuts, and integrate with existing navigation.

## Design

### Tab Bar Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ [Project ▼]  LeanSpec                                           │
├─────────────────────────────────────────────────────────────────┤
│ [📄 168-orchestration...×] [📄 244-session-ui×] [🤖 Session #a1×] [+] │
├─────────────┬───────────────────────────────────────────────────┤
│  🏠 Home    │                                                   │
│  📋 Specs   │     [Tab Content Area]                            │
│  🔗 Deps    │                                                   │
│  📊 Stats   │                                                   │
│  🤖 Sessions│                                                   │
└─────────────┴───────────────────────────────────────────────────┘
```

### Tab Types

| Type | Icon | Example | Route Pattern |
|------|------|---------|---------------|
| Spec | 📄 | 168-orchestration... | `/specs/:id` |
| Session | 🤖 | Session #a1b2c3 | `/sessions/:id` |
| Page | 📋/📊/🔗 | Board, Stats, Deps | `/board`, `/stats`, etc. |

### Tab Behavior

**Opening Tabs:**
- Clicking a spec in list → opens in new tab
- Clicking a session → opens in new tab
- Sidebar nav items (Home, Specs, etc.) → opens in new tab OR switches to existing
- Middle-click → force open in new tab
- Cmd/Ctrl+Click → force open in new tab

**Closing Tabs:**
- Click × on tab
- Middle-click tab
- Cmd/Ctrl+W (closes active tab)
- Right-click → Close / Close Others / Close All

**Tab Persistence:**
- Tabs saved to localStorage (web) / config (desktop) on change
- Restored on app restart
- Store: `{ path, title, icon, projectId, scrollPosition }`

**Tab Limits:**
- Max 20 tabs (configurable)
- Oldest non-pinned tab auto-closes when limit exceeded
- Warning before closing multiple tabs

### Visual Design

**Tab States:**
```
Active:    [███████████████████] - Accent color background
Inactive:  [░░░░░░░░░░░░░░░░░░░] - Muted background
Hover:     [▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒] - Slight highlight + close button visible
Pinned:    [📌 168] - Compact, no close button, cannot be auto-closed
Loading:   [⟳ Loading...] - Spinner while content loads
Error:     [⚠️ Error] - Red indicator, shows error on click
```

**Tab Overflow:**
When tabs exceed available width:
- Horizontal scroll with arrows
- OR dropdown menu showing all tabs
- Scroll wheel on tab bar scrolls tabs

**Responsive:**
- Desktop: Full tab titles with truncation
- Tablet: Shorter titles, fewer visible tabs
- Mobile: Tab bar becomes dropdown selector OR hidden

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+T` | New tab (opens quick switcher or empty tab) |
| `Cmd/Ctrl+W` | Close current tab |
| `Cmd/Ctrl+Shift+T` | Reopen last closed tab |
| `Cmd/Ctrl+Tab` | Next tab |
| `Cmd/Ctrl+Shift+Tab` | Previous tab |
| `Cmd/Ctrl+1-9` | Switch to tab 1-9 |
| `Cmd/Ctrl+0` | Switch to last tab |

### Context Menu

Right-click on tab:
```
┌─────────────────────┐
│ Close               │
│ Close Others        │
│ Close All           │
│ ─────────────────── │
│ Pin Tab             │
│ Duplicate Tab       │
│ ─────────────────── │
│ Copy Path           │
│ Open in New Window* │ ← Desktop only
└─────────────────────┘
```

### Tab + Sidebar Interaction

- Clicking sidebar nav (e.g., "Specs") opens specs list in new tab
- If specs list tab already exists, switch to it instead
- Sidebar acts as "bookmarks" for page types
- Tabs are "open documents" like browser/IDE

### Pinned Tabs

- Right-click → Pin Tab
- Pinned tabs:
  - Move to left side
  - Show only icon (compact)
  - Cannot be auto-closed
  - Cannot be closed with Cmd+W (requires explicit unpin first)
  - Persist across sessions

**Layout with pinned tabs:**
```
[📌📄][📌🤖] [📄 168-orchestration...×] [📄 244-session-ui×] [+]
```

## Implementation

### Component Architecture

```typescript
// src/components/tabs/TabBar.tsx
interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabAdd: () => void;
  onTabReorder: (fromIndex: number, toIndex: number) => void;
}

// src/components/tabs/Tab.tsx
interface TabProps {
  tab: Tab;
  isActive: boolean;
  isPinned: boolean;
  onSelect: () => void;
  onClose: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
}

// src/types/tabs.ts
interface Tab {
  id: string;           // Unique tab ID
  path: string;         // Route path
  title: string;        // Display title
  icon: TabIcon;        // Spec, session, page type
  projectId?: string;   // For project-scoped tabs
  pinned: boolean;
  scrollPosition?: number;
  createdAt: number;
  lastActiveAt: number;
}

type TabIcon = 'spec' | 'session' | 'board' | 'stats' | 'deps' | 'context' | 'settings';
```

### State Management

```typescript
// src/hooks/useTabs.ts (or Zustand store)
interface TabState {
  tabs: Tab[];
  activeTabId: string;
  closedTabs: Tab[];  // For reopen functionality
  
  // Actions
  openTab: (path: string, options?: { pinned?: boolean }) => void;
  closeTab: (tabId: string) => void;
  closeOtherTabs: (keepTabId: string) => void;
  closeAllTabs: () => void;
  switchTab: (tabId: string) => void;
  reorderTab: (fromIndex: number, toIndex: number) => void;
  pinTab: (tabId: string) => void;
  unpinTab: (tabId: string) => void;
  reopenClosedTab: () => void;
}
```

### Storage

```typescript
// localStorage key: 'leanspec:tabs'
interface TabStorage {
  tabs: Tab[];
  activeTabId: string;
  version: number;  // For migration
}

// Desktop: ~/.lean-spec/ui-state.json
// Include tab state alongside window state
```

### Router Integration

The tab system needs to work with React Router:

```typescript
// On route change, sync with tabs
useEffect(() => {
  const currentPath = location.pathname;
  const existingTab = tabs.find(t => t.path === currentPath);
  
  if (existingTab) {
    // Switch to existing tab
    setActiveTabId(existingTab.id);
  } else {
    // Create new tab for this route
    openTab(currentPath);
  }
}, [location.pathname]);

// On tab switch, navigate to tab's path
const switchTab = (tabId: string) => {
  const tab = tabs.find(t => t.id === tabId);
  if (tab) {
    navigate(tab.path);
  }
};
```

### Scroll Position Preservation

```typescript
// Save scroll position before switching tabs
const handleTabSwitch = (newTabId: string) => {
  const scrollPosition = document.documentElement.scrollTop;
  updateTab(activeTabId, { scrollPosition });
  switchTab(newTabId);
};

// Restore scroll position after content loads
useEffect(() => {
  const activeTab = tabs.find(t => t.id === activeTabId);
  if (activeTab?.scrollPosition) {
    setTimeout(() => {
      document.documentElement.scrollTop = activeTab.scrollPosition;
    }, 100); // Wait for content to render
  }
}, [activeTabId]);
```

## Plan

### Phase 1: Core Tab System (Week 1)

- [ ] Create TabBar and Tab components
- [ ] Implement tab state management (Zustand or Context)
- [ ] Add basic open/close/switch functionality
- [ ] Integrate with React Router
- [ ] Add tab persistence (localStorage)
- [ ] Style with Tailwind + shadcn/ui

### Phase 2: Navigation Integration (Week 1-2)

- [ ] Update spec list to open specs in tabs
- [ ] Update session list to open sessions in tabs
- [ ] Update sidebar nav to create/switch tabs
- [ ] Handle middle-click and Cmd+Click
- [ ] Add "New Tab" button functionality

### Phase 3: Keyboard & Power Features (Week 2)

- [ ] Implement all keyboard shortcuts
- [ ] Add tab context menu (right-click)
- [ ] Implement pinned tabs
- [ ] Add "Reopen closed tab" functionality
- [ ] Add drag-to-reorder tabs

### Phase 4: Polish & Edge Cases (Week 2-3)

- [ ] Tab overflow handling (scroll or dropdown)
- [ ] Scroll position preservation
- [ ] Loading and error states
- [ ] Responsive design adjustments
- [ ] Tab limit enforcement
- [ ] Desktop app integration

### Phase 5: Testing & Documentation (Week 3)

- [ ] Unit tests for tab state management
- [ ] Integration tests for routing
- [ ] E2E tests for common workflows
- [ ] Update documentation
- [ ] Performance testing (many tabs)

## Test

### Functional Tests

**Tab Operations:**
- [ ] Clicking spec opens in new tab
- [ ] Clicking session opens in new tab
- [ ] Close button closes tab
- [ ] Closing last tab shows empty state or new tab
- [ ] Tabs persist after refresh
- [ ] Tabs restore after app restart

**Keyboard Shortcuts:**
- [ ] Cmd+T opens new tab / quick switcher
- [ ] Cmd+W closes active tab
- [ ] Cmd+Shift+T reopens closed tab
- [ ] Cmd+Tab cycles through tabs forward
- [ ] Cmd+Shift+Tab cycles backward
- [ ] Cmd+1-9 switches to specific tabs

**Context Menu:**
- [ ] Right-click shows context menu
- [ ] Close works
- [ ] Close Others works
- [ ] Close All works
- [ ] Pin Tab works
- [ ] Duplicate Tab works

**Edge Cases:**
- [ ] Opening same spec twice reuses existing tab
- [ ] Tab overflow scrolls correctly
- [ ] Pinned tabs cannot be closed with Cmd+W
- [ ] Max tab limit enforced
- [ ] Scroll position preserved on tab switch

### Performance Tests

- [ ] Opening 20 tabs doesn't degrade performance
- [ ] Tab switching is instant (<50ms)
- [ ] Tab bar renders smoothly with many tabs
- [ ] Storage sync doesn't block UI

### Platform Tests

- [ ] Works in web UI (Chrome, Firefox, Safari)
- [ ] Works in Desktop app (Tauri)
- [ ] Keyboard shortcuts work on macOS
- [ ] Keyboard shortcuts work on Windows/Linux
- [ ] Mobile responsive behavior correct

## Notes

### Dependencies

**Uses:**
- react-hotkeys-hook (or similar) for keyboard shortcuts
- @dnd-kit/core for drag-to-reorder (optional)
- Zustand or React Context for state

**Packages to evaluate:**
- `@radix-ui/react-tabs` - Base primitives
- `react-use-gesture` - For drag interactions
- Native browser/Tauri APIs for keyboard handling

### Design Decisions

**Why separate tabs from sidebar?**
- Sidebar = Navigation to page types (like browser bookmarks bar)
- Tabs = Open documents (like browser tabs)
- Different mental models, both useful

**Why not just browser tabs (Desktop)?**
- Native app should have native tab UX
- Share tab state between web and desktop
- More control over behavior and shortcuts

**Why limit to 20 tabs?**
- Memory efficiency
- Cognitive limit for most users
- Prevents tab hoarding
- Configurable for power users

### Alternatives Considered

**1. Breadcrumb history only**
- Pros: Simpler, less UI
- Cons: Can't see multiple items, no quick switching
- Rejected: Doesn't solve multi-tasking need

**2. Floating windows (Desktop only)**
- Pros: True multi-tasking, side-by-side
- Cons: Complex, desktop-only, harder to manage
- Deferred: Consider for future after tabs

### Related Specs

- 297-multi-tasking-ui-architecture (parent umbrella)
- 148-leanspec-desktop-app (desktop integration)
- 244-session-ui-enhancement (session pages as tabs)
