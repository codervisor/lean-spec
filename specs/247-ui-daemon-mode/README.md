---
status: planned
created: 2026-01-28
priority: high
tags:
- ui
- daemon
- ux
- cli
created_at: 2026-01-28T12:01:41.642256Z
updated_at: 2026-01-28T12:01:41.642256Z
---

# UI Daemon Mode: Run @leanspec/ui in Background

## Overview

Currently, running `npx @leanspec/ui` starts the UI server in the foreground, blocking the terminal. This is not user-friendly for development workflows where developers want to:
- Start the UI and continue using their terminal
- Keep the UI running across multiple terminal sessions
- Have the UI start automatically on login

This spec adds daemon/background process support to `@leanspec/ui` for a seamless development experience.

## Design

### Core Features
1. **Start Command**: Run UI in foreground (default) or daemon mode with `--daemon` flag
2. **Process Management**: PID file tracking, graceful shutdown
3. **Status Command**: Check if daemon is running, view PID, uptime
4. **Stop Command**: Gracefully stop the background UI process
5. **Restart Command**: Restart the daemon without losing configuration
6. **Kill Command**: Force stop and cleanup all daemon resources
7. **Logs Command**: View recent daemon logs with automatic rotation

### Implementation Options
- **Option A: Node.js daemon package** (e.g., `daemonize-process`, `pm2`)
- **Option B: Native Rust implementation** using `tokio` process management
- **Option C: System-specific** (launchd for macOS, systemd for Linux)

### Recommended Approach
Use **Option B** (Rust implementation) for:
- Consistency with existing Rust CLI architecture
- No external runtime dependencies
- Cross-platform support
- Integration with current process management patterns

### CLI Interface
```bash
# Start in foreground (default, current behavior)
npx @leanspec/ui
npx @leanspec/ui start

# Start as daemon (background)
npx @leanspec/ui start --daemon
npx @leanspec/ui start -d

# Check daemon status
npx @leanspec/ui status

# Stop daemon
npx @leanspec/ui stop

# Restart daemon
npx @leanspec/ui restart

# View recent logs (last N lines, default 100)
npx @leanspec/ui logs
npx @leanspec/ui logs --lines 500

# Stop and cleanup everything
npx @leanspec/ui kill
```

## Plan

- [ ] Research Rust daemon/process management libraries
- [ ] Design PID file and lock file structure
- [ ] Implement `start` command with `--daemon` flag support
- [ ] Implement `status` command to check daemon state
- [ ] Implement `stop` command with graceful signal handling
- [ ] Implement `restart` command (stop + start daemon)
- [ ] Implement `kill` command for force cleanup
- [ ] Implement `logs` command with rotation-aware log reading
- [ ] Add configuration for daemon behavior
- [ ] Write tests for daemon lifecycle
- [ ] Update documentation with daemon usage

## Test

- [ ] Daemon starts and detaches from terminal
- [ ] PID file is created and valid
- [ ] Status command shows correct daemon state
- [ ] Stop command gracefully shuts down daemon
- [ ] Restart command works without manual stop
- [ ] Logs command shows recent log entries
- [ ] Log rotation prevents unbounded growth
- [ ] Multiple start attempts handle existing daemon gracefully
- [ ] Works on macOS, Linux, and Windows (WSL)

## Notes

### Daemon Behavior
- PID file location: `~/.leanspec/ui.pid`
- Default port: 3333 (same as foreground mode)
- Port conflicts should fail gracefully with clear error message

### Log Management
Logs are stored with automatic rotation to prevent unbounded growth:
- **Location**: `~/.leanspec/logs/ui.log` (current), `~/.leanspec/logs/ui.log.1`, `.2`, etc. (rotated)
- **Rotation trigger**: 10 MB per file
- **Retention**: Keep last 5 files (50 MB total max)
- **Log levels**: Error and Warn only (Info/Debug use foreground mode)
- **Cleanup**: Old files auto-deleted on rotation

The `logs` command reads from rotated files seamlessly, showing most recent entries first.

### Cross-Platform Considerations
- Windows: Use Windows Services or background process APIs
- macOS/Linux: Use fork/double-fork pattern with signal handling
- Consider using `tokio::process` for async process management

### Future Enhancements
- Auto-start daemon on system boot (launchd/systemd integration)
- Web-based daemon control panel
- Multiple project daemon management
- Port pooling for multiple concurrent UIs