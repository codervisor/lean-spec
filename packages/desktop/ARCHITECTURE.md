# LeanSpec Desktop Architecture

> **Status**: Native SPA Mode with Vite UI Integration (Spec 204 Complete)

## Overview

The LeanSpec Desktop app is built with Tauri v2 and **@leanspec/ui**, providing a native application experience with Rust backend and shared React UI components.

### Migration from Node.js (December 2025)

The desktop app has migrated from a **hybrid architecture** (Tauri + Node.js server) to a **pure native architecture** (Tauri + SPA) as part of spec 169.

**Before (Hybrid)**:
```
Desktop App
├── Tauri Shell (Rust) - Window management, tray, shortcuts
└── Next.js Server (Node.js) - UI + API backend
    └── @leanspec/core (TypeScript) - Spec operations
```

**After (Pure Native with Vite UI, January 2026)**:
```
Desktop App
├── Tauri Backend (Rust) - Everything backend
│   ├── Window management, tray, shortcuts
│   ├── Spec operations (migrated from @leanspec/core)
│   └── Tauri commands (replace HTTP API)
└── UI Layer (React)
    ├── Desktop Shell (desktop-specific)
    │   ├── TitleBar with project switcher
    │   ├── WindowControls
    │   ├── ProjectsManager modal
    │   └── DesktopProjectContext
    └── @leanspec/ui (shared with web)
        ├── Backend adapter (Tauri IPC mode)
        ├── Pages (Specs, Stats, Dependencies, etc.)
        ├── Components (from @leanspec/ui-components)
        └── Contexts (Theme, KeyboardShortcuts)
```

**Key Benefits**:
- **Code Reuse**: Shares 90%+ of UI code with web version
- **Consistency**: Identical UI/UX across desktop and web
- **Maintainability**: Single codebase for UI features
- **Performance**: No extra overhead compared to previous implementation

## Architecture Components

### 1. Rust Backend (`src-tauri/`)

**Main Components**:
- `main.rs` - Application entry point and Tauri setup
- `commands.rs` - Project management Tauri commands
- `specs/` - Spec operations library (replaces TypeScript core)
  - `frontmatter.rs` - YAML frontmatter parsing
  - `reader.rs` - File system reader/walker
  - `stats.rs` - Statistics calculation
  - `dependencies.rs` - Dependency graph computation
  - `validation.rs` - Spec validation
  - `commands.rs` - Spec-related Tauri commands
- `state.rs` - Application state management
- `projects.rs` - Project registry and management
- `config.rs` - Desktop configuration
- `tray.rs` - System tray integration
- `ui_server.rs` - Legacy Node.js server (optional, disabled by default)

**Tauri Commands**:

*Project Management*:
- `desktop_bootstrap` - Initialize desktop environment
- `desktop_add_project` - Add new project
- `desktop_switch_project` - Switch active project
- `desktop_refresh_projects` - Refresh project list
- `desktop_toggle_favorite` - Toggle project favorite status
- `desktop_remove_project` - Remove project
- `desktop_rename_project` - Rename project
- `desktop_check_updates` - Check for app updates

*Spec Operations*:
- `get_specs` - List all specs for a project
- `get_spec_detail` - Get single spec with full content
- `get_project_stats` - Calculate project statistics
- `get_dependency_graph` - Build dependency visualization graph
- `get_spec_dependencies_cmd` - Get spec relationships
- `search_specs` - Full-text search
- `get_specs_by_status` - Filter specs by status
- `get_all_tags` - Aggregate unique tags
- `validate_spec_cmd` / `validate_all_specs_cmd` - Validation
- `update_spec_status` - Update spec status with file write

### 2. React Frontend (`src/`)

**Architecture**:
- Uses **@leanspec/ui** for all page rendering
- Desktop-specific shell wraps the Vite UI components
- Tauri backend adapter enables the Vite UI to use IPC instead of HTTP

