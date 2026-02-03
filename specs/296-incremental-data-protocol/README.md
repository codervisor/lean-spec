---
status: archived
created: 2026-02-03
priority: high
tags:
- protocol
- websocket
- performance
- rust
- typescript
depends_on:
- 293-headless-vte-state-machine
parent: 291-cli-runtime-web-orchestrator
created_at: 2026-02-03T13:50:42.174720Z
updated_at: 2026-02-03T14:11:48.058446Z
transitions:
- status: archived
  at: 2026-02-03T14:11:48.058446Z
---

# Incremental Data Protocol

## Overview

### Problem

Naive terminal streaming wastes bandwidth and causes UI latency:

- **Full screen redraws**: Sending entire 120x40 grid (4800 cells) every update
- **Redundant data**: Most cells unchanged between frames
- **High latency**: Large payloads slow down real-time feel
- **Input blocking**: Bidirectional traffic not optimized

### Solution

Build an **Incremental Data Protocol** with:

1. **Dirty Rect Updates**: Only transmit cells or lines that changed
2. **Binary Protocol Option**: MessagePack for high-frequency updates
3. **Input Hijacking**: Map UI events to terminal escape sequences
4. **Compression**: Optional compression for large updates

### Scope

**In Scope**:
- WebSocket message protocol schema
- Dirty rect serialization
- Input event to escape sequence mapping
- Binary encoding (MessagePack)
- Compression strategies
- Protocol versioning

**Out of Scope**:
- WebSocket server implementation (uses existing leanspec-http)
- Frontend WebSocket client (covered in spec 294)
- VTE state tracking (spec 293)

## Design

### Protocol Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   Incremental Data Protocol                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Client                                WebSocket                Server (Rust)
│     │                                                             │
│     │  ──────── [connect] ────────────────────────────────────►  │
│     │  ◄─────── [welcome, capabilities] ──────────────────────   │
│     │                                                             │
│     │  ──────── [attach, session_id] ─────────────────────────►  │
│     │  ◄─────── [snapshot, full_screen] ──────────────────────   │
│     │                                                             │
│     │  ◄─────── [delta, dirty_cells] ─────────────────────────   │
│     │  ◄─────── [delta, dirty_cells] ─────────────────────────   │
│     │                                                             │
│     │  ──────── [input, keystrokes] ──────────────────────────►  │
│     │                                                             │
│     │  ◄─────── [mode, alternate_screen] ─────────────────────   │
│     │                                                             │
│     │  ──────── [resize, cols, rows] ─────────────────────────►  │
│     │  ◄─────── [snapshot, resized_screen] ───────────────────   │
│     │                                                             │
│     │  ──────── [detach] ─────────────────────────────────────►  │
│     │  ◄─────── [detached, snapshot_saved] ───────────────────   │
│     │                                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Message Types

#### Server → Client Messages

