---
status: planned
created: 2026-02-24
priority: high
tags:
- sessions
- reliability
- timeout
created_at: 2026-02-24T07:25:39.461850Z
updated_at: 2026-02-24T07:25:39.461850Z
---

# Session Watchdog Timeout Policy

## Overview

Session handling currently risks two opposite failures: sessions that run forever when genuinely stuck, and legitimate long-running sessions that would be incorrectly killed by a simple hard timeout. We need a policy that is safe for multi-hour work while still detecting hung or inactive sessions.

## Design

Implement a multi-signal watchdog model:

- **Startup timeout**: Fail sessions that never become healthy during initial startup window.
- **Inactivity timeout**: Terminate sessions only when no activity is observed for a configurable period.
- **Optional max-duration timeout**: Keep disabled by default; available as an explicit upper bound.
- **Heartbeat support**: Treat runner heartbeat events as activity to protect quiet but healthy long runs.
- **Warning + grace period**: Emit warning before termination and allow recovery activity to cancel termination.

Configuration hierarchy:

1. Per-session overrides (CLI/API inputs)
2. Runner-level defaults (`runners.json`)
3. Global defaults (safe, long-running-friendly)

Backwards compatibility:

- Existing behavior remains valid if no new timeout settings are provided.
- Existing sessions continue to read/write logs and lifecycle events in compatible format.

## Plan

- [ ] Define timeout policy model in core session types (startup, inactivity, optional max-duration, grace period)
- [ ] Extend session creation interfaces (CLI + HTTP) for per-session timeout settings
- [ ] Add runner default timeout fields in runner config loading/validation
- [ ] Implement watchdog logic in `SessionManager` using activity timestamps instead of raw wall-clock only
- [ ] Add warning lifecycle events/logs before timeout-triggered termination
- [ ] Ensure heartbeat and stdout/stderr logs both refresh activity
- [ ] Add migration-safe defaults and docs for long-running sessions
- [ ] Add unit/integration tests for each timeout mode and cancellation-on-activity behavior

## Test

- [ ] Startup timeout triggers failure when runner never emits readiness/activity
- [ ] Inactivity timeout does not trigger when periodic heartbeat/log activity continues
- [ ] Inactivity timeout triggers after no activity for configured interval plus grace
- [ ] Max-duration timeout (when enabled) terminates even with activity
- [ ] Timeout warning is emitted before forced termination
- [ ] Per-session override takes precedence over runner/global defaults
- [ ] Existing sessions without timeout config continue functioning

## Notes

Design objective is to optimize for correctness over aggressiveness: avoid killing productive long sessions while still cleaning up truly stalled runs. Use conservative defaults (long inactivity windows, max-duration off by default) and explicit operator controls for stricter policies.