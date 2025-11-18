---
status: planned
created: '2025-11-18'
tags:
  - mcp
  - integration
  - npm-package
  - developer-experience
priority: high
created_at: '2025-11-18T03:06:33.496Z'
---

# @leanspec/mcp - MCP Server Integration Wrapper

> **Status**: 📅 Planned · **Priority**: High · **Created**: 2025-11-18

**Project**: lean-spec  
**Team**: Core Development

## Overview

Create a lightweight CLI wrapper that makes `lean-spec mcp` more discoverable and easier to use. The existing `lean-spec` CLI has many features, making MCP setup less obvious. This dedicated package provides a simple entry point for users to quickly onboard MCP with their preferred IDE/tools.

**Problem**: `lean-spec` is a full-featured CLI tool. When users configure MCP servers in their IDE, they need to know to use `lean-spec mcp`, which isn't obvious. Also, the package name `lean-spec` doesn't clearly indicate MCP functionality.

**Solution**: Ship `@leanspec/mcp` as a thin wrapper. IDEs can call `npx @leanspec/mcp` directly, which just delegates to `lean-spec mcp`. This makes the MCP server more discoverable and the package name more intuitive.

## Design

### Package Structure
```
@leanspec/mcp/
├── bin/
│   └── leanspec-mcp.js   # Thin wrapper CLI
├── package.json          # Depends on lean-spec
└── README.md             # Quick start guide
```

### How It Works

The package is a **simple passthrough**:
1. User adds MCP server to their IDE config: `npx @leanspec/mcp`
2. When IDE needs the server, npx auto-installs `@leanspec/mcp` and its `lean-spec` dependency
3. Script delegates to: `lean-spec mcp`
4. MCP server starts and IDE can communicate with it

No interaction needed - the IDE handles everything.

### Usage in IDE Configs

**Claude Desktop** (`claude_desktop_config.json`):
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

**Cline** (VS Code `settings.json`):
```json
{
  "cline.mcpServers": {
    "leanspec": {
      "command": "npx",
      "args": ["-y", "@leanspec/mcp"]
    }
  }
}
```

**Zed** (`settings.json`):
```json
{
  "context_servers": {
    "leanspec": {
      "command": "npx",
      "args": ["-y", "@leanspec/mcp"]
    }
  }
}
```

### Key Design Decisions

**Pure passthrough**: Just delegates to `lean-spec mcp`, no logic needed.

**Better naming**: `@leanspec/mcp` is more intuitive than `lean-spec mcp` for MCP use cases.

**Auto-install**: npx automatically installs both `@leanspec/mcp` and its `lean-spec` dependency when needed.

**No interaction**: MCP servers are called by IDEs, not by users directly. No wizard needed.

**Simpler docs**: Users just copy-paste the config snippet, IDE handles the rest.

## Plan

- [ ] Create minimal package structure in `packages/mcp/`
- [ ] Write simple passthrough script (delegates to `lean-spec mcp`)
- [ ] Add `lean-spec` as dependency in package.json
- [ ] Create README with config examples for different IDEs
- [ ] Test with Claude Desktop, Cline, Zed
- [ ] Publish to npm as `@leanspec/mcp`
- [ ] Update main docs with `@leanspec/mcp` examples

## Test

- [ ] Config with `npx @leanspec/mcp` works in Claude Desktop
- [ ] Config with `npx @leanspec/mcp` works in Cline
- [ ] Config with `npx @leanspec/mcp` works in Zed
- [ ] Server starts correctly when IDE calls it
- [ ] npx auto-installs dependencies on first run
- [ ] Works on macOS, Windows, Linux
- [ ] Package size is minimal (<5KB)

## Notes

### Why This Approach

**Maximum simplicity**: Just a ~10 line passthrough script.

**No complexity**: No IDE detection, no config merging, no interaction. Users just copy config.

**Better naming**: Package name clearly indicates MCP functionality.

**Zero maintenance**: All logic lives in `lean-spec mcp`, wrapper just delegates.

**Discoverability**: Searching for "leanspec mcp" finds the right package immediately.

### Implementation

```javascript
#!/usr/bin/env node
const { spawn } = require('child_process');

// Simply delegate to lean-spec mcp
const child = spawn('lean-spec', ['mcp'], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code));
```

### Documentation Example

Users see this in the docs:

> **Quick Setup**
> 
> Add to your Claude Desktop config:
> ```json
> {
>   "mcpServers": {
>     "leanspec": {
>       "command": "npx",
>       "args": ["-y", "@leanspec/mcp"]
>     }
>   }
> }
> ```
> 
> Restart Claude Desktop. Done!

### Dependencies
- `lean-spec` - The actual MCP server (peer dependency)

### Related
- Existing `lean-spec mcp` command (what this delegates to)
