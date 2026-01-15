---
status: complete
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
updated_at: 2026-01-15T05:46:53.624448469Z
completed_at: 2026-01-15T05:46:53.624448469Z
transitions:
- status: in-progress
  at: 2026-01-15T04:54:21.638303781Z
- status: complete
  at: 2026-01-15T05:46:53.624448469Z
---

# Cloud LeanSpec Local Sync Bridge

## Overview

Provide always-on, remote access to local LeanSpec projects by deploying the UI to the cloud and connecting each developer machine via a lightweight **Sync Bridge**. The local filesystem remains the source of truth; the cloud shows per-machine state and sends explicit, machine-scoped metadata edit commands back to the selected machine.

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
- Auth via device flow (primary) with optional API key for CI/headless; TLS required.
- Reconnects automatically and queues events locally when offline.

**Multi-machine model**
- Each machine is a distinct view in the cloud (e.g., “Work MacBook”).
- Git remains the mechanism for syncing between machines.
- Cloud does **not** resolve merge conflicts between machines.

## Protocol & Data Model (Bridge ↔ Cloud)

**Identity**
- `machine_id` (stable UUID) + user-defined `machine_label` (default hostname).
- `project_id` per LeanSpec workspace (multi-project support).

**Event types (bridge → cloud)**
- `snapshot` (initial full state summary per project).
- `spec_changed` / `spec_deleted` (path, metadata, content hash).
- `heartbeat` (online status, version, queue depth).

**Command types (cloud → bridge)**
- `apply_metadata` (status/priority/tags + expected `content_hash`).
- `rename_machine` / `revoke_machine`.

**Conflict check**
- Cloud sends expected `content_hash`; bridge rejects if mismatch and returns current hash.

## Plan

Phased implementation checklist below.

### Phase 1: Remote Viewing
- [x] Define bridge ↔ cloud protocol and auth handshake.
- [x] Implement local bridge core: file watcher, initial snapshot, offline queue, reconnect.
- [x] Add cloud sync API: ingest events, per-machine storage, online/offline status.
- [x] UI: Global Machine Switcher in top app bar (persist selection).
- [x] UI: Machine Management page (list, status, rename, revoke).
- [x] UI: Project list scoped to selected machine.
- [x] Document setup + security model (device flow, TLS, key rotation).

### Phase 2: Remote Editing (Metadata Only)
- [x] Add `apply_metadata` command path with conflict check via `content_hash`.
- [x] Surface “machine unavailable” state for offline bridges; block edits.
- [x] Audit log entry per remote edit (cloud + bridge local log).

### Phase 3: AI Agent Integration (Follow-on)
- [x] Add generic “local execution request” command with audit logging only.

## Acceptance Criteria

- [x] All phase-specific criteria below are met.

### Phase 1: Remote Viewing
- [x] Global Machine Switcher persists selection across navigation.
- [x] Machine Management page lists bridges + status (online/offline).
- [x] Cloud UI lists projects for the selected machine.
- [x] Local change appears in cloud UI within 3 seconds on stable network.
- [x] Bridge runs on Mac/Windows/Linux with <50MB RAM idle.
- [x] Auth works with device flow (primary) and optional API key; all traffic over TLS.
- [x] Offline queue survives bridge restart and flushes on reconnect.

### Phase 2: Remote Editing (Metadata Only)
- [x] User selects target machine before editing.
- [x] Status/priority/tags edits are applied locally and reflected in cloud.
- [x] Conflict check rejects edits if local file `content_hash` differs from view load.
- [x] Offline machine shows “unavailable” and does not accept edits.

### Phase 3: AI Agent Integration (Follow-on)
- [x] Cloud can trigger a local execution request routed to bridge.
- [x] Bridge records audit log entries for each remote action.

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

## Decisions

- Naming: **Sync Bridge**.
- Auth: Device flow primary; API key optional for CI/headless.
- Conflict check: `content_hash` match required.
- Offline edits: rejected with “unavailable” state (no cloud-side queue).
- Machine naming: default hostname, user-editable label.

## Notes

- Git remains the multi-machine sync mechanism; the cloud shows per-machine state only.
- Remote edits are **explicit** and **machine-scoped** to preserve local ownership.

## Implementation Notes

- Added a cloud sync state store in the Rust HTTP server to track machines, projects, specs, audit logs, and pending commands.
- Implemented device flow endpoints, API key authentication, event ingestion, and WebSocket command delivery under `/api/sync/*`.
- Added machine-scoped routing in the existing project/spec endpoints using the `X-LeanSpec-Machine` header.
- Introduced `content_hash` in spec list/detail responses and enforced conflict checks for metadata updates.
- Implemented the Sync Bridge binary (`leanspec-sync-bridge`) with file watching, snapshot publishing, offline queueing, reconnect logic, and command handling.
- Added UI machine context, global switcher, machine management page, and offline edit blocking with clear “unavailable” messaging.
- Documented setup and security model in `docs/cloud-sync-bridge.md` (device flow, TLS, key rotation).