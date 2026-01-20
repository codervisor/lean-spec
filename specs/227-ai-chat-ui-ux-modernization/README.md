---
status: in-progress
created: 2026-01-20
priority: high
tags:
- ui
- ux
- chat
- ai
- frontend
created_at: 2026-01-20T01:53:50.707242729Z
updated_at: 2026-01-20T01:53:56.917574362Z
transitions:
- status: in-progress
  at: 2026-01-20T01:53:56.917574362Z
---

# AI Chat UI/UX Modernization

## Overview

The current AI chat interface needs significant UI/UX improvements to match modern AI chat applications like ChatGPT, Claude, and Cursor. While spec 094 handles the chat implementation and spec 223 handles persistence (SQLite via Rust backend), this spec focuses on creating a polished, mainstream user experience.

**Current Issues**:
- No persistent chat history sidebar for managing multiple conversations
- Basic model selector without provider context or visual hierarchy
- Tool calls displayed in raw technical format with minimal visual feedback
- No automatic title generation for conversations
- Missing modern features: message editing, regeneration, branching, markdown rendering quality, code syntax highlighting, etc.

**Goal**: Transform the chat interface from a basic proof-of-concept into a production-ready, delightful user experience that matches or exceeds industry standards.

## Design

### 1. Chat History Sidebar

**Features**:
- **Persistent Sidebar**: Collapsible left sidebar (280px default, collapsible to 60px icon-only)
- **Conversation List**: Grouped by time (Today, Yesterday, Last 7 Days, Older)
- **Search & Filter**: Search conversations by content, filter by date/model
- **Actions**: Rename, delete, archive, export conversations
- **New Chat Button**: Prominent "New Chat" button at top
- **Visual States**: Active state highlighting, hover states, unread indicators

**UI Components**:
```tsx
// Chat history structure (from spec 223)
interface ChatThread {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  model: { providerId: string; modelId: string };
  messageCount: number;
  preview: string; // First user message
}

<ChatSidebar>
  <NewChatButton />
  <SearchBar />
  <ConversationList>
    <TimeGroup label="Today">
      <ConversationItem 
        active={current}
        onSelect={handleSelect}
        onRename={handleRename}
        onDelete={handleDelete}
      />
    </TimeGroup>
  </ConversationList>
</ChatSidebar>
```

**Storage** (per spec 223):
- Uses Rust backend API with SQLite (`~/.leanspec/chat.db`)
- UI communicates via HTTP/REST API endpoints
- No browser storage (IndexedDB/localStorage)
- Backend handles: conversations, messages, metadata

### 2. Enhanced Model Selector

**Improvements**:
- **Visual Hierarchy**: Group by provider with logos (OpenAI, Anthropic, Deepseek)
- **Model Cards**: Show capabilities, context window, pricing tier
- **Quick Switch**: Dropdown in header + keyboard shortcut (Cmd/Ctrl + Shift + M)
- **Model Badges**: Visual indicators (Fast, Powerful, Cost-effective)
- **Availability Status**: Show which models are configured vs missing API keys

**UI Design**:
```tsx
<ModelSelector>
  <ProviderSection name="OpenAI" logo={<OpenAIIcon />}>
    <ModelCard
      id="gpt-4o"
      name="GPT-4o"
      badge="Powerful"
      contextWindow="128K tokens"
      configured={true}
    />
    <ModelCard
      id="gpt-4o-mini"
      name="GPT-4o Mini"
      badge="Fast & Cost-effective"
      contextWindow="128K tokens"
      configured={true}
    />
  </ProviderSection>
  <ProviderSection name="Anthropic" logo={<AnthropicIcon />}>
    <ModelCard
      id="claude-sonnet-4-5"
      name="Claude Sonnet 4.5"
      badge="Most Capable"
      contextWindow="200K tokens"
      configured={false}
      missingKey="ANTHROPIC_API_KEY"
    />
  </ProviderSection>
</ModelSelector>
```

**Settings Integration**:
- Quick config link: "Configure API Keys" → chat settings
- Show cost estimates per conversation
- Allow per-conversation model switching with history

### 3. Enhanced Tool Call Display

**Current**: Raw JSON dumps with minimal visual feedback  
**Target**: Rich, interactive tool execution visualization

