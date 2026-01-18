---
status: planned
created: 2026-01-18
priority: high
tags:
- agent-skills
- compatibility
- cross-platform
- integration
- codex
- gemini-cli
- cursor
- vscode
- copilot
created_at: 2026-01-18T12:27:52.575289Z
updated_at: 2026-01-18T12:27:52.575289Z
---

# Cross-Tool Agent Skills Compatibility Strategy

## Overview

### Problem & Motivation

Agent Skills (https://agentskills.io) is an open standard adopted by multiple AI coding tools, but each tool has different implementation details, discovery mechanisms, and integration patterns. Currently, spec 211 focuses on creating the LeanSpec Agent Skill itself, but doesn't address the **compatibility challenges** across different AI coding platforms.

**Key Challenges**:
1. **Discovery Path Variance**: Different tools use different skills folder conventions
   - GitHub Copilot: `.github/skills/`, `~/.copilot/skills/`
   - Claude Code: `.claude/skills/`, `~/.claude/skills/`
   - Cursor: `.cursor/skills/`, `~/.cursor/skills/`
   - Codex CLI (OpenAI): `~/.codex/skills/`, `.codex/skills/`
   - Gemini CLI/Antigravity (Google): `~/.gemini/skills/`, `.gemini/skills/`
   - VS Code: `.vscode/skills/`, `~/.vscode/skills/`
   - Generic fallback: `.skills/`, `~/.skills/`

2. **Activation Behavior Differences**: Tools activate skills differently
   - Some auto-activate on project detection
   - Some require explicit user commands
   - Some use metadata hints for activation triggers

3. **Tool Availability Detection**: Skills need to reference correct tools (MCP vs CLI)
   - Some agents support MCP natively (Claude, Cursor)
   - Some need CLI fallback (Codex, Gemini CLI)
   - Tool availability varies by environment

4. **Prompt Format Variations**: Different LLM providers prefer different instruction styles
   - Anthropic: XML-structured prompts work well
   - OpenAI: JSON or natural language preferred
   - Google: Natural language with clear structure
   - Different token budgets and context windows

5. **Operating System Differences**: Cross-platform compatibility issues
   - Windows: No symlinks in standard installations
   - macOS/Linux: Symlinks work well
   - Path conventions differ (Windows `%USERPROFILE%` vs Unix `~`)

### Strategic Vision

**Goal**: Make LeanSpec Agent Skill universally compatible across all mainstream AI coding tools while maintaining a single source of truth for the SDD methodology.

```
┌────────────────────────────────────────────────────────────┐
│         LeanSpec Universal Agent Skill Support             │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Single SKILL.md source                                    │
│     ↓                                                      │
│  Tool-Specific Adapters (optional)                         │
│     ↓                                                      │
│  Platform Detection & Installation                         │
│     ↓                                                      │
│  Runtime Tool Discovery (MCP vs CLI)                       │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  Supported Tools:                                          │
│  • GitHub Copilot (VS Code, CLI)                          │
│  • Claude Code (Desktop, claude.ai)                        │
│  • Cursor IDE                                              │
│  • OpenAI Codex CLI                                        │
│  • Google Gemini CLI / Antigravity                         │
│  • Generic Agent Skills clients                            │
├────────────────────────────────────────────────────────────┤
│  Cross-Platform:                                           │
│  • Windows (copy-based installation)                       │
│  • macOS (symlinks + copy)                                 │
│  • Linux (symlinks + copy)                                 │
└────────────────────────────────────────────────────────────┘
```

### Research: Mainstream AI Coding Tools

Based on https://agentskills.io adoption list and ecosystem research:

| Tool | Provider | Skills Support | Location Pattern | MCP Support | Notes |
|------|----------|---------------|------------------|-------------|-------|
| **GitHub Copilot** | Microsoft | ✅ Active | `.github/skills/`, `~/.copilot/skills/` | ✅ Via extension | VS Code integration |
| **Claude Code** | Anthropic | ✅ Native | `.claude/skills/`, `~/.claude/skills/` | ✅ Native | Reference implementation |
| **Cursor** | Cursor Inc. | ✅ Active | `.cursor/skills/`, `~/.cursor/skills/` | ✅ Native | Fork of VS Code |
| **OpenAI Codex CLI** | OpenAI | ⚠️ Emerging | `~/.codex/skills/`, `.codex/skills/` | ❌ CLI only | Command-line first |
| **Gemini CLI** | Google | ⚠️ Emerging | `~/.gemini/skills/`, `.gemini/skills/` | ❌ CLI only | Antigravity project |
| **VS Code** | Microsoft | ✅ Via Copilot | `.vscode/skills/` | ✅ Via extension | Through Copilot extension |
| **Goose** | Block | ✅ Active | `~/.goose/skills/` | ⚠️ Partial | CLI-first agent |
| **OpenCode** | OpenCode AI | ✅ Active | `.opencode/skills/` | ✅ Native | Cloud-based IDE |
| **Letta** | Letta | ✅ Active | `~/.letta/skills/` | ⚠️ Custom | Memory-focused agent |
| **Factory** | Factory AI | ✅ Active | `.factory/skills/` | ✅ Native | Enterprise platform |

**Key Insight**: Most tools follow pattern: `.<tool>/skills/` (project) or `~/.<tool>/skills/` (user)

### Why This Matters

**For Users**:
- ✅ Install once, works with their preferred AI tool
- ✅ Switch tools without reconfiguration
- ✅ Team members can use different tools with same skill

**For LeanSpec**:
- ✅ Wider adoption across AI coding ecosystem
- ✅ Not locked to Claude/Anthropic ecosystem
- ✅ Future-proof as new tools adopt Agent Skills

**For the Ecosystem**:
- ✅ Demonstrates best practices for cross-tool compatibility
- ✅ Contributes to Agent Skills standard evolution
- ✅ Shows how to handle tool-specific differences

## High-Level Approach

### 1. Universal Skill Design

**Core Principle**: Write SKILL.md to be tool-agnostic, with tool-specific guidance in separate sections.

**SKILL.md Structure** (tool-agnostic):
```markdown
---
name: leanspec-sdd
description: Spec-Driven Development methodology for AI-assisted development. Use when working in a LeanSpec project.
compatibility: Requires lean-spec CLI or @leanspec/mcp server
metadata:
  author: LeanSpec
  version: 1.0.0
  homepage: https://leanspec.dev
  tools: claude,cursor,copilot,codex,gemini-cli,vscode,generic
---

# LeanSpec SDD Skill

## When to Use This Skill

Activate when:
- Repository contains `.lean-spec/config.json` or `specs/` folder
- User mentions LeanSpec, specs, or spec-driven development
- Planning multi-step features or breaking changes

## Core SDD Workflow

[Tool-agnostic workflow description]

## Tool Integration

### If You Have MCP Access
[Instructions for Claude, Cursor, VS Code with MCP]

### If You Have CLI Access
[Instructions for Codex, Gemini CLI, or any environment with lean-spec CLI]

### Tool Detection
[How to check which tools are available]
```

### 2. Tool-Specific Adapters (Optional)

**Strategy**: Provide optional tool-specific variants that reference the core skill but add platform-specific optimizations.

**Example Structure**:
```
.lean-spec/skills/
├── leanspec-sdd/           # Core universal skill
│   ├── SKILL.md
│   └── references/
│       ├── WORKFLOW.md
│       ├── BEST-PRACTICES.md
│       └── TOOLS.md        # NEW: Tool-specific guidance
└── adapters/               # Optional tool-specific variants
    ├── leanspec-sdd-claude/
    ├── leanspec-sdd-codex/
    └── leanspec-sdd-gemini/
```

**Adapter Strategy**:
- Start with universal skill only
- Add adapters if specific tools need optimization
- Adapters inherit from core, add tool-specific hints

### 3. Smart Installation System

**Enhanced Detection** (builds on spec 211, section 6):

```typescript
interface ToolConfig {
  name: string;
  provider: string;
  projectPaths: string[];
  userPaths: string[];
  mcpSupport: boolean;
  cliSupport: boolean;
  detectionHints: string[];  // Files/dirs that indicate tool presence
}

const TOOL_CONFIGS: ToolConfig[] = [
  {
    name: 'GitHub Copilot',
    provider: 'Microsoft',
    projectPaths: ['.github/skills'],
    userPaths: ['~/.copilot/skills'],
    mcpSupport: true,
    cliSupport: false,
    detectionHints: ['.vscode/extensions/github.copilot*'],
  },
  {
    name: 'Claude Code',
    provider: 'Anthropic',
    projectPaths: ['.claude/skills'],
    userPaths: ['~/.claude/skills'],
    mcpSupport: true,
    cliSupport: false,
    detectionHints: ['~/.claude/', '.claude/'],
  },
  {
    name: 'Cursor',
    provider: 'Cursor Inc.',
    projectPaths: ['.cursor/skills'],
    userPaths: ['~/.cursor/skills'],
    mcpSupport: true,
    cliSupport: false,
    detectionHints: ['~/.cursor/', '.cursor/'],
  },
  {
    name: 'OpenAI Codex CLI',
    provider: 'OpenAI',
    projectPaths: ['.codex/skills'],
    userPaths: ['~/.codex/skills'],
    mcpSupport: false,
    cliSupport: true,
    detectionHints: ['which codex', '~/.codex/'],
  },
  {
    name: 'Gemini CLI',
    provider: 'Google',
    projectPaths: ['.gemini/skills'],
    userPaths: ['~/.gemini/skills'],
    mcpSupport: false,
    cliSupport: true,
    detectionHints: ['which gemini', 'which antigravity'],
  },
  {
    name: 'VS Code',
    provider: 'Microsoft',
    projectPaths: ['.vscode/skills'],
    userPaths: ['~/.vscode/skills'],
    mcpSupport: true,
    cliSupport: false,
    detectionHints: ['.vscode/'],
  },
  {
    name: 'Generic',
    provider: 'Generic',
    projectPaths: ['.skills', '.lean-spec/skills'],
    userPaths: ['~/.skills'],
    mcpSupport: false,
    cliSupport: true,
    detectionHints: [],
  },
];
```

### 4. Cross-Platform Installation Strategy

**Windows Considerations**:
- No symlinks by default (require admin privileges)
- Use copy-based installation
- Handle path separators correctly (`\` vs `/`)
- Use `%USERPROFILE%` instead of `~`

**macOS/Linux**:
- Symlinks work well for single source of truth
- Still offer copy option for portability

**Installation Modes**:

| Mode | Windows | macOS/Linux | Pros | Cons |
|------|---------|-------------|------|------|
| **Copy** | ✅ Default | ✅ Option | Works everywhere | Manual sync on updates |
| **Symlink** | ⚠️ Requires admin | ✅ Default | Single source, auto-updates | Windows complexity |
| **Hybrid** | ✅ Copy to canonical, symlink others | ✅ Symlink to canonical | Best of both | More complex |

**Recommended**: 
- Windows: Always copy
- macOS/Linux: Offer symlink (default) or copy

### 5. Runtime Tool Discovery

**Problem**: Agent needs to know which LeanSpec tools are available (MCP server vs CLI).

**Solution**: Add tool discovery section to SKILL.md:

```markdown
## Tool Discovery

Before executing LeanSpec commands, check which tools are available:

### Check for MCP Server
If you have access to MCP tools, you'll see tools like:
- `leanspec-mcp_list`
- `leanspec-mcp_view`
- `leanspec-mcp_create`

Use these MCP tools directly (preferred method).

### Check for CLI
If MCP is not available, check for `lean-spec` CLI:
- Try running: `lean-spec --version`
- If successful, use CLI commands: `lean-spec list`, `lean-spec view`, etc.

### Fallback
If neither MCP nor CLI is available:
- Inform the user that LeanSpec tools are required
- Provide installation instructions: https://leanspec.dev/installation
```

### 6. Prompt Format Optimization

**Challenge**: Different LLMs process instructions differently.

**Approach**: Use universal markdown with optional model-specific hints:

**Universal Format** (works for all):
```markdown
## SDD Workflow

1. **Discovery Phase**
   - Always check existing specs first
   - Run: `lean-spec board` (or use MCP `list` tool)
   - Search for related specs: `lean-spec search "query"`

2. **Design Phase**
   - Create spec if needed: `lean-spec create <name>`
   - Keep under 2000 tokens
   - Validate: `lean-spec tokens <spec>`
```

**Model-Specific Optimization** (in references/):
- `references/CLAUDE-OPTIMIZATION.md` - XML-structured examples
- `references/OPENAI-OPTIMIZATION.md` - JSON-structured examples
- `references/GEMINI-OPTIMIZATION.md` - Natural language examples

**Implementation**: Core SKILL.md stays universal, references/ provide optional optimization guides.

## Acceptance Criteria

### Universal Compatibility

- [ ] **Single SKILL.md works across all major tools** - No tool-specific SKILLs required for basic functionality
- [ ] **MCP and CLI guidance included** - Clear instructions for both integration methods
- [ ] **Tool detection documented** - Agents can determine which tools are available
- [ ] **Cross-platform paths handled** - Works on Windows, macOS, Linux

### Installation System

- [ ] **Detects all mainstream AI tools** - GitHub Copilot, Claude, Cursor, Codex, Gemini CLI, VS Code
- [ ] **Supports multiple installation targets** - Can install to multiple skills folders simultaneously
- [ ] **Windows-compatible installation** - Copy-based installation works without admin privileges
- [ ] **macOS/Linux symlink support** - Optional symlink mode for single source of truth
- [ ] **CLI flags for automation** - Non-interactive installation with `--skill-<tool>` flags

### Testing & Validation

- [ ] **Tested with 3+ tools** - Verified working with Claude, Cursor, and at least one CLI-based tool
- [ ] **Cross-platform tested** - Verified on Windows, macOS, Linux
- [ ] **Agent Skills spec compliant** - Passes `skills-ref validate`
- [ ] **Documentation complete** - Installation guide covers all supported tools

### User Experience

- [ ] **Zero-config for common cases** - Auto-detects tools and suggests appropriate installation
- [ ] **Clear error messages** - Helpful feedback when tools not detected or installation fails
- [ ] **Migration path documented** - Clear upgrade path from existing installations
- [ ] **Multi-tool support** - Users can switch tools without reconfiguring

## Design Considerations

### 1. Universal SKILL.md Design Patterns

**Pattern 1: Conditional Sections**
```markdown
## Using LeanSpec Tools

### If You Have MCP Access (Preferred)
[MCP-specific instructions]

### If You Have CLI Access
[CLI-specific instructions]

### Neither Available?
[Installation instructions]
```

**Pattern 2: Tool Reference Table**
```markdown
| Action | MCP Tool | CLI Command |
|--------|----------|-------------|
| List specs | `list` | `lean-spec list` |
| View spec | `view` | `lean-spec view <spec>` |
| Create spec | `create` | `lean-spec create <name>` |
```

**Pattern 3: Progressive Disclosure**
- Core workflow in SKILL.md (300-400 lines)
- Tool-specific optimizations in references/ (optional reading)
- Keep token count low for initial skill load

### 2. Tool Detection Matrix

| Detection Method | Windows | macOS | Linux | Reliability |
|-----------------|---------|-------|-------|-------------|
| Check skills folder exists | ✅ | ✅ | ✅ | High |
| Check binary in PATH | ✅ | ✅ | ✅ | Medium |
| Check config files | ✅ | ✅ | ✅ | High |
| Check process list | ⚠️ Complex | ⚠️ Complex | ⚠️ Complex | Low |

**Recommended Detection Order**:
1. Check for tool-specific skills folders (`.github/skills/`, `.claude/skills/`, etc.)
2. Check for tool config files (`.vscode/extensions/`, `~/.cursor/`, etc.)
3. Check for binaries in PATH (`which codex`, `which gemini`, etc.)
4. Fall back to generic detection

### 3. Installation Strategy Decision Matrix

**Decision Factors**:
- Number of tools detected
- Operating system
- User preference (project vs user-level)
- Disk space considerations

**Scenarios**:

**Scenario A: Single Tool Detected**
```
Detected: Claude Code

? Install LeanSpec Agent Skill?
  ❯ Yes - Project-level (.claude/skills/leanspec-sdd/)
    Yes - User-level (~/.claude/skills/leanspec-sdd/)
    Yes - Both locations
    No - Skip for now
```

**Scenario B: Multiple Tools Detected**
```
Detected: Claude Code, GitHub Copilot, Cursor

? Where should we install the LeanSpec skill?
  ◉ .claude/skills/leanspec-sdd/
  ◉ .github/skills/leanspec-sdd/
  ◉ .cursor/skills/leanspec-sdd/
  ◯ ~/.claude/skills/leanspec-sdd/ (user-level)
  ◯ .lean-spec/skills/leanspec-sdd/ (canonical)
  
Install mode:
  ❯ Copy to each location (works everywhere)
    Symlink to canonical location (macOS/Linux only)
```

**Scenario C: No Tools Detected**
```
No AI coding tools detected.

? Install skill anyway?
  ❯ Yes - Generic location (.lean-spec/skills/leanspec-sdd/)
    Yes - Custom location (specify path)
    No - Skip for now
    
💡 Tip: The skill will work with any Agent Skills-compatible tool.
```

### 4. Symlink vs Copy Trade-offs

**Symlink Approach**:
```
.lean-spec/skills/leanspec-sdd/  ← Canonical location
  ├── SKILL.md
  └── references/

.claude/skills/leanspec-sdd/     → Symlink to .lean-spec/skills/leanspec-sdd/
.github/skills/leanspec-sdd/     → Symlink to .lean-spec/skills/leanspec-sdd/
.cursor/skills/leanspec-sdd/     → Symlink to .lean-spec/skills/leanspec-sdd/
```

**Pros**:
- ✅ Single source of truth
- ✅ Updates propagate automatically
- ✅ Saves disk space

**Cons**:
- ❌ Requires admin on Windows
- ❌ Breaks if canonical location moved
- ❌ Not portable across filesystems

**Copy Approach**:
```
.lean-spec/skills/leanspec-sdd/  ← Canonical location
.claude/skills/leanspec-sdd/     ← Full copy
.github/skills/leanspec-sdd/     ← Full copy
.cursor/skills/leanspec-sdd/     ← Full copy
```

**Pros**:
- ✅ Works everywhere (Windows, macOS, Linux)
- ✅ Portable across filesystems
- ✅ No admin privileges needed

**Cons**:
- ❌ Duplicates content
- ❌ Manual sync on updates
- ❌ Uses more disk space (~100KB per copy)

**Recommendation**: 
- **Default**: Copy (works everywhere)
- **Option**: Symlink (for macOS/Linux users who want single source)
- **Future**: Add `lean-spec sync-skill` command to update all copies

### 5. Tool-Specific Optimization Strategy

**When to Create Tool-Specific Variants**:

**DON'T create variants for**:
- Minor differences in syntax
- Different command names (handle with table in SKILL.md)
- Tool-specific UI differences

**DO create variants for**:
- Fundamentally different activation patterns
- Model-specific prompt optimizations (GPT-4 vs Claude vs Gemini)
- Tools with unique constraints (token limits, context windows)

**Example: When Variant Makes Sense**:
```
leanspec-sdd/              # Universal skill (works for 90% of tools)
leanspec-sdd-codex/        # Optimized for OpenAI Codex CLI
  - Adds JSON-structured examples
  - CLI-first instructions
  - OpenAI-specific prompt patterns
```

**Start Simple**: Launch with universal skill only, add variants based on user feedback.

### 6. Validation & Testing Strategy

**Validation Levels**:

1. **Format Validation** (required)
   - Run `skills-ref validate` on SKILL.md
   - Check frontmatter fields
   - Verify file structure

2. **Cross-Tool Testing** (required)
   - Test with Claude Code
   - Test with Cursor
   - Test with at least one CLI tool (Codex or Gemini CLI)

3. **Platform Testing** (required)
   - Windows 10/11
   - macOS (Intel + Apple Silicon)
   - Linux (Ubuntu/Debian)

4. **Integration Testing** (recommended)
   - End-to-end workflow with each tool
   - Verify tool detection works
   - Verify MCP vs CLI selection works

**Test Matrix**:

| Tool | Windows | macOS | Linux | Status |
|------|---------|-------|-------|--------|
| Claude Code | ⬜ | ⬜ | ⬜ | Pending |
| Cursor | ⬜ | ⬜ | ⬜ | Pending |
| GitHub Copilot | ⬜ | ⬜ | ⬜ | Pending |
| Codex CLI | ⬜ | ⬜ | ⬜ | Pending |
| Gemini CLI | ⬜ | ⬜ | ⬜ | Pending |

### 7. Documentation Structure

**User-Facing Docs**:
- `docs/agent-skills/installation.md` - Installation guide per tool
- `docs/agent-skills/compatibility.md` - Compatibility matrix
- `docs/agent-skills/troubleshooting.md` - Common issues per tool

**Developer-Facing Docs**:
- `docs/contributing/agent-skills.md` - How to extend skill support
- `docs/architecture/skills-integration.md` - Technical architecture
- `.lean-spec/skills/leanspec-sdd/references/TOOLS.md` - Tool-specific guidance

## Implementation Plan

### Phase 1: Research & Specification (1 week)

**Goals**:
- [ ] Research each tool's Agent Skills implementation
- [ ] Document discovery paths for each tool
- [ ] Identify tool-specific constraints and quirks
- [ ] Create compatibility matrix

**Deliverables**:
- Tool compatibility research document
- Discovery path mapping
- Constraint documentation

**Research Tasks**:
- [ ] Test Claude Code skills discovery
- [ ] Test Cursor skills discovery
- [ ] Test GitHub Copilot skills discovery
- [ ] Research Codex CLI skills support
- [ ] Research Gemini CLI skills support
- [ ] Document findings in compatibility matrix

### Phase 2: Universal SKILL.md Design (1 week)

**Goals**:
- [ ] Design tool-agnostic SKILL.md structure
- [ ] Write conditional guidance for MCP vs CLI
- [ ] Create tool reference table
- [ ] Keep under 500 lines (progressive disclosure)

**Deliverables**:
- Universal SKILL.md (passes `skills-ref validate`)
- references/TOOLS.md with tool-specific guidance
- Tool reference table for all supported tools

**Design Tasks**:
- [ ] Draft SKILL.md with conditional sections
- [ ] Create MCP vs CLI tool reference table
- [ ] Write tool discovery guidance
- [ ] Create references/TOOLS.md
- [ ] Validate with `skills-ref validate`
- [ ] Review token count (<2000 tokens for SKILL.md)

### Phase 3: Enhanced Detection System (1 week)

**Goals**:
- [ ] Implement tool detection for all mainstream tools
- [ ] Support Windows, macOS, Linux
- [ ] Handle multiple detected tools
- [ ] Add CLI flags for non-interactive mode

**Deliverables**:
- Enhanced `detectToolsAndSkillsLocations()` function
- Cross-platform path handling
- Installation mode selection (copy vs symlink)

**Implementation Tasks**:
- [ ] Extend TOOL_CONFIGS with Codex, Gemini CLI, VS Code
- [ ] Implement detection for each tool (config files, binaries, folders)
- [ ] Add Windows-specific path handling (`%USERPROFILE%`)
- [ ] Add macOS/Linux symlink support
- [ ] Create installation mode selection UI
- [ ] Add CLI flags: `--skill-codex`, `--skill-gemini`, `--skill-vscode`, etc.

### Phase 4: Installation System (1 week)

**Goals**:
- [ ] Implement copy-based installation (Windows default)
- [ ] Implement symlink-based installation (macOS/Linux option)
- [ ] Handle multiple target locations
- [ ] Validate installation success

**Deliverables**:
- Copy installation logic
- Symlink installation logic (with admin check on Windows)
- Multi-target installation support
- Post-installation validation

**Implementation Tasks**:
- [ ] Implement `copySkillToLocation(source, target)` function
- [ ] Implement `symlinkSkillToLocation(canonical, target)` function (macOS/Linux)
- [ ] Add Windows admin check for symlink mode
- [ ] Handle multiple simultaneous installations
- [ ] Verify installation success (file existence, permissions)
- [ ] Add rollback on failure

### Phase 5: Cross-Platform Testing (1 week)

**Goals**:
- [ ] Test on Windows 10/11
- [ ] Test on macOS (Intel + Apple Silicon)
- [ ] Test on Linux (Ubuntu/Debian)
- [ ] Test with 3+ different AI tools

**Deliverables**:
- Test reports per platform
- Tool compatibility verification
- Bug fixes and refinements

**Testing Tasks**:
- [ ] Windows testing (copy mode, path handling)
- [ ] macOS testing (symlink mode, both chip architectures)
- [ ] Linux testing (symlink mode, permissions)
- [ ] Claude Code integration test
- [ ] Cursor integration test
- [ ] GitHub Copilot integration test
- [ ] CLI tool testing (if available)
- [ ] Multi-tool installation test

### Phase 6: Documentation & Launch (3-5 days)

**Goals**:
- [ ] Write installation guides per tool
- [ ] Create compatibility matrix documentation
- [ ] Write troubleshooting guides
- [ ] Update main documentation

**Deliverables**:
- Tool-specific installation guides
- Compatibility matrix page
- Troubleshooting documentation
- Migration guide from spec 211 approach

**Documentation Tasks**:
- [ ] Create `docs/agent-skills/` directory
- [ ] Write installation guide for each tool
- [ ] Document detection behavior
- [ ] Create compatibility matrix table
- [ ] Write troubleshooting guide
- [ ] Update CHANGELOG.md
- [ ] Create announcement blog post

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Tool coverage** | 5+ mainstream tools | Tested and documented |
| **Cross-platform** | Windows + macOS + Linux | All platforms tested |
| **Installation success rate** | >95% | User feedback, telemetry |
| **Zero-config detection** | >80% | Auto-detection success rate |
| **User satisfaction** | >4/5 rating | User surveys |
| **Adoption across tools** | Usage in 3+ tools | Community reports |

## Technical Challenges

### Challenge 1: Windows Symlink Limitations

**Issue**: Windows requires administrator privileges for symlinks (or Developer Mode enabled).

**Mitigation**:
1. Default to copy mode on Windows
2. Detect if Developer Mode enabled or admin privileges available
3. Offer symlink as option with clear warning
4. Provide `lean-spec sync-skill` command for manual updates

### Challenge 2: Tool Detection Reliability

**Issue**: No standard way to detect which AI tools are installed.

**Mitigation**:
1. Use multiple detection methods (folders, binaries, config files)
2. Show detected tools and let user confirm/adjust
3. Allow manual tool selection
4. Document detection heuristics

### Challenge 3: Skill Activation Differences

**Issue**: Tools activate skills differently (auto vs manual).

**Mitigation**:
1. Document activation behavior per tool in TOOLS.md
2. Provide activation instructions in installation success message
3. Include "When to Use" section in SKILL.md
4. Test activation with each tool

### Challenge 4: Path Handling Across Platforms

**Issue**: Path conventions differ (Windows `\` vs Unix `/`, `~` expansion).

**Mitigation**:
1. Use Node.js `path` module for all path operations
2. Handle `~` expansion explicitly
3. Test on all platforms
4. Use platform-specific path separators

### Challenge 5: Keeping Copies in Sync

**Issue**: Copy-based installation creates multiple versions of skill.

**Mitigation**:
1. Include version in metadata field
2. Add `lean-spec check-skill-version` command
3. Add `lean-spec sync-skill` command to update all copies
4. Document manual sync process
5. Consider auto-update mechanism in future

## Dependencies

**Foundation** (from spec 211):
- ✅ **211-leanspec-as-anthropic-skill** - Base skill creation (in-progress) - **Blocks this spec**
- ✅ **126-ai-tool-auto-detection** - Tool detection logic (complete)
- ✅ **127-init-agents-merge-automation** - Init system (complete)

**Parallel Work**:
- **Agent Skills ecosystem research** - Understanding each tool's implementation

## Related Specs

- **211-leanspec-as-anthropic-skill** - Creates the base LeanSpec Agent Skill
- **126-ai-tool-auto-detection** - Detects installed AI tools
- **127-init-agents-merge-automation** - AGENTS.md merge automation
- **121-mcp-first-agent-experience** - MCP-first workflow

## Open Questions

1. **Should we create a skill registry/update mechanism?**
   - Users could check for skill updates
   - Auto-sync across installations
   - Pros: Always up-to-date | Cons: Complexity

2. **How to handle tool-specific optimizations?**
   - Create separate variant skills?
   - Or keep everything in references/?
   - **Recommendation**: Start with references/, add variants if needed

3. **Should we support custom skills paths?**
   - Let users specify arbitrary installation paths
   - Useful for non-standard setups
   - **Recommendation**: Yes, add `--skill-path <path>` flag

4. **Version management for multi-copy installations?**
   - How to track which copies are out of date?
   - Should we build auto-update into CLI?
   - **Recommendation**: Add `lean-spec check-skill-version` command

5. **Should we contribute tool detection back to Agent Skills spec?**
   - Discovery path recommendations per tool
   - Could benefit entire ecosystem
   - **Recommendation**: Yes, open PR to agentskills/agentskills

6. **How to handle tools not yet supporting Agent Skills?**
   - Document workarounds?
   - Provide alternative integration methods?
   - **Recommendation**: Document CLI-only fallback

7. **Should we create a skill marketplace/directory?**
   - Centralized place for users to discover LeanSpec skill
   - Could host on leanspec.dev/skills/
   - **Recommendation**: Consider for future release

## Marketing & Positioning

### Key Messages

**For Multi-Tool Users**:
- "Use LeanSpec SDD with your favorite AI coding tool"
- "Switch between Claude, Cursor, Copilot without reconfiguring"
- "One methodology, works everywhere"

**For Teams**:
- "Team members can use different AI tools, same workflow"
- "Install once per project, works with all compatible tools"
- "Future-proof as new tools adopt Agent Skills"

**For Tool Developers**:
- "Reference implementation for cross-tool compatibility"
- "Learn how to make Agent Skills work across platforms"
- "Contribute detection patterns back to ecosystem"

### Value Proposition

**Universal Compatibility**:
- Works with Claude, Cursor, Copilot, Codex, Gemini CLI, and more
- No lock-in to specific AI tool or vendor
- Future-proof as ecosystem evolves

**Zero-Config Installation**:
- Auto-detects your AI tools
- Installs to correct locations automatically
- Works on Windows, macOS, Linux

**Single Source of Truth**:
- Optional symlink mode for power users
- Update once, propagates everywhere (macOS/Linux)
- Version management for copy mode

## Next Steps

1. **Complete spec 211** - Base skill must exist first
2. **Research tool implementations** - Test each tool's skills support
3. **Design universal SKILL.md** - Ensure works across all tools
4. **Implement enhanced detection** - Support all mainstream tools
5. **Test cross-platform** - Verify Windows, macOS, Linux
6. **Launch publicly** - Position LeanSpec as cross-tool leader

## Notes

### Why Cross-Tool Compatibility Matters

**Current Fragmentation**:
- Users locked into tool-specific configurations
- Teams can't mix tools easily
- Migration costs are high

**With Universal Support**:
- Users choose best tool for them
- Teams collaborate regardless of tool choice
- Easy to try new tools as they emerge

### Relationship to Spec 211

**Spec 211**: Creates the LeanSpec Agent Skill (SKILL.md, references/, etc.)
**This Spec**: Makes that skill work across all mainstream AI tools

**Synergy**:
- 211 focuses on methodology encoding
- This spec focuses on distribution and compatibility
- Together, they provide complete cross-tool solution

### Agent Skills Ecosystem Contribution

By solving cross-tool compatibility, we can:
1. Contribute detection patterns to Agent Skills spec
2. Document best practices for tool compatibility
3. Help standardize discovery paths across ecosystem
4. Position LeanSpec as ecosystem leader

### Future: Tool-Specific Optimizations

Once universal skill is working, consider:
- **Claude-optimized variant**: XML-structured examples, Anthropic best practices
- **Codex-optimized variant**: JSON-structured examples, OpenAI patterns
- **Gemini-optimized variant**: Natural language emphasis, Google patterns

**Strategy**: Let usage data guide which optimizations to create.

---

**Key Insight**: Cross-tool compatibility isn't just about installation paths—it's about making LeanSpec's SDD methodology accessible to the entire AI coding ecosystem, regardless of which tools users prefer.