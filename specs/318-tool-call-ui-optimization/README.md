---
status: in-progress
created: 2026-02-06
priority: high
tags:
- ui
- performance
- chat
parent: 094-ai-chatbot-web-integration
created_at: 2026-02-06T14:12:40.736315Z
updated_at: 2026-02-06T15:37:00.274933Z
transitions:
- status: in-progress
  at: 2026-02-06T15:37:00.274933Z
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

- [ ] Add `ToolResultRegistry` in `packages/ui/src/components/chat/tool-result-registry.tsx` to map tool names to specialized renderers, with a `JsonResultView` fallback.
- [ ] Implement `safeStringify` + line truncation helper in `packages/ui/src/components/chat/tool-result-utils.ts` (default max 500 lines, "Show all" toggle) and reuse it for input/output views.
- [ ] Update `ToolInput`/`ToolOutput` in `packages/ui/src/components/library/ai-elements/tool.tsx` to support truncation + copy action using `CodeBlockHeader` + `CodeBlockCopyButton`.
- [ ] Migrate `packages/ui/src/components/chat/chat-message.tsx` to render `Tool`, `ToolHeader`, `ToolContent`, `ToolInput`, `ToolOutput` instead of `ToolExecution`; map `toolInvocation.state` into `ToolPart["state"]` values and use `type="dynamic-tool"` with `toolName`.
- [ ] Add specialized renderers for MCP tools: `search` (`results` list), `board` (`groups` table), `view` (render `content` markdown plus metadata summary).
- [ ] Apply `contentVisibility: auto` + `containIntrinsicSize` on tool output containers when output is not a `CodeBlock`.
- [ ] Remove `packages/ui/src/components/chat/tool-execution.tsx` if unused post-migration.

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

### Research Findings
- `ToolExecution` is only used in `ChatMessage` and performs `JSON.stringify` + Prism rendering for input/output with no truncation or safe-stringify guard ([packages/ui/src/components/chat/tool-execution.tsx](packages/ui/src/components/chat/tool-execution.tsx#L1-L120)).
- Library `Tool` components rely on Radix `Collapsible`; `ToolInput`/`ToolOutput` currently `JSON.stringify` full objects with `CodeBlock` and no truncation ([packages/ui/src/components/library/ai-elements/tool.tsx](packages/ui/src/components/library/ai-elements/tool.tsx#L24-L173)).
- `CodeBlock` already applies `contentVisibility: auto` + `containIntrinsicSize` and provides `CodeBlockCopyButton` for copy actions ([packages/ui/src/components/library/ai-elements/code-block.tsx](packages/ui/src/components/library/ai-elements/code-block.tsx#L170-L347)).

### MCP Tool Output Shapes (for specialized renderers)
- `search` → `{ "query": string, "count": number, "results": [...] }` ([rust/leanspec-mcp/src/tools/specs.rs](rust/leanspec-mcp/src/tools/specs.rs#L520-L640)).
- `board` → `{ "groupBy": string, "total": number, "groups": [{ "name": string, "count": number, "specs": [...] }] }` ([rust/leanspec-mcp/src/tools/board.rs](rust/leanspec-mcp/src/tools/board.rs#L1-L78)).
- `view` → `{ "path": string, "title": string, "status": string, "tags": [...], "content": string, ... }` ([rust/leanspec-mcp/src/tools/specs.rs](rust/leanspec-mcp/src/tools/specs.rs#L36-L96)).
- `tokens` / `validate` / `stats` return JSON objects or plain success strings; specialized rendering should handle string output gracefully ([rust/leanspec-mcp/src/tools/validation.rs](rust/leanspec-mcp/src/tools/validation.rs#L1-L132), [rust/leanspec-mcp/src/tools/board.rs](rust/leanspec-mcp/src/tools/board.rs#L40-L78)).
