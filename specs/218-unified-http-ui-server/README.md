---
status: planned
created: 2026-01-16
priority: high
tags:
- rust
- http
- ui
- architecture
- simplification
depends_on:
- 186-rust-http-server
- 187-vite-spa-migration
created_at: 2026-01-16T06:20:12.456068Z
updated_at: 2026-01-16T06:20:19.028943Z
---

# Unified HTTP Server with Embedded UI

## Overview

**Problem**: Currently, `@leanspec/ui` runs two separate services:
1. **Rust HTTP Server** (leanspec-http) - API backend on port 3333
2. **Node.js Static Server** - UI frontend on port 3000

This creates unnecessary complexity:
- Two processes to manage and coordinate
- Two ports to configure
- More failure points (either service can fail independently)
- Confusing UX (which port to use?)
- Extra dependencies (Node.js HTTP server in the UI package)
- Network overhead (browser ↔ UI server ↔ API server)

**Solution**: Embed the Vite UI build into the Rust HTTP server using `tower-http::ServeDir`, creating a single unified service that:
- Serves the UI on root path (`/`, `/projects`, etc.)
- Serves API on `/api/*` routes
- Runs on a single port (default 3000)
- One process, one port, simpler architecture

**Benefits**:
- Simpler deployment and operation (one command, one process)
- Better performance (no Node.js overhead)
- Smaller bundle size (eliminate Node.js server code)
- Cleaner architecture (UI is a static asset, not a service)
- Consistent with desktop app pattern (Tauri serves UI directly)
- Easier CORS setup (same-origin requests)

## Design

### Architecture Changes

**Before**:
```
User runs: npx @leanspec/ui
  ↓
  ├─> Node.js process (port 3000)
  │    └─> Serves dist/ files
  └─> Rust HTTP process (port 3333)
       └─> Serves /api/* routes

Browser: http://localhost:3000
         ↓ CORS requests
         http://localhost:3333/api/*
```

**After**:
```
User runs: npx @leanspec/ui (or just leanspec-http)
  ↓
  Rust HTTP process (port 3000)
  ├─> Serves /api/* routes (existing handlers)
  └─> Serves /* static files (new: tower-http::ServeDir)
       └─> Embeds UI dist/ from @leanspec/ui

Browser: http://localhost:3000
         └─> Same-origin API requests (no CORS needed)
```

### Rust HTTP Server Changes

**1. Embed UI Assets**

```rust
// In leanspec-http/build.rs (new file)
use std::env;
use std::path::PathBuf;

fn main() {
    // During build, copy UI dist files to rust/leanspec-http/ui-dist/
    // Or use include_dir! macro to embed at compile time
    
    let ui_dist = PathBuf::from("../../packages/ui/dist");
    let target_dir = PathBuf::from(env::var("OUT_DIR").unwrap())
        .join("../../ui-dist");
    
    // Copy UI files or embed them
    println!("cargo:rerun-if-changed={}", ui_dist.display());
}
```

**2. Add Static File Route**

```rust
// In routes.rs
use tower_http::services::ServeDir;

pub fn create_router(state: AppState) -> Router {
    // Get UI dist directory path
    let ui_dist = get_ui_dist_path();
    
    Router::new()
        // API routes (existing)
        .route("/health", get(handlers::health_check))
        .route("/api/projects", get(handlers::list_projects))
        // ... all other API routes
        
        // Static file serving (NEW)
        .nest_service("/", ServeDir::new(ui_dist).fallback(
            // SPA fallback: serve index.html for any non-API route
            ServeDir::new(ui_dist).not_found_service(
                ServeFile::new(format!("{}/index.html", ui_dist))
            )
        ))
        
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

fn get_ui_dist_path() -> String {
    // Priority 1: Environment variable (set by @leanspec/ui launcher)
    if let Ok(ui_dist) = std::env::var("LEANSPEC_UI_DIST") {
        return ui_dist;
    }
    
    // Priority 2: Development mode - relative path
    #[cfg(debug_assertions)]
    return "../../packages/ui/dist".to_string();
    
    // Priority 3: Production fallback (shouldn't happen with launcher)
    #[cfg(not(debug_assertions))]
    {
        // Try to find @leanspec/ui package in node_modules
        // This allows standalone @leanspec/http-server usage
        let exe_dir = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()))
            .expect("Failed to get executable directory");
        
        // Look for @leanspec/ui/dist relative to binary
        let ui_pkg_path = exe_dir
            .parent()
            .and_then(|p| p.parent())
            .map(|p| p.join("@leanspec/ui/dist"));
            
        if let Some(path) = ui_pkg_path {
            if path.exists() {
                return path.to_str().unwrap().to_string();
            }
        }
        
        // Fallback: Assume UI dist is bundled with binary
        exe_dir.join("ui-dist").to_str().unwrap().to_string()
    }
}
```

