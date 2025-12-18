---
status: planned
created: 2025-12-18
priority: high
tags:
- ui
- desktop
- architecture
- consolidation
- rust
depends_on:
- 185-ui-components-extraction
- 186-rust-http-server
- 187-vite-spa-migration
created_at: 2025-12-18T14:02:41.727119Z
updated_at: 2025-12-18T14:02:41.727119Z
---

# Unified UI Architecture: Rust-Powered Web & Desktop (Umbrella)

> **Status**: planned · **Priority**: high · **Created**: 2025-12-18
> 
> **⚠️ Umbrella Spec**: This coordinates 3 sub-specs. Read sub-specs for implementation details.

## Overview

**Problem**: We currently maintain two separate UI implementations with different architectures:
- **`packages/ui`**: Rich Next.js SSR app with full-featured UI (good UX, but heavy)
- **`packages/desktop`**: Basic Tauri + Vite SPA with Rust backend (fast, but UI too basic)

This creates:
- **UI Quality Gap**: Desktop UI is too basic compared to web UI
- **Architecture Mismatch**: Next.js SSR vs Tauri native vs Rust backend
- **Maintenance Burden**: Implementing features twice (if we want feature parity)
- **Bundle Bloat**: Next.js adds 150MB+ overhead for local file operations
- **Performance Issues**: TypeScript backend slower than Rust for spec operations

**Solution**: Boldly migrate to **Vite SPA + Rust HTTP Server** architecture in one shot:
- Extract and upgrade UI components from both packages/ui and packages/desktop
- Build Rust HTTP server (Axum) for web, reuse Tauri commands for desktop
- Share single UI codebase between web and desktop
- **Result**: Best-in-class performance, minimal bundle, unified development

## Design

### Current State Analysis

```
┌─────────────────────────────────────────────────────────────┐
│ packages/ui (Next.js) - Rich UI but Heavy                   │
├─────────────────────────────────────────────────────────────┤
│ ✅ Full-featured UI (deps graph, stats, search, filters)    │
│ ✅ Good UX with polished components                         │
│ ❌ Next.js SSR overhead (~150MB bundle)                     │
│ ❌ TypeScript backend (slower than Rust)                    │
│ ❌ Database schema for GitHub repos (not implemented)       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ packages/desktop (Tauri) - Fast but Basic                   │
├─────────────────────────────────────────────────────────────┤
│ ✅ Rust backend (fast, native)                              │
│ ✅ Small bundle (~26MB)                                     │
│ ✅ Direct Rust core integration                             │
│ ❌ UI too basic (missing features)                          │
│ ❌ Limited component library                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ rust/leanspec-core - Already Exists                         │
├─────────────────────────────────────────────────────────────┤
│ ✅ All spec operations (list, view, search, stats, deps)    │
│ ✅ Validation, token counting                               │
│ ✅ Used by CLI and MCP server                               │
│ ✅ Fast and battle-tested                                   │
└─────────────────────────────────────────────────────────────┘
```

### Target Architecture: Vite SPA + Rust HTTP Server

**Single unified architecture for both web and desktop:**

```
┌──────────────────────────────────────────────────────────────┐
│              packages/ui-components (NEW)                    │
│      Shared React Components + Hooks + Utilities             │
│      (SpecList, SpecDetail, DepsGraph, Stats, etc.)          │
└──────────────────────────────────────────────────────────────┘
           ↓                                  ↓
┌────────────────────────┐       ┌──────────────────────────┐
│  packages/ui (WEB)     │       │  packages/desktop        │
│  Vite SPA              │       │  Tauri App (DESKTOP)     │
│  ↓                     │       │  ↓                       │
│  Rust HTTP Server      │       │  Tauri Commands          │
│  (Axum + leanspec-core)│       │  (Direct Rust calls)     │
└────────────────────────┘       └──────────────────────────┘
           ↓                                  ↓
           └──────────────┬───────────────────┘
                          ↓
              rust/leanspec-core (unified)
              ├── Spec operations (list, view, search, stats)
              ├── Dependency graph
              ├── Validation & token counting
              └── Project management
```

