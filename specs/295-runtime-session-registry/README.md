---
status: planned
created: 2026-02-03
priority: high
tags:
- infrastructure
- rust
- sessions
- state-management
- ai-agents
depends_on:
- 292-pty-process-layer
- 293-headless-vte-state-machine
parent: 291-cli-runtime-web-orchestrator
created_at: 2026-02-03T13:48:12.998138Z
updated_at: 2026-02-03T13:54:37.808253Z
---

# Runtime Abstraction & Session Registry

## Overview

### Problem

Current session management (spec 239) lacks:

- **Hot-swap capability**: Can't switch AI tools without restarting the session
- **Detach/re-attach**: Closing browser loses session state
- **Context preservation**: Switching tools loses workspace context
- **Screen snapshots**: No instant UI restore on reconnect

The existing `ToolAdapter` concept (spec 239) treats tools as simple process spawners, not stateful runtimes.

### Solution

Build a **Runtime Abstraction Layer** that treats AI tools as interchangeable, stateful backends within a persistent **Session Registry**. This enables:

1. **Hot-swapping**: Switch from Claude to Copilot mid-session
2. **Detach/re-attach**: Close browser, reconnect later, state preserved
3. **Context sync**: Workspace paths and env vars shared across runtimes
4. **Screen snapshots**: Instant UI restore via Shadow Terminal state

### Scope

**In Scope**:
- Runtime trait interface with state management
- Session Registry with persistence
- Detach/re-attach session lifecycle
- Screen snapshot capture and restore
- Context synchronization between runtimes
- Hot-swap runtime switching

**Out of Scope**:
- PTY spawning (spec 292)
- VTE parsing (spec 293)
- WebSocket protocol (spec 296)
- Web rendering (spec 294)

## Design

### Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                Runtime Abstraction & Session Registry                 │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   ┌───────────────────────────────────────────────────────────────┐  │
│   │                    Session Registry                           │  │
│   │                                                               │  │
│   │   ┌─────────────────────────────────────────────────────┐    │  │
│   │   │                 Active Sessions                      │    │  │
│   │   │                                                      │    │  │
│   │   │  Session A (attached)    Session B (detached)       │    │  │
│   │   │  ├── Runtime: Claude     ├── Runtime: Copilot       │    │  │
│   │   │  ├── PTY: running        ├── PTY: suspended         │    │  │
│   │   │  ├── VTE: live           ├── VTE: frozen snapshot   │    │  │
│   │   │  └── Clients: [ws1]      └── Clients: []            │    │  │
│   │   │                                                      │    │  │
│   │   └─────────────────────────────────────────────────────┘    │  │
│   │                                                               │  │
│   │   ┌─────────────────────────────────────────────────────┐    │  │
│   │   │              Session Persistence (SQLite)            │    │  │
│   │   │                                                      │    │  │
│   │   │  • Session metadata (id, runtime, state, timestamps) │    │  │
│   │   │  • Screen snapshots (frozen VTE state)               │    │  │
│   │   │  • Context data (workspace, env vars)                │    │  │
│   │   │  • Attachment history                                │    │  │
│   │   └─────────────────────────────────────────────────────┘    │  │
│   │                                                               │  │
│   └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│   ┌───────────────────────────────────────────────────────────────┐  │
│   │                   Runtime Manager                             │  │
│   │                                                               │  │
│   │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │  │
│   │   │ Claude   │  │ Copilot  │  │ OpenCode │  │ Gemini   │    │  │
│   │   │ Runtime  │  │ Runtime  │  │ Runtime  │  │ Runtime  │    │  │
│   │   └──────────┘  └──────────┘  └──────────┘  └──────────┘    │  │
│   │                                                               │  │
│   │   • Runtime discovery and registration                       │  │
│   │   • Runtime health monitoring                                 │  │
│   │   • Hot-swap orchestration                                    │  │
│   │   • Resource limit enforcement                                │  │
│   └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│   ┌───────────────────────────────────────────────────────────────┐  │
│   │                  Context Synchronizer                         │  │
│   │                                                               │  │
│   │   • Workspace path propagation                               │  │
│   │   • Environment variable sharing                             │  │
│   │   • Git state synchronization                                │  │
│   │   • Spec context injection                                   │  │
│   └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### Session States

