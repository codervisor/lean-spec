---
status: in-progress
created: 2026-02-05
priority: high
tags:
- ai
- chat
- ux
- enhancement
parent: 094-ai-chatbot-web-integration
created_at: 2026-02-05T07:52:28.925855315Z
updated_at: 2026-02-06T13:49:23.050156Z
transitions:
- status: in-progress
  at: 2026-02-06T13:49:23.050156Z
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

## Implementation Notes (Codebase Findings)

### Existing Chat Sidebar Context

- The sidebar used in the app layout is [packages/ui/src/components/chat/ChatSidebar.tsx](../../packages/ui/src/components/chat/ChatSidebar.tsx). It is mounted in [packages/ui/src/components/Layout.tsx](../../packages/ui/src/components/Layout.tsx) and uses `useLeanSpecChat`.
- A separate, full-page chat UI exists at [packages/ui/src/pages/ChatPage.tsx](../../packages/ui/src/pages/ChatPage.tsx) with its own sidebar component. This spec should only affect the layout sidebar unless explicitly extended.

### Conversation History UI (Already Built)

- There is an unused history panel component: [packages/ui/src/components/chat/ChatHistory.tsx](../../packages/ui/src/components/chat/ChatHistory.tsx).
- `ChatContext` already tracks `showHistory` with `toggleHistory()` in [packages/ui/src/contexts/ChatContext.tsx](../../packages/ui/src/contexts/ChatContext.tsx).
- Recommendation: reuse `ChatHistory` and wire it to a new history button instead of building from scratch.

### Auto-Title Generation Reality Check

- Backend defaults new titles to `New Chat` in [rust/leanspec-core/src/storage/chat_store.rs](../../rust/leanspec-core/src/storage/chat_store.rs).
- There is no `/api/chat/sessions/:id/generate-title` endpoint. The only server write is `PATCH /api/chat/sessions/:id` via `ChatApi.updateThread()`.
- Existing auto-title behavior already exists in [packages/ui/src/pages/ChatPage.tsx](../../packages/ui/src/pages/ChatPage.tsx) using a simple heuristic (first user message). Reuse or extract this logic to avoid duplication (DRY).

### Keyboard Shortcuts Integration

- Global shortcuts are registered via `useGlobalShortcuts()` in [packages/ui/src/hooks/useKeyboardShortcuts.ts](../../packages/ui/src/hooks/useKeyboardShortcuts.ts) and installed in [packages/ui/src/components/Layout.tsx](../../packages/ui/src/components/Layout.tsx).
- `Ctrl/Cmd+Shift+I` already toggles the chat sidebar. New shortcuts should extend this system instead of adding another listener.
- `useKeyboardShortcuts` already ignores inputs/selects, and the sidebar stops propagation for inputs in `ChatSidebar`.

### Settings Navigation

- Global settings live under `/settings/*` in [packages/ui/src/router.tsx](../../packages/ui/src/router.tsx).
- Chat-specific settings route exists at `/projects/:projectId/chat/settings` in [packages/ui/src/router/projectRoutes.tsx](../../packages/ui/src/router/projectRoutes.tsx).
- Decision: route the gear icon to global AI settings at `/settings/ai`.

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
- [ ] Extract title display from `ConversationSelector` dropdown in [packages/ui/src/components/chat/ChatSidebar.tsx](../../packages/ui/src/components/chat/ChatSidebar.tsx)
- [ ] Add dedicated history button (`History` icon from `lucide-react`) next to the new chat button
- [ ] Reuse [packages/ui/src/components/chat/ChatHistory.tsx](../../packages/ui/src/components/chat/ChatHistory.tsx) as the history panel (popover or slide-out)
- [ ] Wire the button to `toggleHistory()` from [packages/ui/src/contexts/ChatContext.tsx](../../packages/ui/src/contexts/ChatContext.tsx)

### Phase 2: Auto Title Generation
- [ ] Extract shared auto-title logic from [packages/ui/src/pages/ChatPage.tsx](../../packages/ui/src/pages/ChatPage.tsx) into a reusable helper/hook
- [ ] Trigger title generation after the first assistant response when the thread title is still `New Chat`
- [ ] Use `ChatApi.updateThread()` to persist the generated title (no new backend endpoint today)
- [ ] Fallback: first 50 chars of the initial user message if generation fails

### Phase 3: Keyboard Shortcuts
- [ ] Extend `useGlobalShortcuts()` in [packages/ui/src/hooks/useKeyboardShortcuts.ts](../../packages/ui/src/hooks/useKeyboardShortcuts.ts) with new chat actions
- [ ] Implement toggle, focus, new conversation, history shortcuts (avoid conflicts with existing `Ctrl/Cmd+Shift+I`)
- [ ] Add tooltips showing shortcuts on hover for buttons in [packages/ui/src/components/chat/ChatSidebar.tsx](../../packages/ui/src/components/chat/ChatSidebar.tsx)
- [ ] Ensure shortcuts do not fire when typing in inputs or textareas

### Phase 4: Settings Navigation
- [ ] Add `onClick` handler to settings button in [packages/ui/src/components/chat/ChatSidebar.tsx](../../packages/ui/src/components/chat/ChatSidebar.tsx)
- [ ] Navigate to `/settings/ai` (global AI models/settings)
- [ ] Ensure the models tab exists in [packages/ui/src/layouts/SettingsLayout.tsx](../../packages/ui/src/layouts/SettingsLayout.tsx)

### Phase 5: Loading Indicator Improvement
- [ ] Create `ThinkingIndicator` component (suggested: [packages/ui/src/components/chat/ThinkingIndicator.tsx](../../packages/ui/src/components/chat/ThinkingIndicator.tsx))
- [ ] Style as assistant message bubble using `Message`/`MessageContent` patterns from [packages/ui/src/components/chat/ChatMessage.tsx](../../packages/ui/src/components/chat/ChatMessage.tsx)
- [ ] Replace `Loader` usage in [packages/ui/src/components/chat/ChatContainer.tsx](../../packages/ui/src/components/chat/ChatContainer.tsx)
- [ ] Add optional "Thinking..." label, no layout shift when toggling

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

## Progress Notes

- 2026-02-06: Verified in code: history button + popover using `ChatHistory` with `toggleHistory`, static title display in sidebar header, `ThinkingIndicator` replaces loader, `useAutoTitle` hook with `/api/chat/generate-title`, shortcuts for toggle/focus/new/history plus input guard.
- Pending: settings gear routes to `/settings?tab=models` (no tab handling; spec calls for AI settings route), missing `Escape` shortcut to close sidebar, no tests found for history panel/auto-title/shortcuts/mobile access/layout shift, tests not run.

## References

- [ChatSidebar.tsx](../../packages/ui/src/components/chat/ChatSidebar.tsx) - Current sidebar implementation
- [ChatContainer.tsx](../../packages/ui/src/components/chat/ChatContainer.tsx) - Chat container with loading state
- [ChatContext.tsx](../../packages/ui/src/contexts/ChatContext.tsx) - Chat state management
- [chat-api.ts](../../packages/ui/src/lib/chat-api.ts) - API client for chat operations
- [loader.tsx](../../packages/ui-components/src/components/ai-elements/loader.tsx) - Current loader component
- Spec 308 - AI Chat Conversation History Fix (related, complete)
