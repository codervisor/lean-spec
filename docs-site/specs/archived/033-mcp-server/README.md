---
status: complete
created: '2025-11-03'
tags:
  - integration
  - mcp
  - ai
priority: high
completed: '2025-11-03'
---

# MCP Server Integration

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-03 · **Tags**: integration, mcp, ai

**Project**: lean-spec  
**Team**: Core Development

## Overview

Build a Model Context Protocol (MCP) server for LeanSpec that enables AI assistants (Claude Desktop, Cline, etc.) to interact with LeanSpec projects. This allows AI agents to read specs, create new ones, update status, search, and visualize project state—directly from their native environment.

**Why now?** MCP is the emerging standard for AI-tool integration. Supporting it positions LeanSpec as AI-native and enables seamless workflows where agents can discover, understand, and contribute to specs without context switching.

## Design

**Architecture:**
- TypeScript MCP server (`packages/mcp-server/`)
- Implements MCP protocol for tools, prompts, and resources
- Reuses existing CLI logic via shared core package

**MCP Tools (exposed to AI):**
- `lean-spec_list` - List specs with filtering
- `lean-spec_search` - Full-text search across specs
- `lean-spec_read` - Read full spec content
- `lean-spec_create` - Create new spec
- `lean-spec_update` - Update spec frontmatter/status
- `lean-spec_stats` - Get project statistics
- `lean-spec_board` - Get Kanban board view
- `lean-spec_deps` - Show dependencies

**MCP Resources (browsable by AI):**
- `spec://<spec-name>` - Individual spec content
- `board://kanban` - Current board state
- `stats://overview` - Project statistics

**MCP Prompts (quick actions for users):**
- "Create feature spec" - Guided spec creation
- "Update spec status" - Quick status changes
- "Find related specs" - Dependency discovery

**Configuration:**
- Add to Claude Desktop config or any MCP-compatible client
- Auto-discover project root from config file
- Support multiple projects via config path parameter

## Plan

- [ ] Set up MCP server package structure
- [ ] Implement MCP protocol handlers (tools, resources, prompts)
- [ ] Wrap CLI commands as MCP tools
- [ ] Add resource providers for browseable content
- [ ] Create helpful prompt templates
- [ ] Write setup instructions for Claude Desktop
- [ ] Test with Claude Desktop and other MCP clients
- [ ] Document in `docs/ai-integration/mcp-server.md`

## Test

- [ ] MCP server starts and responds to protocol handshake
- [ ] All tools execute successfully and return valid data
- [ ] Resources are browseable and return correct content
- [ ] Prompts generate appropriate responses
- [ ] Works with Claude Desktop in real project
- [ ] Error handling for invalid project paths
- [ ] Multiple projects can be configured simultaneously

## Notes

**MCP Protocol Reference:** https://modelcontextprotocol.io/

**Related Work:**
- VS Code extension (spec 006) - complementary UX for different context
- PM integrations (planned) - MCP could expose sync status

**Implementation Notes:**
- Consider using `@modelcontextprotocol/sdk` for TypeScript
- Keep server stateless; read from filesystem on each request
- Reuse validation and config logic from core CLI
