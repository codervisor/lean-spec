---
status: planned
created: 2026-01-20
priority: high
tags:
- quality
- automation
- file-watcher
- infrastructure
created_at: 2026-01-20T03:16:27.806752540Z
updated_at: 2026-01-20T03:16:27.806752540Z
---

# Spec File Watcher for Automatic Corruption Detection

## Overview

Implement file watcher infrastructure to automatically detect spec edits from AI tools and trigger validation. This is the foundation for automatic corruption detection since most spec editing happens via AI tool built-ins (Cursor, Claude, Copilot) rather than LeanSpec commands.

**The Problem:**
- AI tools edit spec files directly (not via MCP/CLI)
- Corruption goes undetected until manual validation
- Post-command hooks can't catch external edits
- Need to detect changes from any source

**The Solution:**
Watch `specs/**/*.md` for changes and trigger validation with smart debouncing to handle sequential edits gracefully.

**Key Requirements:**
- Detect external file changes within 2-3 seconds
- Handle sequential edits without multiple validations
- Wait for editing session to finish (file stability + grace period)
- Lightweight (< 50MB RAM)
- No false positives during active editing

## Design

### File Watcher Architecture

```
┌─────────────────────────────────────────────────┐
│            File System Events                   │
│         (specs/**/*.md changed)                 │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│         File Stability Detection                │
│    (awaitWriteFinish: 500ms no changes)        │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│         Sequential Edit Debouncing              │
│   (Grace period: 2s after last change)         │
│   - Track edit count per file                   │
│   - Clear timer on each change                  │
│   - Validate after grace period expires         │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│         Emit Validation Event                   │
│   { path, editCount, timestamp }                │
└─────────────────────────────────────────────────┘
```

### Sequential Edit Handling

**Challenge:**
AI agents make multiple edits in quick succession:
```
10:00:00.100 - Edit line 45 (add section)
10:00:00.250 - Edit line 78 (add code block)
10:00:00.400 - Edit line 120 (update plan)
10:00:00.550 - Edit line 200 (add test)
```

**Naive Approach:** Validate 4 times → wasteful, annoying notifications
**Smart Approach:** Wait for editing to finish → validate once

### Implementation

```typescript
// packages/core/src/watcher/spec-watcher.ts
import chokidar from 'chokidar';
import EventEmitter from 'events';

export interface WatcherConfig {
  paths: string[];
  stabilityThresholdMs: number;
  gracePeriodMs: number;
  enabled: boolean;
}

export interface SpecChangeEvent {
  path: string;
  editCount: number;
  timestamp: Date;
}

export class SpecWatcher extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private editTimers: Map<string, NodeJS.Timeout> = new Map();
  private editCounts: Map<string, number> = new Map();
  
  constructor(private config: WatcherConfig) {
    super();
  }
  
  start(): void {
    if (this.watcher) {
      throw new Error('Watcher already started');
    }
    
    this.watcher = chokidar.watch(this.config.paths, {
      ignored: /(^|[\/\\])\../,  // Ignore dotfiles
      persistent: true,
      ignoreInitial: true,
      
      // Key: Wait for file to stabilize (no writes for threshold)
      awaitWriteFinish: {
        stabilityThreshold: this.config.stabilityThresholdMs,
        pollInterval: 100
      }
    });
    
    this.watcher.on('change', (path: string) => {
      this.handleChange(path);
    });
    
    this.watcher.on('error', (error: Error) => {
      this.emit('error', error);
    });
  }
  
  private handleChange(path: string): void {
    // Track edit count
    const count = (this.editCounts.get(path) || 0) + 1;
    this.editCounts.set(path, count);
    
    // Clear existing timer
    const existingTimer = this.editTimers.get(path);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new timer: emit event after grace period of no changes
    const timer = setTimeout(() => {
      const editCount = this.editCounts.get(path) || 0;
      
      // Emit validation event
      this.emit('spec-changed', {
        path,
        editCount,
        timestamp: new Date()
      } as SpecChangeEvent);
      
      // Cleanup
      this.editTimers.delete(path);
      this.editCounts.delete(path);
    }, this.config.gracePeriodMs);
    
    this.editTimers.set(path, timer);
  }
  
  stop(): void {
    // Clear all pending timers
    this.editTimers.forEach(timer => clearTimeout(timer));
    this.editTimers.clear();
    this.editCounts.clear();
    
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
  
  isRunning(): boolean {
    return this.watcher !== null;
  }
}
```

