---
status: planned
created: 2025-12-18
priority: high
tags:
- ui
- vite
- migration
- frontend
depends_on:
- 184-ui-packages-consolidation
- 185-ui-components-extraction
- 186-rust-http-server
created_at: 2025-12-18T15:01:25.196544Z
updated_at: 2025-12-18T15:02:58.192209Z
---

# Vite SPA Migration

> **Part of**: [Spec 184](../184-ui-packages-consolidation/) - Unified UI Architecture
>
> **Token Budget**: Target ~1500 tokens
>
> **Depends on**: [Spec 185](../185-ui-components-extraction/), [Spec 186](../186-rust-http-server/)

## Overview

**Problem**: Current web UI uses Next.js with SSR/SSG, adding:
- **150MB+ bundle overhead** (SSR runtime, Node.js dependencies)
- **Complexity**: API routes, getServerSideProps, configuration
- **Slower dev experience**: Next.js build time, HMR slower than Vite
- **Overkill**: We don't need SSR for local file-based spec UI

**Solution**: Migrate to **Vite SPA** (Single Page Application):
- Use shared UI components from `@leanspec/ui-components`
- **Web**: Connect to Rust HTTP server
- **Desktop**: Bundle UI locally, use Tauri commands (direct Rust calls)
- React Router for client-side navigation
- 83% smaller bundle (30MB vs 150MB+)
- 10x faster development with Vite HMR

**Result**: Same features, better performance, simpler architecture.

## Design

### Architecture

**Two deployment targets, one codebase:**

**Web Browser:**
```
┌────────────────────────────────────────────────────┐
│  Vite SPA (http://localhost:3333)                 │
│  ┌──────────────────────────────────────────────┐  │
│  │  React Router + @leanspec/ui-components      │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  HttpBackendAdapter                          │  │
│  │  - fetch() to HTTP server                    │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
           ↓ HTTP requests
┌────────────────────────────────────────────────────┐
│  Rust HTTP Server (Axum)                          │
│  - Serves static files + API endpoints            │
└────────────────────────────────────────────────────┘
           ↓
    leanspec_core

```

**Desktop (Tauri):**
```
┌────────────────────────────────────────────────────┐
│  Tauri App (tauri://localhost)                    │
│  ┌──────────────────────────────────────────────┐  │
│  │  Same Vite SPA (bundled locally)             │  │
│  │  React Router + @leanspec/ui-components      │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  TauriBackendAdapter                         │  │
│  │  - invoke() Tauri commands                   │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
           ↓ IPC (no network)
┌────────────────────────────────────────────────────┐
│  Tauri Rust Commands                              │
│  - Direct function calls                          │
└────────────────────────────────────────────────────┘
           ↓
    leanspec_core
```

**Key difference**: Same UI, different backend transport (HTTP vs IPC)

### Project Structure

```
packages/ui/
├── src/
│   ├── main.tsx              # Vite entry point
│   ├── App.tsx               # Root component
│   ├── router.tsx            # React Router setup
│   ├── pages/                # Route pages
│   │   ├── SpecsPage.tsx
│   │   ├── SpecDetailPage.tsx
│   │   ├── StatsPage.tsx
│   │   ├── DepsPage.tsx
│   │   └── SettingsPage.tsx
│   ├── lib/
│   │   ├── api-client.ts     # HTTP API wrapper
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── useAPI.ts         # API integration hooks
│   │   └── useProjectContext.ts
│   └── styles/
│       └── globals.css
├── index.html                # HTML template
├── vite.config.ts            # Vite configuration
├── package.json
└── README.md
```

### API Client

**Backend Adapter Pattern** - Abstraction for web (HTTP) vs desktop (Tauri):

