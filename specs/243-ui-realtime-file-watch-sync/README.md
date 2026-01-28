---
status: planned
created: 2026-01-28
priority: medium
tags:
- ui
- realtime
- websocket
- file-watch
- ux
created_at: 2026-01-28T08:03:59.019975Z
updated_at: 2026-01-28T08:03:59.019975Z
---

# UI Realtime File Watch & Sync

## Overview

Currently, the UI requires manual refresh to see spec changes, or relies on cache TTL (60s default from spec 082). This creates a poor developer experience when actively working on specs.

**Problem Statement:**
- Spec changes in `specs/` directory don't appear in UI immediately
- Cache TTL (60s) means up to 1-minute delay
- Manual refresh required for immediate updates
- No live feedback when editing specs

**Goal:**
Implement true realtime sync that pushes spec changes from backend to frontend automatically, eliminating manual refresh.

**User Experience:**
1. User edits a spec file in their editor
2. File watcher detects change within <1s
3. Backend invalidates cache and pushes update via WebSocket/SSE
4. Frontend automatically refreshes affected views
5. User sees changes appear instantly without refresh

## Design

### Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (React/Next)                  │
│  - WebSocket client connection                           │
│  - Auto-refresh on spec change events                    │
│  - Optimistic UI updates                                 │
└───────────────────┬──────────────────────────────────────┘
                    │ WebSocket/SSE
                    ↕
┌───────────────────┴──────────────────────────────────────┐
│              Backend (Rust HTTP Server)                   │
│  - WebSocket/SSE endpoint                                │
│  - File system watcher (specs/ directory)                │
│  - Change detection & debouncing                         │
│  - Cache invalidation                                    │
└───────────────────┬──────────────────────────────────────┘
                    │ File Watch
                    ↓
┌──────────────────────────────────────────────────────────┐
│              specs/ Directory (Filesystem)                │
│  - Source of truth                                       │
│  - Watched for changes (create/update/delete)            │
└──────────────────────────────────────────────────────────┘
```

### Technology Options

**Backend File Watching:**
- Rust: `notify` crate (cross-platform, efficient)
- Node.js: `chokidar` (if using Node backend)

**Push Communication:**
1. **WebSocket** (bidirectional)
   - Pros: Full duplex, can send client actions
   - Cons: More complex state management
   - Use case: Interactive features (live editing)

2. **Server-Sent Events (SSE)** (recommended)
   - Pros: Simpler, HTTP/2, auto-reconnect
   - Cons: One-way (server → client only)
   - Use case: Read-only updates (perfect for spec viewing)

**Frontend Integration:**
- React hooks for WebSocket/SSE connection
- React Query or SWR for cache invalidation
- Toast notifications for change awareness

### Implementation Details

#### Backend: File Watcher Service

```rust
// rust/leanspec-http/src/watcher.rs
use notify::{Watcher, RecursiveMode, Event};
use tokio::sync::broadcast;

pub struct FileWatcher {
    watcher: notify::RecommendedWatcher,
    tx: broadcast::Sender<SpecChangeEvent>,
}

#[derive(Clone, Debug)]
pub enum SpecChangeEvent {
    Created(String),   // spec path
    Modified(String),
    Deleted(String),
}

impl FileWatcher {
    pub fn new(specs_dir: PathBuf) -> Result<Self> {
        let (tx, _) = broadcast::channel(100);
        let tx_clone = tx.clone();
        
        let mut watcher = notify::recommended_watcher(move |res: Result<Event, _>| {
            if let Ok(event) = res {
                let change = parse_event(event);
                let _ = tx_clone.send(change);
            }
        })?;
        
        watcher.watch(&specs_dir, RecursiveMode::Recursive)?;
        
        Ok(Self { watcher, tx })
    }
    
    pub fn subscribe(&self) -> broadcast::Receiver<SpecChangeEvent> {
        self.tx.subscribe()
    }
}
```

#### Backend: SSE Endpoint

```rust
// rust/leanspec-http/src/routes/events.rs
use axum::response::Sse;
use futures::stream::Stream;

