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
depends_on:
- 224-ai-chat-configuration-improvements
created_at: 2026-01-19T07:54:03.056027248Z
updated_at: 2026-01-19T08:51:03.338020758Z
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
- Users need chat history to persist reliably across sessions and device crashes
- Desktop application requires proper file-system based storage
- Foundation for future features (search, analytics, export, cloud sync)

**Current State:**
- Chat persistence not yet implemented (localStorage version was never published)
- Need proper storage solution from the start
- Must support desktop/MCP/HTTP contexts
- Requires per-project isolation

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
│  └───────────────────┬──────────────────────────────────┘   │
└────────────────────────┼──────────────────────────────────────┘
                         │ HTTP/REST API
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Rust Backend (HTTP Server)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Chat API Handlers                                   │   │
│  │  - POST /api/chat/conversations                      │   │
│  │  - GET /api/chat/conversations/:id                   │   │
│  │  - DELETE /api/chat/conversations/:id                │   │
│  └───────────────────┬──────────────────────────────────┘   │
│                      │                                       │
│  ┌───────────────────▼──────────────────────────────────┐   │
│  │  SQLite Storage (rusqlite)                           │   │
│  │  ~/.leanspec/chat.db                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ (Optional Cloud Sync - Phase 2)
                         ▼
        ┌──────────────────────────────────┐
        │  Cloud API (via sync-bridge)     │
        └──────────────────────────────────┘
```

**Storage Location:**
- Linux/macOS: `~/.leanspec/chat.db` (or `$XDG_DATA_HOME/leanspec/chat.db`)
- Windows: `%APPDATA%\leanspec\chat.db`

### Storage Options

We need a robust local storage solution that works across desktop and web contexts, with proper data management, backup capabilities, and performance.

#### Option A: SQLite (Recommended)

**Pros:**
- **Capacity**: Gigabytes of storage (file-system based)
- **Performance**: Mature database with indexes, transactions, and query optimization
- **Reliability**: ACID compliance, battle-tested for decades
- **Cross-platform**: Works on desktop (native), web (WASM), and server
- **SQL queries**: Powerful querying and analytics capabilities
- **Backup**: Single file can be easily backed up/restored

**Cons:**
- **Bundle size**: sql.js (WASM) adds ~2MB to web bundle
- **Complexity**: Requires schema migrations, connection management
- **Web limitations**: WASM performance overhead compared to native

**Implementation Paths:**
- **All contexts**: Use native Rust SQLite backend via HTTP API
- **Desktop/MCP/HTTP**: Native Rust implementation with `rusqlite`
- **UI**: Communicate with Rust backend via HTTP/REST API
- **No Node.js SQLite adapter**: Avoid the ai-sdk compromise by keeping all backend logic in Rust

**Database Schema:**
```sql
-- conversations table
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  message_count INTEGER DEFAULT 0,
  last_message TEXT,
  tags TEXT, -- JSON array
  archived INTEGER DEFAULT 0,
  cloud_id TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE INDEX idx_conversations_project_id ON conversations(project_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at);

-- messages table
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  metadata TEXT, -- JSON object
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_project_id ON messages(project_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);

