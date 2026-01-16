---
status: planned
created: 2025-11-17
priority: high
tags:
- web
- ai
- ux
- v0.3.0
depends_on:
- 187-vite-spa-migration
created_at: 2025-11-17T06:31:22.346Z
updated_at: 2026-01-16T07:23:35.249214Z
---

# AI Chatbot for Web UI

> **Status**: 🗓️ Planned · **Priority**: High · **Created**: 2025-11-17 · **Tags**: web, ai, ux, v0.3.0

**Project**: lean-spec  
**Team**: Core Development

## Overview

Add an **AI agentic system** to `@leanspec/ui` (Vite SPA) that uses AI SDK tools to manage specs conversationally. Users can create, update, search, and orchestrate specs through natural language - no CLI or terminal required.

**Core Value**: Transform the web UI into a fully interactive spec management platform powered by AI tools. The chatbot acts as an **intelligent agent** that executes LeanSpec operations (create, update, search, link, validate) and basic utilities (web search, calculations) through function calling.

**Key Unlock**: 
- **Developers**: Manage specs without leaving the browser
- **Non-technical users**: Participate in SDD workflow through conversation
- **Everyone**: AI handles complex operations (dependency graphs, bulk updates, validation)

## Problem

**The core gap**: `@leanspec/ui` is currently **partially interactive**. Users can browse and view specs, edit some metadata, but cannot create specs or perform complex operations without switching to CLI or VS Code.

**Current limitations** (as of UI Vite SPA):
- ❌ **No spec creation** - Must drop to terminal: `lean-spec create ...`
- ❌ **No status updates via chat** - Must use CLI: `lean-spec update 082 --status complete`
- ✅ **Metadata editing** - Can change priority, tags via UI (added in spec 187)
- ❌ **No content editing** - Can't modify spec README or sub-specs
- ✅ **Interactive browsing** - Can view, search, filter, edit metadata

**The bigger problem**: Write operations are **locked behind developer tools**:
- Non-technical users (PMs, designers) can't participate
- Requires context switch (browser → terminal → IDE → back to browser)
- Mobile users completely blocked from management tasks
- No path for casual contributors

**User Pain Points**:
- "I'm viewing spec 082 - can I mark it complete?" → No, need terminal
- "Let me create a spec for API rate limiting..." → Can't, need CLI
- "This spec's priority should be high" → Can't change it here
- "I want to update the description" → Must edit file in IDE

**The solution**: AI chatbot makes web UI **fully interactive** through natural conversation - no CLI, no IDE required.

## Goals

1. **Enable Write Operations**: Make web UI fully interactive (create, update, delete specs)
2. **Democratize Access**: Allow non-developers to manage specs (no CLI/IDE required)
3. **Conversational UX**: Natural language interface for all operations
4. **Maintain Context Economy**: Chatbot enforces LeanSpec principles (token limits, validation)
5. **Progressive Enhancement**: Chat is optional - traditional UI still works for viewing

## Design

### Architecture

**Tech Stack**:
- **AI SDK** v6 (`ai`, `@ai-sdk/react` from Vercel) - Universal AI abstraction layer with streaming
- **AI Elements** - Pre-built shadcn-based chat components (`ai-elements` package)
- **Zod** - Schema validation for tool inputs
- **Backend**: Rust HTTP server with `/api/chat` route handler
- **Model**: GPT-4o (via AI Gateway or provider API key), Claude Sonnet 4.5, or Deepseek R1
- **Transport**: Server-sent events (SSE) for streaming responses

