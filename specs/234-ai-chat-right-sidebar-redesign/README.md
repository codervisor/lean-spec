---
status: complete
created: 2026-01-22
priority: high
tags:
- ui
- ux
- chat
- ai
- frontend
created_at: 2026-01-22T14:36:13.006972Z
updated_at: 2026-01-28T01:33:33.043699Z
---
# AI Chat Right Sidebar Redesign

## Overview

Redesign the AI chat interface to use a right sidebar pattern similar to GitHub Copilot in VS Code, replacing the current floating widget and dedicated chat page. This provides better integration with the main UI while maintaining focus on spec management.

**Current Problems**:
- **Floating widget** (`GlobalChatWidget.tsx`) appears in bottom-right corner, feels disconnected from main UI
- **Dedicated `/chat` page** takes users away from specs context
- **Poor integration** with spec detail view - users lose context when switching to chat
- **No persistent history** in widget - conversations disappear when closed
- **Awkward positioning** - bottom-right widget blocks spec content on smaller screens

**Proposed Solution**:
- **Right sidebar** that slides in/out, similar to GitHub Copilot or VS Code panel
- **Persistent across routes** - stays open when navigating between specs
- **Integrated chat history** - show conversation threads in collapsible list within sidebar
- **Context-aware** - can reference current spec in conversation
- **Remove `/chat` page** - all chat happens in sidebar
- **Better space usage** - 400-500px sidebar vs bottom-right widget

**Key Benefits**:
- Maintain spec context while chatting (no route changes)
- Better mobile experience (full-height sidebar)
- Consistent with modern AI coding assistant UX patterns
- More screen real estate for chat vs floating widget
- Easier to implement than current two-UI approach (widget + page)

## Design

### UI Layout

**Sidebar Specifications**:
- **Position**: Fixed right, full height
- **Width**: 400px default (resizable 300-600px with drag handle)
- **States**: Collapsed (icon-only, 48px) / Expanded (400px)
- **Backdrop**: Optional overlay when open on mobile (<768px)
- **Z-index**: Below modals (z-50), above content (z-40)
- **Transition**: Slide animation (300ms ease-in-out)

**Layout Structure**:
```tsx
<div className="flex h-screen">
  {/* Main content area */}
  <main className={cn(
    "flex-1 transition-all",
    chatOpen && "mr-[400px]" // Shift content when sidebar open
  )}>
    {children}
  </main>

  {/* Chat sidebar */}
  <ChatSidebar
    isOpen={chatOpen}
    onToggle={toggleChat}
    width={sidebarWidth}
    onResize={setSidebarWidth}
  />
</div>
```

**Responsive Behavior**:
- **Desktop (≥1024px)**: Sidebar pushes content, both visible
- **Tablet (768-1023px)**: Sidebar overlays content with backdrop
- **Mobile (<768px)**: Full-screen sidebar, hides main content

### Sidebar Components

**Header** (always visible when expanded):
```tsx
<SidebarHeader>
  <h2>AI Assistant</h2>
  <div className="actions">
    <NewChatButton />
    <ModelSelector />
    <SettingsButton />
    <CloseButton />
  </div>
</SidebarHeader>
```

**Chat History Section** (collapsible):
```tsx
<ChatHistory collapsed={!showHistory}>
  <SectionHeader
    title="Conversations"
    count={conversations.length}
    onToggle={toggleHistory}
  />
  <ConversationList>
    {conversations.map(conversation => (
      <ConversationItem
        key={conversation.id}
        conversation={conversation}
        active={conversation.id === activeConversation}
        onSelect={handleSelectConversation}
        onDelete={handleDeleteConversation}
      />
    ))}
  </ConversationList>
</ChatHistory>
```

**Active Chat Area** (main content):
```tsx
<ChatMessages className="flex-1 overflow-y-auto">
  {messages.map(msg => (
    <Message
      key={msg.id}
      content={msg.content}
      role={msg.role}
      timestamp={msg.timestamp}
    />
  ))}
</ChatMessages>

<ChatInput
  onSubmit={handleSendMessage}
  isLoading={isLoading}
  placeholder="Ask about specs..."
/>
```

