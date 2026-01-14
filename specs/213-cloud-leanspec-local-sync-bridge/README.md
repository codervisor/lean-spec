---
status: planned
created: 2026-01-14
priority: high
tags:
- architecture
- cloud
- sync
- deployment
- realtime
- infrastructure
depends_on:
- 082-web-realtime-sync-architecture
- 151-multi-project-architecture-refactoring
- 148-leanspec-desktop-app
created_at: 2026-01-14T07:59:32.248498Z
updated_at: 2026-01-14T07:59:38.874533Z
---

# Cloud LeanSpec Local Sync Bridge

## Problem & Motivation

**Current State**: LeanSpec requires running local services for every usage pattern:
- **Web UI**: `lean-spec ui` (starts HTTP server on localhost)
- **Desktop App**: Launch Tauri app (bundles UI server)
- **CLI/MCP**: Direct filesystem access only

**Pain Points**:
1. **No remote access**: Can't check specs from mobile/tablet/different machine without starting local server
2. **Context switching cost**: Must start web server or desktop app every time
3. **No remote editing**: Can't update spec status while away from dev machine
4. **Future AI agent orchestration**: No always-on service for remote agent control (spec 168 vision)

**The Opportunity**: 
Deploy LeanSpec UI to cloud as a **remote editor** for local machines via lightweight **sync bridges** that:
- Run as background services on development machines
- Push local filesystem state to cloud for viewing
- Receive edit commands from cloud and apply to local filesystem
- Enable remote agent orchestration in the future
- Provide always-on access without local UI servers

**Why Now**:
- Cloud deployment infrastructure exists (spec 082)
- Desktop app provides distribution channel for sync bridges
- Multi-project architecture ready (spec 151)
- Foundation for AI agent remote control (spec 168)

## High-Level Approach

**Core Principle**: Local filesystem is source of truth, cloud is remote viewer/editor

### Architecture Overview

#### Single Project, Multiple Machines

```
                    ┌─────────────────────────────────────┐
                    │   Cloud LeanSpec (SaaS)              │
                    │                                      │
                    │  • State of Truth (PostgreSQL)       │
                    │  • Conflict Resolution Logic         │
                    │  • Broadcast Hub                     │
                    │  • Connection Registry               │
                    └──────────┬───────────────────────────┘
                               │
                  WebSocket Fan-out (pub/sub)
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
      ┌──────────┐       ┌──────────┐      ┌──────────┐
      │ Bridge A │       │ Bridge B │      │ Bridge C │
      │ (MacBook)│       │ (Desktop)│      │ (Laptop) │
      └────┬─────┘       └────┬─────┘      └────┬─────┘
           │                  │                  │
           ▼                  ▼                  ▼
    Project X/specs/   Project X/specs/   Project X/specs/
    (Work machine)     (Home machine)     (Travel machine)
```

**Key Challenge**: Same project, different machines → need distributed state sync

#### Multi-Project Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Cloud LeanSpec (SaaS)                      │
│                                                              │
│  • Deployed on Vercel/similar                                │
│  • Web UI accessible anywhere                                │
│  • Multi-user, multi-project                                 │
│  • Database-backed (PostgreSQL)                              │
│  • Future: AI agent orchestration hub                        │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   │ WebSocket/HTTP
                   │
     ┌─────────────┼─────────────┬──────────────┐
     │             │             │              │
     ▼             ▼             ▼              ▼
┌─────────┐  ┌─────────┐  ┌─────────┐    ┌─────────┐
│ Bridge  │  │ Bridge  │  │ Bridge  │    │ Bridge  │
│ (Mac)   │  │ (Linux) │  │ (Win)   │    │ (CI)    │
└────┬────┘  └────┬────┘  └────┬────┘    └────┬────┘
     │            │            │              │
     ▼            ▼            ▼              ▼
 Project A    Project B    Project C      Project D
 (specs/)     (specs/)     (specs/)       (specs/)
