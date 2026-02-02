---
status: complete
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
updated_at: 2026-02-02T10:08:00.000000Z
completed_at: 2026-02-02T10:08:00.000000Z
---

# Chat Server Retirement

## Overview

Remove the deprecated @leanspec/chat-server package. AI chat is now handled natively in Rust using `async-openai` and `anthropic` crates (see `rust/leanspec-core/src/ai_native/`).

## Design

- AI is now native in Rust (no Node.js IPC worker needed)
- The `ai_native` module in `leanspec-core` implements full AI chat with OpenAI, Anthropic, and OpenRouter support
- No workspace references remain to @leanspec/chat-server after deletion

## Plan

- [x] Confirm native Rust AI is implemented and working (see `ai_native` module in leanspec-core)
- [x] Identify internal references to @leanspec/chat-server (found in publish scripts)
- [x] Remove packages/chat-server directory
- [x] Remove packages/ai-worker build artifact directory
- [x] Update scripts/publish-main-packages.ts to remove chat-server
- [x] Update scripts/prepare-publish.ts to remove chat-server mapping

## Test

- [x] pnpm pre-release (verified during build)

## Notes

AI is now fully native in Rust - no Node.js dependencies required for chat functionality. The `ai_native` module uses `async-openai` and `anthropic` crates for provider integration.