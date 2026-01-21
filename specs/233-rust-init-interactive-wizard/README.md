---
status: planned
created: 2026-01-21
priority: high
tags:
- rust
- cli
- ux
- migration
- ai-tools
- mcp
depends_on:
- 026-init-pattern-selection
- 226-agent-skills-init-integration
created_at: 2026-01-21T05:20:00Z
updated_at: 2026-01-21T06:50:50.755807879Z
---

# Port AI Tools & MCP Configuration to Rust CLI

## Overview

**Problem:** The Node.js `lean-spec init` command has an interactive wizard for AI tools and MCP configuration. The Rust implementation only prompts for project name and uses hardcoded defaults. Users must manually configure AI tool symlinks and MCP server settings after initialization.

**Solution:** Port the AI tools and MCP configuration prompts from Node.js to the Rust CLI implementation.

**Why Now:** The Rust CLI is becoming the canonical implementation (spec 181). Maintaining parity with Node.js features ensures users get a consistent, smooth onboarding experience regardless of which implementation they use.

**Dependencies:**
- Spec 026 completed AI tool detection in Node.js (reference implementation)
- Spec 226 planned agent skills auto-installation (coordinate to avoid overlap)
- Spec 210 provides guidance on template selection (explicitly excluded from this scope)

## Design

### Current Rust Implementation
- Only prompts for project name
- No AI tools configuration
- No MCP server setup
- Creates basic AGENTS.md without detecting tools
- Creates basic config with defaults

### Rationale for Focused Scope

**Note**: The Node.js version includes template and folder pattern selection. Both are being **excluded** because:
- **Template selection**: Spec [210-json-configurable-spec-templates](../210-json-configurable-spec-templates/README.md) provides a better approach via JSON-configurable sections
- **Folder pattern selection**: Users rarely need to change from simple sequential numbering; can be added later if demand exists
- Focus on the high-value interactive features: AI tool detection and MCP configuration

### Target Node.js Features to Port

**1. AI Tools Symlink Configuration**
- Detect AI tools (Claude Code, Gemini CLI, Copilot)
- Prompt user to create symlinks (CLAUDE.md, GEMINI.md, etc.)
- Create AGENTS.md as primary file

**2. MCP Server Configuration**
- Detect MCP-capable tools (Claude Code, VSCode, Cursor, Windsurf)
- Prompt user to configure MCP server entries
- Update tool-specific config files

Example output:
```bash
$ lean-spec init

Project name (detected: my-project): my-project

🔍 Detected AI tools:
   Claude Desktop (found config at ~/.config/Claude/claude_desktop_config.json)
      └─ MCP server configuration available
   GitHub Copilot (VS Code extension detected)

✓ Created AGENTS.md

? Create symlinks for additional AI tools?
  ◉ Claude Desktop (CLAUDE.md)
  ◯ Gemini CLI (GEMINI.md)

? Configure MCP server for which tools?
  ◉ Claude Desktop
  ◉ VS Code
  ◯ Cursor
  ◯ Windsurf

✓ Created CLAUDE.md → AGENTS.md
✓ Configured MCP server for Claude Desktop
✓ Configured MCP server for VS Code

LeanSpec initialized successfully! 🎉
```

### Implementation Approach

**Dependencies to Add:**
- `dialoguer` - already used for Input, add Select and MultiSelect for checkboxes
- Keep existing colored output styling

**File Structure:**
```
rust/leanspec-cli/src/commands/
├── init.rs                    # Main init command (update)
└── init/                      # New module
    ├── mod.rs                 # Module exports
    ├── prompts.rs             # Interactive prompts
    ├── ai_tools.rs            # AI tool detection & symlink creation
    └── mcp_config.rs          # MCP server configuration
```

**AI Tool Detection Logic:**
- Check for Claude Desktop config file (`~/.config/Claude/claude_desktop_config.json` on Linux)
- Check for VS Code with Copilot extension
- Check for Cursor executable
- Check for Windsurf executable
- Check for Gemini CLI in PATH

**MCP Configuration Paths:**
- **Claude Desktop**: `~/.config/Claude/claude_desktop_config.json`
- **VS Code**: `.vscode/settings.json` (workspace MCP config)
- **Cursor**: Similar to VS Code
- **Windsurf**: TBD based on tool documentation

## Plan

