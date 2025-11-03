---
status: complete
created: '2025-11-03'
tags:
  - cli
  - enhancement
  - ux
  - viewer
priority: high
completed: '2025-11-03'
---

# Spec Viewer Commands

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-03 · **Tags**: cli, enhancement, ux, viewer

**Project**: lean-spec  
**Team**: Core Development

## Overview

Add new `lspec` commands for viewing and reading spec details with rich rendering capabilities. Users currently need to manually open spec files in their editor or navigate to the specs directory. This spec introduces commands to view spec content directly in the terminal with proper markdown rendering, making it easier to quickly read and reference specs without leaving the command line.

**Why now?** As LeanSpec grows, users need quick ways to view spec content. This is foundational for:
- MCP server integration (spec 033) - needs to expose spec content to AI agents
- Better CLI UX - completes the workflow of discover → view → edit
- AI agent workflows - agents need to read specs before taking action

## Design

**New Commands:**

### `lspec show <spec-name>`
Display full spec content with rendered markdown in the terminal.

```bash
lspec show api-redesign
lspec show 015-npm-publishing  # Also support spec number
```

**Features:**
- Render markdown with syntax highlighting (headers, lists, code blocks)
- Preserve frontmatter display in readable format
- Support terminal hyperlinks for cross-references
- Gracefully degrade for non-interactive terminals
- Show spec metadata (status, priority, tags) at top

**Implementation:**
- Use `marked-terminal` or `ink-markdown` for rendering
- Parse frontmatter and display separately from content
- Auto-detect terminal capabilities (colors, hyperlinks)
- Handle long content with pagination (optional `--no-pager` flag)

### `lspec view <spec-name>` (alias)
Shorter alias for `lspec show` for convenience.

### `lspec read <spec-name>` (raw mode)
Output raw markdown content without rendering (useful for piping, AI consumption, scripting).

```bash
lspec read api-redesign
lspec read 015-npm-publishing | grep "TODO"
```

**Output Options:**
- `--format=markdown` (default) - raw markdown
- `--format=json` - structured JSON with frontmatter and content separated
- `--frontmatter-only` - only output frontmatter as JSON

### `lspec open <spec-name>`
Open spec in default editor or specified editor.

```bash
lspec open api-redesign
lspec open api-redesign --editor=code  # Open in VS Code
```

**Technical Approach:**

1. **Markdown Rendering:**
   - Add `marked-terminal` for terminal markdown rendering
   - Configure syntax highlighting for code blocks
   - Handle edge cases (wide terminals, small terminals, no-color mode)

2. **Content Resolution:**
   - Reuse existing spec loader logic
   - Support spec name, full path, or spec number as input
   - Handle README.md vs spec.md file naming

3. **Output Formatting:**
   - Separate frontmatter rendering from content
   - Add color-coded status badges
   - Support `--no-color` flag for CI/scripting

4. **Pagination:**
   - Auto-detect if content exceeds terminal height
   - Use system pager (`less`, `more`) if available
   - Support `--no-pager` to disable

5. **Integration Points:**
   - Export `readSpec()` utility for MCP server reuse
   - Ensure JSON format matches MCP resource schema
   - Add to help/docs as recommended workflow

## Plan

- [ ] Add `marked-terminal` dependency
- [ ] Implement `lspec show` command with markdown rendering
- [ ] Add frontmatter display formatting
- [ ] Implement `lspec read` command for raw/JSON output
- [ ] Add `lspec view` alias
- [ ] Implement `lspec open` command with editor detection
- [ ] Add pagination support for long content
- [ ] Add terminal capability detection (colors, hyperlinks)
- [ ] Write unit tests for rendering logic
- [ ] Write integration tests for all commands
- [ ] Update CLI help and documentation
- [ ] Add examples to README

## Test

- [ ] `lspec show` renders markdown correctly in terminal
- [ ] Frontmatter displays with proper formatting
- [ ] Code blocks have syntax highlighting
- [ ] Long specs trigger pagination (unless --no-pager)
- [ ] `lspec read` outputs raw markdown
- [ ] `lspec read --format=json` outputs valid JSON
- [ ] `lspec read --frontmatter-only` outputs frontmatter only
- [ ] `lspec open` opens spec in default editor
- [ ] `lspec open --editor=<cmd>` uses specified editor
- [ ] Commands work with spec name, number, or path
- [ ] Graceful error for non-existent specs
- [ ] Works in non-interactive terminals (CI)
- [ ] Respects `--no-color` flag
- [ ] Terminal hyperlinks work for supported terminals

## Notes

**Dependencies:**
- Related to spec 033 (MCP Server) - `read` command output should match MCP resource format
- Complements spec 006 (PM Visualization) - different view modes for different contexts

**Markdown Rendering Libraries Considered:**
- `marked-terminal` - Battle-tested, good terminal rendering
- `ink-markdown` - React-based, heavier but more features
- `terminal-markdown` - Lighter but less maintained

**Decision:** Start with `marked-terminal` for simplicity and reliability.

**Editor Detection:**
- Check `$EDITOR`, `$VISUAL` environment variables
- Fall back to `open` (macOS), `xdg-open` (Linux), `start` (Windows)
- Allow override with `--editor` flag or config setting

**Future Enhancements:**
- Interactive mode with search/filter
- Spec-to-spec navigation (jump to dependencies)
- Diff mode (`lspec show <spec> --diff`) to see changes
- Export to PDF/HTML for sharing

**MCP Integration Notes:**
The `lspec read --format=json` output should align with the MCP resource schema:
```json
{
  "name": "spec-name",
  "path": "/path/to/spec",
  "frontmatter": {...},
  "content": "...",
  "sections": [...]
}
```
