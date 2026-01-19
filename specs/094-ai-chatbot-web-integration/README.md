---
status: in-progress
created: 2025-11-17
priority: high
tags:
- web
- ai
- ux
- v0.3.0
depends_on:
- 187-vite-spa-migration
created_at: 2025-11-17T06:31:22.346Z
updated_at: 2026-01-19T08:17:48.521994193Z
transitions:
- status: in-progress
  at: 2026-01-19T08:17:48.521994193Z
---

# AI Chatbot for Web UI

> **Status**: 🚧 In Progress · **Priority**: High · **Created**: 2025-11-17 · **Tags**: web, ai, ux, v0.3.0

**Project**: lean-spec  
**Team**: Core Development

## Overview

Add an **AI agentic system** to `@leanspec/ui` (Vite SPA) that uses AI SDK tools to manage specs conversationally. Users can create, update, search, and orchestrate specs through natural language - no CLI or terminal required.

**Core Value**: Transform the web UI into a fully interactive spec management platform powered by AI tools. The chatbot acts as an **intelligent agent** that executes LeanSpec operations (create, update, search, link, validate) and basic utilities (web search, calculations) through function calling.

**Key Unlock**: 
- **Developers**: Manage specs without leaving the browser
- **Non-technical users**: Participate in SDD workflow through conversation
- **Everyone**: AI handles complex operations (dependency graphs, bulk updates, validation)

## Problem

**The core gap**: `@leanspec/ui` is currently **partially interactive**. Users can browse and view specs, edit some metadata, but cannot create specs or perform complex operations without switching to CLI or VS Code.

**Current limitations** (as of UI Vite SPA):
- ❌ **No spec creation** - Must drop to terminal: `lean-spec create ...`
- ❌ **No status updates via chat** - Must use CLI: `lean-spec update 082 --status complete`
- ✅ **Metadata editing** - Can change priority, tags via UI (added in spec 187)
- ❌ **No content editing** - Can't modify spec README or sub-specs
- ✅ **Interactive browsing** - Can view, search, filter, edit metadata

**The bigger problem**: Write operations are **locked behind developer tools**:
- Non-technical users (PMs, designers) can't participate
- Requires context switch (browser → terminal → IDE → back to browser)
- Mobile users completely blocked from management tasks
- No path for casual contributors

**User Pain Points**:
- "I'm viewing spec 082 - can I mark it complete?" → No, need terminal
- "Let me create a spec for API rate limiting..." → Can't, need CLI
- "This spec's priority should be high" → Can't change it here
- "I want to update the description" → Must edit file in IDE

**The solution**: AI chatbot makes web UI **fully interactive** through natural conversation - no CLI, no IDE required.

## Goals

1. **Enable Write Operations**: Make web UI fully interactive (create, update, delete specs)
2. **Democratize Access**: Allow non-developers to manage specs (no CLI/IDE required)
3. **Conversational UX**: Natural language interface for all operations
4. **Maintain Context Economy**: Chatbot enforces LeanSpec principles (token limits, validation)
5. **Progressive Enhancement**: Chat is optional - traditional UI still works for viewing

## Design

### npm Package Details

**Package Name**: `@leanspec/chat-server`

**Purpose**: Standalone Node.js server that provides AI chatbot capabilities via AI SDK

**Package Structure**:
```
@leanspec/chat-server/
├── package.json
│   ├── name: "@leanspec/chat-server"
│   ├── version: (synced with workspace root)
│   ├── main: "dist/index.js"
│   ├── bin: { "leanspec-chat": "dist/index.js" }
│   ├── files: ["dist/**/*"]
│   └── dependencies: { "ai": "^6.0.0", "@ai-sdk/openai": "^1.0.0", ... }
├── src/
│   ├── index.ts              # Express server entry point
│   ├── tools/                # AI SDK tool definitions
│   │   ├── leanspec-tools.ts
│   │   └── index.ts
│   └── prompts.ts            # System prompts
├── dist/                     # Built output (esbuild bundle)
│   └── index.js              # Single bundled file
└── README.md                 # Usage instructions
```