**Design System**:
```tsx
<ToolExecution
  toolName="create_spec"
  status="running" | "success" | "error"
  duration={1200}
>
  <ToolHeader>
    <ToolIcon name="create_spec" />
    <ToolName>Creating Spec</ToolName>
    <StatusBadge status={status} />
  </ToolHeader>
  
  <ToolInput collapsed={true}>
    <SyntaxHighlighter language="json">
      {JSON.stringify(input, null, 2)}
    </SyntaxHighlighter>
  </ToolInput>
  
  <ToolOutput>
    {/* Formatted, not raw JSON */}
    <SpecCreated
      id="227"
      title="AI Chat UI/UX Modernization"
      status="planned"
    />
  </ToolOutput>
</ToolExecution>
```

**Features**:
- Collapsible input/output (collapsed by default)
- Syntax highlighting for JSON/code
- Status animations (spinner → checkmark/error)
- Execution time display
- Retry button on errors
- Smart formatting for common tools (spec creation shows card, search shows results list)

### 4. Automatic Title Generation

**Implementation**:
- Generate title after first user message + assistant response
- Use lightweight model (gpt-4o-mini) to keep costs low
- Prompt: "Generate a concise 3-5 word title for this conversation: [first exchange]"
- Fallback: Use first 50 chars of user message
- Allow manual editing with inline input

**Behavior**:
- Initial title: "New Chat" or "Untitled Conversation"
- After first exchange: Auto-generate in background
- Update sidebar immediately
- Show loading state: "Generating title..."

