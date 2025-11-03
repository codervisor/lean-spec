---
status: planned
created: '2025-11-03'
tags: ["vscode","copilot","ai","ux"]
priority: high
---

# GitHub Copilot Chat Slash Commands & Prompts

> **Status**: 📅 Planned · **Priority**: High · **Created**: 2025-11-03

**Project**: lean-spec  
**Team**: Core Development

## Overview

Add LeanSpec integration directly into VS Code via GitHub Copilot Chat using slash commands and chat participants. This enables developers to interact with specs naturally through Copilot chat without leaving their coding context.

**Why now?** Copilot Chat is where developers already ask questions and get guidance. Integrating LeanSpec here makes specs discoverable and actionable at the exact moment they're needed—when writing code.

## Design

**Implementation Options:**

**Option A: Chat Participant** (Recommended)
- Register `@lspec` chat participant via VS Code extension
- Natural language interactions: `@lspec what's the status of auth system?`
- Context-aware: can reference open files, workspace, current work

**Option B: Slash Commands**
- Register commands like `/lspec-search`, `/lspec-create`, `/lspec-status`
- More structured but less conversational
- Fallback if participant API has limitations

**Key Features:**
- `/lspec search <query>` or `@lspec search for authentication specs`
- `/lspec status` or `@lspec show me what's in progress`
- `/lspec create` or `@lspec help me create a spec for this feature`
- `/lspec read <spec>` or `@lspec show me the API redesign spec`
- `/lspec update <spec> --status <status>` or `@lspec mark auth-system as complete`

**Context Integration:**
- Automatically detect related specs based on open files
- Suggest creating specs when Copilot detects new feature work
- Link spec references in code comments to full specs

**Architecture:**
- Extend existing VS Code extension (spec 006)
- Use VS Code Chat Participant API or Slash Command API
- Reuse LeanSpec CLI logic via TypeScript imports
- Return formatted markdown with links to specs

## Plan

- [ ] Research VS Code Chat Participant API vs Slash Command API
- [ ] Choose implementation approach (likely Chat Participant)
- [ ] Extend VS Code extension package
- [ ] Implement spec search with Copilot Chat
- [ ] Add spec status queries and visualization
- [ ] Enable spec creation through conversational flow
- [ ] Add spec reading/preview in chat
- [ ] Implement status updates
- [ ] Add context-aware spec suggestions
- [ ] Test with real development workflows
- [ ] Document in extension README and docs

## Test

- [ ] Chat participant/commands register successfully
- [ ] Search returns relevant results with correct formatting
- [ ] Status queries show accurate current state
- [ ] Create flow guides user through spec creation
- [ ] Read command displays spec content clearly
- [ ] Update commands modify specs correctly
- [ ] Context awareness suggests relevant specs
- [ ] Works alongside other Copilot features
- [ ] Handles workspaces without LeanSpec gracefully

## Notes

**GitHub Copilot Chat APIs:**
- Chat Participants: https://code.visualstudio.com/api/extension-guides/chat
- Language Model API for context

**Design Principles:**
- Conversational over command-line syntax
- Smart defaults based on workspace context
- Clear feedback and error messages
- Don't interrupt flow—augment it

**Related:**
- VS Code extension (spec 006) - base extension to extend
- MCP server (spec 019) - similar capabilities, different context (Claude Desktop vs VS Code)

**Open Questions:**
- Should this replace or complement the VS Code extension sidebar?
- Can we auto-generate spec suggestions from PR descriptions?
