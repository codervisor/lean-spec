---
status: complete
created: 2026-01-22
priority: high
tags:
- architecture
- rust
- chat
- ai
- ipc
- simplification
created_at: 2026-01-22T15:44:19.503823Z
updated_at: 2026-01-28T01:40:18.557073Z
completed_at: 2026-01-28T01:40:18.557073Z
transitions:
- status: in-progress
  at: 2026-01-22T15:51:48.408669Z
- status: complete
  at: 2026-01-28T01:40:18.557073Z
---

# Rust HTTP Server with IPC-Based AI Chat Bridge

## Overview

**Problem**: Currently, AI chat functionality requires running two servers:
1. **Rust HTTP Server** (`leanspec-http`) - Main API and UI server
2. **Node.js Chat Server** - Separate process for AI streaming via Vercel AI SDK

This architecture has several issues:
- Two processes to manage and coordinate
- Extra complexity in process lifecycle management
- Chat server requires its own port/socket management
- Increased failure points (either can fail independently)
- More complex deployment (need both Node.js and Rust)
- Resource overhead (two runtime processes)

**Solution**: Transform the chat server from a standalone HTTP/socket server into an IPC-based worker process that the Rust server spawns and communicates with via stdin/stdout/stderr.

```
┌─────────────────────────────────────────────────────────┐
│                  Rust HTTP Server                       │
│                 (Single Process)                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐    IPC (stdin/stdout)   ┌──────────┐ │
│  │   POST      │ ──────────────────────→  │  Node.js │ │
│  │ /api/chat   │                          │  Worker  │ │
│  │   Handler   │ ←──────────────────────  │ (ai-sdk) │ │
│  └─────────────┘   JSON + Streaming      └──────────┘ │
│                                                         │
│  Rust manages:                    Worker provides:     │
│  - HTTP endpoints                 - AI SDK access      │
│  - Process lifecycle              - Provider setup     │
│  - Config management              - Model streaming    │
│  - Chat persistence               - Tool execution     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Benefits**:
- Single server process (Rust manages everything)
- No separate port/socket needed for chat
- Simplified deployment (Node.js is a child process)
- Better resource management (spawn on-demand, kill when idle)
- Cleaner separation of concerns:
  - **Rust**: HTTP, persistence, config, process management
  - **Node.js**: AI SDK wrapper (pure computation)
- Easier testing and debugging (clear IPC protocol)
- Consistent with desktop app pattern (similar to Tauri)

### Why IPC vs HTTP?

**IPC Advantages**:
- ✅ No port conflicts or discovery needed
- ✅ Process isolation (can restart worker without affecting main server)
- ✅ Simple protocol (JSON lines over stdio)
- ✅ Built-in backpressure (stdio buffering)
- ✅ Easy debugging (can log all IPC messages)
- ✅ No network overhead
- ✅ Automatic cleanup (child process dies with parent)

**HTTP Disadvantages**:
- ❌ Port management complexity
- ❌ Network overhead even for localhost
- ❌ More complex error handling
- ❌ Process coordination issues
- ❌ CORS/authentication concerns

## Design

### Architecture Changes

**Current Flow** (Two Servers):
```
Browser → Rust HTTP (:3000) → Node.js Chat (:socket/http) → AI Provider API
         ↑ CORS/proxy
```

**New Flow** (Rust + IPC Worker):
```
Browser → Rust HTTP (:3000) → Node.js Worker (IPC) → AI Provider API
                              ↑ spawn/manage
```

### IPC Protocol

**Transport**: JSON Lines over stdin/stdout
- **Request**: JSON object + newline → worker stdin
- **Response**: JSON object + newline ← worker stdout
- **Errors**: Plain text → worker stderr (logged by Rust)

**Request Format**:
```json
{
  "id": "req_123",
  "type": "chat",
  "payload": {
    "messages": [...],
    "projectId": "abc",
    "providerId": "openai",
    "modelId": "gpt-4o",
    "sessionId": "session_xyz",
    "config": { 
      "apiKey": "...",
      "maxSteps": 10
    }
  }
}
```

**Response Format** (Streaming):
```json
{"id": "req_123", "type": "chunk", "data": {"text": "Hello"}}
{"id": "req_123", "type": "chunk", "data": {"text": " world"}}
{"id": "req_123", "type": "tool_call", "data": {"name": "search", "args": {...}}}
{"id": "req_123", "type": "tool_result", "data": {"result": "..."}}
{"id": "req_123", "type": "done"}
{"id": "req_123", "type": "error", "error": "API key invalid"}
```

**Health Check**:
```json
// Request
{"id": "health_1", "type": "health"}

