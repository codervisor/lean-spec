# Implementation Notes

## Backend Architecture: Node.js Sidecar (Option B)

**Decision**: Use Node.js sidecar for AI SDK integration

**Rationale**:
- Development speed: 3 days vs 10 days (70% faster)
- Battle-tested streaming + tool calling (AI SDK handles edge cases)
- Multi-provider support out of the box (50+ models)
- Future-proof: AI SDK team handles provider updates

## IPC Options: HTTP vs napi-rs

### Option 1: HTTP with Dynamic Port or Unix Socket (Recommended)

**Architecture**:
```
Browser → Rust HTTP Server (port 3030) → Node.js Sidecar (dynamic port or socket) → AI Provider
                ↓                                ↓
         LeanSpec Core REST APIs         Tool Execution (calls back to Rust)
```

**Configuration Options**:
1. **Unix Socket** (default, best for single machine): `/tmp/leanspec-chat.sock`
2. **Dynamic Port** (for multi-instance): Node.js picks available port, writes to shared file
3. **Fixed Port** (for simple setups): `localhost:3031`

**Implementation**:
```rust
// Rust: Read socket/port from config file
use hyperlocal::{UnixClientExt, Uri as UnixUri};

enum ChatServerAddr {
    UnixSocket(PathBuf),
    Http(String),
}

impl ChatServerAddr {
    fn from_config() -> Result<Self> {
        // Read from ~/.leanspec/chat-server.json or env var
        if let Ok(socket_path) = env::var("LEANSPEC_CHAT_SOCKET") {
            Ok(Self::UnixSocket(PathBuf::from(socket_path)))
        } else if let Ok(port) = env::var("LEANSPEC_CHAT_PORT") {
            Ok(Self::Http(format!("http://localhost:{}", port)))
        } else {
            // Default: Unix socket
            Ok(Self::UnixSocket(PathBuf::from("/tmp/leanspec-chat.sock")))
        }
    }
}

async fn chat_handler(
    State(addr): State<ChatServerAddr>,
    Json(payload): Json<ChatRequest>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let response = match &addr {
        ChatServerAddr::UnixSocket(path) => {
            let client = Client::unix();
            client.post(UnixUri::new(path, "/api/chat"))
                .json(&payload)
                .send()
                .await?
        }
        ChatServerAddr::Http(url) => {
            Client::new()
                .post(format!("{}/api/chat", url))
                .json(&payload)
                .send()
                .await?
        }
    };
    
    let stream = response.bytes_stream().map(|chunk| {
        Ok(Event::default().data(chunk?))
    });
    
    Sse::new(stream)
}
```

```typescript
// Node.js sidecar: Support both Unix socket and dynamic port
import express from 'express';
import fs from 'fs';
import net from 'net';
import os from 'os';

const app = express();
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  const result = streamText({
    model: openai('gpt-4o'),
    tools: allTools,
    messages: req.body.messages,
  });
  
  result.pipeDataStreamToResponse(res);
});

// Health check endpoint
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Start server based on config
const socketPath = process.env.LEANSPEC_CHAT_SOCKET || '/tmp/leanspec-chat.sock';
const useSocket = process.env.LEANSPEC_CHAT_TRANSPORT !== 'http';

if (useSocket) {
  // Unix socket (default)
  if (fs.existsSync(socketPath)) fs.unlinkSync(socketPath);
  
  const server = net.createServer(app);
  server.listen(socketPath, () => {
    fs.chmodSync(socketPath, 0o600); // Secure: owner-only
    console.log(`Chat server listening on ${socketPath}`);
  });
} else {
  // Dynamic HTTP port
  const server = app.listen(0, () => {
    const port = server.address().port;
    
    // Write port to config file for Rust to read
    const configPath = process.env.LEANSPEC_CHAT_PORT_FILE || 
                       `${os.homedir()}/.leanspec/chat-port.txt`;
    fs.writeFileSync(configPath, port.toString());
    
    console.log(`Chat server listening on http://localhost:${port}`);
  });
}
```

**Pros**:
- ✅ Simple to implement (minimal dependencies)
- ✅ Unix socket: No port conflicts, better security, 30% faster
- ✅ Dynamic port: Works across machines (cloud deployment)
- ✅ Easy to debug (Unix socket: `socat`, HTTP: curl/Postman)
- ✅ Language-agnostic (could swap Node.js for Python/Go later)
- ✅ No build complexity (no FFI, no native bindings)
- ✅ Hot reload Node.js without rebuilding Rust
- ✅ Secure: Unix socket is owner-only (chmod 600)

**Cons**:
- ❌ Unix socket: Platform-specific (Unix-like only, Windows needs named pipes)
- ❌ Dynamic port: Requires config file coordination
- ❌ Two processes to manage (need process supervisor)

**Latency Analysis**:
- Unix socket overhead: ~0.7ms
- HTTP (dynamic port) overhead: ~1ms (localhost loopback)
- AI API call: 200-500ms (to OpenAI)
- Total: 200.7-500.7ms (Unix) or 201-501ms (HTTP)
- **Overhead percentage: 0.14-0.5% (negligible)**

**Process Management**:
```bash
# Development: Two terminals
Terminal 1: pnpm dev:http-server       # Rust on :3030
Terminal 2: LEANSPEC_CHAT_SOCKET=/tmp/leanspec-chat.sock pnpm dev:chat-server

