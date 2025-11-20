---
status: in-progress
created: '2025-11-20'
tags:
  - web
  - ux
  - dx
  - enhancement
priority: high
assignee: marvin
created_at: '2025-11-20T05:48:22.711Z'
related:
  - 017-vscode-extension
  - 036-pm-integrations
  - 087-cli-ui-command
updated_at: '2025-11-20T07:01:48.211Z'
transitions:
  - status: in-progress
    at: '2025-11-20T07:01:48.211Z'
---

# Local Multi-Project Switching in Web UI

> **Status**: ⏳ In progress · **Priority**: High · **Created**: 2025-11-20 · **Tags**: web, ux, dx, enhancement
> **Assignee**: marvin · **Reviewer**: TBD

**Project**: lean-spec  
**Team**: Core Development

## Overview

Enable switching between multiple LeanSpec projects locally in the web UI (`lean-spec ui`). Currently, the web UI is limited to a single project per server instance, making it difficult to multitask across different projects efficiently.

**Developer Pain Points:**
- Working on multiple projects requires running multiple `lean-spec ui` instances on different ports
- No way to quickly switch between project contexts in the same browser window
- Manual port management and browser tab juggling disrupts workflow
- Difficult to compare specs across different projects
- Context switching friction reduces productivity

**What Success Looks Like:**
- Single web UI instance can access multiple projects
- Quick project switcher in the UI (dropdown or sidebar)
- Recent projects remembered and easily accessible
- Project-specific URLs for bookmarking/sharing (`localhost:3000/project/my-app`)
- Seamless context switching without losing scroll position or filters
- Compare/reference specs across projects side-by-side

**Why This Matters:**
- Enables efficient multitasking on multiple codebases
- Reduces cognitive overhead of managing multiple servers/ports
- Better supports consultants and freelancers juggling client projects
- Aligns with how developers actually work (multiple projects simultaneously)
- Foundation for future multi-project features (cross-project search, unified dashboard)

## Design

### 1. Project Discovery & Registration

**Auto-Discovery:**
```typescript
// Scan common workspace locations
const workspaceRoots = [
  process.env.HOME + '/projects',
  process.env.HOME + '/workspace',
  process.env.HOME + '/code',
  process.cwd() + '/..'  // Parent directory
];

// Find all .lean-spec/config.json or leanspec.yaml files
const projects = await discoverProjects(workspaceRoots);
```

**Manual Registration:**
```bash
# CLI command to add project
lean-spec ui --add-project /path/to/project

# Or via UI: Settings → Projects → Add Project
```

**Project Metadata:**
```typescript
interface Project {
  id: string;              // Unique identifier (hash of path)
  name: string;            // Display name (from config or folder name)
  path: string;            // Absolute path to project root
  specsDir: string;        // Path to specs/ directory
  lastAccessed: Date;      // For sorting recent projects
  favorite: boolean;       // User can pin favorites
  color?: string;          // Optional color coding
  description?: string;    // From project README or config
}
```

**Configuration Storage:**
```yaml
# ~/.lean-spec/projects.yaml (global user config)
projects:
  - id: abc123
    name: lean-spec
    path: /home/user/projects/lean-spec
    specsDir: /home/user/projects/lean-spec/specs
    lastAccessed: 2025-11-20T10:30:00Z
    favorite: true
    color: "#3b82f6"
  
  - id: def456
    name: my-saas-app
    path: /home/user/work/my-saas-app
    specsDir: /home/user/work/my-saas-app/docs/specs
    lastAccessed: 2025-11-19T15:45:00Z
    favorite: false

recentProjects: [abc123, def456]  # Most recent first (max 10)
```

### 2. UI Components

**Current UI Architecture (Left Sidebar):**
Based on the current web UI design, navigation is now in a left sidebar rather than top bar:

```
┌──────────────┬─────────────────────────────────────────┐
│  🏠 Home     │  Project: lean-spec ▼                   │
│  📋 Specs    │                                          │
│  📊 Stats    │  [Main Content Area]                     │
│              │                                          │
│  ─────────   │                                          │
│  👤 Profile  │                                          │
│  ⚙️  Settings│                                          │
└──────────────┴─────────────────────────────────────────┘
```

