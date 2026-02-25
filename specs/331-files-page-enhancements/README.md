---
status: complete
created: 2026-02-24
priority: high
tags:
- ui
- files
- ux
created_at: 2026-02-24T15:58:57.965048Z
updated_at: 2026-02-25T06:48:19.053227Z
---
# Files Page Enhancements

## Overview

Improve the `/files` page to be more VS Code-like with four key features:

1. **File search** - Filter files in explorer + find-in-file for code
2. **Sticky line numbers** - Line numbers fixed to left during horizontal scroll
3. **Material-style file icons** - Distinct icons per file type (like VS Code Material Icons)
4. **File tabs** - VS Code-style tab bar for open files

## Issues

- Cannot search/filter files in the explorer tree
- Line numbers scroll away on horizontal scroll
- All files use a generic `FileText` icon (only color varies)
- No tab management — only one file can be viewed with no history/navigation

## Implementation Plan

### 1. File Search (FileExplorer)
- Add search input in the explorer header (magnifying glass icon + input)
- Flatten the tree and filter by name/path match
- Clear button when search is active
- Highlight matched filename segments

### 2. Sticky Line Numbers (CodeViewer)
- Wrap `<pre>` in overflow-x: auto container
- Apply `position: sticky; left: 0; z-index: 1; background: inherit` to LineNumber span
- Ensure background matches code area theme

### 3. Material-Style File Icons (FileExplorer)
- Replace single `FileText` with per-extension icon components
- Use distinct Lucide icon variants + colors:
  - `.ts/.tsx` → Code2, blue-500
  - `.js/.jsx/.mjs` → Code2, yellow-400
  - `.rs` → custom (Cpu/Zap), orange-500
  - `.py` → Code, green-500
  - `.json` → Braces, purple-400
  - `.yaml/.yml/.toml` → FileSliders, purple-400
  - `.md/.mdx` → FileText, sky-400
  - `.css/.scss` → Paintbrush2, pink-400
  - `.html/.svg` → Globe, orange-400
  - `.go` → Code2, cyan-500
  - `.sh/.bash` → Terminal, muted-foreground
  - default → File, muted-foreground

### 4. File Tabs (FilesPage + CodeViewer)
- State: `openTabs: OpenTab[]` where `OpenTab = { path: string; fileName: string }`
- When a file is selected, add to tabs (or activate existing)
- Tab bar rendered above code viewer area
- Active tab highlighted (border-bottom accent)
- X button per tab to close
- Overflow scrolls horizontally
- Tabs show file name + icon; tooltip shows full path