# Production: systemd with Unix socket (recommended)
# /etc/systemd/system/leanspec-chat.service
[Service]
Environment="LEANSPEC_CHAT_SOCKET=/var/run/leanspec/chat.sock"
ExecStart=/usr/bin/node /opt/leanspec/chat-server/index.js
RuntimeDirectory=leanspec
RuntimeDirectoryMode=0700

# Production: Docker Compose (for cloud)
docker-compose up
  - rust-http: :3030
  - node-chat: Unix socket via shared volume

# Production: Multi-instance (dynamic ports)
LEANSPEC_CHAT_TRANSPORT=http pnpm start:chat-server
# Writes port to ~/.leanspec/chat-port.txt
```

**Deployment Size**:
- Docker image: +50MB (Node.js Alpine)
- Binary bundle (esbuild): +5MB for Node.js server
- Cloud: Node.js already installed (0MB)

---

### Option 2: napi-rs (Embedded Node.js)

**Architecture**:
```
Browser → Rust HTTP Server → Node.js (embedded via napi-rs) → AI Provider
                ↓                      ↓
         LeanSpec Core          Tool Execution (in-process)
```

**Implementation**:
```rust
// Rust: Call Node.js function directly via FFI
use napi_rs::{Env, JsFunction, CallContext};

#[napi]
pub async fn execute_chat(env: Env, messages: Vec<Message>) -> Result<JsObject> {
    let js_func: JsFunction = env.get_global()?.get_named_property("streamChat")?;
    let result = js_func.call(None, &[messages])?;
    Ok(result)
}
```

```typescript
// Node.js: Exposed via napi-rs
import { streamText } from 'ai';

global.streamChat = async (messages) => {
  const result = await streamText({
    model: openai('gpt-4o'),
    messages,
    tools: allTools,
  });
  return result.toTextStreamResponse();
};
```

**Pros**:
- ✅ Single binary (simpler deployment)
- ✅ Lower latency (~0.1ms overhead vs 1-2ms HTTP)
- ✅ No port binding required (more secure)
- ✅ Shared memory (could pass large data without serialization)

**Cons**:
- ❌ **High build complexity**:
  - Requires Node.js headers at build time
  - Platform-specific binaries (macOS, Linux, Windows ARM/x64)
  - Cross-compilation is difficult (need Node.js runtime for each target)
- ❌ **Debugging nightmare**:
  - FFI crashes are hard to debug (segfaults, memory corruption)
  - Can't inspect requests/responses easily
  - Stack traces span Rust ↔ Node.js boundary
- ❌ **Deployment friction**:
  - Must bundle Node.js runtime (~50MB) OR require system Node.js
  - Version mismatch issues (napi-rs v9 requires Node.js 18+)
  - Harder to update Node.js dependencies (requires Rust rebuild)
- ❌ **Limited isolation**:
  - Node.js crash brings down entire Rust process
  - Memory leaks in Node.js affect Rust server
  - No separate restart/health checks

**Build Process Complexity**:
```bash
# macOS
cargo build --release --target x86_64-apple-darwin
cargo build --release --target aarch64-apple-darwin