```
                    ┌─────────────┐
                    │   Created   │
                    └──────┬──────┘
                           │ start()
                           ▼
      ┌─────────────────────────────────────────┐
      │                                         │
      ▼                                         │
┌───────────┐  detach()  ┌───────────┐         │
│  Attached │ ─────────► │  Detached │         │
│ (running) │            │(suspended)│         │
└─────┬─────┘ ◄───────── └─────┬─────┘         │
      │          attach()      │               │
      │                        │               │
      │  stop()                │ stop()        │
      │                        │               │
      ▼                        ▼               │
┌───────────┐            ┌───────────┐         │
│  Stopped  │            │  Stopped  │         │
│ (cleanup) │            │ (cleanup) │         │
└───────────┘            └───────────┘         │
      │                        │               │
      │                        │               │
      ▼                        ▼               │
┌────────────────────────────────────────┐     │
│              Archived                  │◄────┘
│  (persisted, PTY terminated, VTE       │
│   snapshot saved for history)          │
└────────────────────────────────────────┘
```

### Data Model

```rust
/// Session state in the registry
pub struct Session {
    pub id: SessionId,
    pub runtime_id: String,
    pub state: SessionState,
    pub created_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
    pub context: SessionContext,
    
    // Runtime state (only when attached)
    pty: Option<PtySession>,
    vte: Option<VteParser>,
    
    // Clients (WebSocket connections)
    clients: Vec<ClientHandle>,
    
    // Frozen state (for detached sessions)
    snapshot: Option<ScreenSnapshot>,
}

#[derive(Debug, Clone)]
pub enum SessionState {
    Created,
    Attached { since: DateTime<Utc> },
    Detached { since: DateTime<Utc>, snapshot: ScreenSnapshot },
    Stopped { exit_code: Option<i32> },
    Archived,
}

/// Context shared across runtimes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionContext {
    pub workspace_path: PathBuf,
    pub spec_id: Option<String>,
    pub environment: HashMap<String, String>,
    pub git_branch: Option<String>,
    pub git_commit: Option<String>,
    pub custom_data: HashMap<String, serde_json::Value>,
}

/// Screen snapshot for instant restore
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenSnapshot {
    pub screen: ScreenState,        // From VTE layer
    pub cursor: CursorState,
    pub modes: TerminalModes,
    pub scrollback_lines: usize,
    pub captured_at: DateTime<Utc>,
}

/// Client connection handle
pub struct ClientHandle {
    pub id: ClientId,
    pub connected_at: DateTime<Utc>,
    pub tx: mpsc::Sender<SessionEvent>,
}
```

### Session Registry API

```rust
pub struct SessionRegistry {
    sessions: Arc<RwLock<HashMap<SessionId, Session>>>,
    runtime_manager: RuntimeManager,
    db: SessionDatabase,
    context_sync: ContextSynchronizer,
}

impl SessionRegistry {
    /// Create a new session with specified runtime
    pub async fn create(
        &self,
        runtime_id: &str,
        context: SessionContext,
    ) -> Result<SessionId, RegistryError>;
    
    /// Start a session (spawn PTY, initialize VTE)
    pub async fn start(&self, session_id: SessionId) -> Result<(), RegistryError>;
    
    /// Attach a client to a session
    pub async fn attach(
        &self,
        session_id: SessionId,
        client: ClientHandle,
    ) -> Result<ScreenSnapshot, RegistryError>;
    
    /// Detach a client from session (session continues running)
    pub async fn detach(
        &self,
        session_id: SessionId,
        client_id: ClientId,
    ) -> Result<(), RegistryError>;
    
    /// Detach all clients and suspend session
    pub async fn suspend(&self, session_id: SessionId) -> Result<(), RegistryError>;
    
    /// Stop a session (terminate PTY, archive data)
    pub async fn stop(&self, session_id: SessionId) -> Result<(), RegistryError>;
    
    /// Hot-swap to a different runtime
    pub async fn swap_runtime(
        &self,
        session_id: SessionId,
        new_runtime_id: &str,
    ) -> Result<(), RegistryError>;
    
    /// List all sessions (with optional filters)
    pub async fn list(
        &self,
        filter: SessionFilter,
    ) -> Result<Vec<SessionSummary>, RegistryError>;
    
    /// Get session details
    pub async fn get(&self, session_id: SessionId) -> Result<Session, RegistryError>;
    
    /// Send input to session
    pub async fn send_input(
        &self,
        session_id: SessionId,
        data: &[u8],
    ) -> Result<(), RegistryError>;
    
    /// Resize session terminal
    pub async fn resize(
        &self,
        session_id: SessionId,
        cols: u16,
        rows: u16,
    ) -> Result<(), RegistryError>;
}
```

