---
status: planned
created: 2025-12-10
priority: low
tags:
- ui
- desktop
- ux
- feature
- multi-tasking
- productivity
created_at: 2025-12-10T09:52:01.202Z
updated_at: 2026-02-02T08:14:17.495078366Z
---
# Advanced Multi-Tasking UI Features for UI and Desktop

> **Status**: 📅 Planned · **Priority**: Medium · **Created**: 2025-12-10

## Overview

Enhance multi-tasking capabilities in both @leanspec/ui and Desktop app with advanced UI features to improve productivity for users managing multiple specs and projects simultaneously.

**Core enhancements:**
- **Project Sidebar** - Persistent sidebar showing all projects with quick switching
- **Browser-Style Tabs** - Persistent tabs for browsed specs with history
- **Split View Mode** - View/compare multiple specs side-by-side
- **Quick Switcher** - Keyboard-driven navigation (Cmd/Ctrl+K)
- **Enhanced Context** - Recent history, pinned items, batch operations

**Why now?**
- Desktop app (148) and multi-project mode (109, 112) are complete
- Users managing multiple projects need better navigation
- Browser tab pattern is familiar and proven for multi-tasking
- Foundation exists - this builds on top of current UI

## Problem

### Current Limitations

**Multi-Project Navigation:**
- Project switcher dropdown is functional but hidden
- No visual overview of all available projects
- Difficult to compare specs across projects
- Context switching requires multiple clicks

**Page Navigation:**
- Back/forward buttons only (no history visualization)
- Switching between specs loses context
- Reopening closed specs requires search/navigation
- No way to "bookmark" frequently accessed specs

**Multi-Tasking Workflow:**
- Can only view one spec at a time
- Comparing specs requires switching back and forth
- No keyboard shortcuts for power users
- Editing metadata while referencing another spec is cumbersome

### User Impact

- **Productivity Loss**: 5-10 clicks to switch project → find spec → switch back
- **Context Switching Cost**: Mental overhead remembering what you were viewing
- **Poor Discoverability**: Projects and specs hidden until actively searched
- **Limited Power User Features**: No keyboard-first workflows

## Design

### 1. Project Sidebar (Primary Enhancement)

**Layout:**
```
┌────────────────────────────────────────────────┐
│ [≡] LeanSpec                    [+] [-] [×]    │  ← Title bar
├─────────────┬──────────────────────────────────┤
│ 📁 Projects │ [Tab 1] [Tab 2] [Tab 3×]    [⌘K] │  ← Project sidebar + Tabs
│             │                                   │
│ > lean-spec │ ┌──────────────────────────────┐ │
│   163 specs │ │                              │ │
│             │ │  Spec Content                │ │
│ > devlog    │ │                              │ │
│   45 specs  │ │                              │ │
│             │ │                              │ │
│   my-app    │ └──────────────────────────────┘ │
│   12 specs  │                                   │
│             │                                   │
│ [+ Add]     │                                   │
└─────────────┴───────────────────────────────────┘
```

**Features:**
- **Collapsible sidebar** - Toggle with `Cmd/Ctrl+B` or button
- **Active project indicator** - Bold + icon for current project
- **Spec count** - Show number of specs per project
- **Project actions** - Right-click menu: Open in Finder, Settings, Remove
- **Keyboard navigation** - `Cmd/Ctrl+1-9` to switch projects
- **Drag to reorder** - Customize project order
- **Collapsed state persists** - Remember user preference across sessions

**Implementation:**
- Reuse existing multi-project context from spec 151
- Sidebar width: 220px (resizable 180-300px)
- Store state in localStorage/Desktop app config
- Animation: 200ms ease-in-out

### 2. Browser-Style Persistent Tabs

**Tab Behavior:**
```
[📄 163-multi-task...×] [📄 148-desktop×] [📋 Board×] [+]
```

**Features:**
- **Auto-open tabs** - Clicking any spec/page opens in new tab
- **Close button** - `×` on each tab (on hover)
- **Active tab indicator** - Highlighted with accent color
- **Tab overflow** - Horizontal scroll when >6 tabs
- **New tab button** - `[+]` opens quick switcher
- **Middle-click to close** - Standard browser behavior
- **Keyboard shortcuts:**
  - `Cmd/Ctrl+T` - New tab (opens quick switcher)
  - `Cmd/Ctrl+W` - Close current tab
  - `Cmd/Ctrl+Shift+T` - Reopen last closed tab
  - `Cmd/Ctrl+Tab` - Next tab
  - `Cmd/Ctrl+Shift+Tab` - Previous tab
  - `Cmd/Ctrl+1-9` - Switch to tab 1-9

**Tab Persistence:**
- Save open tabs to localStorage/config on change
- Restore tabs on app startup
- Max 20 tabs (close oldest when exceeded)
- Store: `{ path: string, title: string, projectId?: string, timestamp: number }`

**Tab Types:**
- Spec detail pages
- Board view
- Dependencies view  
- Stats/Analytics
- Settings

### 3. Split View Mode

