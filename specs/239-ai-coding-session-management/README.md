---
status: in-progress
created: 2026-01-28
priority: high
tags:
- ai-agents
- sessions
- infrastructure
- persistence
- monitoring
- orchestration
created_at: 2026-01-28T01:35:46.459300Z
updated_at: 2026-01-28T01:40:28.412619Z
transitions:
- status: in-progress
  at: 2026-01-28T01:40:28.412619Z
---

# AI Coding Session Management and Monitoring Infrastructure

## Overview

### Problem

LeanSpec has high-level orchestration vision (specs 168, 221) but lacks the fundamental session management infrastructure:

- **No session execution engine** - Cannot actually trigger Claude Code, Copilot, Codex-CLI, or other AI coding tools
- **No session persistence** - Logs and state lost after process exits
- **No real-time monitoring** - Cannot view live output from running sessions
- **No spec-session relationship** - Cannot track multiple implementation attempts per spec
- **No UI visibility** - Sessions not displayed or manageable in Desktop/Web UI

This spec provides the foundation layer that specs 168 and 221 depend on.

### Solution

Build a complete session management system:

1. **Session Execution Engine** - Trigger and manage AI coding tool processes
2. **Session Persistence Layer** - Store session metadata, logs, and outcomes
3. **Real-time Monitoring** - Stream session output and status updates
4. **Spec-Session Relationships** - Link multiple sessions to specs
5. **UI Integration** - Display sessions in Desktop and Web interfaces

### Scope

**In Scope**:
- Session lifecycle (create, start, monitor, stop, archive)
- Support for major AI coding tools (Claude Code, Copilot, Codex-CLI, OpenCode)
- SQLite-based session storage
- Real-time log streaming via WebSocket
- Session history and replay
- UI components for session management

**Out of Scope** (handled by other specs):
- Autonomous quality loops (Ralph mode - spec 171)
- Desktop kanban board UI (spec 168)
- Chatbot orchestration (spec 94)
- Agent Skills methodology (spec 211)

## Design

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                  Session Management Layer                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │           Session Execution Engine (Rust)              │  │
│  │  • Process spawning and management                     │  │
│  │  • PTY/TTY handling for interactive tools              │  │
│  │  • Environment setup and teardown                      │  │
│  │  • Tool-specific adapters (Claude, Copilot, etc.)     │  │
│  └─────────────────┬──────────────────────────────────────┘  │
│                    │ logs to                                 │
│  ┌─────────────────▼──────────────────────────────────────┐  │
│  │         Session Persistence Layer (SQLite)             │  │
│  │                                                         │  │
│  │  sessions:                                             │  │
│  │    id, spec_id, tool, status, started_at, ended_at    │  │
│  │  session_logs:                                         │  │
│  │    id, session_id, timestamp, level, message           │  │
│  │  session_events:                                       │  │
│  │    id, session_id, type, data, timestamp               │  │
│  └─────────────────┬──────────────────────────────────────┘  │
│                    │ streams via                             │
│  ┌─────────────────▼──────────────────────────────────────┐  │
│  │         Real-time Monitoring (WebSocket)               │  │
│  │  • Log streaming to connected clients                  │  │
│  │  • Status update broadcasting                          │  │
│  │  • Session lifecycle events                            │  │
│  └─────────────────┬──────────────────────────────────────┘  │
│                    │ consumed by                             │
│  ┌─────────────────▼──────────────────────────────────────┐  │
│  │                UI Components                           │  │
│  │  • Session list view (per spec)                        │  │
│  │  • Session detail view (logs, status)                  │  │
│  │  • Real-time terminal output                           │  │
│  │  • Session controls (pause, stop, restart)             │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Data Model