**Key Benefits:**
- ✅ **Performance**: 10x faster than TypeScript backend
- ✅ **Bundle Size**: 30MB (web) vs 150MB+ (Next.js)
- ✅ **Unified Codebase**: Same UI components for web and desktop
- ✅ **Developer Experience**: Single source of truth, faster development
- ✅ **Type Safety**: End-to-end type safety with Rust + TypeScript
- ✅ **Future-Proof**: Easier to add features, maintain, and scale

---

### Key Architectural Decisions

**Decision 1: Eliminate Next.js**
- **Rationale**: Next.js SSR/SSG adds 150MB+ for local file operations we don't need
- **Action**: Migrate to Vite SPA (same dev experience, 83% smaller)

**Decision 2: Rust HTTP Server for Web**
- **Technology**: Axum (fast, modern, async)
- **API Design**: RESTful JSON endpoints matching current Next.js API routes
- **Integration**: Direct `leanspec_core` function calls (no CLI spawning)

**Decision 3: Upgrade Desktop to Rich UI**
- **Action**: Desktop uses same components as web
- **Result**: Feature parity between web and desktop

**Decision 4: Create Shared Component Library**
- **Package**: `packages/ui-components` (new)
- **Contents**: 
  - React components (SpecList, SpecDetail, DepsGraph, Stats, Search, etc.)
  - Custom hooks (useSpecs, useProjects, useDependencies, etc.)
  - Utilities (formatters, validators, helpers)
  - Types (shared TypeScript interfaces)
- **Consumers**: Both `packages/ui` and `packages/desktop`

---

### Multi-Project Architecture

**Core Principle**: Server-side project management, client-agnostic

```
┌──────────────────────────────────────────────────────────┐
│              Rust HTTP Server (Single Instance)          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Project Registry (~/.lean-spec/projects.json)     │  │
│  │  - Shared between desktop and web                  │  │
│  │  - Server loads projects on startup                │  │
│  │  - CRUD operations via HTTP API                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Config (~/.lean-spec/config.json)                 │  │
│  │  - server.host (default: 127.0.0.1)                │  │
│  │  - server.port (default: 3333, auto-pick if busy)  │  │
│  │  - server.cors.origins (configurable)              │  │
│  │  - ui.theme, ui.locale (persisted preferences)     │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
           ↓                                  ↓
    Web UI Client                      Desktop Client
    (browser connects                  (Tauri webview connects
     to http://localhost:3333)          to http://localhost:3333)
```

**Key Decisions:**

1. **Single HTTP Server for All Projects**
   - Current desktop spawns Next.js per-project (inefficient)
   - New: Single Rust HTTP server serves all projects
   - Project switching changes active project context server-side

2. **Server-Side Project Registry**
   - Already exists in both packages/ui and packages/desktop
   - Format: `~/.lean-spec/projects.json` (identical structure)
   - Server loads on startup, exposes CRUD via `/api/projects`

3. **Configuration File: `~/.lean-spec/config.json`**
   ```json
   {
     "server": {
       "host": "127.0.0.1",
       "port": 3333,
       "cors": {
         "enabled": true,
         "origins": [
           "http://localhost:5173",
           "http://localhost:3000"
         ]
       }
     },
     "ui": {
       "theme": "auto",
       "locale": "en",
       "compactMode": false
     },
     "projects": {
       "autoDiscover": true,
       "maxRecent": 10
     }
   }
   ```

4. **Multi-Project by Default**
   - Both web and desktop use multi-project architecture
   - **Desktop**: Uses Tauri file dialog for folder picker
   - **Web**: Uses manual path input (browser security limitations)
   - First-time setup: Auto-discover projects or prompt to add first project

---

### Rust HTTP Server Implementation

**Architecture**: Axum web framework with direct `leanspec_core` integration

