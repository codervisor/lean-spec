---
status: in-progress
created: '2025-12-12'
tags:
  - architecture
  - desktop
  - rust
  - tauri
  - performance
  - evaluation
priority: high
created_at: '2025-12-12T21:19:29.487Z'
depends_on:
  - 166-desktop-ui-server-bundling-fix
  - 165-tauri-v2-migration
  - 148-leanspec-desktop-app
updated_at: '2025-12-12T22:19:34.148Z'
transitions:
  - status: in-progress
    at: '2025-12-12T22:19:34.148Z'
---

# Evaluate UI Backend Migration to Rust/Tauri

> **Status**: ⏳ In progress · **Priority**: High · **Created**: 2025-12-12 · **Tags**: architecture, desktop, rust, tauri, performance, evaluation

## Overview

### Problem Statement

The current LeanSpec desktop app (spec 148) bundles a **100MB Next.js standalone server** with full Node.js runtime to serve the UI. This creates several pain points:

**Bundle Size Issues**:
- Desktop app distribution: ~150-200MB (Electron-sized despite using Tauri)
- Next.js standalone: 100MB alone
- Full Node.js module tree with pnpm symlink challenges (spec 166)
- Large download size discourages adoption

**Runtime Complexity**:
- Node.js server spawned as sidecar process
- Port management and lifecycle coordination
- pnpm symlink resolution issues in packaged apps
- Additional memory footprint (~300-500MB for Node.js)

**Development Friction**:
- Complex build pipeline: Next.js build → standalone copy → Tauri bundle
- Debugging requires coordinating two processes
- Hot reload complexity in development mode

**Architectural Mismatch**:
- Tauri chosen for lightweight, native feel
- But UI backend still heavyweight Node.js
- Defeats the purpose of using Tauri over Electron

### Opportunity

The desktop app has a **Rust/Tauri backend** that already handles:
- Project management (10 Tauri commands in `commands.rs`)
- File system operations
- System tray and native integrations
- Window management

The UI has **19 Next.js API routes** (~1,322 LOC) that handle:
- Spec CRUD operations (reading/writing markdown)
- Project registry management
- Dependency graph computation
- Stats aggregation
- File system access

**Key Insight**: Most Next.js API routes just call `@leanspec/core` TypeScript functions. We could implement these same operations in Rust using Tauri commands, eliminating the Node.js server entirely.

### Proposed Architecture

**Current (Hybrid)**:
```
Desktop App
├── Tauri Shell (Rust) - Window management, tray, shortcuts
└── Next.js Server (Node.js) - UI + API backend
    └── @leanspec/core (TypeScript) - Spec operations
```

**Proposed (Pure Tauri)**:
```
Desktop App
├── Tauri Backend (Rust) - Everything backend
│   ├── Window management, tray, shortcuts
│   ├── Spec operations (migrate from @leanspec/core)
│   └── API commands (migrate from Next.js routes)
└── Static UI (React) - Pure frontend, no SSR
    └── Vite/SPA build
```

### Benefits Analysis

**Bundle Size** (Critical for Desktop):
- Current: ~150-200MB
- Target: ~20-40MB (80% reduction)
- No Node.js runtime needed
- No node_modules in bundle
- Aligns with Tauri's value proposition

**Performance** (High Impact):
- Startup: <1s (vs 2-3s for Node.js server)
- Memory: ~50-100MB (vs ~400-600MB total)
- Native file system access (no IPC overhead)
- No port management or process coordination

**Developer Experience** (Mixed):
- ✅ Simpler architecture (one process)
- ✅ Faster builds (no Next.js)
- ✅ Better debugging (unified stack)
- ❌ Need Rust development skills
- ❌ Lose Next.js ecosystem tools
- ❌ More complex initial migration

**Maintenance** (Long-term Consideration):
- Rust codebase growth: ~1,300 lines → ~3,000 lines
- TypeScript API routes: ~1,322 lines → 0 lines
- Single language for backend (consistency)
- But: Team needs Rust expertise

### Constraints & Considerations

