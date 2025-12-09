---
status: in-progress
created: '2025-12-09'
tags:
  - ai-agents
  - cursor
  - cli
  - integration
priority: medium
created_at: '2025-12-09T14:04:30.946Z'
updated_at: '2025-12-09T14:05:13.368Z'
transitions:
  - status: in-progress
    at: '2025-12-09T14:05:13.368Z'
---

# Add Cursor Agent Support

> **Status**: ⏳ In progress · **Priority**: Medium · **Created**: 2025-12-09 · **Tags**: ai-agents, cursor, cli, integration

## Overview

Add Cursor as a supported AI coding agent in lean-spec agent commands. Users can dispatch specs to Cursor IDE for implementation.

## Problem

Users working with Cursor IDE cannot use the `lean-spec agent run` command to dispatch specs to Cursor. When they attempt to use `--agent cursor`, they receive:

```
Unknown agent: cursor
Available agents: claude, copilot, aider, gemini, gh-coding
```

## Design

Cursor IDE supports AI-powered code editing through its built-in agent system. To integrate Cursor with lean-spec, we need to:

1. **Add Cursor to AgentType enum** - Include 'cursor' as a valid agent type
2. **Define Cursor agent configuration** - Add to DEFAULT_AGENTS with appropriate settings
3. **Command invocation** - Use `cursor` CLI command if available

### Cursor Agent Configuration

Cursor can be invoked via CLI using `cursor <file>` to open files. For spec implementation, we'll use:
- Command: `cursor` 
- Mode: CLI-based (local)
- Context approach: Open the spec directory in Cursor for the user to work with

## Plan

- [x] Create spec for Cursor agent support
- [ ] Update AgentType to include 'cursor'
- [ ] Add Cursor configuration to DEFAULT_AGENTS
- [ ] Update MCP tool schema to include 'cursor' option
- [ ] Update error messages to include cursor in available agents list
- [ ] Test cursor agent list command
- [ ] Test cursor agent run command (dry-run)

## Test

- [ ] `lean-spec agent list` shows cursor as an available agent
- [ ] `lean-spec agent run <spec> --agent cursor --dry-run` succeeds
- [ ] `lean-spec agent run <spec> --agent cursor` opens spec in Cursor (if installed)
- [ ] Error messages include 'cursor' in available agents list

## Notes

Cursor is a popular AI-first code editor built on VS Code. It has built-in AI capabilities and integrates well with codebases. Unlike some other agents that can run autonomously, Cursor requires user interaction, so the agent command will open the spec in Cursor for the user to work with the AI assistant.
