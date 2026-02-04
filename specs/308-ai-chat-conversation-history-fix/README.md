---
status: planned
created: 2026-02-04
priority: high
tags:
- ai
- chat
- ux
- bug-fix
parent: 094-ai-chatbot-web-integration
created_at: 2026-02-04T15:17:19.297574Z
updated_at: 2026-02-04T15:19:06.014425Z
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
- [ ] Verify backend `/api/chat/sessions` returns data correctly
- [ ] Check if project ID is passed correctly from UI
- [ ] Confirm SQLite database has stored sessions
- [ ] Test conversation selection loads messages

### Phase 2: Frontend Fixes
- [ ] Auto-load conversations when chat opens (fix `refreshConversations`)
- [ ] Load messages when conversation selected (`selectConversation`)
- [ ] Auto-save messages after each exchange completes
- [ ] Expand history panel by default or add prominent indicator
- [ ] Add loading states for conversation list

### Phase 3: Session Management
- [ ] Create session on first user message if no active session
- [ ] Update session title from first message content
- [ ] Sync active session ID across refreshes
- [ ] Handle orphaned sessions (no messages)

### Phase 4: UX Improvements
- [ ] Empty state with "Start a conversation" prompt
- [ ] Show message preview in conversation list
- [ ] Sort conversations by most recent
- [ ] Add conversation rename capability

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

**Related Specs:**
- [094-ai-chatbot-web-integration](../094-ai-chatbot-web-integration/README.md) - Parent AI chat spec
- [223-chat-persistence-strategy](../223-chat-persistence-strategy/README.md) - Archived persistence spec
