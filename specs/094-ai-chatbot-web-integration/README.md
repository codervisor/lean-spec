---
status: planned
created: '2025-11-17'
tags:
  - web
  - ai
  - ux
  - v0.3.0
priority: high
created_at: '2025-11-17T06:31:22.346Z'
related:
  - 082-web-realtime-sync-architecture
  - 081-web-app-ux-redesign
updated_at: '2025-11-17T06:32:59.775Z'
---

# AI Chatbot for Web UI

> **Status**: 🗓️ Planned · **Priority**: High · **Created**: 2025-11-17 · **Tags**: web, ai, ux, v0.3.0

**Project**: lean-spec  
**Team**: Core Development

## Overview

Add an AI chatbot to `@leanspec/web` that **transforms it from read-only to fully interactive**. Users can create, update, and manage specs through natural conversation - no CLI or IDE required.

**Core Value**: The web UI becomes a complete spec management tool accessible to everyone (not just developers with terminal access). Users can "talk to their specs" for all operations: viewing, creating, editing, and managing.

**Key Unlock**: Non-technical team members (PMs, designers, stakeholders) can now actively participate in spec-driven development, not just passively view specs.

## Problem

**The core gap**: `@leanspec/web` is currently **read-only**. Users can browse and view specs, but cannot create, update, or manage them without switching to CLI or VS Code.

