---
status: archived
created: 2026-02-03
priority: high
tags:
- infrastructure
- rust
- pty
- terminal
- ai-agents
parent: 291-cli-runtime-web-orchestrator
created_at: 2026-02-03T13:40:00.718798Z
updated_at: 2026-02-03T14:11:48.050462Z
transitions:
- status: archived
  at: 2026-02-03T14:11:48.050462Z
---

# PTY Process Orchestration Layer

## Overview

### Problem

The current session management (spec 239) spawns AI CLI tools as simple child processes without proper terminal emulation. This causes issues:

- **No interactive features**: CLIs can't display progress bars, spinners, or syntax highlighting
- **No TUI support**: Interactive menus and prompts don't render correctly
- **Limited input handling**: Can't inject keystrokes for interactive workflows
- **No terminal resize**: Fixed dimensions regardless of frontend size

### Solution

Build a Rust-based PTY (Pseudo-Terminal) layer that provides full terminal emulation. Each AI session is encapsulated in a dedicated PTY, "tricking" the CLI into believing it runs in a full-featured terminal.

### Scope

**In Scope**:
- PTY spawning and management for AI CLI tools
- Environment isolation per session
- Bidirectional I/O with non-blocking async
- Terminal resize handling (SIGWINCH)
- Graceful shutdown and cleanup
- Runtime trait interface for CLI tools

**Out of Scope**:
- VTE parsing (spec 293)
- WebSocket streaming (spec 296)
- Web UI rendering (spec 294)

## Design

### Architecture

```
┌────────────────────────────────────────────────────────────┐
│                   PTY Process Layer                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                  PtyManager                          │  │
│  │                                                      │  │
│  │  • Tracks active PTY sessions                       │  │
│  │  • Provides spawn/cleanup lifecycle                 │  │
│  │  • Handles signal forwarding                        │  │
│  └──────────────────────┬──────────────────────────────┘  │
│                         │                                  │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │               PtySession                             │  │
│  │                                                      │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │              Runtime Adapter                │    │  │
│  │  │  • ClaudeRuntime                            │    │  │
│  │  │  • CopilotRuntime                           │    │  │
│  │  │  • OpenCodeRuntime                          │    │  │
│  │  │  • GenericRuntime (fallback)                │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  │                                                      │  │
│  │  ┌──────────────────┐  ┌─────────────────────────┐  │  │
│  │  │  PTY Master FD   │  │   Environment Config    │  │  │
│  │  │  - read()        │  │   - TERM=xterm-256color │  │  │
│  │  │  - write()       │  │   - COLORTERM=truecolor │  │  │
│  │  │  - resize()      │  │   - API keys            │  │  │
│  │  └──────────────────┘  └─────────────────────────┘  │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │               Non-blocking I/O                       │  │
│  │                                                      │  │
│  │  • Tokio-based async I/O                            │  │
│  │  • Input queue (user keystrokes)                    │  │
│  │  • Output buffer (PTY stdout)                       │  │
│  │  • Event stream for state changes                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Runtime Trait

```rust
/// Trait for AI CLI tool adapters (extends spec 267 RunnerDefinition)
#[async_trait]
pub trait RuntimeAdapter: Send + Sync {
    /// Runtime identifier (e.g., "claude", "copilot")
    fn id(&self) -> &str;
    
    /// Display name for UI
    fn display_name(&self) -> &str;
    
    /// Build command and arguments for PTY spawn
    fn build_command(&self, config: &RuntimeConfig) -> Command;
    
    /// Environment variables to set (merged with base env)
    fn environment(&self) -> HashMap<String, String>;
    
    /// Initial terminal size (cols, rows)
    fn initial_size(&self) -> (u16, u16) {
        (120, 40) // Sensible default
    }
    
    /// Whether this runtime supports TUI mode
    fn supports_tui(&self) -> bool {
        true
    }
    
    /// Pre-spawn validation (check if CLI exists, API keys set)
    async fn validate(&self) -> Result<(), RuntimeError>;
    
    /// Optional: Transform input before sending to PTY
    fn transform_input(&self, input: &[u8]) -> Vec<u8> {
        input.to_vec()
    }
    
    /// Optional: Handle runtime-specific output patterns
    fn handle_output(&self, output: &[u8]) -> Option<RuntimeEvent>;
}