### Chat History UI Design

Since we're removing the dedicated chat page, history must be accessible within the sidebar:

**Collapsible History Panel**:
- **Default state**: Collapsed, showing only active conversation
- **Expand button**: At top of sidebar, shows conversation count badge
- **Collapsed view**: 
  - Current conversation title
  - Model badge
  - Message count
- **Expanded view**:
  - Grouped by time (Today, Yesterday, Last 7 Days, Older)
  - Search bar at top
  - Conversation preview (title + first message snippet)
  - Actions: rename, delete via context menu

**Behavior**:
- **Auto-collapse** when sending first message (focus on conversation)
- **Persist state** in localStorage: `leanspec.chat.historyExpanded`
- **Keyboard shortcut**: `Cmd/Ctrl + Shift + H` to toggle history
- **Smooth animation**: 200ms slide up/down

**Visual Design**:
```tsx
<div className="border-b">
  <button
    onClick={toggleHistory}
    className="w-full px-4 py-2 flex items-center justify-between hover:bg-muted"
  >
    <div className="flex items-center gap-2">
      <History className="h-4 w-4" />
      <span className="text-sm font-medium">Conversations</span>
      <Badge variant="secondary">{conversations.length}</Badge>
    </div>
    <ChevronDown className={cn(
      "h-4 w-4 transition-transform",
      historyExpanded && "rotate-180"
    )} />
  </button>

  {historyExpanded && (
    <div className="max-h-[300px] overflow-y-auto">
      <SearchInput placeholder="Search conversations..." />
      <ConversationList>
        {/* Conversation items */}
      </ConversationList>
    </div>
  )}
</div>
```

### State Management

**Global Chat Context**:
```tsx
interface ChatContext {
  isOpen: boolean;
  sidebarWidth: number;
  activeConversationId: string | null;
  conversations: Conversation[];
  showHistory: boolean;
  
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  selectConversation: (id: string) => void;
  createConversation: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  toggleHistory: () => void;
}

<ChatProvider>
  <App />
</ChatProvider>
```

**Persistence**:
- `leanspec.chat.sidebarOpen` (boolean)
- `leanspec.chat.sidebarWidth` (number, 300-600)
- `leanspec.chat.historyExpanded` (boolean)
- `leanspec.chat.activeConversationId` (string | null)

### Removing Chat Page

**Changes Required**:
1. **Delete route**: Remove `/projects/:projectId/chat` and `/chat` routes
2. **Remove components**: Delete `ChatPage.tsx` and related page-level components
3. **Redirect legacy URLs**: `/chat` → redirect to last active spec, open sidebar
4. **Update navigation**: Remove "Chat" from main menu/sidebar
5. **Settings page**: Keep `/chat/settings` accessible via sidebar settings button

**Migration Strategy**:
- Keep chat settings page as separate route (needed for API key configuration)
- Sidebar settings button navigates to settings page, sidebar stays open
- Settings page has "Back to Chat" button that returns to previous route + opens sidebar

### Keyboard Shortcuts

**New Shortcuts**:
- `Cmd/Ctrl + Shift + I`: Toggle AI chat sidebar
- `Cmd/Ctrl + Shift + H`: Toggle chat history (when sidebar open)
- `Cmd/Ctrl + N`: New chat (when sidebar open)
- `Esc`: Close sidebar (when focused)
- `Cmd/Ctrl + /`: Focus chat input (when sidebar open)

**Shortcuts Menu**:
Add keyboard shortcuts help modal (`?` key) listing all shortcuts

### Integration with Spec Detail View

**Context Passing**:
When sidebar is open on a spec detail page, chat can access spec context:

```tsx
// In ChatSidebar component
const { specId } = useParams();
const spec = useSpec(specId);

const systemMessage = useMemo(() => {
  if (spec) {
    return `Current context: Viewing spec ${spec.number}-${spec.name}. User may reference "this spec" or "current spec".`;
  }
  return null;
}, [spec]);

// Pass to chat hook
const { messages, sendMessage } = useLeanSpecChat({
  // ...
  systemMessage,
});
```

