# Visual Comparison: Before & After

## Dependencies Page Graph Nodes

### Before (Text Labels)
```
┌─────────────────────┐
│ #087           PLN  │
│ Feature Name        │
└─────────────────────┘

┌─────────────────────┐
│ #045           WIP  │
│ API Design          │
└─────────────────────┘

┌─────────────────────┐
│ #099           COM  │
│ End to End          │
└─────────────────────┘
```

### After (Icons + Levels)
```
┌─────────────────────┐
│ #087    [🕐] [↑]    │
│ Feature Name        │
└─────────────────────┘

┌─────────────────────┐
│ #045  [▶] [−] L1    │
│ API Design          │
└─────────────────────┘

┌─────────────────────┐
│ #099  [✓] [↓] L2    │
│ End to End          │
└─────────────────────┘
```

**Key Changes**:
- Text badges → Icon indicators
- Added priority icons (second icon)
- Added level badges (L1, L2, etc.)
- More compact, scannable layout

## Sidebar Spec Lists

### Before
```
Depends On (3)
┌────────────────────────────────┐
│ #045  PLN                      │
│ API Design             Direct  │
└────────────────────────────────┘
┌────────────────────────────────┐
│ #035  WIP                      │
│ UI Components          L2      │
└────────────────────────────────┘
```

### After
```
Depends On (3)
┌────────────────────────────────┐
│ #045 [🕐] [↑]          Direct  │
│ API Design                     │
└────────────────────────────────┘
┌────────────────────────────────┐
│ #035 [▶] [−]           L2      │
│ UI Components                  │
└────────────────────────────────┘
```

**Key Changes**:
- Inline status + priority icons
- Cleaner, more visual hierarchy
- Faster to scan multiple specs

## Spec Detail Dialog Nodes

### Before (No Metadata)
```
┌─────────────────────────────────┐
│ DEPENDS ON                      │
│                                 │
│ #045 API Design                 │
│ Must complete first             │
└─────────────────────────────────┘
```

### After (Full Metadata)
```
┌─────────────────────────────────┐
│ DEPENDS ON          [🕐] [↑]    │
│                                 │
│ #045 API Design                 │
│ Must complete first             │
└─────────────────────────────────┘
```

**Key Changes**:
- Status/priority icons in top right
- Consistent with main dependencies page
- Rich metadata at a glance

## Icon Legend

### Status Icons
- 🕐 (Clock) = Planned
- ▶ (PlayCircle) = In Progress
- ✓ (CheckCircle) = Complete
- 📦 (Archive) = Archived

### Priority Icons
- ⚠ (AlertCircle) = Critical
- ↑ (ArrowUp) = High
- − (Minus) = Medium
- ↓ (ArrowDown) = Low

### Level Indicators
- **Direct** = Level 1 (immediate dependency)
- **L2** = Level 2 (transitive through 1 hop)
- **L3** = Level 3 (transitive through 2 hops)
- etc.

## Color Coding

### Status Colors
```
Planned:     Blue (#3b82f6)
In Progress: Orange (#f97316)
Complete:    Green (#22c55e)
Archived:    Gray (#6b7280)
```

### Priority Colors
```
Critical:    Red (#ef4444)
High:        Orange (#f97316)
Medium:      Blue (#3b82f6)
Low:         Gray (#6b7280)
```

## Responsive Behavior

### Standard Mode (180px nodes)
```
Icon size: 2.5x2.5 pixels (h-2.5 w-2.5)
Padding: 1px (p-1)
Text: 10px font size
```

### Compact Mode (120px nodes)
```
Icon size: 2x2 pixels (h-2 w-2)
Padding: 0.5px (p-0.5)
Text: 8px font size
```

## Dark Mode Adjustments

- Icon colors adjust automatically
- Background opacity maintains contrast
- Text colors shift to lighter variants
- All visual hierarchy preserved

## Accessibility

- **Tooltips**: Hover shows full text ("planned", "high priority")
- **Color + Shape**: Icons distinguish by both (not color-blind dependent)
- **Semantic Icons**: Meaningful symbols (clock = time, check = done)
- **ARIA Labels**: Screen readers announce status/priority
