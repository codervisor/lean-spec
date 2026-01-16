# AI Chatbot Implementation Guide

This document contains detailed implementation guidance for building the AI chatbot feature.

## npm Distribution Strategy

**Package Structure**:
```
@leanspec/chat-server           # Node.js chat server (separate package)
├── src/
│   ├── index.ts                # Main server entry
│   ├── tools/                  # LeanSpec tool definitions
│   └── prompts.ts              # System prompts
├── bin/
│   └── leanspec-chat.js        # CLI entry point
└── package.json                # Standalone package

@leanspec/http-server           # Rust HTTP server (platform binaries)
├── Adds /api/chat proxy route
└── No changes to existing distribution

@leanspec/ui                    # UI package
├── optionalDependencies:
│   └── "@leanspec/chat-server": "workspace:*"
└── Uses chat-server only when AI features enabled
```

**Publishing Order** (via CI):
1. Platform binaries for `@leanspec/http-server` (existing)
2. `@leanspec/chat-server` (new Node.js package)
3. `@leanspec/ui` (depends on both)

**Why separate package?**
- Optional dependency: Users without AI features don't download Node.js runtime
- Independent versioning: Update AI SDK without full UI rebuild
- Smaller bundle: ~5MB vs inlining 50MB+ Node.js dependencies
- Reusable: Desktop app can optionally include same package

## CI/CD Pipeline

**Build Matrix** (`.github/workflows/publish.yml`):
```yaml
jobs:
  # Step 1: Build Rust binaries (existing, no changes)
  rust-binaries: ...
  
  # Step 2: Build & test chat-server (NEW)
  build-chat-server:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd packages/chat-server
          pnpm install --frozen-lockfile
      
      - name: Build
        run: |
          cd packages/chat-server
          pnpm build
      
      - name: Run tests
        run: |
          cd packages/chat-server
          pnpm test
        env:
          # Use mock AI provider for tests
          OPENAI_API_KEY: sk-test-mock-key
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: chat-server-dist
          path: packages/chat-server/dist/
  
  # Step 3: Publish platform packages (existing)
  publish-platform: ...
  
  # Step 4: Publish chat-server (NEW)
  publish-chat-server:
    needs: build-chat-server
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: chat-server-dist
          path: packages/chat-server/dist/
      
      - name: Sync versions
        run: pnpm sync-versions
      
      - name: Publish to npm
        run: |
          cd packages/chat-server
          TAG_ARG=""
          if [ "${{ github.event_name }}" = "workflow_dispatch" ] && [ "${{ inputs.dev }}" = "true" ]; then
            TAG_ARG="--tag dev"
          fi
          npm publish --access public $TAG_ARG
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
  
  # Step 5: Publish main packages (UPDATED - add dependency)
  publish-main:
    needs: [publish-platform, publish-chat-server]  # Wait for chat-server
    runs-on: ubuntu-latest
    # ... rest same as existing
```

**Testing Strategy**:
```yaml
# packages/chat-server/package.json
{
  "scripts": {
    "test": "vitest run",
    "test:integration": "vitest run --config vitest.integration.config.ts"
  }
}

# tests/
├── unit/
│   ├── tools.test.ts           # Tool schema validation
│   └── prompts.test.ts         # System prompt formatting
└── integration/
    ├── streaming.test.ts       # Mock AI SDK streaming
    └── tool-execution.test.ts  # Tool calls with test data
```

## Process Management

### Development (local dev environment)

```bash
# Terminal 1: Rust HTTP server
pnpm dev:http-server

# Terminal 2: Node.js chat server
cd packages/chat-server
pnpm dev

# Terminal 3: Vite UI
cd packages/ui
pnpm dev

# Or use concurrently:
pnpm dev:all  # Starts all 3 in parallel
```

### Production - Option A: Separate Services (recommended for scale)

