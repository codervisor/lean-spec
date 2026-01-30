---
status: planned
created: 2026-01-30
priority: high
tags:
- ai-agents
- sessions
- configuration
- extensibility
- infrastructure
depends_on:
- 239-ai-coding-session-management
parent: 168-leanspec-orchestration-platform
created_at: 2026-01-30T13:55:12.376564Z
updated_at: 2026-01-30T13:55:25.391308Z
---

# Configurable AI Agent Runtime System

## Overview

### Problem

The current session management system (spec 239) uses hardcoded "tool adapters" for AI coding tools (Claude, Copilot, Codex, OpenCode). This has several limitations:

1. **Naming confusion**: The term "tool" is overloaded (MCP tools, CLI tools) - should be "AI Agent Runtime"
2. **No user configurability**: Users cannot add new AI tools without code changes
3. **Hardcoded parameters**: Command paths, arguments, environment variables are baked into code
4. **Rapidly evolving market**: New AI coding assistants appear frequently (Cursor, Windsurf, Cline, Continue, Aider, etc.) - users need to add them without waiting for LeanSpec releases

### Solution

Refactor the tool adapter system into a **configurable AI Agent Runtime** system:

1. Rename "tool" → "runtime" throughout the codebase
2. Define all runtimes in a single `runtimes.json` config file
3. Allow per-project customization via `.lean-spec/runtimes.json`
4. Ship sensible built-in defaults for common tools

### Scope

**In Scope**:
- Terminology refactoring: tool → runtime
- Single-file configuration schema (`runtimes.json`)
- Global (~/.lean-spec/) + project-level (.lean-spec/) config
- CLI commands for runtime listing and validation
- Migration path for existing sessions
- UI for runtime configuration

**Out of Scope**:
- Changing session management core (spec 239)
- Runtime marketplace/sharing (future spec)

## Design

### Terminology Changes

| Old Term     | New Term          |
| ------------ | ----------------- |
| tool         | runtime           |
| ToolAdapter  | RuntimeDefinition |
| ToolManager  | RuntimeRegistry   |
| session.tool | session.runtime   |
| --tool flag  | --runtime flag    |

### Configuration Schema

All runtimes are defined in a single `runtimes.json` file with a simple structure:

```json
{
  "$schema": "https://leanspec.dev/schemas/runtimes.json",
  "runtimes": {
    "claude": {
      "name": "Claude Code",
      "command": "claude",
      "args": ["--dangerously-skip-permissions", "--print"],
      "env": { "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}" }
    },
    "copilot": {
      "name": "GitHub Copilot",
      "command": "gh",
      "args": ["copilot", "suggest"]
    },
    "aider": {
      "name": "Aider",
      "command": "aider",
      "args": ["--no-auto-commits"],
      "env": { "OPENAI_API_KEY": "${OPENAI_API_KEY}" }
    },
    "opencode": {
      "name": "OpenCode",
      "command": "opencode"
    },
    "cline": {
      "name": "Cline",
      "command": "cline"
    }
  },
  "default": "claude"
}
```

### Minimal Runtime Definition

Only `command` is required. Everything else is optional:

```json
{
  "runtimes": {
    "my-tool": {
      "command": "/path/to/my-ai-tool"
    }
  }
}
```

### Configuration File Locations

```
~/.lean-spec/runtimes.json       # Global runtimes (user-level)
.lean-spec/runtimes.json         # Project-level (merges with global)
```

Project-level config merges with global - same runtime IDs override, new ones are added.

### Built-in Defaults

LeanSpec includes sensible defaults for common tools. Users only need to configure if they want to:
- Add a new runtime not in defaults
- Override default args/env for existing runtime
- Set a different default runtime

### Runtime Registry

```rust
pub struct RuntimeRegistry {
    runtimes: HashMap<String, RuntimeDefinition>,
    default: Option<String>,
}

impl RuntimeRegistry {
    /// Load: builtins → ~/.lean-spec/runtimes.json → .lean-spec/runtimes.json
    pub fn load(project_path: &Path) -> Result<Self>;
    
    pub fn get(&self, id: &str) -> Option<&RuntimeDefinition>;
    pub fn list(&self) -> Vec<&str>;
    pub fn default(&self) -> Option<&str>;
}
```

### CLI Commands

```bash
# List available runtimes
lean-spec runtime list

# Show runtime config
lean-spec runtime show <runtime-id>

# Validate runtime (check if command exists)
lean-spec runtime validate [runtime-id]

# Open config file in editor
lean-spec runtime config [--global]
```

### Session Command Updates

```bash
# Old (deprecated but still works)
lean-spec session create --tool claude --spec 239

# New
lean-spec session create --runtime claude --spec 239

# Use default runtime (from config)
lean-spec session create --spec 239
```

