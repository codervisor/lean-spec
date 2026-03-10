# AI Agent Runners Catalog

Last full audit: 2026-03-03

## Tier 1 — High Priority

### Claude Code
- **Org**: Anthropic
- **CLI**: `claude`
- **Config dir**: `.claude`
- **Symlink file**: `CLAUDE.md` → `AGENTS.md`
- **Env vars**: `ANTHROPIC_API_KEY`
- **Prompt flag**: `--print`
- **Docs**: https://docs.anthropic.com/en/docs/claude-code
- **Repo**: https://github.com/anthropics/claude-code
- **Notes**: Default runner in LeanSpec. Supports CLAUDE.md as project instructions and MCP tool servers.

### GitHub Copilot
- **Org**: GitHub / Microsoft
- **CLI**: `copilot`
- **Config dir**: `.copilot`
- **Env vars**: `GITHUB_TOKEN`, `GH_TOKEN`
- **Prompt flag**: `--prompt`
- **Docs**: https://docs.github.com/en/copilot
- **Notes**: Supports AGENTS.md natively. Integrated into VS Code and CLI.

### Cursor
- **Org**: Anysphere
- **CLI**: `cursor` (IDE launcher only)
- **Config dirs**: `.cursor`, `.cursorrules`
- **Executable**: No (IDE-only)
- **Docs**: https://docs.cursor.com
- **Notes**: Uses `.cursor/rules/` directory for project rules. Previously used `.cursorrules` file (deprecated but still detected).

### Windsurf
- **Org**: Codeium
- **CLI**: `windsurf` (IDE launcher only)
- **Config dirs**: `.windsurf`, `.windsurfrules`
- **Executable**: No (IDE-only)
- **Docs**: https://docs.windsurf.com
- **Notes**: Similar config pattern to Cursor. Uses `.windsurf/rules/` directory.

### Codex CLI
- **Org**: OpenAI
- **CLI**: `codex`
- **Config dir**: `.codex`
- **Env vars**: `OPENAI_API_KEY`
- **Repo**: https://github.com/openai/codex
- **Notes**: Open source. Supports AGENTS.md for project context.

### Gemini CLI
- **Org**: Google
- **CLI**: `gemini`
- **Config dir**: `.gemini`
- **Symlink file**: `GEMINI.md` → `AGENTS.md`
- **Env vars**: `GOOGLE_API_KEY`, `GEMINI_API_KEY`
- **Repo**: https://github.com/google-gemini/gemini-cli
- **Notes**: Supports GEMINI.md as project instructions.

## Tier 2 — Medium Priority

### Kiro CLI
- **Org**: AWS
- **CLI**: `kiro-cli`
- **Config dir**: `.kiro`
- **Env vars**: `AWS_ACCESS_KEY_ID`
- **Notes**: AWS-backed agent platform.

### Amp
- **Org**: Sourcegraph
- **CLI**: `amp`
- **Config dir**: `.amp`
- **Repo**: https://github.com/nichochar/amp
- **Notes**: Terminal-native agent.

### Aider
- **Org**: Paul Gauthier
- **CLI**: `aider`
- **Config dir**: `.aider`
- **Prompt flag**: `--message`
- **Repo**: https://github.com/paul-gauthier/aider
- **Notes**: Multi-model support. Convention files in `.aider/`.

### Goose
- **Org**: Block
- **CLI**: `goose`
- **Config dir**: `.goose`
- **Repo**: https://github.com/block/goose
- **Notes**: Open source agent toolkit.

### Continue
- **Org**: Continue.dev
- **CLI**: `continue`
- **Config dir**: `.continue`
- **VS Code ext**: `continue.continue`
- **Executable**: Partial (IDE-focused)
- **Repo**: https://github.com/continuedev/continue
- **Notes**: Open source IDE extension. Config in `.continue/`.

### Roo Code
- **Org**: Roo Code
- **Config dir**: `.roo`
- **VS Code ext**: `rooveterinaryinc.roo-cline`
- **Executable**: No (IDE-only)
- **Notes**: Fork of Cline with custom modes.

## Tier 3 — Monitor

### Droid
- **CLI**: `droid` | **Config**: `.droid`

### Kimi CLI
- **Org**: MoonshotAI | **CLI**: `kimi` | **Config**: `.kimi` | **Env**: `MOONSHOT_API_KEY`

### Qodo CLI
- **CLI**: `qodo` | **Config**: `.qodo`

### Trae Agent
- **Org**: ByteDance | **CLI**: `trae` | **Config**: `.trae`

### Qwen Code
- **Org**: Alibaba | **CLI**: `qwen-code` | **Config**: `.qwen-code` | **Env**: `DASHSCOPE_API_KEY`

### OpenHands
- **CLI**: `openhands` | **Config**: `.openhands` | **Repo**: https://github.com/All-Hands-AI/OpenHands

### Crush
- **CLI**: `crush` | **Config**: `.crush`

### CodeBuddy
- **Config**: `.codebuddy` | **Executable**: No (IDE-only)

### Kilo Code
- **Config**: `.kilocode` | **Executable**: No (IDE-only)

### Augment
- **Config**: `.augment` | **Executable**: No (IDE-only)

### Cline
- **CLI**: `cline` | **Executable**: Partial (IDE-focused)

### OpenCode
- **CLI**: `opencode`

## Emerging / Not Yet Tracked

<!-- Add newly discovered runners here during research -->

_None currently tracked. Use web search to discover new entrants._

## Change Log

| Date | Runner | Change | Action |
|------|--------|--------|--------|
| 2026-03-03 | All | Initial catalog created from registry | Baseline |