**Quick Actions**:
Add context menu in spec detail view:
- "Ask AI about this spec"
- "Generate implementation plan"
- "Review checklist items"

These actions open sidebar and pre-fill input with relevant prompt.

### Mobile Experience

**Full-screen Overlay**:
- Sidebar takes full screen width on mobile
- Backdrop overlay dims main content
- Swipe gesture to close (right → left)
- Header shows "Back" button instead of close icon

**Responsive Breakpoints**:
```tsx
const isMobile = useMediaQuery('(max-width: 767px)');
const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
const isDesktop = useMediaQuery('(min-width: 1024px)');
```

### Technical Implementation

**Component Structure**:
```
packages/ui/src/components/chat/
├── ChatSidebar.tsx              # Main sidebar container
├── ChatHeader.tsx               # Header with controls
├── ChatHistory.tsx              # Collapsible history panel
├── ChatMessages.tsx             # Message list
├── ChatInput.tsx                # Message input area
├── ChatMessage.tsx              # Individual message (displays message.parts)
├── ResizeHandle.tsx             # Drag handle for width
├── ConversationList.tsx         # History conversation list
├── ConversationItem.tsx         # Single conversation in list
└── index.ts                     # Exports

packages/ui/src/contexts/
└── ChatContext.tsx              # Global chat state

packages/ui/src/components/
└── GlobalChatWidget.tsx         # DELETE - replaced by sidebar
```

**Dependencies** (use existing):
- `@leanspec/ui-components` - Button, Card, Input, etc.
- `framer-motion` - Animations
- `react-router-dom` - Navigation
- `lucide-react` - Icons
- `usehooks-ts` - useMediaQuery, useLocalStorage

**No New Dependencies Required** ✅

### Accessibility

**Requirements**:
- Sidebar announces state changes via `aria-live`
- Focus trap when sidebar open on mobile
- Keyboard navigation for all actions
- Screen reader announces message count, thread titles
- Color contrast meets WCAG AA standards
- Reduced motion support (`prefers-reduced-motion`)

## Plan

### Phase 1: Core Sidebar Structure (2 days)
- [ ] Create `ChatSidebar` component with slide animation
- [ ] Implement `ChatContext` for global state management
- [ ] Add resize handle with drag functionality (300-600px)
- [ ] Responsive layout: desktop (push content), mobile (overlay)
- [ ] Persist sidebar state (open/closed, width) to localStorage
- [ ] Add keyboard shortcut: `Cmd/Ctrl + Shift + I` to toggle

### Phase 2: Chat History Integration (2 days)
- [ ] Create collapsible `ChatHistory` component
- [ ] Implement conversation list with time-based grouping
- [ ] Add search functionality for conversations
- [ ] Conversation context menu: rename, delete
- [ ] New chat button and conversation creation flow
- [ ] Active conversation highlighting and selection
- [ ] Persist history expanded state to localStorage

### Phase 3: Chat Message Area (1 day)
- [ ] Move `ChatMessages` and `ChatInput` into sidebar layout
- [ ] Update message rendering for narrower width (400px)
- [ ] Adjust tool call display for sidebar constraints
- [ ] Implement auto-scroll to latest message
- [ ] Loading states and error handling
- [ ] Integrate with existing `useLeanSpecChat` hook

### Phase 4: Remove Chat Page (1 day)
- [ ] Delete `/chat` route and `ChatPage.tsx`
- [ ] Remove chat navigation items from menus
- [ ] Add redirect: `/chat` → last spec + open sidebar
- [ ] Keep `/chat/settings` route, update navigation
- [ ] Update links to chat settings (open from sidebar)
- [ ] Clean up unused components

### Phase 5: Spec Context Integration (1 day)
- [ ] Pass current spec context to chat when on spec detail page
- [ ] Add "Ask AI" quick actions in spec detail view
- [ ] Pre-fill chat input with context-aware prompts
- [ ] Update system message with spec context
- [ ] Test context passing and AI responses

