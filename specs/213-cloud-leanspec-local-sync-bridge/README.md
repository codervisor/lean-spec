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

## Overview

Provide always-on, remote access to local LeanSpec projects by deploying the UI to the cloud and connecting each developer machine via a lightweight **Sync Bridge**. The local filesystem remains the source of truth; the cloud shows per-machine state and sends explicit edit commands back to the selected machine.

## Problem & Motivation

- Remote access today requires running a local UI server or desktop app.
- Teams need quick, read-only access from any device, and lightweight metadata edits when away.
- A persistent connection unlocks future remote orchestration (spec 168) without changing the local-first model.

## High-Level Approach

**Core Principle**: Local filesystem is the source of truth; the cloud is a remote viewer/editor for a specific machine.

**Cloud service (SaaS)**
- Multi-project UI with per-machine views.
- **Global Machine Context**: Top-level switcher determining which machine's data is viewed.
- **Machine Management**: Dedicated view to manage connected bridges (similar to Projects).
- WebSocket/HTTP API for sync events and edit commands.
- Stores last-known per-machine spec state and metadata (no global merge).

**Sync Bridge (local service)**
- Rust binary running in the background on each machine.
- Watches `specs/` for changes and pushes deltas to the cloud.
- Applies **explicit** edit commands from cloud to local files.
- Auth via API key or device flow; TLS required.
- Reconnects automatically and queues events when offline.

**Multi-machine model**
- Each machine is a distinct view in the cloud (e.g., “Work MacBook”).
- Git remains the mechanism for syncing between machines.
- Cloud does **not** resolve merge conflicts between machines.

## Plan

- [ ] Define bridge ↔ cloud protocol (event types, payload limits, auth handshake).
- [ ] Implement local bridge (file watcher, event queue, WebSocket client, edit executor).
- [ ] Add cloud sync API (ingest events, per-machine storage, publish updates).
- [ ] UI: Implement Global Machine Switcher in top app bar.
- [ ] UI: Create Machine Management page (list, status, rename, revoke).
- [ ] Add remote metadata edit flow with conflict check (timestamp/version).
- [ ] Document setup and security model (API key/device flow, audit log).

## Acceptance Criteria

- [ ] All phase-specific criteria below are met.

### Phase 1: Remote Viewing
- [ ] Global Machine Switcher persists selection across navigation.
- [ ] Machine Management page lists bridges + status (online/offline).
- [ ] Cloud UI lists projects for the selected machine.
- [ ] Local change appears in cloud UI within 3 seconds on stable network.
- [ ] Bridge runs on Mac/Windows/Linux with <50MB RAM idle.
- [ ] Auth works with API key or device flow; all traffic over TLS.

### Phase 2: Remote Editing (Metadata Only)
- [ ] User selects target machine before editing.
- [ ] Status/priority/tags edits are applied locally and reflected in cloud.
- [ ] Conflict check rejects edits if local file changed since view load.
- [ ] Offline machine shows “unavailable” and does not accept edits.

### Phase 3: AI Agent Integration (Follow-on)
- [ ] Cloud can trigger a local execution request routed to bridge.
- [ ] Bridge records audit log entries for each remote action.

## Out of Scope

- Cloud-based multi-machine merging or conflict resolution.
- Real-time collaborative editing of the same file.
- Full spec content editing from cloud in Phase 2.
- Detailed AI agent orchestration design (see spec 168).

## Dependencies

**This spec depends on**:
- [082-web-realtime-sync-architecture](specs/082-web-realtime-sync-architecture/082-web-realtime-sync-architecture.md) - Cloud deployment foundation
- [151-multi-project-architecture-refactoring](specs/151-multi-project-architecture-refactoring/151-multi-project-architecture-refactoring.md) - Multi-project support
- [148-leanspec-desktop-app](specs/148-leanspec-desktop-app/148-leanspec-desktop-app.md) - Distribution channel for bridges

**This spec enables**:
- [168-leanspec-orchestration-platform](specs/168-leanspec-orchestration-platform/168-leanspec-orchestration-platform.md) - Remote AI agent orchestration

## Open Questions

1. Preferred naming: Sync Bridge vs Local Relay?
2. Auth choice: API keys vs device flow (or both)?
3. Conflict check: file timestamp vs content hash?
4. Offline edits: queue or reject with user prompt?
5. Machine naming: auto hostname vs user-defined label?

## Notes

- Git remains the multi-machine sync mechanism; the cloud shows per-machine state only.
- Remote edits are **explicit** and **machine-scoped** to preserve local ownership.