### Hot-Swap Runtime Switching

```rust
impl SessionRegistry {
    /// Switch to a different AI runtime without losing context
    pub async fn swap_runtime(
        &self,
        session_id: SessionId,
        new_runtime_id: &str,
    ) -> Result<(), RegistryError> {
        let mut sessions = self.sessions.write().await;
        let session = sessions.get_mut(&session_id)
            .ok_or(RegistryError::NotFound)?;
        
        // 1. Capture current screen snapshot
        let snapshot = session.capture_snapshot()?;
        
        // 2. Gracefully stop current runtime
        if let Some(pty) = session.pty.take() {
            pty.shutdown(Duration::from_secs(5)).await?;
        }
        
        // 3. Get new runtime adapter
        let new_runtime = self.runtime_manager.get(new_runtime_id)?;
        
        // 4. Synchronize context
        self.context_sync.prepare_for_runtime(
            &session.context,
            new_runtime.as_ref(),
        ).await?;
        
        // 5. Spawn new PTY with same context
        let new_pty = PtySession::spawn(
            new_runtime,
            RuntimeConfig {
                working_dir: session.context.workspace_path.clone(),
                spec_path: session.context.spec_id.as_ref()
                    .map(|id| self.resolve_spec_path(id)),
                ..Default::default()
            },
        ).await?;
        
        // 6. Initialize fresh VTE
        let new_vte = VteParser::new(
            snapshot.screen.cols,
            snapshot.screen.rows,
        );
        
        // 7. Update session state
        session.runtime_id = new_runtime_id.to_string();
        session.pty = Some(new_pty);
        session.vte = Some(new_vte);
        session.snapshot = Some(snapshot);  // Keep old snapshot for reference
        
        // 8. Notify clients
        session.broadcast(SessionEvent::RuntimeSwapped {
            from: session.runtime_id.clone(),
            to: new_runtime_id.to_string(),
        }).await;
        
        Ok(())
    }
}
```

### Context Synchronizer

```rust
pub struct ContextSynchronizer {
    spec_resolver: SpecResolver,
    git_client: GitClient,
}

impl ContextSynchronizer {
    /// Build context for a new session
    pub async fn build_context(
        &self,
        project_path: &Path,
        spec_id: Option<&str>,
    ) -> Result<SessionContext, SyncError> {
        let mut context = SessionContext {
            workspace_path: project_path.to_path_buf(),
            spec_id: spec_id.map(String::from),
            environment: self.collect_environment(),
            git_branch: None,
            git_commit: None,
            custom_data: HashMap::new(),
        };
        
        // Sync Git state
        if let Ok(git_info) = self.git_client.get_info(project_path).await {
            context.git_branch = Some(git_info.branch);
            context.git_commit = Some(git_info.commit);
        }
        
        // Load spec context if specified
        if let Some(id) = spec_id {
            let spec = self.spec_resolver.resolve(id).await?;
            context.custom_data.insert(
                "spec_title".to_string(),
                serde_json::Value::String(spec.title),
            );
            context.custom_data.insert(
                "spec_status".to_string(),
                serde_json::Value::String(spec.status.to_string()),
            );
        }
        
        Ok(context)
    }
    
    /// Prepare context for runtime transition
    pub async fn prepare_for_runtime(
        &self,
        context: &SessionContext,
        runtime: &dyn RuntimeAdapter,
    ) -> Result<(), SyncError> {
        // Each runtime may need specific env vars
        let runtime_env = runtime.environment();
        
        // Validate required env vars exist
        for (key, value) in &runtime_env {
            if value.starts_with("${") && value.ends_with("}") {
                let var_name = &value[2..value.len()-1];
                if std::env::var(var_name).is_err() {
                    return Err(SyncError::MissingEnvVar(var_name.to_string()));
                }
            }
        }
        
        Ok(())
    }
    
    /// Collect environment variables (sanitized)
    fn collect_environment(&self) -> HashMap<String, String> {
        let mut env = HashMap::new();
        
        // Include safe variables
        for key in ["HOME", "USER", "SHELL", "LANG", "LC_ALL", "PATH"] {
            if let Ok(value) = std::env::var(key) {
                env.insert(key.to_string(), value);
            }
        }
        
        // Exclude secrets (API keys are handled by runtime adapters)
        env
    }
}
```