```yaml
# docker-compose.yml
version: '3.8'
services:
  http-server:
    image: leanspec/http-server:latest
    ports:
      - "3030:3030"
    environment:
      - LEANSPEC_CHAT_SOCKET=/var/run/leanspec/chat.sock
    volumes:
      - chat-socket:/var/run/leanspec
    depends_on:
      - chat-server
  
  chat-server:
    image: leanspec/chat-server:latest
    environment:
      - LEANSPEC_CHAT_SOCKET=/var/run/leanspec/chat.sock
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - chat-socket:/var/run/leanspec
    healthcheck:
      test: ["CMD", "curl", "-f", "--unix-socket", "/var/run/leanspec/chat.sock", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  chat-socket:
```

### Production - Option B: Embedded (single binary, more complex)

```rust
// rust/leanspec-http/src/chat_server.rs
use std::process::{Command, Child};

pub struct ChatServerManager {
    process: Option<Child>,
    socket_path: PathBuf,
}

impl ChatServerManager {
    pub fn start() -> Result<Self> {
        // Find Node.js binary
        let node = which::which("node")?;
        
        // Find chat-server package (in node_modules)
        let server_path = PathBuf::from("node_modules/@leanspec/chat-server/dist/index.js");
        
        // Start process
        let process = Command::new(node)
            .arg(&server_path)
            .env("LEANSPEC_CHAT_SOCKET", "/tmp/leanspec-chat.sock")
            .spawn()?;
        
        Ok(Self {
            process: Some(process),
            socket_path: PathBuf::from("/tmp/leanspec-chat.sock"),
        })
    }
    
    pub fn health_check(&self) -> bool {
        // Ping /health endpoint
        // ...
    }
    
    pub fn restart(&mut self) -> Result<()> {
        self.stop()?;
        *self = Self::start()?;
        Ok(())
    }
    
    pub fn stop(&mut self) -> Result<()> {
        if let Some(mut child) = self.process.take() {
            child.kill()?;
            child.wait()?;
        }
        Ok(())
    }
}

// In main.rs
#[tokio::main]
async fn main() {
    // Start chat server
    let chat_server = ChatServerManager::start()
        .expect("Failed to start chat server");
    
    // Health check loop
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(30)).await;
            if !chat_server.health_check() {
                eprintln!("Chat server unhealthy, restarting...");
                chat_server.restart().ok();
            }
        }
    });
    
    // Start HTTP server
    // ...
}
```

### Desktop Integration

```toml
# packages/desktop/package.json
{
  "optionalDependencies": {
    "@leanspec/chat-server": "workspace:*"
  }
}
```

```rust
// packages/desktop/src-tauri/src/main.rs
#[cfg(feature = "ai-chat")]
use leanspec_http::chat_server::ChatServerManager;

fn main() {
    #[cfg(feature = "ai-chat")]
    let _chat = ChatServerManager::start().ok();
    
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## Deployment Scenarios

**Scenario 1: Local Development** (default)
```
Developer's Machine:
├── pnpm dev:all → 3 processes
│   ├── Rust HTTP :3030
│   ├── Node.js chat (Unix socket)
│   └── Vite UI :5173
└── Browser → localhost:5173
```

**Scenario 2: Production Web (Docker)**
```
Cloud VM / Container:
├── Docker Compose
│   ├── http-server container (:3030)
│   ├── chat-server container (socket)
│   └── Nginx (reverse proxy + static files)
└── Users → https://app.leanspec.io
```

**Scenario 3: Desktop App**
```
User's Machine:
├── Tauri App
│   ├── Embedded HTTP server (in-process)
│   ├── Chat server (optional, subprocess if feature enabled)
│   └── UI (bundled static files)
└── No network required (localhost only)
```

**Scenario 4: Self-Hosted (systemd)**
```
Linux Server:
├── /usr/bin/leanspec-http (systemd service)
├── /usr/bin/node + chat-server (systemd service)
└── Caddy reverse proxy
```

## Environment Variables

```bash
# IPC Configuration (Node.js chat server)
LEANSPEC_CHAT_SOCKET=/tmp/leanspec-chat.sock  # Default: Unix socket
LEANSPEC_CHAT_TRANSPORT=http                  # Fallback: HTTP mode
LEANSPEC_CHAT_PORT=0                          # Dynamic port (0 = auto)
LEANSPEC_CHAT_PORT_FILE=~/.leanspec/chat-port.txt

