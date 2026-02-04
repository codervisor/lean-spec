---
status: in-progress
created: 2026-02-04
priority: high
tags:
- ai
- chat
- ux
- bug-fix
parent: 094-ai-chatbot-web-integration
created_at: 2026-02-04T15:17:19.297574Z
updated_at: 2026-02-04T15:48:34.569426011Z
transitions:
- status: in-progress
  at: 2026-02-04T15:48:34.569426011Z
---

# AI Chat Missing Conversation History

> **Status**: planned · **Priority**: high · **Created**: 2026-02-04

## Overview

Users cannot see or access their historical AI chat conversations in the web UI. While the backend infrastructure for chat persistence exists (SQLite storage, REST API endpoints), the frontend experience doesn't reliably display past conversations, making it impossible for users to continue previous chats or reference past interactions.

**Why now?**
- Core AI chat functionality is incomplete without history access
- Users lose context between sessions, reducing productivity
- Implementation infrastructure exists but integration is broken/incomplete

## Problem Analysis

**Current State:**
- Backend: SQLite storage at `~/.leanspec/chat.db` with sessions/messages tables
- API: REST endpoints at `/api/chat/sessions` (list, create, get, delete)
- Frontend: `ChatHistory.tsx` component with conversation sidebar
- State: `ChatContext.tsx` manages conversation state via `useLocalStorage`

**Potential Issues (to investigate):**
1. Conversations not loading on initial render
2. History panel collapsed by default (discoverability)
3. Session messages not loading when selecting conversation
4. No auto-save of current conversation
5. Project ID mismatch between UI and backend

## Design

### Key Files
- [packages/ui/src/contexts/ChatContext.tsx](../../packages/ui/src/contexts/ChatContext.tsx) - State management
- [packages/ui/src/components/chat/ChatHistory.tsx](../../packages/ui/src/components/chat/ChatHistory.tsx) - History UI
- [packages/ui/src/lib/chat-api.ts](../../packages/ui/src/lib/chat-api.ts) - API client
- [rust/leanspec-http/src/handlers/chat_sessions.rs](../../rust/leanspec-http/src/handlers/chat_sessions.rs) - Backend handlers

### Fixes Required
1. **Auto-initialize conversation** - Create session on first message if none active
2. **Persist messages** - Auto-save after each message exchange
3. **Load on selection** - Fetch messages when user selects a conversation
4. **History visibility** - Show conversation list prominently in sidebar
5. **Empty state UX** - Clear guidance when no conversations exist

## Plan

### Phase 1: Diagnose
- [ ] Confirm which UI is the target for history (Layout sidebar vs Chat page). Layout uses [packages/ui/src/components/chat/ChatSidebar.tsx](packages/ui/src/components/chat/ChatSidebar.tsx); the Chat page uses [packages/ui/src/pages/ChatPage.tsx](packages/ui/src/pages/ChatPage.tsx) with [packages/ui/src/components/chat/sidebar/ChatSidebar.tsx](packages/ui/src/components/chat/sidebar/ChatSidebar.tsx).
- [ ] Verify `/api/chat/sessions?projectId=...` returns sessions for the active project in [packages/ui/src/lib/chat-api.ts](packages/ui/src/lib/chat-api.ts).

### Phase 2: Frontend Fixes
- [ ] Ensure conversations load on open/mount and project change in the chosen UI (currently only loads when the sidebar opens in [packages/ui/src/contexts/ChatContext.tsx](packages/ui/src/contexts/ChatContext.tsx)).
- [ ] Fix the “first message before session id” issue in the layout sidebar: replace the inline `createConversation` + send flow with a pending-message approach (like [packages/ui/src/pages/ChatPage.tsx](packages/ui/src/pages/ChatPage.tsx)) in [packages/ui/src/components/chat/ChatSidebar.tsx](packages/ui/src/components/chat/ChatSidebar.tsx).
- [ ] Load messages when selecting a conversation by relying on `useLeanSpecChat`’s `threadId` change behavior in [packages/ui/src/lib/use-chat.ts](packages/ui/src/lib/use-chat.ts).
- [ ] Make history visible by default or add a clear call-to-action (either wire [packages/ui/src/components/chat/ChatHistory.tsx](packages/ui/src/components/chat/ChatHistory.tsx) into the sidebar UI or ensure the Chat page’s sidebar is discoverable).

### Phase 3: Session Management
- [ ] Create sessions before first message and ensure messages are persisted after send (guard against `threadId` being undefined).
- [ ] Update session title/preview and refresh thread list after message save (use [packages/ui/src/lib/chat-api.ts](packages/ui/src/lib/chat-api.ts)).
- [ ] Keep active session ID consistent across refreshes (local storage or URL param as appropriate).

### Phase 4: UX Improvements
- [ ] Empty state with “Start a conversation” prompt (sidebar and/or Chat page).
- [ ] Show message preview in conversation list (already available via `preview` in [packages/ui/src/lib/chat-api.ts](packages/ui/src/lib/chat-api.ts)).
- [ ] Sort conversations by most recent in the UI if backend ordering is not guaranteed.
- [ ] Add conversation rename capability (already present in Chat page sidebar).

## Test

- [ ] Send message → refresh page → conversation appears in history
- [ ] Select past conversation → messages load correctly
- [ ] Multiple projects → conversations isolated correctly
- [ ] Delete conversation → removed from list
- [ ] New session → appears in history after first message

## Non-Goals

- Cloud sync (separate spec 223)
- Full-text search
- Export functionality
- Multi-device sync

## Notes

### Codebase Findings

- Chat history UI is split: the Layout sidebar uses [packages/ui/src/components/chat/ChatSidebar.tsx](packages/ui/src/components/chat/ChatSidebar.tsx) with [packages/ui/src/contexts/ChatContext.tsx](packages/ui/src/contexts/ChatContext.tsx), while the Chat page uses [packages/ui/src/pages/ChatPage.tsx](packages/ui/src/pages/ChatPage.tsx) and [packages/ui/src/components/chat/sidebar/ChatSidebar.tsx](packages/ui/src/components/chat/sidebar/ChatSidebar.tsx).
- [packages/ui/src/components/chat/ChatHistory.tsx](packages/ui/src/components/chat/ChatHistory.tsx) is not wired into the Layout sidebar; it only renders when a parent includes it.
- [packages/ui/src/components/chat/ChatSidebar.tsx](packages/ui/src/components/chat/ChatSidebar.tsx) sends a message immediately after `createConversation()` but notes the `threadId` won’t be available yet, which can lead to messages not being persisted.
- [packages/ui/src/lib/use-chat.ts](packages/ui/src/lib/use-chat.ts) loads messages whenever `threadId` changes, so selection should populate history if the active thread ID is set before sending.
- [packages/ui/src/lib/chat-api.ts](packages/ui/src/lib/chat-api.ts) requires `projectId` for `/api/chat/sessions` and defaults missing provider/model to `openai/gpt-4o`, which can obscure session data issues.