**Enhanced Left Sidebar with Project Switcher:**
```
┌──────────────┬─────────────────────────────────────────┐
│ 🔀 Projects ▼│  Project: lean-spec                     │
│  🟦 lean-spec│                                          │
│  🟢 my-saas  │  [Main Content Area]                     │
│  🟡 client   │                                          │
│              │                                          │
│  ─────────   │                                          │
│  🏠 Home     │                                          │
│  📋 Specs    │                                          │
│  📊 Stats    │                                          │
│              │                                          │
│  ─────────   │                                          │
│  👤 Profile  │                                          │
│  ⚙️  Settings│                                          │
└──────────────┴─────────────────────────────────────────┘
```

**Project Switcher (Expanded in Sidebar):**
When clicking on "🔀 Projects ▼", show dropdown or expand inline:
```
  🔀 Projects ▼
  
  ⭐ FAVORITES
  🟦 lean-spec
  
  📌 RECENT
  🟢 my-saas-app
  🟡 client-project
  
  📂 ALL PROJECTS (12)
  [Search projects...]
  
  ➕ Add Project
```

**Collapsible Sidebar:**
The left sidebar can be collapsed to icon-only mode for more screen space:
```
┌─────┬─────────────────────────────────────────────────┐
│ 🔀  │  Project: lean-spec                             │
│ 🏠  │                                                  │
│ 📋  │  [Main Content Area - More Space]               │
│ 📊  │                                                  │
│     │                                                  │
│ 👤  │                                                  │
│ ⚙️   │                                                  │
└─────┴─────────────────────────────────────────────────┘
```

**Keyboard Shortcuts:**
- `Cmd/Ctrl + K` → Quick project switcher (fuzzy search)
- `Cmd/Ctrl + 1-9` → Switch to recent projects 1-9
- `Cmd/Ctrl + Shift + P` → Add new project

### 3. URL Structure & Routing

**Project-Scoped URLs:**
```
# Default project (legacy compatibility)
http://localhost:3000/
http://localhost:3000/specs
http://localhost:3000/specs/045-unified-dashboard

# Project-scoped (new)
http://localhost:3000/projects/lean-spec
http://localhost:3000/projects/lean-spec/specs
http://localhost:3000/projects/lean-spec/specs/045

# Project by ID (stable across renames)
http://localhost:3000/p/abc123/specs/045
```

**Routing Implementation:**
```typescript
// Next.js App Router structure
app/
├── layout.tsx                    // Global layout with LEFT SIDEBAR (nav + project switcher)
├── page.tsx                      // Root redirects to default project
├── projects/
│   └── [projectId]/
│       ├── layout.tsx            // Project-specific layout
│       ├── page.tsx              // Project home
│       ├── specs/
│       │   ├── page.tsx          // Specs list
│       │   └── [specId]/
│       │       └── page.tsx      // Spec detail
│       └── stats/
│           └── page.tsx          // Project stats
└── p/                            // Short URL alias
    └── [projectId]/
        └── [...slug]/page.tsx    // Redirect to /projects/[projectId]/[...slug]
```

**Left Sidebar Components:**
```typescript
// components/LeftSidebar.tsx - Main navigation sidebar
interface LeftSidebarProps {
  currentProject?: Project;
  onProjectSwitch: (projectId: string) => void;
}

// components/ProjectSwitcher.tsx - Dropdown/expandable project selector
interface ProjectSwitcherProps {
  projects: Project[];
  currentProjectId: string;
  onSelect: (projectId: string) => void;
  collapsed?: boolean;
}
```

### 4. State Management

**React Context for Current Project:**
```typescript
interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  switchProject: (projectId: string) => Promise<void>;
  addProject: (path: string) => Promise<Project>;
  removeProject: (projectId: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType>(null);
```

**URL-Driven State:**
- Current project determined from URL pathname
- Deep links work correctly (share URL, bookmark)
- Browser back/forward navigation works as expected
- Preserves scroll position per project

### 5. Backend Changes

**Multi-Project Filesystem Mode:**
```typescript
// Current: Single project mode
const specsDir = process.env.SPECS_DIR || './specs';

// New: Multi-project mode with project registry
interface ProjectRegistry {
  getProject(id: string): Project;
  listProjects(): Project[];
  addProject(path: string): Project;
  removeProject(id: string): void;
  getSpecs(projectId: string): Spec[];
  getSpec(projectId: string, specId: string): Spec;
}

// API routes
/api/projects                    // List all projects
/api/projects/[id]              // Get project details
/api/projects/[id]/specs        // Get specs for project
/api/projects/[id]/specs/[spec] // Get specific spec
```

**Environment Variable:**
```bash
# Single project mode (current, for backward compatibility)
SPECS_MODE=filesystem
SPECS_DIR=/path/to/project/specs

# Multi-project mode (new)
SPECS_MODE=multi-project
PROJECTS_CONFIG=~/.lean-spec/projects.yaml
```

