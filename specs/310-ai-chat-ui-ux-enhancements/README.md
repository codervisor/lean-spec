---
status: planned
created: 2026-02-05
priority: high
tags:
- ai
- chat
- ux
- enhancement
parent: 094-ai-chatbot-web-integration
created_at: 2026-02-05T07:52:28.925855315Z
updated_at: 2026-02-05T07:52:45.836507706Z
---
# AI Chat UI/UX Enhancements

> **Status**: planned · **Priority**: high · **Created**: 2026-02-05

## Overview

Improve the AI chat sidebar UX with better history access, automatic title generation, keyboard shortcuts, settings navigation, and an improved loading indicator.

**Why now?**
- Chat history is buried in the conversation selector dropdown, reducing discoverability
- Chat titles remain "Untitled Chat" forever, making history useless for navigation
- Power users need keyboard shortcuts for efficient chat workflow
- Settings gear icon doesn't navigate anywhere currently
- Loading indicator is a centered spinner instead of an assistant-like thinking bubble

## Current State

The chat sidebar ([ChatSidebar.tsx](../../packages/ui/src/components/chat/ChatSidebar.tsx)) has:
- `ConversationSelector` dropdown combining title display and history access
- Plus button for new chat
- Settings gear icon (non-functional)
- Close button

Loading indicator ([ChatContainer.tsx](../../packages/ui/src/components/chat/ChatContainer.tsx)):
- Currently shows a centered spinning `Loader` component
- Appears after messages when `isLoading` is true
- No contextual styling or typing indicator pattern

## Design

### 1. Separate Chat History Button

**Current:** History buried in conversation selector dropdown  
**Proposed:** Add dedicated history button next to new chat button

```
[ Chat Title                     ] [+] [📜] [⚙️] [×]
                                   New|Hist|Set|Close
```

- History button opens a slide-out panel or popover with full conversation list
- Keep the conversation title display as static text (not a dropdown trigger)
- History panel should show: title, preview, timestamp, search

### 2. Auto-Generate Chat Title

**Trigger:** After first user message is sent and AI responds  
**Method:** Use LLM to generate a concise title (5-7 words max) based on query

Implementation approach:
- Add title generation API endpoint or use inline inference
- Call after first message exchange completes
- Update conversation in backend with generated title
- Refresh conversation list to show new title

Fallback: If generation fails, use first 50 chars of user message

### 3. Keyboard Shortcuts

| Action | Shortcut (Mac) | Shortcut (Windows/Linux) |
|--------|----------------|--------------------------|
| Toggle chat sidebar | `Cmd+Shift+L` | `Ctrl+Shift+L` |
| Focus chat input | `Cmd+Shift+I` | `Ctrl+Shift+I` |
| New conversation | `Cmd+Shift+N` | `Ctrl+Shift+N` |
| View history | `Cmd+Shift+H` | `Ctrl+Shift+H` |
| Close sidebar | `Escape` | `Escape` |

- Register shortcuts globally (when chat context is active)
- Show shortcuts in tooltips for buttons
- Add keyboard shortcut reference in settings or help

### 4. Settings Gear Navigation

**Current:** Gear icon has no functionality  
**Proposed:** Navigate to Settings page, AI Models tab

- Settings page: `/settings` 
- AI Models tab: `/settings?tab=models` or `/settings#models`
- Use existing navigation (React Router or Next.js router)

### 5. Improved Loading/Thinking Indicator

**Current:** Centered spinning loader  
**Proposed:** Assistant-style thinking bubble with animated dots

Design:
- Show as an assistant message bubble (left-aligned with avatar)
- Use animated "typing dots" pattern (3 dots pulsing)
- Optional: Add text like "Thinking..." or "Generating..."
- Match assistant message styling for visual consistency

```
┌─────────────────────────────────┐
│ 🤖  ● ● ●                       │ ← Thinking indicator
└─────────────────────────────────┘
```

Benefits:
- Clearer that AI is processing (not system loading)
- Consistent visual language with chat messages
- Less jarring than centered spinner
- Common pattern users recognize from other chat apps

## Plan

### Phase 1: History Button UI
- [ ] Extract title display from `ConversationSelector` dropdown
- [ ] Add dedicated history button (`Clock` or `History` icon from lucide)
- [ ] Create `ChatHistoryPanel` component with slide-out or popover UI
- [ ] Wire button to open history panel

### Phase 2: Auto Title Generation
- [ ] Add `/api/chat/sessions/:id/generate-title` endpoint (or use client-side generation)
- [ ] Implement title generation prompt (simple: "Generate a 5-word title for this conversation")
- [ ] Hook into conversation flow: generate after first AI response
- [ ] Update UI to show generated title

### Phase 3: Keyboard Shortcuts
- [ ] Create `useChatShortcuts` hook for registering shortcuts
- [ ] Implement toggle, focus, new, history shortcuts
- [ ] Add tooltips showing shortcuts on hover
- [ ] Respect focus context (don't trigger when typing in inputs)

### Phase 4: Settings Navigation
- [ ] Add `onClick` handler to settings button
- [ ] Navigate to settings page with models tab active
- [ ] Verify settings page has models tab or create if missing

### Phase 5: Loading Indicator Improvement
- [ ] Create `ThinkingIndicator` component with typing dots animation
- [ ] Style as assistant message bubble (match `ChatMessage` for assistant)
- [ ] Replace centered `Loader` with new indicator in `ChatContainer`
- [ ] Add optional "Thinking..." text label
- [ ] Ensure smooth animation without layout shift

## Test

- [ ] History button opens panel with full conversation list
- [ ] New chat with first message → title auto-generates after response
- [ ] All keyboard shortcuts work correctly
- [ ] Shortcuts don't trigger when typing in chat input
- [ ] Gear icon navigates to settings → AI models tab
- [ ] Mobile: history accessible via tap
- [ ] Loading indicator appears as assistant bubble with dots
- [ ] Indicator shows immediately when sending message
- [ ] No layout shift when indicator appears/disappears

## Non-Goals

- Full chat history page (separate feature)
- Chat export functionality
- Full-text search across all chats
- Multi-select/bulk operations on history
- Streaming progress percentage

## References

- [ChatSidebar.tsx](../../packages/ui/src/components/chat/ChatSidebar.tsx) - Current sidebar implementation
- [ChatContainer.tsx](../../packages/ui/src/components/chat/ChatContainer.tsx) - Chat container with loading state
- [ChatContext.tsx](../../packages/ui/src/contexts/ChatContext.tsx) - Chat state management
- [chat-api.ts](../../packages/ui/src/lib/chat-api.ts) - API client for chat operations
- [loader.tsx](../../packages/ui-components/src/components/ai-elements/loader.tsx) - Current loader component
- Spec 308 - AI Chat Conversation History Fix (related, complete)
