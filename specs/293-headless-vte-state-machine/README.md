---
status: archived
created: 2026-02-03
priority: high
tags:
- infrastructure
- rust
- terminal
- vte
- parsing
depends_on:
- 292-pty-process-layer
parent: 291-cli-runtime-web-orchestrator
created_at: 2026-02-03T13:42:12.629536Z
updated_at: 2026-02-03T14:11:48.054144Z
transitions:
- status: archived
  at: 2026-02-03T14:11:48.054144Z
---

# Headless VTE Terminal State Machine

## Overview

### Problem

Raw PTY output is a stream of bytes containing ANSI escape sequences. Passing this directly to the frontend creates issues:

- **Rendering complexity**: Frontend must implement full VTE parsing
- **State synchronization**: No server-side knowledge of terminal state
- **Bandwidth waste**: Entire screen redraws sent as full data
- **Mode detection**: Can't detect TUI vs linear output mode

### Solution

Build a **Headless VTE (Virtual Terminal Emulator)** that maintains an in-memory **Shadow Terminal**. Rather than passing raw ANSI bytes to the frontend, the backend parses escape sequences to maintain a structured 2D character grid representing the current "screen" state.

### Scope

**In Scope**:
- VT100/Xterm escape sequence parsing
- Shadow Terminal (2D character grid)
- Cell attributes (colors, bold, underline, etc.)
- Alternate Screen Buffer detection and tracking
- Dirty rect tracking for incremental updates
- Screen state serialization for transport

**Out of Scope**:
- PTY spawning (spec 292)
- WebSocket transport (spec 296)
- Frontend rendering (spec 294)

## Design

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Headless VTE Layer                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   PTY Output (raw bytes)                                        │
│        │                                                        │
│        ▼                                                        │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                    VTE Parser                           │  │
│   │                                                         │  │
│   │   • Escape sequence state machine                       │  │
│   │   • CSI (Control Sequence Introducer) handling          │  │
│   │   • OSC (Operating System Command) handling             │  │
│   │   • DCS (Device Control String) handling                │  │
│   │   • Character set handling (UTF-8)                      │  │
│   └──────────────────────┬──────────────────────────────────┘  │
│                          │ parsed events                        │
│                          ▼                                      │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                 Shadow Terminal                         │  │
│   │                                                         │  │
│   │   ┌─────────────────────────────────────────────────┐  │  │
│   │   │              Primary Screen                     │  │  │
│   │   │  ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐     │  │  │
│   │   │  │ H │ e │ l │ l │ o │   │ W │ o │ r │ d │ ... │  │  │
│   │   │  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤     │  │  │
│   │   │  │   │   │   │   │   │   │   │   │   │   │     │  │  │
│   │   │  └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘     │  │  │
│   │   │  + cursor position, attributes, modes           │  │  │
│   │   └─────────────────────────────────────────────────┘  │  │
│   │                                                         │  │
│   │   ┌─────────────────────────────────────────────────┐  │  │
│   │   │            Alternate Screen (TUI)               │  │  │
│   │   │  ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐     │  │  │
│   │   │  │ ┌ │ ─ │ ─ │ M │ e │ n │ u │ ─ │ ─ │ ┐ │ ... │  │  │
│   │   │  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤     │  │  │
│   │   │  │ │ │   │ > │ O │ p │ t │ 1 │   │   │ │ │     │  │  │
│   │   │  └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘     │  │  │
│   │   │  (used by interactive TUIs like menus)          │  │  │
│   │   └─────────────────────────────────────────────────┘  │  │
│   │                                                         │  │
│   │   ┌─────────────────────────────────────────────────┐  │  │
│   │   │              Dirty Tracker                      │  │  │
│   │   │  • Changed cells since last sync                │  │  │
│   │   │  • Dirty rectangles for batch updates           │  │  │
│   │   │  • Full refresh flag                            │  │  │
│   │   └─────────────────────────────────────────────────┘  │  │
│   │                                                         │  │
│   └──────────────────────┬──────────────────────────────────┘  │
│                          │                                      │
│                          ▼                                      │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │              State Serializer                           │  │
│   │                                                         │  │
│   │  • Full screen snapshot (for reconnect)                 │  │
│   │  • Dirty rect delta (for updates)                       │  │
│   │  • Mode flags (alternate screen, etc.)                  │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Structures