### Detach/Re-attach Flow

```rust
impl SessionRegistry {
    /// Detach all clients and suspend session
    pub async fn suspend(&self, session_id: SessionId) -> Result<(), RegistryError> {
        let mut sessions = self.sessions.write().await;
        let session = sessions.get_mut(&session_id)
            .ok_or(RegistryError::NotFound)?;
        
        // 1. Capture screen snapshot
        let snapshot = session.capture_snapshot()?;
        
        // 2. Disconnect all clients
        for client in session.clients.drain(..) {
            let _ = client.tx.send(SessionEvent::Suspended).await;
        }
        
        // 3. Update state
        session.state = SessionState::Detached {
            since: Utc::now(),
            snapshot: snapshot.clone(),
        };
        
        // 4. Persist snapshot to database
        self.db.save_snapshot(session_id, &snapshot).await?;
        
        // 5. Optionally: Pause PTY to save resources
        // Note: Some CLIs may not handle SIGSTOP well
        // session.pty.as_ref().map(|pty| pty.signal(Signal::SIGSTOP));
        
        Ok(())
    }
    
    /// Re-attach client to detached session
    pub async fn attach(
        &self,
        session_id: SessionId,
        client: ClientHandle,
    ) -> Result<ScreenSnapshot, RegistryError> {
        let mut sessions = self.sessions.write().await;
        let session = sessions.get_mut(&session_id)
            .ok_or(RegistryError::NotFound)?;
        
        match &session.state {
            SessionState::Detached { snapshot, .. } => {
                // 1. Resume PTY if paused
                // session.pty.as_ref().map(|pty| pty.signal(Signal::SIGCONT));
                
                // 2. Add client
                session.clients.push(client);
                
                // 3. Update state
                let snapshot_clone = snapshot.clone();
                session.state = SessionState::Attached { since: Utc::now() };
                
                // 4. Return snapshot for instant UI restore
                Ok(snapshot_clone)
            }
            SessionState::Attached { .. } => {
                // Already attached, just add another client
                session.clients.push(client);
                
                // Return current VTE state
                Ok(session.capture_snapshot()?)
            }
            _ => Err(RegistryError::InvalidState),
        }
    }
}
```

### Database Schema Updates

Extend session schema from spec 239:

```sql
-- Add columns to sessions table
ALTER TABLE sessions ADD COLUMN context_json TEXT;
ALTER TABLE sessions ADD COLUMN snapshot_json TEXT;
ALTER TABLE sessions ADD COLUMN attachment_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN last_attached_at TEXT;
ALTER TABLE sessions ADD COLUMN last_detached_at TEXT;

-- Session attachments history
CREATE TABLE session_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    attached_at TEXT NOT NULL,
    detached_at TEXT,
    duration_ms INTEGER,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Session runtime swaps
CREATE TABLE session_runtime_swaps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    from_runtime TEXT NOT NULL,
    to_runtime TEXT NOT NULL,
    swapped_at TEXT NOT NULL,
    reason TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_session_attachments_session ON session_attachments(session_id);
CREATE INDEX idx_session_runtime_swaps_session ON session_runtime_swaps(session_id);
```