```sql
-- Sessions table
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,           -- UUID
    project_path TEXT NOT NULL,
    spec_id TEXT,                  -- Optional: link to spec
    tool TEXT NOT NULL,            -- 'claude', 'copilot', 'codex', 'opencode'
    mode TEXT NOT NULL,            -- 'guided', 'autonomous', 'ralph'
    status TEXT NOT NULL,          -- 'pending', 'running', 'paused', 'completed', 'failed', 'cancelled'
    exit_code INTEGER,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_ms INTEGER,
    token_count INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Session metadata (flexible key-value for tool-specific data)
CREATE TABLE session_metadata (
    session_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (session_id, key),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Session logs (stdout/stderr captured)
CREATE TABLE session_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    level TEXT NOT NULL,          -- 'stdout', 'stderr', 'debug', 'info', 'error'
    message TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Session events (lifecycle events for analytics)
CREATE TABLE session_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,     -- 'started', 'paused', 'resumed', 'completed', 'failed', 'cancelled'
    data TEXT,                     -- JSON payload
    timestamp TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_sessions_spec ON sessions(spec_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_tool ON sessions(tool);
CREATE INDEX idx_session_logs_session ON session_logs(session_id);
CREATE INDEX idx_session_events_session ON session_events(session_id);
```

### Tool Adapters

Each AI coding tool has a specific adapter:

```rust
// Core trait for all tool adapters
pub trait ToolAdapter {
    fn name(&self) -> &str;
    fn validate_environment(&self) -> Result<()>;
    fn spawn_session(&self, config: SessionConfig) -> Result<SessionProcess>;
    fn supports_pty(&self) -> bool;
}

// Claude Code adapter
pub struct ClaudeAdapter {
    binary_path: PathBuf,
}

impl ToolAdapter for ClaudeAdapter {
    fn name(&self) -> &str { "claude" }
    
    fn validate_environment(&self) -> Result<()> {
        // Check if claude binary exists
        // Verify API key in environment
        // Test connection to Anthropic API
    }
    
    fn spawn_session(&self, config: SessionConfig) -> Result<SessionProcess> {
        // Build command: claude code --spec {spec_path}
        // Set up PTY for interactive mode
        // Spawn process with proper environment
    }
    
    fn supports_pty(&self) -> bool { true }
}

// GitHub Copilot CLI adapter
pub struct CopilotAdapter {
    binary_path: PathBuf,
}

impl ToolAdapter for CopilotAdapter {
    fn name(&self) -> &str { "copilot" }
    
    fn validate_environment(&self) -> Result<()> {
        // Check gh copilot extension installed
        // Verify authentication: gh auth status
    }
    
    fn spawn_session(&self, config: SessionConfig) -> Result<SessionProcess> {
        // Build command: gh copilot suggest
        // Handle interactive prompts
    }
    
    fn supports_pty(&self) -> bool { true }
}

// Codex-CLI adapter
pub struct CodexAdapter {
    binary_path: PathBuf,
}

// OpenCode adapter
pub struct OpenCodeAdapter {
    binary_path: PathBuf,
}

// Tool manager - registry of all adapters
pub struct ToolManager {
    adapters: HashMap<String, Box<dyn ToolAdapter>>,
}

impl ToolManager {
    pub fn new() -> Self {
        let mut adapters: HashMap<String, Box<dyn ToolAdapter>> = HashMap::new();
        adapters.insert("claude".to_string(), Box::new(ClaudeAdapter::new()));
        adapters.insert("copilot".to_string(), Box::new(CopilotAdapter::new()));
        adapters.insert("codex".to_string(), Box::new(CodexAdapter::new()));
        adapters.insert("opencode".to_string(), Box::new(OpenCodeAdapter::new()));
        Self { adapters }
    }
    
    pub fn get(&self, tool: &str) -> Option<&dyn ToolAdapter> {
        self.adapters.get(tool).map(|b| b.as_ref())
    }
}
```

### Session Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│                 Session Lifecycle                        │
└─────────────────────────────────────────────────────────┘

1. CREATE
   User: lean-spec session create --spec 171 --tool claude
   System: 
     → Generate session ID
     → Insert into sessions table (status: pending)
     → Log event: created
     → Return session ID

2. START
   User: lean-spec session start <session_id>
   System:
     → Load session from database
     → Validate tool environment
     → Spawn process with PTY
     → Update status: running
     → Log event: started
     → Begin log streaming

3. MONITOR
   User: lean-spec session logs <session_id> --follow
   System:
     → Query session_logs where session_id = ?
     → Stream new logs via WebSocket
     → Update UI in real-time

