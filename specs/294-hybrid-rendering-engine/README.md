---
status: archived
created: 2026-02-03
priority: high
tags:
- ui
- web
- rendering
- react
- terminal
depends_on:
- 293-headless-vte-state-machine
- 296-incremental-data-protocol
parent: 291-cli-runtime-web-orchestrator
created_at: 2026-02-03T13:44:34.204115Z
updated_at: 2026-02-03T14:11:48.055386Z
transitions:
- status: archived
  at: 2026-02-03T14:11:48.055386Z
---

# Hybrid Rendering Engine

## Overview

### Problem

Terminal output from AI CLI tools doesn't map well to a single rendering paradigm:

- **Linear output** (logs, responses, code): Best rendered as chat bubbles with markdown formatting
- **TUI output** (menus, progress bars, interactive prompts): Requires full terminal grid rendering

Current approaches force a choice:
- Pure chat UI (spec 094): Loses TUI features, can't render interactive menus
- Pure terminal emulator (xterm.js): Loses native web UX, everything looks like a terminal

### Solution

Build a **Hybrid Rendering Engine** that dynamically switches between two modes based on terminal state:

1. **Stream Mode**: Linear logs rendered as native chat bubbles with MDX formatting
2. **Grid Mode**: Full terminal canvas for TUI applications (menus, progress bars)

The system detects when the CLI enters Alternate Screen Buffer mode (TUI) and automatically switches rendering.

### Scope

**In Scope**:
- Stream Mode component (chat bubbles)
- Grid Mode component (terminal canvas)
- Automatic mode switching based on alternate screen
- ANSI → structured metadata conversion for Stream Mode
- Cell-based rendering for Grid Mode
- Click/hover interaction handling in Grid Mode

**Out of Scope**:
- VTE parsing (spec 293)
- WebSocket protocol (spec 296)
- PTY management (spec 292)

## Design

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Hybrid Rendering Engine                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │                  Mode Controller                             │  │
│   │                                                              │  │
│   │   WebSocket → [Mode Detection] → Render Mode                │  │
│   │                     ↓                                        │  │
│   │   if (alternateScreen) → Grid Mode                          │  │
│   │   else                 → Stream Mode                         │  │
│   │                                                              │  │
│   └──────────────────────────┬──────────────────────────────────┘  │
│                              │                                      │
│   ┌──────────────────────────┴──────────────────────────────────┐  │
│   │                                                              │  │
│   │   ┌─────────────────────┐   ┌───────────────────────────┐   │  │
│   │   │     Stream Mode     │   │        Grid Mode          │   │  │
│   │   │                     │   │                           │   │  │
│   │   │  ┌───────────────┐  │   │  ┌─────────────────────┐  │   │  │
│   │   │  │ Chat Bubbles  │  │   │  │  Terminal Canvas    │  │   │  │
│   │   │  │               │  │   │  │                     │  │   │  │
│   │   │  │ ┌───────────┐ │  │   │  │  ┌─┬─┬─┬─┬─┬─┬─┬─┐  │  │   │  │
│   │   │  │ │ AI Output │ │  │   │  │  │█│ │ │M│e│n│u│ │  │  │   │  │
│   │   │  │ │ (MDX)     │ │  │   │  │  ├─┼─┼─┼─┼─┼─┼─┼─┤  │  │   │  │
│   │   │  │ └───────────┘ │  │   │  │  │ │>│ │O│p│t│1│ │  │  │   │  │
│   │   │  │               │  │   │  │  ├─┼─┼─┼─┼─┼─┼─┼─┤  │  │   │  │
│   │   │  │ ┌───────────┐ │  │   │  │  │ │ │ │O│p│t│2│ │  │  │   │  │
│   │   │  │ │ Code Block│ │  │   │  │  └─┴─┴─┴─┴─┴─┴─┴─┘  │  │   │  │
│   │   │  │ │ (syntax)  │ │  │   │  │                     │  │   │  │
│   │   │  │ └───────────┘ │  │   │  │  Click → Input      │  │   │  │
│   │   │  │               │  │   │  │  Hover → Highlight  │  │   │  │
│   │   │  └───────────────┘  │   │  └─────────────────────┘  │   │  │
│   │   │                     │   │                           │   │  │
│   │   └─────────────────────┘   └───────────────────────────┘   │  │
│   │                                                              │  │
│   └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │                   Shared Components                          │  │
│   │                                                              │  │
│   │   • Input Bar (keystroke capture, command input)            │  │
│   │   • Status Bar (session info, connection status)            │  │
│   │   • Toolbar (mode toggle, settings, fullscreen)             │  │
│   └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Stream Mode Components

