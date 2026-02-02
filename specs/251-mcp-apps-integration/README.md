---
status: planned
created: 2026-01-29
priority: medium
tags:
- mcp
- ui
- integration
- feature
- interactive
- desktop
created_at: 2026-01-29T02:59:43.652456205Z
updated_at: 2026-02-02T08:12:51.476286256Z
---
# MCP Apps Integration for Interactive Spec UI

## Overview

Integrate MCP Apps (Model Context Protocol Apps) into LeanSpec to enable interactive HTML-based UI components that render directly in MCP hosts like Claude Desktop. This allows users to visualize specs, edit dependencies, view boards, and interact with spec data through rich interfaces without leaving their conversation context.

**Why MCP Apps?**
- Context preservation: Apps live inside the conversation, no tab switching
- Bidirectional data flow: UI can call LeanSpec tools and receive real-time updates
- Security: Sandboxed iframe prevents apps from accessing host data
- Rich interactions: Data visualizations, forms, dashboards directly in chat

**Use Cases for LeanSpec:**
- Interactive spec dependency graphs with drag-and-drop editing
- Visual board view (Kanban-style) for spec status management
- Rich spec analytics dashboards with filtering
- Inline spec editing with markdown preview
- Multi-select bulk operations UI

## Design

### Architecture

The MCP Apps extension works by combining MCP tools with UI resources:

1. **Tool with UI metadata**: Tools declare `_meta.ui.resourceUri` pointing to a `ui://` resource
2. **UI Resource handler**: Serves bundled HTML when host requests the resource
3. **Bidirectional communication**: App uses JSON-RPC over postMessage to call tools and receive updates

```
LeanSpec MCP Server
├── registerAppTool("spec-board", {..._meta.ui.resourceUri...})
├── registerAppResource("ui://specs/board.html", ...)
└── App (iframe) ↔ postMessage ↔ Host ↔ tools/call ↔ Server
```

### Implementation Pattern

**Server-side:**
- Use `@modelcontextprotocol/ext-apps` helpers for registration
- Bundle UI into single HTML file using Vite + vite-plugin-singlefile
- Serve UI resource with proper CSP and permissions

**UI-side:**
- Use `App` class from `@modelcontextprotocol/ext-apps` for host communication
- Implement tool result handlers for initial data push
- Call server tools proactively on user interactions
- Support multiple frameworks (React, Vue, vanilla JS)

### Security Model

Apps run in sandboxed iframes with:
- No access to parent DOM or cookies
- All communication via postMessage
- Host controls capability permissions
- CSP restricts external resource loading

## Plan

### Phase 1: Foundation & Setup
- [ ] Add `@modelcontextprotocol/ext-apps` dependency to MCP server
- [ ] Set up build pipeline for bundling UI to single HTML files
- [ ] Create base UI template with `App` class initialization
- [ ] Implement resource handler for serving `ui://` scheme resources

### Phase 2: Core Interactive Tools
- [ ] Create `spec-board` tool with interactive Kanban view
  - Display specs grouped by status
  - Drag-and-drop to change status
  - Click to open spec details
- [ ] Create `spec-graph` tool for dependency visualization
  - Visual graph of spec dependencies
  - Interactive node selection
  - Highlight dependency chains
- [ ] Create `spec-analytics` tool with charts
  - Status distribution pie chart
  - Velocity/throughput metrics
  - Priority breakdown

### Phase 3: Advanced Interactions
- [ ] Implement `spec-edit` tool for inline editing
  - Markdown editor with preview
  - Frontmatter form fields
  - Save changes back to file
- [ ] Implement `spec-bulk-ops` tool for multi-select actions
  - Checkbox selection across specs
  - Bulk status updates
  - Bulk tagging operations
- [ ] Add real-time updates when specs change

### Phase 4: Polish & Integration
- [ ] Add dark/light theme support matching host preference
- [ ] Implement responsive design for various iframe sizes
- [ ] Add loading states and error handling
- [ ] Create comprehensive example apps
- [ ] Document app development guide for contributors

### Phase 5: Host Compatibility
- [ ] Test with Claude Desktop
- [ ] Test with VS Code Insiders (MCP support)
- [ ] Test with Goose
- [ ] Document host-specific configuration

## Test

- [ ] Unit tests for app tool registration
- [ ] Unit tests for resource serving
- [ ] Integration tests for postMessage protocol
- [ ] Manual testing in Claude Desktop
- [ ] Verify sandbox security (no parent access)
- [ ] Test CSP policy enforcement
- [ ] Verify bidirectional tool calls work
- [ ] Test UI responsiveness at different sizes
- [ ] Verify theme adaptation works
- [ ] Test error handling and loading states

## Notes

**Reference Implementation:**
- MCP Apps examples: https://github.com/modelcontextprotocol/ext-apps/tree/main/examples
- API documentation: https://modelcontextprotocol.github.io/ext-apps/api/
- Specification: https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx

**Key Packages:**
- `@modelcontextprotocol/ext-apps` - Server helpers and client App class
- `vite-plugin-singlefile` - Bundle UI to single HTML

**Supported Hosts:**
- Claude (web) and Claude Desktop
- Visual Studio Code (Insiders)
- Goose
- Postman
- MCPJam

**Framework Options:**
UI can be built with any framework - examples provided for React, Vue, Svelte, Preact, Solid, and vanilla JS. For LeanSpec, React is recommended for consistency with existing web UI.

**Performance Considerations:**
- Bundle size should be minimized (<500KB ideal)
- Use code splitting for large apps
- Implement virtual scrolling for large spec lists
- Lazy load heavy visualizations

**Open Questions:**
1. Should we reuse existing `@leanspec/ui` components or build fresh?
2. How to handle authentication/authorization in apps?
3. Should apps support offline mode with sync?
4. What's the priority order for which apps to build first?
