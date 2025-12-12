---
status: planned
created: '2025-12-12'
tags:
  - desktop
  - ui
  - ux
  - projects
  - management
  - navigation
priority: high
created_at: '2025-12-12T05:49:19.788Z'
depends_on:
  - 148-leanspec-desktop-app
  - 112-project-management-ui
  - 141-multi-project-management-ui-improvements
  - 163-multi-tasking-ui-enhancements
updated_at: '2025-12-12T05:54:52.050Z'
---
## Overview

The LeanSpec desktop app currently lacks a dedicated, easily accessible projects management interface. While the web UI has a `/projects` page (from specs 112 and 141), the desktop app embeds this in an iframe without providing clear navigation or desktop-native enhancements. Users have no intuitive way to:

- View all their projects in a single dashboard
- Manage project metadata (name, description, color) from the desktop UI
- Organize projects (favorites, recents, folders/groups)
- Access project management without manually typing URLs
- Leverage desktop-specific capabilities (native dialogs, drag-and-drop, system integration)

**Problem Statement:**

1. **Discoverability**: No menu item or UI element points to project management
2. **Desktop Integration**: Web UI project page doesn't leverage desktop capabilities
3. **Navigation**: Switching between active project view and management view is unclear
4. **Visual Hierarchy**: Current title bar dropdown is minimal; doesn't show project health/status
5. **Organization**: Limited organization beyond basic list
6. **Onboarding**: New users don't know how to add their first project effectively

**Target Users:**
- Developers managing 5-10+ LeanSpec projects locally
- Consultants switching between client codebases frequently
- Teams wanting organized project workspaces
- Users migrating from other tools wanting bulk import

**Success Criteria:**
- Projects management accessible within 1-2 clicks from any desktop state
- Native desktop feel (keyboard shortcuts, context menus)
- Clear visual distinction between "active project view" and "management view"
- Support for displaying 50+ projects without UI degradation
- Reduced friction for adding/switching projects (≤3 clicks)

## Design

### Architecture: Two-Mode System

**Mode 1: Active Project View (Current)**
- Shows the current project's specs, board, dependencies
- Title bar has minimal project switcher dropdown
- User is "working in" a specific project

**Mode 2: Projects Management View (New)**
- Dashboard showing ALL projects as cards/list
- Rich metadata, stats, health indicators
- Bulk operations, organization features
- User is "managing their workspace"

### Navigation Structure

**NOTE**: This design integrates with spec 163 (multi-tasking-ui-enhancements) which introduces:
- Persistent project sidebar (left side)
- Browser-style tabs for navigation
- Quick switcher (Cmd/Ctrl+K)

The projects management view is accessed via the project sidebar or quick switcher, not a separate menu.

```
Desktop App Window
├── Title Bar
│   ├── Window Title / Active Tab
│   ├── Add Project Button (+)
│   └── Window Controls
│
├── Project Sidebar (spec 163)                    Main Content Area
│   ├── 📁 Projects (collapsible)          │   ├── Active Project View (default)
│   │   ├── > lean-spec (163 specs)       │   │   ├── [Tab 1] [Tab 2] [Tab 3×]  ← Browser tabs
│   │   ├── > devlog (45 specs)           │   │   ├── Content: Spec details, Board, etc.
│   │   └── my-app (12 specs)             │   │   └── (Specs navigation sidebar)
│   ├── [Manage All Projects] ← Button    │   │
│   └── [+ Add Project]                    │   └── Projects Management View (toggle)
│                                          │       ├── Header: Search + Filter + Actions
│                                          │       ├── Tabs: All / Favorites / Recent
│                                          │       ├── View: Grid / List / Compact
│                                          │       └── Project Cards/Rows
│
└── Status Bar (optional)
    ├── Active Project Indicator
    ├── Total Projects Count
    └── Quick Actions
```

### Projects Management View - Detailed Design

#### 1. Header Section

```
┌─────────────────────────────────────────────────────────┐
│  ← Back to [Project Name]        Projects               │
│  ─────────────────────────────────────────────────────  │
│  🔍 Search projects...    [All ▾] [Grid ≡]  [+]         │
└─────────────────────────────────────────────────────────┘
```

**Components:**
- **Back Button**: Returns to active project view (if one is set)
- **Search Bar**: Full-text search across project names and paths
- **Filter Dropdown**: All / Favorites
- **View Toggle**: Grid (cards) / List (table)
- **Add Project Button**: Opens native folder picker

