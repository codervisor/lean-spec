---
status: planned
created: 2026-01-30
priority: high
tags:
- refactoring
- backend
- cleanup
depends_on:
- 237-rust-ipc-ai-chat-bridge
parent: 259-technical-debt-refactoring
created_at: 2026-01-30T09:19:57.381871Z
updated_at: 2026-01-30T09:20:17.986512Z
---

# Chat Server Retirement

## Overview

Remove the deprecated @leanspec/chat-server package once the IPC-based AI worker replacement is available in-repo.

## Design

- Replacement is @leanspec/ai-worker (see spec 237). The codebase must include an actual package or renamed module before removal.
- No workspace references should remain to @leanspec/chat-server after deletion.

## Plan

- [ ] Confirm @leanspec/ai-worker exists in the repository (or rename chat-server to ai-worker per spec 237 option).
- [ ] Identify any internal references to @leanspec/chat-server and plan migration updates.
- [ ] Remove packages/chat-server and update workspace configuration if needed.
- [ ] Ensure package.json references and documentation are updated to ai-worker.

## Test

- [ ] pnpm pre-release

## Notes

Do not delete chat-server until the ai-worker package is present and integrated.