```rust
// rust/leanspec-http/src/main.rs
use axum::{
    extract::{Json, Path, Query, State},
    http::StatusCode,
    routing::{get, post, put},
    Router,
};
use leanspec_core::{
    SpecsReader, SpecsValidator, DependencyGraphBuilder,
    StatsCalculator, SearchEngine, MetadataUpdater,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tower_http::cors::CorsLayer;

#[derive(Clone)]
struct AppState {
    config: Arc<ServerConfig>,
    project_registry: Arc<RwLock<ProjectRegistry>>,
    current_project_id: Arc<RwLock<Option<String>>>,
}

struct ServerConfig {
    host: String,
    port: u16,
    cors_origins: Vec<String>,
}

struct ProjectRegistry {
    projects: HashMap<String, Project>,
    config_path: PathBuf,  // ~/.lean-spec/projects.json
}

#[tokio::main]
async fn main() {
    // Load config from ~/.lean-spec/config.json
    let config = ServerConfig::load().unwrap_or_default();
    
    // Load project registry from ~/.lean-spec/projects.json
    let project_registry = ProjectRegistry::load().expect("Failed to load projects");
    
    let state = Arc::new(AppState {
        config: Arc::new(config.clone()),
        project_registry: Arc::new(RwLock::new(project_registry)),
        current_project_id: Arc::new(RwLock::new(None)),
    });
    
    let cors = CorsLayer::new()
        .allow_origin(config.cors_origins.iter().map(|s| s.parse().unwrap()).collect::<Vec<_>>())
        .allow_methods([Method::GET, Method::POST, Method::PATCH, Method::DELETE])
        .allow_headers([CONTENT_TYPE]);
    
    let app = Router::new()
        // Project management
        .route("/api/projects", get(list_projects).post(create_project))
        .route("/api/projects/:id", get(get_project).delete(remove_project).patch(update_project))
        .route("/api/projects/:id/switch", post(switch_project))
        
        // Spec operations (use current project)
        .route("/api/specs", get(list_specs))
        .route("/api/specs/:spec", get(get_spec))
        .route("/api/specs/:spec/metadata", put(update_metadata))
        
        // Search & filter
        .route("/api/search", post(search_specs))
        
        // Statistics
        .route("/api/stats", get(get_stats))
        
        // Dependencies
        .route("/api/deps/:spec", get(get_dependency_graph))
        
        // Validation
        .route("/api/validate", get(validate_all))
        .route("/api/validate/:spec", get(validate_spec))
        
        .layer(cors)
        .with_state(state);
    
    let addr = format!("{}:{}", config.host, config.port);
    println!("🚀 LeanSpec HTTP server listening on http://{}", addr);
    
    axum::Server::bind(&addr.parse().unwrap())
        .serve(app.into_make_service())
        .await
        .unwrap();
}

// Project management handlers
async fn list_projects(
    State(state): State<Arc<AppState>>,
) -> Result<Json<ProjectsResponse>, (StatusCode, String)> {
    let registry = state.project_registry.read().await;
    let projects = registry.get_projects();
    let recent = registry.get_recent_projects(10);
    let favorites = registry.get_favorite_projects();
    
    Ok(Json(ProjectsResponse { projects, recent, favorites }))
}

async fn create_project(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateProjectRequest>,
) -> Result<Json<ProjectResponse>, (StatusCode, String)> {
    let mut registry = state.project_registry.write().await;
    let project = registry.add_project(&req.path, req.favorite, req.color)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    
    Ok(Json(ProjectResponse { project }))
}

async fn switch_project(
    State(state): State<Arc<AppState>>,
    Path(project_id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let mut current_id = state.current_project_id.write().await;
    *current_id = Some(project_id);
    
    Ok(StatusCode::OK)
}

// Spec operation handlers (use current project)
async fn list_specs(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListParams>,
) -> Result<Json<SpecsResponse>, (StatusCode, String)> {
    let current_id = state.current_project_id.read().await;
    let project_id = current_id.as_ref()
        .ok_or((StatusCode::BAD_REQUEST, "No project selected".to_string()))?;
    
    let registry = state.project_registry.read().await;
    let project = registry.get_project(project_id)
        .ok_or((StatusCode::NOT_FOUND, "Project not found".to_string()))?;
    
    let reader = SpecsReader::new(&project.specs_dir);
    let specs = reader.list_specs(params.status, params.priority, params.tags)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    Ok(Json(SpecsResponse { specs }))
}

async fn get_spec(
    State(state): State<Arc<AppState>>,
    Path(spec_name): Path<String>,
) -> Result<Json<SpecDetailResponse>, (StatusCode, String)> {
    let current_id = state.current_project_id.read().await;
    let project_id = current_id.as_ref()
        .ok_or((StatusCode::BAD_REQUEST, "No project selected".to_string()))?;
    
    let registry = state.project_registry.read().await;
    let project = registry.get_project(project_id)
        .ok_or((StatusCode::NOT_FOUND, "Project not found".to_string()))?;
    
    let reader = SpecsReader::new(&project.specs_dir);
    let spec = reader.read_spec(&spec_name)
        .map_err(|e| (StatusCode::NOT_FOUND, e.to_string()))?;
    
    Ok(Json(SpecDetailResponse { spec }))
}

async fn search_specs(
    State(state): State<Arc<AppState>>,
    Json(query): Json<SearchQuery>,
) -> Result<Json<SearchResponse>, (StatusCode, String)> {
    let current_id = state.current_project_id.read().await;
    let project_id = current_id.as_ref()
        .ok_or((StatusCode::BAD_REQUEST, "No project selected".to_string()))?;
    
    let registry = state.project_registry.read().await;
    let project = registry.get_project(project_id)
        .ok_or((StatusCode::NOT_FOUND, "Project not found".to_string()))?;
    
    let engine = SearchEngine::new(&project.specs_dir);
    let results = engine.search(&query.query, query.filters)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    Ok(Json(SearchResponse { results }))
}

async fn get_stats(
    State(state): State<Arc<AppState>>,
) -> Result<Json<StatsResponse>, (StatusCode, String)> {
    let current_id = state.current_project_id.read().await;
    let project_id = current_id.as_ref()
        .ok_or((StatusCode::BAD_REQUEST, "No project selected".to_string()))?;
    
    let registry = state.project_registry.read().await;
    let project = registry.get_project(project_id)
        .ok_or((StatusCode::NOT_FOUND, "Project not found".to_string()))?;
    
    let calculator = StatsCalculator::new(&project.specs_dir);
    let stats = calculator.calculate()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    Ok(Json(StatsResponse { stats }))
}

async fn get_dependency_graph(
    State(state): State<Arc<AppState>>,
    Path(spec_name): Path<String>,
) -> Result<Json<GraphResponse>, (StatusCode, String)> {
    let current_id = state.current_project_id.read().await;
    let project_id = current_id.as_ref()
        .ok_or((StatusCode::BAD_REQUEST, "No project selected".to_string()))?;
    
    let registry = state.project_registry.read().await;
    let project = registry.get_project(project_id)
        .ok_or((StatusCode::NOT_FOUND, "Project not found".to_string()))?;
    
    let builder = DependencyGraphBuilder::new(&project.specs_dir);
    let graph = builder.build_for_spec(&spec_name)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    Ok(Json(GraphResponse { graph }))
}

async fn update_metadata(
    State(state): State<Arc<AppState>>,
    Path(spec_name): Path<String>,
    Json(metadata): Json<MetadataUpdate>,
) -> Result<StatusCode, (StatusCode, String)> {
    let current_id = state.current_project_id.read().await;
    let project_id = current_id.as_ref()
        .ok_or((StatusCode::BAD_REQUEST, "No project selected".to_string()))?;
    
    let registry = state.project_registry.read().await;
    let project = registry.get_project(project_id)
        .ok_or((StatusCode::NOT_FOUND, "Project not found".to_string()))?;
    
    let updater = MetadataUpdater::new(&project.specs_dir);
    updater.update(&spec_name, metadata)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    Ok(StatusCode::OK)
}
```