```rust
/// A single cell in the terminal grid
#[derive(Debug, Clone, PartialEq)]
pub struct Cell {
    pub character: char,
    pub attributes: CellAttributes,
}

#[derive(Debug, Clone, PartialEq, Default)]
pub struct CellAttributes {
    pub fg_color: Color,
    pub bg_color: Color,
    pub bold: bool,
    pub italic: bool,
    pub underline: bool,
    pub strikethrough: bool,
    pub dim: bool,
    pub inverse: bool,
    pub hidden: bool,
    pub blink: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Color {
    Default,
    Indexed(u8),        // 0-255 palette
    Rgb(u8, u8, u8),    // True color
}

/// The Shadow Terminal state
pub struct ShadowTerminal {
    /// Primary screen buffer
    primary: ScreenBuffer,
    /// Alternate screen buffer (for TUI applications)
    alternate: ScreenBuffer,
    /// Which buffer is currently active
    active_buffer: BufferType,
    /// Cursor position
    cursor: CursorState,
    /// Terminal modes
    modes: TerminalModes,
    /// Terminal dimensions
    size: TerminalSize,
    /// Dirty region tracker
    dirty: DirtyTracker,
}

pub struct ScreenBuffer {
    cells: Vec<Vec<Cell>>,  // [row][col]
    scrollback: Vec<Vec<Cell>>,
    scroll_region: Option<(u16, u16)>,  // top, bottom
}

pub struct CursorState {
    row: u16,
    col: u16,
    visible: bool,
    style: CursorStyle,
}

pub struct TerminalModes {
    /// Alternate screen buffer active (TUI mode)
    alternate_screen: bool,
    /// Application cursor keys
    application_cursor: bool,
    /// Application keypad
    application_keypad: bool,
    /// Autowrap
    autowrap: bool,
    /// Origin mode
    origin: bool,
    /// Bracketed paste mode
    bracketed_paste: bool,
    /// Mouse tracking modes
    mouse_tracking: MouseMode,
}

pub struct DirtyTracker {
    /// Set of dirty cells: (row, col)
    dirty_cells: HashSet<(u16, u16)>,
    /// Full refresh needed
    full_refresh: bool,
    /// Last sync timestamp
    last_sync: Instant,
}
```

### VTE Parser Interface

```rust
/// VTE parser wrapper (using vte crate)
pub struct VteParser {
    parser: vte::Parser,
    terminal: ShadowTerminal,
}

impl VteParser {
    pub fn new(cols: u16, rows: u16) -> Self;
    
    /// Process raw PTY output bytes
    pub fn process(&mut self, data: &[u8]);
    
    /// Get reference to shadow terminal
    pub fn terminal(&self) -> &ShadowTerminal;
    
    /// Get mutable reference for resize
    pub fn terminal_mut(&mut self) -> &mut ShadowTerminal;
}

/// VTE event performer (called by parser)
impl vte::Perform for VteParser {
    fn print(&mut self, c: char) {
        self.terminal.write_char(c);
    }
    
    fn execute(&mut self, byte: u8) {
        match byte {
            0x07 => self.terminal.bell(),
            0x08 => self.terminal.backspace(),
            0x09 => self.terminal.tab(),
            0x0A => self.terminal.newline(),
            0x0D => self.terminal.carriage_return(),
            _ => {}
        }
    }
    
    fn csi_dispatch(&mut self, params: &Params, intermediates: &[u8], ignore: bool, action: char) {
        // Handle CSI sequences like:
        // ESC[H - cursor home
        // ESC[2J - clear screen
        // ESC[38;2;r;g;bm - set RGB foreground
        // ESC[?1049h - switch to alternate screen
    }
    
    fn osc_dispatch(&mut self, params: &[&[u8]], bell_terminated: bool) {
        // Handle OSC sequences like:
        // ESC]0;title\x07 - set terminal title
    }
    
    fn hook(&mut self, params: &Params, intermediates: &[u8], ignore: bool, action: char) {}
    fn put(&mut self, byte: u8) {}
    fn unhook(&mut self) {}
    fn esc_dispatch(&mut self, intermediates: &[u8], ignore: bool, byte: u8) {}
}
```

