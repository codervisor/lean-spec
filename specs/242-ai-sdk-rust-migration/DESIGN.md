# Design: AI SDK Rust Migration

**Parent Spec**: [242-ai-sdk-rust-migration](./README.md)

This document contains the detailed design specifications for migrating from Vercel AI SDK (Node.js) to native Rust using `async-openai` and `anthropic` crates.

---

## Current Architecture (Pre-Migration)

```
┌─────────────────────────┐
│ Rust HTTP Server        │ ← leanspec-http (Axum)
│ (leanspec-http)         │   Manages state, routing
│ ├─ Chat config          │   
│ ├─ Session persistence  │   
│ └─ AI Worker Manager    │   Spawns/manages worker
└───────────┬─────────────┘
            │ IPC (stdin/stdout, JSON Lines)
            │ ~420 lines protocol handling
            ↓
┌─────────────────────────┐
│ Node.js AI Worker       │ ← @leanspec/ai-worker
│ (packages/ai-worker/)   │   Vercel AI SDK v6.0.39+
│ ├─ streamText()         │   14 LeanSpec tools
│ ├─ Tool execution       │   Requires Node.js v20+
│ └─ Provider factory     │   
└─────────────────────────┘
```

**Problems**:
- Users must have Node.js v20+ installed
- Two separate processes with IPC overhead
- Complex deployment (two runtimes)
- Error handling across process boundary
- Larger Docker images (~140MB Node.js base)

### Target Architecture (Post-Migration)

```
┌─────────────────────────────────┐
│ Rust HTTP Server                │ ← Single process
│ (leanspec-http)                 │   Pure Rust stack
│ ├─ Chat config                  │   
│ ├─ Session persistence          │   
│    └─ AI Module (native)           │   Direct function calls
│       ├─ async-openai/anthropic    │   Zero IPC overhead
│    ├─ 14 Tool implementations   │   Type-safe
│    └─ Stream handling           │   
└─────────────────────────────────┘
```

**Benefits**:
- ✅ No Node.js dependency
- ✅ Single binary deployment
- ✅ Zero IPC overhead
- ✅ Faster startup (no worker spawn)
- ✅ Better type safety (compile-time validation)
- ✅ Smaller binaries (~80MB vs ~140MB)
- ✅ Simpler architecture

### Integration with Spec 241 Architecture

Spec 241 consolidated infrastructure into `leanspec-core`. The AI module will follow this pattern:

```
rust/
├── leanspec-core/          # Consolidated core library
│   ├── src/ai/             # Existing (worker management)
│   │   ├── manager.rs      # Keep for process mgmt (deprecated)
│   │   ├── protocol.rs     # Delete (no IPC needed)
│   │   └── worker.rs       # Delete (replaced by native)
│   └── src/ai_native/      # NEW - Native Rust AI
│       ├── mod.rs          # Public API
│       ├── chat.rs         # Chat streaming logic
│       ├── providers.rs    # Provider factory
│       ├── tools/          # 14 LeanSpec tools
│       │   ├── mod.rs
│       │   ├── list_specs.rs
│       │   ├── search_specs.rs
│       │   ├── get_spec.rs
│       │   ├── update_spec.rs
│       │   ├── link_specs.rs
│       │   ├── validate_specs.rs
│       │   └── ...
│       └── error.rs        # AI-specific errors
└── leanspec-http/          # HTTP layer
    └── src/handlers/
        └── chat_handler.rs # Updated to use ai_native
```

### Provider Integration

> **Note**: See [AI_SDK_ALIGNMENT.md](./AI_SDK_ALIGNMENT.md) for detailed SSE protocol specifications and frontend compatibility requirements.

The Rust implementation uses `async-openai` for OpenAI/OpenRouter providers and the `anthropic` crate for Anthropic integration. The streaming protocol follows the Vercel AI SDK's `useChat` hook expectations with SSE events.

**Why not aisdk.rs?** During Phase 1, we discovered that `aisdk-macros` (a dependency of `aisdk`) uses Rust 2024 edition features (let-chains) that are unstable in Rust 1.86. All versions of `aisdk` (0.2.0, 0.3.0, 0.4.0) are affected. We switched to `async-openai` + `anthropic` which are stable, mature alternatives.

