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
1. **No persistent access**: Can't check specs from mobile/tablet/different machine without starting local server
2. **Context switching cost**: Must start web server or desktop app every time
3. **Collaboration friction**: Can't share live spec view without deployment
4. **Future AI agent orchestration**: No always-on service for remote agent control (spec 168 vision)

**The Opportunity**: 
Deploy LeanSpec UI to cloud (similar to current demo at leanspec.vercel.app) but connect it to local projects via lightweight **sync bridges** (better name TBD) that:
- Run as background services on development machines
- Push spec changes to cloud in real-time
- Enable remote agent orchestration in the future
- Provide always-on access without local UI servers

**Why Now**:
- Cloud deployment infrastructure exists (spec 082)
- Desktop app provides distribution channel for sync bridges
- Multi-project architecture ready (spec 151)
- Foundation for AI agent remote control (spec 168)

## High-Level Approach

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
2. **Syncs** changes to cloud LeanSpec in real-time
3. **Receives** commands from cloud (future: AI agent orchestration)
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

**Phase 1: Read-Only Cloud Access**
- Deploy UI to cloud with multi-project support
- Sync bridges push spec changes to cloud
- View specs from anywhere (mobile, tablet, web browser)
- No local server required for viewing

**Phase 2: Metadata Editing**
- Update spec status, priority, tags via cloud UI
- Changes sync back to local filesystem via bridge
- Conflict resolution (last-write-wins initially)

**Phase 3: AI Agent Orchestration** (spec 168 integration)
- Cloud triggers AI coding sessions via sync bridges
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
├── Versioning (vector clocks / version counters)
├── Conflict Detection (checksum + base version)
└── System Integration (menu bar, tray)
```

**Capabilities**:
- **Unidirectional** (Phase 1): Push changes to cloud
- **Bidirectional** (Phase 2): Receive metadata updates, future commands
- **Multi-machine aware**: Track version vectors, detect conflicts
- **Efficient**: Only sync changed files, debounce rapid changes
- **Secure**: TLS, authentication, encrypted payloads
- **Resilient**: Offline queue, automatic reconnection
- **Broadcast receiver**: Apply changes from other machines

**Distribution**:
- Bundled with Desktop app (Tauri)
- Standalone binary for CI/servers
- Auto-update mechanism

### Multi-Machine Synchronization

**Challenge**: Multiple developers/machines editing same project concurrently.

**Solution**: Hub-and-spoke model with cloud as authoritative state.

#### Version Tracking

Each spec maintains:
- **Version counter** (incremented on each change)
- **Last modified timestamp** (for ordering)
- **Machine ID** (which bridge made the change)
- **Checksum** (SHA-256 of content)

```rust
struct SpecVersion {
    version: u64,
    timestamp: DateTime<Utc>,
    machine_id: String,
    checksum: String,
}
```

#### Conflict Resolution Strategy

**1. No Conflict (Sequential Edits)**
```
Machine A: V1 → V2 (edits, uploads)
Machine B: Receives V2 notification, applies
→ All machines at V2, no conflict
```

**2. Concurrent Edits - Different Files**
```
Machine A: V1 → V2a (edits spec 123)
Machine B: V1 → V2b (edits spec 456)
→ No conflict, independent changes
```

**3. Concurrent Edits - Same File, Different Fields**
```
Machine A: Changes frontmatter (status)
Machine B: Changes content (adds section)
→ Merge both changes (frontmatter + content)
```

**4. Concurrent Edits - Same File, Same Field**
```
Machine A: Changes status to "in-progress"
Machine B: Changes status to "complete"
→ Conflict! Resolution:
  a) Last-write-wins (timestamp)
  b) Machine priority (primary dev wins)
  c) Manual resolution UI
```

**Resolution Algorithm**:

```
ON CLOUD RECEIVES CHANGE:
  1. Check base version matches current version
     - Match: Accept change, increment version
     - Mismatch: Conflict detected
  
  2. IF CONFLICT:
     a) Frontmatter: Last-write-wins by timestamp
     b) Content: Three-way merge
        - Base: V_base
        - Machine A: V_a
        - Machine B: V_b
        - Result: V_merged
     c) Store conflict metadata for audit
  
  3. Broadcast merged version to ALL bridges
  
  4. Bridges apply change:
     - If no local edits: Direct apply
     - If local edits: Conflict warning