```typescript
// src/lib/backend-adapter.ts
export interface BackendAdapter {
  getProjects(): Promise<ProjectsResponse>;
  switchProject(projectId: string): Promise<void>;
  getSpecs(params?: ListParams): Promise<Spec[]>;
  getSpec(name: string): Promise<SpecDetail>;
  // ... other methods
}

// Web implementation (HTTP)
export class HttpBackendAdapter implements BackendAdapter {
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3333';
  
  async getProjects(): Promise<ProjectsResponse> {
    const response = await fetch(`${this.baseUrl}/api/projects`);
    if (!response.ok) throw new APIError(response);
    return response.json();
  }
  // ... other methods use fetch
}

// Desktop implementation (Tauri commands)
export class TauriBackendAdapter implements BackendAdapter {
  async getProjects(): Promise<ProjectsResponse> {
    return await invoke('get_projects');
  }
  
  async switchProject(projectId: string): Promise<void> {
    return await invoke('switch_project', { projectId });
  }
  // ... other methods use Tauri invoke
}

// Factory to select adapter
export function createBackend(): BackendAdapter {
  // @ts-ignore - __TAURI__ is injected by Tauri
  if (typeof window !== 'undefined' && window.__TAURI__) {
    return new TauriBackendAdapter();
  }
  return new HttpBackendAdapter();
}
```

**Usage in app**:
```typescript
// src/lib/api-client.ts
const backend = createBackend();

export class LeanSpecAPI {
  private currentProjectId: string | null = null;
  
  // Project management
  async getProjects(): Promise<ProjectsResponse> {
    const response = await fetch(`${API_BASE}/api/projects`);
    if (!response.ok) throw new APIError(response);
    return response.json();
  }
  
  async switchProject(projectId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/projects/${projectId}/switch`, {
      method: 'POST',
    });
    if (!response.ok) throw new APIError(response);
    this.currentProjectId = projectId;
  }
  
  // Spec operations
  async getSpecs(params?: ListParams): Promise<Spec[]> {
    const query = new URLSearchParams(params as any);
    const response = await fetch(`${API_BASE}/api/specs?${query}`);
    if (!response.ok) throw new APIError(response);
    const { specs } = await response.json();
    return specs;
  }
  
  async getSpec(specName: string): Promise<SpecDetail> {
    const response = await fetch(`${API_BASE}/api/specs/${specName}`);
    if (!response.ok) throw new APIError(response);
    const { spec } = await response.json();
    return spec;
  }
  
  // ... other methods
}