```rust
// rust/leanspec-core/src/ai_native/streaming.rs

use serde::{Deserialize, Serialize};

/// SSE stream events aligned with Vercel AI SDK frontend expectations
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum StreamEvent {
    #[serde(rename = "start")]
    MessageStart {
        #[serde(rename = "messageId")]
        message_id: String,
    },
    
    #[serde(rename = "text-start")]
    TextStart { id: String },
    
    #[serde(rename = "text-delta")]
    TextDelta { id: String, delta: String },
    
    #[serde(rename = "text-end")]
    TextEnd { id: String },
    
    #[serde(rename = "tool-input-start")]
    ToolInputStart {
        #[serde(rename = "toolCallId")]
        tool_call_id: String,
        #[serde(rename = "toolName")]
        tool_name: String,
    },
    
    #[serde(rename = "tool-input-delta")]
    ToolInputDelta {
        #[serde(rename = "toolCallId")]
        tool_call_id: String,
        #[serde(rename = "inputTextDelta")]
        input_text_delta: String,
    },
    
    #[serde(rename = "tool-input-available")]
    ToolInputAvailable {
        #[serde(rename = "toolCallId")]
        tool_call_id: String,
        #[serde(rename = "toolName")]
        tool_name: String,
        input: serde_json::Value,
    },
    
    #[serde(rename = "tool-output-available")]
    ToolOutputAvailable {
        #[serde(rename = "toolCallId")]
        tool_call_id: String,
        output: serde_json::Value,
    },
    
    #[serde(rename = "start-step")]
    StartStep,
    
    #[serde(rename = "finish-step")]
    FinishStep,
    
    #[serde(rename = "finish")]
    Finish,
    
    #[serde(rename = "error")]
    Error {
        #[serde(rename = "errorText")]
        error_text: String,
    },
}

impl StreamEvent {
    pub fn to_sse_string(&self) -> String {
        let json = serde_json::to_string(self).expect("Failed to serialize event");
        format!("data: {}\n\n", json)
    }
}

pub fn sse_done() -> String {
    "data: [DONE]\n\n".to_string()
}
```

### Tool Implementation Strategy

**Approach**: Each tool is a separate Rust module with JSON Schema generation using `schemars`:

```rust
// rust/leanspec-core/src/ai_native/tools/list_specs.rs

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct ListSpecsInput {
    pub project_id: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub tags: Option<Vec<String>>,
}

pub async fn list_specs(input: ListSpecsInput) -> Result<String, ToolError> {
    let project_id = input.project_id
        .ok_or_else(|| ToolError::MissingField("project_id"))?;
    
    // Call leanspec_core API directly
    let specs = crate::list_specs(
        &project_id,
        input.status.as_deref(),
        input.priority.as_deref(),
        input.tags.as_deref(),
    )?;
    
    Ok(serde_json::to_string(&specs)?)
}

/// Generate JSON schema for the tool
pub fn tool_schema() -> serde_json::Value {
    let schema = schemars::schema_for!(ListSpecsInput);
    serde_json::json!({
        "name": "list_specs",
        "description": "List specs with optional filters",
        "parameters": schema,
    })
}
```

### Provider Support

**Required Providers**:

1. **OpenRouter** - Priority for unified access (uses `async-openai` with custom base URL)
2. **OpenAI** - GPT-4o, GPT-4o-mini, GPT-5.2 (uses `async-openai`)
3. **Anthropic** - Claude 3.5/4.5 Sonnet (uses `anthropic` crate)

```rust
// rust/leanspec-core/src/ai_native/providers.rs

use async_openai::Client as OpenAIClient;
use anthropic::Client as AnthropicClient;

pub enum LeanSpecProvider {
    OpenRouter { api_key: String, base_url: String },
    OpenAI { api_key: String },
    Anthropic { api_key: String },
}

pub enum ProviderClient {
    OpenAI(OpenAIClient<async_openai::config::OpenAIConfig>),
    Anthropic(AnthropicClient),
}

impl LeanSpecProvider {
    pub fn create_client(&self) -> ProviderClient {
        match self {
            Self::OpenRouter { api_key, base_url } => {
                // OpenRouter uses OpenAI-compatible API
                let config = async_openai::config::OpenAIConfig::new()
                    .with_api_key(api_key)
                    .with_api_base(base_url);
                ProviderClient::OpenAI(OpenAIClient::with_config(config))
            }
            Self::OpenAI { api_key } => {
                let config = async_openai::config::OpenAIConfig::new()
                    .with_api_key(api_key);
                ProviderClient::OpenAI(OpenAIClient::with_config(config))
            }
            Self::Anthropic { api_key } => {
                ProviderClient::Anthropic(AnthropicClient::new(api_key))
            }
        }
    }
}
```

