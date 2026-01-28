# Implementation Details: UI Realtime File Watch & Sync

This document contains detailed implementation code for spec 243.

## Backend: File Watcher Service

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

## Backend: SSE Endpoint

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

## Frontend: SSE Client Hook

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

## Frontend: Integration

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

## Configuration

```bash
# Backend
ENABLE_FILE_WATCH=true        # Enable file watching
FILE_WATCH_DEBOUNCE_MS=300    # Debounce multiple changes
SSE_KEEPALIVE_SEC=15          # Keep connection alive

# Frontend
VITE_SSE_ENABLED=true         # Enable SSE client
VITE_SSE_RECONNECT_MS=3000    # Reconnect delay
```