// Response
{"id": "health_1", "type": "health_ok", "data": {"ready": true, "providers": ["openai", "anthropic"]}}
```

**Config Update**:
```json
// Request
{"id": "cfg_1", "type": "reload_config", "payload": {...}}

// Response  
{"id": "cfg_1", "type": "config_reloaded"}
```

### Rust Implementation

**1. Worker Process Manager**

```rust
// rust/leanspec-http/src/ai/worker.rs

use tokio::process::{Child, Command};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::sync::{mpsc, oneshot};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum WorkerRequest {
    Chat {
        id: String,
        payload: ChatRequest,
    },
    Health {
        id: String,
    },
    ReloadConfig {
        id: String,
        payload: serde_json::Value,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum WorkerResponse {
    Chunk { id: String, data: serde_json::Value },
    ToolCall { id: String, data: serde_json::Value },
    ToolResult { id: String, data: serde_json::Value },
    Done { id: String },
    Error { id: String, error: String },
    HealthOk { id: String, data: serde_json::Value },
    ConfigReloaded { id: String },
}

pub struct AiWorker {
    process: Child,
    stdin: tokio::process::ChildStdin,
    pending_requests: HashMap<String, oneshot::Sender<Vec<WorkerResponse>>>,
}

impl AiWorker {
    pub async fn spawn() -> Result<Self> {
        // Verify Node.js is available (see "Node.js Environment Requirements" section)
        Self::verify_nodejs()?;
        
        // Find the worker script
        let worker_path = Self::find_worker_path()?;
        
        let mut process = Command::new("node")
            .arg(&worker_path)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .env("LEANSPEC_IPC_MODE", "true")
            .spawn()?;

        let stdin = process.stdin.take()
            .ok_or_else(|| anyhow::anyhow!("Failed to capture stdin"))?;
        let stdout = process.stdout.take()
            .ok_or_else(|| anyhow::anyhow!("Failed to capture stdout"))?;
        let stderr = process.stderr.take()
            .ok_or_else(|| anyhow::anyhow!("Failed to capture stderr"))?;

        // Spawn stderr logger
        tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                tracing::warn!("[ai-worker stderr] {}", line);
            }
        });

        let mut worker = Self {
            process,
            stdin,
            pending_requests: HashMap::new(),
        };

        // Start stdout reader task
        worker.start_response_handler(stdout);
        
        // Health check
        worker.health_check().await?;

        Ok(worker)
    }

    fn find_worker_path() -> Result<PathBuf> {
        // Priority 1: Environment variable
        if let Ok(path) = std::env::var("LEANSPEC_AI_WORKER") {
            return Ok(PathBuf::from(path));
        }

        // Priority 2: Development mode - relative path
        #[cfg(debug_assertions)]
        {
            let dev_path = PathBuf::from("../../packages/chat-server/dist/worker.js");
            if dev_path.exists() {
                return Ok(dev_path);
            }
        }

        // Priority 3: Production - look in node_modules
        let exe_dir = std::env::current_exe()?
            .parent()
            .ok_or_else(|| anyhow::anyhow!("No parent dir"))?
            .to_path_buf();

        // Look for @leanspec/ai-worker package
        let worker_path = exe_dir
            .parent()
            .and_then(|p| p.parent())
            .map(|p| p.join("@leanspec/ai-worker/dist/worker.js"));

        if let Some(path) = worker_path {
            if path.exists() {
                return Ok(path);
            }
        }

        Err(anyhow::anyhow!("AI worker script not found"))
    }

    fn start_response_handler(&mut self, stdout: tokio::process::ChildStdout) {
        let pending = Arc::new(Mutex::new(self.pending_requests.clone()));
        
        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            
            while let Ok(Some(line)) = lines.next_line().await {
                match serde_json::from_str::<WorkerResponse>(&line) {
                    Ok(response) => {
                        let request_id = Self::extract_request_id(&response);
                        
                        let mut pending = pending.lock().await;
                        if let Some(sender) = pending.get_mut(&request_id) {
                            // Collect responses until done/error
                            match response {
                                WorkerResponse::Done { .. } | WorkerResponse::Error { .. } => {
                                    if let Some(sender) = pending.remove(&request_id) {
                                        let _ = sender.send(vec![response]);
                                    }
                                }
                                _ => {
                                    // Send chunk immediately for streaming
                                    // (Implementation detail: use channels for streaming)
                                }
                            }
                        }
                    }
                    Err(e) => {
                        tracing::error!("Failed to parse worker response: {} - Line: {}", e, line);
                    }
                }
            }
        });
    }

    pub async fn send_chat_request(&mut self, req: ChatRequest) -> Result<ChatResponseStream> {
        let id = uuid::Uuid::new_v4().to_string();
        
        let request = WorkerRequest::Chat {
            id: id.clone(),
            payload: req,
        };

        let json = serde_json::to_string(&request)?;
        self.stdin.write_all(json.as_bytes()).await?;
        self.stdin.write_all(b"\n").await?;
        self.stdin.flush().await?;

        // Create channel for streaming response
        let (tx, rx) = mpsc::channel(100);
        self.pending_requests.insert(id, tx);

        Ok(ChatResponseStream { receiver: rx })
    }

    pub async fn health_check(&mut self) -> Result<()> {
        let id = uuid::Uuid::new_v4().to_string();
        
        let request = WorkerRequest::Health { id: id.clone() };
        let json = serde_json::to_string(&request)?;
        
        self.stdin.write_all(json.as_bytes()).await?;
        self.stdin.write_all(b"\n").await?;
        self.stdin.flush().await?;

        // Wait for health response with timeout
        tokio::time::timeout(
            Duration::from_secs(5),
            self.wait_for_response(&id)
        ).await??;

        Ok(())
    }

    pub async fn reload_config(&mut self, config: serde_json::Value) -> Result<()> {
        let id = uuid::Uuid::new_v4().to_string();
        
        let request = WorkerRequest::ReloadConfig {
            id: id.clone(),
            payload: config,
        };
        
        let json = serde_json::to_string(&request)?;
        self.stdin.write_all(json.as_bytes()).await?;
        self.stdin.write_all(b"\n").await?;
        self.stdin.flush().await?;

        Ok(())
    }

    pub async fn shutdown(&mut self) -> Result<()> {
        self.process.kill().await?;
        Ok(())
    }
}
```

**2. HTTP Handler Integration**

```rust
// rust/leanspec-http/src/handlers/chat.rs