#### 2. Organization Tabs

```
┌─────────────────────────────────────────────────────────┐
│  All (23)  │  Favorites (5)  │  [Sort: Last Accessed ▾]│
└─────────────────────────────────────────────────────────┘
```

- **All**: Every project in registry
- **Favorites**: User-starred projects
- **Sort Options**: Name, Last Accessed, Spec Count

#### 3. Grid View (Default)

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ [★] MyApp        │  │ [☆] ClientSite   │  │ [☆] Internal Tool│
│ ┌──────────────┐ │  │ ┌──────────────┐ │  │ ┌──────────────┐ │
│ │ MYA          │ │  │ │ CLI          │ │  │ │ INT          │ │
│ └──────────────┘ │  │ └──────────────┘ │  │ └──────────────┘ │
│ ~/dev/myapp      │  │ ~/clients/acme   │  │ ~/work/internal  │
│                  │  │                  │  │                  │
│ 45 specs         │  │ 12 specs         │  │ 8 specs          │
│ ████████░░ 80%   │  │ ███░░░░░░░ 30%   │  │ ██████████ 100%  │
│                  │  │                  │  │                  │
│ ✓ Valid          │  │ ⚠️ Not synced    │  │ ✓ Valid          │
│ Last: 2h ago     │  │ Last: 3d ago     │  │ Last: 1w ago     │
│                  │  │                  │  │                  │
│ [Open] [•••]     │  │ [Open] [•••]     │  │ [Open] [•••]     │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

**Card Components:**
- **Header**: Star toggle + Project name (editable inline)
- **Avatar**: Color-coded initials or custom icon
- **Path**: Truncated with tooltip showing full path
- **Stats**: Spec count, completion progress bar
- **Health Status**: Valid / Invalid / Warning with icon
- **Last Accessed**: Relative time (e.g., "2 hours ago")
- **Actions**: Primary "Open" button + overflow menu (•••)