Stream Mode renders linear terminal output as a scrollable list of styled message bubbles:

```tsx
interface StreamModeProps {
  messages: StreamMessage[];
  onSendMessage: (text: string) => void;
  isConnected: boolean;
}

interface StreamMessage {
  id: string;
  role: 'assistant' | 'user' | 'system';
  content: string;  // Processed content (ANSI stripped, structured)
  timestamp: Date;
  metadata?: MessageMetadata;
}

interface MessageMetadata {
  // Extracted from ANSI sequences
  isCode?: boolean;
  language?: string;
  isThinking?: boolean;
  isError?: boolean;
  progressPercent?: number;
}

export function StreamMode({ messages, onSendMessage, isConnected }: StreamModeProps) {
  return (
    <div className="stream-mode">
      <ScrollArea className="messages-container">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </ScrollArea>
      
      <InputBar onSend={onSendMessage} disabled={!isConnected} />
    </div>
  );
}

function MessageBubble({ message }: { message: StreamMessage }) {
  return (
    <div className={cn("message-bubble", message.role)}>
      {message.metadata?.isCode ? (
        <CodeBlock language={message.metadata.language}>
          {message.content}
        </CodeBlock>
      ) : message.metadata?.isThinking ? (
        <ThinkingIndicator>{message.content}</ThinkingIndicator>
      ) : (
        <MarkdownContent>{message.content}</MarkdownContent>
      )}
      <Timestamp date={message.timestamp} />
    </div>
  );
}
```

### ANSI to Structured Conversion

Transform raw terminal output into structured messages:

```typescript
interface AnsiProcessor {
  // Process raw terminal output
  process(data: string): ProcessedOutput;
  
  // Detect content type from ANSI patterns
  detectType(data: string): ContentType;
}

type ContentType = 
  | 'text'          // Plain text
  | 'code'          // Code block (syntax highlighted by CLI)
  | 'thinking'      // AI thinking indicator (spinner, ...)
  | 'progress'      // Progress bar
  | 'error'         // Error message
  | 'prompt'        // User prompt
  | 'command';      // Command being executed

interface ProcessedOutput {
  type: ContentType;
  content: string;      // ANSI stripped text
  attributes: {
    foreground?: string;   // CSS color
    background?: string;
    bold?: boolean;
    italic?: boolean;
    // ... other attributes
  };
  language?: string;    // Detected programming language
}

// Pattern detection for AI CLI outputs
const PATTERNS = {
  thinking: /^\s*(Thinking|Analyzing|Processing)\.{3}/,
  progress: /\[([═▓░█]+)\]\s*(\d+)%/,
  error: /^(Error|error|ERROR):/,
  codeBlock: /^```(\w+)?$/,
  prompt: /^(>|❯|\$)\s/,
};
```

### Grid Mode Components

Grid Mode renders the terminal as a 2D character grid with full styling:

```tsx
interface GridModeProps {
  screen: ScreenSnapshot;
  onInput: (key: string) => void;
  onClick: (row: number, col: number) => void;
}