**3. Router Ordering**

Critical: API routes must be registered BEFORE the catch-all static file route:

```rust
Router::new()
    // 1. Specific API routes first (highest priority)
    .route("/health", get(health))
    .route("/api/*", /* all API handlers */)
    
    // 2. Static files last (lowest priority, catch-all)
    .nest_service("/", ServeDir::new(ui_dist))
```

### Package Structure

**User-Facing Package**: `@leanspec/ui` (unchanged for users)
- Contains Vite build (`dist/`)
- Contains launcher (`bin/leanspec-ui.js`)
- Depends on `@leanspec/http-server`
- Users install: `npx @leanspec/ui`

**Backend Package**: `@leanspec/http-server`
- Contains Rust binary
- Discovers UI files from `@leanspec/ui/dist`
- Can be used standalone for API-only scenarios

### UI Package Changes

**1. Update package.json**

```json
{
  "name": "@leanspec/ui",
  "bin": {
    "leanspec-ui": "./bin/leanspec-ui.js"
  },
  "files": [
    "bin/",
    "dist/",        // ← Vite build output
    "README.md"
  ],
  "dependencies": {
    "@leanspec/http-server": "workspace:*"
    // Remove: Node.js HTTP server code
  }
}
```

**2. Simplify Launcher**

```javascript
#!/usr/bin/env node
// bin/leanspec-ui.js

import { spawn } from 'child_process';
import { createRequire } from 'module';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve paths
const uiDistPath = join(__dirname, '..', 'dist');
const httpServerPath = require.resolve('@leanspec/http-server/bin/leanspec-http.js');

console.log('🚀 Starting LeanSpec...');

// Start Rust HTTP server with UI_DIST env var
const proc = spawn('node', [httpServerPath], {
  stdio: 'inherit',
  env: { 
    ...process.env,
    LEANSPEC_UI_DIST: uiDistPath  // Tell server where UI files are
  }
});

proc.on('error', (err) => {
  console.error('Failed to start LeanSpec:', err.message);
  process.exit(1);
});

// Cleanup on exit
process.on('SIGINT', () => {
  proc.kill();
  process.exit(0);
});
```

**3. API Client Configuration**

Update UI's API client to use relative URLs (same-origin):

```typescript
// Before: Hardcoded to localhost:3333
const API_BASE = 'http://localhost:3333/api';

// After: Relative URL (works for both dev and prod)
const API_BASE = '/api';
```

### Build Pipeline Changes

**1. Build Order**

```bash
# In root Makefile or build script
build:
  # 1. Build UI first
  cd packaui/
├── bin/
│   └── leanspec-ui.js (launcher)
├── dist/              (Vite build)
│   ├── index.html
│   ├── assets/
│   └── ...
├── package.json
└── README.md

@leanspec/http-server/
├── bin/
│   └── leanspec-http  (Rust binary)
└── package.json
```

**Flow**:
1. User runs: `npx @leanspec/ui`
2. Launcher starts: `@leanspec/http-server` with `LEANSPEC_UI_DIST` env var
3. Rust server discovers UI files from `@leanspec/ui/dist`
4. Both UI and API served on port 3000 4. Copy binary to npm-dist
  # (existing process)
```

**2. npm Distribution**

```
@leanspec/http-server/
├── bin/
│   ├── leanspec-http (binary)
│   └── ui-dist/       (UI files)
│       ├── index.html
│       ├── assets/
│       └── ...
└── package.json
```

### Development Mode

**Option 1: Separate Dev Servers (Current)**
- UI: `cd packages/ui && pnpm dev` (Vite on 5173)
- API: `cd rust/leanspec-http && cargo run` (on 3000)
- Vite proxy config handles CORS

**Option 2: Unified Dev Mode**
- Build UI: `cd packages/ui && pnpm build --watch`
- Run Rust: `cd rust/leanspec-http && cargo watch -x run`
- Access: http://localhost:3000

**Recommendation**: Keep Option 1 for development (faster HMR)

### Configuration

Update `~/.lean-spec/config.json`:

```json
{
  "server": {
    "host": "127.0.0.1",
    "port": 3000,  // Single port for both UI and API
    "cors": {
      "enabled": false  // No CORS needed for same-origin
    }
  }
}
```

### Backward Compatibility

**Breaking Change**: None! Port 3000 remains the default

**Migration Path**:
1. Users continue using `http://localhost:3000`
2. API moves from `:3333` to `:3000/api`
3. Node.js server replaced with Rust server (transparent to users)