```

#### Broadcast Mechanism

**Cloud maintains per-project connection registry**:
```rust
struct ProjectConnections {
    project_id: String,
    bridges: HashMap<MachineId, WebSocketConnection>,
}
```

**On change**:
1. Identify all bridges watching the project
2. Send change notification to all (except originator)
3. Retry failed deliveries with exponential backoff
4. Queue for offline bridges

**Bridge receives broadcast**:
1. Check if local file changed since last sync
2. If unchanged: Apply directly
3. If changed: Conflict resolution (merge or warn)
4. Update local filesystem
5. Skip triggering file watcher (avoid loop)

### Data Flow Examples

**Example 1: Single machine edit → cloud**
```
1. Edit specs/123-my-feature/123-my-feature.md on Machine A
2. Bridge A detects change via file watcher
3. Bridge A sends diff + vector clock to cloud
4. Cloud updates database with new version
5. Cloud UI updates in real-time for all viewers
```

**Example 2: Single machine edit → other machines (multi-machine sync)**
```
1. Edit spec on Machine A (MacBook)
2. Bridge A sends change to cloud
3. Cloud stores change + increments version counter
4. Cloud broadcasts to all bridges watching same project:
   - Bridge B (Desktop) receives notification
   - Bridge C (Laptop) receives notification
5. Bridge B and C fetch change and apply to local filesystem
6. All machines now have consistent state
```

**Example 3: Concurrent edits on different machines (conflict)**
```
Time T0: All machines have spec at version V1

Time T1:
- Machine A edits frontmatter (status: in-progress)
- Machine B edits same spec content (adds section)
- Both offline/disconnected

Time T2:
- Bridge A reconnects, sends change (V1 → V2a)
- Cloud accepts, now at version V2a

Time T3:
- Bridge B reconnects, sends change (V1 → V2b)
- Cloud detects conflict (base version V1 != current V2a)
- Cloud applies resolution strategy:
  a) Frontmatter: Last-write-wins with timestamp
  b) Content: Three-way merge or manual resolution
- Cloud broadcasts conflict resolution to all bridges
- Machine A receives merged version, applies locally
```

**Example 4: Cloud UI edit → multiple machines**
```
1. User clicks "Mark In Progress" in cloud UI
2. Cloud updates database with new version
3. Cloud broadcasts metadata change to all connected bridges:
   - Bridge A (MacBook): Receives update
   - Bridge B (Desktop): Receives update
   - Bridge C (Laptop): Offline, queued for replay
4. Online bridges update local frontmatter
5. Bridge C reconnects, receives queued update, applies change
6. All machines converge to same state
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

### Phase 1: Cloud Deployment + Read-Only Bridges
- [ ] Cloud LeanSpec deployed (Vercel/similar)
- [ ] Sync bridge runs as background service
- [ ] File watcher detects changes <1s
- [ ] Changes appear in cloud UI <3s
- [ ] Works on Mac/Windows/Linux
- [ ] Authentication with API keys
- [ ] Multi-project support (one bridge per project)

### Phase 2: Bidirectional Sync + Multi-Machine
- [ ] Edit metadata in cloud UI
- [ ] Changes sync to local filesystem
- [ ] Multiple bridges can connect to same project
- [ ] Edit on Machine A → syncs to Machine B/C via cloud
- [ ] Cloud edit broadcasts to all connected machines
- [ ] Conflict detection for concurrent edits
- [ ] Conflict resolution (last-write-wins for frontmatter)
- [ ] Three-way merge for content conflicts
- [ ] Offline queue works correctly
- [ ] Bridge avoids sync loops (ignore own broadcasts)

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

**Phase 1**:
- Full content editing in cloud UI (use local editor + sync)
- Collaborative real-time editing (future consideration)
- Spec creation via cloud UI (use CLI/desktop app)
- Built-in AI agents (use agent-relay via bridges)

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
5. **Conflict resolution**: 
   - Frontmatter: Last-write-wins sufficient?
   - Content: Three-way merge vs operational transforms (OT) vs CRDTs?
   - Should we support manual conflict resolution UI?
