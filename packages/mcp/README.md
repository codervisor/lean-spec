# @leanspec/mcp

> MCP server integration wrapper for LeanSpec

This package provides a simple entry point for using LeanSpec as an [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server with AI assistants like Claude Desktop, Cline, and Zed.

## Quick Start

### Standard Configuration

Most MCP-compatible tools use this standard configuration format:

```json
{
  "mcpServers": {
    "leanspec": {
      "command": "npx",
      "args": ["-y", "@leanspec/mcp"]
    }
  }
}
```

### Supported Tools

Works with any tool supporting the Model Context Protocol, including:

**AI Coding Assistants:**
- [VS Code](https://code.visualstudio.com/) (GitHub Copilot)
- [Cursor](https://cursor.sh/)
- [Windsurf](https://codeium.com/windsurf)
- [Amp](https://amp.build/)

**AI Chat Interfaces:**
- [Claude Desktop](https://claude.ai/download)
- [Claude Code](https://claudecode.com/)
- [Goose](https://block.github.io/goose/)
- [Kiro](https://kiro.ai/)

**Terminal & CLI:**
- [Warp](https://www.warp.dev/)
- [Gemini CLI](https://github.com/google-gemini/gemini-cli)

**Development Platforms:**
- [Factory](https://factory.ai/)
- [Qodo Gen](https://www.qodo.ai/products/qodo-gen/)
- [LM Studio](https://lmstudio.ai/)
- And more!

### Configuration File Locations

#### Claude Desktop
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

#### VS Code
- Add to your workspace or user `settings.json`
- Use `github.copilot.chat.mcp.servers` for GitHub Copilot

#### Other Tools
Refer to your tool's documentation for the configuration file location. Most use the standard MCP config format above.

## What is MCP?

The Model Context Protocol (MCP) is an open protocol that standardizes how AI applications connect to data sources and tools. LeanSpec's MCP server lets AI assistants read and manage your project specifications directly.

## Available Tools

The LeanSpec MCP server provides these tools to AI assistants:

### Core Spec Management (12 tools)
- **list** - List all specifications with filtering
- **view** - Read complete specification content (README.md only; sub-spec files not yet included)
- **create** - Create new specifications
- **update** - Update specification metadata
- **search** - Search across specifications
- **deps** - Show dependency graphs
- **link** - Add dependency relationships
- **unlink** - Remove dependency relationships
- **board** - View Kanban-style project board
- **stats** - Get project statistics
- **tokens** - Count tokens for context management
- **validate** - Validate specification quality

Note: Additional utility commands (`files`, `archive`, `backfill`, `check`, `analyze`, `gantt`, `agent`) are available via CLI but not exposed as MCP tools to keep the interface focused on core spec operations. The `files` functionality will be embedded into the `view` tool output in a future update.

## How It Works

This package is a lightweight wrapper that delegates to the `lean-spec mcp` command. When you use `npx @leanspec/mcp`, it:

1. Automatically installs `@leanspec/mcp` and its `lean-spec` dependency
2. Runs `lean-spec mcp` to start the MCP server
3. Your IDE communicates with the server via stdio

No manual installation or setup required!

## Requirements

- Node.js 20 or higher
- A LeanSpec project (specs directory with specifications)

## Troubleshooting

**Server not starting?**
- Ensure Node.js 20+ is installed: `node --version`
- Check that you're in a directory with a `specs/` folder
- Restart your IDE after updating the config

**Changes not taking effect?**
- Fully restart your IDE (not just reload)
- Clear npx cache: `npx clear-npx-cache`

**Want to see debug logs?**
- Check your IDE's MCP server logs
- Claude Desktop: View → Developer Tools → Console
- Cline: Check VS Code's Output panel

## Documentation

For complete documentation, visit: https://lean-spec.dev

## License

MIT