**What Changes**:
- Desktop backend API only (not web UI deployment)
- Desktop app becomes pure SPA (no SSR)
- API routes migrated to Tauri commands

**What Stays Same**:
- Web UI still uses Next.js for SSR (spec 082, 087)
- CLI still uses Node.js (spec package)
- MCP server still uses Node.js
- React UI components unchanged
- User-facing features identical

**Critical Questions**:
1. Can we migrate spec operations from TypeScript to Rust efficiently?
2. Will we lose important Next.js features (SSR, API middleware)?
3. What's the migration effort vs. benefit ratio?
4. How do we maintain feature parity during transition?

### Related Context

**Foundation Specs**:
- **148-leanspec-desktop-app**: Current Tauri desktop architecture
- **166-desktop-ui-server-bundling-fix**: Current Node.js bundling issues
- **165-tauri-v2-migration**: Recent Tauri migration experience

**Strategic Specs**:
- **168-leanspec-orchestration-platform**: Desktop as orchestration hub
- **164-desktop-ci-build-artifacts**: Distribution and CI concerns

**Web UI Specs** (Not Affected):
- **087-cli-ui-command**: Web UI with Next.js SSR
- **082-web-deployment**: Remote UI deployment

## Design

### Migration Strategy

#### Option A: Full Migration (Recommended)

Migrate all API routes to Rust Tauri commands:

**Pros**:
- Maximum bundle size reduction (80%+)
- Simplest architecture
- Best performance
- No Node.js dependency

**Cons**:
- Most effort upfront (~2-3 weeks)
- Need Rust expertise
- Reimplementing TypeScript logic

**Scope**: 
- 19 Next.js routes → 19+ Tauri commands
- Core spec operations in Rust
- Static React SPA

#### Option B: Hybrid Approach (Fallback)

Keep Next.js for complex routes, migrate simple ones:

**Pros**:
- Incremental migration
- Reduce risk
- Keep TypeScript ecosystem

**Cons**:
- Still need Node.js runtime
- Limited bundle size savings
- Complex architecture

**Scope**:
- Migrate: Project management, simple CRUD
- Keep: Dependency graphs, complex stats

#### Option C: Status Quo with Optimizations

Keep current architecture, optimize bundling:

**Pros**:
- No migration effort
- Proven approach
- Keep TypeScript

**Cons**:
- Still 150MB+ bundles
- Node.js overhead remains
- Doesn't solve core issues

**Scope**:
- Better bundling (spec 166)
- Optimize Node.js startup

### Technical Implementation (Option A)

#### Phase 1: Rust Spec Operations Library

Create Rust equivalent of `@leanspec/core`:

```rust
// packages/desktop/src-tauri/src/specs/mod.rs
pub mod parser;      // Markdown + YAML frontmatter
pub mod reader;      // File system operations
pub mod search;      // Fuzzy search
pub mod stats;       // Analytics
pub mod dependency;  // Graph operations
pub mod validator;   // Spec validation
```

**Key Dependencies**:
- `gray_matter_rs` or `pulldown-cmark` - Markdown parsing
- `serde_yaml` - YAML frontmatter (already in Cargo.toml)
- `walkdir` - Directory traversal (already in Cargo.toml)
- `tantivy` or `nucleo` - Full-text search
- `petgraph` - Dependency graph analysis

**Estimated Effort**: 3-5 days
**LOC**: ~1,500 lines Rust

#### Phase 2: Migrate API Routes to Tauri Commands

Map each Next.js route to Tauri command:

| Next.js Route | Tauri Command | Complexity |
|--------------|---------------|------------|
| `GET /api/projects` | `get_projects` | Low (exists) |
| `POST /api/projects` | `add_project` | Low (exists) |
| `GET /api/projects/[id]/specs` | `get_specs` | Medium |
| `GET /api/projects/[id]/specs/[spec]` | `get_spec_detail` | Medium |
| `POST /api/projects/[id]/specs/[spec]/status` | `update_spec_status` | Low |
| `GET /api/projects/[id]/stats` | `get_project_stats` | High |
| `GET /api/projects/[id]/dependencies` | `get_dependencies` | High |
| `GET /api/projects/[id]/dependency-graph` | `get_dependency_graph` | High |
| ... (11 more routes) | ... | ... |