4. PAUSE (optional)
   User: lean-spec session pause <session_id>
   System:
     → Send SIGSTOP to process
     → Update status: paused
     → Log event: paused

5. RESUME (optional)
   User: lean-spec session resume <session_id>
   System:
     → Send SIGCONT to process
     → Update status: running
     → Log event: resumed

6. STOP
   User: lean-spec session stop <session_id>
   System:
     → Send SIGTERM to process
     → Wait for graceful shutdown (10s timeout)
     → Force kill if needed (SIGKILL)
     → Update status: cancelled
     → Set ended_at timestamp
     → Log event: cancelled

7. COMPLETE (automatic)
   Process exits with code 0:
     → Update status: completed
     → Set ended_at, exit_code, duration_ms
     → Log event: completed
   Process exits with code != 0:
     → Update status: failed
     → Set ended_at, exit_code
     → Log event: failed

8. ARCHIVE (optional)
   User: lean-spec session archive <session_id>
   System:
     → Export logs to file: .leanspec/sessions/{session_id}.log
     → Keep metadata in database
     → Optionally compress logs
```

### CLI Commands

```bash
# Create a new session
lean-spec session create --spec <spec> --tool <tool> [--mode <mode>]

# Start a session
lean-spec session start <session_id>

# Create and start in one command
lean-spec session run --spec <spec> --tool <tool> [--mode <mode>]

# List sessions
lean-spec session list [--spec <spec>] [--status <status>] [--tool <tool>]

# View session details
lean-spec session view <session_id>

# View session logs
lean-spec session logs <session_id> [--follow] [--tail <n>]

# Monitor session in real-time
lean-spec session monitor <session_id>

# Pause/Resume session
lean-spec session pause <session_id>
lean-spec session resume <session_id>

# Stop session
lean-spec session stop <session_id>

# Archive session
lean-spec session archive <session_id>

# Delete session
lean-spec session delete <session_id>
```

### HTTP API Endpoints

```typescript
// Session management
POST   /api/sessions                 // Create session
POST   /api/sessions/:id/start       // Start session
POST   /api/sessions/:id/pause       // Pause session
POST   /api/sessions/:id/resume      // Resume session
POST   /api/sessions/:id/stop        // Stop session
GET    /api/sessions                 // List sessions
GET    /api/sessions/:id             // Get session details
GET    /api/sessions/:id/logs        // Get session logs
DELETE /api/sessions/:id             // Delete session

// Real-time monitoring
WS     /api/sessions/:id/stream      // WebSocket for live logs
```

### WebSocket Protocol

```typescript
// Client -> Server
{
  "type": "subscribe",
  "session_id": "uuid"
}

{
  "type": "unsubscribe",
  "session_id": "uuid"
}

// Server -> Client
{
  "type": "log",
  "session_id": "uuid",
  "timestamp": "2026-01-28T12:34:56Z",
  "level": "stdout",
  "message": "Generating code..."
}

{
  "type": "status",
  "session_id": "uuid",
  "status": "running",
  "progress": 45  // Optional: percentage
}

{
  "type": "event",
  "session_id": "uuid",
  "event_type": "completed",
  "data": {
    "exit_code": 0,
    "duration_ms": 123456
  }
}
```

### UI Components

#### 1. Session List View (per spec)

```
╔══════════════════════════════════════════════════════════╗
║ Spec: 171-ralph-mode                                     ║
║                                                          ║
║ 📋 Sessions (3)                          [+ New Session] ║
║                                                          ║
║ ┌────────────────────────────────────────────────────┐  ║
║ │ 🟢 Session #3                          2m ago      │  ║
║ │    Tool: Claude | Mode: Ralph | Running           │  ║
║ │    Progress: Iteration 4/10 - Tests passing       │  ║
║ │    [View Logs] [Stop]                              │  ║
║ └────────────────────────────────────────────────────┘  ║
║                                                          ║
║ ┌────────────────────────────────────────────────────┐  ║
║ │ ✅ Session #2                          1h ago      │  ║
║ │    Tool: Copilot | Mode: Guided | Completed       │  ║
║ │    Duration: 15m 32s | Exit: Success              │  ║
║ │    [View Logs] [Replay]                            │  ║
║ └────────────────────────────────────────────────────┘  ║
║                                                          ║
║ ┌────────────────────────────────────────────────────┐  ║
║ │ ❌ Session #1                          3h ago      │  ║
║ │    Tool: Claude | Mode: Autonomous | Failed       │  ║
║ │    Duration: 8m 12s | Exit: Error                 │  ║
║ │    [View Logs] [Retry]                             │  ║
║ └────────────────────────────────────────────────────┘  ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