use axum::{
    extract::State,
    response::sse::{Event, Sse},
    Json,
};
use futures::stream::Stream;

pub async fn chat_stream(
    State(state): State<AppState>,
    Json(req): Json<ChatRequest>,
) -> Result<Sse<impl Stream<Item = Result<Event>>>> {
    // Get or spawn AI worker
    let mut worker = state.ai_worker.lock().await;
    
    // Send request to worker via IPC
    let response_stream = worker.send_chat_request(req).await?;
    
    // Convert IPC stream to SSE stream
    let sse_stream = response_stream.map(|response| {
        match response {
            WorkerResponse::Chunk { data, .. } => {
                Event::default().json_data(data)
            }
            WorkerResponse::ToolCall { data, .. } => {
                Event::default().event("tool_call").json_data(data)
            }
            WorkerResponse::ToolResult { data, .. } => {
                Event::default().event("tool_result").json_data(data)
            }
            WorkerResponse::Done { .. } => {
                Event::default().event("done").data("[DONE]")
            }
            WorkerResponse::Error { error, .. } => {
                Event::default().event("error").data(error)
            }
            _ => Event::default().data(""),
        }
    });
    
    Ok(Sse::new(sse_stream))
}

pub async fn chat_config(
    State(state): State<AppState>,
) -> Result<Json<ChatConfig>> {
    // Config now managed by Rust (see spec 236)
    let config = state.config_manager.get_chat_config().await?;
    Ok(Json(config))
}

pub async fn update_chat_config(
    State(state): State<AppState>,
    Json(updates): Json<ChatConfigUpdate>,
) -> Result<Json<ChatConfig>> {
    // Update config in Rust
    let config = state.config_manager.update_chat_config(updates).await?;
    
    // Notify worker to reload config
    let mut worker = state.ai_worker.lock().await;
    worker.reload_config(serde_json::to_value(&config)?).await?;
    
    Ok(Json(config))
}
```

**3. Worker Lifecycle Management**

```rust
// rust/leanspec-http/src/ai/manager.rs

pub struct AiWorkerManager {
    worker: Option<AiWorker>,
    config: ChatConfig,
}

impl AiWorkerManager {
    pub async fn get_or_spawn(&mut self) -> Result<&mut AiWorker> {
        if self.worker.is_none() {
            tracing::info!("Spawning AI worker process...");
            self.worker = Some(AiWorker::spawn().await?);
        }
        
        Ok(self.worker.as_mut().unwrap())
    }