-- sync_metadata table (for cloud sync)
CREATE TABLE sync_metadata (
  conversation_id TEXT PRIMARY KEY,
  cloud_id TEXT,
  last_synced_at INTEGER,
  sync_status TEXT CHECK(sync_status IN ('local-only', 'synced', 'conflict', 'pending')),
  version INTEGER DEFAULT 1,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
```

#### Recommendation: Rust-Only Backend with SQLite

**Primary Storage: SQLite via Rust Backend**
- Use native SQLite on all platforms (via Rust)
- Store database at `~/.leanspec/chat.db` (XDG_DATA_HOME on Linux)
- Single file, easy to backup by copying the database file
- UI communicates with Rust backend via HTTP/REST API
- No Node.js SQLite dependencies - pure Rust implementation

**API Communication Pattern:**
```typescript
// UI calls Rust backend
interface ChatAPI {
  saveConversation(projectId: string, messages: Message[]): Promise<void>;
  loadConversation(projectId: string): Promise<Message[]>;
  listConversations(projectId: string): Promise<ConversationMetadata[]>;
  deleteConversation(conversationId: string): Promise<void>;
  clearProject(projectId: string): Promise<void>;
}

// Rust backend handles all SQLite operations
class RustChatBackend implements ChatAPI {
  constructor(private baseUrl: string) {}
  
  async saveConversation(projectId: string, messages: Message[]): Promise<void> {
    await fetch(`${this.baseUrl}/api/chat/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, messages }),
    });
  }
  
  // ... other methods
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

### Phase 1: Local SQLite Storage (MVP)

- [ ] **1.1 Create SQLite Schema & Migrations**
  - Define SQL schema (conversations, messages, sync_metadata tables)
  - Create migration system for schema versioning
  - Add seed data for testing
  - Write schema documentation

- [ ] **1.2 Implement Rust SQLite Backend** (for all contexts: desktop/MCP/HTTP)
  - Use `rusqlite` crate for simplicity and reliability
  - Implement `ChatStorageAdapter` trait in Rust
  - Add connection pooling and transaction support
  - Create HTTP API endpoints for UI to communicate with Rust backend
  - Expose NAPI bindings if direct Node.js integration is needed
  - Error handling and logging
  - Ensure cross-platform compatibility (Linux/macOS/Windows)

- [ ] **1.3 Update useLeanSpecChat Hook**
  - Replace localStorage calls with Rust backend API
  - Add conversation management functions (create, list, delete)
  - Implement auto-save on message completion
  - Add loading states and error handling
  - Handle offline/database unavailable scenarios

- [ ] **1.4 Build Conversations UI**
  - Create conversations sidebar component
  - Implement conversation list with grouping (Today/Yesterday/Last 7 days)
  - Add conversation search and filtering
  - Add "New Chat" and "Delete Conversation" actions
  - Show storage usage and database location

- [ ] **1.5 Testing**
  - Unit tests for Rust SQLite backend
  - Integration tests for conversation CRUD via HTTP API
  - Migration tests with various data states
  - Performance tests with large conversation histories (10k+ messages)
  - Cross-platform database compatibility tests

### Phase 2: Cloud Sync (Optional Enhancement)

- [ ] **2.1 Sync Protocol**
  - Implement incremental sync (only new messages since last sync)
  - Add compression for large conversation payloads
  - Define sync protocol version for compatibility
  - Use JSON for sync payloads with message deltas

- [ ] **2.2 Backend API Endpoints**
  - `GET /api/v1/chat/conversations?projectId={id}` - List conversations
  - `GET /api/v1/chat/conversations/{id}/messages` - Get messages
  - `POST /api/v1/chat/conversations/{id}/sync` - Upload message delta
  - `DELETE /api/v1/chat/conversations/{id}` - Delete conversation
  - Add authentication and project ownership validation

- [ ] **2.3 Cloud Sync Service**
  - Implement CloudSyncService interface in Rust/Node.js
  - Add sync queue for offline changes
  - Implement conflict resolution strategy (last-write-wins or manual)
  - Add retry logic with exponential backoff
  - Store sync metadata in SQLite

- [ ] **2.4 Sync UI**
  - Add sync status indicator (synced/pending/error)
  - Add manual sync trigger button
  - Show sync conflicts and resolution UI
  - Add sync settings (auto-sync on/off, sync interval)
  - Display last sync timestamp

- [ ] **2.5 Client-Side Encryption (Optional)**
  - Generate encryption key from user password/device
  - Encrypt message content before upload
  - Store encryption metadata in sync_metadata table
  - Add key management UI
  - Document encryption format

- [ ] **2.6 Testing**
  - Test sync with multiple devices (simulate)
  - Test conflict resolution scenarios
  - Test offline mode and sync queue
  - Load testing with large conversation histories
  - Test incremental delta sync efficiency

### Phase 3: Advanced Features (Future)

- [ ] **3.1 Full-Text Search**
  - Add SQLite FTS5 extension for full-text search
  - Index message content for fast search
  - Implement search UI with filters (date, project, role)
  - Highlight search results in messages

- [ ] **3.2 Conversation Export** (Future)
  - Export to Markdown format (conversation transcript)
  - Export to JSON format (structured data)
  - Export selected conversations or all
  - Add export to PDF (via Markdown)
  - Add JSONL export for advanced users

- [ ] **3.3 Conversation Analytics**
  - Track conversation length, duration in metadata
  - Model usage statistics (tokens, cost)
  - Generate usage reports
  - Visualize conversation trends

- [ ] **3.4 Conversation Sharing**
  - Generate shareable links (read-only) via cloud
  - Share with team members
  - Public/private conversation settings
  - Expire shared links after N days

- [ ] **3.5 Database Maintenance**
  - Auto-vacuum SQLite database
  - Archive old conversations to JSONL
  - Database integrity checks
  - Backup/restore functionality

## Test

### Manual Testing Scenarios

1. **Local SQLite Storage**
   - [ ] Create new conversation and verify persistence across app restart
   - [ ] Create multiple conversations for different projects
   - [ ] Delete a conversation and verify removal from database
   - [ ] Clear all conversations and verify empty state
   - [ ] Test with 1000+ messages in a conversation (performance)
   - [ ] Test with 100+ conversations (list performance)
   - [ ] Verify database file exists at correct location
   - [ ] Test concurrent writes (multiple messages saved rapidly)

2. **Cloud Sync** (Phase 2)
   - [ ] Enable cloud sync and verify initial upload
   - [ ] Create message on device A, verify sync to device B
   - [ ] Create messages offline, verify sync when online
   - [ ] Test conflict resolution (edit same conversation on 2 devices)
   - [ ] Test incremental sync (only delta uploaded)

3. **Edge Cases**
   - [ ] Test with database file locked (concurrent access)
   - [ ] Test with database file missing (recreate schema)
   - [ ] Test with corrupted database (error recovery)
   - [ ] Test with very long messages (100,000+ characters)
   - [ ] Test with special characters, emojis, code blocks
   - [ ] Test with read-only file system (error handling)
   - [ ] Test database on different platforms (Linux/macOS/Windows)

### Automated Tests

```typescript
// tests/chat-persistence.test.ts

describe('Rust Chat Backend API', () => {
  let apiClient: RustChatBackend;
  
  beforeEach(async () => {
    apiClient = new RustChatBackend('http://localhost:8080');
    // Clean test database
    await apiClient.clearProject('test-project');
  });
  
  it('should save and load conversation', async () => {
    const messages: Message[] = [
      { id: '1', conversationId: 'c1', projectId: 'p1', role: 'user', content: 'Hello', timestamp: Date.now() },
      { id: '2', conversationId: 'c1', projectId: 'p1', role: 'assistant', content: 'Hi!', timestamp: Date.now() },
    ];
    
    await apiClient.saveConversation('p1', messages);
    const loaded = await apiClient.loadConversation('c1');
    
    expect(loaded).toHaveLength(2);
    expect(loaded[0].content).toBe('Hello');
  });
  
  it('should list conversations by project', async () => {
    // Create test conversations via API
    await apiClient.saveConversation('p1', [/* messages */]);
    await apiClient.saveConversation('p1', [/* messages */]);
    await apiClient.saveConversation('p2', [/* messages */]);
    
    const p1Convos = await apiClient.listConversations('p1');
    
    expect(p1Convos).toHaveLength(2);
    expect(p1Convos.every(c => c.projectId === 'p1')).toBe(true);
  });
  
  it('should delete conversation via API', async () => {
    await apiClient.saveConversation('p1', [/* messages */]);
    const convos = await apiClient.listConversations('p1');
    
    await apiClient.deleteConversation(convos[0].id);
    
    const remaining = await apiClient.listConversations('p1');
    expect(remaining).toHaveLength(0);
  });
  
  it('should handle API errors gracefully', async () => {
    // Test implementation with network errors
  });
});
```

### Success Criteria

- ✅ Chat messages persist reliably across app restarts (no data loss)
- ✅ Conversations are properly isolated by project
- ✅ SQLite adapter handles 10,000+ messages efficiently (<100ms load time)
- ✅ Database file created in correct platform-specific location
- ✅ UI shows loading states and error messages appropriately
- ✅ Database transactions ensure data consistency (no partial writes)
- ✅ (Phase 2) Cloud sync works efficiently with incremental updates
- ✅ (Phase 2) Conflicts are resolved without data loss

## Notes

### Storage Size Considerations

**Current Approach (localStorage):**
- Average message: ~500 bytes (text only)
- 5MB limit → ~10,000 messages max
- Single JSON blob → slow parsing for large histories
- Browser-only, not suitable for desktop apps

**SQLite Approach:**
- Average message: ~500 bytes
- No practical size limit (file-system based)
- Indexed queries → fast even with 100,000+ messages
- Works on desktop, web (WASM), server

**Growth Projection:**
- Typical user: 10-20 messages/day → 7,300 messages/year → ~3.6MB/year
- Power user: 100 messages/day → 73,000 messages/year → ~36MB/year
- SQLite handles multi-GB databases efficiently

**Database Size Management:**
- Auto-vacuum on close to reclaim deleted space
- Soft-delete old conversations (mark as archived)
- Provide "compact database" command for manual cleanup
- Future: Add export to JSONL for archival if needed

### Privacy Considerations

**Local Storage:**
- Data stored in SQLite file at `~/.leanspec/chat.db`
- Standard file permissions apply (user-only read/write)
- File can be encrypted with full-disk encryption
- Easy to backup (single file) or delete (remove file)

**Cloud Storage:**
- Optional feature (user must explicitly enable)
- Data can be client-side encrypted before upload
- Add data retention policy (e.g., auto-delete after 90 days)
- User controls sync on/off per project
- Database file can be manually backed up (single file)

### Implementation Considerations

**Architecture Decision: Rust-Only Backend**

This spec explicitly avoids the Node.js/ai-sdk compromise. The original consideration to use Node.js with better-sqlite3 or ai-sdk has been rejected in favor of a pure Rust implementation for the following reasons:

1. **Consistency**: All backend logic (desktop, MCP, HTTP server) uses the same Rust codebase
2. **Performance**: Native Rust SQLite bindings are faster than Node.js alternatives
3. **Reliability**: Single source of truth for data access patterns
4. **Maintenance**: Fewer moving parts, one language for all backend code
5. **No compromise**: Avoids splitting backend logic between Rust and Node.js

The UI will communicate with the Rust backend via HTTP/REST API, providing clean separation of concerns.

**SQLite Library Choices:**

**Rust:**
- `rusqlite` - Synchronous, lightweight, easier API, good for all contexts
- **Recommendation:** Use `rusqlite` for simplicity and bundle size

**UI to Backend Communication:**
- HTTP/REST API for all chat operations
- No need for Node.js SQLite libraries
- Clean separation: UI (React/TypeScript) ↔ Backend (Rust)

**Database Location:**
- Follow XDG Base Directory Specification on Linux
- Use `dirs` crate (Rust) or `env-paths` (Node.js) for cross-platform paths
- Create directory if it doesn't exist
- Handle permission errors gracefully

**Connection Management:**
- Use single connection per process (SQLite is file-locked)
- Enable WAL mode for better concurrency: `PRAGMA journal_mode=WAL`
- Set busy timeout: `PRAGMA busy_timeout=5000`
- Use prepared statements for repeated queries

### Alternative Approaches Considered

**1. Browser IndexedDB (Original Plan)**
- Pros: No dependencies, built into browsers
- Cons: Browser-only, quota limits, not suitable for desktop/MCP
- Decision: Rejected in favor of SQLite for desktop-first approach

**2. Embedded Key-Value Store (e.g., sled, redb)**
- Pros: Pure Rust, fast, embedded
- Cons: No SQL, manual indexing, less mature
- Decision: SQLite more mature and widely supported

**4. Remote Database (PostgreSQL, MongoDB)**
- Pros: Powerful queries, scalable
- Cons: Requires server always running, network dependency
- Decision: Keep local-first with optional cloud sync

### Dependencies

**Phase 1 (SQLite):**

**Rust:**
- `rusqlite` - SQLite bindings for Rust (~50KB overhead)
- `serde_json` - JSON serialization for metadata
- `dirs` - Cross-platform directory paths
- `axum` or `actix-web` - HTTP server framework for API endpoints

**UI (TypeScript/React):**
- Fetch API for HTTP communication with Rust backend
- No SQLite dependencies in Node.js/UI layer

**Phase 2 (Cloud Sync):**
- Existing sync-bridge infrastructure (spec 142)
- Backend conversation API endpoints (new)
- Compression library for large payloads (e.g., `flate2` for Rust, `zlib` for Node.js)

### Related Specs

- [094-ai-chatbot-web-integration](../094-ai-chatbot-web-integration/README.md) - Current chat implementation
- [142-cloud-sync-mvp](../142-cloud-sync-mvp/README.md) - Cloud sync infrastructure
- [163-multi-tasking-ui-enhancements](../163-multi-tasking-ui-enhancements/README.md) - Tab persistence patterns

### Future Enhancements

- **Full-text search**: Use SQLite FTS5 extension for fast search
- **Conversation branching**: Fork conversation at any message
- **Conversation templates**: Pre-defined conversation starters
- **Voice messages**: Record and transcribe audio messages
- **Collaborative conversations**: Multiple users in same conversation
- **Conversation versioning**: Track changes over time with SQLite triggers
- **AI-powered summaries**: Auto-generate conversation titles
- **Database replication**: SQLite replication for multi-device sync
- **Conversation attachments**: Store file references in database
- **Export to other formats**: PDF, HTML, CSV for analytics