# Linux
cargo build --release --target x86_64-unknown-linux-gnu
cargo build --release --target aarch64-unknown-linux-gnu

# Windows
cargo build --release --target x86_64-pc-windows-msvc

# Each requires:
- Node.js runtime installed for target architecture
- napi-rs compatible with target Node.js version
- Platform-specific system libraries
```

**Verdict**: Not worth it for this use case. The latency savings (0.9ms) are meaningless compared to 200-500ms AI API calls, and the build/debug complexity is too high.

---

### Option 3: Named Pipes (Windows Alternative)

**Architecture**: Windows-specific IPC using named pipes.

```rust
// Rust (Windows)
use tokio::net::windows::named_pipe::ClientOptions;
let client = ClientOptions::new()
    .open(r"\\.\pipe\leanspec-chat")?;
```

```typescript
// Node.js (Windows)
import { createServer } from 'net';
const server = createServer();
server.listen(r'\\.\pipe\leanspec-chat');
```

**Pros**:
- ✅ Similar performance to Unix sockets
- ✅ No port binding
- ✅ Secure (ACL-based permissions)

**Cons**:
- ❌ Windows-only (needs separate Unix socket implementation)
- ❌ More complex setup (ACL configuration)
- ❌ Harder to debug

**Verdict**: Implement if Windows support is critical. For MVP, support Unix socket (macOS/Linux) + HTTP fallback.

---

## Recommendation: Unix Socket (Primary) + HTTP (Fallback)

**Default to Unix socket**, with HTTP as configuration option:

1. **Performance**: 30% faster than TCP (0.7ms vs 1ms)
2. **Security**: No network exposure, owner-only file permissions
3. **Simplicity**: No port conflicts, no port allocation logic
4. **Debuggability**: Use `socat` for Unix sockets, curl for HTTP
5. **Flexibility**: Support both modes via environment variable
6. **Platform Support**: Unix socket (macOS/Linux), HTTP (all platforms including Windows)

**Configuration Strategy**:
```bash
# Default (Unix socket)
LEANSPEC_CHAT_SOCKET=/tmp/leanspec-chat.sock

# Fallback (HTTP with dynamic port)
LEANSPEC_CHAT_TRANSPORT=http
LEANSPEC_CHAT_PORT_FILE=~/.leanspec/chat-port.txt

# Fixed port (for debugging)
LEANSPEC_CHAT_TRANSPORT=http
LEANSPEC_CHAT_PORT=3031
```

**When to use HTTP mode**:
- Windows deployment (no Unix socket support)
- Multi-machine setup (Docker Swarm, Kubernetes)
- Debugging with HTTP inspection tools
- Cloud serverless (Lambda, Cloud Run)

---

## Implementation Plan

### Phase 1: Node.js Sidecar Setup
```bash
# 1. Create chat server package
cd packages
mkdir chat-server
cd chat-server
pnpm init

# 2. Install dependencies
pnpm add ai @ai-sdk/openai zod express

# 3. Create server with Unix socket support
cat > src/index.ts <<EOF
import express from 'express';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import fs from 'fs';
import net from 'net';
import os from 'os';

const app = express();
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  const result = streamText({
    model: openai('gpt-4o'),
    messages: req.body.messages,
  });
  result.pipeDataStreamToResponse(res);
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Start server: Unix socket (default) or HTTP (fallback)
const socketPath = process.env.LEANSPEC_CHAT_SOCKET || '/tmp/leanspec-chat.sock';
const useHttp = process.env.LEANSPEC_CHAT_TRANSPORT === 'http';