**Current limitations**:
- ❌ **No spec creation** - Must drop to terminal: `lean-spec create ...`
- ❌ **No status updates** - Must use CLI: `lean-spec update 082 --status complete`
- ❌ **No metadata editing** - Can't change priority, tags, assignee from UI
- ❌ **No content editing** - Can't modify spec README or sub-specs
- ✅ **Read-only browsing** - Can view, search, filter (but that's it)

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

**Tech Stack** (as requested):
- **AI SDK** (`ai` package from Vercel) - Universal AI abstraction layer
- **AI UI Elements** (`@ai-sdk/ui-elements`) - Pre-built chat components
- **Backend**: Next.js API routes for LLM integration
- **Model**: OpenAI GPT-4o (recommended), with pluggable provider support

**Component Structure**:
```
packages/web/src/
├── components/
│   ├── chat/
│   │   ├── chatbot-button.tsx      # Floating action button
│   │   ├── chatbot-panel.tsx       # Slide-out chat panel
│   │   ├── chatbot-message.tsx     # Message bubbles
│   │   └── chatbot-context.tsx     # React context for chat state
│   └── ui/
│       └── ...existing shadcn components
├── app/api/
│   └── chat/
│       └── route.ts                # AI SDK streaming endpoint
└── lib/
    ├── ai/
    │   ├── tools.ts                # LeanSpec function tools
    │   ├── prompts.ts              # System prompts
    │   └── context.ts              # Context builders
    └── db/
        └── ...existing queries
```

### Chat UI/UX

**Placement**: Floating chat button (bottom-right corner, Material-style)
- **Icon**: MessageCircle or Bot icon from lucide-react
- **Badge**: Show unread count or typing indicator
- **Panel**: Slide-out from right (mobile: full-screen modal)

**Panel Design**:
- **Header**: Title ("LeanSpec Assistant"), minimize/close buttons
- **Messages**: Scrollable chat history with user/assistant bubbles
- **Input**: Text input with send button, multiline support
- **Actions**: Quick action chips (e.g., "Show all specs", "Create spec")
- **Context Indicator**: Show current page context (e.g., "Viewing: Spec 082")

### AI Capabilities

**Core Tools** (exposed via AI SDK function calling):

1. **`list_specs`** - List specs with filters (status, tags, priority)
2. **`search_specs`** - Search by keywords, return ranked results
3. **`get_spec`** - Get full spec details by ID/name
4. **`create_spec`** - Create new spec (guided multi-turn conversation)
5. **`update_spec_status`** - Update status (planned → in-progress → complete)
6. **`update_spec_metadata`** - Update priority, tags, assignee
7. **`get_dependencies`** - Show spec relationships (depends_on, related)
8. **`get_project_stats`** - Project health metrics, completion rates
9. **`get_blockers`** - Find specs blocking others

**Example Interactions**:

```
User: "What specs are in progress?"
AI: [calls list_specs(status="in-progress")]
    "There are 5 specs in progress:
    • 082-web-realtime-sync-architecture (critical)
    • 092-docs-site-submodule-migration (high)
    • 072-ai-agent-first-use-workflow (high)
    • 035-live-specs-showcase (high)
    • 093-spec-detail-ui-improvements (medium)"

User: "Show me spec 082"
AI: [calls get_spec(id=82)]
    "Spec 082 is about web realtime sync architecture...
    Status: In Progress | Priority: Critical
    [View Full Spec] button"

User: "Create a spec for API rate limiting"
AI: [initiates creation flow]
    "I'll help you create that spec. What's the main goal?"
User: "Prevent abuse by limiting requests per IP"
AI: "Got it. What priority level? (low/medium/high/critical)"
User: "High"
AI: [calls create_spec(...)]
    "Created spec 095-api-rate-limiting with high priority!"
```

### Context Awareness

**Page Context Injection**:
- **Home Page**: Show project stats, recent specs
- **Spec Detail**: Include current spec in context (pre-populate queries)
- **Board View**: Suggest workflow queries (blockers, completed today)

**Context Provider**:
```tsx
<ChatbotProvider initialContext={{ page: 'spec-detail', specId: 82 }}>
  {children}
</ChatbotProvider>
```

### System Prompt

**Core Instructions**:
- You are the LeanSpec Assistant, helping users manage specs
- Be concise and actionable - users want quick answers
- Always use tools to fetch real data (never make up spec IDs)
- When showing specs, include clickable links
- Guide users through multi-step actions (creating specs)
- Explain capabilities when users are unsure

**Context Economy**:
- Keep responses under 3 paragraphs for simple queries
- Use bullet points for lists
- Offer "Show more" for detailed info

## Plan

### Phase 1: Core Chat UI (Week 1)
- [ ] Install `ai` and `@ai-sdk/ui-elements` packages
- [ ] Create chat button + slide-out panel components
- [ ] Implement chat context provider
- [ ] Add basic message rendering (user/assistant bubbles)
- [ ] Style with Tailwind/shadcn design system

### Phase 2: AI Backend (Week 1-2)
- [ ] Set up Next.js API route (`/api/chat`)
- [ ] Integrate AI SDK with OpenAI provider
- [ ] Implement streaming responses
- [ ] Add environment variable for API keys
- [ ] Error handling and rate limiting

### Phase 3: Tool Implementation (Week 2)
- [ ] Define tools schema (list_specs, search_specs, etc.)
- [ ] Implement tool execution handlers
- [ ] Connect tools to existing DB queries
- [ ] Add tool result formatting (markdown, links)
- [ ] Test all tools individually

### Phase 4: Context & UX Polish (Week 3)
- [ ] Page context detection and injection
- [ ] Quick action chips for common queries
- [ ] Chat history persistence (localStorage)
- [ ] Mobile-responsive design
- [ ] Loading states and typing indicators

### Phase 5: Advanced Features (Week 3-4)
- [ ] Multi-turn spec creation flow
- [ ] Dependency graph visualization (inline in chat)
- [ ] Export chat history (markdown/JSON)
- [ ] Voice input support (optional, using Web Speech API)
- [ ] Suggested follow-up queries

### Phase 6: Testing & Docs (Week 4)
- [ ] E2E tests for chat interactions
- [ ] Tool execution tests
- [ ] Document API key setup
- [ ] Add usage guide to README
- [ ] Performance optimization (lazy loading, caching)

## Infrastructure Requirements

**Environment Variables**:
```env
OPENAI_API_KEY=sk-...          # OpenAI API key
AI_MODEL=gpt-4o                # Model to use
AI_TEMPERATURE=0.7             # Response creativity
```

**Optional**: Support other providers (Anthropic Claude, local models via Ollama)

**Rate Limiting**:
- Implement per-user rate limits (5 queries/min)
- Show rate limit status in UI
- Queue requests if rate limited

**Caching**:
- Cache tool results for 30 seconds (reduce redundant DB queries)
- Invalidate cache on spec updates

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

### Why ai-sdk?
- **Unified API**: Works with OpenAI, Anthropic, Mistral, etc.
- **Type-Safe**: Full TypeScript support
- **Streaming**: Built-in streaming responses
- **Function Calling**: Easy tool integration
- **React Hooks**: `useChat()` hook simplifies state management

### Why @ai-sdk/ui-elements?
- **Pre-built Components**: Chat UI out-of-the-box
- **Customizable**: Tailwind-compatible styling
- **Accessible**: WCAG-compliant components
- **Maintained**: Official Vercel package

### Alternative Considered: Custom MCP Integration
**Pros**: Reuse existing MCP server, full CLI parity
**Cons**: Complex setup, requires separate server, no web-native streaming
**Decision**: Use ai-sdk for web UI, keep MCP for CLI/desktop agents

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

**This transforms LeanSpec from "developer tool" to "team collaboration platform".**

### Security Considerations
- **API Key Storage**: Server-side only (never expose to client)
- **Input Sanitization**: Validate all user inputs before tool execution
- **Rate Limiting**: Prevent abuse via IP-based rate limits
- **Audit Logs**: Log all tool executions for debugging

### Future Enhancements (Post-MVP)
- **Multi-modal**: Upload images (spec diagrams) and analyze
- **Voice Mode**: Conversational voice interface
- **Team Chat**: Multi-user chat rooms for spec collaboration
- **AI Suggestions**: Proactive suggestions ("Spec 082 looks ready to complete")
- **Integration**: Connect to GitHub, Jira, Linear via AI SDK tools

### Open Questions
- **Model Choice**: Start with GPT-4o or try Claude 3.5 Sonnet?
  - Recommendation: GPT-4o (better function calling, faster)
- **Persistence**: Store chat history in DB or localStorage?
  - Recommendation: localStorage (simpler, privacy-friendly)
- **Auth**: Require login for chatbot access?
  - Recommendation: No (public demo), add later for private deployments
