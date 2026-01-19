---
status: planned
created: 2026-01-19
priority: high
tags:
- chat
- persistence
- storage
- cloud-sync
- ui
created_at: 2026-01-19T07:54:03.056027248Z
updated_at: 2026-01-19T07:54:03.056027248Z
---

# Chat Message Persistence Strategy (Local & Cloud)

## Overview

LeanSpec currently stores chat messages in browser localStorage (key: `leanspec-chat-history`), which has significant limitations for production use. This spec defines a comprehensive persistence strategy that supports:

1. **Local-first**: Reliable local storage with proper data management
2. **Cloud sync**: Optional cloud backup/sync across devices
3. **Multi-project**: Separate chat histories per project
4. **Performance**: Fast retrieval and efficient storage

**Why now?**
- Current localStorage implementation is fragile (size limits, no error handling, single global history)
- Users need chat history to persist across browser sessions and device crashes
- Cloud sync enables multi-device workflows and team collaboration
- Foundation for future features (search, analytics, export)

**Current State:**
- Single global chat history in localStorage (`leanspec-chat-history`)
- ~5MB localStorage limit (browser-dependent)
- No per-project isolation
- No cloud backup
- No conversation management (only clear all)

## Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Layer (React)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  useChatPersistence() Hook                           │   │
│  │  - Load messages for current project                 │   │
│  │  - Save messages incrementally                       │   │
│  │  - Sync with cloud (if enabled)                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   IndexedDB  │  │  localStorage│  │  Cloud API   │
│   (primary)  │  │  (fallback)  │  │  (optional)  │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Storage Options

#### 1. Local Storage (Phase 1: MVP)

**Option A: IndexedDB (Recommended for production)**
- **Capacity**: ~50MB-1GB+ (browser-dependent)
- **Performance**: Fast indexed queries
- **Structure**: Proper database with indexes
- **Use case**: Primary local storage

**Option B: localStorage (Current, keep as fallback)**
- **Capacity**: ~5MB
- **Performance**: Synchronous, slower for large data
- **Use case**: Fallback + lightweight preferences

**Implementation Strategy:**
```typescript
// Storage adapter pattern
interface ChatStorageAdapter {
  saveConversation(projectId: string, messages: Message[]): Promise<void>;
  loadConversation(projectId: string): Promise<Message[]>;
  listConversations(projectId: string): Promise<ConversationMetadata[]>;
  deleteConversation(conversationId: string): Promise<void>;
  clearProject(projectId: string): Promise<void>;
}

class IndexedDBAdapter implements ChatStorageAdapter {
  // Primary implementation
}

class LocalStorageAdapter implements ChatStorageAdapter {
  // Fallback implementation
}
```

**IndexedDB Schema:**
```typescript
// Database: leanspec-chat-v1
// Object Stores:

// 1. conversations
{
  id: string;              // UUID
  projectId: string;       // Project identifier
  title: string;           // Auto-generated from first message
  createdAt: number;       // Timestamp
  updatedAt: number;       // Timestamp
  messageCount: number;
  lastMessage?: string;    // Preview text
  tags?: string[];
  archived: boolean;
}
// Indexes: projectId, createdAt, updatedAt

// 2. messages
{
  id: string;              // UUID
  conversationId: string;  // Foreign key
  projectId: string;       // Denormalized for queries
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    model?: string;
    tokens?: number;
    error?: string;
    toolCalls?: any[];
  };
}
// Indexes: conversationId, projectId, timestamp

// 3. sync_metadata (for cloud sync)
{
  conversationId: string;
  cloudId?: string;        // Remote ID if synced
  lastSyncedAt?: number;
  syncStatus: 'local-only' | 'synced' | 'conflict' | 'pending';
  version: number;         // For conflict resolution
}
```

#### 2. Cloud Storage (Phase 2: Optional Enhancement)

**Option A: LeanSpec Cloud (Future, via sync-bridge)**
- **Integration**: Use existing sync infrastructure (see specs/142-cloud-sync-mvp)
- **Auth**: OAuth device flow (already implemented)
- **Endpoint**: `POST /api/v1/chat/conversations`
- **Encryption**: Client-side encryption before upload (optional, privacy-focused)

