---
status: planned
created: 2025-12-18
priority: high
tags:
- rust
- backend
- http
- api
depends_on:
- 184-ui-packages-consolidation
created_at: 2025-12-18T15:00:01.020156Z
updated_at: 2025-12-18T15:02:52.601244Z
---

# Rust HTTP Server

> **Part of**: [Spec 184](../184-ui-packages-consolidation/) - Unified UI Architecture
>
> **Token Budget**: Target ~2000 tokens

## Overview

**Problem**: Current web UI (`packages/ui`) uses TypeScript backend (Next.js API routes) which is:
- **Slow**: 10x slower than Rust for spec operations
- **Heavy**: 150MB+ bundle size with Next.js SSR overhead
- **Duplicated**: Desktop already has Rust backend via Tauri
- **Limited**: Single-project architecture (no multi-project support)

**Solution**: Build production-ready **Rust HTTP server** using Axum web framework:
- Direct integration with `leanspec_core` (no CLI spawning)
- Multi-project support via shared project registry
- RESTful JSON API matching current Next.js routes
- **Serves web SPA only** (desktop uses Tauri commands for better performance)
- Configuration system via `~/.lean-spec/config.json`

**Benefits**:
- 10x faster than TypeScript backend
- 83% smaller bundle (30MB vs 150MB+)
- Shared between web and desktop
- Better type safety (Rust + serde)
- Easier to maintain (one backend instead of two)

## Design

### Architecture

```
┌──────────────────────────────────────────────────────┐
│         Rust HTTP Server (Axum)                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  Config (~/.lean-spec/config.json)             │  │
│  │  - server.host (default: 127.0.0.1)            │  │
│  │  - server.port (default: 3333)                 │  │
│  │  - cors.origins (configurable)                 │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  Project Registry (~/.lean-spec/projects.json) │  │
│  │  - Load all projects on startup                │  │
│  │  - Current project tracking                    │  │
│  │  - CRUD operations via HTTP API                │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  Axum Routes + Handlers                        │  │
│  │  - /api/projects (CRUD)                        │  │
│  │  - /api/specs (list, view, search)             │  │
│  │  - /api/stats, /api/deps, /api/validate        │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  leanspec_core Integration                     │  │
│  │  - Direct function calls (no IPC)              │  │
│  │  - SpecsReader, SearchEngine, StatsCalculator  │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
           ↓
    Web UI (Vite SPA)
    http://localhost:3333

Note: Desktop does NOT use this HTTP server.
Desktop uses Tauri commands (direct Rust calls).
```

### Server State Management

```rust
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

struct Project {
    id: String,
    name: String,
    specs_dir: PathBuf,
    favorite: bool,
    color: Option<String>,
    last_accessed: DateTime<Utc>,
}
```

### API Endpoints

**Project Management:**
- `GET /api/projects` - List all projects (recent, favorites)
- `POST /api/projects` - Add new project
- `GET /api/projects/:id` - Get project details
- `PATCH /api/projects/:id` - Update project (favorite, color, etc.)
- `DELETE /api/projects/:id` - Remove project
- `POST /api/projects/:id/switch` - Switch to project

**Spec Operations** (use current project):
- `GET /api/specs` - List specs (with filters)
- `GET /api/specs/:spec` - Get spec detail
- `PATCH /api/specs/:spec/metadata` - Update metadata
- `POST /api/search` - Search specs
- `GET /api/stats` - Project statistics
- `GET /api/deps/:spec` - Dependency graph
- `GET /api/validate` - Validate all specs
- `GET /api/validate/:spec` - Validate single spec

**Health & Config:**
- `GET /health` - Health check
- `GET /api/config` - Get config
- `PATCH /api/config` - Update config

### Configuration Format

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

**Location**: `~/.lean-spec/config.json`
**Format**: JSON (easier to parse in Rust than YAML)
**Migration**: Auto-convert from `config.yaml` if exists

### Multi-Project Architecture

**Key Principle**: Server-side project context, client-agnostic

```
User clicks project → POST /api/projects/abc123/switch
                    → Server updates current_project_id
                    → All subsequent API calls use this project
                    → Response: { success: true }
                    
User lists specs   → GET /api/specs
                    → Server reads current_project_id
                    → Loads specs from that project's specs_dir
                    → Response: { specs: [...] }
```

**No project ID in every request**: Server maintains session state
**Desktop**: Single user, no auth needed (localhost only)
**Web**: Same behavior (localhost development)

### Error Handling

```rust
#[derive(Serialize)]
struct ErrorResponse {
    error: String,
    code: String,
    details: Option<String>,
}

async fn list_specs(...) -> Result<Json<SpecsResponse>, (StatusCode, Json<ErrorResponse>)> {
    // Validate current project selected
    let current_id = state.current_project_id.read().await;
    let project_id = current_id.as_ref()
        .ok_or((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "No project selected".to_string(),
                code: "NO_PROJECT".to_string(),
                details: None,
            })
        ))?;
    
    // Execute operation with proper error mapping
    let specs = reader.list_specs(params)
        .map_err(|e| (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: e.to_string(),
                code: "LIST_FAILED".to_string(),
                details: Some(format!("{:?}", e)),
            })
        ))?;
    
    Ok(Json(SpecsResponse { specs }))
}
```