pub async fn sse_handler(
    State(state): State<AppState>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let mut rx = state.file_watcher.subscribe();
    
    let stream = async_stream::stream! {
        loop {
            match rx.recv().await {
                Ok(change) => {
                    let data = serde_json::to_string(&change).unwrap();
                    yield Ok(Event::default().data(data));
                }
                Err(_) => break,
            }
        }
    };
    
    Sse::new(stream).keep_alive(KeepAlive::default())
}
```

#### Frontend: SSE Client Hook

```typescript
// packages/ui-components/src/hooks/useSpecSync.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useSpecSync() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const eventSource = new EventSource('/api/events/specs');
    
    eventSource.onmessage = (event) => {
      const change = JSON.parse(event.data);
      
      // Invalidate affected queries
      if (change.type === 'Modified' || change.type === 'Created') {
        queryClient.invalidateQueries(['spec', change.path]);
        queryClient.invalidateQueries(['specs']); // List view
      } else if (change.type === 'Deleted') {
        queryClient.removeQueries(['spec', change.path]);
        queryClient.invalidateQueries(['specs']);
      }
      
      // Show toast notification
      toast.info(`Spec ${change.path} ${change.type.toLowerCase()}`);
    };
    
    eventSource.onerror = () => {
      console.error('SSE connection lost, reconnecting...');
      eventSource.close();
    };
    
    return () => eventSource.close();
  }, [queryClient]);
}
```

#### Frontend: Integration

```typescript
// packages/ui/src/App.tsx
export function App() {
  useSpecSync(); // Enable realtime sync globally
  
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        {/* routes */}
      </Router>
    </QueryClientProvider>
  );
}
```

### Configuration

```bash
# Backend
ENABLE_FILE_WATCH=true        # Enable file watching
FILE_WATCH_DEBOUNCE_MS=300    # Debounce multiple changes
SSE_KEEPALIVE_SEC=15          # Keep connection alive