### Shadow Terminal Operations

```rust
impl ShadowTerminal {
    /// Create new terminal with dimensions
    pub fn new(cols: u16, rows: u16) -> Self;
    
    /// Resize terminal (may truncate or expand)
    pub fn resize(&mut self, cols: u16, rows: u16);
    
    /// Write character at cursor position
    pub fn write_char(&mut self, c: char);
    
    /// Move cursor
    pub fn move_cursor(&mut self, row: u16, col: u16);
    
    /// Set cell attributes for subsequent writes
    pub fn set_attributes(&mut self, attrs: CellAttributes);
    
    /// Clear screen
    pub fn clear(&mut self, mode: ClearMode);
    
    /// Scroll screen
    pub fn scroll(&mut self, lines: i16);
    
    /// Switch to alternate screen buffer
    pub fn enter_alternate_screen(&mut self);
    
    /// Switch back to primary screen
    pub fn exit_alternate_screen(&mut self);
    
    /// Check if alternate screen is active (TUI mode)
    pub fn is_alternate_screen(&self) -> bool;
    
    /// Get dirty cells since last sync
    pub fn get_dirty(&self) -> &DirtyTracker;
    
    /// Mark all cells as synced (clear dirty state)
    pub fn mark_synced(&mut self);
    
    /// Get full screen snapshot
    pub fn snapshot(&self) -> ScreenSnapshot;
    
    /// Get delta since last sync
    pub fn delta(&self) -> ScreenDelta;
}
```

### Serialization for Transport

```rust
/// Full screen state for initial sync or reconnect
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenSnapshot {
    pub cols: u16,
    pub rows: u16,
    pub cells: Vec<SerializedRow>,
    pub cursor: CursorState,
    pub modes: TerminalModes,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SerializedRow {
    pub cells: Vec<SerializedCell>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SerializedCell {
    pub c: char,           // character (just 'c' for minimal JSON size)
    #[serde(skip_serializing_if = "is_default")]
    pub a: u8,             // attribute flags (bit packed)
    #[serde(skip_serializing_if = "is_default")]
    pub fg: Option<u32>,   // foreground color (RGB or index)
    #[serde(skip_serializing_if = "is_default")]
    pub bg: Option<u32>,   // background color (RGB or index)
}

/// Incremental update (dirty cells only)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenDelta {
    pub dirty_cells: Vec<DirtyCell>,
    pub cursor: Option<CursorState>,
    pub mode_changes: Option<ModeChanges>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirtyCell {
    pub r: u16,  // row
    pub c: u16,  // col
    pub cell: SerializedCell,
}
```

### Alternate Screen Detection

AI CLIs may use TUI interfaces (menus, spinners, progress bars) that use the alternate screen buffer:

```rust
impl ShadowTerminal {
    /// Called when ESC[?1049h is received
    pub fn enter_alternate_screen(&mut self) {
        if !self.modes.alternate_screen {
            // Save primary cursor state
            self.primary_cursor_save = self.cursor.clone();
            // Switch to alternate buffer
            self.active_buffer = BufferType::Alternate;
            self.modes.alternate_screen = true;
            // Clear alternate screen
            self.active_buffer_mut().clear_all();
            // Mark full refresh
            self.dirty.full_refresh = true;
        }
    }
    
    /// Called when ESC[?1049l is received
    pub fn exit_alternate_screen(&mut self) {
        if self.modes.alternate_screen {
            // Restore primary cursor
            self.cursor = self.primary_cursor_save.clone();
            // Switch to primary buffer
            self.active_buffer = BufferType::Primary;
            self.modes.alternate_screen = false;
            // Mark full refresh
            self.dirty.full_refresh = true;
        }
    }
}
```

The frontend uses this to switch rendering modes:
- **Primary screen** → Stream Mode (chat bubbles)
- **Alternate screen** → Grid Mode (terminal canvas)

