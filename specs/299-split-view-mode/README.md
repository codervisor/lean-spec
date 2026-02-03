---
status: planned
created: 2026-02-03
priority: medium
depends_on:
- 298-browser-style-tabs
parent: 297-multi-tasking-ui-architecture
created_at: 2026-02-03T14:12:13.217153Z
updated_at: 2026-02-03T14:16:47.480362Z
---

# Split View Mode

## Overview

Enable viewing two specs, sessions, or pages side-by-side within the same tab, allowing comparison and context preservation while implementing.

**Problem:**
- Comparing two specs requires flipping back and forth between tabs
- Implementing a spec while watching AI session logs needs constant context switching
- Reviewing related specs (parent/child, dependencies) is cumbersome
- Referencing one spec while editing another is not possible

**Solution:**
Add split view capability that divides the content area into two resizable panes, each showing different content.

## Design

### Split View Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ [Project ▼]  LeanSpec                                           │
├─────────────────────────────────────────────────────────────────┤
│ [📄 168-orchestration ⎮ 🤖 Session #a1×] [📄 244-ui×] [+]        │ ← Split indicator in tab
├─────────────┬───────────────────────────────────────────────────┤
│  🏠 Home    │ ┌─────────────────┬─────────────────────────────┐ │
│  📋 Specs   │ │   Spec 168      │   Session #a1 Logs          │ │
│  🔗 Deps    │ │                 │                             │ │
│  📊 Stats   │ │   [Content]     │   [Live streaming output]   │ │
│  🤖 Sessions│ │                 │                             │ │
│             │ ├─────────────────┼─────────────────────────────┤ │
│             │ │           [⋮ Resize Handle ⋮]                 │ │
│             │ └─────────────────┴─────────────────────────────┘ │
└─────────────┴───────────────────────────────────────────────────┘
```

### Split Orientations

**Vertical Split (Default):**
```
┌─────────────────┬─────────────────┐
│   Left Pane     │   Right Pane    │
│                 │                 │
│   (50%)         │   (50%)         │
└─────────────────┴─────────────────┘
```

**Horizontal Split:**
```
┌───────────────────────────────────┐
│   Top Pane (50%)                  │
├───────────────────────────────────┤
│   Bottom Pane (50%)               │
└───────────────────────────────────┘
```

### Activation Methods

| Method | Action |
|--------|--------|
| Tab context menu | Right-click tab → "Split Right" / "Split Down" |
| Keyboard shortcut | `Cmd/Ctrl+\` (split current tab) |
| Drag tab | Drag tab to edge indicator |
| Direct link | Navigate to spec → Click "Open in Split" |

### Split Behavior

**Creating Splits:**
- Split current tab → Opens content picker for second pane
- Open in split from list → Adds to existing split or creates new
- Maximum 2 panes per tab (keep simple)
- Each pane has independent scroll position

**Resizing:**
- Draggable divider between panes
- Double-click divider → Reset to 50/50
- Min pane width: 300px (prevents unusable panes)
- Resize state persists in tab storage

**Closing Splits:**
- Click × on pane → Closes that pane, other expands
- Drag divider to edge → Collapses pane
- Keyboard: `Cmd/Ctrl+Shift+\` closes split

### Common Workflows

**1. Spec + Session Logs (Primary)**
```
Left: Spec 168 (requirements)    Right: Session logs (implementation progress)
```

**2. Parent + Child Specs**
```
Left: Umbrella spec              Right: Child spec being implemented
```

**3. Dependency Comparison**
```
Left: Spec A (depends on B)      Right: Spec B (the dependency)
```

**4. Edit + Preview (Future)**
```
Left: Spec markdown editor       Right: Rendered preview
```

### Tab Indicator

When a tab is split, update the tab to show both contents:

```
Normal tab:    [📄 168-orchestration×]
Split tab:     [📄 168 ⎮ 🤖 Session×]
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+\` | Split current tab (vertical) |
| `Cmd/Ctrl+Shift+\` | Close split (expand remaining pane) |
| `Cmd/Ctrl+Option+\` | Toggle split orientation |
| `Cmd/Ctrl+[` | Focus left/top pane |
| `Cmd/Ctrl+]` | Focus right/bottom pane |

## Implementation

### Component Architecture

```typescript
// src/components/split/SplitView.tsx
interface SplitViewProps {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  orientation: 'horizontal' | 'vertical';
  splitRatio: number; // 0.0 - 1.0
  onSplitRatioChange: (ratio: number) => void;
  onClose: (pane: 'left' | 'right') => void;
}

// src/components/split/SplitPane.tsx
interface SplitPaneProps {
  children: React.ReactNode;
  isFocused: boolean;
  onClose: () => void;
}

// src/components/split/ResizeHandle.tsx
interface ResizeHandleProps {
  orientation: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
  onReset: () => void; // Double-click
}
```

### Tab State Extension

```typescript
interface Tab {
  // ... existing fields
  split?: {
    enabled: boolean;
    orientation: 'horizontal' | 'vertical';
    ratio: number;
    leftPath: string;
    rightPath: string;
    focusedPane: 'left' | 'right';
  };
}
```

### Dependencies

```json
{
  "react-resizable-panels": "^2.x"  // Proven split panel library
}
```

## Plan

### Phase 1: Core Split View (Week 1)

- [ ] Create SplitView container component
- [ ] Implement resizable divider with react-resizable-panels
- [ ] Add split state to tab storage
- [ ] Create pane focus management
- [ ] Handle min/max constraints

### Phase 2: Activation Methods (Week 1-2)

- [ ] Add "Split Right/Down" to tab context menu
- [ ] Implement Cmd+\ keyboard shortcut
- [ ] Create content picker for new pane
- [ ] Add drag-to-edge split creation (stretch goal)

### Phase 3: Integration (Week 2)

- [ ] Update tab bar to show split indicator
- [ ] Add "Open in Split" button to spec/session lists
- [ ] Integrate with router for deep linking
- [ ] Handle split state on tab close/restore

### Phase 4: Polish (Week 2-3)

- [ ] Add orientation toggle (vertical ↔ horizontal)
- [ ] Persist split state across sessions
- [ ] Responsive handling (collapse on mobile)
- [ ] Keyboard navigation between panes
- [ ] Focus indicators for accessibility

## Test

- [ ] Split tab shows two panes correctly
- [ ] Resize divider works smoothly
- [ ] Each pane scrolls independently
- [ ] Close pane expands remaining content
- [ ] Split state persists in tab storage
- [ ] Keyboard shortcuts work
- [ ] Tab indicator shows both pane contents
- [ ] Works with spec + session combination
- [ ] Works with spec + spec combination
- [ ] Min width constraint enforced

## Notes

### Design Decisions

**Why max 2 panes?**
- Simplicity - 3+ panes adds significant complexity
- Screen space - 2 panes fit most use cases
- Cognitive load - More than 2 items to compare is rare
- Can always open another split tab for more

**Why not floating panes?**
- Adds window management complexity
- Desktop-only concern (web can't do floating)
- Split within tab is more predictable
- Consider for future if demand exists

### Dependencies

- 298-browser-style-tabs - Tabs must exist for splits to work within tabs

### Related Specs

- 297-multi-tasking-ui-architecture (parent umbrella)
- 298-browser-style-tabs (dependency - extends tab system)
- 244-session-ui-enhancement (session logs as split pane)