### Database Migration

```sql
-- Rename column
ALTER TABLE sessions RENAME COLUMN tool TO runtime;

-- Values stay the same (claude, copilot, etc.) - no data migration needed
```

### HTTP API Updates

```
GET    /api/runtimes              # List available runtimes
GET    /api/runtimes/:id          # Get runtime details
POST   /api/runtimes              # Add new runtime
PUT    /api/runtimes/:id          # Update runtime
DELETE /api/runtimes/:id          # Delete runtime
POST   /api/runtimes/:id/validate # Validate runtime
PUT    /api/runtimes/default      # Set default runtime
```

## Plan

### Phase 1: Terminology Refactoring
- [ ] Rename ToolAdapter → RuntimeDefinition in Rust
- [ ] Rename ToolManager → RuntimeRegistry
- [ ] Update database schema (tool → runtime)
- [ ] Create migration script for existing data
- [ ] Update CLI commands (--tool → --runtime, deprecate old)
- [ ] Update HTTP API endpoints

### Phase 2: Configuration Schema
- [ ] Define JSON schema for runtimes.json
- [ ] Implement RuntimeDefinition struct (command, args, env, name)
- [ ] Add configuration validation
- [ ] Support environment variable interpolation (${VAR})

### Phase 3: Configuration Loading
- [ ] Implement global config loading (~/.lean-spec/runtimes.json)
- [ ] Implement project config loading (.lean-spec/runtimes.json)
- [ ] Implement merge logic (project overrides global)
- [ ] Bundle built-in defaults in code
- [ ] Write loading tests

### Phase 4: Runtime Commands
- [ ] Implement `lean-spec runtime list`
- [ ] Implement `lean-spec runtime show`
- [ ] Implement `lean-spec runtime validate`
- [ ] Implement `lean-spec runtime config`

### Phase 5: UI Integration
- [ ] Add Runtimes page in Settings
- [ ] Runtime list with status badges (installed/not found)
- [ ] Add Runtime dialog (name, command, args, env fields)
- [ ] Edit Runtime dialog (same fields, prefilled)
- [ ] Delete Runtime with confirmation
- [ ] Set default runtime toggle
- [ ] Validate button (test if command exists)
- [ ] Update session create dialog (tool → runtime dropdown)

### Phase 6: Documentation & Migration
- [ ] Update all documentation (tool → runtime)
- [ ] Write migration guide for existing users
- [ ] Add runtime configuration examples
- [ ] Update spec 239 references

## Test

### Unit Tests
- [ ] RuntimeDefinition parsing from JSON
- [ ] RuntimeRegistry loading and merging
- [ ] Environment variable interpolation
- [ ] Default runtime selection

### Integration Tests
- [ ] Database migration (tool → runtime)
- [ ] CLI command functionality
- [ ] Session creation with custom runtime
- [ ] Config file merge behavior

### User Acceptance
- [ ] Add new runtime from UI
- [ ] Edit existing runtime from UI
- [ ] Delete custom runtime from UI
- [ ] Set default runtime from UI
- [ ] Create session with custom runtime

## Notes

### Popular AI Coding Tools to Support

| Tool           | CLI Available    | Notes                      |
| -------------- | ---------------- | -------------------------- |
| Claude Code    | Yes              | Primary Anthropic tool     |
| GitHub Copilot | Yes (gh copilot) | Via GitHub CLI extension   |
| Cursor         | ?                | May be IDE-only            |
| Windsurf       | ?                | Codeium's IDE              |
| Cline          | Yes              | VS Code extension with CLI |
| Aider          | Yes              | Popular open-source        |
| Continue       | ?                | IDE extension              |
| OpenCode       | Yes              | Open-source                |
| Codex CLI      | Yes              | OpenAI (deprecated?)       |

### Configuration Examples

**Add a custom runtime** (in `~/.lean-spec/runtimes.json` or `.lean-spec/runtimes.json`):
```json
{
  "runtimes": {
    "my-custom-agent": {
      "name": "My Custom Agent",
      "command": "/usr/local/bin/my-agent",
      "args": ["--mode", "coding"]
    }
  }
}
```

**Override default Claude args**:
```json
{
  "runtimes": {
    "claude": {
      "args": ["--model", "claude-sonnet-4-20250514", "--print"]
    }
  },
  "default": "claude"
}
```

### Future Enhancements

- **Runtime Marketplace**: Share runtime configs with community
- **Auto-detection**: Detect installed AI tools and suggest runtimes
- **Runtime Profiles**: Switch between runtime configurations easily
- **Telemetry**: Track which runtimes are most used/successful
