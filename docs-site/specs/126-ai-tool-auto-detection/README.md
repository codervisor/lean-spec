---
status: complete
created: '2025-11-26'
tags:
  - init
  - dx
  - ai-agents
  - ux
priority: medium
created_at: '2025-11-26T09:07:33.931Z'
updated_at: '2025-11-26T09:10:19.683Z'
transitions:
  - status: in-progress
    at: '2025-11-26T09:07:38.105Z'
completed: '2025-11-26'
---

# AI Tool Auto-Detection for Init

> **Status**: ✅ Complete · **Priority**: Medium · **Created**: 2025-11-26 · **Tags**: init, dx, ai-agents, ux

**Project**: lean-spec  
**Team**: Core Development

## Overview

Auto-detection of installed AI CLI tools during `lean-spec init` to pre-select relevant options in the AI tools prompt. Improves UX by showing users which tools were detected and why.

### Detection Methods

| Method | Description | Example |
|--------|-------------|---------|
| Commands | Check if CLI command exists in PATH | `claude`, `gemini`, `cursor` |
| Config Dirs | Check for config directories in home | `~/.claude`, `~/.cursor` |
| Env Vars | Check for API key environment variables | `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` |
| Extensions | Check for VS Code extensions installed | `github.copilot`, `github.copilot-chat` |

### User Experience

When running `lean-spec init`, users now see:

```
🔍 Detected AI tools:
   Claude Code / Claude Desktop (CLAUDE.md)
      └─ ~/.claude directory found
   GitHub Copilot (AGENTS.md - default)
      └─ github.copilot extension installed
      └─ github.copilot-chat extension installed

? Which AI tools do you use?
❯◉ Claude Code / Claude Desktop (CLAUDE.md)
 ◯ Gemini CLI (GEMINI.md)
 ◉ GitHub Copilot (AGENTS.md - default)
```

Detected tools are pre-selected, reducing manual configuration.

## Design

### Detection Configuration

Each AI tool in `AI_TOOL_CONFIGS` now has an optional `detection` property:

```typescript
interface AIToolConfig {
  file: string;
  description: string;
  default: boolean;
  usesSymlink: boolean;
  detection?: {
    commands?: string[];     // CLI commands to check
    configDirs?: string[];   // Config directories in ~
    envVars?: string[];      // Environment variables
    extensions?: string[];   // VS Code extension IDs
  };
}
```

### Detection Logic

1. **Commands**: Uses `which` (Unix) or `where` (Windows) to check PATH
2. **Config Dirs**: Checks for directories in `$HOME`
3. **Env Vars**: Simple `process.env` check
4. **Extensions**: Scans `~/.vscode/extensions` for extension folders

### Fallback Behavior

- If no tools detected → falls back to `copilot` only (AGENTS.md is the primary file)
- If tools detected → pre-selects detected tools
- Always ensures at least one AGENTS.md tool is selected (primary file)
- `-y` flag uses `copilot` only (no symlinks created)

## Plan

- [x] Add detection config to `AIToolConfig` interface
- [x] Implement `commandExists()` helper
- [x] Implement `configDirExists()` helper
- [x] Implement `envVarExists()` helper
- [x] Implement `extensionInstalled()` helper
- [x] Create `detectInstalledAITools()` function
- [x] Create `getDefaultAIToolSelection()` function
- [x] Update init command to show detection results
- [x] Update checkbox to use detected defaults

## Test

- [x] `lean-spec init` shows detection results when tools found
- [x] Detected tools are pre-selected in checkbox
- [x] Detection reasons shown for each tool
- [x] Falls back to defaults when nothing detected
- [x] Works on macOS (tested)
- [ ] Works on Windows (not tested)
- [ ] Works on Linux (not tested)

## Notes

### Supported AI Tools (Alphabetical)

| Tool | File | Commands | Config Dirs | Env Vars |
|------|------|----------|-------------|----------|
| Aider | `AGENTS.md` | `aider` | `.aider` | - |
| Claude Code | `CLAUDE.md` | `claude` | `.claude` | `ANTHROPIC_API_KEY` |
| Codex CLI (OpenAI) | `AGENTS.md` | `codex` | `.codex` | `OPENAI_API_KEY` |
| GitHub Copilot | `AGENTS.md` | `copilot` | - | `GITHUB_TOKEN` |
| Cursor | `AGENTS.md` | `cursor` | `.cursor`, `.cursorules` | - |
| Droid (Factory) | `AGENTS.md` | `droid` | - | - |
| Gemini CLI | `GEMINI.md` | `gemini` | `.gemini` | `GOOGLE_API_KEY`, `GEMINI_API_KEY` |
| OpenCode | `AGENTS.md` | `opencode` | `.opencode` | - |
| Windsurf | `AGENTS.md` | `windsurf` | `.windsurf`, `.windsurfrules` | - |

### Future Enhancements

- Add more detection methods (running processes, recent activity)
- Detect tool versions
- Suggest MCP configuration for detected tools
