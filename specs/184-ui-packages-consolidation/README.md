---
status: complete
created: 2025-12-18
priority: high
tags:
- ui
- desktop
- architecture
- consolidation
- rust
depends_on:
- '185'
- '186'
- '187'
created_at: 2025-12-18T14:02:41.727119Z
updated_at: 2026-01-12T08:27:30.904768148Z
---
# Unified UI Architecture: Rust-Powered Web & Desktop (Umbrella)

> **Status**: planned · **Priority**: high · **Created**: 2025-12-18
> 
> **⚠️ Umbrella Spec**: Coordinates 3 sub-specs. See [SPLIT.md](SPLIT.md) and sub-specs for implementation details.

## Overview

**Problem**: Two UI implementations with different capabilities:
- **`packages/ui`**: Next.js SSR, rich UI, but 150MB+ bundle + slow TypeScript backend
- **`packages/desktop`**: Tauri + basic UI, fast Rust backend, but limited features

**Solution**: Unify around **Vite SPA + Rust HTTP Server**:
- One shared component library
- One Rust HTTP server (multi-project support)
- One Vite SPA for both web and desktop
- **Result**: 30MB bundle, 10x faster, single codebase

## Sub-Specs

| Spec | Focus | Est. Tokens |
|------|-------|-------------|
| **[185](../185-ui-components-extraction/)** | Extract shared component library | ~1800 |
| **[186](../186-rust-http-server/)** | Build Rust HTTP server + multi-project | ~2000 |
| **[187](../187-vite-spa-migration/)** | Migrate Next.js to Vite SPA | ~1500 |

**Total**: ~5300 tokens (vs 7714 original)

## Design

### Target Architecture

```
packages/ui-components (NEW)
  ↓                  ↓
packages/ui     packages/desktop
(Vite SPA)      (Tauri → Vite SPA)
  ↓                  ↓
HTTP Client     Tauri Commands
  ↓              (Direct Rust calls)
Rust HTTP Server     ↓
(Axum)          leanspec_core
  ↓                  
leanspec_core   
```

**Important distinction**:
- **Web**: Uses HTTP server (browser can't call Rust directly)
- **Desktop**: Uses Tauri commands (direct Rust calls, no HTTP overhead)

### Key Decisions

1. **Eliminate Next.js**: Vite SPA (83% smaller, same DX)
2. **Rust HTTP Server for Web**: Axum + `leanspec_core` (10x faster than TypeScript)
3. **Tauri Commands for Desktop**: Direct Rust calls (no HTTP overhead)
4. **Shared Components**: `packages/ui-components` used by web + desktop
5. **Multi-Project Default**: Both platforms use project registry
6. **Config JSON**: `~/.lean-spec/config.json` (not YAML)

### Configuration

**`~/.lean-spec/config.json`**:
```json
{
  "server": {
    "host": "127.0.0.1",
    "port": 3333,
    "cors": { "enabled": true, "origins": ["http://localhost:5173"] }
  },
  "ui": { "theme": "auto", "locale": "en" },
  "projects": { "autoDiscover": true, "maxRecent": 10 }
}
```

## Plan

### Timeline (4 weeks)

**Week 1**: Foundations (parallel)
- [ ] [Spec 185](../185-ui-components-extraction/): Extract component library
- [ ] [Spec 186](../186-rust-http-server/): Build HTTP server

**Week 2**: New UI
- [ ] [Spec 187](../187-vite-spa-migration/): Vite SPA using components + HTTP API

**Week 3**: Integration
- [ ] Desktop uses HTTP server + shared UI
- [ ] Integration + performance testing

**Week 4**: Launch
- [ ] Archive Next.js UI (`packages/ui` → `packages/ui-legacy-nextjs`)
- [ ] Promote Vite SPA (`packages/ui-new` → `packages/ui`)
- [ ] Release v0.3.0

### Success Criteria

**Must Have**:
- [ ] All Next.js UI features in Vite SPA
- [ ] Desktop uses shared UI
- [ ] Bundle <30MB (vs 150MB+)
- [ ] Page load <2s for 100+ specs
- [ ] Multi-project on both platforms

## Test

**Integration Tests** (cross-spec):
- [ ] Web → HTTP server → filesystem
- [ ] Desktop → HTTP server → filesystem
- [ ] Project switching synchronized
- [ ] Config changes apply everywhere

## Notes

### Why This Matters

1. **Eliminate Duplication**: One codebase, not two
2. **10x Performance**: Rust backend vs TypeScript
3. **Consistency**: Same UX everywhere
4. **Smaller Bundle**: 30MB vs 150MB+
5. **Faster Development**: One implementation

### Why Bold Migration?

AI coding era enables velocity:
- AI excels at mechanical porting
- Desktop migration (spec 169) proved this works
- Avoid temporary bridges (no CLI spawning)
- One migration, one test cycle

### Related Specs

- [169](../169-ui-backend-rust-tauri-migration-evaluation/): Desktop migrated
- [170](../170-cli-mcp-rust-migration/): CLI/MCP in Rust
- [181](../181-typescript-deprecation/): TypeScript deprecation
- **[185](../185-ui-components-extraction/)**: Components (sub-spec)
- **[186](../186-rust-http-server/)**: HTTP server (sub-spec)
- **[187](../187-vite-spa-migration/)**: Vite SPA (sub-spec)

### Open Questions

1. **HTTP Server Distribution**: Separate npm package with platform binaries
2. **Hot Reload**: File watcher with `notify-rs` for project registry
3. **Spec File Changes**: Client polling initially, WebSocket upgrade later
4. **Web Production**: Dev-only (browser security limits)