# AI Provider Keys
AI_GATEWAY_API_KEY=ag_...      # Recommended: Vercel AI Gateway
# OR direct keys:
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEEPSEEK_API_KEY=...

# Model Config
DEFAULT_MODEL=openai/gpt-4o
MAX_STEPS=10

# Process Management
CHAT_SERVER_HEALTH_CHECK_INTERVAL=30  # seconds
CHAT_SERVER_RESTART_ATTEMPTS=3        # before giving up
```

## Package Build Configuration

### chat-server/package.json

```json
{
  "name": "@leanspec/chat-server",
  "version": "0.3.0",
  "description": "AI chatbot server for LeanSpec",
  "main": "dist/index.js",
  "bin": {
    "leanspec-chat": "dist/index.js"
  },
  "files": [
    "dist/**/*",
    "README.md"
  ],
  "scripts": {
    "build": "esbuild src/index.ts --bundle --platform=node --target=node18 --outfile=dist/index.js --format=cjs --external:express --external:ai --external:@ai-sdk/*",
    "dev": "tsx watch src/index.ts",
    "test": "vitest",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "ai": "^6.0.0",
    "@ai-sdk/openai": "^1.0.0",
    "@ai-sdk/anthropic": "^1.0.0",
    "express": "^4.18.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "esbuild": "^0.19.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0",
    "vitest": "^1.2.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## Testing Implementation

### Unit Tests

```typescript
// packages/chat-server/tests/unit/tools.test.ts
import { describe, it, expect } from 'vitest';
import { listSpecsTool, createSpecTool } from '../../src/tools/leanspec-tools';

describe('LeanSpec Tools', () => {
  it('listSpecsTool validates schema', () => {
    const validInput = { status: 'in-progress', priority: 'high' };
    expect(() => listSpecsTool.inputSchema.parse(validInput)).not.toThrow();
    
    const invalidInput = { status: 'invalid-status' };
    expect(() => listSpecsTool.inputSchema.parse(invalidInput)).toThrow();
  });

  it('createSpecTool requires name and title', () => {
    const validInput = { name: 'test-spec', title: 'Test Spec' };
    expect(() => createSpecTool.inputSchema.parse(validInput)).not.toThrow();
    
    const missingTitle = { name: 'test-spec' };
    expect(() => createSpecTool.inputSchema.parse(missingTitle)).toThrow();
  });
});
```

### Integration Tests

```typescript
// packages/chat-server/tests/integration/streaming.test.ts
import { describe, it, expect, vi } from 'vitest';
import { streamText } from 'ai';
import request from 'supertest';
import { app } from '../../src/index';

vi.mock('ai', () => ({
  streamText: vi.fn(),
}));

describe('Chat API Streaming', () => {
  it('streams responses from AI provider', async () => {
    const mockStream = {
      pipeDataStreamToResponse: vi.fn(),
    };
    
    vi.mocked(streamText).mockResolvedValue(mockStream as any);
    
    const response = await request(app)
      .post('/api/chat')
      .send({ messages: [{ role: 'user', content: 'Hello' }] });
    
    expect(response.status).toBe(200);
    expect(mockStream.pipeDataStreamToResponse).toHaveBeenCalled();
  });
});
```

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

## Performance Considerations

**Expected Latency**:
- IPC overhead (Unix socket): ~0.7ms
- IPC overhead (HTTP): ~1-2ms
- AI API call: 200-500ms
- **Total**: 200.7-502ms (overhead <1%)

**Caching Strategy**:
- Tool results: 30s TTL
- Spec metadata: 1min TTL
- Project stats: 5min TTL

**Model Selection for Performance**:
- GPT-4o: Fastest, $2.50/$10 per 1M tokens
- Claude Sonnet 4.5: Best reasoning, $3/$15 per 1M tokens
- Deepseek R1: Most cost-effective, $0.55/$2.19 per 1M tokens
