---
status: complete
created: 2026-02-07
priority: high
tags:
- ui
- ux
- chat
- tool-call
depends_on:
- 318-tool-call-ui-optimization
parent: 094-ai-chatbot-web-integration
created_at: 2026-02-07T05:35:18.643170Z
updated_at: 2026-02-07T15:21:47.393294Z
completed_at: 2026-02-07T15:21:47.393294Z
transitions:
- status: in-progress
  at: 2026-02-07T15:11:21.849205Z
- status: complete
  at: 2026-02-07T15:21:47.393294Z
---

# Tool Call UI/UX Redesign

## Overview

Tool call rendering works (spec 318) but UX is poor: generic icon for all tools, raw tool names, no input/output tabs, JSON-only views, no execution timer. This spec adds tool-specific icons, AI-populated titles, tabbed input/output with UI/JSON toggle, and a duration badge.

## Design

### Key Decisions
1. **Icon registry**: Map tool names → Lucide icons. Follow the `PATTERNS` array pattern in `packages/ui/src/lib/sub-spec-utils.ts`. Known MCP tools: `search` → `SearchIcon`, `board` → `LayoutDashboardIcon`, `view` → `EyeIcon`, `list` → `ListIcon`, `create` → `PlusIcon`, `update` → `PencilIcon`, `validate` → `CheckCircle2Icon`, `tokens` → `CoinsIcon`, `stats` → `BarChart3Icon`, `relationships` → `GitBranchIcon`. Unknown tools → `WrenchIcon` fallback.
2. **AI title**: Accept optional `description` prop on `ToolHeader`. Fall back to humanized `toolName` (e.g., `read_file` → `Read File`). Humanization: split on `_`, `-`, camelCase; capitalize words.
3. **Input/Output tabs**: Use existing `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from `packages/ui/src/components/library/ui/tabs.tsx` (Radix-based, already exported via `@/library`). Default active tab: Output if available, Input otherwise.
4. **UI view for input**: Render input object as key-value pairs using a `<dl>` (definition list) styled component. Nested objects shown collapsed/inline.
5. **UI view for output**: Existing `ToolResultRegistry` specialized renderers serve as the "UI" view. Add JSON toggle alongside them.
6. **Duration timer**: Client-side only — capture `Date.now()` when tool part first enters `input-available` state via `useRef`. Live counter with `useEffect`+`setInterval(1s)` while running; snapshot when state changes to `output-*`. Format: `<1s` → `Xs` → `Xm Xs`. Note: AI SDK `ToolUIPart`/`DynamicToolUIPart` types have NO timing fields, so timing must be tracked in React state. For persisted messages (reloads), duration shows "—" unless backend adds timestamps later.

### Implementation Details

**New files:**
- `library/ai-elements/tool-icon-registry.ts` — icon map + `getToolIcon()` + `humanizeToolName()`
- `library/ai-elements/tool-duration.tsx` — live timer component
- `library/ai-elements/tool-input-ui-view.tsx` — key-value UI renderer

**Modified files:**
- `library/ai-elements/tool.tsx` — ToolHeader (icon, description, duration), ToolContent (tabs), ToolInput/ToolOutput (UI/JSON toggle)
- `chat/chat-message.tsx` — pass `description` prop from invocation metadata
- `locales/en/common.json` + `locales/zh-CN/common.json` — new i18n keys under `chat.toolExecution`

(All paths relative to `packages/ui/src/components/`)

## Plan

- [x] **Icon registry** — Create `packages/ui/src/components/library/ai-elements/tool-icon-registry.ts` with a `Record<string, LucideIcon>` mapping 10 MCP tools + fallback, export `getToolIcon(toolName): LucideIcon`
- [x] **Humanize tool name** — Add `humanizeToolName(name: string): string` utility (split `_`/`-`/camelCase, capitalize) in the same file or in `tool.tsx`
- [x] **ToolHeader icon + description** — Update `ToolHeader` in `tool.tsx`: add `description?: string` prop; replace hardcoded `WrenchIcon` with `getToolIcon(toolName)`; display `description ?? humanizeToolName(toolName)` as title
- [x] **ToolDuration component** — Create `tool-duration.tsx`: accepts `state: ToolPart['state']`, uses `useRef(Date.now())` to capture start time on mount; `useEffect`+`setInterval(1000)` for live counter when running; freezes on completion; renders as `<Badge>` with `ClockIcon`
- [x] **Wire ToolDuration into ToolHeader** — Render `<ToolDuration>` next to status badge; only show when state is `input-available`, `output-available`, `output-error`, or `output-denied`
- [x] **Tabs in ToolContent** — Refactor `ToolContent` children in `tool.tsx` to wrap `ToolInput`/`ToolOutput` in `<Tabs>` from `@/library`. Default tab: `output` when output exists, else `input`
- [x] **ToolInputUIView** — Create `tool-input-ui-view.tsx`: renders input as `<dl>` key-value list, handles nested objects with collapsible sections, strings/numbers/booleans rendered inline
- [x] **UI/JSON toggle for Input** — Add `useState<'ui'|'json'>('ui')` to `ToolInput`; render toggle buttons; switch between `ToolInputUIView` and existing `ToolCodeBlock`
- [x] **UI/JSON toggle for Output** — Add toggle to `ToolOutput`; "UI" shows existing specialized renderer (from `ToolResultRegistry`) or `ToolInputUIView` for unregistered tools; "JSON" shows `ToolCodeBlock`
- [x] **Wire description in ChatMessage** — In `chat-message.tsx`, extract `invocation.description` (if present) and pass as `description` prop to `ToolHeader` in both `renderToolInvocation` and `renderLegacyToolPart`
- [x] **i18n keys** — Add keys to `en/common.json` and `zh-CN/common.json`: tab labels (Input/Output), view toggle labels (UI/JSON), duration text
- [x] **Consistent styling** — Ensure Input and Output tab panels share identical container styling (padding, borders, bg) and that UI/JSON toggle buttons use the same `Button` variant

## Test

- [x] All 10 MCP tools display mapped icons; unknown tools show `WrenchIcon`
- [x] `description` renders as title; falls back to humanized `toolName`
- [x] Input/Output tabs work; Output active by default when available
- [x] UI/JSON toggle works on both tabs
- [x] Input UI view handles flat + nested objects
- [x] Duration badge: live timer while running, frozen on completion, omitted for persisted messages
- [x] Consistent styling between tab panels
- [x] No visual regression; i18n complete (en + zh-CN)

## Notes

### Related Specs
- Spec 318 (Tool Call UI Performance Optimization) — **complete**; this spec builds on its consolidated `Tool` component architecture
- Spec 094 (AI Chatbot Web Integration) — parent umbrella

### Key Files (verified)
- `packages/ui/src/components/library/ai-elements/tool.tsx` — `Tool`, `ToolHeader`, `ToolContent`, `ToolInput`, `ToolOutput`, `ToolCodeBlock` (main target)
- `packages/ui/src/components/chat/chat-message.tsx` — `renderToolInvocation`, `renderLegacyToolPart`, `mapToolState` (wiring layer)
- `packages/ui/src/components/chat/tool-result-registry.tsx` — `SearchResultView`, `BoardResultView`, `ViewResultView`, `JsonResultView` (existing UI renderers)
- `packages/ui/src/components/chat/tool-result-utils.ts` — `safeStringify`, `getTruncatedText`, `truncateLines`
- `packages/ui/src/components/library/ui/tabs.tsx` — Radix Tabs (reuse for Input/Output tabs)
- `packages/ui/src/lib/sub-spec-utils.ts` — existing keyword→icon pattern to follow for the icon registry
- `packages/ui/src/locales/en/common.json` (line ~286) — `chat.toolExecution` i18n namespace
- `packages/ui/src/locales/zh-CN/common.json` (line ~283) — Chinese translations

### Timer Design
- AI SDK tool parts have no timing fields; use client-side `useRef(Date.now())` on mount, `setInterval(1s)` while running, freeze on completion
- Persisted/reloaded messages: omit duration badge (no timing context)
- Format: `<1s` → `Xs` → `Xm Xs` (dedicated `formatElapsed(ms)` helper, not the date-level `formatDuration`)

### Dependencies (verified available, no new packages)
- `@radix-ui/react-tabs` — `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` in `library/ui/tabs.tsx`
- All planned Lucide icons already used elsewhere in codebase
- MCP tools: `search`, `board`, `view`, `list`, `create`, `update`, `validate`, `tokens`, `stats`, `relationships`