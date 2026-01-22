---
status: planned
created: 2026-01-22
priority: high
tags:
- architecture
- backend
- chat
- rust
created_at: 2026-01-22T15:34:19.126101Z
updated_at: 2026-01-22T15:34:19.126101Z
---

# Migrate AI Model Config API from Chat Server to Rust HTTP Server

## Overview

The chat-server (Node.js) currently manages AI model configuration through `/api/chat/config` endpoints. This violates the intended architecture:

- **chat-server**: Lightweight AI SDK wrapper for LLM streaming only
- **http-server (Rust)**: Persistent state management (projects, specs, chat history, configs)

### Current Problem

```typescript
// packages/chat-server/src/index.ts
app.get('/api/chat/config', ...) // Get config
app.put('/api/chat/config', ...) // Update config
```

The chat-server loads and persists config from `~/.leanspec/chat-config.json`, manages providers, models, API keys, etc. This makes it a stateful service when it should be purely computational.

### Why Now?

- Violates separation of concerns
- Chat-server shouldn't manage persistent state
- Rust http-server already manages projects, sessions
- Creates duplicate config management logic
- Blocks future chat-server scaling (stateless replicas)

## Design

### Architecture Alignment

```
┌─────────────────┐
│   UI (Vite)     │
└────────┬────────┘
         │
         │ GET/PUT /api/chat/config
         ↓
┌─────────────────┐
│ Rust HTTP Server│ ← Manages all persistent state
│  (leanspec-http)│
└────────┬────────┘
         │
         │ IPC (stdin/stdout)
         ↓
┌─────────────────┐
│   AI Worker     │ ← Stateless AI SDK wrapper
│ (@leanspec/     │   (See spec 237 for IPC details)
│  ai-worker)     │
└─────────────────┘
```

**Note**: Spec 237 transforms the chat-server from HTTP-based to IPC-based `@leanspec/ai-worker`.

### API Surface (Rust)

Add to `leanspec-http`:

```rust
// GET /api/chat/config
pub async fn get_chat_config(State(state): State<AppState>) -> ApiResult<Json<ChatConfig>>

// PUT /api/chat/config
pub async fn update_chat_config(
    State(state): State<AppState>,
    Json(updates): Json<ChatConfigUpdate>,
) -> ApiResult<Json<ChatConfig>>
```

### Data Model

```rust
#[derive(Serialize, Deserialize, Clone)]
pub struct ChatConfig {
    pub settings: ChatSettings,
    pub providers: Vec<Provider>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ChatSettings {
    pub default_provider_id: String,
    pub default_model_id: String,
    pub max_steps: u32,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Provider {
    pub id: String,
    pub name: String,
    pub api_key: Option<String>, // Store encrypted or env var name
    pub models: Vec<Model>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Model {
    pub id: String,
    pub name: String,
    pub max_tokens: Option<u32>,
}
```

### Storage Location

- Move from `~/.leanspec/chat-config.json` managed by Node.js
- To `~/.leanspec/config/chat.json` managed by Rust
- Use existing Rust config infrastructure

### Chat Server Simplification

Remove from chat-server:
- `ConfigManager` class
- `/api/chat/config` endpoints
- Config file I/O logic

Add to chat-server:
- Accept config as request parameter or fetch on-demand from http-server
- Purely stateless request handler

## Plan

- [ ] **Phase 1: Rust Implementation**
  - [ ] Add `ChatConfig` types to `rust/leanspec-http/src/types.rs`
  - [ ] Implement config persistence in `rust/leanspec-http/src/config.rs`
  - [ ] Add handlers in `rust/leanspec-http/src/handlers/chat_config.rs`
  - [ ] Register routes in `rust/leanspec-http/src/routes.rs`
  - [ ] Add tests for config CRUD operations

- [ ] **Phase 2: Migration Script**
  - [ ] Create migration script to copy `~/.leanspec/chat-config.json` to new location
  - [ ] Handle API key encryption/environment variable references
  - [ ] Automatic migration on first Rust HTTP server startup

- [ ] **Phase 3: Chat Server Refactor**
  - [ ] Remove `ConfigManager` from chat-server
  - [ ] Remove `/api/chat/config` endpoints
  - [ ] Make chat-server fetch config from http-server on each request
  - [ ] Or accept config in request body from UI

- [ ] **Phase 4: UI Updates**
  - [ ] No changes needed (endpoints stay at `/api/chat/config`)
  - [ ] Verify settings page still works
  - [ ] Verify model picker still works

- [ ] **Phase 5: Testing**
  - [ ] E2E test: Update config via UI
  - [ ] E2E test: Chat uses updated config
  - [ ] Test migration from old config file
  - [ ] Test fresh install scenario

- [ ] **Phase 6: Cleanup**
  - [ ] Remove old TypeScript config code
  - [ ] Update documentation
  - [ ] Deprecation notice for old config location

## Test

- [ ] Can update default provider/model via UI
- [ ] Can add/edit/remove custom models
- [ ] Can configure API keys securely
- [ ] Chat server uses config from Rust backend
- [ ] Config persists across restarts
- [ ] Migration from old config works
- [ ] Multiple projects can have different configs (if needed)
- [ ] Read-only mode blocks config updates

## Notes

### API Key Security

Consider three approaches:
1. **Environment Variables**: Store `OPENAI_API_KEY` reference, resolve at runtime
2. **Encrypted Storage**: Encrypt keys in JSON, decrypt in memory
3. **System Keychain**: Use OS keychain APIs (macOS Keychain, Windows Credential Manager)

Recommendation: Start with environment variables, add encrypted storage in follow-up.

### Backward Compatibility

Old chat-server can still run independently with its own config for backward compatibility during migration period. Add deprecation warning in chat-server logs.

### Multi-Project Config

Future consideration: Should each project have its own chat config? Current design is global user config. Could extend later with project-specific overrides.

### AI Worker Communication

With the IPC-based `@leanspec/ai-worker` (spec 237), config is managed by Rust and passed via IPC:
- Rust loads config from `~/.leanspec/config/chat.json`
- Config included in IPC request payload to worker
- Worker is stateless, receives everything it needs per request
- Config changes trigger worker reload (no restart needed)

This eliminates the need for the worker to manage its own config file.

### Related Specs

- **Spec 237**: Rust IPC AI Chat Bridge - Transforms chat-server into IPC worker (depends on this spec's config migration)
- **Spec 218**: Unified HTTP Server - Parent architecture context
- **Spec 184**: Unified UI Architecture - Overall system architecture