#### 2. Session Detail View (real-time logs)

```
╔══════════════════════════════════════════════════════════╗
║ Session #3 - Running                    [Pause] [Stop]   ║
║ Spec: 171-ralph-mode | Tool: Claude | Mode: Ralph       ║
║ Started: 2m ago | Duration: 2m 15s                       ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║ 📊 Progress: Iteration 4/10                              ║
║ [███████████░░░░░░░░░] 45%                               ║
║                                                          ║
║ 📝 Terminal Output:                        [Clear] [↓]   ║
║ ┌────────────────────────────────────────────────────┐  ║
║ │ $ claude code --spec specs/171-ralph-mode/SPEC.md │  ║
║ │                                                    │  ║
║ │ 🔍 Analyzing spec requirements...                  │  ║
║ │ ✓ Loaded 2000 tokens from spec                    │  ║
║ │                                                    │  ║
║ │ 🚀 Iteration 1: Generating implementation...       │  ║
║ │ ✓ Created 5 files                                  │  ║
║ │ ⚡ Running tests...                                │  ║
║ │ ✗ Tests failed (2 errors)                          │  ║
║ │                                                    │  ║
║ │ 🔧 Iteration 2: Fixing errors...                   │  ║
║ │ ✓ Updated 2 files                                  │  ║
║ │ ⚡ Running tests...                                │  ║
║ │ ✗ Tests failed (1 error)                           │  ║
║ │                                                    │  ║
║ │ 🔧 Iteration 3: Fixing error...                    │  ║
║ │ ✓ Updated 1 file                                   │  ║
║ │ ⚡ Running tests...                                │  ║
║ │ ✓ All tests passed!                                │  ║
║ │                                                    │  ║
║ │ 🔍 Iteration 4: Verifying spec compliance...       │  ║
║ │ ⚠ Incomplete (60%) - missing edge cases            │  ║
║ │ 🚀 Implementing missing requirements...            │  ║
║ │ ▋                                                  │  ║
║ └────────────────────────────────────────────────────┘  ║
║                                                          ║
║ 💾 [Export Logs] [Share Session]                         ║
╚══════════════════════════════════════════════════════════╝
```

#### 3. Session Controls Component

```typescript
interface SessionControlsProps {
  sessionId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  onRestart?: () => void;
}

export function SessionControls({ sessionId, status, ...handlers }: SessionControlsProps) {
  return (
    <div className="session-controls">
      {status === 'running' && (
        <>
          <Button onClick={handlers.onPause} icon={<PauseIcon />}>
            Pause
          </Button>
          <Button onClick={handlers.onStop} variant="danger" icon={<StopIcon />}>
            Stop
          </Button>
        </>
      )}
      
      {status === 'paused' && (
        <>
          <Button onClick={handlers.onResume} icon={<PlayIcon />}>
            Resume
          </Button>
          <Button onClick={handlers.onStop} variant="danger" icon={<StopIcon />}>
            Stop
          </Button>
        </>
      )}
      
      {(status === 'completed' || status === 'failed') && (
        <Button onClick={handlers.onRestart} icon={<RestartIcon />}>
          Retry
        </Button>
      )}
    </div>
  );
}
```

### Integration with Existing Specs

**Spec 168 (Orchestration Platform)** depends on this spec:
- Desktop app "Implement with AI" button calls session API
- Real-time terminal output powered by WebSocket streaming
- Session history displayed in spec detail view

**Spec 221 (Unified Workflow)** depends on this spec:
- CLI agent commands use session management under the hood
- Ralph mode creates persistent sessions for iteration tracking
- Chatbot triggers sessions via HTTP API

