---
status: archived
created: 2026-01-22
priority: low
tags:
- refactoring
- chat
- ai
- technical-debt
parent: 094-ai-chatbot-web-integration
created_at: 2026-01-22T14:41:42.166295Z
updated_at: 2026-02-02T08:21:55.686683318Z
---
# Refactor Chat Code to Align with Vercel AI SDK Terminology

## Overview

Refactor the existing chat codebase to use consistent terminology aligned with Vercel AI SDK conventions. Currently, the code uses "thread" terminology (from spec 223), but Vercel AI SDK uses "conversation/chat", "message", and "part" terminology.

**Current State**:
- `ChatThread` interface and related types
- `threadId` in hooks and components
- Backend uses "session" terminology (from spec 223)
- Inconsistent naming between frontend (thread) and backend (session)
- Methods named `getThreads()`, `createThread()`, etc.

**Target State**:
- `Conversation` interface (aligned with AI SDK)
- `conversationId` in hooks and components
- Backend aligned to use "conversation" or keep "session" as implementation detail
- Consistent terminology across all layers
- Methods named `getConversations()`, `createConversation()`, etc.

**Why This Matters**:
- Aligns with industry-standard AI SDK conventions
- Reduces cognitive load when working with AI SDK documentation
- Makes code more maintainable and understandable
- Prepares for spec 234 (right sidebar redesign) which uses new terminology
- Better semantic clarity: "conversation" is clearer than "thread" in chat context

## Design

### Terminology Mapping

**Vercel AI SDK Standard** (what we should use):
- **Conversation** or **Chat**: A persistent collection of messages
- **Message**: A single exchange with a role (user/assistant/system) and parts
- **Part**: Component of a message (text, tool-call, tool-result, data, etc.)

**Current Code** (what we have):
- **Thread**: Currently used for conversation
- **Session**: Used in backend API (spec 223)
- **Message**: Already correct ✅
- **Parts**: Already used in UIMessage ✅

**Migration Strategy**:
1. **Frontend**: `thread` → `conversation` everywhere
2. **Backend API**: Keep `session` in database/API paths, add `conversation` aliases
3. **Types**: Rename interfaces, maintain backward compatibility with type aliases during migration

### Code Changes Required

#### 1. Type Definitions (`chat-api.ts`)

**Before**:
```typescript
export interface ChatThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  model: { providerId: string; modelId: string };
  messageCount: number;
  preview: string;
}
```

**After**:
```typescript
export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  model: { providerId: string; modelId: string };
  messageCount: number;
  preview: string;
}

// Backward compatibility (deprecated)
/** @deprecated Use Conversation instead */
export type ChatThread = Conversation;
```

#### 2. API Methods (`chat-api.ts`)

**Before**:
```typescript
class ChatApi {
  static async getThreads(projectId?: string): Promise<ChatThread[]>
  static async createThread(...): Promise<ChatThread>
  static async updateThread(id: string, ...): Promise<ChatThread>
  static async deleteThread(id: string): Promise<void>
}
```

**After**:
```typescript
class ChatApi {
  static async getConversations(projectId?: string): Promise<Conversation[]>
  static async createConversation(...): Promise<Conversation>
  static async updateConversation(id: string, ...): Promise<Conversation>
  static async deleteConversation(id: string): Promise<void>
  
  // Keep backend API path as /sessions (implementation detail)
  // Private helper: toConversation(session: ChatSessionDto)
}
```

#### 3. React Hook (`use-chat.ts`)

**Before**:
```typescript
interface UseLeanSpecChatOptions {
  providerId?: string;
  modelId?: string;
  threadId?: string;
}
```

**After**:
```typescript
interface UseLeanSpecChatOptions {
  providerId?: string;
  modelId?: string;
  conversationId?: string;
}
```

#### 4. Components

**GlobalChatWidget.tsx** - Update state variables:
```typescript
// Before
const [threads, setThreads] = useState<ChatThread[]>([]);
const [activeThreadId, setActiveThreadId] = useState<string | undefined>();
const loadThreads = useCallback(async () => { ... });

// After
const [conversations, setConversations] = useState<Conversation[]>([]);
const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
const loadConversations = useCallback(async () => { ... });
```

**Update hook usage**:
```typescript
// Before
useLeanSpecChat({ threadId: activeThreadId })

// After
useLeanSpecChat({ conversationId: activeConversationId })
```

#### 5. Backend API Paths (Optional)

**Current** (from spec 223):
- `GET /api/chat/sessions`
- `POST /api/chat/sessions`
- `PATCH /api/chat/sessions/:id`
- `DELETE /api/chat/sessions/:id`
- `GET /api/chat/sessions/:id` (with messages)

**Options**:
1. **Keep as-is**: Treat "session" as internal implementation detail, frontend uses "conversation"
2. **Add aliases**: Add `/api/chat/conversations` that proxies to `/sessions`
3. **Full rename**: Rename all endpoints (breaking change, requires backend migration)

**Recommendation**: Option 1 - Keep backend paths, refactor frontend only. Backend "session" is fine as implementation detail.

### Migration Checklist

**Phase 1: Types & Interfaces**
- [ ] Rename `ChatThread` → `Conversation` in `chat-api.ts`
- [ ] Add deprecated type alias: `type ChatThread = Conversation`
- [ ] Update `ChatSessionDto` → `ConversationDto` (internal)
- [ ] Add JSDoc deprecation warnings

