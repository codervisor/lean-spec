---
status: in-progress
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
created_at: 2026-01-30T13:55:12.376564Z
updated_at: 2026-02-02T07:36:42.910367432Z
transitions:
- status: in-progress
  at: 2026-02-02T07:36:42.910367432Z
parent: 168-leanspec-orchestration-platform
---

# Configurable AI Agent Runner System

## Overview

### Problem

The current session management system (spec 239) uses hardcoded "tool adapters" for AI coding tools (Claude, Copilot, Codex, OpenCode). This has several limitations:

1. **Naming confusion**: The term "tool" is overloaded (MCP tools, CLI tools) - should be "AI Agent Runner"
2. **No user configurability**: Users cannot add new AI tools without code changes
3. **Hardcoded parameters**: Command paths, arguments, environment variables are baked into code
4. **Rapidly evolving market**: New AI coding assistants appear frequently (Cursor, Windsurf, Cline, Continue, Aider, etc.) - users need to add them without waiting for LeanSpec releases

### Solution

Refactor the tool adapter system into a **configurable AI Agent Runner** system:

1. Rename "tool" → "runner" throughout the codebase
2. Define all runners in a single `runners.json` config file
3. Allow per-project customization via `.lean-spec/runners.json`
4. Ship sensible built-in defaults for common tools

### Scope

**In Scope**:
- Terminology refactoring: tool → runner
- Single-file configuration schema (`runners.json`)
- Global (~/.lean-spec/) + project-level (.lean-spec/) config
- CLI commands for runner listing and validation
- Migration path for existing sessions
- UI for runner configuration

**Out of Scope**:
- Changing session management core (spec 239)
- Runner marketplace/sharing (future spec)

## Design

### Terminology Changes

| Old Term     | New Term          |
| ------------ | ----------------- |
| tool         | runner            |
| ToolAdapter  | RunnerDefinition  |
| ToolManager  | RunnerRegistry    |
| session.tool | session.runner    |
| --tool flag  | --runner flag     |

### Configuration Schema

All runners are defined in a single `runners.json` file with a simple structure:

```json
{
  "$schema": "https://leanspec.dev/schemas/runners.json",
  "runners": {
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

### Minimal Runner Definition

Only `command` is required. Everything else is optional:

```json
{
  "runners": {
    "my-tool": {
      "command": "/path/to/my-ai-tool"
    }
  }
}
```

### Configuration File Locations

```
~/.lean-spec/runners.json       # Global runners (user-level)
.lean-spec/runners.json         # Project-level (merges with global)
```

Project-level config merges with global - same runner IDs override, new ones are added.

### Built-in Defaults

LeanSpec includes sensible defaults for common tools. Users only need to configure if they want to:
- Add a new runner not in defaults
- Override default args/env for existing runner
- Set a different default runner

### Runner Registry

```rust
pub struct RunnerRegistry {
    runners: HashMap<String, RunnerDefinition>,
    default: Option<String>,
}

impl RunnerRegistry {
    /// Load: builtins → ~/.lean-spec/runners.json → .lean-spec/runners.json
    pub fn load(project_path: &Path) -> Result<Self>;
    
    pub fn get(&self, id: &str) -> Option<&RunnerDefinition>;
    pub fn list(&self) -> Vec<&str>;
    pub fn default(&self) -> Option<&str>;
}
```

### CLI Commands

```bash
# List available runners
lean-spec runner list

# Show runner config
lean-spec runner show <runner-id>

# Validate runner (check if command exists)
lean-spec runner validate [runner-id]

# Open config file in editor
lean-spec runner config [--global]
```

### Session Command Updates

```bash
# Old (deprecated but still works)
lean-spec session create --tool claude --spec 239

# New
lean-spec session create --runner claude --spec 239

# Use default runner (from config)
lean-spec session create --spec 239
```

### Database Migration

```sql
-- Rename column
ALTER TABLE sessions RENAME COLUMN tool TO runner;

-- Values stay the same (claude, copilot, etc.) - no data migration needed
```

### HTTP API Updates

```
GET    /api/runners              # List available runners
GET    /api/runners/:id          # Get runner details
POST   /api/runners              # Add new runner
PUT    /api/runners/:id          # Update runner
DELETE /api/runners/:id          # Delete runner
POST   /api/runners/:id/validate # Validate runner
PUT    /api/runners/default      # Set default runner
```

## Plan

### Phase 1: Terminology Refactoring
- [ ] Rename ToolAdapter → RunnerDefinition in Rust
- [ ] Rename ToolManager → RunnerRegistry
- [ ] Update database schema (tool → runner)
- [ ] Create migration script for existing data
- [ ] Update CLI commands (--tool → --runner, deprecate old)
- [ ] Update HTTP API endpoints

### Phase 2: Configuration Schema
- [ ] Define JSON schema for runners.json
- [ ] Implement RunnerDefinition struct (command, args, env, name)
- [ ] Add configuration validation
- [ ] Support environment variable interpolation (${VAR})

### Phase 3: Configuration Loading
- [ ] Implement global config loading (~/.lean-spec/runners.json)
- [ ] Implement project config loading (.lean-spec/runners.json)
- [ ] Implement merge logic (project overrides global)
- [ ] Bundle built-in defaults in code
- [ ] Write loading tests

### Phase 4: Runner Commands
- [ ] Implement `lean-spec runner list`
- [ ] Implement `lean-spec runner show`
- [ ] Implement `lean-spec runner validate`
- [ ] Implement `lean-spec runner config`

### Phase 5: UI Integration
- [ ] Add Runners page in Settings
- [ ] Runner list with status badges (installed/not found)
- [ ] Add Runner dialog (name, command, args, env fields)
- [ ] Edit Runner dialog (same fields, prefilled)
- [ ] Delete Runner with confirmation
- [ ] Set default runner toggle
- [ ] Validate button (test if command exists)
- [ ] Update session create dialog (tool → runner dropdown)

### Phase 6: Documentation & Migration
- [ ] Update all documentation (tool → runner)
- [ ] Write migration guide for existing users
- [ ] Add runner configuration examples
- [ ] Update spec 239 references

## Test

### Unit Tests
- [ ] RunnerDefinition parsing from JSON
- [ ] RunnerRegistry loading and merging
- [ ] Environment variable interpolation
- [ ] Default runner selection

### Integration Tests
- [ ] Database migration (tool → runner)
- [ ] CLI command functionality
- [ ] Session creation with custom runner
- [ ] Config file merge behavior

### User Acceptance
- [ ] Add new runner from UI
- [ ] Edit existing runner from UI
- [ ] Delete custom runner from UI
- [ ] Set default runner from UI
- [ ] Create session with custom runner

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

**Add a custom runner** (in `~/.lean-spec/runners.json` or `.lean-spec/runners.json`):
```json
{
  "runners": {
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
  "runners": {
    "claude": {
      "args": ["--model", "claude-sonnet-4-20250514", "--print"]
    }
  },
  "default": "claude"
}
```

### Future Enhancements

- **Runner Marketplace**: Share runner configs with community
- **Auto-detection**: Detect installed AI tools and suggest runners
- **Runner Profiles**: Switch between runner configurations easily
- **Telemetry**: Track which runners are most used/successful