```

**Key Concept**: **Sync Bridge** (NOT "agent" - avoiding AI agent terminology conflict)

A lightweight background service that:
1. **Watches** local `specs/` directory for changes
2. **Pushes** changes to cloud LeanSpec in real-time
3. **Receives** edit commands from cloud and applies to local filesystem
4. **Authenticates** with cloud via API key/OAuth
5. **Runs** as system service (menu bar on Mac, tray on Windows/Linux)

### Naming Alternatives

Since "agent" conflicts with AI agents, consider:
- **Sync Bridge** (preferred - emphasizes bidirectional connection)
- **Local Relay** (good - relaying between local FS and cloud)
- **Spec Connector** (clear but generic)
- **LeanSpec Gateway** (good - gateway pattern)
- **Sync Daemon** (technical, less user-friendly)
- **Project Watcher** (too passive)

**Recommendation**: **Sync Bridge** - clear, describes function, no conflicts.

### Cloud LeanSpec Features

**Phase 1: Remote Viewing**
- Deploy UI to cloud with multi-project support
- Per-machine views ("MacBook", "Desktop", "CI Server")
- Sync bridges push spec changes to cloud
- View specs from anywhere (mobile, tablet, web browser)
- No local server required for viewing

**Phase 2: Remote Editing**
- Select specific machine to edit
- Update spec status, priority, tags via cloud UI
- Edit commands sent to bridge, applied to local filesystem
- Simple conflict detection (reject if file changed locally)
- Machine offline → Queue edit or show "unavailable"

**Phase 3: AI Agent Orchestration** (spec 168 integration)
- Cloud triggers AI coding sessions on specific machines
- Bridges execute commands on local machines
- Real-time session monitoring in cloud UI
- Remote SDD workflow management

### Sync Bridge Implementation

**Architecture**:
```
Sync Bridge (Rust binary ~5MB)
├── File Watcher (notify-rs)
├── WebSocket Client (tungstenite)
├── Authentication (JWT/OAuth)
├── Compression (zstd)
├── Command Handler (receive edits from cloud)
└── System Integration (menu bar, tray)
```

**Capabilities**:
- **Push**: Watch local filesystem, push changes to cloud
- **Receive**: Handle edit commands from cloud, apply to local files
- **Conflict detection**: Simple timestamp check, reject if file changed
- **Efficient**: Only sync changed files, debounce rapid changes
- **Secure**: TLS, authentication, encrypted payloads
- **Resilient**: Offline queue, automatic reconnection

**Edit Command Types**:
```rust
enum EditCommand {
    UpdateFrontmatter { spec: String, fields: HashMap<String, String> },
    UpdateContent { spec: String, content: String },
    CreateSpec { name: String, template: Option<String> },
}
```

**Distribution**:
- Bundled with Desktop app (Tauri)
- Standalone binary for CI/servers
- Auto-update mechanism

### Multi-Machine Synchronization

**Solution**: Use Git for multi-machine sync (what it's designed for)

```bash
# Machine A
vim specs/123-my-feature/README.md  # Edit locally
git add specs/123-my-feature/
git commit -m "Update spec 123"
git push