**Option B: Third-party (e.g., Firebase, Supabase)**
- **Pros**: Ready-made real-time sync
- **Cons**: External dependency, privacy concerns
- **Decision**: Use LeanSpec Cloud for better integration

**Cloud Sync Strategy:**
```typescript
// Sync on events:
// 1. After each message completion (debounced)
// 2. On app startup (pull remote changes)
// 3. On project switch (lazy load)
// 4. Manual sync trigger

interface CloudSyncService {
  syncConversation(conversationId: string): Promise<void>;
  pullRemoteChanges(projectId: string): Promise<void>;
  pushLocalChanges(projectId: string): Promise<void>;
  resolveConflicts(conflicts: ConflictRecord[]): Promise<void>;
}
```

### Data Model

```typescript
interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    model?: string;
    tokens?: { input: number; output: number };
    error?: string;
    toolCalls?: ToolCall[];
    attachments?: Attachment[];
  };
}

interface Conversation {
  id: string;
  projectId: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  archived: boolean;
  tags?: string[];
  cloudId?: string; // If synced to cloud
}

interface ConversationMetadata {
  id: string;
  projectId: string;
  title: string;
  messageCount: number;
  lastMessage?: string;
  createdAt: number;
  updatedAt: number;
  archived: boolean;
}
```

### Migration Strategy

**From Current localStorage Implementation:**

```typescript
// packages/ui/src/lib/migrate-chat-storage.ts

async function migrateFromLocalStorage(): Promise<void> {
  const oldKey = 'leanspec-chat-history';
  const oldData = localStorage.getItem(oldKey);
  
  if (!oldData) return;
  
  try {
    const messages: UIMessage[] = JSON.parse(oldData);
    
    if (messages.length === 0) return;
    
    // Create a conversation from old messages
    const conversation: Conversation = {
      id: generateUUID(),
      projectId: 'default', // Assign to default project
      title: generateTitle(messages[0].content),
      messages: messages.map(msg => ({
        id: msg.id,
        conversationId: 'migrated',
        role: msg.role,
        content: msg.content,
        timestamp: Date.now(),
      })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      archived: false,
    };
    
    // Save to IndexedDB
    const adapter = new IndexedDBAdapter();
    await adapter.saveConversation('default', conversation.messages);
    
    // Remove old data
    localStorage.removeItem(oldKey);
    
    console.log('[Migration] Successfully migrated chat history to IndexedDB');
  } catch (error) {
    console.error('[Migration] Failed to migrate chat history:', error);
    // Keep old data intact on error
  }
}
```

### UI Components

**New Conversations Sidebar:**
```
┌─────────────────────────────────────┐
│ 📝 Conversations                    │
│ ┌─────────────────────────────────┐ │
│ │ 🔍 Search conversations...      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Today                               │
│ ▸ How to create a spec?        14:32│
│ ▸ Validate spec dependencies   09:15│
│                                     │
│ Yesterday                           │
│ ▸ MCP server setup             18:22│
│                                     │
│ Last 7 Days                         │
│ ▸ Publishing workflow          Jan 12│
│ ▸ Translation updates          Jan 10│
│                                     │
│ [+ New Chat]  [⚙️ Settings]        │
└─────────────────────────────────────┘
```

**Settings Panel:**
- Enable/disable cloud sync
- Auto-archive after N days
- Export conversations (JSON/Markdown)
- Clear all conversations (with confirmation)
- Storage usage indicator

## Plan

### Phase 1: Local IndexedDB Storage (MVP)

- [ ] **1.1 Create IndexedDB Adapter**
  - Implement `ChatStorageAdapter` interface
  - Create IndexedDB schema (conversations, messages, sync_metadata stores)
  - Add indexes for efficient queries
  - Error handling and fallback logic

- [ ] **1.2 Update useLeanSpecChat Hook**
  - Replace localStorage calls with storage adapter
  - Add conversation management functions
  - Implement auto-save on message completion
  - Add loading states and error handling