6. **Security**: How to safely execute remote commands (Phase 3)?
7. **Distribution**: Bundle with desktop app vs separate CLI tool?
8. **Multi-machine identity**:
   - How to identify machines? (MAC address, hostname, UUID?)
   - Should user name machines ("Work MacBook", "Home PC")?
9. **Primary machine concept**:
   - Should one machine be "primary" with higher priority in conflicts?
   - Or fully distributed with timestamp-only resolution?
10. **Concurrent edit warnings**:
    - Notify user when another machine is editing same spec?
    - Lock specs during editing (Google Docs style)?
11. **Git integration**:
    - Should bridge auto-commit synced changes?
    - Or leave git operations to user?
12. **Broadcast optimization**:
    - Send full file or diffs for broadcasts?
    - How to handle large spec files efficiently?

## Notes

### Why This Complements Existing Architecture

**Spec 082** (web-realtime-sync-architecture):
- Focused on dual-mode filesystem vs database
- Solved local development UX
- Didn't address remote access need

**This spec**:
- Focuses on always-on cloud access
- Adds local-to-cloud sync layer
- Enables remote collaboration and AI orchestration

**No conflict**: Spec 082 handles data layer, this spec handles sync layer.

### Why Not Just Use GitHub as Sync?

GitHub provides version control but not real-time sync:
- **Latency**: Push/pull adds 10-30s delay
- **Friction**: Requires commit discipline
- **No metadata**: Can't update status without file edit
- **No commands**: Can't trigger AI agents remotely

Sync bridges provide:
- **Real-time**: <3s latency for spec updates
- **Transparent**: No git ceremony required
- **Bidirectional**: Cloud can send commands back
- **Flexible**: Works with any VCS (git, hg, none)

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

### Multi-Machine Sync Tradeoffs

| Approach                   | Pros                   | Cons                                  |
| -------------------------- | ---------------------- | ------------------------------------- |
| **Last-write-wins**        | Simple, low latency    | Data loss on conflicts                |
| **Three-way merge**        | Preserves both changes | Complex, can't auto-resolve all       |
| **Operational Transforms** | Real-time collab       | Very complex, overkill                |
| **CRDTs**                  | Automatic convergence  | Large overhead, complex               |
| **Locking**                | Prevents conflicts     | Poor UX, requires constant connection |

**Recommendation**: 
- **Phase 2**: Last-write-wins + three-way merge
- **Future**: Consider OT/CRDTs only if real-time collab becomes priority

### Why Git Doesn't Solve This

Git provides distributed version control but:
- **Manual sync**: Requires explicit push/pull
- **Latency**: 10-30s for remote sync
- **Ceremony**: Commit messages, branches
- **No real-time**: Can't see other machines' changes instantly

Sync bridges provide:
- **Transparent sync**: Automatic, no user action
- **Low latency**: <3s machine-to-machine
- **No ceremony**: Works alongside git
- **Real-time awareness**: See changes as they happen

**Git remains primary version control**; bridges are real-time sync layer.

### Edge Cases

**1. Bridge restart during sync**
- Solution: Track last synced version, resume from checkpoint

**2. Network partition (split brain)**
- Solution: Cloud is source of truth, partitioned bridges queue changes

**3. Rapid successive edits (save spam)**
- Solution: Debounce file watcher (500ms), batch changes

**4. Large file changes (>1MB)**
- Solution: Incremental sync with binary diffs (bsdiff)

**5. Bridge crashes mid-apply**
- Solution: Atomic file writes, rollback on failure

**6. Clock skew between machines**
- Solution: Use server timestamps, not client timestamps

### Implementation Complexity

**Sync Bridge (Rust)**:
- File watcher: ~500 LOC (notify-rs)
- WebSocket client: ~300 LOC (tungstenite)
- Authentication: ~200 LOC
- System tray: ~400 LOC (tray-icon)
- Version tracking: ~300 LOC
- Conflict detection: ~400 LOC
- Three-way merge: ~500 LOC
- **Total**: ~2,600 LOC Rust (+73% for multi-machine)

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