### 6. Configuration & Persistence

**CLI Flag for Multi-Project Mode:**
```bash
# Single project (current)
lean-spec ui

# Multi-project mode (new)
lean-spec ui --multi-project

# Auto-discover projects in workspace
lean-spec ui --multi-project --discover ~/projects

# Add specific project
lean-spec ui --add-project /path/to/project
```

**Persistent Configuration:**
```yaml
# ~/.lean-spec/ui-config.yaml
mode: multi-project  # or 'single'
defaultProject: abc123
autoDiscover:
  enabled: true
  paths:
    - ~/projects
    - ~/workspace
  maxDepth: 3
projectColors:
  abc123: "#3b82f6"
  def456: "#10b981"
```

### 7. Migration Strategy

**Backward Compatibility:**
- Default behavior unchanged (single project mode)
- Opt-in to multi-project with `--multi-project` flag
- Existing URLs continue to work
- No breaking changes to API

**Gradual Rollout:**
1. **Phase 1**: Multi-project infrastructure (projects registry, API routes)
2. **Phase 2**: UI components (project switcher, sidebar)
3. **Phase 3**: Auto-discovery and quick add
4. **Phase 4**: Advanced features (compare, cross-project search)

## Plan

### Phase 1: Foundation (Week 1)

**Day 1-2: Project Registry & Backend**
- [ ] Create project registry system in `packages/ui/src/lib/projects/`
- [ ] Implement project discovery (scan filesystem for .lean-spec/)
- [ ] Add project storage (YAML config in ~/.lean-spec/)
- [ ] Create API routes for project management
- [ ] Add multi-project filesystem mode
- [ ] Write unit tests for project registry

**Day 3: URL Routing**
- [ ] Update Next.js app router for project-scoped URLs
- [ ] Implement `/projects/[projectId]/` routing structure
- [ ] Add URL redirects for backward compatibility
- [ ] Test deep linking and browser navigation
- [ ] Update middleware for project resolution

### Phase 2: UI Components (Week 2)

**Day 4-5: Project Switcher**
- [ ] Design project switcher dropdown component
- [ ] Implement recent projects list
- [ ] Add favorites toggle
- [ ] Create quick add project flow
- [ ] Add keyboard shortcuts (Cmd+K)
- [ ] Style with Tailwind + shadcn/ui

**Day 6: Project Sidebar**
- [ ] Create collapsible project sidebar
- [ ] Implement favorites section
- [ ] Add recent projects section
- [ ] Add all projects list with search
- [ ] Add project color indicators
- [ ] Test responsive behavior

**Day 7: State Management**
- [ ] Implement React Context for projects
- [ ] Add URL-driven project state
- [ ] Preserve scroll position per project
- [ ] Handle project switching loading states
- [ ] Add error boundaries for missing projects

### Phase 3: CLI Integration (Week 3)

**Day 8-9: CLI Commands**
- [ ] Add `--multi-project` flag to `lean-spec ui`
- [ ] Implement `--add-project` flag
- [ ] Add `--discover` flag for auto-discovery
- [ ] Update help text and documentation
- [ ] Test CLI with various scenarios

**Day 10: Configuration Management**
- [ ] Create `~/.lean-spec/projects.yaml` schema
- [ ] Implement config reader/writer
- [ ] Add validation for project paths
- [ ] Handle missing/moved projects gracefully
- [ ] Test with symlinks and network drives

### Phase 4: Polish & Testing (Week 4)

**Day 11-12: User Experience**
- [ ] Add loading indicators for project switching
- [ ] Implement empty states (no projects)
- [ ] Add project health indicators (valid/invalid)
- [ ] Create onboarding flow for first-time users
- [ ] Add tooltips and help text
- [ ] Test with multiple projects (5, 10, 20+)

**Day 13: Documentation**
- [ ] Update README with multi-project usage
- [ ] Add troubleshooting guide
- [ ] Create video demo of project switching
- [ ] Document keyboard shortcuts
- [ ] Add examples to docs site

**Day 14: Release Preparation**
- [ ] Version bump coordination
- [ ] Update CHANGELOG.md
- [ ] Test across different operating systems
- [ ] Performance testing (project discovery, switching)
- [ ] Security review (path traversal, permissions)

## Test

### Functional Testing

**Project Discovery:**
- [ ] Auto-discovers projects in specified directories
- [ ] Respects maxDepth setting
- [ ] Handles symlinks correctly
- [ ] Detects .lean-spec/config.json and leanspec.yaml
- [ ] Ignores node_modules and common ignore patterns