**API** (integrates with spec 223 backend):
```typescript
async function generateTitle(
  conversationId: string,
  messages: Message[]
): Promise<string> {
  const context = messages.slice(0, 2).map(m => m.content).join('\n');
  
  const response = await streamText({
    model: 'openai/gpt-4o-mini',
    messages: [{
      role: 'system',
      content: 'Generate a concise 3-5 word title for this conversation. Reply with title only.'
    }, {
      role: 'user',
      content: context
    }],
    maxTokens: 20,
  });
  
  const title = response.text.trim();
  
  // Update conversation title via Rust backend API
  await fetch(`${backendUrl}/api/chat/conversations/${conversationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  
  return title;
}
```

### 5. Modern Chat Features

**Message Actions**:
- Edit message (fork conversation)
- Regenerate response
- Copy message
- Copy as markdown
- Pin important messages
- Feedback (thumbs up/down)

**Enhanced Markdown**:
- Syntax highlighting for code blocks (Prism/Shiki)
- Math rendering (KaTeX for LaTeX)
- Mermaid diagrams
- Tables with proper styling
- Collapsible sections for long responses

**Input Enhancements**:
- Multiline support with Shift+Enter
- File attachments (for future context)
- Command palette: `/` for quick commands (/create, /search, /update)
- Auto-suggestions based on history
- Character/token counter

**Keyboard Shortcuts**:
- `Cmd/Ctrl + Enter`: Send message
- `Cmd/Ctrl + N`: New chat
- `Cmd/Ctrl + K`: Focus search
- `Cmd/Ctrl + Shift + M`: Model selector
- `Esc`: Close panels/modals

**Visual Polish**:
- Smooth animations (Framer Motion)
- Loading skeletons
- Empty states with helpful prompts
- Error states with recovery actions
- Toast notifications for background actions
- Accessibility (ARIA labels, keyboard nav, screen reader support)

### Technology Stack

**Core Libraries**:
- `react-markdown` + `remark-gfm` - Markdown rendering (already in use)
- `prism-react-renderer` or `shiki` - Code syntax highlighting
- `katex` - Math rendering
- `mermaid` - Diagram support
- `framer-motion` - Animations
- `@radix-ui/*` - Accessible primitives (already in ui-components)
- `sonner` - Toast notifications
- `cmdk` - Command palette

**Storage & State** (per spec 223):
- Rust backend API for all persistence (SQLite at `~/.leanspec/chat.db`)
- HTTP/REST communication with backend
- React Context for active conversation UI state
- Optimistic updates for better UX

## Plan

### Phase 1: Chat History Sidebar (2 days)
- [ ] Design sidebar layout and responsive behavior
- [ ] Integrate with Rust backend API (spec 223) for conversation loading
- [ ] Create `ChatSidebar` component with conversation list
- [ ] Add time-based grouping (Today, Yesterday, etc.)
- [ ] Implement search and filter functionality (client-side initially)
- [ ] Add conversation actions (rename, delete, archive) via backend API
- [ ] Add New Chat button and state management
- [ ] Implement collapse/expand animation

### Phase 2: Enhanced Model Selector (1 day)
- [ ] Create provider-grouped model selector UI
- [ ] Add provider logos and model badges
- [ ] Implement model card layout with metadata
- [ ] Show configuration status per model
- [ ] Add quick access keyboard shortcut
- [ ] Integrate with settings page
- [ ] Add cost estimation display

### Phase 3: Tool Call Visualization (2 days)
- [ ] Design tool execution component system
- [ ] Create status badges and icons for tools
- [ ] Implement collapsible input/output sections
- [ ] Add syntax highlighting for JSON/code
- [ ] Create custom formatters for common tools:
  - Spec creation → card view
  - Search results → list view
  - Validation → checklist view
- [ ] Add execution time tracking
- [ ] Implement retry mechanism for failed tools

### Phase 4: Title Generation (1 day)
- [ ] Implement title generation API endpoint
- [ ] Add background title generation after first exchange
- [ ] Update sidebar with generated titles
- [ ] Add inline editing for manual title changes
- [ ] Implement fallback for generation failures
- [ ] Add loading state in sidebar

### Phase 5: Modern Features (3 days)
- [ ] Message actions menu (edit, regenerate, copy, pin)
- [ ] Enhanced markdown rendering:
  - Integrate syntax highlighter (Shiki)
  - Add KaTeX for math
  - Add Mermaid diagram support
  - Style tables and lists
- [ ] Input improvements:
  - Command palette with `/` commands
  - Character/token counter
  - File attachment UI (placeholder)
- [ ] Keyboard shortcuts implementation
- [ ] Implement message branching for edits

### Phase 6: Polish & Animations (2 days)
- [ ] Add Framer Motion animations:
  - Sidebar expand/collapse
  - Message appear/disappear
  - Tool execution transitions
- [ ] Implement loading skeletons
- [ ] Design empty states with prompts
- [ ] Create error recovery flows
- [ ] Add toast notifications with `sonner`
- [ ] Accessibility audit and fixes

### Phase 7: i18n & Documentation (1 day)
- [ ] Add translations to locale files:
  - `packages/ui/src/locales/en/common.json`
  - `packages/ui/src/locales/zh-CN/common.json`
- [ ] Update chat documentation
- [ ] Add keyboard shortcuts help modal
- [ ] Create usage guide with examples
- [ ] Document all new features

## Test

### Manual Testing
- [ ] Chat history persists across sessions
- [ ] Sidebar search finds conversations
- [ ] Model selector shows correct state
- [ ] Tool calls display with proper formatting
- [ ] Titles generate automatically
- [ ] All keyboard shortcuts work
- [ ] Mobile responsive layout works
- [ ] Dark mode looks correct
- [ ] Animations are smooth (60fps)

### Automated Testing
- [ ] E2E tests for chat history CRUD (via backend API)
- [ ] Component tests for model selector
- [ ] Tool visualization rendering tests
- [ ] Title generation mocking and testing
- [ ] Keyboard shortcut integration tests
- [ ] Accessibility tests (axe-core)
- [ ] Backend API integration tests

### Performance
- [ ] Chat history loads instantly (<100ms via backend API)
- [ ] Sidebar search results appear <200ms
- [ ] No layout shifts during tool execution
- [ ] Smooth 60fps animations
- [ ] Backend API calls don't block UI (async/optimistic updates)

### Browser Support
- [ ] Chrome/Edge (latest 2 versions)
- [ ] Firefox (latest 2 versions)
- [ ] Safari (latest 2 versions)
- [ ] Mobile Safari (iOS 15+)
- [ ] Mobile Chrome (Android 10+)

## Notes

**Dependencies**:
- **Spec 094**: Chat implementation and tool system
- **Spec 223**: Chat persistence (Rust backend + SQLite) - CRITICAL dependency
- **Spec 224**: Chat configuration improvements (provider/model management)
- This spec focuses purely on UI/UX improvements
- Requires spec 223 backend API to be implemented first

**Storage Architecture** (per spec 223):
- UI communicates with Rust backend via HTTP/REST API
- Backend manages SQLite database at `~/.leanspec/chat.db`
- No browser storage (IndexedDB/localStorage) used
- See spec 223 for full persistence design

**Future Enhancements** (out of scope):
- Multi-modal support (image uploads)
- Voice input/output
- Collaborative chat (multi-user)
- Advanced analytics (token usage, cost tracking)
- Cloud sync (planned in spec 223 Phase 2)

**Design References**:
- ChatGPT web interface
- Claude.ai interface
- Cursor chat panel
- v0.dev chat
- Perplexity.ai interface