export function GridMode({ screen, onInput, onClick }: GridModeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      onInput(keyToEscapeSequence(e));
    };
    
    containerRef.current?.addEventListener('keydown', handleKeyDown);
    return () => containerRef.current?.removeEventListener('keydown', handleKeyDown);
  }, [onInput]);
  
  return (
    <div 
      ref={containerRef}
      className="grid-mode"
      tabIndex={0}
    >
      <div 
        className="terminal-grid"
        style={{
          gridTemplateColumns: `repeat(${screen.cols}, 1ch)`,
          gridTemplateRows: `repeat(${screen.rows}, 1lh)`,
        }}
      >
        {screen.cells.flatMap((row, rowIdx) =>
          row.cells.map((cell, colIdx) => (
            <TerminalCell
              key={`${rowIdx}-${colIdx}`}
              cell={cell}
              isCursor={screen.cursor.row === rowIdx && screen.cursor.col === colIdx}
              onClick={() => onClick(rowIdx, colIdx)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface TerminalCellProps {
  cell: SerializedCell;
  isCursor: boolean;
  onClick: () => void;
}

function TerminalCell({ cell, isCursor, onClick }: TerminalCellProps) {
  const style = useMemo(() => ({
    color: cell.fg ? `#${cell.fg.toString(16).padStart(6, '0')}` : 'inherit',
    backgroundColor: cell.bg ? `#${cell.bg.toString(16).padStart(6, '0')}` : 'inherit',
    fontWeight: (cell.a & ATTR_BOLD) ? 'bold' : 'normal',
    fontStyle: (cell.a & ATTR_ITALIC) ? 'italic' : 'normal',
    textDecoration: (cell.a & ATTR_UNDERLINE) ? 'underline' : 'none',
  }), [cell]);
  
  return (
    <span 
      className={cn("terminal-cell", { cursor: isCursor })}
      style={style}
      onClick={onClick}
    >
      {cell.c || ' '}
    </span>
  );
}
```

### Canvas-Based Rendering (Performance Alternative)

For high-performance scenarios, use Canvas API instead of DOM:

```tsx
interface CanvasGridProps {
  screen: ScreenSnapshot;
  cellWidth: number;
  cellHeight: number;
  font: string;
}

export function CanvasGrid({ screen, cellWidth, cellHeight, font }: CanvasGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set dimensions
    canvas.width = screen.cols * cellWidth;
    canvas.height = screen.rows * cellHeight;
    
    ctx.font = font;
    ctx.textBaseline = 'top';
    
    // Render cells
    screen.cells.forEach((row, rowIdx) => {
      row.cells.forEach((cell, colIdx) => {
        const x = colIdx * cellWidth;
        const y = rowIdx * cellHeight;
        
        // Background
        if (cell.bg) {
          ctx.fillStyle = `#${cell.bg.toString(16).padStart(6, '0')}`;
          ctx.fillRect(x, y, cellWidth, cellHeight);
        }
        
        // Foreground (character)
        ctx.fillStyle = cell.fg 
          ? `#${cell.fg.toString(16).padStart(6, '0')}`
          : '#ffffff';
        ctx.fillText(cell.c || ' ', x, y);
      });
    });
    
    // Cursor
    if (screen.cursor.visible) {
      const cx = screen.cursor.col * cellWidth;
      const cy = screen.cursor.row * cellHeight;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(cx, cy, cellWidth, cellHeight);
    }
  }, [screen, cellWidth, cellHeight, font]);
  
  return <canvas ref={canvasRef} className="terminal-canvas" />;
}
```

### Mode Controller

The Mode Controller automatically switches between Stream and Grid modes:

```tsx
interface ModeControllerProps {
  sessionId: string;
  onModeChange?: (mode: RenderMode) => void;
}

type RenderMode = 'stream' | 'grid';

export function ModeController({ sessionId, onModeChange }: ModeControllerProps) {
  const [mode, setMode] = useState<RenderMode>('stream');
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [screen, setScreen] = useState<ScreenSnapshot | null>(null);
  
  const { sendMessage, lastMessage, readyState } = useWebSocket(
    `/api/sessions/${sessionId}/stream`
  );
  
  // Process incoming messages and detect mode
  useEffect(() => {
    if (!lastMessage) return;
    
    const data = JSON.parse(lastMessage.data);
    
    if (data.type === 'mode') {
      const newMode = data.alternateScreen ? 'grid' : 'stream';
      setMode(newMode);
      onModeChange?.(newMode);
    }
    
    if (data.type === 'snapshot' || data.type === 'delta') {
      // Grid mode data
      if (data.type === 'snapshot') {
        setScreen(data);
      } else {
        // Apply delta to existing screen
        setScreen(prev => applyDelta(prev, data));
      }
    }
    
    if (data.type === 'output') {
      // Stream mode data
      setMessages(prev => [...prev, processOutput(data)]);
    }
  }, [lastMessage, onModeChange]);
  
  const handleInput = useCallback((input: string) => {
    sendMessage(JSON.stringify({ type: 'input', data: input }));
  }, [sendMessage]);
  
  return (
    <div className="mode-controller">
      <div className="mode-indicator">
        {mode === 'stream' ? 'Chat Mode' : 'Terminal Mode'}
      </div>
      
      {mode === 'stream' ? (
        <StreamMode
          messages={messages}
          onSendMessage={handleInput}
          isConnected={readyState === WebSocket.OPEN}
        />
      ) : (
        <GridMode
          screen={screen!}
          onInput={handleInput}
          onClick={(row, col) => handleInput(`\x1b[${row};${col}M`)}
        />
      )}
    </div>
  );
}
```

### Keystroke Handling

Convert web keyboard events to terminal escape sequences:

```typescript
function keyToEscapeSequence(event: KeyboardEvent): string {
  const { key, ctrlKey, altKey, shiftKey } = event;
  
  // Control sequences
  if (ctrlKey) {
    if (key >= 'a' && key <= 'z') {
      return String.fromCharCode(key.charCodeAt(0) - 96);
    }
    if (key === 'c') return '\x03';  // SIGINT
    if (key === 'd') return '\x04';  // EOF
    if (key === 'z') return '\x1a';  // SIGTSTP
  }
  
  // Arrow keys
  const arrowMap: Record<string, string> = {
    'ArrowUp': '\x1b[A',
    'ArrowDown': '\x1b[B',
    'ArrowRight': '\x1b[C',
    'ArrowLeft': '\x1b[D',
  };
  if (arrowMap[key]) return arrowMap[key];
  
  // Function keys
  const fnMap: Record<string, string> = {
    'F1': '\x1bOP',
    'F2': '\x1bOQ',
    'F3': '\x1bOR',
    'F4': '\x1bOS',
    // ... F5-F12
  };
  if (fnMap[key]) return fnMap[key];
  
  // Special keys
  const specialMap: Record<string, string> = {
    'Enter': '\r',
    'Backspace': '\x7f',
    'Tab': '\t',
    'Escape': '\x1b',
    'Delete': '\x1b[3~',
    'Home': '\x1b[H',
    'End': '\x1b[F',
    'PageUp': '\x1b[5~',
    'PageDown': '\x1b[6~',
  };
  if (specialMap[key]) return specialMap[key];
  
  // Regular characters
  if (key.length === 1) return key;
  
  return '';
}
```

## Plan

### Phase 1: Stream Mode Foundation
- [ ] Create `StreamMode` component with message list
- [ ] Implement `MessageBubble` with MDX rendering
- [ ] Build ANSI-to-structured processor
- [ ] Add code block detection and syntax highlighting
- [ ] Implement auto-scroll behavior

### Phase 2: Grid Mode Foundation
- [ ] Create `GridMode` component with CSS Grid layout
- [ ] Implement `TerminalCell` with attribute styling
- [ ] Add cursor rendering and blinking
- [ ] Implement keyboard event capture
- [ ] Add mouse click handling

### Phase 3: Mode Controller
- [ ] Implement WebSocket connection management
- [ ] Add mode detection from terminal state
- [ ] Build smooth mode transition animations
- [ ] Add manual mode override toggle
- [ ] Implement reconnection logic

### Phase 4: Keyboard & Input
- [ ] Implement `keyToEscapeSequence` conversion
- [ ] Add paste handling (bracketed paste mode)
- [ ] Implement Ctrl+C/D/Z handling
- [ ] Add function key support
- [ ] Test with various CLI interactions

### Phase 5: Performance Optimization
- [ ] Implement Canvas-based Grid renderer
- [ ] Add virtual scrolling for Stream mode
- [ ] Optimize re-render with delta updates
- [ ] Add font ligature support
- [ ] Profile and optimize hot paths

### Phase 6: Polish & Accessibility
- [ ] Add keyboard navigation
- [ ] Implement screen reader support
- [ ] Add high contrast color themes
- [ ] Mobile responsiveness
- [ ] Touch gesture handling

## Test

### Unit Tests
- [ ] ANSI processor correctly strips escape sequences
- [ ] Content type detection works for AI CLI patterns
- [ ] Keystroke-to-escape conversion is accurate
- [ ] Delta application produces correct screen state

### Integration Tests
- [ ] Mode switching works with real terminal data
- [ ] WebSocket reconnection maintains state
- [ ] Click handling sends correct escape sequences
- [ ] Copy/paste works in both modes

### Visual Tests
- [ ] Stream mode renders Claude Code output correctly
- [ ] Grid mode renders htop/vim accurately
- [ ] Mode transition is smooth (no flicker)
- [ ] Cursor animation renders correctly

### Performance Tests
- [ ] 60fps rendering with continuous output
- [ ] <16ms frame time for Grid mode updates
- [ ] Stream mode handles 1000+ messages
- [ ] Memory stable over long sessions

## Notes

### Design Decisions

**Why CSS Grid over Canvas for Grid Mode?**
- Simpler implementation
- Better accessibility (DOM elements)
- Click handling is natural
- Good enough for terminal update rates (60fps not needed)

**When to use Canvas:**
- Very high update frequency
- Large terminal sizes (200+ cols)
- Mobile devices (DOM overhead)

**Why two modes instead of hybrid?**
- Clearer mental model for users
- Easier to optimize separately
- Alternate screen is a clear switching point
- Chat UX and terminal UX are fundamentally different

### Color Palette

Standard 256-color palette mapping:

```typescript
const PALETTE_256: string[] = [
  // 16 base colors (0-15)
  '#000000', '#cd0000', '#00cd00', '#cdcd00', '#0000ee', '#cd00cd', '#00cdcd', '#e5e5e5',
  '#7f7f7f', '#ff0000', '#00ff00', '#ffff00', '#5c5cff', '#ff00ff', '#00ffff', '#ffffff',
  // 216 color cube (16-231)
  // ... generated from RGB values
  // 24 grayscale (232-255)
  // ... generated
];

function color256ToHex(index: number): string {
  if (index < 16) {
    return PALETTE_256[index];
  }
  if (index < 232) {
    // 6x6x6 color cube
    index -= 16;
    const r = Math.floor(index / 36) * 51;
    const g = Math.floor((index % 36) / 6) * 51;
    const b = (index % 6) * 51;
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  // Grayscale
  const gray = (index - 232) * 10 + 8;
  return `#${gray.toString(16).padStart(2, '0').repeat(3)}`;
}
```

### Font Selection

Monospace fonts with good Unicode support:

```css
.terminal-grid {
  font-family: 
    'JetBrains Mono',
    'Fira Code', 
    'Cascadia Code',
    'Source Code Pro',
    'SF Mono',
    'Monaco',
    'Consolas',
    monospace;
  font-size: 14px;
  line-height: 1.4;
}
```

Consider font ligatures for code readability (configurable).