**Component Structure**:
```
packages/ui/src/
├── components/
│   ├── ai-elements/                # From `npx ai-elements@latest`
│   │   ├── conversation.tsx        # <Conversation>, <ConversationContent>
│   │   ├── message.tsx             # <Message>, <MessageContent>, <MessageActions>
│   │   ├── prompt-input.tsx        # <PromptInput>, <PromptInputTextarea>
│   │   ├── reasoning.tsx           # <Reasoning> (streaming thought process)
│   │   ├── sources.tsx             # <Sources> (citations/references)
│   │   ├── loader.tsx              # <Loader> (typing indicator)
│   │   └── tool.tsx                # <Tool> (tool execution display)
│   ├── chat/
│   │   ├── chat-page.tsx           # Main chat interface (floating or fullscreen)
│   │   └── chat-button.tsx         # Floating action button trigger
│   └── ...existing components
└── lib/
    ├── ai/
    │   ├── tools/
    │   │   ├── leanspec-tools.ts   # Spec management tools (create, update, search)
    │   │   ├── basic-tools.ts      # Utility tools (calculator, web search)
    │   │   └── index.ts            # Tool registry
    │   └── prompts.ts              # System prompts
    └── api.ts                      # HTTP client

rust/leanspec-http/src/
├── handlers/
│   └── chat.rs                     # POST /api/chat - streaming route
└── routes.rs                       # Route registration
```

### Chat UI/UX (AI Elements)

**Core Components** (from `ai-elements`):

1. **`<Conversation>`** - Chat container with scroll management
   - `<ConversationContent>` - Message list
   - `<ConversationScrollButton>` - Auto-scroll to bottom

2. **`<Message>`** - Message bubble (user/assistant)
   - `<MessageContent>` - Text/structured content
   - `<MessageActions>` - Copy, retry, thumbs up/down
   - `<MessageResponse>` - Streaming text response

3. **`<PromptInput>`** - Rich input with attachments
   - `<PromptInputTextarea>` - Multiline text input
   - `<PromptInputButton>` - Action buttons (web search, etc.)
   - `<PromptInputSelect>` - Model picker dropdown
   - `<PromptInputActionMenu>` - Attachment menu
   - `<PromptInputSubmit>` - Send button with status indicator