- [ ] **1.3 Build Conversations UI**
  - Create conversations sidebar component
  - Implement conversation list with grouping (Today/Yesterday/Last 7 days)
  - Add conversation search and filtering
  - Add "New Chat" and "Delete Conversation" actions

- [ ] **1.4 Migration Logic**
  - Detect old localStorage data on app startup
  - Migrate to IndexedDB with user notification
  - Clean up old localStorage key after successful migration
  - Add migration status indicator in UI

- [ ] **1.5 Testing**
  - Unit tests for IndexedDB adapter
  - Integration tests for conversation CRUD
  - Migration tests with various data states
  - Performance tests with large conversation histories

### Phase 2: Cloud Sync (Optional Enhancement)

- [ ] **2.1 Backend API Endpoints**
  - `GET /api/v1/chat/conversations?projectId={id}` - List conversations
  - `GET /api/v1/chat/conversations/{id}` - Get conversation details
  - `POST /api/v1/chat/conversations` - Create/update conversation
  - `DELETE /api/v1/chat/conversations/{id}` - Delete conversation
  - Add authentication and project ownership validation

- [ ] **2.2 Cloud Sync Service**
  - Implement CloudSyncService interface
  - Add sync queue for offline changes
  - Implement conflict resolution strategy (last-write-wins or manual)
  - Add retry logic with exponential backoff

- [ ] **2.3 Sync UI**
  - Add sync status indicator (synced/pending/error)
  - Add manual sync trigger button
  - Show sync conflicts and resolution UI
  - Add sync settings (auto-sync on/off, sync interval)

- [ ] **2.4 Client-Side Encryption (Optional)**
  - Generate encryption key from user password/device
  - Encrypt message content before upload
  - Store encryption metadata in sync_metadata
  - Add key management UI

- [ ] **2.5 Testing**
  - Test sync with multiple devices (simulate)
  - Test conflict resolution scenarios
  - Test offline mode and sync queue
  - Load testing with large conversation histories

### Phase 3: Advanced Features (Future)

- [ ] **3.1 Conversation Export**
  - Export to Markdown format
  - Export to JSON format
  - Export selected conversations or all

- [ ] **3.2 Conversation Analytics**
  - Track conversation length, duration
  - Model usage statistics
  - Token consumption tracking

- [ ] **3.3 Conversation Sharing**
  - Generate shareable links (read-only)
  - Share with team members
  - Public/private conversation settings

- [ ] **3.4 Advanced Search**
  - Full-text search across all messages
  - Filter by date range, model, tags
  - Search within specific project

## Test

### Manual Testing Scenarios

1. **Local Storage**
   - [ ] Create new conversation and verify persistence across page reload
   - [ ] Create multiple conversations for different projects
   - [ ] Delete a conversation and verify removal
   - [ ] Clear all conversations and verify empty state
   - [ ] Test with 50+ messages in a conversation (performance)
   - [ ] Test with 100+ conversations (list performance)

2. **Migration**
   - [ ] Create old localStorage data, reload app, verify migration
   - [ ] Verify migration with empty localStorage
   - [ ] Verify migration with invalid JSON data (error handling)
   - [ ] Check that old localStorage key is removed after migration

3. **Cloud Sync** (Phase 2)
   - [ ] Enable cloud sync and verify initial upload
   - [ ] Create message on device A, verify sync to device B
   - [ ] Create messages offline, verify sync when online
   - [ ] Test conflict resolution (edit same conversation on 2 devices)

4. **Edge Cases**
   - [ ] Test with browser in private/incognito mode
   - [ ] Test with IndexedDB disabled (fall back to localStorage)
   - [ ] Test with very long messages (10,000+ characters)
   - [ ] Test with special characters, emojis, code blocks

### Automated Tests

