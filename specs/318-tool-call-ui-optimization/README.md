---
status: planned
created: 2026-02-06
priority: high
tags:
- ui
- performance
- chat
parent: 094-ai-chatbot-web-integration
created_at: 2026-02-06T14:12:40.736315Z
updated_at: 2026-02-06T14:20:41.906671Z
---

# Tool Call Result UI Performance Optimization

## Overview

Tool call results in the AI chat sidebar can be very large (e.g., file reads, search results, board output), causing the browser to hang. The current implementation calls `JSON.stringify` + full syntax highlighting on unbounded data with no truncation, virtualization, or lazy rendering. Additionally, chat uses its own `ToolExecution` component (Prism-based) instead of the richer library `Tool` component (Shiki-based), creating duplication and inconsistency.

## Design

### Problem Breakdown

1. **Large results cause hangs**: `JSON.stringify(result, null, 2)` + Prism syntax highlighting on arbitrarily large JSON blocks the main thread
2. **No per-tool specialized rendering**: All tool results render as raw JSON regardless of tool type
3. **Duplicate component systems**: `chat/tool-execution.tsx` (Prism) vs `library/ai-elements/tool.tsx` (Shiki) — consolidate to one

### Architecture

```
ToolResult (container)
├── ToolResultRegistry.resolve(toolName) → specific renderer or fallback
├── Specialized renderers (e.g., SearchResultView, BoardView, FileView)
└── FallbackJsonView (truncated, virtualized, lazy-highlighted)
```

### Key Decisions

- **Truncation first**: Cap JSON display at ~500 lines with "Show more" expansion
- **Lazy highlight**: Only syntax-highlight visible content (use `contentVisibility: auto`)
- **Registry pattern**: Map tool names → custom result components; unknown tools fall back to optimized JSON
- **Consolidate on library component**: Migrate chat sidebar to use `library/ai-elements/tool.tsx` (Shiki-based `CodeBlock` already has caching + `contentVisibility`)

## Plan

- [ ] Add size guard to tool result rendering — truncate JSON to first N lines with "Show all" toggle
- [ ] Migrate chat `ToolExecution` to use library `Tool` component (eliminate Prism duplication)
- [ ] Add `contentVisibility: auto` and `containIntrinsicSize` to tool output containers
- [ ] Create `ToolResultRegistry` — maps tool names to specialized renderers with JSON fallback
- [ ] Build 2-3 specialized tool result renderers (e.g., `search` → list view, `board` → table, `view` → markdown)
- [ ] Defer rendering of collapsed tool call content (don't mount until expanded)
- [ ] Add "Copy result" button to tool output

## Test

- [ ] Render a tool result with 10,000+ line JSON without browser hang
- [ ] Collapsed tool calls contribute zero rendering cost (deferred mount verified)
- [ ] Specialized renderers activate for registered tools, JSON fallback for unknown tools
- [ ] No visual regression compared to current tool call display

## Notes

### Current Files
- `packages/ui/src/components/chat/tool-execution.tsx` — chat sidebar tool (Prism, no perf guards)
- `packages/ui/src/components/library/ai-elements/tool.tsx` — library tool (Shiki, richer states)
- `packages/ui/src/components/chat/chat-message.tsx` — extracts tool calls from message parts
- `packages/ui/src/components/library/ai-elements/code-block.tsx` — already has caching + `contentVisibility`

### Existing Optimizations to Leverage
- `CodeBlock` highlighter/token caching, async tokenization, `contentVisibility: auto`
- `ChatMessage` wrapped in `memo()` with content comparison