**Phase 2: API Methods**
- [ ] Rename methods: `getThreads` → `getConversations`
- [ ] Rename methods: `createThread` → `createConversation`
- [ ] Rename methods: `updateThread` → `updateConversation`
- [ ] Rename methods: `deleteThread` → `deleteConversation`
- [ ] Keep internal helper name: `toConversation` (was `toThread`)

**Phase 3: React Hook**
- [ ] Rename parameter: `threadId` → `conversationId` in `UseLeanSpecChatOptions`
- [ ] Update internal usage: `options.threadId` → `options.conversationId`
- [ ] Update comments and documentation

**Phase 4: Components**
- [ ] `GlobalChatWidget.tsx`: Rename all thread → conversation variables
- [ ] Update imports: `ChatThread` → `Conversation`
- [ ] Update state: `threads` → `conversations`, `activeThreadId` → `activeConversationId`
- [ ] Update function names: `loadThreads` → `loadConversations`
- [ ] Update UI text if any says "thread"

**Phase 5: Other Components**
- [ ] Search for all instances of "thread" in `packages/ui/src/`
- [ ] Update any other components using thread terminology
- [ ] Update comments and JSDoc

**Phase 6: Testing**
- [ ] Update test files to use new terminology
- [ ] Verify no runtime errors
- [ ] Check TypeScript compilation
- [ ] Verify backward compatibility with deprecated types

**Phase 7: Cleanup**
- [ ] Remove deprecated type aliases (in next major version)
- [ ] Update documentation
- [ ] Add migration guide if needed

## Plan

### Phase 1: Type Definitions (1 hour)
- [ ] Update `chat-api.ts` interface: `ChatThread` → `Conversation`
- [ ] Add deprecated type alias for backward compatibility
- [ ] Update internal DTOs: `ChatSessionDto` remains (backend contract)
- [ ] Add JSDoc comments explaining the change

### Phase 2: API Methods (1 hour)
- [ ] Rename all ChatApi methods: `*Thread` → `*Conversation`
- [ ] Update method signatures and return types
- [ ] Keep backend API paths unchanged (`/sessions`)
- [ ] Update internal helpers: `toThread` → `toConversation`

### Phase 3: React Hook (30 minutes)
- [ ] Update `use-chat.ts` interface: `threadId` → `conversationId`
- [ ] Update all internal references
- [ ] Update hook documentation
- [ ] Verify AI SDK integration still works

### Phase 4: Component Refactoring (2 hours)
- [ ] Update `GlobalChatWidget.tsx` completely
- [ ] Search and replace in all components:
  - `threads` → `conversations`
  - `thread` → `conversation`
  - `activeThreadId` → `activeConversationId`
  - `ThreadItem` → `ConversationItem` (if exists)
- [ ] Update function names consistently
- [ ] Verify no UI text says "thread"

### Phase 5: Testing & Validation (1 hour)
- [ ] Run TypeScript type check: `pnpm typecheck`
- [ ] Test chat functionality manually:
  - Create conversation
  - Send messages
  - Switch conversations
  - Delete conversation
- [ ] Verify no console errors
- [ ] Check backward compatibility

### Phase 6: Documentation (30 minutes)
- [ ] Update code comments
- [ ] Add changelog entry
- [ ] Update any developer documentation
- [ ] Note breaking changes if any

### Phase 7: Cleanup (Optional - Future)
- [ ] Mark for removal: Deprecated type aliases
- [ ] Schedule removal for next major version
- [ ] Add eslint rule to warn on deprecated usage

## Test

### Type Safety
- [ ] No TypeScript errors after refactoring
- [ ] Deprecated type aliases still work
- [ ] IDE autocomplete suggests new terminology

### Runtime Behavior
- [ ] All chat features work identically to before
- [ ] Create conversation
- [ ] Load conversation history
- [ ] Send messages
- [ ] Switch between conversations
- [ ] Delete conversation
- [ ] Model selection persists

### Integration
- [ ] AI SDK integration unchanged
- [ ] Backend API calls still work (using `/sessions` paths)
- [ ] Message persistence works
- [ ] Conversation metadata updates correctly

### Regression Testing
- [ ] No breaking changes for existing users
- [ ] No UI regressions
- [ ] No performance impact
- [ ] All existing tests pass

## Notes

**Why "Conversation" over "Thread"?**
- Standard in AI/chat applications (ChatGPT, Claude, Gemini use "conversation")
- Vercel AI SDK uses "conversation" in documentation and examples
- "Thread" is overloaded (email threads, forum threads, execution threads)
- More semantic clarity in chat context

**Backend Considerations**:
- Keep `/api/chat/sessions` paths (no breaking changes)
- "Session" is valid implementation detail (database table name)
- Frontend "conversation" maps to backend "session" transparently
- No backend code changes required for this refactor

**Backward Compatibility**:
- Type aliases ensure no immediate breaking changes
- Deprecation warnings guide developers to new API
- Remove aliases in next major version (v1.0?)

**Related Specs**:
- **Spec 223**: Chat persistence (defines backend session API) - no changes needed
- **Spec 234**: Right sidebar redesign - will use new terminology
- **Spec 227**: UI/UX modernization - updated to use new terminology

**Future Work** (out of scope):
- Backend refactoring to use "conversation" terminology
- Database migration: `sessions` → `conversations` table
- API versioning: `/v2/chat/conversations`