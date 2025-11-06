# LeanSpec MCP Server

The LeanSpec MCP (Model Context Protocol) server enables AI assistants like Claude Desktop, Cline, and other MCP-compatible clients to interact with your LeanSpec projects directly.

## Features

### Tools
The MCP server exposes these tools to AI assistants:

- **list** - List all specifications with optional filtering
- **search** - Full-text search across specifications
- **view** - View specification content (formatted, raw markdown, or JSON)
- **create** - Create new specifications
- **update** - Update specification metadata (status, priority, tags, etc.)
- **stats** - Get project statistics
- **board** - Get Kanban board view
- **deps** - Show specification dependencies

### Resources
Browseable content accessible to AI assistants:

- **spec://<spec-name>** - Individual specification content
- **board://kanban** - Current Kanban board state
- **stats://overview** - Project statistics overview

### Prompts
Quick action templates for common workflows:

- **Create feature spec** - Guided specification creation
- **Update spec status** - Quick status changes
- **Find related specs** - Dependency discovery

## Installation

The MCP server is included with LeanSpec. No additional installation is required.

```bash
npm install -g lean-spec
```

## Configuration

### VS Code (GitHub Copilot)

1. Open VS Code settings (JSON):
   - Press `Cmd/Ctrl + Shift + P`
   - Type "Preferences: Open User Settings (JSON)"
   - Or directly edit `~/.vscode/settings.json`

2. Add the LeanSpec MCP server configuration:

```json
{
  "github.copilot.chat.mcp.servers": {
    "lean-spec": {
      "command": "npx",
      "args": ["-y", "lean-spec", "mcp"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

The `${workspaceFolder}` variable automatically uses your current workspace root. For a specific project path, replace it with the absolute path.

> **Note:** Using `npx` ensures you're always using the latest version and works without global installation. The `-y` flag automatically confirms the installation prompt.

### Claude Desktop

1. Open your Claude Desktop configuration file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. Add the LeanSpec MCP server configuration:

```json
{
  "mcpServers": {
    "lean-spec": {
      "command": "npx",
      "args": ["-y", "lean-spec", "mcp"],
      "cwd": "/path/to/your/lspec/project"
    }
  }
}
```

Replace `/path/to/your/lspec/project` with the absolute path to your LeanSpec project directory.

### Multiple Projects

You can configure multiple LeanSpec projects:

```json
{
  "mcpServers": {
    "lean-spec-projectA": {
      "command": "npx",
      "args": ["-y", "lean-spec", "mcp"],
      "cwd": "/path/to/projectA"
    },
    "lean-spec-projectB": {
      "command": "npx",
      "args": ["-y", "lean-spec", "mcp"],
      "cwd": "/path/to/projectB"
    }
  }
}
```

### Alternative: Using Global Installation

If you have LeanSpec installed globally (`npm install -g lean-spec`), you can use:

```json
{
  "mcpServers": {
    "lean-spec": {
      "command": "lspec",
      "args": ["mcp"],
      "cwd": "/path/to/your/lspec/project"
    }
  }
}
```

### Other MCP Clients

For other MCP-compatible clients, configure them to run:
- **Command**: `npx -y lean-spec mcp` (recommended) or `lspec mcp` (if globally installed)
- **Working Directory**: Your LeanSpec project root
- **Transport**: stdio

## Usage Examples

Once configured, you can interact with your LeanSpec project through your AI assistant:

### List specifications
```
List all specifications in my project
```

### Search for specifications
```
Search for all specs related to "authentication"
```

### Read a specification
```
View the spec for "001-user-authentication"
```

or for raw markdown:
```
View the spec for "001-user-authentication" in raw format
```

### Create a new specification
```
Create a new spec called "api-redesign" with high priority and tags "api, backend"
```
## Troubleshooting

### Server won't start
- Verify the `cwd` path in your configuration points to a valid LeanSpec project (has `.lspec/config.json`)
- If using `npx`, ensure you have internet access for the first run
- If using global installation, check that `lspec` is in your PATH
- Try running `npx -y lean-spec mcp` or `lspec mcp` directly from your project directory
### Get project statistics
```
Show me the project statistics
```

### View Kanban board
```
Show me the current Kanban board
```

## Troubleshooting

### Server won't start
- Verify the `cwd` path in your configuration points to a valid LeanSpec project (has `.lspec/config.json`)
- Check that `lspec` is in your PATH
- Try running `lspec mcp` directly from your project directory

### Tools not appearing
- Restart your MCP client after configuration changes
- Check client logs for connection errors
- Verify the LeanSpec project is properly initialized (`lspec init`)

### Permission errors
- Ensure the working directory is readable/writable
- Check file permissions on the specs directory

## Development
### Testing the MCP Server

You can test the MCP server using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector npx -y lean-spec mcp
```

Or test directly from your project:

```bash
cd /path/to/your/lspec/project
npx -y lean-spec mcp
# or if installed globally:
lspec mcp
```ec mcp
```

## Security Considerations

- The MCP server runs with the same permissions as your user account
- It can read and modify files in your LeanSpec project
- Only expose the server to trusted MCP clients
- Review changes made by AI assistants before committing

## Learn More

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [LeanSpec Documentation](https://lean-spec.dev)
- [Claude Desktop MCP Setup](https://support.anthropic.com/en/articles/model-context-protocol)