**User Impact**:
- Users running `npx @leanspec/ui`: Works exactly the same (port 3000)
- Users with bookmarks to `:3000`: No change needed
- Users accessing API directly on `:3333`: Need to update to `:3000/api`
- CustBuild UI first: `cd packages/ui && pnpm build`
- [ ] Build Rust HTTP server: `cd rust/leanspec-http && cargo build --release`
- [ ] No bundling needed - packages stay separate
- [ ] Update CI build workflow order
- [ ] Test: Build both, verify they work together
### Phase 1: Rust HTTP Server Static File Serving (Day 1-2)
- [ ] Verify `@leanspec/ui` includes `dist/` in published files
- [ ] Verify `@leanspec/http-server` includes Rust binary
- [ ] Test: `npm pack` both packages and inspect tarballs
- [ ] Test: Install from tarballs and verify UI discovery works
- [ ] Test: `npx @leanspec/ui` starts successfully
- [ ] Ensure API routes take precedence

### Phase 2: Build Pipeline Integration (Day 2-3)
- [ ] Create `rust/leanspec-http/ui-dist/` directory
- [ ] Add script to copy `packages/ui/dist` → `rust/leanspec-http/ui-dist`
- [ ] Update CI build workflow
- [ ] Test: Build UI, copy, build Rust, verify binary includes UI

### Phase 3: npm Distribution (Day 3-4)
- [ ] Update `scripts/copy-rust-binaries.mjs` to include ui-dist/
- [ ] Verify npm package structure
- [ ] Test: `npm pack` and inspect tarball
- [ ] Test: Install from tarball and run

### Phase 4: UI Package Simplification (Day 4-5)
- [ ] Remove Node.js HTTP server code from `packages/ui/bin/`
- [ ] Update launcher to only start Rust HTTP server
- [ ] Update API client to use relative URLs (`/api`)
- [ ] Remove port 3000 references
- [ ] Update UI environment detection

### Phase 5: Configuration & Documentation (Day 5-6)
- [ ] Keep default port as 3000 in all configs
- [ ] Update README and docs
- [ ] Add migration guide for API-only users (port 3333 → 3000)
- [ ] Update `lean-spec ui` command output messages

### Phase 6: Development Experience (Day 6)
- [ ] Update Vite proxy config (if needed)
- [ ] Document dev vs prod modes
- [ ] Update CONTRIBUTING.md

### Phase 7: Testing (Day 7-8)
- [ ] Test unified server serves UI correctly
- [ ] Test SPA routing works (fallback to index.html)
- [ ] Test API routes still work
- [ ] Test static assets load (CSS, JS, images)
- [ ] Test MIME types are correct
- [ ] Test 404 handling
- [ ] Test both dev and prod builds

### Phase 8: Cleanup (Day 8-9)
- [ ] Remove old Node.js server code
- [ ] Update Rust HTTP server default port from 3333 to 3000
- [ ] Archive spec 103 (UI Standalone Consolidation) as superseded
- [ ] Update CHANGELOG

## Test

### Unit Tests
- [ ] `get_ui_dist_path()` returns correct path in dev/prod
- [ ] Router ordering: API routes match before static files
- [ ] SPA fallback serves index.html for unknown routes

### Integration Tests
- [ ] `GET /` returns index.html (200)
- [ ] `GET /index.html` returns index.html (200)
- [ ] `GET /assets/main.js` returns JS file (200)
- [ ] `GET /projects` returns index.html (SPA fallback) (200)
- [ ] `GET /api/projects` returns JSON (not index.html) (200)
- [ ] `GET /nonexistent.jpg` returns index.html (SPA fallback) (200)
- [ ] Static files have correct MIME types
- [ ] API responses have correct Content-Type: application/json

### E2E Tests
- [ ] Install from npm: `npm install @leanspec/ui`
- [ ] Run: `npx @leanspec/ui`
- [ ] Open: `http://localhost:3000`
- [ ] UI loads and displays correctly
- [ ] API calls work (list projects, etc.)
- [ ] Navigation works (click links, browser back/forward)
- [ ] Ctrl+C shuts down cleanly