```typescript
// Base message structure
interface ServerMessage {
  type: string;
  seq: number;        // Sequence number for ordering
  ts: number;         // Timestamp (ms since epoch)
}

// Initial connection welcome
interface WelcomeMessage extends ServerMessage {
  type: 'welcome';
  version: string;    // Protocol version
  capabilities: string[];  // ['binary', 'compress', 'cursor-reporting']
}

// Full screen snapshot
interface SnapshotMessage extends ServerMessage {
  type: 'snapshot';
  cols: number;
  rows: number;
  cells: SerializedCell[][];  // 2D array [row][col]
  cursor: CursorState;
  modes: TerminalModes;
  reason: 'attach' | 'resize' | 'swap' | 'refresh';
}

// Incremental update (dirty cells only)
interface DeltaMessage extends ServerMessage {
  type: 'delta';
  cells: DirtyCell[];
  cursor?: CursorState;  // Only if changed
  scroll?: ScrollInfo;   // Only if scrolled
}

interface DirtyCell {
  r: number;  // row
  c: number;  // col
  ch: string; // character
  a?: number; // attributes (optional, bit-packed)
  fg?: number; // foreground color (optional)
  bg?: number; // background color (optional)
}

interface ScrollInfo {
  lines: number;  // Positive = scroll up, negative = scroll down
  region?: [number, number];  // Scroll region [top, bottom] if not full screen
}

// Mode change notification
interface ModeMessage extends ServerMessage {
  type: 'mode';
  alternateScreen: boolean;
  cursorVisible: boolean;
  bracketedPaste: boolean;
  // Other mode changes
}

// Output for stream mode (alternative to grid updates)
interface OutputMessage extends ServerMessage {
  type: 'output';
  data: string;  // Processed text (ANSI stripped or structured)
  raw?: string;  // Original with ANSI (optional, for debugging)
  contentType: 'text' | 'code' | 'thinking' | 'error' | 'prompt';
}

// Session event
interface SessionEventMessage extends ServerMessage {
  type: 'event';
  event: 'attached' | 'detached' | 'suspended' | 'stopped' | 'runtime-swapped';
  data?: Record<string, unknown>;
}

// Error
interface ErrorMessage extends ServerMessage {
  type: 'error';
  code: string;
  message: string;
}
```

#### Client → Server Messages

```typescript
interface ClientMessage {
  type: string;
  id?: string;  // Optional request ID for request-response matching
}

// Attach to session
interface AttachMessage extends ClientMessage {
  type: 'attach';
  sessionId: string;
  preferBinary?: boolean;  // Request binary encoding
  preferCompressed?: boolean;  // Request compression
}

// Detach from session
interface DetachMessage extends ClientMessage {
  type: 'detach';
}

// Terminal input
interface InputMessage extends ClientMessage {
  type: 'input';
  data: string;  // Already escaped (e.g., '\x1b[A' for arrow up)
}

// Terminal resize
interface ResizeMessage extends ClientMessage {
  type: 'resize';
  cols: number;
  rows: number;
}

// Request full refresh
interface RefreshMessage extends ClientMessage {
  type: 'refresh';
}

// Ping (for latency measurement)
interface PingMessage extends ClientMessage {
  type: 'ping';
  clientTime: number;
}
```

### Dirty Rect Optimization

The server tracks changed cells and only sends deltas:

```rust
impl DirtyTracker {
    /// Add a dirty cell
    pub fn mark_dirty(&mut self, row: u16, col: u16) {
        self.dirty_cells.insert((row, col));
    }
    
    /// Get optimized dirty rects
    pub fn get_dirty_rects(&self) -> Vec<DirtyRect> {
        // Merge adjacent cells into rectangles for efficiency
        // Algorithm: scanline merge
        
        let mut rects = Vec::new();
        let mut sorted: Vec<_> = self.dirty_cells.iter().copied().collect();
        sorted.sort();
        
        let mut current_rect: Option<DirtyRect> = None;
        
        for (row, col) in sorted {
            match current_rect.as_mut() {
                Some(rect) if rect.can_extend(row, col) => {
                    rect.extend(row, col);
                }
                Some(rect) => {
                    rects.push(rect.clone());
                    current_rect = Some(DirtyRect::new(row, col));
                }
                None => {
                    current_rect = Some(DirtyRect::new(row, col));
                }
            }
        }
        
        if let Some(rect) = current_rect {
            rects.push(rect);
        }
        
        rects
    }
    
    /// Calculate if sending delta is more efficient than full snapshot
    pub fn should_send_full_snapshot(&self, total_cells: usize) -> bool {
        // If more than 50% cells are dirty, send full snapshot
        self.dirty_cells.len() > total_cells / 2
    }
}

#[derive(Clone)]
struct DirtyRect {
    top: u16,
    left: u16,
    bottom: u16,
    right: u16,
}

impl DirtyRect {
    fn can_extend(&self, row: u16, col: u16) -> bool {
        // Can extend if adjacent horizontally on same row
        row == self.bottom && col == self.right + 1
    }
    
    fn extend(&mut self, row: u16, col: u16) {
        self.bottom = row;
        self.right = col;
    }
}
```