**Spec 171 (Ralph Mode)** depends on this spec:
- Each Ralph iteration is a session event
- Test results logged to session_logs
- Critic verification events stored in session_events

## Plan

### Phase 1: Core Infrastructure (Weeks 1-2)

- [x] **Database Schema**
  - [x] Create migrations for sessions tables
  - [x] Implement SQLite persistence layer
  - [x] Add indexes for performance
  - [x] Write database tests

- [x] **Session Manager (Rust)**
  - [x] Define SessionManager struct
  - [x] Implement CRUD operations
  - [x] Add session lifecycle methods
  - [x] Write unit tests

- [x] **Tool Adapter Framework**
  - [x] Define ToolAdapter trait
  - [x] Implement ToolManager registry
  - [x] Create adapter discovery system
  - [x] Add validation and error handling

### Phase 2: Tool Adapters (Weeks 3-4)

- [x] **Claude Code Adapter**
  - [x] Research Claude Code CLI API
  - [x] Implement ClaudeAdapter struct
  - [x] Handle PTY for interactive mode
  - [x] Test with sample spec

- [x] **GitHub Copilot Adapter**
  - [x] Research gh copilot CLI API
  - [x] Implement CopilotAdapter struct
  - [x] Handle authentication flow
  - [x] Test with sample spec

- [x] **Codex-CLI Adapter**
  - [x] Research Codex-CLI API
  - [x] Implement CodexAdapter struct
  - [x] Test with sample spec

- [x] **OpenCode Adapter**
  - [x] Research OpenCode CLI
  - [x] Implement OpenCodeAdapter struct
  - [x] Test with sample spec

### Phase 3: Process Management (Week 5)

- [x] **Session Process**
  - [x] Implement PTY/TTY spawning
  - [x] Add stdout/stderr capturing
  - [x] Handle process lifecycle (start, stop)
  - [ ] Handle process lifecycle (pause, resume)
  - [x] Implement graceful shutdown

- [x] **Log Collection**
  - [x] Stream logs to database
  - [x] Buffer logs for WebSocket
  - [ ] Implement log rotation/archival
  - [ ] Add log compression

### Phase 4: HTTP API & WebSocket (Week 6)

- [x] **HTTP Endpoints**
  - [x] POST /api/sessions (create)
  - [x] POST /api/sessions/:id/start
  - [x] POST /api/sessions/:id/stop
  - [x] GET /api/sessions (list)
  - [x] GET /api/sessions/:id (details)
  - [x] GET /api/sessions/:id/logs
  - [x] DELETE /api/sessions/:id
  - [ ] POST /api/sessions/:id/pause (not implemented)
  - [ ] POST /api/sessions/:id/resume (not implemented)

- [x] **WebSocket Server**
  - [x] Implement WS handler in Rust
  - [x] Subscribe/unsubscribe protocol
  - [x] Broadcast session events
  - [x] Stream logs in real-time

### Phase 5: CLI Commands (Week 7)

- [x] **Session Commands**
  - [x] lean-spec session create
  - [x] lean-spec session start
  - [x] lean-spec session run (create + start)
  - [x] lean-spec session list
  - [x] lean-spec session view
  - [x] lean-spec session logs
  - [ ] lean-spec session pause/resume (not implemented)
  - [x] lean-spec session stop
  - [x] lean-spec session delete
  - [ ] lean-spec session archive (not implemented)

### Phase 6: UI Components (Weeks 8-9)

- [x] **Session Create Dialog**
  - [x] Tool selection
  - [x] Mode selection  
  - [x] Spec selection
  - [x] Create and start integration

- [ ] **Session List View**
  - [ ] Fetch sessions from API
  - [ ] Display session cards
  - [ ] Status indicators and badges
  - [ ] Filter by status/tool

- [ ] **Session Detail View**
  - [ ] Real-time terminal output
  - [ ] WebSocket integration
  - [ ] Auto-scroll and scroll lock
  - [ ] Session controls (pause/stop)