**Activation:**
- Right-click tab → "Open in split view"
- Drag tab to left/right edge
- Keyboard: `Cmd/Ctrl+\` to split current tab

**Layouts:**
```
Vertical Split (50/50):
┌─────────────────┬─────────────────┐
│   Spec A        │   Spec B        │
│                 │                 │
│                 │                 │
│                 │                 │
└─────────────────┴─────────────────┘

Horizontal Split (50/50):
┌───────────────────────────────────┐
│   Spec A                          │
│                                   │
├───────────────────────────────────┤
│   Spec B                          │
│                                   │
└───────────────────────────────────┘

Adjustable divider (30/70, 40/60, etc.)
```

**Features:**
- Resizable split divider
- Each pane has independent scroll
- Can split into 2 panes (not 3+ for simplicity)
- Both panes share the same project context
- Close split: Click `[×]` on pane or drag divider to edge

### 4. Quick Switcher (Cmd/Ctrl+K)

**Overlay modal:**
```
┌─────────────────────────────────────────┐
│ 🔍  Type to search...                   │
├─────────────────────────────────────────┤
│ Recent                                  │
│  📄 163-multi-tasking-ui-enhancements   │
│  📄 148-leanspec-desktop-app           │
│  📋 Board                               │
│                                         │
│ Specs (matching "multi")                │
│  📄 163-multi-tasking-ui-enhancements   │
│  📄 151-multi-project-architecture...   │
│                                         │
│ Commands                                │
│  ⚡ Create new spec                     │
│  ⚡ Open settings                       │
└─────────────────────────────────────────┘
```

**Features:**
- Fuzzy search across specs, pages, commands
- Show recent items first (last 10)
- Keyboard navigation (↑↓ + Enter)
- `Esc` to close
- Preview on hover (optional enhancement)
- Search includes: spec name, title, tags, content excerpt

### 5. Additional Enhancements

**Recent History:**
- Track last 20 visited pages
- Show in quick switcher under "Recent"
- Clear history option in settings

**Pinned Items:**
- Right-click spec/page → "Pin to sidebar"
- Show pinned section at top of project sidebar
- Max 5 pinned items per project

**Batch Operations:**
- Checkbox selection mode (toggle with toolbar button)
- Select multiple specs → Bulk actions: Update status, Add tags, Archive
- `Cmd/Ctrl+A` to select all visible specs

**Keyboard Shortcuts Help:**
- `?` key to show keyboard shortcuts overlay
- Organized by category (Navigation, Tabs, etc.)

## Plan

### Phase 1: Project Sidebar (Week 1)

**UI Package:**
- [ ] Create `ProjectSidebar` component with collapsible state
- [ ] Update layout to accommodate sidebar (flex layout)
- [ ] Add project list with active indicator
- [ ] Implement collapse/expand animation
- [ ] Add keyboard shortcut (Cmd/Ctrl+B)
- [ ] Store sidebar state in localStorage
- [ ] Add project actions menu (right-click)

**Desktop App:**
- [ ] Integrate sidebar into Tauri window layout
- [ ] Store sidebar preferences in app config
- [ ] Test with multiple projects

### Phase 2: Browser-Style Tabs (Week 1-2)

- [ ] Create `TabBar` component with tab items
- [ ] Implement tab open/close logic
- [ ] Add tab persistence (localStorage/config)
- [ ] Implement keyboard shortcuts (Cmd+W, Cmd+T, etc.)
- [ ] Add tab overflow handling (scroll)
- [ ] Implement "reopen closed tab" functionality
- [ ] Add middle-click to close support
- [ ] Test tab restoration on app restart

### Phase 3: Split View Mode (Week 2)

- [ ] Create `SplitView` component with resizable panes
- [ ] Add split activation methods (right-click, drag, keyboard)
- [ ] Implement split layout state management
- [ ] Add divider resize functionality
- [ ] Handle scroll independence per pane
- [ ] Add close split functionality
- [ ] Test with different screen sizes

### Phase 4: Quick Switcher (Week 2-3)

- [ ] Create `QuickSwitcher` modal component
- [ ] Implement fuzzy search across specs/pages
- [ ] Add recent history tracking
- [ ] Implement keyboard navigation (↑↓ + Enter)
- [ ] Add command palette items
- [ ] Style with proper z-index and backdrop
- [ ] Test search performance with large projects

### Phase 5: Additional Features (Week 3)

- [ ] Implement recent history tracking (last 20 items)
- [ ] Add pinned items functionality
- [ ] Create batch operations mode with checkboxes
- [ ] Build keyboard shortcuts help overlay
- [ ] Add pin/unpin UI in context menus

### Phase 6: Polish & Testing (Week 3-4)

- [ ] Responsive design adjustments
- [ ] Accessibility testing (ARIA labels, keyboard nav)
- [ ] Performance optimization (virtualization if needed)
- [ ] Cross-browser testing (UI package)
- [ ] Integration testing with Desktop app
- [ ] Update documentation
- [ ] User testing feedback session

## Test

### Project Sidebar
- [ ] Sidebar toggles smoothly with Cmd/Ctrl+B
- [ ] Project list shows all projects with correct spec counts
- [ ] Active project is visually distinct
- [ ] Sidebar state persists across sessions
- [ ] Right-click menu works on projects
- [ ] Sidebar is resizable within bounds (180-300px)
- [ ] Collapsed state saves and restores correctly

### Browser-Style Tabs
- [ ] Clicking specs/pages opens in new tab
- [ ] Tab close button works (`×`)
- [ ] Tabs persist across app restarts
- [ ] All keyboard shortcuts work (Cmd+T, Cmd+W, Cmd+Tab, etc.)
- [ ] Tab overflow scrolls correctly when >6 tabs
- [ ] Middle-click closes tabs
- [ ] Reopen closed tab (Cmd+Shift+T) restores last closed
- [ ] Max 20 tabs enforced (closes oldest)
- [ ] Active tab is visually highlighted

### Split View Mode
- [ ] Right-click tab → "Open in split view" works
- [ ] Drag tab to edge creates split
- [ ] Keyboard shortcut (Cmd+\) splits current tab
- [ ] Divider is resizable
- [ ] Each pane scrolls independently
- [ ] Close split removes pane correctly
- [ ] Works with all page types (specs, board, etc.)

### Quick Switcher
- [ ] Opens with Cmd/Ctrl+K
- [ ] Fuzzy search finds specs correctly
- [ ] Recent items appear at top
- [ ] Keyboard navigation (↑↓ + Enter) works
- [ ] Esc closes modal
- [ ] Commands are searchable
- [ ] Search performs well with 100+ specs

### Additional Features
- [ ] Recent history tracks last 20 items
- [ ] Pin/unpin items works
- [ ] Pinned items persist
- [ ] Batch selection mode activates
- [ ] Bulk operations work on selected specs
- [ ] Keyboard shortcuts help (?) displays correctly
- [ ] Cmd/Ctrl+A selects all visible specs

### Integration
- [ ] Works in both UI package and Desktop app
- [ ] Multi-project switching works with sidebar
- [ ] Tab state syncs between projects
- [ ] Performance acceptable with multiple projects
- [ ] No memory leaks with many tabs
- [ ] Responsive on mobile/tablet (UI package)

## Notes

### Design Decisions

**Why project sidebar instead of just switcher?**
- Better visibility - users see all projects at a glance
- Familiar pattern - similar to VS Code, IDEs
- Reduces clicks - direct access vs dropdown → select
- Space for future enhancements (project icons, status indicators)

**Why browser-style tabs?**
- Universal pattern - everyone understands browser tabs
- Proven for multi-tasking workflows
- Persistent state improves productivity
- Easy to implement with existing routing

**Why limit to 2-pane split?**
- Simplicity - 3+ panes adds complexity without proportional value
- Screen space - 2 panes fit well on most displays
- Use case - comparing specs is primary need (not 3-way)

**Tab persistence strategy:**
- localStorage for UI package (web)
- App config JSON for Desktop app
- Store minimal data (path + title) for performance
- Lazy load content when tab becomes active

### Technical Considerations

**Performance:**
- Virtualize spec list in sidebar if >100 specs
- Lazy load tab content (don't render all tabs at once)
- Debounce quick switcher search (200ms)
- Cache search results for common queries

**Accessibility:**
- ARIA labels for all interactive elements
- Keyboard navigation throughout
- Focus management in modals
- Screen reader announcements for tab changes

**State Management:**
- Use React Context for sidebar/tab state
- Consider Zustand for complex state (if Context becomes unwieldy)
- Persist to storage on state changes (debounced)

**Dependencies:**
```json
{
  "react-resizable-panels": "^2.x",  // For split view
  "fuse.js": "^7.x",                 // For fuzzy search
  "react-hotkeys-hook": "^4.x"       // For keyboard shortcuts
}
```

### Related Specs

- **148-leanspec-desktop-app** - Desktop app foundation
- **151-multi-project-architecture-refactoring** - Multi-project support
- **109-local-project-switching** - Project switching implementation
- **112-project-management-ui** - Project management features
- **161-desktop-native-menu-bar** - Desktop menu bar (in progress)

### Future Enhancements (v2)

- Tab groups (organize tabs by topic)
- Workspace presets (save/restore tab layouts)
- Cloud sync for tabs/settings
- Tab preview on hover
- Drag tabs between split panes
- Floating/detached windows (Desktop app)
- Project icons/colors customization
- Cross-project search in quick switcher

### Open Questions

1. **Tab limits** - Is 20 tabs enough? Should it be configurable?
2. **Split persistence** - Should split layout persist across sessions?
3. **Mobile experience** - How to adapt tabs/sidebar for mobile?
4. **Project grouping** - Allow organizing projects into folders?

### Research

**Similar implementations:**
- **VS Code** - Sidebar + tabs + split view (excellent reference)
- **Chrome DevTools** - Persistent tabs for panels
- **Notion** - Sidebar navigation + page history
- **Linear** - Project sidebar + keyboard shortcuts

**User feedback to validate:**
- Are tabs preferred over breadcrumbs + history dropdown?
- Should sidebar be on left or right? (left is standard)
- What's the ideal default sidebar width? (220px proposed)