/// Runtime configuration passed to spawn
#[derive(Debug, Clone)]
pub struct RuntimeConfig {
    pub spec_path: Option<PathBuf>,
    pub working_dir: PathBuf,
    pub additional_args: Vec<String>,
    pub mode: RuntimeMode,
}

#[derive(Debug, Clone)]
pub enum RuntimeMode {
    Interactive,    // Full PTY with TUI support
    NonInteractive, // Simple process, no TUI
    Headless,       // PTY but no stdin
}
```

### PtySession API

```rust
pub struct PtySession {
    id: SessionId,
    runtime: Box<dyn RuntimeAdapter>,
    pty: PtyPair,
    child: Child,
    state: SessionState,
    created_at: DateTime<Utc>,
}

impl PtySession {
    /// Spawn a new PTY session
    pub async fn spawn(
        runtime: Box<dyn RuntimeAdapter>,
        config: RuntimeConfig,
    ) -> Result<Self, PtyError>;
    
    /// Read available output (non-blocking)
    pub async fn read(&mut self) -> Result<Vec<u8>, PtyError>;
    
    /// Write input to PTY stdin
    pub async fn write(&mut self, data: &[u8]) -> Result<usize, PtyError>;
    
    /// Resize terminal
    pub fn resize(&mut self, cols: u16, rows: u16) -> Result<(), PtyError>;
    
    /// Send signal to child process
    pub fn signal(&self, sig: Signal) -> Result<(), PtyError>;
    
    /// Check if process is still running
    pub fn is_alive(&self) -> bool;
    
    /// Wait for process to exit
    pub async fn wait(&mut self) -> Result<ExitStatus, PtyError>;
    
    /// Graceful shutdown with timeout
    pub async fn shutdown(&mut self, timeout: Duration) -> Result<(), PtyError>;
}
```

### Built-in Runtimes

Each runtime adapter maps to a runner definition (spec 267) with PTY-specific handling:

```rust
// Claude Code runtime
pub struct ClaudeRuntime;

impl RuntimeAdapter for ClaudeRuntime {
    fn id(&self) -> &str { "claude" }
    fn display_name(&self) -> &str { "Claude Code" }
    
    fn build_command(&self, config: &RuntimeConfig) -> Command {
        let mut cmd = Command::new("claude");
        cmd.arg("--dangerously-skip-permissions");
        cmd.arg("--print");
        if let Some(spec) = &config.spec_path {
            cmd.arg("--spec").arg(spec);
        }
        cmd
    }
    
    fn environment(&self) -> HashMap<String, String> {
        HashMap::from([
            ("TERM".into(), "xterm-256color".into()),
            ("COLORTERM".into(), "truecolor".into()),
        ])
    }
    
    async fn validate(&self) -> Result<(), RuntimeError> {
        // Check claude binary exists
        which::which("claude").map_err(|_| RuntimeError::NotFound)?;
        // Check API key
        std::env::var("ANTHROPIC_API_KEY")
            .map_err(|_| RuntimeError::MissingApiKey("ANTHROPIC_API_KEY"))?;
        Ok(())
    }
}

// GitHub Copilot runtime
pub struct CopilotRuntime;

impl RuntimeAdapter for CopilotRuntime {
    fn id(&self) -> &str { "copilot" }
    fn display_name(&self) -> &str { "GitHub Copilot" }
    
    fn build_command(&self, config: &RuntimeConfig) -> Command {
        let mut cmd = Command::new("gh");
        cmd.arg("copilot").arg("suggest");
        cmd
    }
    
    async fn validate(&self) -> Result<(), RuntimeError> {
        // Check gh CLI exists
        which::which("gh").map_err(|_| RuntimeError::NotFound)?;
        // Check copilot extension
        let output = Command::new("gh").arg("extension").arg("list").output()?;
        if !String::from_utf8_lossy(&output.stdout).contains("copilot") {
            return Err(RuntimeError::ExtensionNotInstalled);
        }
        Ok(())
    }
}

// OpenCode runtime
pub struct OpenCodeRuntime;

// Aider runtime
pub struct AiderRuntime;

// Gemini CLI runtime  
pub struct GeminiRuntime;