### Integration Points

**Desktop App:**
```typescript
const watcher = new SpecWatcher(config.watcher);

watcher.on('spec-changed', async (event: SpecChangeEvent) => {
  console.log(`[Watcher] ${event.path} stable after ${event.editCount} edits`);
  
  // Trigger validation (separate concern)
  await validateSpec(event.path);
});

watcher.on('error', (error: Error) => {
  console.error('[Watcher] Error:', error);
});

watcher.start();
```

**CLI Daemon:**
```bash
$ lean-spec watch
[Watcher] Started watching specs/**/*.md
[Watcher] Press Ctrl+C to stop

[Watcher] specs/123-my-feature/README.md stable after 4 edits
[Watcher] Triggering validation...
✓ Validation passed
```

**MCP Server:**
```typescript
// Watcher runs as part of server
const watcher = new SpecWatcher(config.watcher);

watcher.on('spec-changed', (event) => {
  // Emit to connected clients
  server.notify('spec/changed', event);
});
```

### Configuration

```json
{
  "watcher": {
    "enabled": true,
    "paths": ["specs/**/*.md"],
    "stabilityThresholdMs": 500,
    "gracePeriodMs": 2000
  }
}
```

## Plan

- [ ] Create `packages/core/src/watcher/` directory
- [ ] Implement `SpecWatcher` class with chokidar
- [ ] Add file stability detection (awaitWriteFinish)
- [ ] Implement sequential edit debouncing (grace period)
- [ ] Add event emitter for spec-changed events
- [ ] Write unit tests (30+ test cases)
- [ ] Add CLI daemon command: `lean-spec watch`
- [ ] Integrate into Desktop app
- [ ] Integrate into MCP server
- [ ] Add configuration loading
- [ ] Test with real AI tool edits (Cursor, Claude, etc.)
- [ ] Performance testing (memory usage, CPU)
- [ ] Documentation

## Test

### Debouncing Tests
- [ ] Single edit triggers validation after grace period
- [ ] Multiple rapid edits trigger single validation
- [ ] Edit count is tracked correctly
- [ ] Timer is cleared and reset on each edit
- [ ] Grace period is configurable

### File Stability Tests
- [ ] Doesn't trigger during active file writes
- [ ] Waits for file to stabilize (no writes for threshold)
- [ ] Stability threshold is configurable

### Integration Tests
- [ ] Detects changes from any editor (VS Code, Vim, etc.)
- [ ] Detects changes from AI tools (Cursor, Claude)
- [ ] Works with manual edits
- [ ] Doesn't trigger on own changes (validation auto-fix)
- [ ] Can start/stop watcher
- [ ] Cleans up resources on stop

### Performance Tests
- [ ] Memory usage < 50MB
- [ ] CPU usage < 5% when idle
- [ ] Handles 100+ specs without issues
- [ ] No memory leaks over time

## Notes

**Dependencies:**
- `chokidar` - File watcher library (battle-tested, widely used)

**Deployment:**
- Desktop app: Always running
- CLI daemon: `lean-spec watch` command
- MCP server: Optional, can be disabled

**Future Enhancements:**
- Watch sub-spec files (DESIGN.md, IMPLEMENTATION.md, etc.)
- Configurable file patterns (ignore certain files)
- Batch validation (multiple specs changed together)
- Smart ignore (don't trigger on backup files, temp files)