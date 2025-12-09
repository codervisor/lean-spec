---
status: complete
created: '2025-12-09'
tags:
  - ai-agents
  - cursor
  - cli
  - integration
priority: medium
created_at: '2025-12-09T14:04:30.946Z'
updated_at: '2025-12-09T14:08:16.894Z'
transitions:
  - status: in-progress
    at: '2025-12-09T14:05:13.368Z'
  - status: complete
    at: '2025-12-09T14:08:16.894Z'
completed_at: '2025-12-09T14:08:16.894Z'
completed: '2025-12-09'
---

# Add Cursor Agent Support

> **Status**: ✅ Complete · **Priority**: Medium · **Created**: 2025-12-09 · **Tags**: ai-agents, cursor, cli, integration

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
- [x] Update AgentType to include 'cursor'
- [x] Add Cursor configuration to DEFAULT_AGENTS
- [x] Update MCP tool schema to include 'cursor' option
- [x] Update error messages to include cursor in available agents list
- [x] Update agent.test.ts to verify cursor agent presence
- [x] Test cursor agent list command
- [x] Test cursor agent run command (dry-run)
- [x] Test cursor agent config command
- [x] Verify error messages include cursor

## Test

- [x] `lean-spec agent list` shows cursor as an available agent
- [x] `lean-spec agent run <spec> --agent cursor --dry-run` succeeds
- [x] `lean-spec agent run <spec> --agent cursor` opens spec in Cursor (if installed)
- [x] Error messages include 'cursor' in available agents list
- [x] `lean-spec agent config cursor` sets cursor as default agent

## Implementation Summary

The following changes were made to add Cursor agent support:

1. **AgentType** - Added 'cursor' to the union type in `packages/cli/src/commands/agent.ts`
2. **DEFAULT_AGENTS** - Added cursor configuration with CLI command and context template
3. **Error messages** - Updated all error messages to include 'cursor' in available agents
4. **MCP tool schema** - Updated the agent_run tool schema in `packages/cli/src/mcp/tools/agent.ts`
5. **Tests** - Updated `agent.test.ts` to verify cursor agent is present in the list

All tests pass and manual verification confirms cursor can be:
- Listed as an available agent
- Set as the default agent
- Used with the `agent run` command
- Included in error messages for invalid agents

## Notes

Cursor is a popular AI-first code editor built on VS Code. It has built-in AI capabilities and integrates well with codebases. Unlike some other agents that can run autonomously, Cursor requires user interaction, so the agent command will open the spec in Cursor for the user to work with the AI assistant.