// Generic runtime (user-defined via runners.json)
pub struct GenericRuntime {
    definition: RunnerDefinition,
}
```

### Platform Support

PTY implementation varies by platform:

```rust
#[cfg(unix)]
mod unix {
    use std::os::unix::io::RawFd;
    use nix::pty::{openpty, PtyMaster, Winsize};
    use nix::sys::termios;
    
    pub fn open_pty() -> Result<(RawFd, RawFd), Error> {
        let pty = openpty(None, None)?;
        Ok((pty.master, pty.slave))
    }
}

#[cfg(windows)]
mod windows {
    use windows::Win32::System::Console::*;
    
    pub fn open_pty() -> Result<ConPty, Error> {
        // Use Windows ConPTY API
        CreatePseudoConsole(...)
    }
}
```

## Plan

### Phase 1: Core PTY Infrastructure
- [ ] Add `portable-pty` or `pty-process` dependency
- [ ] Implement `PtySession` struct with spawn/read/write
- [ ] Add async I/O with Tokio
- [ ] Implement terminal resize handling
- [ ] Write unit tests for PTY lifecycle

### Phase 2: Runtime Trait & Adapters
- [ ] Define `RuntimeAdapter` trait
- [ ] Implement `ClaudeRuntime` adapter
- [ ] Implement `CopilotRuntime` adapter
- [ ] Implement `OpenCodeRuntime` adapter
- [ ] Implement `AiderRuntime` adapter
- [ ] Implement `GeminiRuntime` adapter
- [ ] Implement `GenericRuntime` for user-defined runners

### Phase 3: PtyManager
- [ ] Implement `PtyManager` for session tracking
- [ ] Add session lifecycle (spawn, monitor, cleanup)
- [ ] Implement signal forwarding (SIGTERM, SIGINT, SIGWINCH)
- [ ] Add graceful shutdown with timeout

### Phase 4: Integration with Session Management
- [ ] Update spec 239 session manager to use PTY layer
- [ ] Add PTY status to session state
- [ ] Expose PTY events through session events
- [ ] Update HTTP API for PTY-based sessions

### Phase 5: Testing & Documentation
- [ ] Integration tests with real CLI tools
- [ ] Cross-platform testing (Linux, macOS, Windows)
- [ ] Performance benchmarks (spawn latency, I/O throughput)
- [ ] API documentation

## Test

### Unit Tests
- [ ] PTY spawn and cleanup
- [ ] Read/write non-blocking I/O
- [ ] Terminal resize handling
- [ ] Signal forwarding
- [ ] Runtime adapter validation

### Integration Tests
- [ ] Claude Code: spawn, interact, shutdown
- [ ] Copilot CLI: spawn, interact, shutdown
- [ ] OpenCode: spawn, interact, shutdown
- [ ] Concurrent sessions isolation

### Performance Tests
- [ ] Spawn latency <100ms
- [ ] I/O throughput >10MB/s
- [ ] Memory per session <10MB
- [ ] 50+ concurrent sessions stable

## Notes

### Library Evaluation

**portable-pty** (crate):
- ✅ Cross-platform (Unix, Windows via ConPTY)
- ✅ Well-maintained (wezterm project)
- ✅ Async support via raw FD
- ⚠️ Higher-level API, less control

**pty-process** (crate):
- ✅ Simple API
- ✅ Good for basic use cases
- ❌ Linux/macOS only
- ❌ Less active maintenance

**Custom with libc/windows crate**:
- ✅ Maximum control
- ✅ Minimal dependencies
- ❌ More implementation work
- ❌ Platform-specific code

**Recommendation**: Start with `portable-pty`, evaluate custom implementation if we hit limitations.

### Environment Security

PTY sessions may contain sensitive data (API keys, tokens). Security considerations:

- Sanitize environment before logging
- Redact known secret patterns in output
- Encrypt session logs at rest
- Add access controls (user/project isolation)

### Terminal Size Strategy

Different CLIs have different optimal sizes:

| CLI | Optimal Cols | Optimal Rows | Notes |
|-----|-------------|--------------|-------|
| Claude Code | 120 | 40 | Good for code display |
| Copilot | 80 | 24 | Standard terminal |
| Aider | 120 | 40 | Prefers wide terminals |
| OpenCode | 100 | 30 | Medium size |

Frontend should communicate preferred size; fallback to runtime defaults.