**Build Process**:
```json
// package.json scripts
{
  "scripts": {
    "build": "esbuild src/index.ts --bundle --platform=node --target=node18 --outfile=dist/index.js --format=cjs --external:express --external:ai --external:@ai-sdk/*",
    "dev": "tsx watch src/index.ts",
    "test": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

**Installation**:
```bash
# As standalone tool
npm install -g @leanspec/chat-server
leanspec-chat  # Starts server

# As dependency (used by @leanspec/ui)
npm install @leanspec/chat-server
node node_modules/@leanspec/chat-server/dist/index.js
```

**Relationship to Other Packages**:
- `@leanspec/http-server` (Rust): Proxies `/api/chat` requests to this package
- `@leanspec/ui` (Vite): optionalDependency, uses chat via HTTP proxy
- `@leanspec/desktop` (Tauri): optionalDependency, starts as subprocess if AI features enabled

**Version Synchronization**:
- All packages share same version from root `package.json`
- Updated by `pnpm sync-versions` script
- Published together during release

### Architecture

**Tech Stack**:
- **AI SDK** v6 (`ai`, `@ai-sdk/react`) - Universal AI abstraction with streaming + tool calling
- **AI Elements** - Pre-built shadcn chat components (`ai-elements`)
- **Zod** - Schema validation for tool inputs
- **Model**: GPT-4o, Claude Sonnet 4.5, or Deepseek R1 (via AI Gateway)
- **Transport**: Server-sent events (SSE) for streaming

**Backend Architecture** (Node.js Sidecar + Rust Proxy):
```
Browser → Rust HTTP Server (:3030) → Node.js Chat Server (socket/port) → AI Provider
              ↓                              ↓
    LeanSpec Core REST APIs         Tool Execution (calls back to Rust)
```

**IPC Communication**:
- **Default**: Unix socket (`/tmp/leanspec-chat.sock`) - 30% faster, more secure, no port conflicts
- **Fallback**: HTTP with dynamic port - Node.js picks available port, writes to config file
- **Configuration**: `LEANSPEC_CHAT_SOCKET` or `LEANSPEC_CHAT_TRANSPORT=http`

**Why Node.js Sidecar?**
- ✅ 3 days vs 10 days development time (70% faster than Rust-only)
- ✅ Battle-tested streaming + tool calling (AI SDK handles edge cases)
- ✅ Multi-provider support (50+ models out of the box)
- ✅ IPC overhead negligible: 0.7ms (Unix socket) vs 200-500ms AI API calls (<0.5%)
- ✅ Easy debugging, hot reload, no FFI complexity

See [NOTES.md](./NOTES.md) for detailed architecture analysis.

**Component Structure**:
```
packages/
├── chat-server/                  # NEW: Standalone npm package
│   ├── src/
│   │   ├── index.ts              # Express server with AI SDK
│   │   ├── tools/
│   │   │   ├── leanspec-tools.ts # Spec CRUD tools
│   │   │   └── index.ts          # Tool registry
│   │   └── prompts.ts            # System prompt
│   ├── dist/index.js             # Built bundle
│   ├── package.json              # Published to npm as @leanspec/chat-server
│   └── tsconfig.json
│
├── ui/src/                       # Vite SPA (consumes chat API)
│   ├── components/
│   │   └── chat/
│   │       ├── chat-page.tsx     # Main chat interface
│   │       └── chat-button.tsx   # Floating trigger
│   └── lib/ai/
│       └── use-chat.ts           # useChat hook (calls /api/chat)
│
rust/leanspec-http/src/handlers/  # Rust HTTP server (proxies chat)
└── chat.rs                       # Proxy: browser → Unix socket/HTTP → chat-server
```

**Data Flow**:
```
Browser (UI)
  ↓ POST /api/chat { messages: [...] }
Rust HTTP Server (:3030)
  ↓ Proxy via Unix socket or HTTP