### HTTP API Endpoints

```
# Session Registry
POST   /api/sessions                    # Create session
POST   /api/sessions/:id/start          # Start session
POST   /api/sessions/:id/attach         # Attach client (returns snapshot)
POST   /api/sessions/:id/detach         # Detach client
POST   /api/sessions/:id/suspend        # Suspend session (detach all)
POST   /api/sessions/:id/stop           # Stop session
POST   /api/sessions/:id/swap-runtime   # Hot-swap runtime

# Context
GET    /api/sessions/:id/context        # Get session context
PUT    /api/sessions/:id/context        # Update session context

# Snapshots
GET    /api/sessions/:id/snapshot       # Get current/latest snapshot
```

## Plan

### Phase 1: Session State Machine
- [ ] Extend Session struct with new states
- [ ] Implement state transitions (attach, detach, suspend)
- [ ] Add state validation and guards
- [ ] Write state machine tests

### Phase 2: Snapshot Capture
- [ ] Integrate with VTE layer for screen capture
- [ ] Implement ScreenSnapshot serialization
- [ ] Add snapshot persistence to SQLite
- [ ] Implement snapshot retrieval for re-attach

### Phase 3: Session Registry
- [ ] Implement SessionRegistry with CRUD operations
- [ ] Add client management (attach/detach)
- [ ] Implement session listing with filters
- [ ] Add resource limits and cleanup

### Phase 4: Context Synchronizer
- [ ] Implement context building
- [ ] Add Git state synchronization
- [ ] Implement spec context resolution
- [ ] Add environment sanitization

### Phase 5: Hot-Swap Implementation
- [ ] Implement swap_runtime method
- [ ] Add graceful shutdown during swap
- [ ] Implement context preservation
- [ ] Add swap history tracking

### Phase 6: HTTP API & Integration
- [ ] Implement new API endpoints
- [ ] Update WebSocket handler for attach/detach
- [ ] Integrate with existing session management
- [ ] Add to UI (session drawer, runtime picker)

## Test

### Unit Tests
- [ ] Session state transitions are valid
- [ ] Snapshot capture and restore preserves state
- [ ] Context synchronization builds correct data
- [ ] Registry operations are thread-safe

### Integration Tests
- [ ] Full attach/detach/re-attach cycle
- [ ] Hot-swap between Claude and Copilot
- [ ] Multiple clients attached to same session
- [ ] Session persists across server restart

### Performance Tests
- [ ] Snapshot capture <50ms
- [ ] Re-attach with restore <200ms
- [ ] 100 concurrent sessions stable
- [ ] Memory per session <50MB

## Notes

### Session Expiration

Detached sessions should eventually expire:

```rust
impl SessionRegistry {
    /// Background task to cleanup stale sessions
    pub async fn cleanup_stale_sessions(&self) {
        loop {
            tokio::time::sleep(Duration::from_secs(3600)).await;
            
            let now = Utc::now();
            let stale_threshold = Duration::from_secs(86400 * 7); // 7 days
            
            let mut sessions = self.sessions.write().await;
            let stale: Vec<_> = sessions.iter()
                .filter(|(_, s)| {
                    matches!(s.state, SessionState::Detached { since, .. } 
                        if now - since > stale_threshold)
                })
                .map(|(id, _)| *id)
                .collect();
            
            for id in stale {
                if let Some(session) = sessions.remove(&id) {
                    // Archive before removal
                    let _ = self.db.archive_session(&session).await;
                }
            }
        }
    }
}
```

### Multi-User Considerations

For team scenarios, sessions may be shared:

- Add `owner_id` and `shared_with` fields
- Implement permission checks in registry
- Support read-only attachment mode
- Add audit logging for sensitive operations

### Resource Management

Limit resource usage per user/project:

```rust
pub struct ResourceLimits {
    pub max_sessions_per_user: usize,    // Default: 10
    pub max_attached_clients: usize,      // Default: 5
    pub max_session_age: Duration,        // Default: 7 days
    pub max_snapshot_size: usize,         // Default: 10MB
}
```