### Technology Stack

- **Web Framework**: Axum 0.7 (fast, modern, type-safe)
- **Core Integration**: leanspec_core (existing crate)
- **Serialization**: serde 1.0 + serde_json
- **CORS**: tower-http with CorsLayer
- **Config**: serde + serde_json
- **Async Runtime**: tokio 1.0
- **Testing**: axum-test, reqwest for integration tests

## Plan

### Phase 1: Crate Setup (Day 1)
- [ ] Create `rust/leanspec-http` crate
- [ ] Add dependencies (axum, tokio, serde, tower-http)
- [ ] Set up project structure (routes, handlers, state)
- [ ] Configure for library + binary build

### Phase 2: Configuration System (Day 1-2)
- [ ] Implement config loader (`~/.lean-spec/config.json`)
- [ ] Auto-migrate from YAML if exists
- [ ] Default configuration
- [ ] Config validation

### Phase 3: Project Registry (Day 2-3)
- [ ] Implement ProjectRegistry struct
- [ ] Load projects from `~/.lean-spec/projects.json`
- [ ] Project CRUD operations
- [ ] Current project tracking
- [ ] File watcher for registry changes (optional)

### Phase 4: Core Integration (Day 3-4)
- [ ] AppState setup with project registry
- [ ] leanspec_core integration
- [ ] Helper functions for spec operations
- [ ] Error handling utilities

### Phase 5: API Endpoints - Projects (Day 4-5)
- [ ] `GET /api/projects` (list)
- [ ] `POST /api/projects` (create)
- [ ] `GET /api/projects/:id` (get)
- [ ] `PATCH /api/projects/:id` (update)
- [ ] `DELETE /api/projects/:id` (remove)
- [ ] `POST /api/projects/:id/switch` (switch)

### Phase 6: API Endpoints - Specs (Day 5-7)
- [ ] `GET /api/specs` (list with filters)
- [ ] `GET /api/specs/:spec` (detail)
- [ ] `PATCH /api/specs/:spec/metadata` (update)
- [ ] `POST /api/search` (search)
- [ ] `GET /api/stats` (statistics)
- [ ] `GET /api/deps/:spec` (dependencies)
- [ ] `GET /api/validate` (validate all)
- [ ] `GET /api/validate/:spec` (validate one)

### Phase 7: CORS & Security (Day 7)
- [ ] CORS configuration
- [ ] Localhost-only binding
- [ ] Request validation
- [ ] Rate limiting (optional)

### Phase 8: Testing (Day 8-9)
- [ ] Unit tests for handlers
- [ ] Integration tests with test fixtures
- [ ] Error handling tests
- [ ] Project switching tests
- [ ] Multi-project tests

### Phase 9: CLI Integration (Day 9-10)
- [ ] Add to `lean-spec` CLI as `ui` command
- [ ] Auto-start server on `lean-spec ui`
- [ ] Port conflict handling (auto-find available port)
- [ ] Graceful shutdown

### Phase 10: Documentation (Day 10)
- [ ] API documentation (OpenAPI/Swagger optional)
- [ ] Architecture documentation
- [ ] Example requests/responses
- [ ] Error codes reference

## Test

### Unit Tests
- [ ] Config loading and validation
- [ ] Project registry CRUD operations
- [ ] Route handlers with mocked state
- [ ] Error response formatting

### Integration Tests
- [ ] Start server, make requests, verify responses
- [ ] Multi-project switching flow
- [ ] All API endpoints work end-to-end
- [ ] Error cases return proper status codes
- [ ] CORS headers present

### Performance Tests
- [ ] List 100+ specs < 100ms
- [ ] Search query < 200ms
- [ ] Dependency graph build < 500ms
- [ ] Memory usage < 50MB for typical workload

### Compatibility Tests
- [ ] Works with existing projects.json format
- [ ] Config migration from YAML works
- [ ] Desktop and web can connect simultaneously

## Notes

### Why Axum?

**Pros**:
- Fast and lightweight
- Excellent type safety
- Great async support with tokio
- Easy to test
- Good ecosystem (tower middleware)

**Alternatives Considered**:
- Actix-web: Faster but more complex
- Rocket: Simpler but less flexible
- Warp: Good but less popular

**Decision**: Axum balances performance, ergonomics, and ecosystem.

### Why JSON Config?

- Easier to parse in Rust (serde_json)
- Consistent with projects.json format
- Simpler than YAML (no indentation issues)
- Auto-migration from YAML provided

### Distribution Strategy

**Package**: `@leanspec/http-server` npm package
- Contains platform-specific binaries (macOS, Linux, Windows)
- Installed as dependency of `@leanspec/ui`
- Started automatically by `lean-spec ui` command

**Binary Location**: `node_modules/@leanspec/http-server/bin/leanspec-http`

### Related Specs

- [Spec 184](../184-ui-packages-consolidation/): Parent umbrella spec
- [Spec 185](../185-ui-components-extraction/): UI components library
- [Spec 187](../187-vite-spa-migration/): Vite SPA (consumer of this API)