## Plan

### Phase 1: VTE Parser Integration
- [ ] Evaluate VTE crates (`vte`, `vt100`, `alacritty_terminal`)
- [ ] Add chosen VTE dependency
- [ ] Implement basic `VteParser` wrapper
- [ ] Handle character printing
- [ ] Handle basic control characters (CR, LF, BS, TAB)

### Phase 2: Shadow Terminal Core
- [ ] Implement `Cell` and `CellAttributes` structs
- [ ] Implement `ScreenBuffer` with 2D cell grid
- [ ] Implement `ShadowTerminal` with primary/alternate buffers
- [ ] Add cursor state management
- [ ] Add terminal mode tracking

### Phase 3: CSI Sequence Handling
- [ ] Cursor movement sequences (CUU, CUD, CUF, CUB, CUP)
- [ ] Screen clearing (ED, EL)
- [ ] Scrolling (SU, SD, DECSTBM)
- [ ] Character attributes (SGR) including colors
- [ ] Alternate screen switching (DECSET/DECRST 1049)

### Phase 4: Dirty Tracking
- [ ] Implement `DirtyTracker` with cell-level granularity
- [ ] Add dirty rect optimization (merge adjacent cells)
- [ ] Implement `mark_synced()` and `get_dirty()`
- [ ] Add full refresh detection

### Phase 5: Serialization
- [ ] Implement `ScreenSnapshot` serialization
- [ ] Implement `ScreenDelta` for incremental updates
- [ ] Optimize JSON payload size
- [ ] Add binary serialization option (MessagePack)

### Phase 6: Testing & Validation
- [ ] Unit tests for each CSI sequence
- [ ] Visual regression tests (compare with reference terminal)
- [ ] Fuzzing with random escape sequences
- [ ] Performance benchmarks

## Test

### Unit Tests
- [ ] VTE parser correctly handles all supported sequences
- [ ] Shadow terminal maintains consistent state
- [ ] Dirty tracking correctly identifies changed cells
- [ ] Alternate screen switching works correctly
- [ ] Serialization roundtrip preserves state

### Visual Regression Tests
- [ ] Compare rendering against Alacritty/iTerm2
- [ ] Test with real CLI tool output (htop, vim, less)
- [ ] Test with AI CLI tool output (Claude, Copilot)

### Performance Tests
- [ ] Process 1MB of terminal data in <100ms
- [ ] Serialize 120x40 terminal in <5ms
- [ ] Memory usage <1MB per terminal instance

## Notes

### VTE Crate Evaluation

**`vte` crate**:
- ✅ Used by Alacritty (battle-tested)
- ✅ Pure Rust, no unsafe
- ✅ State machine parser only (we build terminal)
- ⚠️ Requires implementing Perform trait

**`vt100` crate**:
- ✅ Complete terminal emulator
- ✅ Provides screen state out of the box
- ⚠️ May include features we don't need

**`alacritty_terminal`**:
- ✅ Most complete implementation
- ❌ Heavy dependency (entire Alacritty terminal)
- ❌ Overkill for our needs

**Recommendation**: Use `vte` for parsing, implement our own shadow terminal for maximum control.

### Escape Sequence Priority

Essential sequences to support (in order of priority):

1. **Critical** (must have):
   - Character printing (UTF-8)
   - Basic cursor movement (CUU, CUD, CUF, CUB, CUP, CR, LF)
   - Screen clearing (ED, EL)
   - SGR (colors, bold, etc.)
   - Alternate screen buffer (1049h/l)

2. **Important** (should have):
   - Scrolling regions (DECSTBM)
   - Insert/delete lines (IL, DL)
   - Insert/delete characters (ICH, DCH)
   - Save/restore cursor (DECSC, DECRC)

3. **Nice to have**:
   - Mouse tracking
   - Bracketed paste
   - Title setting (OSC 0)
   - Hyperlinks (OSC 8)

### Performance Considerations

- Use flat Vec instead of Vec<Vec> for cells (cache-friendly)
- Avoid allocations in hot path (reuse buffers)
- Consider SIMD for bulk cell operations
- Profile with realistic AI CLI output