### Phase 6: Mobile & Responsive (1 day)
- [ ] Full-screen sidebar on mobile (<768px)
- [ ] Backdrop overlay for tablet/mobile
- [ ] Swipe gesture to close on mobile
- [ ] Touch-friendly controls (larger tap targets)
- [ ] Test on iOS Safari and Android Chrome

### Phase 7: Polish & Accessibility (1 day)
- [ ] Smooth animations with Framer Motion
- [ ] Keyboard shortcuts implementation
- [ ] Focus trap on mobile when sidebar open
- [ ] ARIA labels and announcements
- [ ] Reduced motion support
- [ ] Color contrast audit
- [ ] Screen reader testing

### Phase 8: Testing & Documentation (1 day)
- [ ] E2E tests: open/close sidebar, create thread, send message
- [ ] Component tests: resize handle, history collapse
- [ ] Responsive layout tests (desktop/tablet/mobile)
- [ ] Accessibility tests with axe-core
- [ ] Update documentation: sidebar usage, keyboard shortcuts
- [ ] Add keyboard shortcuts help modal
- [ ] Performance testing: sidebar doesn't block UI

## Test

### Manual Testing
- [ ] Sidebar opens/closes smoothly on all devices
- [ ] Resize handle works (300-600px range)
- [ ] Chat history expands/collapses without jank
- [ ] Conversation selection works correctly
- [ ] Messages display properly in 400px width (including message parts)
- [ ] Mobile full-screen mode works
- [ ] Keyboard shortcuts all functional
- [ ] Settings page still accessible
- [ ] Spec context passed to AI correctly

### Automated Testing
- [ ] E2E: Complete chat workflow (open → new conversation → send → close)
- [ ] Component: Sidebar state management
- [ ] Component: Resize handle constraints
- [ ] Component: History collapse animation
- [ ] Component: Message parts rendering (text, tool calls, etc.)
- [ ] Accessibility: Focus trap, ARIA labels, keyboard nav
- [ ] Responsive: Layout changes at breakpoints
- [ ] Performance: No layout shifts or reflows

### Browser Support
- [ ] Chrome/Edge (latest 2 versions)
- [ ] Firefox (latest 2 versions)
- [ ] Safari (latest 2 versions)
- [ ] Mobile Safari (iOS 15+)
- [ ] Mobile Chrome (Android 10+)

### Success Criteria
- ✅ Chat feels integrated, not separate
- ✅ No route changes when opening chat
- ✅ History accessible without cluttering UI
- ✅ Mobile experience is smooth and intuitive
- ✅ Keyboard shortcuts work for power users
- ✅ Spec context enhances AI responses
- ✅ Performance: 60fps animations, no jank

## Notes

**Design Inspiration**:
- **GitHub Copilot** in VS Code - right sidebar pattern
- **Cursor AI** - integrated chat panel
- **Linear** - collapsible command menu + sidebar
- **Slack** - resizable sidebar with threads

**Dependencies**:
- **Spec 094**: AI chatbot implementation (tool system)
- **Spec 223**: Chat persistence (SQLite backend)
- **Spec 227**: UI/UX modernization (this builds on top)
- This spec **replaces** floating widget and chat page
- Chat history design from spec 227 adapted for sidebar
Terminology Alignment**:
Following Vercel AI SDK conventions:
- **Conversation/Chat**: A collection of messages (not "thread" or "session")
- **Message**: A single exchange with role (user/assistant/system) and parts
- **Part**: Component of a message (text, tool-call, tool-result, etc.)

**
**Future Enhancements** (out of scope):
- Split view: chat + spec side-by-side
- Pinned conversations in sidebar
- Multi-chat tabs within sidebar
- Chat export/import functionality
- Voice input/output

**Migration Path**:
1. Build sidebar alongside existing widget (feature flag)
2. Test with subset of users
3. Migrate all users to sidebar
4. Remove widget code in next release

**Performance Considerations**:
- Lazy load chat components (code splitting)
- Virtual scrolling for long conversations
- Debounce resize events
- Memoize expensive computations
- Use CSS transforms for animations (GPU acceleration)