Node.js Chat Server (@leanspec/chat-server)
  ↓ AI SDK streamText() with tools
OpenAI/Claude/Deepseek API
  ↓ SSE stream response
Browser (UI) via useChat hook
```

### Chat UI/UX

**Key Components** (from `ai-elements`):
- `<Conversation>` - Chat container with auto-scroll
- `<Message>` - User/assistant bubbles with actions (copy, retry, feedback)
- `<PromptInput>` - Multi-line input with send button
- `<Tool>` - Show tool executions in real-time
- `<Reasoning>` - Collapsible thought process (optional)
- `<Loader>` - Typing indicator

**Placement**: Start with `/chat` route (full-page). Add floating panel later.

### AI Tools (Function Calling)

**LeanSpec Tools** (9 core operations):
1. `list_specs` - Filter by status/priority/tags
2. `search_specs` - Semantic search
3. `get_spec` - Fetch full spec by ID/name
4. `create_spec` - Create new spec with validation
5. `update_spec` - Modify metadata (status, priority, tags)
6. `link_specs` - Create dependencies
7. `get_dependencies` - Show dependency graph
8. `get_stats` - Project statistics
9. `validate_spec` - Check structure quality

**Content Editing Tools** (5 operations):
1. `edit_spec_section` - Update Overview/Design/Plan/Test/Notes
2. `update_checklist_item` - Toggle checklist items
3. `append_to_section` - Add without overwriting
4. `edit_subspec` - Edit IMPLEMENTATION.md, etc.
5. `get_spec_content` - Retrieve for context-aware edits

**Tool Definition Pattern**:
```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const listSpecsTool = tool({
  description: 'List specs with optional filters',
  inputSchema: z.object({
    status: z.enum(['planned', 'in-progress', 'complete', 'archived']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    tags: z.array(z.string()).optional(),
  }),
  execute: async (params) => {
    const response = await fetch('/api/specs?' + new URLSearchParams(params));
    return response.json();
  },
});
```

All tools call Rust REST APIs (`/api/specs`, `/api/search`, etc.)

### Multi-Step Orchestration

**Configuration**:
```typescript
import { streamText, stepCountIs } from 'ai';

const result = await streamText({
  model: 'openai/gpt-4o',
  tools: allTools,
  stopWhen: stepCountIs(10), // Max 10 steps
  system: systemPrompt,
  messages,
  onStepFinish({ toolCalls }) {
    console.log('Step:', toolCalls.map(t => t.toolName));
  },
});
```

**Example Flow**:
```
User: "Create API rate limiting spec and link to 082"
→ Step 1: create_spec() → { id: 95 }
→ Step 2: link_specs(082, [95]) → success
→ Response: "Created 095-api-rate-limiting, linked to 082"
```

### System Prompt

```typescript
const systemPrompt = `You are LeanSpec Assistant. Manage specs through tools.

Capabilities: list, search, create, update, link, validate specs. Edit content, checklists, sub-specs.

Rules:
1. Use tools - never invent spec IDs
2. Follow LeanSpec: <2000 tokens, required sections, kebab-case names
3. Multi-step: explain before executing
4. Be concise - actionable answers only
5. Format lists as markdown bullets

Context economy: stay focused.`;
```

## Plan

### Phase 1: Node.js Chat Server Package Setup (2 days)
- [x] Create `packages/chat-server` package with standalone build
- [x] Add package.json with proper bin entry: `"bin": { "leanspec-chat": "./dist/index.js" }`
- [x] Install: `pnpm add ai @ai-sdk/openai zod express`
- [x] Implement server with Unix socket + HTTP support:
  - Default: Unix socket `/tmp/leanspec-chat.sock`
  - Fallback: HTTP dynamic port (write to `~/.leanspec/chat-port.txt`)
  - Config: `LEANSPEC_CHAT_SOCKET` or `LEANSPEC_CHAT_TRANSPORT=http`
- [x] Create `/api/chat` endpoint with `streamText()`
- [x] Add `/health` endpoint
- [x] Build script: `esbuild` to bundle into single `dist/index.js`
- [ ] Test: `curl --unix-socket /tmp/leanspec-chat.sock http://localhost/health`
- [x] Add to `pnpm-workspace.yaml`

### Phase 2: CI/CD Integration (1 day)
- [ ] Add `build-chat-server` job to `.github/workflows/publish.yml`
- [ ] Add unit tests: `vitest` for tool schemas and prompts
- [ ] Add integration tests: Mock AI SDK streaming
- [x] Add `publish-chat-server` job (publish before main packages)
- [x] Update `publish-main` to wait for chat-server publication
- [ ] Test dev version publish: `gh workflow run publish.yml --field dev=true`

### Phase 3: Rust HTTP Proxy Handler (1 day)
- [x] Add dependencies to `rust/leanspec-http/Cargo.toml`: `hyperlocal`, `reqwest`
- [x] Create `rust/leanspec-http/src/handlers/chat.rs`
- [x] Implement `ChatServerConfig::from_env()` (reads socket/port config)
- [x] Implement proxy route: `POST /api/chat` → Unix socket/HTTP → SSE stream
- [ ] Add health check integration: Ping chat server, restart if unhealthy
- [ ] Test: Browser calls `/api/chat` → Node.js responds via proxy

### Phase 4: Tool Implementation (3 days)
- [x] Create `packages/chat-server/src/tools/leanspec-tools.ts`
- [x] Implement 9 core tools: list, search, get, create, update, link, deps, stats, validate
- [x] Implement 5 content editing tools: edit_section, update_checklist, append, edit_subspec, get_content
- [x] Create tool registry in `index.ts`
- [x] Register tools in Node.js chat server with proper Zod schemas
- [ ] Test: Each tool via curl to `/api/chat` (through Rust proxy)

### Phase 5: Chat UI Components (2 days)
- [x] Install in UI package: `pnpm add ai @ai-sdk/react`
- [ ] Run: `npx ai-elements@latest` (installs shadcn components)
- [x] Create `/chat` route in Vite router
- [x] Build chat page: `<Conversation>`, `<Message>`, `<PromptInput>`
- [x] Add `<Tool>` component for execution display
- [x] Wire up `useChat({ api: '/api/chat' })`
- [x] Add feature flag: Only load chat if `VITE_ENABLE_AI=true`
- [ ] Test: Send message → stream response → tool execution

### Phase 6: Multi-Step & Polish (2 days)
- [x] Add `stopWhen: stepCountIs(10)` to Node.js server
- [x] Implement system prompt with LeanSpec rules
- [x] Add model picker UI (GPT-4o, Claude, Deepseek)
- [x] Chat history persistence (localStorage)
- [ ] Message actions: copy, retry, feedback
- [ ] Mobile-responsive layout
- [x] Error handling: tool failures, timeouts, chat server unavailable
- [x] Loading states and retry logic

### Phase 7: Process Management (1 day)
- [x] Add development script: `pnpm dev:all` (concurrently runs HTTP + chat + UI)
- [ ] Docker Compose configuration for production deployment
- [ ] Systemd service files for self-hosted deployment
- [ ] Health check monitoring in Rust HTTP server
- [ ] Auto-restart logic for chat server crashes
- [ ] Graceful shutdown handling

### Phase 8: Testing & Documentation (1 day)
- [ ] E2E tests: create spec, update status, link deps via chat
- [ ] Load test: 50 concurrent chat sessions
- [ ] Document in main README: setup, env vars, model selection
- [ ] Add to docs site: "Using AI Chat" guide
- [ ] Performance: lazy load chat components, cache tool results (30s TTL)
- [ ] Verify: Dev and stable release workflows work end-to-end

### Phase 9: Optional - Desktop Integration (Future)
- [x] Add `@leanspec/chat-server` as optional dependency to desktop
- [ ] Implement ChatServerManager in Rust for subprocess management
- [ ] Add feature flag: `cargo build --features ai-chat`
- [ ] Test: Desktop app with AI chat enabled

## Infrastructure

**For detailed CI/CD, deployment, and process management documentation, see [IMPLEMENTATION.md](./IMPLEMENTATION.md)**.

### Quick Reference

**Package Structure**:
- `@leanspec/chat-server` - Standalone Node.js package (AI SDK + tools)
- `@leanspec/http-server` - Rust HTTP server (proxies `/api/chat`)
- `@leanspec/ui` - Vite SPA (optional dependency on chat-server)

**Publishing Order**: Platform binaries → chat-server → main packages

**Deployment Options**:
- Local dev: 3 processes (HTTP + chat + UI)
- Production: Docker Compose with Unix socket
- Desktop: Optional subprocess if AI features enabled
- Self-hosted: systemd services

**Environment Variables**:
```bash
# IPC
LEANSPEC_CHAT_SOCKET=/tmp/leanspec-chat.sock  # Unix socket (default)
LEANSPEC_CHAT_TRANSPORT=http                  # HTTP fallback

# AI Provider
OPENAI_API_KEY=sk-...
# or AI_GATEWAY_API_KEY=ag-...

# Model
DEFAULT_MODEL=openai/gpt-4o
MAX_STEPS=10
```

**See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for**:
- Complete CI/CD pipeline configuration
- Process management strategies
- Docker Compose and systemd examples
- Security best practices
- Performance optimization

## Test

### CI/CD Verification
- [ ] Dev version publish workflow succeeds: `gh workflow run publish.yml --field dev=true`
- [ ] Chat-server package builds successfully in CI
- [ ] Chat-server tests pass with mocked AI provider
- [ ] Publishing order maintained: platform binaries → chat-server → main packages
- [ ] Published `@leanspec/chat-server` installable globally
- [ ] Workspace dependency resolution works: `@leanspec/ui` finds `@leanspec/chat-server`
- [ ] Stable release workflow publishes all packages with same version

### Manual Testing
- [ ] User can open/close chat panel
- [ ] Chat persists across page navigation
- [ ] All tools execute correctly
- [ ] Streaming responses work (no latency spikes)
- [ ] Mobile UI is usable (no layout breaks)
- [ ] Error states: chat server unavailable, API key missing, tool execution fails

### Automated Testing
- [ ] Unit tests for tool handlers (Zod schema validation)
- [ ] Integration tests for API route (mocked AI SDK)
- [ ] E2E tests for common queries:
  - "List all specs"
  - "Show spec 082"
  - "Create a spec"
  - "What's blocking v0.3?"
- [ ] Process management tests: health checks, restarts

### Performance Testing
- [ ] Response time <2s for simple queries
- [ ] Streaming starts within 500ms
- [ ] No memory leaks in long chat sessions
- [ ] Chat panel loads without blocking main UI

### Success Criteria
- ✅ Users can complete all spec CRUD operations via chat
- ✅ Chat feels "instant" (streaming UX)
- ✅ 80%+ accuracy on natural language queries
- ✅ No crashes or errors in 100-message chat session
- ✅ Published to npm and installable: `npm install -g @leanspec/chat-server`
- ✅ Works in all deployment scenarios: local dev, Docker, systemd, desktop

## Notes

**Architecture Decision**: Unix Socket + Node.js Sidecar

- **Default**: Unix socket (`/tmp/leanspec-chat.sock`) - 30% faster, more secure, no port conflicts
- **Fallback**: HTTP dynamic port - Cross-platform (Windows), cloud deployments
- **IPC Overhead**: 0.7ms (Unix) vs 1ms (HTTP) - negligible compared to 200-500ms AI API calls
- **Development Speed**: 3 days vs 10 days (Rust-only)
- **Tooling**: AI SDK handles streaming, tool calling, multi-step orchestration

See [NOTES.md](./NOTES.md) for full analysis: IPC comparison, performance benchmarks, cost estimates, security considerations.