### HTTP Handler Integration

```rust
// rust/leanspec-http/src/handlers/chat_handler.rs

use axum::{
    body::Body,
    response::{Response, IntoResponse},
    http::{StatusCode, header},
    Json,
};
use futures::StreamExt;
use leanspec_core::ai_native::{stream_chat, ChatConfig, StreamEvent, sse_done};

pub async fn chat_handler(
    State(state): State<AppState>,
    Json(request): Json<ChatRequest>,
) -> Result<Response<Body>, ApiError> {
    // No IPC needed - direct function call!
    let stream = stream_chat(ChatConfig {
        messages: request.messages,
        provider_id: request.provider_id,
        model_id: request.model_id,
        system_prompt: request.system_prompt,
        max_steps: request.max_steps,
        tools_enabled: request.tools_enabled,
    }).await?;
    
    // Convert stream events to SSE format
    let sse_stream = stream
        .map(|event| event.to_sse_string())
        .chain(futures::stream::once(async { sse_done() }));
    
    // Create streaming response with required headers for AI SDK compatibility
    let response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "text/event-stream; charset=utf-8")
        .header(header::CACHE_CONTROL, "no-cache, no-transform")
        .header(header::CONNECTION, "keep-alive")
        .header("x-vercel-ai-ui-message-stream", "v1") // REQUIRED for frontend compatibility
        .body(Body::from_stream(sse_stream))?;
    
    Ok(response)
}

#[derive(Deserialize)]
struct ChatRequest {
    messages: Vec<UIMessage>,
    #[serde(rename = "providerId")]
    provider_id: String,
    #[serde(rename = "modelId")]
    model_id: String,
    #[serde(rename = "systemPrompt")]
    system_prompt: String,
    #[serde(rename = "maxSteps")]
    max_steps: u32,
    #[serde(rename = "toolsEnabled")]
    tools_enabled: bool,
}
```

### Migration Impact Analysis

**Files to Delete** (~1,200 LOC):
- ❌ `packages/ai-worker/` (entire package)
  - `src/worker.ts` (262 lines)
  - `src/tools/leanspec-tools.ts` (378 lines)
  - `src/provider-factory.ts` (50 lines)
  - `src/config.ts` (120 lines)
  - `package.json`, dependencies, etc.
- ❌ `rust/leanspec-core/src/ai/protocol.rs` (243 lines IPC protocol)
- ❌ `rust/leanspec-core/src/ai/worker.rs` (419 lines IPC worker)
- ❌ `rust/leanspec-http/src/handlers/chat_handler.rs` (IPC fallback logic)

**Files to Create** (~1,500 LOC):
- ✅ `rust/leanspec-core/src/ai_native/mod.rs` (~100 lines)
- ✅ `rust/leanspec-core/src/ai_native/chat.rs` (~300 lines)
- ✅ `rust/leanspec-core/src/ai_native/providers.rs` (~200 lines)
- ✅ `rust/leanspec-core/src/ai_native/tools/` (~800 lines, 14 tools × ~60 lines)
- ✅ `rust/leanspec-core/src/ai_native/error.rs` (~100 lines)

**Files to Update**:
- 🔄 `rust/leanspec-core/Cargo.toml` (add async-openai, anthropic, schemars dependencies)
- 🔄 `rust/leanspec-core/src/lib.rs` (export ai_native module)
- 🔄 `rust/leanspec-http/src/handlers/chat_handler.rs` (use ai_native)
- 🔄 `rust/leanspec-http/Cargo.toml` (remove IPC dependencies)
- 🔄 Documentation, README files

**Net Change**: ~300 lines added (1,500 new - 1,200 deleted)

### Deployment Benefits

**Before** (Node.js + Rust):
```dockerfile
FROM node:20-slim
COPY --from=rust-builder /app/target/release/leanspec-http /usr/local/bin/
RUN npm install -g @leanspec/ai-worker
CMD ["leanspec-http"]
# Size: ~140MB
```

**After** (Pure Rust):
```dockerfile
FROM debian:bookworm-slim
COPY --from=rust-builder /app/target/release/leanspec-http /usr/local/bin/
CMD ["leanspec-http"]
# Size: ~80MB (-43%)
```

**Alpine (Static Build)**:
```dockerfile
FROM scratch
COPY --from=rust-builder /app/target/x86_64-unknown-linux-musl/release/leanspec-http /
CMD ["/leanspec-http"]
# Size: ~15MB (-89%)
```