export const api = new LeanSpecAPI();
```

### Routing

```typescript
// src/router.tsx
import { createBrowserRouter } from 'react-router-dom';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/specs" /> },
      { path: 'specs', element: <SpecsPage /> },
      { path: 'specs/:spec', element: <SpecDetailPage /> },
      { path: 'stats', element: <StatsPage /> },
      { path: 'deps/:spec', element: <DepsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
```

### Technology Stack

- **Build Tool**: Vite 5 (fast HMR, optimized builds)
- **Framework**: React 18 + TypeScript 5
- **Routing**: React Router 6 (client-side)
- **Components**: `@leanspec/ui-components` (shared library)
- **API**: Fetch API + TypeScript client
- **State**: React Context + hooks (no Redux needed)
- **Styling**: Tailwind CSS 3
- **Icons**: lucide-react

## Plan

### Phase 1: Project Setup (Day 1)
- [ ] Create new Vite project in `packages/ui-new`
- [ ] Configure TypeScript + React
- [ ] Set up Tailwind CSS
- [ ] Configure Vite for optimal builds
- [ ] Add `@leanspec/ui-components` dependency

### Phase 2: API Client (Day 1-2)
- [ ] Implement API client class
- [ ] Add all endpoint methods
- [ ] Error handling and retries
- [ ] TypeScript types for requests/responses
- [ ] Environment variable configuration

### Phase 3: Routing Setup (Day 2)
- [ ] Install React Router
- [ ] Define route structure
- [ ] Create Layout component
- [ ] Set up navigation

### Phase 4: Page Implementation (Day 3-5)
- [ ] SpecsPage (list view)
  - Use SpecList from ui-components
  - Connect to API for data
  - Filters and search
- [ ] SpecDetailPage (detail view)
  - Use SpecDetail from ui-components
  - Load spec data from API
  - Sub-specs navigation
- [ ] StatsPage (statistics)
  - Use StatsCharts from ui-components
  - Load stats from API
- [ ] DepsPage (dependency graph)
  - Use DependencyGraph from ui-components
  - Load graph data from API
- [ ] SettingsPage (project management)
  - Use ProjectSwitcher from ui-components
  - Add/edit/remove projects

### Phase 5: Project Context (Day 5-6)
- [ ] Create project context provider
- [ ] Handle project switching
- [ ] Persist selected project in localStorage
- [ ] Show project switcher in header

### Phase 6: Feature Parity (Day 6-7)
- [ ] All features from Next.js UI work
- [ ] Keyboard shortcuts
- [ ] Dark mode
- [ ] Search and filters
- [ ] Metadata editing
- [ ] Validation

### Phase 7: Desktop Integration (Day 7-8)
- [ ] Update `packages/desktop` to bundle new Vite SPA
- [ ] Desktop bundles UI files locally (no HTTP server needed)
- [ ] Update Tauri commands to use leanspec_core directly
- [ ] Implement backend adapter layer (swap HTTP client for Tauri invoke)
- [ ] Tauri file picker for project folder selection
- [ ] Test all desktop features

### Phase 8: Testing (Day 8-9)
- [ ] Unit tests for API client
- [ ] Component integration tests
- [ ] E2E tests with Playwright
- [ ] Performance testing

### Phase 9: Migration & Launch (Day 9-10)
- [ ] Archive old Next.js UI (`packages/ui-legacy-nextjs`)
- [ ] Rename `packages/ui-new` → `packages/ui`
- [ ] Update CLI launcher
- [ ] Update documentation
- [ ] Version bump and release

## Test

- [ ] All pages load correctly
- [ ] API client handles errors gracefully
- [ ] Project switching works
- [ ] All spec operations work (list, view, search, edit)
- [ ] Dependency graph renders correctly
- [ ] Stats page displays accurate data
- [ ] Dark mode works
- [ ] Responsive on different screen sizes
- [ ] Desktop app works with new UI
- [ ] Page load < 2s for 100+ specs
- [ ] Search response < 500ms

## Notes

### Why Vite Over Next.js?

**Next.js Pros**: Excellent DX, great for websites
**Next.js Cons**: SSR overhead unnecessary for local app, 150MB+ bundle

**Vite Pros**: Fast HMR, small bundle, simple config, great for SPAs
**Vite Cons**: No SSR (we don't need it)

**Decision**: Vite is perfect for local development tools.

### Migration Strategy

**Clean cutover approach**:
1. Build complete new UI in `packages/ui-new`
2. Achieve feature parity
3. Test thoroughly
4. Rename old → legacy, new → ui
5. One release, clean migration

**Why not incremental?**:
- Two UIs = double maintenance
- Next.js + Vite coexistence complex
- Clean break is faster in AI coding era

### Desktop Integration

Desktop uses **same UI components** but **different backend connection**:

**Architecture difference**:
- **Web**: UI → HTTP client → Rust HTTP server → leanspec_core
- **Desktop**: UI → Tauri commands (direct Rust calls) → leanspec_core

**Why different?**
- Desktop can call Rust directly (no network overhead)
- Web must use HTTP (browser security restrictions)
- Same UI components work with both backends via abstraction layer

**Implementation**:
- Shared UI components from `@leanspec/ui-components`
- Abstract backend interface (adapter pattern):
  ```typescript
  // Web: uses fetch to HTTP server
  // Desktop: uses Tauri invoke commands
  interface BackendAdapter {
    getSpecs(): Promise<Spec[]>;
    getSpec(name: string): Promise<SpecDetail>;
    // ... other methods
  }
  ```
- Desktop bundles UI files in app (loads from `tauri://localhost`)
- Desktop provides Tauri file dialogs for better UX
- No UI code duplication, just different backend transport

### Related Specs

- [Spec 184](../184-ui-packages-consolidation/): Parent umbrella spec
- [Spec 185](../185-ui-components-extraction/): UI components (this uses them)
- [Spec 186](../186-rust-http-server/): HTTP server (this connects to it)