### Binary Encoding (MessagePack)

For high-frequency updates, use MessagePack instead of JSON:

```rust
use rmp_serde::{Serializer, Deserializer};

// Binary message wrapper
#[derive(Serialize, Deserialize)]
struct BinaryMessage {
    // First byte indicates type
    #[serde(rename = "t")]
    msg_type: u8,
    
    // Payload varies by type
    #[serde(rename = "p")]
    payload: Vec<u8>,
}

// Message type codes
const MSG_SNAPSHOT: u8 = 1;
const MSG_DELTA: u8 = 2;
const MSG_MODE: u8 = 3;
const MSG_OUTPUT: u8 = 4;
const MSG_INPUT: u8 = 10;
const MSG_RESIZE: u8 = 11;
const MSG_PING: u8 = 12;
const MSG_PONG: u8 = 13;

// Optimized binary cell format
#[derive(Serialize, Deserialize)]
struct BinaryCell {
    #[serde(rename = "r")]
    row: u16,
    #[serde(rename = "c")]
    col: u16,
    #[serde(rename = "v")]
    value: u32,  // char as u32
    #[serde(rename = "a")]
    attrs: u16,  // bit-packed attributes
    #[serde(rename = "f")]
    fg: u32,     // foreground color (RGB888 or indexed)
    #[serde(rename = "b")]
    bg: u32,     // background color
}

// Attribute bit packing
const ATTR_BOLD: u16 = 1 << 0;
const ATTR_ITALIC: u16 = 1 << 1;
const ATTR_UNDERLINE: u16 = 1 << 2;
const ATTR_STRIKETHROUGH: u16 = 1 << 3;
const ATTR_DIM: u16 = 1 << 4;
const ATTR_INVERSE: u16 = 1 << 5;
const ATTR_HIDDEN: u16 = 1 << 6;
const ATTR_BLINK: u16 = 1 << 7;

impl ServerMessage {
    pub fn to_binary(&self) -> Vec<u8> {
        rmp_serde::to_vec(self).unwrap()
    }
    
    pub fn from_binary(data: &[u8]) -> Result<Self, DecodeError> {
        rmp_serde::from_slice(data)
    }
}
```

### Compression

For large updates, apply compression:

```rust
use flate2::{write::ZlibEncoder, read::ZlibDecoder, Compression};

fn compress_message(data: &[u8]) -> Vec<u8> {
    // Only compress if above threshold
    if data.len() < 1024 {
        return data.to_vec();
    }
    
    let mut encoder = ZlibEncoder::new(Vec::new(), Compression::fast());
    encoder.write_all(data).unwrap();
    let compressed = encoder.finish().unwrap();
    
    // Only use compression if it actually helps
    if compressed.len() < data.len() {
        // Prepend compression flag
        let mut result = vec![1u8];  // 1 = compressed
        result.extend(compressed);
        result
    } else {
        // Prepend no-compression flag
        let mut result = vec![0u8];  // 0 = not compressed
        result.extend(data);
        result
    }
}

fn decompress_message(data: &[u8]) -> Vec<u8> {
    if data.is_empty() {
        return Vec::new();
    }
    
    if data[0] == 1 {
        // Compressed
        let mut decoder = ZlibDecoder::new(&data[1..]);
        let mut decompressed = Vec::new();
        decoder.read_to_end(&mut decompressed).unwrap();
        decompressed
    } else {
        // Not compressed
        data[1..].to_vec()
    }
}
```

### Input Hijacking

Map frontend events to terminal escape sequences:

```typescript
// Client-side input manager
class InputManager {
  private ws: WebSocket;
  private sendBuffer: string[] = [];
  private flushTimeout: number | null = null;
  
  constructor(ws: WebSocket) {
    this.ws = ws;
  }
  
  // Buffer keystrokes for batch sending (reduces WS messages)
  sendKey(key: string) {
    this.sendBuffer.push(key);
    
    if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => this.flush(), 10);
    }
  }
  
  private flush() {
    if (this.sendBuffer.length === 0) return;
    
    const data = this.sendBuffer.join('');
    this.sendBuffer = [];
    this.flushTimeout = null;
    
    this.ws.send(JSON.stringify({
      type: 'input',
      data: data,
    }));
  }
  
  // Handle keyboard event
  handleKeyDown(e: KeyboardEvent): boolean {
    const seq = keyToEscapeSequence(e);
    if (seq) {
      e.preventDefault();
      this.sendKey(seq);
      return true;
    }
    return false;
  }
  
  // Handle paste event  
  handlePaste(text: string, bracketedPaste: boolean) {
    if (bracketedPaste) {
      // Wrap in bracketed paste markers
      this.sendKey('\x1b[200~' + text + '\x1b[201~');
    } else {
      this.sendKey(text);
    }
  }
  
  // Handle mouse event (if mouse mode enabled)
  handleMouse(e: MouseEvent, type: 'click' | 'move' | 'wheel') {
    // Convert to SGR mouse encoding
    const row = Math.floor(e.clientY / cellHeight);
    const col = Math.floor(e.clientX / cellWidth);
    const button = e.button;
    
    // SGR encoding: ESC [ < Cb ; Cx ; Cy M/m
    const cb = button;
    const seq = `\x1b[<${cb};${col + 1};${row + 1}${type === 'click' ? 'M' : 'm'}`;
    this.sendKey(seq);
  }
}
```

### Protocol Versioning

Support protocol evolution:

```typescript
interface ProtocolVersion {
  major: number;  // Breaking changes
  minor: number;  // New features, backward compatible
  patch: number;  // Bug fixes
}

const CURRENT_VERSION: ProtocolVersion = { major: 1, minor: 0, patch: 0 };

// Version negotiation during handshake
interface WelcomeMessage {
  type: 'welcome';
  version: string;  // "1.0.0"
  minSupportedVersion: string;  // "1.0.0"
  capabilities: string[];
}

// Client should disconnect if major version mismatch
function isVersionCompatible(serverVersion: string): boolean {
  const [major] = serverVersion.split('.').map(Number);
  return major === CURRENT_VERSION.major;
}
```

### Performance Optimizations

```rust
// Server-side batching: collect updates before sending
pub struct UpdateBatcher {
    pending_cells: Vec<DirtyCell>,
    last_send: Instant,
    min_interval: Duration,  // Minimum time between sends (16ms = 60fps)
}

impl UpdateBatcher {
    pub fn add_cells(&mut self, cells: Vec<DirtyCell>) {
        self.pending_cells.extend(cells);
    }
    
    pub fn should_flush(&self) -> bool {
        let has_data = !self.pending_cells.is_empty();
        let time_elapsed = self.last_send.elapsed() >= self.min_interval;
        has_data && time_elapsed
    }
    
    pub fn flush(&mut self) -> Option<DeltaMessage> {
        if self.pending_cells.is_empty() {
            return None;
        }
        
        let cells = std::mem::take(&mut self.pending_cells);
        self.last_send = Instant::now();
        
        Some(DeltaMessage {
            type_: "delta".to_string(),
            seq: self.next_seq(),
            ts: Utc::now().timestamp_millis(),
            cells,
            cursor: None,
            scroll: None,
        })
    }
}

// Client-side frame throttling
class FrameThrottler {
  private pendingUpdates: DeltaMessage[] = [];
  private rafId: number | null = null;
  
  addUpdate(delta: DeltaMessage) {
    this.pendingUpdates.push(delta);
    this.scheduleRender();
  }
  
  private scheduleRender() {
    if (this.rafId !== null) return;
    
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.applyPendingUpdates();
    });
  }
  
  private applyPendingUpdates() {
    const merged = this.mergeUpdates(this.pendingUpdates);
    this.pendingUpdates = [];
    this.render(merged);
  }
  
  private mergeUpdates(updates: DeltaMessage[]): DirtyCell[] {
    // Later updates override earlier ones for same cell
    const cellMap = new Map<string, DirtyCell>();
    for (const update of updates) {
      for (const cell of update.cells) {
        cellMap.set(`${cell.r},${cell.c}`, cell);
      }
    }
    return Array.from(cellMap.values());
  }
}
```

## Plan

### Phase 1: JSON Protocol Definition
- [ ] Define all message types (TypeScript + Rust)
- [ ] Implement serialization/deserialization
- [ ] Add protocol version negotiation
- [ ] Write protocol documentation

### Phase 2: Dirty Tracking Integration
- [ ] Integrate DirtyTracker from VTE layer (spec 293)
- [ ] Implement dirty rect optimization
- [ ] Add full snapshot vs delta decision logic
- [ ] Write dirty tracking tests

### Phase 3: WebSocket Handler
- [ ] Implement WebSocket handler in leanspec-http
- [ ] Add session attachment/detachment
- [ ] Implement message routing
- [ ] Add error handling

### Phase 4: Binary Protocol
- [ ] Add MessagePack serialization
- [ ] Implement capability negotiation
- [ ] Add binary/JSON fallback
- [ ] Benchmark binary vs JSON

### Phase 5: Compression
- [ ] Implement zlib compression
- [ ] Add threshold-based compression decision
- [ ] Benchmark compression overhead
- [ ] Add client-side decompression

### Phase 6: Client Library
- [ ] Create TypeScript client library
- [ ] Implement InputManager
- [ ] Add reconnection logic
- [ ] Create React hooks for easy integration

## Test

### Unit Tests
- [ ] Message serialization/deserialization roundtrip
- [ ] Dirty rect optimization produces minimal rects
- [ ] Input escape sequence conversion is correct
- [ ] Binary encoding produces smaller payloads

### Integration Tests
- [ ] Full protocol handshake works
- [ ] Delta updates correctly modify screen state
- [ ] Input is delivered to PTY correctly
- [ ] Reconnection restores state from snapshot

### Performance Tests
- [ ] Delta message for single cell <100 bytes
- [ ] Full snapshot for 120x40 terminal <20KB (compressed)
- [ ] 60 updates/second sustainable
- [ ] Input latency <50ms (roundtrip)

### Network Tests
- [ ] Protocol works over slow connections (3G)
- [ ] Handles packet loss gracefully
- [ ] Reconnects automatically after disconnect
- [ ] Compression effective for large updates

## Notes

### Bandwidth Estimates

| Scenario | JSON | Binary | Binary+Compress |
|----------|------|--------|-----------------|
| Single cell update | ~60 bytes | ~20 bytes | ~25 bytes |
| 100 cells change | ~6KB | ~2KB | ~800 bytes |
| Full 120x40 screen | ~300KB | ~100KB | ~20KB |
| Idle (cursor blink) | ~30 bytes | ~10 bytes | ~15 bytes |

### Frame Rate Considerations

- **60 fps** (16ms): Smooth animation, high bandwidth
- **30 fps** (33ms): Perceptually smooth for typing, lower bandwidth
- **15 fps** (66ms): Acceptable for most terminal use, lowest bandwidth

Default to 30fps with adaptive adjustment based on update frequency.

### Error Recovery

```typescript
class ProtocolState {
  private lastSeq: number = 0;
  
  handleMessage(msg: ServerMessage) {
    if (msg.seq !== this.lastSeq + 1) {
      // Missed messages - request full refresh
      this.requestRefresh();
      return;
    }
    this.lastSeq = msg.seq;
    this.processMessage(msg);
  }
  
  private requestRefresh() {
    this.send({ type: 'refresh' });
  }
}
```

### Future: Differential Sync

For even more efficiency, consider:

- CRDT-based synchronization
- Content-addressed cells (hash-based dedup)
- Predictive sending (send likely-to-change cells proactively)