# Machine B
git pull  # Get changes from Machine A
# Bridge B detects changes, pushes to cloud
```

**Cloud's Role**:
- Shows **each machine's current filesystem state**
- NOT a distributed sync system
- NOT resolving conflicts (git does that)
- User sees: "MacBook (5 min ago)", "Desktop (2 hours ago)"

**If machines diverge**:
- User sees different states per machine in cloud UI
- To sync: Use git pull/push/merge (standard workflow)
- No automatic sync between machines via cloud

### Data Flow Examples

**Example 1: Local edit → Cloud viewing**
```
1. Edit specs/123-my-feature/README.md on MacBook
2. Bridge detects change via file watcher
3. Bridge pushes change to cloud
4. Cloud updates "MacBook" view in database
5. Anyone viewing "MacBook" in cloud UI sees update
```

**Example 2: Cloud edit → Local filesystem**
```
1. Open cloud UI on phone
2. Select "MacBook" machine
3. Click "Mark In Progress" on spec 123
4. Cloud sends EditCommand to MacBook's bridge
5. Bridge updates local frontmatter
6. Bridge detects change, pushes back to cloud (confirmation)
7. Cloud UI shows updated status
```

**Example 3: Multi-machine workflow with Git**
```
1. Edit spec on MacBook → Bridge pushes to cloud
2. Cloud shows: "MacBook (just now)", "Desktop (5 hours ago)"
3. On MacBook: git commit && git push
4. On Desktop: git pull → Bridge detects changes → Pushes to cloud
5. Cloud shows: "MacBook (2 min ago)", "Desktop (just now)"
6. Both machines now in sync (via git)
```

**Example 4: Conflict detection**
```
1. Cloud UI loads spec from MacBook (timestamp: T1)
2. User edits in cloud UI
3. Meanwhile, local edit on MacBook (timestamp: T2)
4. Cloud sends edit command to bridge
5. Bridge checks: file timestamp > T1 → Reject edit
6. Bridge responds: "Conflict: file changed locally"
7. Cloud UI shows error, user refreshes and retries
```

**Example 5: Future AI agent orchestration**
```
1. User clicks "Implement Spec" in cloud UI
2. Cloud sends execution request to bridge
3. Bridge invokes agent-relay on local machine
4. Bridge streams execution output back to cloud
5. Cloud UI shows real-time progress
```

## Acceptance Criteria

### Phase 1: Remote Viewing
- [ ] Cloud LeanSpec deployed (Vercel/similar)
- [ ] Sync bridge runs as background service
- [ ] File watcher detects changes <1s
- [ ] Changes appear in cloud UI <3s
- [ ] Works on Mac/Windows/Linux
- [ ] Authentication with API keys
- [ ] Per-machine views in cloud UI
- [ ] Multiple machines can connect to same project
- [ ] Each machine's state shown separately

### Phase 2: Remote Editing
- [ ] Select specific machine to edit in cloud UI
- [ ] Edit metadata (status, priority, tags) via cloud
- [ ] Edit commands sent to bridge via WebSocket
- [ ] Bridge applies edits to local filesystem
- [ ] Bridge confirms edit success/failure to cloud
- [ ] Simple conflict detection (timestamp check)
- [ ] Reject edit if file changed locally since load
- [ ] Offline machine shows "unavailable" status
- [ ] Queue edits for offline machines (optional)

### Phase 3: AI Agent Integration
- [ ] Cloud can trigger local commands
- [ ] Integration with agent-relay (spec 168)
- [ ] Real-time session monitoring
- [ ] Security model validated

### Non-Functional
- [ ] Bridge uses <50MB RAM
- [ ] Bridge <5MB binary size (Rust)
- [ ] <1% CPU usage when idle
- [ ] Sync latency <3s end-to-end
- [ ] Works offline (queue and replay)

## Out of Scope

**Phase 1 & 2**:
- Automatic multi-machine sync (use git for that)
- Real-time collaborative editing (multiple users same file)
- Complex conflict resolution (git handles merges)
- Full spec content editing in cloud (metadata only for now)
- Unified view across machines (per-machine views are simpler)

**Not This Spec**:
- AI agent orchestration details (see spec 168)
- Desktop app enhancements (see spec 167, 161)
- Multi-user collaboration features (future)
- Mobile app development (web UI on mobile is sufficient)

## Dependencies

**This spec depends on**:
- [082-web-realtime-sync-architecture](specs/082-web-realtime-sync-architecture/082-web-realtime-sync-architecture.md) - Cloud deployment foundation
- [151-multi-project-architecture-refactoring](specs/151-multi-project-architecture-refactoring/151-multi-project-architecture-refactoring.md) - Multi-project support
- [148-leanspec-desktop-app](specs/148-leanspec-desktop-app/148-leanspec-desktop-app.md) - Distribution channel for bridges

**This spec enables**:
- [168-leanspec-orchestration-platform](specs/168-leanspec-orchestration-platform/168-leanspec-orchestration-platform.md) - Remote AI agent orchestration
- Future: Mobile-first spec viewing
- Future: Team collaboration features
- Future: CI/CD integration via headless bridges

## Open Questions

1. **Naming**: "Sync Bridge" vs "Local Relay" vs "Gateway"?
2. **Protocol**: WebSocket vs HTTP/2 Server-Sent Events?
3. **Authentication**: API keys vs OAuth vs device flow?
4. **Pricing model**: Free tier vs paid for cloud hosting?
5. **Machine naming**:
   - Auto-detect (hostname)?
   - User customizable ("Work MacBook", "Home PC")?
6. **Edit scope**:
   - Phase 2: Only frontmatter editing?
   - Or allow full content editing with limitations?
7. **Conflict handling**:
   - Reject edit if file changed (simple)?
   - Or show diff and let user decide?
8. **Offline edits**:
   - Queue for offline machines?
   - Or just show "unavailable" error?
9. **Security**: How to safely execute remote commands (Phase 3)?
10. **Distribution**: Bundle with desktop app vs separate CLI tool?
11. **Git integration**:
    - Should bridge auto-commit cloud edits?
    - Or leave git operations to user?
12. **View selection**:
    - Default to "most recently updated" machine?
    - Or require explicit machine selection?

## Notes

### Why This Complements Existing Architecture

**Spec 082** (web-realtime-sync-architecture):
- Focused on dual-mode filesystem vs database
- Solved local development UX
- Didn't address remote access need

**This spec**:
- Focuses on remote viewing/editing
- Local filesystem remains source of truth
- Cloud is remote editor for specific machines
- Git handles multi-machine sync

**No conflict**: Spec 082 handles data layer, this spec handles remote access layer.

### Why Not Just Use GitHub as Sync?

GitHub provides version control but not real-time remote access:
- **No viewing without clone**: Can't check specs from phone without git clone
- **No remote editing**: Can't update spec status from tablet
- **Latency**: Push/pull adds 10-30s delay
- **No commands**: Can't trigger AI agents remotely

Sync bridges provide:
- **Instant viewing**: Check specs from anywhere, <3s latency
- **Remote editing**: Update metadata from any device
- **Machine control**: Send commands to specific dev machines
- **Complements git**: Git still used for version control and multi-machine sync

### Security Considerations

**Phase 1 (Read-Only)**:
- API key authentication (rotate regularly)
- TLS encryption in transit
- Read-only filesystem access
- Rate limiting on cloud

**Phase 3 (Remote Commands)**:
- Explicit user permission for each command type
- Allowlist of executable commands
- Audit log of all remote executions
- Optional: local confirmation dialog before execution

### Performance Targets

| Metric           | Target | Notes                         |
| ---------------- | ------ | ----------------------------- |
| Sync latency     | <3s    | File change → Cloud UI update |
| Bridge memory    | <50MB  | Per project                   |
| Bridge binary    | <5MB   | Rust static binary            |
| CPU idle         | <1%    | File watcher only             |
| Reconnection     | <5s    | After network outage          |
| Change detection | <1s    | File watcher latency          |

### Implementation Estimates

**Phase 1** (Remote Viewing): 2-3 weeks
- Cloud deployment (spec 082 foundation)
- Bridge implementation (Rust)
- Per-machine state management
- Authentication

**Phase 2** (Remote Editing): 1-2 weeks
- Edit command handling in bridge
- Cloud UI edit interface
- Simple conflict detection

**Phase 3** (AI orchestration): 2-3 weeks
- Integration with agent-relay (spec 168)
- Command execution security
- Session monitoring

**Cloud Backend**:
- WebSocket server: ~600 LOC (Node.js/Rust)
- Sync orchestration: ~400 LOC
- Broadcast hub: ~500 LOC
- Conflict resolution: ~600 LOC
- Database updates: ~300 LOC
- **Total**: ~2,400 LOC (+85% for multi-machine)

**Estimated effort**: 
- Phase 1 (read-only): 2-3 weeks
- Phase 2 (bidirectional + multi-machine): +3-4 weeks
- Phase 3 (AI orchestration): +2-3 weeks