if (!useHttp) {
  // Unix socket mode
  if (fs.existsSync(socketPath)) fs.unlinkSync(socketPath);
  const server = net.createServer(app);
  server.listen(socketPath, () => {
    fs.chmodSync(socketPath, 0o600);
    console.log(`Chat server listening on ${socketPath}`);
  });
} else {
  // HTTP mode with dynamic port
  const port = process.env.LEANSPEC_CHAT_PORT || 0; // 0 = random available port
  const server = app.listen(port, () => {
    const actualPort = server.address().port;
    const portFile = process.env.LEANSPEC_CHAT_PORT_FILE || 
                     `${os.homedir()}/.leanspec/chat-port.txt`;
    fs.mkdirSync(path.dirname(portFile), { recursive: true });
    fs.writeFileSync(portFile, actualPort.toString());
    console.log(`Chat server listening on http://localhost:${actualPort}`);
  });
}
EOF

# 4. Add to pnpm-workspace.yaml
echo "  - packages/chat-server" >> ../../pnpm-workspace.yaml
```

### Phase 2: Rust Proxy Handler
```rust
// rust/leanspec-http/src/handlers/chat.rs
use axum::{
    extract::State,
    response::sse::{Event, Sse},
    Json,
};
use futures::stream::Stream;
use hyperlocal::{UnixClientExt, Uri as UnixUri};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Clone)]
pub enum ChatServerConfig {
    UnixSocket(PathBuf),
    Http(String),
}

impl ChatServerConfig {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        if let Ok(socket_path) = std::env::var("LEANSPEC_CHAT_SOCKET") {
            return Ok(Self::UnixSocket(PathBuf::from(socket_path)));
        }
        
        if let Ok(port) = std::env::var("LEANSPEC_CHAT_PORT") {
            return Ok(Self::Http(format!("http://localhost:{}", port)));
        }
        
        // Try reading dynamic port file
        if let Ok(port_file) = std::env::var("LEANSPEC_CHAT_PORT_FILE") {
            let port = std::fs::read_to_string(port_file)?.trim().to_string();
            return Ok(Self::Http(format!("http://localhost:{}", port)));
        }
        
        // Default: Unix socket
        Ok(Self::UnixSocket(PathBuf::from("/tmp/leanspec-chat.sock")))
    }
}

#[derive(Deserialize)]
pub struct ChatRequest {
    messages: Vec<Message>,
}

#[derive(Deserialize, Serialize)]
pub struct Message {
    role: String,
    content: String,
}