4. **`<Reasoning>`** - Collapsible thinking process (like Claude's thinking)
   - `<ReasoningTrigger>` - "Thought for X seconds" button
   - `<ReasoningContent>` - Streamed reasoning text

5. **`<Sources>`** - Citations/references
   - `<SourcesTrigger>` - "Used X sources" button
   - `<SourcesContent>` - URL list

6. **`<Tool>`** - Tool execution display
   - Shows tool name, input, status, output
   - Real-time execution feedback

**Placement Options**:
- **Option A**: Dedicated `/chat` route (full-page)
- **Option B**: Floating button → slide-out panel (like Intercom)
- **Recommendation**: Start with Option A (simpler), add Option B later

### AI Tools (Function Calling)

**Tool Definition Pattern** (using AI SDK `tool()` helper):

```typescript
import { tool } from 'ai';
import { z } from 'zod';

// LeanSpec Tool Example
export const listSpecsTool = tool({
  description: 'List specs with optional filters by status, priority, or tags',
  inputSchema: z.object({
    status: z.enum(['planned', 'in-progress', 'complete', 'archived']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    tags: z.array(z.string()).optional(),
  }),
  execute: async ({ status, priority, tags }) => {
    const response = await fetch('/api/specs?' + new URLSearchParams({
      ...(status && { status }),
      ...(priority && { priority }),
      ...(tags && { tags: tags.join(',') }),
    }));
    const specs = await response.json();
    return {
      count: specs.length,
      specs: specs.map(s => ({
        id: s.id,
        name: s.name,
        title: s.title,
        status: s.status,
        priority: s.priority,
      })),
    };
  },
});
```

**LeanSpec Tools** (`leanspec-tools.ts`):

1. **`list_specs`** - List specs with filters
   ```typescript
   inputSchema: z.object({
     status: z.enum(['planned', 'in-progress', 'complete', 'archived']).optional(),
     priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
     tags: z.array(z.string()).optional(),
   })
   ```

2. **`search_specs`** - Semantic search across specs
   ```typescript
   inputSchema: z.object({
     query: z.string().describe('Search keywords'),
     limit: z.number().default(10),
   })
   ```

3. **`get_spec`** - Get full spec by ID/name
   ```typescript
   inputSchema: z.object({
     spec: z.string().describe('Spec ID (number) or name (kebab-case)'),
   })
   ```

4. **`create_spec`** - Create new spec
   ```typescript
   inputSchema: z.object({
     name: z.string().describe('Kebab-case name (e.g., "api-rate-limiting")'),
     title: z.string(),
     priority: z.enum(['low', 'medium', 'high', 'critical']),
     tags: z.array(z.string()).optional(),
     content: z.string().describe('Markdown content (Overview, Design, Plan sections)'),
   })
   ```

5. **`update_spec`** - Update spec metadata
   ```typescript
   inputSchema: z.object({
     spec: z.string(),
     status: z.enum(['planned', 'in-progress', 'complete', 'archived']).optional(),
     priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
     addTags: z.array(z.string()).optional(),
     removeTags: z.array(z.string()).optional(),
   })
   ```

6. **`link_specs`** - Create dependency
   ```typescript
   inputSchema: z.object({
     spec: z.string(),
     dependsOn: z.array(z.string()),
   })
   ```

7. **`get_dependencies`** - Show dependency graph
   ```typescript
   inputSchema: z.object({
     spec: z.string(),
     depth: z.number().default(3),
   })
   ```

8. **`get_stats`** - Project statistics
   ```typescript
   inputSchema: z.object({}) // no parameters
   ```

9. **`validate_spec`** - Validate spec structure
   ```typescript
   inputSchema: z.object({
     spec: z.string().optional(), // if omitted, validates all
   })
   ```

**Basic Tools** (`basic-tools.ts`):

1. **`calculator`** - Perform calculations
   ```typescript
   inputSchema: z.object({
     expression: z.string().describe('Math expression (e.g., "2 + 2")'),
   })
   ```

2. **`web_search`** - Search the web (via Perplexity or Tavily)
   ```typescript
   inputSchema: z.object({
     query: z.string(),
   })
   ```

**Tool Registry** (`index.ts`):
```typescript
export const allTools = {
  // LeanSpec tools
  list_specs: listSpecsTool,
  search_specs: searchSpecsTool,
  get_spec: getSpecTool,
  create_spec: createSpecTool,
  update_spec: updateSpecTool,
  link_specs: linkSpecsTool,
  get_dependencies: getDependenciesTool,
  get_stats: getStatsTool,
  validate_spec: validateSpecTool,
  
  // Basic tools
  calculator: calculatorTool,
  web_search: webSearchTool,
};
```

### Multi-Step Agentic Behavior

**Enable Multi-Step Tool Calls** (from AI SDK docs):

```typescript
import { generateText, stepCountIs } from 'ai';

const result = await generateText({
  model: 'openai/gpt-4o',
  tools: allTools,
  stopWhen: stepCountIs(10), // Allow up to 10 reasoning steps
  prompt: userMessage,
  
  // Multi-step callback
  onStepFinish({ text, toolCalls, toolResults, finishReason, usage }) {
    console.log('Step completed:', { toolCalls, finishReason });
    // Can save intermediate steps, track usage, etc.
  },
});
```

**Example Multi-Step Flow**:
```
User: "Create a spec for API rate limiting with high priority and add it as a dependency to spec 082"

→ Step 1: AI calls create_spec({ name: "api-rate-limiting", priority: "high", ... })
  Result: { id: 95, name: "095-api-rate-limiting" }

→ Step 2: AI calls link_specs({ spec: "082", dependsOn: ["095"] })
  Result: { success: true }

→ Step 3: AI generates final response:
  "Created spec 095-api-rate-limiting with high priority and linked it as a dependency to spec 082."
```

**Context Injection** (via `experimental_context`):

```typescript
const result = await generateText({
  // ...
  experimental_context: {
    currentPage: 'spec-detail',
    currentSpec: { id: 82, name: '082-web-realtime-sync' },
    userRole: 'developer',
  },
  tools: {
    myTool: tool({
      execute: async (input, { experimental_context }) => {
        const context = experimental_context as { currentSpec: { id: number } };
        // Use context in tool execution
      },
    }),
  },
});
```

### System Prompt

```typescript
const systemPrompt = `You are the LeanSpec Assistant, an AI agent that helps users manage software specifications.

Your capabilities:
- List, search, and view specs using the available tools
- Create new specs with proper structure (Overview, Design, Plan, Test sections)
- Update spec metadata (status, priority, tags)
- Link specs to create dependencies
- Validate specs for quality issues
- Provide project statistics and insights

Guidelines:
1. Always use tools to fetch real data - never make up spec IDs or content
2. For multi-step operations, break them down clearly (e.g., create then link)
3. When creating specs, ensure they follow LeanSpec principles:
   - Keep under 2,000 tokens (optimal) or 3,500 tokens (max)
   - Include required sections: Overview, Design, Plan, Test
   - Use kebab-case names (e.g., "api-rate-limiting")
4. Be concise - users want actionable answers, not long explanations
5. When showing lists, format as markdown bullets with key info
6. If a task requires multiple steps, explain what you'll do before executing

Context economy: Keep responses focused and structured.`;
```

## Plan

### Phase 1: Setup & UI Scaffolding (Week 1)
- [ ] Install dependencies: `pnpm add ai @ai-sdk/react zod`
- [ ] Install AI Elements: `npx ai-elements@latest` (installs shadcn components)
- [ ] Configure `.env.local` with `AI_GATEWAY_API_KEY` or provider keys
- [ ] Create `/chat` route in Vite SPA router
- [ ] Build basic chat page using AI Elements:
  - `<Conversation>` container
  - `<Message>` components for rendering
  - `<PromptInput>` for user input
  - `<Loader>` for typing indicator
- [ ] Test basic UI rendering (no AI yet)

### Phase 2: Backend Route Handler (Week 1-2)
- [ ] Create Rust HTTP endpoint: `POST /api/chat` in `leanspec-http`
- [ ] Implement streaming SSE response using `axum::response::sse::Event`
- [ ] Forward requests to AI SDK (via Node.js sidecar OR direct OpenAI API calls)
- [ ] **Decision Point**: 
  - **Option A**: Call OpenAI API directly from Rust (using `reqwest`)
  - **Option B**: Proxy to Node.js server running AI SDK (simplifies tool integration)
  - **Recommendation**: Start with Option B (AI SDK's streaming + tool calling is battle-tested)
- [ ] Add environment variable handling for API keys
- [ ] Test streaming text responses (no tools yet)

### Phase 3: Tool Implementation (Week 2)
- [ ] Create `lib/ai/tools/` directory structure
- [ ] Implement LeanSpec tools:
  - `list_specs` - Query database, return formatted list
  - `search_specs` - Use existing search endpoint
  - `get_spec` - Fetch spec by ID/name
  - `create_spec` - POST to `/api/specs`
  - `update_spec` - PATCH metadata
  - `link_specs` - Update `depends_on`
  - `get_dependencies` - Traverse dependency graph
  - `get_stats` - Aggregate project metrics
  - `validate_spec` - Run validation checks
- [ ] Implement basic tools:
  - `calculator` - `eval()` with safe guards
  - `web_search` - Integrate Tavily or Perplexity API
- [ ] Create tool registry (`index.ts`) exporting all tools
- [ ] Test each tool individually via `/api/chat`

### Phase 4: Multi-Step Agent Integration (Week 2-3)
- [ ] Integrate `streamText` with `stopWhen: stepCountIs(10)`
- [ ] Connect tool registry to AI SDK:
  ```typescript
  streamText({
    model: 'openai/gpt-4o',
    tools: allTools,
    stopWhen: stepCountIs(10),
    system: systemPrompt,
    messages: convertToModelMessages(messages),
  })
  ```
- [ ] Implement `onStepFinish` for logging/debugging
- [ ] Add `<Tool>` component to show tool executions in UI
- [ ] Test multi-step flows:
  - Create spec → link to another spec
  - Search → get details → update status
  - List → filter → validate
- [ ] Add error handling for tool failures

### Phase 5: UX Polish & Advanced Features (Week 3-4)
- [ ] Add `<Reasoning>` component for thought process streaming
- [ ] Implement model picker (`<PromptInputSelect>`)
  - GPT-4o, Claude Sonnet 4.5, Deepseek R1
- [ ] Add quick action buttons:
  - "Show all specs"
  - "What's in progress?"
  - "Create new spec"
- [ ] Chat history persistence (localStorage)
- [ ] Message actions: copy, retry, thumbs up/down
- [ ] Mobile-responsive layout
- [ ] Page context injection:
  - Detect current route (`/`, `/spec/:id`, `/board`)
  - Include context in system prompt
- [ ] Add `<Sources>` component for citations (future: link to specs)

### Phase 6: Testing & Documentation (Week 4)
- [ ] Write integration tests for tool execution
- [ ] E2E tests using Playwright:
  - User sends message → AI responds
  - Tool is called → result appears
  - Multi-step flow completes
- [ ] Load testing: 100 concurrent chat sessions
- [ ] Document setup in README:
  - Environment variables (API keys)
  - Model selection guide
  - Tool usage examples
- [ ] Add user guide to docs site:
  - "Getting Started with AI Chat"
  - "What Can the AI Do?"
  - "Best Practices for Prompting"
- [ ] Performance optimization:
  - Lazy load AI Elements components
  - Cache tool results (30s TTL)
  - Debounce typing indicators

## Infrastructure Requirements

**Environment Variables**:
```env
# Option 1: AI Gateway (recommended, $5/month free tier)
AI_GATEWAY_API_KEY=ag_...          # Get from: https://vercel.com/ai-gateway

# Option 2: Direct Provider Keys
OPENAI_API_KEY=sk-...              # OpenAI GPT-4o
ANTHROPIC_API_KEY=sk-ant-...       # Claude Sonnet 4.5
DEEPSEEK_API_KEY=...               # Deepseek R1

# Optional: Web Search (for basic tools)
TAVILY_API_KEY=tvly-...            # https://tavily.com
PERPLEXITY_API_KEY=pplx-...        # https://perplexity.ai

# Model Selection
DEFAULT_MODEL=openai/gpt-4o        # or anthropic/claude-sonnet-4.5
MAX_STEPS=10                        # Multi-step limit
```

**AI Gateway Benefits**:
- Unified API for all providers (OpenAI, Anthropic, Deepseek)
- $5/month free tier covers development
- No need to manage multiple API keys
- Built-in rate limiting and caching

**Model Recommendations**:
| Model             | Best For                        | Cost (per 1M tokens)       |
| ----------------- | ------------------------------- | -------------------------- |
| GPT-4o            | General use, fast responses     | $2.50 input / $10 output   |
| Claude Sonnet 4.5 | Complex reasoning, long context | $3 input / $15 output      |
| Deepseek R1       | Coding tasks, cost-effective    | $0.55 input / $2.19 output |

**Rate Limiting** (implement in Rust handler):
- Per-user: 10 messages/minute
- Per-IP: 30 messages/minute
- Tool execution timeout: 30 seconds
- Response streaming: 60 seconds max

**Caching Strategy**:
- Tool results: 30 seconds TTL (reduce redundant DB queries)
- Spec metadata: 1 minute TTL
- Project stats: 5 minutes TTL
- Invalidate on spec updates (via event bus)

## Test

### Manual Testing
- [ ] User can open/close chat panel
- [ ] Chat persists across page navigation
- [ ] All tools execute correctly
- [ ] Streaming responses work (no latency spikes)
- [ ] Mobile UI is usable (no layout breaks)

### Automated Testing
- [ ] Unit tests for tool handlers
- [ ] Integration tests for API route
- [ ] E2E tests for common queries:
  - "List all specs"
  - "Show spec 082"
  - "Create a spec"
  - "What's blocking v0.3?"

### Performance Testing
- [ ] Response time <2s for simple queries
- [ ] Streaming starts within 500ms
- [ ] No memory leaks in long chat sessions
- [ ] Chat panel loads without blocking main UI

### Success Criteria
- ✅ Users can complete all spec CRUD operations via chat
- ✅ Chat feels "instant" (streaming UX)
- ✅ 80%+ accuracy on natural language queries
- ✅ No crashes or errors in 100-message chat session

## Notes

### Implementation Example: Frontend Chat Page

```tsx
// packages/ui/src/pages/chat.tsx
import { useChat } from '@ai-sdk/react';
import { Conversation, ConversationContent } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { PromptInput, PromptInputTextarea, PromptInputSubmit } from '@/components/ai-elements/prompt-input';
import { Tool } from '@/components/ai-elements/tool';
import { Loader } from '@/components/ai-elements/loader';

export default function ChatPage() {
  const { messages, input, setInput, sendMessage, status } = useChat({
    api: '/api/chat',
  });

  return (
    <div className="h-screen flex flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.map(message => (
            <div key={message.id}>
              {message.parts.map((part, i) => {
                switch (part.type) {
                  case 'text':
                    return (
                      <Message from={message.role}>
                        <MessageContent>
                          <MessageResponse>{part.text}</MessageResponse>
                        </MessageContent>
                      </Message>
                    );
                  case 'tool-call':
                    return <Tool name={part.toolName} input={part.input} />;
                  case 'tool-result':
                    return <Tool name={part.toolName} output={part.output} />;
                }
              })}
            </div>
          ))}
          {status === 'submitted' && <Loader />}
        </ConversationContent>
      </Conversation>

      <PromptInput onSubmit={msg => sendMessage(msg)}>
        <PromptInputTextarea value={input} onChange={e => setInput(e.target.value)} />
        <PromptInputSubmit status={status} />
      </PromptInput>
    </div>
  );
}
```

### Implementation Example: Backend Route Handler

```typescript
// Rust handler calls Node.js sidecar (or implement in Rust directly)
// Node.js sidecar example:

import { streamText } from 'ai';
import { allTools } from './tools';

export async function POST(req: Request) {
  const { messages, model = 'openai/gpt-4o' } = await req.json();

  const result = streamText({
    model,
    tools: allTools,
    stopWhen: stepCountIs(10),
    system: systemPrompt,
    messages: convertToModelMessages(messages),
    
    onStepFinish({ toolCalls, toolResults }) {
      console.log('Step:', toolCalls.map(t => t.toolName));
    },
  });

  return result.toTextStreamResponse();
}
```

### Why AI SDK v6?
- **Unified API**: Works with OpenAI, Anthropic, Deepseek, Mistral, etc.
- **Type-Safe**: Full TypeScript inference for tools
- **Streaming**: Built-in SSE streaming with `toTextStreamResponse()`
- **Function Calling**: Native multi-step tool execution
- **React Hooks**: `useChat()` simplifies state management
- **Battle-Tested**: Used by v0.dev, Cursor, and many production apps

### Why AI Elements?
- **Pre-built Components**: `<Conversation>`, `<Message>`, `<PromptInput>` out-of-the-box
- **shadcn-based**: Customizable, accessible, well-documented
- **Streaming UX**: Built-in loading states, typing indicators
- **Tool Display**: `<Tool>` component shows execution in real-time
- **Official Patterns**: Best practices from Vercel AI SDK team

### Architecture Decision: Rust vs Node.js for AI SDK

**Option A: Node.js Sidecar** (Recommended)
- **Pros**: 
  - AI SDK is Node.js-first (streaming, tool calling just work)
  - Fast iteration (no Rust compilation)
  - Access to entire `ai` ecosystem
- **Cons**: 
  - Additional process to manage
  - Slightly higher latency (IPC overhead)

**Option B: Rust Direct Integration**
- **Pros**: 
  - Single binary (simpler deployment)
  - Lower latency (no IPC)
- **Cons**: 
  - Must implement streaming, tool calling, message conversion manually
  - Provider APIs are not uniform (OpenAI ≠ Anthropic)
  - Slower development velocity

**Decision**: Start with **Option A** (Node.js sidecar). The AI SDK's abstractions save weeks of development time. Can optimize to Rust later if latency becomes an issue.

### Tool Execution Patterns

**Pattern 1: Simple Query**
```
User: "How many specs are in progress?"
→ list_specs({ status: 'in-progress' })
→ "There are 5 specs in progress: [list]"
```

**Pattern 2: Multi-Step Creation**
```
User: "Create a spec for API caching and link it to spec 082"
→ Step 1: create_spec({ name: 'api-caching', ... })
→ Step 2: link_specs({ spec: '082', dependsOn: ['096'] })
→ "Created spec 096-api-caching and linked to spec 082"
```

**Pattern 3: Search + Update**
```
User: "Find the API rate limiting spec and mark it complete"
→ Step 1: search_specs({ query: 'API rate limiting' })
→ Step 2: update_spec({ spec: '095', status: 'complete' })
→ "Marked spec 095-api-rate-limiting as complete"
```

**Pattern 4: Complex Analysis**
```
User: "What specs are blocking v0.3 release?"
→ Step 1: search_specs({ query: 'v0.3', tags: ['v0.3.0'] })
→ Step 2: get_dependencies({ spec: 'each-v0.3-spec' })
→ Step 3: list_specs({ status: 'planned' }) [filter by deps]
→ "3 specs are blocking v0.3: [list with dependency chains]"
```

### Why This Matters: Breaking the Developer-Only Lock-In

**Current state** (pre-chatbot):
- ✅ Developers with IDE/CLI can do everything
- ❌ Everyone else is **locked out** of write operations
- ❌ Web UI is a "view-only spectator mode"

**After chatbot**:
- ✅ **Anyone can manage specs** from web browser
- ✅ Mobile users can create/update specs
- ✅ PMs can update status during standup (no CLI needed)
- ✅ Designers can create specs for UI work
- ✅ Stakeholders can participate in SDD workflow
- ✅ **AI handles complexity**: dependency graphs, validation, bulk operations

**This transforms LeanSpec from "developer tool" to "team collaboration platform powered by AI".**

### Complete Code Example: Backend Implementation

**Node.js Sidecar** (`packages/chat-server/src/index.ts`):

```typescript
import express from 'express';
import { streamText, tool, stepCountIs, convertToModelMessages } from 'ai';
import { z } from 'zod';

const app = express();
app.use(express.json());

// LeanSpec Tools
const listSpecsTool = tool({
  description: 'List specs with optional filters by status, priority, or tags',
  inputSchema: z.object({
    status: z.enum(['planned', 'in-progress', 'complete', 'archived']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    tags: z.array(z.string()).optional(),
  }),
  execute: async (input) => {
    // Call Rust HTTP server's REST API
    const params = new URLSearchParams();
    if (input.status) params.set('status', input.status);
    if (input.priority) params.set('priority', input.priority);
    if (input.tags) params.set('tags', input.tags.join(','));
    
    const res = await fetch(`http://localhost:3030/api/specs?${params}`);
    const specs = await res.json();
    
    return {
      count: specs.length,
      specs: specs.map(s => ({
        id: s.id,
        name: s.name,
        title: s.title,
        status: s.status,
        priority: s.priority,
      })),
    };
  },
});