```typescript
// tests/chat-persistence.test.ts

describe('ChatStorageAdapter', () => {
  it('should save and load conversation', async () => {
    const adapter = new IndexedDBAdapter();
    const messages = [
      { id: '1', conversationId: 'c1', role: 'user', content: 'Hello', timestamp: Date.now() },
      { id: '2', conversationId: 'c1', role: 'assistant', content: 'Hi!', timestamp: Date.now() },
    ];
    
    await adapter.saveConversation('project1', messages);
    const loaded = await adapter.loadConversation('project1');
    
    expect(loaded).toEqual(messages);
  });
  
  it('should list conversations by project', async () => {
    // Test implementation
  });
  
  it('should delete conversation', async () => {
    // Test implementation
  });
  
  it('should fallback to localStorage if IndexedDB fails', async () => {
    // Test implementation
  });
});

describe('Migration', () => {
  it('should migrate from old localStorage format', async () => {
    // Test implementation
  });
  
  it('should handle empty localStorage', async () => {
    // Test implementation
  });
});
```

### Success Criteria

- ✅ Chat messages persist across browser sessions
- ✅ Conversations are properly isolated by project
- ✅ Migration from old localStorage completes without data loss
- ✅ IndexedDB adapter handles 1000+ messages efficiently (<100ms load time)
- ✅ Fallback to localStorage works when IndexedDB unavailable
- ✅ UI shows loading states and error messages appropriately
- ✅ (Phase 2) Cloud sync works across multiple devices
- ✅ (Phase 2) Conflicts are resolved without data loss

## Notes

### Storage Size Considerations

**Current Approach (localStorage):**
- Average message: ~500 bytes (text only)
- 5MB limit → ~10,000 messages max
- Single JSON blob → slow parsing for large histories

**IndexedDB Approach:**
- Average message: ~500 bytes
- 50MB quota → ~100,000 messages (likely sufficient)
- Paginated loading → fast even with large histories

**Growth Projection:**
- Typical user: 10-20 messages/day → 7,300 messages/year → ~3.6MB/year
- Power user: 100 messages/day → 73,000 messages/year → ~36MB/year
- IndexedDB quota sufficient for 1-2 years of power usage

### Privacy Considerations

**Local Storage:**
- Data stored in browser's IndexedDB (not accessible to other apps)
- Clearing browser data deletes all conversations
- Private/incognito mode doesn't persist data

**Cloud Storage:**
- Optional feature (user must explicitly enable)
- Consider client-side encryption for sensitive content
- Add data retention policy (e.g., auto-delete after 90 days)
- Provide export/download before deletion

### Alternative Approaches Considered

**1. SQLite via WASM**
- Pros: SQL queries, familiar API
- Cons: Larger bundle size (~1MB), performance overhead
- Decision: IndexedDB is sufficient for our use case

**2. Direct Rust Backend Storage**
- Pros: Centralized storage, no browser limits
- Cons: Requires HTTP server always running, complicates desktop app
- Decision: Keep storage in browser for local-first approach

**3. File System (Desktop App Only)**
- Pros: Direct file access, easy backup
- Cons: Web app incompatible, cross-platform file handling
- Decision: Use IndexedDB for web, consider file export in desktop

### Dependencies

**Phase 1:**
- `idb` library (2KB, IndexedDB wrapper) - https://github.com/jakearchibald/idb
- Or native IndexedDB API (no dependencies)

**Phase 2:**
- Existing sync-bridge infrastructure (spec 142)
- Backend conversation API endpoints (new)

### Related Specs

- [094-ai-chatbot-web-integration](../094-ai-chatbot-web-integration/README.md) - Current chat implementation
- [142-cloud-sync-mvp](../142-cloud-sync-mvp/README.md) - Cloud sync infrastructure
- [163-multi-tasking-ui-enhancements](../163-multi-tasking-ui-enhancements/README.md) - Tab persistence patterns

### Future Enhancements

- **Conversation branching**: Fork conversation at any message
- **Conversation templates**: Pre-defined conversation starters
- **Voice messages**: Record and transcribe audio messages
- **Collaborative conversations**: Multiple users in same conversation
- **Conversation versioning**: Track changes over time
- **AI-powered conversation summaries**: Auto-generate conversation titles