**Overflow Menu Actions:**
- Set as Active
- Rename
- Reveal in Finder/Explorer
- Refresh Validation
- Remove from List (doesn't delete files)

#### 4. List View (Compact)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ★  Name              Path                    Specs    Status      Last Accessed │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ★  MyApp             ~/dev/myapp             45       ✓ Valid     2h ago        │
│ ☆  ClientSite        ~/clients/acme          12       ⚠️ Warning  3d ago        │
│ ☆  Internal Tool     ~/work/internal         8        ✓ Valid     1w ago        │
│ ★  Prototype         ~/projects/proto        23       ✓ Valid     5m ago        │
│ ☆  Legacy System     ~/old/legacy            156      ❌ Invalid  2mo ago       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Table Features:**
- Sortable columns (click header to sort)
- Row hover actions (quick open, favorite toggle)
- Inline editing (double-click name)
- Right-click context menu

### Desktop-Specific Enhancements

#### 1. Native Menu Integration

**Integration with Spec 163:**
- Project sidebar already provides project navigation
- Quick switcher (Cmd/Ctrl+K) provides command access
- "Manage All Projects" is a button in the project sidebar (spec 163) OR accessible via quick switcher

**File Menu:**
```
File
├── Open Project...              Cmd+O
├── Open Recent
│   ├── MyApp
│   ├── ClientSite
│   └── Clear Recent
├── Add Project to Workspace...  Cmd+Shift+O
├── Close Project                Cmd+W
├── ─────────────────
└── Manage All Projects...       Cmd+Shift+M  ← Opens in tab
```

**View Menu:**
```
View
├── Show Project Sidebar         Cmd+B  ← From spec 163
├── Show Projects Manager        Cmd+Shift+M
├── Show Active Project          Cmd+1
├── ─────────────────
└── Project Manager Views
    ├── Grid View
    └── List View
```

#### 2. Keyboard Shortcuts

**NOTE**: Integrates with spec 163 shortcuts. Adjusted `Cmd+Shift+P` to `Cmd+Shift+M` to avoid conflict with quick switcher.

| Shortcut | Action | Context |
|----------|--------|---------|
| `Cmd/Ctrl+K` | Open Quick Switcher (spec 163) | Global |
| `Cmd/Ctrl+B` | Toggle Project Sidebar (spec 163) | Global |
| `Cmd/Ctrl+Shift+M` | Open Projects Manager | Global |
| `Cmd/Ctrl+1` | Return to Active Project | Projects Manager |
| `Cmd/Ctrl+O` | Open Project Dialog | Global |
| `Cmd/Ctrl+Shift+O` | Add Project to Workspace | Global |
| `Cmd/Ctrl+F` | Focus Search | Projects Manager |
| `Cmd/Ctrl+N` | Create New Project | Projects Manager |
| `Arrow Keys` | Navigate projects | Projects Manager (Grid/List) |
| `Enter` | Open selected project | Projects Manager |
| `Space` | Toggle favorite | Projects Manager |
| `Delete/Backspace` | Remove selected project | Projects Manager |

#### 3. Drag-and-Drop Support

**Actions:**
- Drag folder from Finder/Explorer → Desktop app → Auto-add as project

#### 4. System Tray Integration

```
LeanSpec
├── Active: MyApp
├── ─────────────────
├── Recent Projects
│   ├── MyApp
│   ├── ClientSite
│   └── More...
├── ─────────────────
├── Open Projects Manager    Cmd+Shift+P
├── Add Project...           Cmd+Shift+O
└── Refresh All Projects
```

#### 5. Native Context Menus

**Right-click on project card/row:**
```
Open                      Enter
Set as Active             Cmd+Click
─────────────────
Star/Unstar              Space
Rename...
─────────────────
Reveal in Finder         Cmd+R
Copy Path
─────────────────
Refresh Validation
Remove from List         Delete
```

### Project Health & Validation

#### Health Indicators

| Status | Icon | Description | Actions Available |
|--------|------|-------------|-------------------|
| ✓ Valid | Green checkmark | Project path exists, config valid, specs accessible | Open, Refresh |
| ⚠️ Warning | Yellow warning | Minor issues (no config file, few specs, etc.) | Open, Validate |
| ❌ Invalid | Red X | Path not found, access denied, corrupted config | Remove |
| 🔄 Syncing | Blue spinner | Background validation in progress | Cancel |

#### Background Validation

**On App Startup:**
1. Load projects from `~/.lean-spec/projects.json`
2. Quick validation: Check if paths exist (fast)
3. Background deep validation: Count specs, parse config (slower)
4. Update UI progressively as validation completes

**Manual Refresh:**
- Button in projects manager header: "Refresh All"
- Per-project action: "Refresh Validation"
- Auto-refresh when project is accessed (if >1h since last check)

### Project Metadata & Editing

#### Editable Fields

**Inline Editing (double-click):**
- Project Name

**Future Enhancements** (defer to V2):
- Description field
- Custom colors
- Tags system

#### Project Statistics

**Displayed in card/list view:**
- Total specs
- Last accessed date

**Future Enhancements** (defer to V2):
- Completion rate
- Detailed status breakdown
- Git integration

### Import/Export Projects (Defer to V2)

**Export Format (JSON):**
```json
{
  "version": "1.0",
  "exported": "2025-12-12T10:30:00Z",
  "projects": [
    {
      "name": "MyApp",
      "path": "~/dev/myapp",
      "favorite": true,
      "color": "#3b82f6",
      "description": "Main application project",
      "tags": ["frontend", "typescript"]
    }
  ]
}
```

**Import Options:**
- Import from file (JSON)
- Import from directory scan (discover all LeanSpec projects in folder tree)
- Merge vs. Replace existing projects

**Use Cases:**
- Backup project list before reinstalling
- Share project configurations across team
- Migrate from web UI to desktop app
- Sync across multiple machines (via dotfiles)

### Visual Design Guidelines

#### Color Scheme

**Project Avatars:**
- Default: Auto-generated color from project name hash
- Custom: 12 preset colors + custom picker
- Initials: First 2-3 letters of project name

**Status Colors:**
- Valid: `bg-green-100 text-green-800 border-green-300`
- Warning: `bg-yellow-100 text-yellow-800 border-yellow-300`
- Invalid: `bg-red-100 text-red-800 border-red-300`
- Inactive: `bg-gray-100 text-gray-500 border-gray-200`

#### Typography

**Desktop-Optimized:**
- Project names: `font-semibold text-base`
- Paths: `font-mono text-sm text-muted-foreground`
- Stats: `text-sm text-muted-foreground`
- Counts: `font-medium text-sm`

#### Spacing

**Grid View:**
- Card width: `280px` (min) to `320px` (max)
- Card height: `200px` (fixed)
- Gap: `16px` (grid-gap)
- Padding: `16px` (card internal)

**List View:**
- Row height: `56px`
- Column padding: `12px`
- Row hover: `bg-muted/50`

#### Responsive Breakpoints

```
< 800px:   Single column grid, full-width cards
800-1200px: 2-column grid  
1200-1600px: 3-column grid
> 1600px:  4-column grid
```

**List view**: Always full width with responsive column hiding on narrow screens

### Empty States

#### No Projects Yet

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                  📁 No Projects Yet                 │
│                                                     │
│        Get started by adding your first project    │
│                                                     │
│              [📂 Open Project Folder]              │
│                                                     │
│               or drag a folder here                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### No Search Results

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│               🔍 No projects found                  │
│                                                     │
│         Try adjusting your search terms            │
│                                                     │
│                  [Clear Search]                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### No Favorites

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│              ⭐ No favorite projects                │
│                                                     │
│      Star projects to see them here for quick      │
│                      access                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Web UI Considerations

The desktop app provides the richest experience with native OS integration. Web UI parity can be addressed in a future iteration based on user demand.

## Plan

### Phase 1: Core Navigation & Layout (Week 1)

**Day 1-2: Integration with Spec 163**
- [ ] Add "Manage All Projects" button to project sidebar (spec 163)
- [ ] Add "Projects Manager" command to quick switcher (Cmd+K)
- [ ] Implement keyboard shortcut `Cmd/Ctrl+Shift+M`
- [ ] Update File menu: "Manage All Projects" (Cmd+Shift+M)
- [ ] Projects manager opens in new tab (spec 163 tab system)

**Day 3-4: State Management & IPC**
- [ ] Define TypeScript types for projects state
- [ ] Create Tauri commands: list, update, remove, validate
- [ ] Implement `useProjectsManager()` React hook
- [ ] Handle navigation between active project and management view

**Day 5: Basic Layout**
- [ ] Create `ProjectsManagerView` component
- [ ] Implement header with search bar and add button
- [ ] Create basic routing (`/desktop/projects`)
- [ ] Test navigation flow

### Phase 2: Grid View & Project Cards (Week 2)

**Day 1-3: Grid View Implementation**
- [ ] Create `ProjectCard` component
- [ ] Display project name, path, spec count
- [ ] Add project avatar with auto-generated color
- [ ] Implement health status indicators
- [ ] Add star/unstar toggle
- [ ] Add "Open" button and overflow menu
- [ ] Implement responsive grid layout

**Day 4: Project Actions**  
- [ ] Implement "Open" action (switch active project)
- [ ] Add "Remove" with confirmation dialog
- [ ] Implement "Reveal in Finder/Explorer"
- [ ] Add "Refresh Validation" action
- [ ] Create native context menu (right-click)

**Day 5: Add Project Flow**
- [ ] Implement native folder picker
- [ ] Add drag-and-drop zone for folders
- [ ] Handle project addition validation
- [ ] Update project list after addition

### Phase 3: Organization & Filtering (Week 3)

**Day 1-2: Search & Filtering**
- [ ] Implement full-text search (name + path)
- [ ] Add "All" vs "Favorites" tabs
- [ ] Implement sort dropdown (Name, Last Accessed, Spec Count)
- [ ] Optimize search for large project lists

**Day 2-3: List View**
- [ ] Create `ProjectsTable` component
- [ ] Implement sortable columns
- [ ] Add row hover actions
- [ ] Support inline name editing (double-click)
- [ ] Add view toggle button (Grid ↔ List)
- [ ] Persist view preference

**Day 4-5: Validation System**
- [ ] Implement background validation on startup
- [ ] Display health status (Valid, Warning, Invalid, Syncing)
- [ ] Add "Refresh Validation" per project
- [ ] Add "Refresh All" button in header
- [ ] Handle missing/invalid project paths gracefully

### Phase 4: Polish & Launch (Week 4)

**Day 1-2: Keyboard Shortcuts**
- [ ] Register all shortcuts in Tauri backend
- [ ] Implement arrow key navigation in grid/list
- [ ] Add Enter to open, Space to favorite
- [ ] Create shortcuts help overlay (`?` key)

**Day 3: Empty States & Onboarding**
- [ ] Design "No projects yet" state with CTAs
- [ ] Add "No search results" state
- [ ] Add "No favorites" state
- [ ] Test first-time user experience

**Day 4: Performance & Visual Polish**
- [ ] Test with 100+ projects
- [ ] Add loading skeletons
- [ ] Refine colors, spacing, typography
- [ ] Add smooth transitions
- [ ] Verify dark mode support

**Day 5: Testing & Documentation**
- [ ] Write integration tests
- [ ] Test all user flows end-to-end
- [ ] Update user documentation
- [ ] Fix critical bugs
- [ ] Ship to production

### Deferred to V2 (Based on User Feedback)

**Features intentionally excluded from MVP:**
- Bulk operations (multi-select, bulk star/remove/export)
- Compact view mode (grid + list is sufficient)
- Import/Export functionality
- Advanced metadata editing (description, tags, custom colors)
- Detailed statistics (completion rate, token counts, git status)
- "Recent" tab (use sort by last accessed instead)
- Virtual folders/grouping
- Web UI parity

## Test

### Functional Testing

**Navigation:**
- [ ] Can open projects manager from project sidebar button (spec 163)
- [ ] Can open projects manager from quick switcher (Cmd+K)
- [ ] Can open projects manager from native menu (File > Manage All Projects)
- [ ] Can open projects manager via keyboard shortcut (Cmd/Ctrl+Shift+M)
- [ ] Projects manager opens in new tab (spec 163 tab system)
- [ ] Can return to active project from projects manager
- [ ] Tab switching works correctly (Cmd+Tab)

**Project Display:**
- [ ] All projects load correctly on manager open
- [ ] Project cards show correct metadata (name, path, stats)
- [ ] Health status indicators display correctly
- [ ] Avatars render with correct colors
- [ ] Favorites show star icon (filled vs. outline)
- [ ] Last accessed time updates correctly

**View Modes:**
- [ ] Can switch between grid and list views
- [ ] View preference persists across sessions
- [ ] Grid view responsive (1-4 columns based on width)
- [ ] List view sortable columns work

**Organization:**
- [ ] "All" tab shows all projects
- [ ] "Favorites" tab shows only starred projects
- [ ] Sort by name/last accessed/spec count works
- [ ] Search filters projects by name/path
- [ ] Filter dropdown works (All vs Favorites)

**Project Actions:**
- [ ] Can open project (switches active project)
- [ ] Can star/unstar project
- [ ] Can rename project inline (double-click)
- [ ] Can remove project from list (with confirmation)
- [ ] Can reveal project folder in OS (desktop only)
- [ ] Can refresh validation per project

**Desktop-Specific:**
- [ ] Native folder picker opens for "Add Project"
- [ ] Drag-and-drop folder onto app adds project
- [ ] Right-click context menu appears on project card
- [ ] Keyboard shortcuts work (arrow keys, Enter, Space, Delete)
- [ ] Global keyboard shortcut (Cmd+Shift+M) works when app in background

**Validation:**
- [ ] Projects validate on app startup
- [ ] Health status updates correctly
- [ ] "Refresh Validation" re-checks project health
- [ ] "Refresh All" validates all projects
- [ ] Invalid projects show error state with actionable message

### Performance Testing

- [ ] Loads 100+ projects without lag
- [ ] Search filters quickly (<100ms for 100 projects)
- [ ] View switching is instant
- [ ] Bulk operations complete in reasonable time
- [ ] Background validation doesn't block UI

### Usability Testing

- [ ] First-time users can find projects manager within 30 seconds
- [ ] Adding a new project takes ≤3 clicks
- [ ] Switching between projects takes ≤2 clicks
- [ ] Keyboard power users can navigate without mouse
- [ ] Empty states are clear and actionable

### Cross-Platform Testing

**Desktop:**
- [ ] macOS: Native menus, shortcuts, file picker work
- [ ] Windows: Native menus, shortcuts, file picker work
- [ ] Linux: Native menus, shortcuts, file picker work
- [ ] Drag-and-drop works on all platforms

### Accessibility Testing

- [ ] Keyboard navigation works (Tab, Arrow keys, Enter, Space)
- [ ] Focus indicators are visible
- [ ] Screen reader announces project cards correctly
- [ ] Color contrast meets WCAG AA standards
- [ ] All actions have keyboard shortcuts

## Notes

### Design Decisions

**Integration with Spec 163:**
- Spec 163 provides project sidebar for quick navigation/switching
- This spec (167) provides dedicated management view for organization and bulk viewing
- Complementary: Sidebar = quick access, Management view = detailed overview
- Management view opens as a tab (spec 163 tab system)

**Why Grid + List views only?**
- Grid: Visual browsing, rich metadata at a glance
- List: Power users, sortable columns, higher density
- Compact view removed as marginal value over optimized list view
- Can add in V2 if users request it

**Why no bulk operations in MVP?**
- Rare use case: How often do you star 10 projects at once?
- Adds UI complexity (checkboxes, action bar, confirmation flows)
- Individual operations are fast enough for typical usage
- Can add in V2 if user feedback shows demand

**Why defer import/export?**
- `~/.lean-spec/projects.json` is already portable/editable
- Most users manage projects through UI
- "Discover projects" is interesting but complex
- Focus on core workflows first, iterate based on feedback

**Why All + Favorites only (no Recent tab)?**
- "Recent" is redundant with "Sort by Last Accessed"
- Reduces tab complexity
- Most users use either All or Favorites
- Simpler mental model for MVP

### Technical Considerations

**State Management:**
- Use React Context for projects manager state (separate from active project)
- Tauri backend manages `~/.lean-spec/projects.json` as source of truth
- IPC for all CRUD operations (create, read, update, delete)
- Optimistic updates with rollback on failure

**Performance Optimizations:**
- Virtualize project list if >100 projects (react-window or similar)
- Debounce search input (300ms)
- Lazy load project stats (fetch on demand, cache results)
- Use memoization for expensive computations

**Error Handling:**
- Gracefully handle missing project directories (show error state)
- Handle filesystem permissions issues (provide clear error message)
- Handle corrupted config files (offer repair or removal)
- Provide "Undo" for destructive actions (remove, bulk delete)

### Future Enhancements (V2+)

**Features deferred based on user feedback:**
- Bulk operations (multi-select, batch actions)
- Compact view mode
- Import/Export functionality  
- Advanced metadata (description, tags, custom colors)
- Detailed statistics (completion rate, token counts, git status)
- "Recent" tab
- Virtual folders/grouping
- Web UI parity
- Project templates
- Team sync (shared project registry)
- Project analytics dashboard

### Related Specs

- **148-leanspec-desktop-app**: Foundation for desktop app architecture
- **163-multi-tasking-ui-enhancements**: Project sidebar, tabs, and multi-tasking features (CRITICAL: aligns with this spec)
- **112-project-management-ui**: Initial web UI projects page implementation
- **141-multi-project-management-ui-improvements**: UX improvements for projects page
- **109-local-project-switching**: Multi-project switching infrastructure
- **151-multi-project-architecture-refactoring**: Architecture cleanup for multi-project support

### Open Questions

1. **How to handle very large projects (1000+ specs)?**
   - Implement virtualization if performance degrades
   - Monitor in production, optimize if needed

2. **Should project stats be cached or computed on-demand?**
   - Cache with manual refresh option
   - Balance between accuracy and performance

3. **How to handle project path changes (user moves folder)?**
   - Detect on validation, show error state
   - User can remove and re-add project

### Coordination with Spec 163

**Spec 163 provides:**
- Persistent project sidebar (collapsible)
- Project list with spec counts
- Quick project switching
- Browser-style tabs for navigation
- Quick switcher (Cmd+K)

**This spec (167) provides:**
- "Manage All Projects" button in sidebar (integration point)
- Dedicated management view (opens as tab)
- Rich project cards with detailed metadata
- Bulk operations (multi-select, export, etc.)
- Project health/validation system
- Advanced organization (grid/list/compact views)

**Implementation Order:**
1. Spec 163 first (provides sidebar + tabs infrastructure)
2. Then spec 167 (builds on top with management view)
3. Management view leverages tab system from spec 163

**Design Alignment:**
- Both specs use same project registry (`~/.lean-spec/projects.json`)
- Sidebar (163) shows compact list; Management view (167) shows rich cards
- Sidebar for quick access; Management view for deep operations
- Consistent keyboard shortcuts across both specs