### Phase 1: AI Tool Detection (2-3 days)
- [ ] Create init/ module structure (mod.rs, ai_tools.rs, mcp_config.rs, prompts.rs)
- [ ] Port AI tool detection logic from Node.js
  - [ ] Claude Desktop (config file check)
  - [ ] VS Code + Copilot (extension check)
  - [ ] Cursor, Windsurf, Gemini CLI
- [ ] Extract shared detection logic for reuse by spec 226
- [ ] Add unit tests for detection logic (mock filesystem)

### Phase 2: Interactive Prompts (2-3 days)
- [ ] Add dialoguer dependency to Cargo.toml
- [ ] Implement symlink creation prompts in prompts.rs
- [ ] Add multi-select for AI tool symlinks
- [ ] Add multi-select for MCP server configuration
- [ ] Cross-platform symlink handling (Windows compatibility)
- [ ] Test interactive flow manually

### Phase 3: MCP Configuration (3-4 days)
- [ ] Implement MCP config file reading/writing in mcp_config.rs
- [ ] Add MCP server entry generation
- [ ] Platform-specific config paths (Linux, macOS, Windows)
- [ ] JSON parsing/updating for each tool's config format
- [ ] Backup existing configs before modification
- [ ] Add integration tests for MCP config

### Phase 4: CLI Flags & Non-Interactive Mode (1-2 days)
- [ ] Add --yes flag (auto-detect and configure everything)
- [ ] Add --no-ai-tools flag (skip AI tool configuration)
- [ ] Add --no-mcp flag (skip MCP server configuration)
- [ ] Test all flag combinations
- [ ] Update CLI help text

### Phase 5: Documentation & Validation (1-2 days)
- [ ] Update documentation for new flags
- [ ] Add examples to README
- [ ] Cross-platform testing (Linux, macOS, Windows)
- [ ] Validate backward compatibility
- [ ] Run full E2E test suite

## Test

### Manual Testing
- [ ] AI tool detection works correctly on systems with different tools
- [ ] Symlink creation works (CLAUDE.md, GEMINI.md, etc.)
- [ ] MCP configuration updates tool-specific config files correctly
- [ ] --yes flag auto-detects and configures everything
- [ ] --no-ai-tools skips AI tool configuration
- [ ] --no-mcp skips MCP server configuration
- [ ] Backward compatibility maintained (works on systems with no AI tools)

### Unit Tests
- [ ] AI tool detection logic (mock filesystem)
- [ ] MCP config file parsing and generation
- [ ] Symlink creation (cross-platform)

### Integration Tests
- [ ] Full init flow with AI tools detected
- [ ] Init flow with no AI tools detected
- [ ] MCP config entries are valid JSON

## Notes

**Related Specs:**
- [026-init-pattern-selection](../026-init-pattern-selection/README.md) - Original feature spec (marked complete, but only in Node.js)

**Migration Strategy:**
This is a Rust port of existing Node.js functionality. Reference implementation:
- `packages/cli/dist/chunk-NFCMHV5N.js` - initCommand() around line 2845
- Look for: AI tool detection (`getDefaultAIToolSelection`), MCP config (`getDefaultMcpToolSelection`)
- Skip: template selection, folder pattern selection (not high-value features)

**Coordination with Spec 226 (Agent Skills):**
This spec focuses on AI tool symlinks (CLAUDE.md, GEMINI.md) and MCP configuration. Spec 226 handles agent skills installation (.github/skills/). Both use similar AI tool detection logic but serve different purposes:
- **This spec**: Symlinks to AGENTS.md for AI tool-specific prompts
- **Spec 226**: Install leanspec-sdd skill for SDD methodology

No overlap or conflict - both should integrate into init flow.

**Considerations:**
- Node.js version uses `@clack/prompts`, Rust uses `dialoguer` - UX should be similar but not identical
- AI tool detection logic needs to be ported (check for config files, executables)
- MCP config file paths differ by platform (Linux, macOS, Windows)
- Consider making MCP features optional if complex (can be Phase 2)
- Cross-platform symlink handling (Windows requires different approach)
- Share AI tool detection logic with spec 226 (avoid duplication)

**Priority Rationale:**
High priority because AI tool integration is a key differentiator for LeanSpec. Smooth onboarding with automatic detection improves first-time user experience significantly.