### Performance Tests
- [ ] Static file serving < 10ms for small files
- [ ] Gzip compression works (if enabled)
- [ ] Caching headers present (if configured)

## Notes

### Why Embed UI in Rust HTTP Server?

**Pros**:
- Single process, single port (simpler UX)
- No Node.js runtime needed for static serving
- Same-origin requests (no CORS complexity)
- Consistent with desktop app pattern
- Smaller total bundle size
- Better performance (Rust is faster than Node.js)

**Cons**:
- Requires rebuilding Rust binary when UI changes
- Slightly more complex build pipeline
- UI dist must be available during Rust build

**Alternatives Considered**:
1. **Keep separate servers**: Current approach, too complex
2. **Reverse proxy**: Adds another layer, overkill
3. **Embed UI at compile-time** (include_dir!): Binary too large
4. **Bundle UI next to binary**: ✅ **Chosen approach** (best balance)

### Implementation Strategy

**Chosen**: Bundle UI next to binary (ui-dist/ folder)

**Why**:
- UI can be updated without rebuilding Rust
- Binary stays small
- Easy to verify what UI version is bundled
- Works well with npm distribution

node_modules/
├── @leanspec/ui/
│   ├── bin/leanspec-ui.js    (entry point)
│   └── dist/                 (UI files discovered by Rust)
│       ├── index.html
│       └── assets/
└── @leanspec/http-server/
    └── bin/leanspec-http     (Rust binary)
```

**Why This Approach?**
- Users install the package they expect: `@leanspec/ui`
- Packages stay independent (can update UI without rebuilding Rust)
- Smaller binaries (no embedded UI)
- Flexible: Can use `@leanspec/http-server` standalone for API-only     ├── index.html
        └── assets/
```

### Rust Dependencies

Add to `leanspec-http/Cargo.toml`:

```toml
[dependencies]
# Existing dependencies...
tower-http = { version = "0.6.8", features = ["fs", "trace"] }
```

The `fs` feature provides `ServeDir` and `ServeFile` for static file serving.

### API Route Precedence

Axum router matches routes in order. Ensure API routes are registered FIRST:

```rust
Router::new()
    .route("/health", get(health))           // ✅ Matches /health
    .route("/api/projects", get(projects))   // ✅ Matches /api/projects
    .nest_service("/", ServeDir::new(dist))  // ⚠️ Matches everything else
```

If static files are registered first, they will catch all routes and API won't work.

### SPA Fallback Implementation

```rust
use tower_http::services::{ServeDir, ServeFile};

// Create a fallback service that returns index.html
let serve_dir = ServeDir::new("ui-dist")
    .not_found_service(ServeFile::new("ui-dist/index.html"));

Router::new()
    .route("/api/*", api_routes)
    .fallback_service(serve_dir)
```

This ensures:
- `/projects` → `index.html` (SPA handles routing)
- `/api/projects` → API handler (not index.html)
- `/assets/main.js` → `ui-dist/assets/main.js`

### CORS Simplification

With same-origin requests, CORS can be disabled or simplified:

```rust
// Before: Allow localhost:3000 UI to access localhost:3333 API
let cors = CorsLayer::new()
    .allow_origin("http://localhost:3000".parse().unwrap());

// After: No CORS needed (same origin at localhost:3000)
// Only need CORS in dev mode if using separate Vite server (port 5173)
```

### Desktop App Consistency

This change aligns web UI with desktop app architecture:
- **Desktop**: Tauri serves UI, Rust commands handle API
- **Web**: Rust HTTP serves UI, Rust handlers handle API

Both use Rust for backend, UI is a static asset.

### Migration from Spec 103

[Spec 103](../103-ui-standalone-consolidation/) consolidated Next.js into `@leanspec/ui`. This spec goes further by eliminating the Node.js server entirely.

**Evolution**:
1. Spec 103: Two packages → One package (UI + Next.js)
2. This spec: Two processes → One process (Rust serves both)

### Related Specs

- [Spec 186](../186-rust-http-server/): Rust HTTP Server foundation
- [Spec 103](../103-ui-standalone-consolidation/): UI package consolidation
- [Spec 187](../187-vite-spa-migration/): Vite SPA (UI build artifact)
- [Spec 184](../184-ui-packages-consolidation/): Unified UI Architecture (parent)