- [ ] **Session Integration**
  - [ ] Add session section to spec detail
  - [x] "New Session" button
  - [ ] Session history timeline
  - [ ] Quick actions (retry, archive)

### Phase 7: Testing & Polish (Week 10)

- [x] **Unit Tests**
  - [x] SessionManager CRUD operations
  - [x] Tool adapter validation
  - [x] Database persistence layer

- [ ] **Integration Tests**
  - [ ] End-to-end session lifecycle
  - [ ] WebSocket streaming accuracy
  - [ ] Multi-session concurrency

- [ ] **Performance Testing**
  - [ ] Log streaming latency (<500ms)
  - [ ] Database query performance
  - [ ] WebSocket connection stability
  - [ ] Memory usage with long-running sessions

- [ ] **Documentation**
  - [ ] API documentation
  - [ ] CLI command reference
  - [ ] Tool adapter developer guide
  - [ ] Troubleshooting guide

## Test

### Unit Tests
- [x] SessionManager CRUD operations
- [x] Tool adapter validation
- [x] Process spawning and control
- [x] Log collection and buffering
- [x] Database migrations

### Integration Tests
- [ ] Full session lifecycle (create → start → complete)
- [ ] WebSocket log streaming
- [ ] HTTP API endpoints
- [ ] CLI commands
- [ ] Multi-session isolation

### Performance Tests
- [ ] Log streaming latency <500ms
- [ ] 100+ concurrent sessions
- [ ] 1M+ log entries query time
- [ ] WebSocket connection stability (24h+)

### User Acceptance Tests
- [x] Create session from Desktop UI
- [ ] Monitor session in real-time
- [ ] Pause and resume session
- [x] View historical session logs
- [ ] Retry failed session

## Notes

### Tool Research

**Claude Code**:
- May not have public CLI yet (as of Jan 2025)
- Fallback: Use Anthropic API directly with system prompts
- Alternative: agent-relay Claude runner

**GitHub Copilot CLI**:
- Available via: gh copilot suggest
- Requires: gh CLI + copilot extension
- Interactive prompts via stdin/stdout

**Codex-CLI**:
- Open source: github.com/microsoft/codex-cli
- Uses OpenAI Codex API (deprecated?)
- May need migration to GPT-4

**OpenCode**:
- Research needed for CLI existence
- May be web-only tool

### Session Security

**Considerations**:
- Sessions run with user's permissions
- Environment variables may contain secrets
- Logs may contain API keys or tokens

**Mitigations**:
- Sanitize environment variables before logging
- Redact common secret patterns (API_KEY, TOKEN, etc.)
- Encrypt session_logs table at rest
- Add access controls (user/project isolation)

### Token Tracking

**Why Track Tokens?**:
- Cost estimation per session
- Context economy monitoring
- Ralph mode iteration budgets

**Implementation**:
- Parse tool output for token counts
- Store in session_metadata
- Display in UI (e.g., "$1.23 estimated cost")
- Alert when approaching limits

### Session Recovery

**Scenarios**:
- Desktop app crashes during session
- HTTP server restarts
- System reboot

**Solution**:
- Sessions persist in SQLite
- Running sessions marked as "interrupted" on restart
- UI prompts: "Resume interrupted sessions?"
- Automatic cleanup after 24h

### Related Specs

**Dependencies**:
- 186-rust-http-server: HTTP API foundation
- 187-vite-spa-migration: UI foundation

**Dependents**:
- 168-leanspec-orchestration-platform: Uses sessions for desktop orchestration
- 221-ai-orchestration-integration: Uses sessions for unified workflow
- 171-burst-mode-orchestrator: Uses sessions for Ralph mode iterations
- 094-ai-chatbot-web-integration: Uses sessions for conversational orchestration

### Future Enhancements

**Cloud Sync**:
- Sync sessions to cloud storage
- Share session replays with team
- Cross-device session continuity

**Session Templates**:
- Save successful sessions as templates
- Replay with different specs
- Share templates with community

**AI Assistance**:
- Analyze failed sessions for patterns
- Suggest fixes based on error logs
- Auto-generate retry commands

**Analytics**:
- Session success rate by tool
- Average duration per spec type
- Most common failure modes
- Token usage trends