**Key Features:**
- **CORS**: Enabled for local development
- **Error Handling**: Proper HTTP status codes
- **Type Safety**: Serde for JSON serialization
- **Performance**: Direct `leanspec_core` calls (no IPC overhead)
- **Extensibility**: Easy to add new endpoints

---

### Frontend: Vite + React SPA

**TypeScript API Client:**

```typescript
// packages/ui/src/lib/api-client.ts
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333';

export class LeanSpecAPI {
  private currentProjectId: string | null = null;
  
  // Project management
  async getProjects(): Promise<{ projects: Project[], recent: Project[], favorites: Project[] }> {
    const response = await fetch(`${API_BASE}/api/projects`);
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
  }
  
  async createProject(path: string, options?: { favorite?: boolean, color?: string }): Promise<Project> {
    const response = await fetch(`${API_BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, ...options }),
    });
    if (!response.ok) throw new Error('Failed to create project');
    const { project } = await response.json();
    return project;
  }
  
  async switchProject(projectId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/projects/${projectId}/switch`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to switch project');
    this.currentProjectId = projectId;
  }
  
  async removeProject(projectId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/projects/${projectId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to remove project');
  }
  
  async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
    const response = await fetch(`${API_BASE}/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update project');
    const { project } = await response.json();
    return project;
  }
  
  // Spec operations (use current project)
  async getSpecs(params?: ListParams): Promise<Spec[]> {
    if (!this.currentProjectId) throw new Error('No project selected');
    const query = new URLSearchParams(params as any).toString();
    const response = await fetch(`${API_BASE}/api/specs?${query}`);
    if (!response.ok) throw new Error('Failed to fetch specs');
    const { specs } = await response.json();
    return specs;
  }
  
  async getSpec(specName: string): Promise<SpecDetail> {
    if (!this.currentProjectId) throw new Error('No project selected');
    const response = await fetch(`${API_BASE}/api/specs/${specName}`);
    if (!response.ok) throw new Error('Failed to fetch spec');
    const { spec } = await response.json();
    return spec;
  }
  
  async searchSpecs(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    if (!this.currentProjectId) throw new Error('No project selected');
    const response = await fetch(`${API_BASE}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, filters }),
    });
    if (!response.ok) throw new Error('Failed to search specs');
    const { results } = await response.json();
    return results;
  }
  
  async getStats(): Promise<Stats> {
    if (!this.currentProjectId) throw new Error('No project selected');
    const response = await fetch(`${API_BASE}/api/stats`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    const { stats } = await response.json();
    return stats;
  }
  
  async getDependencyGraph(specName: string): Promise<DependencyGraph> {
    if (!this.currentProjectId) throw new Error('No project selected');
    const response = await fetch(`${API_BASE}/api/deps/${specName}`);
    if (!response.ok) throw new Error('Failed to fetch dependency graph');
    const { graph } = await response.json();
    return graph;
  }
  
  async updateMetadata(specName: string, metadata: MetadataUpdate): Promise<void> {
    if (!this.currentProjectId) throw new Error('No project selected');
    const response = await fetch(`${API_BASE}/api/specs/${specName}/metadata`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata),
    });
    if (!response.ok) throw new Error('Failed to update metadata');
  }
}

export const api = new LeanSpecAPI();
```

**Package Structure:**

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
│   │   └── DependenciesPage.tsx
│   ├── lib/
│   │   ├── api-client.ts     # HTTP API wrapper
│   │   └── utils.ts
│   ├── hooks/                # Custom React hooks
│   │   ├── useSpecs.ts
│   │   ├── useSearch.ts
│   │   └── useStats.ts
│   └── styles/
│       └── globals.css
├── index.html
├── vite.config.ts
└── package.json
```

## Plan

### Stage 1: Create Shared Component Library (Week 1)

- [ ] **Create `packages/ui-components` package**
  - Vite library build setup
  - TypeScript + React + Tailwind config
  - Export configuration for tree-shaking
  
- [ ] **Extract components from packages/ui (Next.js)**
  - SpecList (with filters, sort, search)
  - SpecDetail (with sub-specs, metadata panel)
  - DependencyGraph (reactflow visualization)
  - StatsCharts (recharts integration)
  - SearchBar and FilterPanel
  - LayoutComponents (header, sidebar, navigation)
  - 10+ smaller components (badges, cards, dialogs, etc.)
  
- [ ] **Extract custom hooks**
  - useSpecs, useSpecDetail, useSearch
  - useProjects, useProjectStats
  - useDependencies, useDependencyGraph
  - useLocalStorage, useDebounce, etc.
  
- [ ] **Extract utilities and types**
  - Type definitions (Spec, Project, Metadata, etc.)
  - Formatters (date, status, priority)
  - Validators and helpers

### Stage 2: Build Rust HTTP Server (Week 1-2)

- [ ] **Create `rust/leanspec-http` crate**
  - Axum web framework setup
  - Integrate `leanspec_core` as dependency
  - CORS configuration for local dev
  
- [ ] **Implement API endpoints**
  - `/api/specs` - List all specs
  - `/api/specs/:spec` - Get spec detail
  - `/api/specs/:spec/metadata` - Update metadata (PUT)
  - `/api/specs/:spec/status` - Update status (PUT)
  - `/api/search` - Full-text search (POST)
  - `/api/tags` - Get all tags
  - `/api/stats` - Project statistics
  - `/api/dependencies` - All dependencies
  - `/api/dependencies/:spec` - Spec dependencies
  - `/api/dependency-graph/:spec` - Graph visualization data
  - `/api/validate` - Validate all specs
  - `/api/validate/:spec` - Validate single spec
  
- [ ] **Project management endpoints**
  - `/api/projects` - List projects
  - `/api/projects/:id` - Get project details
  - Multi-project switching support
  
- [ ] **Testing and error handling**
  - Unit tests for handlers
  - Integration tests with test fixtures
  - Proper error responses with status codes

### Stage 3: Build New UI Package (Week 2-3)

- [ ] **Create new `packages/ui-new` (Vite SPA)**
  - Vite + React + TypeScript setup
  - React Router for client-side navigation
  - Import `@leanspec/ui-components`
  
- [ ] **Implement project management UI**
  - ProjectSwitcher component (from ui-components)
  - Project creation dialog with folder picker (web: manual path input)
  - Project settings/management page
  - Recent and favorite projects
  
- [ ] **Implement spec pages using shared components**
  - SpecsPage (list view with filters)
  - SpecDetailPage (detail view with navigation)
  - StatsPage (statistics dashboard)
  - DependenciesPage (dependency visualization)
  
- [ ] **Build API client layer**
  - TypeScript API client (`lib/api-client.ts`)
  - Project management methods
  - Spec operation methods
  - Request/response type definitions
  - Error handling and retries
  
- [ ] **Configure Rust HTTP server integration**
  - Environment variables for API URL (default: http://localhost:3333)
  - Dev proxy configuration in Vite (optional)
  - Production build configuration
  
- [ ] **Feature parity with Next.js UI**
  - All existing features working
  - Same keyboard shortcuts
  - Same routing structure
  - Dark mode support
  - Multi-project support

### Stage 4: Upgrade Desktop to Shared Components (Week 3)

- [ ] **Update `packages/desktop` to use HTTP server**
  - Remove Next.js spawning logic
  - Spawn Rust HTTP server instead (reuse leanspec-http crate)
  - Use webview pointing to http://localhost:3333
  - Keep Tauri file dialogs for project folder picker
  
- [ ] **Migrate to shared UI components**
  - Desktop now loads same Vite SPA as web (from http server)
  - Remove duplicate project management UI code
  - Tauri commands only for: file dialogs, window management, system integration
  
- [ ] **Ensure feature parity**
  - Desktop has same features as web (automatically via shared UI)
  - All visualizations work
  - Performance remains excellent (should be faster)

### Stage 5: Migration & Launch (Week 4)

- [ ] **Archive old Next.js UI**
  - Rename `packages/ui` → `packages/ui-legacy-nextjs`
  - Add deprecation notice to README
  - Update package.json to mark as deprecated
  
- [ ] **Promote new UI**
  - Rename `packages/ui-new` → `packages/ui`
  - Update `lean-spec ui` command launcher
  - Start Rust HTTP server automatically
  
- [ ] **Update documentation**
  - Update README files
  - Update ARCHITECTURE.md
  - Update agent instructions (AGENTS.md)
  - Update user documentation
  
- [ ] **Update build & CI/CD**
  - Update build scripts
  - Update GitHub Actions workflows
  - Update release process for Rust HTTP binary
  
- [ ] **Cleanup**
  - Remove Next.js dependencies from root
  - Remove database dependencies (better-sqlite3, drizzle-orm)
  - Clean up unused TypeScript code
  - Run final tests

### Stage 6: Release & Monitoring (Week 4)

- [ ] **Release new version**
  - Version bump (0.3.0 - breaking change)
  - Update CHANGELOG
  - Publish all packages
  
- [ ] **Monitor and iterate**
  - Gather feedback
  - Fix bugs quickly
  - Performance tuning if needed
  - Documentation improvements

## Test

### Functional Tests

- [ ] All spec operations work (list, view, create, update, search)
- [ ] Project switching works correctly
- [ ] Dependencies visualization renders correctly
- [ ] Stats page displays accurate data
- [ ] Sub-specs are properly displayed
- [ ] Metadata editing saves correctly
- [ ] Search returns correct results
- [ ] Filters and sorting work

### Performance Tests

- [ ] Page load time <2s for 100+ specs
- [ ] Search response time <500ms
- [ ] Dependency graph renders <1s for 50+ specs
- [ ] Memory usage <200MB for typical usage

### Integration Tests

- [ ] Desktop app still works with shared components
- [ ] `lean-spec ui` launches new UI correctly
- [ ] Multi-project switching works in both desktop and web
- [ ] CLI operations reflect in UI immediately

### Compatibility Tests

- [ ] Works on Node.js 20+
- [ ] Works on Chrome, Firefox, Safari
- [ ] Works on macOS, Linux, Windows
- [ ] Existing projects load without migration

## Notes

### Why This Matters

1. **Eliminate Duplication**: One codebase to maintain instead of two
2. **Better Performance**: SPA + Rust is 10x faster than Next.js + TypeScript
3. **Consistency**: Same UX between web and desktop
4. **Faster Development**: New features implemented once, work everywhere
5. **Smaller Bundle**: No SSR overhead (~150MB → ~30MB for web)
6. **Future-Proof**: Easier to scale, maintain, and extend

### Why Bold Direct Migration?

**In AI coding era, velocity > incrementalism:**
- AI can port large codebases faster than humans
- Component extraction is mechanical work (AI excels)
- Rust HTTP server template is well-established
- Desktop migration (spec 169) already proved this works
- Risk is low when you have good tests

**Avoiding temporary bridges:**
- CLI spawning adds overhead we don't want long-term
- Two architectures mean two maintenance paths
- Incremental = slower time-to-value
- One migration, one testing cycle, one deployment

### Alternatives Considered

1. **Keep both UIs**: Rejected - unsustainable maintenance burden
2. **Incremental migration with CLI bridge**: Rejected - slower, temporary architecture debt
3. **Migrate desktop to Next.js**: Rejected - wrong direction (heavier, slower)
4. **Use web components**: Rejected - too much refactoring, limited benefit
5. **Micro-frontends**: Rejected - adds complexity without clear benefit

### Related Specs

- [Spec 169](../169-ui-backend-rust-tauri-migration-evaluation/): UI Backend Rust/Tauri Migration (desktop migration complete)
- [Spec 170](../170-cli-mcp-rust-migration/): CLI/MCP/Core Rust Migration (backend already in Rust)
- [Spec 181](../181-typescript-deprecation/): TypeScript Deprecation (core already migrated)

### Dependencies

- **Depends on**: None (Rust backend already exists in leanspec-core)
- **Blocks**: Future UI development should use consolidated architecture

### Open Questions

1. **Rust HTTP Server Distribution**: Should we bundle it with `@leanspec/ui` or as separate binary?
   - **Decided**: Separate binary (`@leanspec/http-server` npm package with platform-specific binaries)
   - **Rationale**: Cleaner separation, can version independently, easier CI/CD
   
2. **Web UI Production Use Case**: Should we support web UI in production?
   - **Leaning toward**: Dev-only (local contributor use)
   - **Rationale**: Browser security prevents arbitrary file access, not useful for end users
   - **Alternative**: Could add GitHub repo browsing (spec 035/082) but that's future work
   
3. **Config File Format & Location**: JSON at `~/.lean-spec/config.json`
   - **Rationale**: JSON easier to parse in Rust, consistency with projects.json format
   - **Location**: `~/.lean-spec/` for consistency, single directory for all data
   
4. **Hot Reload**: Should server watch projects.json and auto-reload?
   - **Leaning toward**: Yes, with file system watcher (notify-rs)
   - **Rationale**: Better UX when projects.json edited externally (e.g., manual edits, sync)
   
5. **Authentication**: Do we need auth for local HTTP server?
   - **Decision**: Start without auth (localhost only), add JWT if we support remote access later
   - **Rationale**: Local development doesn't need auth, adds complexity
   
6. **Spec File Hot Reload**: How to handle spec file changes?
   - **Option A**: File watcher in HTTP server + WebSocket push updates
   - **Option B**: Polling from frontend (simpler, works immediately)
   - **Leaning toward**: Option B initially, upgrade to A if needed

7. **Offline Support**: Should web UI work without HTTP server?
   - **Decision**: No, HTTP server is required (keeps architecture simple)
   - **Rationale**: SPA architecture requires backend for file operations