# Frontend
VITE_SSE_ENABLED=true         # Enable SSE client
VITE_SSE_RECONNECT_MS=3000    # Reconnect delay
```

### Edge Cases & Error Handling

**File Watcher:**
- Debounce rapid changes (e.g., VSCode auto-save)
- Ignore temp files (.swp, ~, .tmp)
- Handle file lock conflicts
- Graceful degradation if watcher fails

**SSE Connection:**
- Auto-reconnect on connection loss
- Exponential backoff for retries
- Fallback to polling if SSE unavailable
- Handle browser tab visibility (pause when hidden)

**Performance:**
- Max 100 concurrent SSE connections
- Rate limit change events (max 10/sec)
- Only send changes for watched specs
- Compress large payloads

### Performance Impact

**Backend:**
- File watcher: ~5-10MB memory overhead
- SSE connections: ~1KB per connection
- CPU: Negligible (<1% with 100 connections)

**Frontend:**
- SSE connection: ~2KB memory
- Network: ~1KB/min (keepalive pings)
- Minimal battery impact

**Comparison to Polling:**
- Polling (10s interval): 6 requests/min
- SSE: 1 connection, only data when changed
- **Result: 90% reduction in unnecessary requests**

## Plan

- [ ] Research file watching libraries (Rust `notify` vs Node `chokidar`)
- [ ] Implement backend file watcher service
  - [ ] Set up `notify` crate in rust/leanspec-http
  - [ ] Create FileWatcher struct with broadcast channel
  - [ ] Add debouncing logic (300ms default)
  - [ ] Ignore temp files and non-spec files
  - [ ] Test with create/update/delete operations
- [ ] Implement SSE endpoint in Rust HTTP server
  - [ ] Add /api/events/specs route
  - [ ] Integrate with FileWatcher service
  - [ ] Add keep-alive mechanism
  - [ ] Add connection limit & rate limiting
  - [ ] Test SSE stream with multiple clients
- [ ] Create frontend SSE client hook
  - [ ] Implement useSpecSync() hook
  - [ ] Integrate with React Query for cache invalidation
  - [ ] Add reconnection logic with exponential backoff
  - [ ] Add toast notifications for changes
  - [ ] Test with network interruptions
- [ ] Integrate into UI packages
  - [ ] Add to @leanspec/ui (Vite app)
  - [ ] Add to @leanspec/desktop (Tauri app)
  - [ ] Add configuration options
  - [ ] Test in both dev and production builds
- [ ] Add configuration options
  - [ ] Backend: ENABLE_FILE_WATCH, debounce settings
  - [ ] Frontend: SSE_ENABLED, reconnect settings
  - [ ] Document in README
- [ ] Performance testing
  - [ ] Test with 100 concurrent connections
  - [ ] Measure memory/CPU impact
  - [ ] Test rapid file changes (100+ changes/sec)
  - [ ] Verify debouncing works correctly
- [ ] Documentation
  - [ ] Update architecture docs
  - [ ] Add deployment guide (Vercel/self-hosted)
  - [ ] Add troubleshooting section
- [ ] Update spec 082 with realtime sync info

## Test

### Functional Tests

**File Watching:**
- [ ] Detects spec file creation
- [ ] Detects spec file modification
- [ ] Detects spec file deletion
- [ ] Detects spec rename
- [ ] Ignores temp files (.swp, ~)
- [ ] Debounces rapid changes correctly
- [ ] Works with subdirectories

**SSE Connection:**
- [ ] Client connects successfully
- [ ] Receives change events
- [ ] Auto-reconnects on disconnect
- [ ] Keep-alive prevents timeout
- [ ] Multiple clients receive same events
- [ ] Graceful shutdown on server stop

**Frontend Integration:**
- [ ] Spec list auto-refreshes on change
- [ ] Spec detail page auto-refreshes
- [ ] Dependencies view updates
- [ ] Board view updates
- [ ] Toast notifications appear
- [ ] No duplicate invalidations

**Edge Cases:**
- [ ] Handles large spec files (>1MB)
- [ ] Handles rapid changes (10+ per second)
- [ ] Handles file lock conflicts
- [ ] Handles network interruption
- [ ] Handles tab visibility changes
- [ ] Handles browser sleep/wake

### Performance Tests

**Backend:**
- [ ] Memory usage <50MB with 100 connections
- [ ] CPU usage <5% under normal load
- [ ] Event latency <100ms from file change
- [ ] No memory leaks over 24 hours

**Frontend:**
- [ ] SSE connection overhead <5KB
- [ ] Reconnection completes <3s
- [ ] No UI jank during updates
- [ ] Battery impact negligible

**Comparison:**
- [ ] SSE uses 90% less bandwidth than polling
- [ ] Updates appear 10x faster than cache TTL
- [ ] Better UX than manual refresh

### Deployment Tests

**Self-Hosted:**
- [ ] Works with local specs/ directory
- [ ] File watcher permissions correct
- [ ] SSE works behind reverse proxy

**Vercel (Serverless):**
- [ ] ⚠️ File watching may not work in serverless
- [ ] Fallback to cache TTL documented
- [ ] Alternative: webhook-based sync

## Notes

### Dependencies

**Depends On:**
- Spec 082 (Web App Realtime Sync Architecture) - base caching layer
- Spec 186 (Rust HTTP Server) - backend implementation
- Spec 184 (Unified UI Architecture) - frontend integration

**Enables:**
- Better developer experience for spec editing
- Live collaboration possibilities (future)
- Real-time dashboard updates
- Reduced server load (vs polling)

### Alternative Approaches Considered

1. **Polling (Current)**
   - Simple but inefficient
   - High latency (10-60s)
   - Unnecessary requests when no changes

2. **WebSocket (Full Duplex)**
   - Overkill for read-only updates
   - More complex state management
   - Better for future live editing features

3. **SSE (Recommended)**
   - ✅ Perfect for one-way updates
   - ✅ Simple, built-in reconnection
   - ✅ Works with HTTP/2 multiplexing
   - ✅ Standard EventSource API

4. **Long Polling**
   - Legacy approach
   - Higher latency than SSE
   - Not recommended

### Deployment Considerations

**Vercel (Serverless):**
- ⚠️ **Limitation**: File system is read-only in serverless functions
- ⚠️ **File watching may not work** due to ephemeral nature
- **Workaround**: Use webhook-based approach (spec 082 Phase 3)
- **Alternative**: Deploy to long-running server (Fly.io, Railway)

**Self-Hosted (Recommended):**
- ✅ Full file system access
- ✅ File watching works perfectly
- ✅ Better for development environments
- Use case: Desktop app, local UI server

**Hybrid Approach:**
- Detect environment at runtime
- Enable file watching for self-hosted
- Fall back to cache TTL for serverless
- Document trade-offs clearly

### Security Considerations

**Rate Limiting:**
- Max 100 SSE connections per IP
- Max 10 events per second per connection
- Prevent DoS attacks

**Authentication:**
- SSE endpoint should require auth token
- Validate token on connection
- Support JWT or session-based auth

**Data Exposure:**
- Only send public spec data
- Don't include sensitive metadata
- Filter events based on user permissions

### Future Enhancements

**Phase 2:**
- Live editing with conflict resolution
- Multi-user presence indicators
- Real-time collaboration features

**Phase 3:**
- Incremental spec parsing (only changed sections)
- Binary diff for large specs
- WebSocket upgrade for bidirectional features

### Open Questions

- [ ] Should SSE be enabled by default or opt-in?
- [ ] What's the right debounce timeout? (300ms proposed)
- [ ] How to handle Vercel serverless limitations?
- [ ] Should we support both SSE and WebSocket?
- [ ] What happens with 1000+ concurrent users?

### Success Metrics

**Quantitative:**
- Latency: File change → UI update <1s (99th percentile)
- Bandwidth: 90% reduction vs polling
- Reliability: 99.9% uptime for SSE connections
- Performance: <5% CPU overhead

**Qualitative:**
- No manual refresh needed
- Instant feedback when editing specs
- Seamless multi-tab experience
- Better developer experience

### References

- [MDN: Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Rust notify crate](https://docs.rs/notify/)
- [React Query: Cache Invalidation](https://tanstack.com/query/latest/docs/guides/query-invalidation)