    pub async fn restart(&mut self) -> Result<()> {
        if let Some(worker) = self.worker.take() {
            let _ = worker.shutdown().await;
        }
        
        self.worker = Some(AiWorker::spawn().await?);
        Ok(())
    }

    pub async fn health_check(&mut self) -> Result<bool> {
        match self.worker.as_mut() {
            Some(worker) => worker.health_check().await.is_ok(),
            None => Ok(false),
        }
    }
}
```

### Node.js Worker Implementation

**1. Worker Entry Point**

```typescript
// packages/ai-worker/src/worker.ts

import { createInterface } from 'readline';
import { streamText } from 'ai';
import { ProviderFactory } from './provider-factory';
import { createLeanSpecTools } from './tools';
import { systemPrompt } from './prompts';

interface WorkerRequest {
  id: string;
  type: 'chat' | 'health' | 'reload_config';
  payload?: any;
}

interface WorkerResponse {
  id: string;
  type: 'chunk' | 'tool_call' | 'tool_result' | 'done' | 'error' | 'health_ok' | 'config_reloaded';
  data?: any;
  error?: string;
}

class AiWorker {
  private providerFactory: ProviderFactory;
  private config: any;

  constructor() {
    // Initialize with empty config
    this.config = {};
    this.providerFactory = new ProviderFactory({});
  }

  async start() {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    rl.on('line', async (line) => {
      try {
        const request: WorkerRequest = JSON.parse(line);
        await this.handleRequest(request);
      } catch (error) {
        console.error('[worker] Failed to parse request:', error);
      }
    });

    // Ready signal
    this.send({ id: 'init', type: 'health_ok', data: { ready: true } });
  }

