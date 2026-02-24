---
status: complete
created: 2026-01-28
priority: medium
tags:
- ui
- feature
- ai-agents
- code-viewing
- dx
created_at: 2026-01-28T11:25:25.130174Z
updated_at: 2026-02-24T07:16:13.654610Z
completed_at: 2026-02-24T07:16:13.654610Z
transitions:
- status: in-progress
  at: 2026-02-24T06:47:55.870128Z
- status: complete
  at: 2026-02-24T07:16:13.654610Z
---

# Codebase File Viewing in @leanspec/ui

## Overview

**Problem**: Currently, `@leanspec/ui` only displays spec files. Developers and AI agents need to view actual source code to understand the codebase context, but must switch to external editors like VSCode to do so.

**Solution**: Add lightweight code file viewing to the UI, enabling developers and AI agents to browse and read source files directly within `@leanspec/ui` without needing a full IDE.

**Why Now**: With AI agents increasingly using the UI for context gathering, the ability to view code files alongside specs provides complete project visibility in one place.

## Design

### Scope

**In Scope**:
- Browse project file tree (respecting `.gitignore`)
- View source code files with syntax highlighting
- Basic file navigation (click to open, breadcrumb)
- Search/filter files by name
- Support common code file extensions

**Out of Scope**:
- Code editing (read-only viewing only)
- Full IDE features (debugging, terminal, etc.)
- File creation/deletion
- Git operations

### Architecture

The UI already has a Rust HTTP server backend. We'll extend it with file browsing capabilities:

```
@leanspec/ui (Vite SPA)
  ↓ HTTP API
Rust HTTP Server
  ↓ filesystem
Read code files
```

### API Extensions

New endpoints for the Rust HTTP server:

**List Directory Contents**:
```
GET /api/projects/:id/files?path=src/components
Response: {
  "path": "src/components",
  "entries": [
    { "name": "Button.tsx", "type": "file", "size": 1200 },
    { "name": "Input", "type": "directory" }
  ]
}
```

**Read File Content**:
```
GET /api/projects/:id/file?path=src/components/Button.tsx
Response: {
  "path": "src/components/Button.tsx",
  "content": "...",
  "language": "typescript",
  "size": 1200
}
```

### UI Components

**File Explorer Panel**:
- Tree view of project files
- Collapsible directories
- File icons by extension
- Keyboard navigation support

**Code Viewer** (Monaco Editor):
- Monaco Editor for VS Code-like experience
- Syntax highlighting for 50+ languages
- Line numbers and minimap
- Code folding and bracket matching
- Find in file (Ctrl+F)
- Read-only mode (no editing)
- Breadcrumb navigation
- Copy file path button
- Jump to line (Ctrl+G)

**Navigation**:
- "Files" tab alongside "Specs" tab
- Split view: file tree on left, content on right
- Deep linking: `/project/:id/files/:path`

### File Type Support

Phase 1 - Common Languages:
- TypeScript/JavaScript (ts, tsx, js, jsx)
- Rust (rs)
- Python (py)
- JSON, YAML, TOML, Markdown

Phase 2 - Extended Support:
- Go, Java, C/C++, Ruby, etc.
- Configuration files (.env, .gitignore)

## Plan

### Phase 1: Backend API (Week 1)

- [ ] Add `file_list` endpoint to Rust HTTP server
- [ ] Add `file_read` endpoint with size limits (e.g., max 1MB)
- [ ] Respect `.gitignore` patterns when listing files
- [ ] Add security: prevent path traversal (no `../`)
- [ ] Add language detection utility

### Phase 2: Frontend UI (Week 2)

- [ ] Create `FileExplorer` component with tree view
- [ ] Integrate Monaco Editor (`@monaco-editor/react`) for code viewing
- [ ] Configure Monaco for read-only mode with optimal performance
- [ ] Add "Files" tab to project view
- [ ] Implement file tree state management
- [ ] Add breadcrumb navigation

### Phase 3: Integration & Polish (Week 3)

- [ ] Wire up API calls to UI components
- [ ] Add file search/filter input
- [ ] Add keyboard shortcuts (Cmd+O to open file, Esc to close)
- [ ] Handle binary files gracefully (show "Binary file" message)
- [ ] Add loading states and error handling

## Test

- [ ] Can browse any project's file tree
- [ ] Can open and view TypeScript files with syntax highlighting
- [ ] Can open and view Rust files with syntax highlighting
- [ ] `.gitignore` patterns are respected (node_modules not shown)
- [ ] Path traversal attempts are blocked (`../../../etc/passwd`)
- [ ] Files >1MB show "File too large" message
- [ ] Binary files show appropriate message
- [ ] File search filters tree correctly
- [ ] Deep linking works: refresh preserves open file

## Notes

**Security Considerations**:
- Always validate and sanitize file paths
- Never allow reading outside project root
- Respect `.gitignore` to avoid exposing sensitive files
- Size limits prevent memory issues with large files

**Performance**:
- Lazy load directory contents (expand on click)
- Debounce file search input
- Use virtual scrolling for large directories

**Future Possibilities**:
- Jump to definition from spec references
- Show git blame annotations
- Inline code snippets in spec views
- Cross-reference: click spec tag to view referenced code

**Monaco Editor Considerations**:
- Use `@monaco-editor/react` for React integration
- Load Monaco from CDN (vs bundled) to reduce bundle size
- Lazy load editor component only when viewing files
- Configure worker paths for Vite compatibility
- Theme: match UI light/dark mode preference

**Related Specs**:
- [184](../184-ui-packages-consolidation/): Unified UI Architecture
- [186](../186-rust-http-server/): Rust HTTP Server (adds these endpoints)