**Routing (`App.tsx`)**:
- React Router with routes defined in desktop App
- Routes use **Vite UI pages**:
  - `/specs` - SpecsPage from ui
  - `/specs/:specName` - SpecDetailPage from ui
  - `/stats` - StatsPage from ui
  - `/dependencies` - DependenciesPage from ui

**Desktop-Specific Components (`components/`)**:
- `DesktopLayout.tsx` - Main application layout with title bar
- `TitleBar.tsx` - Custom title bar with project selector
- `ProjectsManager.tsx` - Project management modal
- `WindowControls.tsx` - Window control buttons (minimize, maximize, close)
- `DesktopMenu.tsx` - Desktop menu bar

**Desktop-Specific Hooks (`hooks/`)**:
- `useProjects.ts` - Desktop project management state
- `useProjectsManager.ts` - Projects manager modal state

**Desktop-Specific Contexts (`contexts/`)**:
- `DesktopProjectContext.tsx` - Bridges desktop project state with the Vite UI

**IPC Layer (`lib/ipc.ts`)**:
- Wrapper functions for all Tauri commands
- Type-safe invocation with TypeScript

### 3. Build System

**Development**:
```bash
pnpm dev:desktop  # Starts Vite dev server + Tauri
```

**Production Build**:
```bash
pnpm build:desktop  # Builds frontend + Tauri app
```

**Platform-Specific Bundles**:
```bash
pnpm bundle:linux    # .deb package
pnpm bundle:macos    # .dmg image
pnpm bundle:windows  # .nsis installer
```

## Performance Characteristics

### Bundle Size (After Migration)

| Component       | Size       | Notes                                |
| --------------- | ---------- | ------------------------------------ |
| Rust binary     | ~24 MB     | Optimized release build              |
| Frontend assets | ~2 MB      | Vite production build                |
| **Total**       | **~26 MB** | **83% smaller than before (150MB+)** |

### Runtime Performance

| Metric                 | Before (Node.js) | After (Rust) | Improvement |
| ---------------------- | ---------------- | ------------ | ----------- |
| Startup time           | 2-3 seconds      | <1 second    | 66% faster  |
| Memory usage           | 400-600 MB       | 50-100 MB    | 83% less    |
| Spec list (1000 specs) | ~500ms           | ~50ms        | 90% faster  |
| Dependency graph       | ~1000ms          | ~100ms       | 90% faster  |

## Development Workflow

### Adding New Tauri Commands

1. **Define command in Rust** (`src-tauri/src/commands.rs` or `src-tauri/src/specs/commands.rs`):
```rust
#[tauri::command]
pub async fn my_command(state: State<'_, DesktopState>, param: String) -> Result<String, String> {
    // Implementation
    Ok(result)
}
```

2. **Register in main.rs**:
```rust
.invoke_handler(tauri::generate_handler![
    my_command,
    // ... other commands
])
```

3. **Add TypeScript wrapper** (`src/lib/ipc.ts`):
```typescript
export async function myCommand(param: string): Promise<string> {
  return invoke('my_command', { param });
}
```

4. **Use in React components**:
```typescript
import { myCommand } from '@/lib/ipc';

const result = await myCommand('value');
```

### Adding UI Features

For most UI features, work should be done in **@leanspec/ui**:

1. **Add to ui** (`packages/ui/src/...`)
   - Benefits both desktop and web versions
   - Use backend adapter for API calls (works in both Tauri and HTTP modes)

2. **Desktop-only features** (rare cases):
   - Add to desktop `src/components/`
   - Example: TitleBar, WindowControls, ProjectsManager

### Backend Adapter Pattern

The Vite UI uses a backend adapter that automatically detects the environment:

```typescript
// In ui/src/lib/backend-adapter.ts
export function createBackendAdapter(): BackendAdapter {
  // @ts-expect-error __TAURI__ is injected by Tauri at runtime
  if (typeof window !== 'undefined' && window.__TAURI__) {
    return new TauriBackendAdapter();  // Uses Tauri IPC
  }
  return new HttpBackendAdapter();      // Uses HTTP fetch
}
```