  private async handleRequest(request: WorkerRequest) {
    try {
      switch (request.type) {
        case 'chat':
          await this.handleChat(request);
          break;
        case 'health':
          this.send({ id: request.id, type: 'health_ok', data: { ready: true } });
          break;
        case 'reload_config':
          this.config = request.payload;
          this.providerFactory = new ProviderFactory(this.config);
          this.send({ id: request.id, type: 'config_reloaded' });
          break;
        default:
          throw new Error(`Unknown request type: ${request.type}`);
      }
    } catch (error) {
      this.send({
        id: request.id,
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleChat(request: WorkerRequest) {
    const { messages, projectId, providerId, modelId, sessionId, config } = request.payload;

    // Use config from request (managed by Rust)
    const provider = this.providerFactory.getProvider(providerId, config);
    const model = provider(modelId);

    const tools = createLeanSpecTools({
      baseUrl: config.leanspecHttpUrl || 'http://127.0.0.1:3000',
      projectId,
    });

    const result = streamText({
      model,
      messages: [
        { role: 'system', content: systemPrompt(projectId) },
        ...messages,
      ],
      tools,
      maxSteps: config.maxSteps || 10,
      experimental_continueSteps: true,
      onStepFinish: (step) => {
        // Send tool calls and results as they happen
        for (const toolCall of step.toolCalls) {
          this.send({
            id: request.id,
            type: 'tool_call',
            data: {
              name: toolCall.toolName,
              args: toolCall.args,
              callId: toolCall.toolCallId,
            },
          });
        }

        for (const toolResult of step.toolResults) {
          this.send({
            id: request.id,
            type: 'tool_result',
            data: {
              callId: toolResult.toolCallId,
              result: toolResult.result,
            },
          });
        }
      },
    });

    // Stream text chunks
    for await (const chunk of result.textStream) {
      this.send({
        id: request.id,
        type: 'chunk',
        data: { text: chunk },
      });
    }

    // Done
    this.send({ id: request.id, type: 'done' });
  }

  private send(response: WorkerResponse) {
    console.log(JSON.stringify(response));
  }
}

// Start worker
const worker = new AiWorker();
worker.start().catch((error) => {
  console.error('[worker] Fatal error:', error);
  process.exit(1);
});
```

**2. Package Structure**

```json
// packages/ai-worker/package.json
{
  "name": "@leanspec/ai-worker",
  "version": "0.4.0",
  "type": "module",
  "main": "./dist/worker.js",
  "bin": {
    "leanspec-ai-worker": "./dist/worker.js"
  },
  "files": ["dist/", "README.md"],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "ai": "^4.0.0",
    "@ai-sdk/openai": "^1.0.0",
    "@ai-sdk/anthropic": "^1.0.0",
    "@ai-sdk/google": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

### Chat Server Migration Path

**Option 1: Keep Both Temporarily** (Recommended)
- Keep `@leanspec/chat-server` as-is during migration
- Create new `@leanspec/ai-worker` package
- Rust supports both: IPC worker (new) + HTTP fallback (old)
- Gradual migration, zero breaking changes

**Option 2: In-Place Transformation**
- Rename `@leanspec/chat-server` to `@leanspec/ai-worker`
- Add IPC mode flag to existing code
- Keep HTTP mode for backward compatibility

**Recommendation**: Option 1 for cleaner separation and easier rollback.

### Deployment Changes

**Before** (Two Servers):
```bash
# Terminal 1
npx leanspec-http

# Terminal 2  
npx @leanspec/chat-server

# User needs to manage both
```

**After** (Single Server):
```bash
npx @leanspec/ui
# Rust spawns worker automatically
# User doesn't even know worker exists
```

**Docker**:
```dockerfile
FROM node:20-slim

# Install both packages
RUN npm install -g @leanspec/ui @leanspec/ai-worker

# Only need to run one command
CMD ["leanspec-http"]
```

### Error Handling

**Worker Crashes**:
- Rust detects worker exit via process handle
- Automatically respawn on next chat request
- Log error to stderr for debugging
- Return 503 to client if worker unavailable

**IPC Protocol Errors**:
- Invalid JSON → log error, ignore line, continue
- Request timeout → return 504 to client
- Unexpected response → log warning, continue

**Graceful Shutdown**:
- Rust sends SIGTERM to worker
- Worker finishes current requests (max 30s)
- Force kill after timeout
- Clean up IPC handles

## Plan

- [ ] **Phase 1: Create @leanspec/ai-worker Package**
  - [x] Create `packages/ai-worker/` directory
  - [x] Set up package.json and TypeScript config
  - [x] Copy provider factory and tools from chat-server
  - [x] Implement IPC worker entry point (worker.ts)
  - [x] Implement JSON Lines protocol (stdin/stdout)
  - [x] Add health check handler
  - [x] Add config reload handler
  - [ ] Build and test standalone: `echo '{"id":"1","type":"health"}' | node dist/worker.js`

- [ ] **Phase 2: Rust AI Worker Manager**
  - [x] Create `rust/leanspec-http/src/ai/` module
  - [x] Implement `verify_nodejs()` with tiered checks (error <v20, warn v20-v21, ok v22+)
  - [x] Implement `AiWorker` struct with process management
  - [x] Implement IPC protocol (stdin/stdout communication)
  - [x] Implement request/response serialization
  - [x] Add worker discovery logic (find worker script)
  - [x] Implement worker lifecycle management
  - [x] Add health check with timeout
  - [x] Add graceful shutdown logic
  - [x] Add graceful degradation when Node.js unavailable
  - [x] Add environment variables (LEANSPEC_NO_AI, LEANSPEC_NODE_PATH)
  - [ ] Unit tests for worker manager
  - [ ] Unit tests for Node.js detection and error handling

- [ ] **Phase 3: Integrate into HTTP Server**
  - [x] Add `AiWorkerManager` to `AppState`
  - [x] Update `/api/chat` handler to use IPC worker
  - [x] Add error handling for Node.js not found (return 503 with helpful message)
  - [x] Convert IPC stream to SSE for browser
  - [x] Handle worker errors and retries
  - [x] Add fallback to HTTP mode if worker unavailable (transitional)
  - [ ] Update CORS settings (no longer need chat-server port)

- [ ] **Phase 4: Config Management Migration** (Depends on Spec 236)
  - [x] Ensure chat config managed by Rust
  - [x] Send config to worker in each request
  - [x] Implement config reload IPC command
  - [ ] Remove config file loading from worker

- [ ] **Phase 5: Testing**
  - [ ] Unit tests: IPC protocol serialization
  - [ ] Unit tests: Worker process lifecycle
  - [ ] Integration tests: Rust → Worker → AI Provider
  - [ ] E2E tests: Browser → Rust → Worker → Response
  - [ ] Test worker crashes and auto-restart
  - [ ] Test graceful shutdown
  - [ ] Test concurrent requests
  - [ ] Test streaming performance
  - [ ] Load testing (ensure no memory leaks)

- [ ] **Phase 6: Package Distribution**
  - [x] Update `@leanspec/ui` to depend on `@leanspec/ai-worker`
  - [x] Ensure worker script included in npm package
  - [ ] Update CI/CD to build and publish ai-worker
  - [ ] Test npm install and worker discovery

- [ ] **Phase 7: Documentation & Migration**
  - [ ] Update architecture documentation
  - [ ] Add IPC protocol documentation
  - [ ] Update deployment guides (Docker, systemd, etc.)
  - [ ] Migration guide from chat-server to ai-worker
  - [ ] Add troubleshooting section

- [ ] **Phase 8: Deprecate Old Chat Server**
  - [ ] Add deprecation notice to `@leanspec/chat-server`
  - [ ] Keep it working for 1-2 versions
  - [ ] Remove HTTP fallback from Rust
  - [ ] Archive chat-server package

## Test

- [ ] **Node.js Environment Tests**
  - [ ] Node.js v22+ detected successfully without warnings
  - [ ] Node.js v24+ detected successfully without warnings
  - [ ] Node.js v20-v21 works but logs EOL warning
  - [ ] Node.js v18 blocked with error
  - [ ] Node.js not found returns helpful error
  - [ ] UI shows correct badge (green/yellow/red) based on version
  - [ ] LEANSPEC_NO_AI=1 disables AI gracefully
  - [ ] LEANSPEC_NODE_PATH=/custom/path works
  - [ ] UI shows clear "Node.js required" message when unavailable
  - [ ] Retry button works after installing Node.js

- [ ] **Worker Process Tests**
  - [ ] Worker spawns successfully
  - [ ] Health check passes on startup
  - [ ] Worker responds to chat requests
  - [ ] Worker streams responses correctly
  - [ ] Worker handles tool calls
  - [ ] Worker gracefully shuts down

- [ ] **IPC Protocol Tests**
  - [ ] Valid JSON Lines parsed correctly
  - [ ] Invalid JSON ignored gracefully
  - [ ] Request IDs match responses
  - [ ] Concurrent requests handled correctly
  - [ ] Large payloads don't cause buffer overflow

- [ ] **Error Handling Tests**
  - [ ] Worker crash triggers auto-restart
  - [ ] Invalid API keys return proper errors
  - [ ] Timeout handling works
  - [ ] Malformed requests logged and ignored

- [ ] **Integration Tests**
  - [ ] Chat request end-to-end works
  - [ ] Tool execution works via IPC
  - [ ] Multiple concurrent chats work
  - [ ] Config reload propagates to worker
  - [ ] Provider switching works

- [ ] **Performance Tests**
  - [ ] Streaming latency < 50ms
  - [ ] No memory leaks after 1000 requests
  - [ ] Worker restart < 500ms
  - [ ] Concurrent requests scale linearly

- [ ] **Deployment Tests**
  - [ ] npm install includes worker script
  - [ ] Worker discovery works in production
  - [ ] Docker deployment works
  - [ ] Systemd service works

## Notes

### Why JSON Lines?

**Alternatives Considered**:
1. **Length-prefixed binary**: More efficient but harder to debug
2. **HTTP over Unix socket**: Overkill, adds HTTP overhead
3. **gRPC**: Too heavy for simple IPC
4. **MessagePack**: Binary format, harder to debug
5. **JSON Lines**: ✅ **Chosen** (simple, debuggable, streaming-friendly)

**JSON Lines Benefits**:
- Human-readable (easy debugging)
- Line-buffered (natural backpressure)
- Streaming-friendly (parse line by line)
- Language-agnostic (any language can implement)
- Simple error recovery (skip bad lines)

### Worker Discovery Strategy

**Priority order**:
1. `LEANSPEC_AI_WORKER` env var (explicit override)
2. Development mode: `../../packages/ai-worker/dist/worker.js`
3. Production: `node_modules/@leanspec/ai-worker/dist/worker.js`
4. Bundled: `./ai-worker.js` (future: bundle with binary)

### Node.js Environment Requirements

**Verification Strategy**:
```rust
fn verify_nodejs() -> Result<()> {
    // Check if node is in PATH
    let output = Command::new("node")
        .arg("--version")
        .output();
    
    match output {
        Ok(output) if output.status.success() => {
            let version = String::from_utf8_lossy(&output.stdout);
            let version = version.trim();
            
            // Parse version (e.g., "v22.11.0" -> 22)
            if let Some(major) = version.strip_prefix('v')
                .and_then(|v| v.split('.').next())
                .and_then(|v| v.parse::<u32>().ok())
            {
                if major >= 22 {
                    tracing::info!("Node.js {} detected", version);
                    return Ok(());
                } else if major >= 20 {
                    tracing::warn!(
                        "Node.js {} detected. This version reaches EOL April 2026. \
                         Please upgrade to v22+ soon: https://nodejs.org",
                        version
                    );
                    return Ok(()); // Allow but warn
                } else {
                    return Err(anyhow::anyhow!(
                        "Node.js version {} is too old. Minimum required: v20.0.0 \
                         (recommended: v22+ for LTS support)",
                        version
                    ));
                }
            }
            
            Ok(())
        }
        Ok(_) => Err(anyhow::anyhow!("Node.js check failed")),
        Err(_) => Err(anyhow::anyhow!(
            "Node.js not found. Please install Node.js v18+ from https://nodejs.org"
        )),
    }
}
```

**Requirements**:
- **Hard Minimum**: Node.js v20.0.0 (Iron LTS, EOL April 2026) - works with warning
- **Recommended Minimum**: Node.js v22.0.0 (Jod LTS, supported until April 2027) - no warnings
- **Best**: Node.js v24+ (Krypton LTS, supported until April 2028)
- **Behavior**:
  - v20-v21: ⚠️ Works with EOL warning logged
  - v22+: ✅ Works without warnings
  - <v20: ❌ Blocked with error

**Detection Behavior**:
1. On startup, Rust checks `node --version`
2. If not found: Log clear error with installation instructions
3. If version < 18: Log error with upgrade instructions
4. If OK: Proceed with worker spawn

**Messages**:
```rust
// Node.js not found
ERROR: AI chat unavailable - Node.js not installed
Please install Node.js v22+ from: https://nodejs.org
Alternative: Set LEANSPEC_NO_AI=1 to disable AI features

// Version v20-v21 (warning, but works)
WARN: Node.js v20.15.0 detected. This version reaches EOL April 2026.
Please upgrade to v22+ soon: https://nodejs.org
AI chat will continue to work for now.

// Version too old (<v20)
ERROR: AI chat unavailable - Node.js v18.20.0 is too old
Minimum required: Node.js v20.0.0 (recommended: v22+)
Please upgrade from: https://nodejs.org
Current version: node --version

// Worker script not found
ERROR: AI chat unavailable - worker script not found
Expected location: node_modules/@leanspec/ai-worker/dist/worker.js
Please reinstall: npm install @leanspec/ai-worker
```

**Graceful Degradation**:
```rust
pub struct AiWorkerManager {
    worker: Option<AiWorker>,
    config: ChatConfig,
    disabled_reason: Option<String>,  // NEW: Track why AI is disabled
}

impl AiWorkerManager {
    pub async fn get_or_spawn(&mut self) -> Result<&mut AiWorker> {
        // If previously failed, return cached error
        if let Some(reason) = &self.disabled_reason {
            return Err(anyhow::anyhow!("AI features disabled: {}", reason));
        }
        
        if self.worker.is_none() {
            match AiWorker::spawn().await {
                Ok(worker) => {
                    self.worker = Some(worker);
                }
                Err(e) => {
                    let reason = format!("{}", e);
                    tracing::error!("Failed to spawn AI worker: {}", reason);
                    self.disabled_reason = Some(reason.clone());
                    return Err(anyhow::anyhow!("AI worker unavailable: {}", reason));
                }
            }
        }
        
        Ok(self.worker.as_mut().unwrap())
    }
}
```

**HTTP Handler Response**:
```rust
pub async fn chat_stream(
    State(state): State<AppState>,
    Json(req): Json<ChatRequest>,
) -> Result<Response> {
    match state.ai_worker.lock().await.get_or_spawn().await {
        Ok(worker) => {
            // Normal chat flow
            let stream = worker.chat(req).await?;
            Ok(Sse::new(stream).into_response())
        }
        Err(e) => {
            // Return helpful error to UI
            Ok(Json(json!({
                "error": "AI chat unavailable",
                "message": format!("{}", e),
                "help": "Please ensure Node.js v18+ is installed"
            })).into_response())
        }
    }
}
```

**Environment Variables**:
```bash
# Disable AI features entirely (skip Node.js check)
LEANSPEC_NO_AI=1

# Custom Node.js binary path
LEANSPEC_NODE_PATH=/usr/local/bin/node

# Custom worker script location
LEANSPEC_AI_WORKER=/path/to/worker.js

# Skip version check (advanced users only)
LEANSPEC_SKIP_NODE_VERSION_CHECK=1
```

**User Experience**:
1. **v22+**: Works perfectly, no warnings
2. **v20-v21**: Works with warning banner: "Node.js v20 reaches EOL April 2026. Upgrade recommended."
3. **<v20**: Shows error: "AI chat requires Node.js v20+ (recommended v22+)"
4. **Not installed**: Link to nodejs.org/en/download with clear instructions
5. **Status indicator**: 
   - Green badge: "AI Ready" (v22+)
   - Yellow badge: "AI Active (upgrade recommended)" (v20-v21)
   - Red badge: "AI Disabled" (<v20 or not installed)

**Package.json Documentation**:
```json
{
  "name": "@leanspec/ui",
  "peerDependencies": {
    "node": ">=20.0.0"
  },
  "peerDependenciesMeta": {
    "node": {
      "optional": false
    }
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "volta": {
    "node": "22.11.0"
  }
}
```

**Note**: `engines` specifies hard minimum (v20), `volta` specifies recommended version (v22).
```

**Installation Check**:
```bash
# Add to postinstall script
npx @leanspec/ui --check-node
# Output: ✓ Node.js v20.11.0 detected (OK)
#         ✓ AI worker installed
#         ✓ Ready to use
```

### Process Lifecycle

**Startup**:
1. Rust spawns worker on first `/api/chat` request
2. Worker sends health check response
3. Rust marks worker as ready
4. Request processed

**Normal Operation**:
- Worker stays alive for entire server lifetime
- Multiple requests reuse same worker process
- Config changes trigger reload (no restart)

**Shutdown**:
1. Rust receives SIGTERM
2. Rust sends SIGTERM to worker
3. Worker finishes current requests (max 30s)
4. Rust waits for worker exit
5. Force SIGKILL after timeout

**Crash Recovery**:
1. Rust detects worker exit (process handle)
2. Log error with exit code
3. Clear worker reference
4. Next request spawns new worker

### Performance Considerations

**IPC Overhead**:
- JSON serialization: ~100μs per message
- Pipe I/O: ~50μs per write/read
- Total overhead: <1ms (negligible vs network)

**Memory Usage**:
- Worker process: ~50-100MB (Node.js + AI SDK)
- IPC buffers: ~128KB (OS default)
- Total increase: Minimal (worker replaces chat-server)

**Latency**:
- IPC adds ~1ms vs HTTP localhost
- But removes network stack overhead
- Net result: Similar or slightly faster

### Comparison with Desktop App

This IPC approach mirrors Tauri's command pattern:
- **Desktop**: Tauri → Rust commands → Response
- **Web**: Browser → Rust → IPC Worker → Response

Both architectures:
- Single main process (Tauri/Rust HTTP)
- Worker for heavy computation (WebView/Node.js)
- IPC for communication
- Consistent separation of concerns

### Alternative: WASM AI SDK

**Future possibility**: Compile AI SDK to WebAssembly
- Pure Rust implementation (no Node.js needed)
- Zero IPC overhead
- Smaller binaries

**Why not now?**:
- AI SDK ecosystem is JavaScript-native
- WASM bindings immature
- Provider SDKs not WASM-compatible
- Maintenance burden too high

**When to revisit**:
- WASM support improves
- Pure Rust AI SDK emerges
- Provider APIs stabilize

### Security Considerations

**IPC Isolation**:
- Worker runs as child process (same user)
- No network exposure
- Can't be accessed by other processes
- Crashes don't affect main server

**API Key Handling**:
- Keys never sent over IPC (use env vars)
- Worker reads keys from environment
- Rust passes provider ID, not key
- Config reload doesn't include secrets

**Resource Limits**:
- Worker memory limit (via cgroups)
- CPU limits (via nice/cgroups)
- Request timeouts
- Max concurrent requests

### Related Specs

- **Spec 236**: Migrate AI Model Config API to Rust (dependency)
- **Spec 218**: Unified HTTP Server (context)
- **Spec 184**: Unified UI Architecture (parent context)
- **Future**: WASM AI SDK implementation

### Migration Timeline

**Phase 1** (v0.4.0): Parallel operation
- Both chat-server and ai-worker supported
- IPC is default, HTTP is fallback
- No breaking changes

**Phase 2** (v0.5.0): Deprecation
- IPC is only supported mode
- chat-server marked deprecated
- Migration guide published

**Phase 3** (v0.6.0): Removal
- chat-server removed
- IPC is the only way
- Clean architecture achieved