const createSpecTool = tool({
  description: 'Create a new spec',
  inputSchema: z.object({
    name: z.string().describe('Kebab-case name'),
    title: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    tags: z.array(z.string()).optional(),
    content: z.string().describe('Markdown content'),
  }),
  execute: async (input) => {
    const res = await fetch('http://localhost:3030/api/specs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return await res.json();
  },
});

// ... other tools

const allTools = {
  list_specs: listSpecsTool,
  create_spec: createSpecTool,
  // ... rest of tools
};

app.post('/api/chat', async (req, res) => {
  const { messages, model = 'openai/gpt-4o' } = req.body;

  const result = streamText({
    model,
    tools: allTools,
    stopWhen: stepCountIs(10),
    system: `You are the LeanSpec Assistant...`,
    messages: convertToModelMessages(messages),
    
    onStepFinish({ toolCalls }) {
      console.log('Tools used:', toolCalls.map(t => t.toolName));
    },
  });

  // Stream to client
  const stream = result.toTextStreamResponse();
  stream.body.pipeTo(res);
});

app.listen(3031, () => console.log('Chat server on :3031'));
```

**Rust Proxy Handler** (`rust/leanspec-http/src/handlers/chat.rs`):

```rust
use axum::{Json, response::sse::{Event, Sse}, extract::State};
use futures::stream::Stream;
use reqwest::Client;

pub async fn chat_handler(
    State(client): State<Client>,
    Json(payload): Json<ChatRequest>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    // Forward to Node.js sidecar
    let response = client
        .post("http://localhost:3031/api/chat")
        .json(&payload)
        .send()
        .await
        .unwrap();
    
    // Stream response back to client
    let stream = response.bytes_stream().map(|chunk| {
        Ok(Event::default().data(chunk.unwrap()))
    });
    
    Sse::new(stream)
}
```

### Security Considerations
- **API Key Storage**: Server-side only (never expose in client bundle)
- **Input Sanitization**: Zod schemas validate all tool inputs
- **Rate Limiting**: Per-user and per-IP limits (prevent abuse)
- **Tool Permissions**: Future: require auth for destructive operations (delete, archive)
- **Audit Logs**: Log all tool executions to database for debugging/compliance
- **CORS**: Restrict `/api/chat` to same-origin (or whitelist domains)

### Cost Management
- **Model Selection**: Default to GPT-4o ($2.50/1M tokens input)
- **Context Trimming**: Keep conversation history under 10 messages (compress older messages)
- **Tool Result Compression**: Return only essential data (e.g., spec summaries, not full content)
- **Caching**: Use AI SDK's caching to reduce redundant LLM calls
- **Budget Alert**: Set daily spend limit in AI Gateway ($10/day cap)

### Future Enhancements (Post-MVP)
- **Voice Mode**: Real-time voice conversation (using Web Speech API + Deepgram)
- **Multi-modal**: Upload diagrams/screenshots → analyze with vision models
- **Team Collaboration**: Multi-user chat rooms, @mentions
- **Proactive Suggestions**: "Spec 082 has all checklist items complete - ready to mark done?"
- **Integration Tools**: 
  - GitHub: Create issues, PRs from specs
  - Jira: Sync spec status with tickets
  - Slack: Post spec updates to channels
- **Custom Tools**: User-defined tools (MCP server integration)
- **Memory**: Long-term context (RAG over all past conversations)
- **Spec Templates**: AI suggests templates based on spec type

### Open Questions & Decisions Needed

1. **Backend Architecture**: Node.js sidecar vs Rust direct?
   - **Recommendation**: Node.js sidecar (faster development, AI SDK native)
   - **Action**: Prototype both, measure latency difference

2. **Model Selection**: Which default model?
   - **Options**: GPT-4o (fast, reliable), Claude Sonnet 4.5 (better reasoning), Deepseek R1 (cheap)
   - **Recommendation**: GPT-4o for initial launch, add model picker later

3. **UI Placement**: Full-page `/chat` vs floating button?
   - **Recommendation**: Start with `/chat` route (simpler), add floating button in Phase 5
   - **Mobile**: Full-screen modal on mobile

4. **Tool Permissions**: Which tools require authentication?
   - **Public** (no auth): list, search, get, stats, validate
   - **Authenticated** (future): create, update, delete, link
   - **Action**: Launch with all tools public (demo mode), add auth in v0.3.1

5. **Web Search Integration**: Which provider?
   - **Options**: Tavily ($49/mo), Perplexity API, or use `perplexity/sonar` model (built-in)
   - **Recommendation**: Use `perplexity/sonar` model for web search queries (no extra API key)

6. **Chat History Persistence**: localStorage or database?
   - **Recommendation**: localStorage for MVP (privacy-first, no DB changes)
   - **Future**: Optional cloud sync (authenticated users)

7. **Context Injection**: How much page context to include?
   - **Recommendation**: Include current spec ID (if on detail page), user role, timestamp
   - **Avoid**: Don't send full spec content (context bloat)