This allows the Vite UI components to work seamlessly in both desktop and web contexts.
3. **Add navigation** in relevant components

### Building and Testing

```bash
# Development
pnpm dev:desktop

# Type checking
pnpm --filter @leanspec/desktop lint

# Build
pnpm build:desktop

# Platform-specific builds
pnpm bundle:linux
pnpm bundle:macos
pnpm bundle:windows
```

## Configuration

### Desktop Config (`~/.leanspec/desktop-config.json`)

```json
{
  "activeProjectId": "my-project-123",
  "projects": [
    {
      "id": "my-project-123",
      "name": "My Project",
      "path": "/path/to/project",
      "specsDir": "/path/to/project/specs",
      "favorite": true,
      "lastOpened": "2025-12-14T00:00:00Z"
    }
  ]
}
```

## Legacy Mode (Optional)

For backward compatibility, the Node.js server mode can be enabled:

```bash
# Enable legacy iframe mode
export LEANSPEC_ENABLE_UI_SERVER=1
pnpm dev:desktop
```

This will:
1. Bundle the Next.js standalone server
2. Start Node.js as a sidecar process
3. Load UI in iframe instead of native SPA

**Note**: This mode is deprecated and will be removed in v0.3.0.

## Security

### Content Security Policy

Tauri enforces strict CSP by default. The app uses:
- No remote content loading
- All resources served from local filesystem
- IPC communication only with Tauri backend

### Capabilities

Defined in `src-tauri/capabilities/desktop-main.json`:
- File system access (read/write in project directories)
- Dialog (file picker, alerts)
- Notification
- Shell (open URLs in browser)
- Window management
- Tray icon

## Dependencies

### Rust Dependencies
- `tauri` (v2.0) - Application framework
- `serde` / `serde_json` / `serde_yaml` - Serialization
- `walkdir` - Directory traversal
- `pulldown-cmark` - Markdown parsing (planned)
- `petgraph` - Dependency graphs
- `anyhow` - Error handling

### Frontend Dependencies
- `react` (v19.2) - UI framework
- `react-router-dom` (v7.10) - Client-side routing
- `@tauri-apps/api` (v2.0) - Tauri IPC
- `lucide-react` - Icon library
- `clsx` - CSS class management

## Migration Notes

### For Contributors

If you're working on desktop code that predates the migration:

1. **Don't use Next.js API routes** - Use Tauri commands instead
2. **Don't use `fetch('/api/...')** - Use `invoke('command_name', { params })`
3. **Don't import `@leanspec/core`** - Functionality now in Rust backend
4. **Use React Router** instead of Next.js file-based routing
5. **No SSR/SSG** - Everything is client-side rendered

### Breaking Changes

- Node.js server scripts removed (`prepare:ui`, `download:node`, `build:sidecar`)
- `uiUrl` in bootstrap payload is now optional (will be `undefined` in native mode)
- iframe-based `App.tsx` replaced with Router-based `AppRouter`
- Bundle resources no longer include `ui-standalone` or `resources/node`

## Future Improvements

- [ ] Add E2E tests with Tauri's testing framework
- [ ] Implement more spec editing capabilities
- [ ] Add offline caching for better performance
- [ ] Implement search indexing for faster queries
- [ ] Add keyboard shortcuts for all actions
- [ ] Implement drag-and-drop for project management

## References

- [Spec 169: UI Backend Rust/Tauri Migration](../../specs/169-ui-backend-rust-tauri-migration-evaluation/)
- [Spec 148: LeanSpec Desktop App](../../specs/148-leanspec-desktop-app/)
- [Spec 166: Desktop UI Server Bundling Fix](../../specs/166-desktop-ui-server-bundling-fix/)
- [Tauri Documentation](https://tauri.app)