**Project Management:**
- [ ] Can add project manually via CLI
- [ ] Can add project via UI
- [ ] Can remove project (doesn't delete files)
- [ ] Can rename project display name
- [ ] Can toggle favorite status
- [ ] Validates project paths exist

**Project Switching:**
- [ ] Dropdown shows recent projects (max 10)
- [ ] Quick switcher (Cmd+K) filters by name
- [ ] Switching updates URL correctly
- [ ] Browser back/forward works correctly
- [ ] Deep links work (reload page on /projects/abc/specs/123)
- [ ] Preserves scroll position per project
- [ ] Loading indicator shows during switch

**URL Routing:**
- [ ] `/projects/[id]/specs` loads correct project
- [ ] `/p/[id]/specs` redirects to full URL
- [ ] Root `/` redirects to default project
- [ ] Invalid project ID shows 404
- [ ] Project-scoped URLs are shareable

**Keyboard Shortcuts:**
- [ ] Cmd/Ctrl+K opens quick switcher
- [ ] Cmd/Ctrl+1-9 switches to recent projects
- [ ] Esc closes quick switcher
- [ ] Arrow keys navigate project list
- [ ] Enter selects project

### Integration Testing

**With CLI:**
- [ ] `lean-spec ui` starts in single-project mode
- [ ] `lean-spec ui --multi-project` enables multi-project
- [ ] `lean-spec ui --add-project /path` adds and starts
- [ ] `lean-spec ui --discover ~/projects` finds all projects
- [ ] Works with existing `--port` and `--no-open` flags

**With Filesystem:**
- [ ] Reads specs from correct project directory
- [ ] Handles moved/deleted projects gracefully
- [ ] Updates when specs change on disk
- [ ] Works with relative and absolute paths
- [ ] Respects filesystem permissions

**With State:**
- [ ] Recent projects persist across restarts
- [ ] Favorites persist across restarts
- [ ] Last accessed timestamp updates correctly
- [ ] Config file updates atomically (no corruption)

### Performance Testing

- [ ] Project discovery completes <2s (up to 100 projects)
- [ ] Project switching completes <500ms
- [ ] Dropdown renders <100ms
- [ ] Memory usage stays reasonable (<300MB for 20 projects)
- [ ] No memory leaks during extended use

### Compatibility Testing

- [ ] Works on macOS
- [ ] Works on Linux
- [ ] Works on Windows (WSL)
- [ ] Works with Node 20+
- [ ] Works with npm, pnpm, yarn
- [ ] Handles spaces in project paths
- [ ] Handles special characters in project names
- [ ] Works with network drives (slower but functional)

### Edge Cases

- [ ] Project directory deleted while UI running
- [ ] Project moved to new location
- [ ] Multiple projects with same name
- [ ] Empty projects (no specs)
- [ ] Very large projects (1000+ specs)
- [ ] Circular symlinks in discovery
- [ ] Permission denied errors
- [ ] Concurrent project additions

## Notes

### Design Decisions

**Why left sidebar instead of top navigation?**
- **Current UI Architecture**: The web UI has been redesigned with left sidebar navigation (Home, Specs, Stats)
- **Natural Fit**: Project switcher belongs at the top of the sidebar, above main navigation
- **Vertical Space**: Sidebar provides more room for project list without horizontal constraints
- **Collapsible**: Can collapse to icons for more screen space
- **Consistent**: Matches modern app patterns (VS Code, Notion, Linear, etc.)
- **Hierarchy**: Project selection → Navigation → Content flows naturally top-to-bottom

**Why global projects config (~/.lean-spec/projects.yaml)?**
- **User-centric**: Projects belong to user, not individual project
- **Portable**: Same config across all projects
- **Simple**: Single source of truth for all registered projects
- **Privacy**: Favorites and recents are personal preferences

**Why opt-in multi-project mode?**
- **Backward compatibility**: Existing users see no change
- **Simplicity**: Single project mode is simpler for most users
- **Performance**: Multi-project adds overhead for discovery/registration
- **Migration**: Gradual adoption, can make default later

**Why project-scoped URLs instead of query params?**
- **Bookmarkable**: `/projects/my-app/specs/045` is shareable
- **Semantic**: URL structure reflects content hierarchy
- **Navigation**: Browser history works correctly
- **SEO-friendly**: If we add public hosting later

**Why not use VS Code workspace concept?**
- **Independence**: Web UI should work without VS Code
- **Simplicity**: Don't need multi-root workspace complexity
- **Different use case**: VS Code workspaces are editor-centric

### Alternative Approaches Considered

**1. Multiple Browser Tabs (Status Quo)**
- Pros: Works today, no development needed
- Cons: Port management, resource usage, poor UX
- **Rejected**: User explicitly requested better solution

**2. VS Code Extension with Multi-Root Workspace**
- Pros: Native IDE integration, handles multiple projects
- Cons: Requires VS Code, spec 017 not implemented yet
- **Deferred**: Good future enhancement, but not web UI solution

**3. Iframe per Project**
- Pros: Complete isolation between projects
- Cons: Complex communication, memory overhead, poor UX
- **Rejected**: Over-engineered, breaks navigation paradigm

**4. Server-Side Project Multiplexing**
- Pros: Single server instance for all projects
- Cons: More complex backend, session management required
- **Selected**: Best balance of UX and complexity

**5. Cloud-Based Multi-Project (GitHub Integration)**
- Pros: Works remotely, sync across devices
- Cons: Requires backend service, auth complexity, spec 036 not implemented
- **Future Enhancement**: Good for v1.0+, but local-first now

### Related Specs

**Dependencies:**
- ✅ Spec 087: CLI UI command - Foundation for `lean-spec ui`
- ✅ Spec 082: Filesystem mode - Required for reading multiple project specs

**Enables:**
- 📅 Spec 017: VSCode extension - Could embed this UI in webview with project switching
- 📅 Spec 036: PM integrations - Multi-project view helpful for managing work across repos
- 📅 Future: Cross-project search and analytics

**Complements:**
- Spec 081: Web app UX redesign - Project switcher fits into existing design system
- Spec 094: AI chatbot - Could use project context in conversations

### Future Enhancements (v0.5+)

**Cross-Project Features:**
- [ ] Unified search across all projects
- [ ] Compare specs side-by-side from different projects
- [ ] Aggregate stats dashboard (velocity across all projects)
- [ ] Cross-project dependency visualization
- [ ] Project templates and cloning

**Project Management:**
- [ ] Project tags and categories
- [ ] Project activity timeline (which projects worked on when)
- [ ] Project health scores
- [ ] Bulk operations (archive, export multiple projects)
- [ ] Project import/export (backup/restore)

**Collaboration:**
- [ ] Share project access with team (requires auth)
- [ ] Project-level permissions
- [ ] Multi-user project switching (shared server)
- [ ] Integration with spec 036 (GitHub multi-project)

**Developer Experience:**
- [ ] Git repository detection (use repo name as project name)
- [ ] Package.json detection (use name field)
- [ ] Workspace configuration files (VS Code .code-workspace)
- [ ] Recent files per project (jump back to where you left off)
- [ ] Project-specific settings/preferences

### Open Questions

- [ ] Should we support nested projects (monorepos with multiple spec directories)?
- [ ] Should project colors be auto-generated or user-selected?
- [ ] Should we show project health/status in switcher (specs count, velocity)?
- [ ] Should we support project groups/workspaces (client A projects, client B projects)?
- [ ] Should we add project search/filtering in the UI beyond quick switcher?
- [ ] Should we integrate with Git (show branch, dirty state)?
- [ ] Should we support remote projects (SSH, network drives) with special handling?

### Security Considerations

- **Path Traversal**: Validate all project paths to prevent access outside allowed directories
- **Symlink Attacks**: Resolve symlinks and validate destinations
- **Permission Checks**: Verify read access before adding project
- **Config Injection**: Sanitize project names and paths in YAML config
- **Resource Limits**: Limit number of projects to prevent DoS (max 100?)

### Performance Considerations

- **Lazy Loading**: Only load project metadata initially, fetch specs on demand
- **Caching**: Cache project list in memory, invalidate on config change
- **Debouncing**: Debounce project discovery to avoid excessive filesystem scans
- **Pagination**: Paginate project lists if >50 projects
- **Indexing**: Consider SQLite index for very large project collections (v1.0+)

### Implementation Notes

**Week 1 Focus**: Get basic multi-project infrastructure working end-to-end  
**Week 2 Focus**: Polish UI/UX, make project switching delightful  
**Week 3 Focus**: CLI integration and configuration management  
**Week 4 Focus**: Testing, documentation, edge cases

**Success Metric**: Can comfortably work on 5+ projects simultaneously without mental overhead

**Validation**: Dogfood with LeanSpec + client projects for 1 week before release