pub async fn chat_handler(
    State(config): State<ChatServerConfig>,
    Json(payload): Json<ChatRequest>,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, StatusCode> {
    let response = match &config {
        ChatServerConfig::UnixSocket(path) => {
            let client = Client::unix();
            client
                .post(UnixUri::new(path, "/api/chat"))
                .json(&payload)
                .send()
                .await
                .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?
        }
        ChatServerConfig::Http(url) => {
            Client::new()
                .post(format!("{}/api/chat", url))
                .json(&payload)
                .send()
                .await
                .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?
        }
    };
    
    let stream = response.bytes_stream().map(|chunk| {
        Ok(Event::default().data(chunk.unwrap()))
    });
    
    Ok(Sse::new(stream))
}
```

### Phase 3: Frontend Integration
```tsx
// packages/ui/src/pages/chat.tsx
import { useChat } from '@ai-sdk/react';

export default function ChatPage() {
  const { messages, input, setInput, sendMessage } = useChat({
    api: '/api/chat', // Proxied through Rust HTTP server
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>{m.content}</div>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={() => sendMessage(input)}>Send</button>
    </div>
  );
}
```

### Phase 4: Process Management

**Development** (`package.json`):
```json
{
  "scripts": {
    "dev": "concurrently \"pnpm dev:http\" \"pnpm dev:chat\"",
    "dev:http": "cargo run --bin leanspec-http",
    "dev:chat": "tsx packages/chat-server/src/index.ts"
  }
}
```

**Production** (`docker-compose.yml`):
```yaml
version: '3.8'
services:
  http-server:
    image: leanspec/http-server
    ports:
      - "3030:3030"
    depends_on:
      - chat-server
  
  chat-server:
    image: leanspec/chat-server
    expose:
      - "3031"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
```

---

## Security Considerations

### API Key Storage
```typescript
// Node.js sidecar reads API keys from env
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error('Missing OPENAI_API_KEY');

// Never expose in client bundle
// Never log API keys
// Use AI Gateway to avoid key management
```

### Rate Limiting
```rust
// Rust HTTP server implements rate limiting
use tower::limit::RateLimitLayer;

let rate_limit = RateLimitLayer::new(
    10, // 10 requests
    Duration::from_secs(60), // per minute
);

Router::new()
    .route("/api/chat", post(chat_handler))
    .layer(rate_limit);
```

### Network Isolation
```yaml
# Docker: Use Unix socket via shared volume (most secure)
version: '3.8'
services:
  http-server:
    volumes:
      - chat-socket:/tmp
  chat-server:
    volumes:
      - chat-socket:/tmp
    environment:
      - LEANSPEC_CHAT_SOCKET=/tmp/leanspec-chat.sock

volumes:
  chat-socket:

# Alternative: HTTP with internal network (less secure)
chat-server:
  networks:
    - internal
  expose:
    - "3031"  # Only accessible within Docker network
  # No ports: section
  
networks:
  internal:
    internal: true
```

---

## Cost Estimates

**Development** (1 month):
- API calls: ~1M tokens/day = $2.50/day × 30 = **$75/month**
- AI Gateway: $5/month free tier = **$0**
- Total: **~$75/month**

**Production** (100 users, 10 messages/day each):
- Messages: 100 users × 10 msg/day × 30 days = 30,000 messages
- Avg tokens: 500 input + 300 output = 800 tokens/message
- Total: 24M tokens/month
- Cost (GPT-4o): (12M input × $2.50) + (12M output × $10) = **$150/month**

**Cost Optimization**:
- Use Deepseek R1: $0.55 input + $2.19 output = **~$32/month** (78% cheaper)
- Implement caching: 30% reduction = **$105/month**
- Compress context: Keep history <10 messages = **$90/month**

---

## Performance Benchmarks (Expected)

| Metric                 | Unix Socket | HTTP (Dynamic Port) | napi-rs   | Rust-only |
| ---------------------- | ----------- | ------------------- | --------- | --------- |
| IPC Overhead           | 0.7ms       | 1-2ms               | 0.1ms     | 0ms       |
| AI API Call            | 200-500ms   | 200-500ms           | 200-500ms | 200-500ms |
| **Total Latency**      | 200.7-500ms | 201-502ms           | 200-500ms | 200-500ms |
| **Overhead %**         | 0.14%       | 0.5%                | 0.02%     | 0%        |
| Build Time             | 30s         | 30s                 | 5min      | 2min      |
| Debug Complexity       | Low         | Low                 | High      | Medium    |
| Deployment Complexity  | Low         | Medium              | High      | Low       |
| Cross-platform Support | Unix-only   | All platforms       | All       | All       |
| Security               | High        | Medium              | High      | High      |
| Port Conflicts         | None        | None (dynamic)      | None      | None      |

**Conclusion**: Unix socket offers best balance of performance, security, and simplicity. HTTP dynamic port provides cross-platform compatibility. Neither overhead is significant compared to AI API latency (both <1% overhead).

---

## Open Questions

1. **Process Supervision**: Use PM2, systemd, or Docker?
   - **Recommendation**: Docker Compose for production, concurrently for dev

2. **Health Checks**: How to detect Node.js sidecar crashes?
   - **Solution**: Rust sends periodic `/health` pings, restarts on failure
   - **Implementation**:
     ```rust
     tokio::spawn(async {
         loop {
             if reqwest::get("http://localhost:3031/health").await.is_err() {
                 restart_chat_server().await;
             }
             tokio::time::sleep(Duration::from_secs(30)).await;
         }
     });
     ```

3. **Error Handling**: What if Node.js sidecar is down?
   - **Response**: Return 503 Service Unavailable with retry-after header
   - **UI**: Show "AI service unavailable" banner with retry button

4. **Load Balancing**: Can we run multiple Node.js sidecars?
   - **Yes**: Use round-robin or least-connections
   - **Implementation**: Rust HTTP server maintains pool of sidecar URLs
   - **Scaling**: 1 sidecar per 100 concurrent users

5. **Future Migration**: If we need to switch to Rust-only?
   - **Strategy**: Keep HTTP interface identical (versioned API)
   - **Timeline**: Only if latency becomes critical (<100ms requirement)
   - **Effort**: 2-3 weeks to implement OpenAI streaming in Rust

---

## Alternative: Pure Rust Implementation (Future)

If HTTP IPC becomes a bottleneck (unlikely), here's the Rust-only path:

### Dependencies
```toml
[dependencies]
reqwest = { version = "0.11", features = ["stream"] }
serde_json = "1.0"
tokio-stream = "0.1"
async-openai = "0.18"  # Or call API directly
```

### Implementation
```rust
use async_openai::{Client, types::*};

async fn chat_handler(
    State(openai): State<Client>,
    Json(req): Json<ChatRequest>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let stream = openai
        .chat()
        .create_stream(CreateChatCompletionRequest {
            model: "gpt-4o".to_string(),
            messages: req.messages,
            tools: Some(vec![/* tool definitions */]),
            stream: Some(true),
            ..Default::default()
        })
        .await
        .unwrap();
    
    let sse_stream = stream.map(|chunk| {
        match chunk {
            Ok(response) => {
                // Parse tool calls, execute tools, inject results
                Event::default().json_data(&response).unwrap()
            }
            Err(e) => Event::default().data(&format!("Error: {}", e)),
        }
    });
    
    Sse::new(sse_stream)
}
```

### Challenges
1. **Tool Calling**: Must manually handle:
   - Parse `tool_calls` from streaming response
   - Execute tools (call LeanSpec Core functions)
   - Inject results back into conversation (new API call with `tool` role)
   - Handle parallel tool calls
   - Multi-step orchestration logic

2. **Provider Differences**:
   - OpenAI: `tools` parameter with JSON schema
   - Anthropic: Different tool format, requires Claude SDK
   - Deepseek: Limited tool support

3. **Error Recovery**: No built-in retry logic like AI SDK

**Estimated Effort**: 8-10 development days vs 2-3 days with Node.js sidecar

---

## Decision Matrix

| Criteria          | HTTP IPC  | napi-rs   | Rust-only |
| ----------------- | --------- | --------- | --------- |
| Development Speed | ⭐⭐⭐⭐⭐     | ⭐⭐        | ⭐⭐⭐       |
| Latency           | ⭐⭐⭐⭐      | ⭐⭐⭐⭐⭐     | ⭐⭐⭐⭐⭐     |
| Build Complexity  | ⭐⭐⭐⭐⭐     | ⭐         | ⭐⭐⭐       |
| Debug Experience  | ⭐⭐⭐⭐⭐     | ⭐⭐        | ⭐⭐⭐⭐      |
| Deployment        | ⭐⭐⭐⭐      | ⭐⭐⭐       | ⭐⭐⭐⭐⭐     |
| Cross-platform    | ⭐⭐⭐⭐⭐     | ⭐⭐        | ⭐⭐⭐⭐      |
| Maintainability   | ⭐⭐⭐⭐⭐     | ⭐⭐        | ⭐⭐⭐       |
| Binary Size       | ⭐⭐⭐       | ⭐⭐⭐⭐      | ⭐⭐⭐⭐⭐     |
| **Total**         | **35/40** | **21/40** | **31/40** |

**Winner**: HTTP IPC (35/40)

---

## Next Steps

1. ✅ **Decision made**: Use HTTP IPC with Node.js sidecar
2. [ ] Create `packages/chat-server` package
3. [ ] Implement Rust HTTP proxy handler
4. [ ] Test end-to-end streaming
5. [ ] Add Docker Compose setup
6. [ ] Document in main README

**Timeline**: Week 1 (3 days for basic prototype)