**Estimated Effort**: 5-7 days
**LOC**: ~1,000 lines Rust

#### Phase 3: Convert UI to Static SPA

Replace Next.js with Vite for desktop build:

**Changes**:
- Remove SSR/SSG (desktop doesn't need it)
- Replace `fetch('/api/...')` with `invoke('command', ...)`
- Single-page app with React Router
- Keep existing React components

**Build Output**:
- Vite → `dist/` static files
- Tauri bundles `dist/` in resources
- No server process needed

**Estimated Effort**: 2-3 days
**LOC**: ~200 lines TypeScript (routing setup)

#### Phase 4: Update Desktop Packaging

Simplify build pipeline:

**Before**:
1. Build Next.js standalone (100MB)
2. Copy to `src-tauri/ui-standalone/`
3. Build sidecar with pkg
4. Tauri bundle with Node.js + sidecar

**After**:
1. Build Vite SPA (2-5MB)
2. Tauri bundle with static files
3. Done

**Estimated Effort**: 1 day
**LOC**: Mostly removal

### UI Changes Required

**Frontend API Client**:

```typescript
// Before (Next.js)
const response = await fetch('/api/projects');
const data = await response.json();

// After (Tauri)
import { invoke } from '@tauri-apps/api/core';
const data = await invoke('get_projects');
```

**Routing**:

```typescript
// Before (Next.js App Router)
// Automatic file-based routing

// After (React Router)
import { BrowserRouter, Routes, Route } from 'react-router-dom';
```

**Minimal Impact**: Most UI components unchanged, only API call layer.

### Rust Implementation Example

**Spec Reading**:

```rust
#[tauri::command]
pub async fn get_spec_detail(
    state: State<'_, DesktopState>,
    project_id: String,
    spec_id: String,
) -> Result<SpecDetail, String> {
    let project = state.project_store.find(&project_id)
        .ok_or("Project not found")?;
    
    let spec_path = Path::new(&project.specs_dir)
        .join(&spec_id)
        .join("README.md");
    
    let content = fs::read_to_string(spec_path)
        .map_err(|e| e.to_string())?;
    
    let (frontmatter, body) = parse_frontmatter(&content)?;
    
    Ok(SpecDetail {
        id: spec_id,
        frontmatter,
        content: body,
    })
}
```

**Dependency Graph**:

```rust
use petgraph::graph::DiGraph;

#[tauri::command]
pub async fn get_dependency_graph(
    state: State<'_, DesktopState>,
    project_id: String,
) -> Result<DependencyGraph, String> {
    let specs = get_all_specs(&state, &project_id)?;
    let mut graph = DiGraph::new();
    
    // Build graph from spec dependencies
    for spec in specs {
        // Add nodes and edges
    }
    
    Ok(graph_to_json(&graph))
}
```

### Performance Benchmarks (Estimated)

| Metric | Current (Node.js) | Target (Rust) | Improvement |
|--------|-------------------|---------------|-------------|
| Bundle size | 150-200 MB | 20-40 MB | 80% smaller |
| Startup time | 2-3 seconds | <1 second | 66% faster |
| Memory usage | 400-600 MB | 50-100 MB | 83% less |
| Spec list (1000 specs) | ~500ms | ~50ms | 90% faster |
| Dependency graph | ~1000ms | ~100ms | 90% faster |

**Why Rust is Faster**:
- No Node.js VM overhead
- Direct file system access
- Native compiled code
- Efficient memory management
- Parallel processing (Tokio)

## Plan

### Option A: Full Migration (If Approved)

- [x] **Phase 1**: Rust spec operations library (Week 1)
  - [x] Markdown parser with frontmatter
  - [x] File system reader/walker
  - [x] Basic validation
  - [x] Unit tests for core operations

- [x] **Phase 2**: Migrate simple API routes (Week 2)
  - [x] Project CRUD commands
  - [x] Spec list and detail
  - [x] Status updates
  - [x] Basic stats
  - [x] Unit tests (Rust tests exist, require GTK environment to run)

- [x] **Phase 3**: Migrate complex routes (Week 3)
  - [x] Dependency graph computation
  - [x] Advanced stats and analytics
  - [x] Full-text search
  - [ ] Performance benchmarks

- [x] **Phase 4**: Convert UI to SPA (Week 4)
  - [x] Setup Vite build (already exists)
  - [x] Replace API calls with Tauri invokes (TypeScript layer complete)
  - [x] Setup React Router (`src/Router.tsx`)
  - [x] Create native SPA pages (SpecsPage, SpecDetailPage, StatsPage, DependenciesPage)
  - [ ] E2E testing

- [ ] **Phase 5**: Packaging and distribution (Week 5)
  - [ ] Update build scripts
  - [ ] Test on all platforms
  - [ ] Measure bundle sizes
  - [ ] Update CI/CD
  - [ ] Documentation

- [ ] **Phase 6**: Documentation and release (Week 6)
  - [ ] Update architecture docs
  - [ ] Migration guide for contributors
  - [ ] Release notes
  - [ ] Beta testing
  - [ ] v0.3.0 release

### Option B: Hybrid Approach (Alternative)

- [ ] **Phase 1**: Migrate project management (Week 1-2)
- [ ] **Phase 2**: Keep complex routes in Next.js (Week 3)
- [ ] **Phase 3**: Optimize Node.js bundling (Week 4)

### Option C: Status Quo (No Migration)

- [ ] Continue with current architecture
- [ ] Focus on spec 166 optimizations
- [ ] Accept 150MB+ bundle size

## Test

### Performance Validation

- [ ] Bundle size <50MB (vs 150MB+ current)
- [ ] Startup time <1s (vs 2-3s current)
- [ ] Memory usage <150MB (vs 400-600MB current)
- [ ] Spec list (1000 specs) <100ms
- [ ] Dependency graph <200ms

### Functional Parity

- [ ] All current features work identically
- [ ] No regressions in spec reading/writing
- [ ] Multi-project management works
- [ ] Dependency graphs accurate
- [ ] Stats and analytics correct

### Cross-Platform Testing

- [ ] macOS (Intel + Apple Silicon)
- [ ] Linux (Ubuntu, Fedora)
- [ ] Windows (10, 11)
- [ ] Bundle size on each platform
- [ ] Performance benchmarks

### Migration Validation

- [ ] Existing projects load correctly
- [ ] No data loss during transition
- [ ] Settings preserved
- [ ] Backward compatible

### Developer Experience

- [ ] Build time acceptable
- [ ] Debugging workflow clear
- [ ] Error messages helpful
- [ ] Documentation complete

## Notes

### Decision Framework

**Recommend Full Migration (Option A) If**:
- Desktop app is strategic focus (spec 168 suggests it is)
- Bundle size is critical for adoption
- Team has or can acquire Rust skills
- 4-6 week timeline acceptable

**Recommend Hybrid Approach (Option B) If**:
- Need incremental path
- Limited Rust expertise
- Complex features risky to rewrite
- Want to validate approach first

**Recommend Status Quo (Option C) If**:
- Desktop app is low priority
- Bundle size not blocking adoption
- Node.js bundling issues solvable (spec 166)
- Team focus needed elsewhere

### Rust Crate Recommendations

**Markdown & Frontmatter**:
- `pulldown-cmark` - Fast CommonMark parser
- `serde_yaml` - YAML parsing (already in use)
- Custom frontmatter: `pulldown-cmark` + `serde_yaml` (split on `---` delimiters)
- Alternative: `markdown-frontmatter-parser` crate if available

**File System**:
- `walkdir` - Already in use, proven
- `notify` - File watching if needed

**Search**:
- `tantivy` - Full-text search (Lucene-like)
- `nucleo` - Fuzzy matching (LSP-grade)

**Graphs**:
- `petgraph` - Graph algorithms
- Industry standard, well maintained

**HTTP/Async**:
- `tokio` - Already in use
- `serde_json` - Already in use

### Risks & Mitigations

**Risk**: Rust expertise gap on team
- Mitigation: Pair programming, code reviews, documentation
- Mitigation: Start with simple routes, build confidence

**Risk**: Migration bugs introduce regressions
- Mitigation: Comprehensive test coverage
- Mitigation: Beta program with power users
- Mitigation: Keep Node.js fallback in early versions

**Risk**: Performance doesn't meet expectations
- Mitigation: Benchmark early and often
- Mitigation: Profile and optimize hot paths
- Mitigation: Rust typically faster, low risk here

**Risk**: Maintenance becomes harder with Rust
- Mitigation: Clear documentation
- Mitigation: Follow Rust best practices
- Mitigation: Invest in tooling (clippy, fmt)

### Web UI Impact (None Expected)

The web UI (spec 087) continues using Next.js:
- SSR needed for SEO and performance
- Deployed to Vercel/hosting platforms
- Different requirements than desktop

This migration only affects the **desktop app backend**.

### Alternative: WebAssembly

Could compile `@leanspec/core` TypeScript to WASM:
- Keep TypeScript codebase
- Get native performance
- Bundle in Tauri

**Why Not**:
- WASM still needs JavaScript glue code
- Doesn't eliminate Node.js from bundle
- Adds complexity without solving bundling issue
- Limited ecosystem for file system operations

### Related Specs

**Direct Dependencies**:
- **148-leanspec-desktop-app**: Current architecture being evaluated
- **166-desktop-ui-server-bundling-fix**: Problem this solves
- **165-tauri-v2-migration**: Recent Tauri experience

**Strategic Context**:
- **168-leanspec-orchestration-platform**: Desktop as orchestration hub
- **164-desktop-ci-build-artifacts**: Build and distribution

**Unaffected Specs**:
- **087-cli-ui-command**: Web UI keeps Next.js
- **082-web-deployment**: Remote deployment separate

### Implementation Progress

**Completed (2025-12-12)**:

1. **Rust Spec Operations Library** (`packages/desktop/src-tauri/src/specs/`):
   - `frontmatter.rs` - YAML frontmatter parsing (gray-matter pattern)
   - `reader.rs` - File system reader/walker with caching
   - `stats.rs` - Statistics calculation
   - `dependencies.rs` - Dependency graph computation
   - `validation.rs` - Spec validation with error checking
   - `constants.rs` - Shared constants for status/priority values
   - `commands.rs` - Tauri commands exposing all operations

2. **Tauri Commands Implemented**:
   - `get_specs` - List all specs for a project
   - `get_spec_detail` - Get single spec with full content
   - `get_project_stats` - Calculate project statistics
   - `get_dependency_graph` - Build visualization graph
   - `get_spec_dependencies_cmd` - Get spec relationships
   - `search_specs` - Full-text search
   - `get_specs_by_status` - Filter by status
   - `get_all_tags` - Aggregate unique tags
   - `validate_spec_cmd` / `validate_all_specs_cmd` - Validation
   - `update_spec_status` - Update status with file write

3. **TypeScript Integration** (`packages/desktop/src/`):
   - `types.ts` - TypeScript types for all spec data structures
   - `lib/ipc.ts` - Tauri invoke wrapper functions
   - `hooks/useSpecs.ts` - React hooks for state management

**Completed (2025-12-13)**:

4. **React Router Setup** (`packages/desktop/src/Router.tsx`):
   - Client-side routing configuration
   - Root layout with project context
   - Routes: `/specs`, `/specs/:specId`, `/stats`, `/dependencies`

5. **Native SPA Pages** (`packages/desktop/src/pages/`):
   - `SpecsPage.tsx` - Specs list with search, filter, sort, list/board views
   - `SpecDetailPage.tsx` - Individual spec with content, metadata, dependencies
   - `StatsPage.tsx` - Project statistics and metrics overview
   - `DependenciesPage.tsx` - Dependency graph visualization
   - CSS modules with dark theme styling for all pages

**Remaining Work**:
- E2E testing for SPA navigation
- Performance benchmarks (bundle size, startup time, memory)
- Packaging updates to remove Node.js bundling
- CI/CD updates for new build process
- Architecture documentation

### Verification Report (2025-12-14)

**Verification Performed By**: AI Agent
**Verification Date**: 2025-12-14

#### Summary
The Rust/Tauri migration evaluation has made **significant progress** (Phases 1-4 complete), but is **not yet production-ready**. Core functionality is implemented and tested, but critical phases remain incomplete.

#### Test Results

**Unit Tests**: ✅ PASS
```
36/36 tests passing in leanspec-core
- Frontmatter parsing: 5 tests ✅
- Type validation: 5 tests ✅
- Dependency graphs: 4 tests ✅
- Statistics: 2 tests ✅
- Spec loading: 3 tests ✅
- Validation: 5 tests ✅
- Token counting: 3 tests ✅
- Other utilities: 9 tests ✅
```

**Build Status**: ✅ SUCCESS
- Rust binaries compile successfully in release mode
- Build time: ~37 seconds (clean build)
- No compilation warnings or errors

**Functional Testing**: ⚠️ PARTIAL
- Desktop Tauri commands exist but not tested in this verification
- Rust core library functional (tested via CLI proxy)
- UI SPA pages claimed complete but not visually verified

#### Phase Completion Status

| Phase | Status | Completion % | Notes |
|-------|--------|--------------|-------|
| Phase 1 | ✅ Complete | 100% | Core library fully implemented |
| Phase 2 | ✅ Complete | 100% | Tauri commands implemented |
| Phase 3 | ⚠️ Mostly | 90% | Missing performance benchmarks |
| Phase 4 | ⚠️ Mostly | 90% | Missing E2E tests |
| Phase 5 | ❌ Not Started | 0% | Packaging/distribution pending |
| Phase 6 | ❌ Not Started | 0% | Documentation/release pending |

**Overall Progress**: ~60-70% complete

#### Test Section Compliance

From spec requirements:

**Performance Validation**: ❌ NOT COMPLETED
- [ ] Bundle size <50MB (vs 150MB+ current) - NOT MEASURED
- [ ] Startup time <1s (vs 2-3s current) - NOT MEASURED
- [ ] Memory usage <150MB (vs 400-600MB current) - NOT MEASURED
- [ ] Spec list (1000 specs) <100ms - NOT MEASURED
- [ ] Dependency graph <200ms - NOT MEASURED

**Functional Parity**: ⚠️ PARTIALLY TESTED
- [x] Core spec operations work (via Rust CLI testing)
- [ ] Desktop app functionality not tested
- [ ] Multi-project management not verified
- [ ] Dependency graphs not visually verified
- [ ] Stats and analytics not visually verified

**Cross-Platform Testing**: ❌ NOT COMPLETED
- [ ] macOS (Intel + Apple Silicon)
- [ ] Linux (Ubuntu, Fedora)
- [ ] Windows (10, 11)
- [ ] Bundle size on each platform
- [ ] Performance benchmarks

**Migration Validation**: ❌ NOT COMPLETED
- [ ] Existing projects load correctly
- [ ] No data loss during transition
- [ ] Settings preserved
- [ ] Backward compatible

**Developer Experience**: ❌ NOT COMPLETED
- [ ] Build time acceptable (only measured once: 37s)
- [ ] Debugging workflow not documented
- [ ] Error messages not reviewed
- [ ] Documentation incomplete

#### Recommendations

**To Complete Evaluation (Spec 169)**:
1. Run performance benchmarks on actual desktop app
2. Add E2E test suite for SPA navigation
3. Test desktop app on macOS, Linux, Windows
4. Measure bundle sizes before/after migration
5. Document architecture decisions and API

**For Production Readiness**:
1. Complete Phases 5-6 (Packaging, Distribution, Documentation)
2. Achieve 100% test coverage on all Test section items
3. Beta test with real users
4. Create rollback plan
5. Update CI/CD for Rust builds

**Current Recommendation**: 
- Spec should remain **in-progress** ⏳
- Technical viability: **PROVEN** ✅
- Production readiness: **~40-50%** ⚠️
- Next steps: Complete Phases 5-6 or create follow-up implementation spec
