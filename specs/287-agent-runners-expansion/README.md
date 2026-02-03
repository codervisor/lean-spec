---
status: planned
created: '2026-02-03'
tags: [cli, runners, ai-tools, integrations]
priority: high
created_at: '2026-02-03T05:42:39.812085714+00:00'
---

# Agent Runners Expansion

> **Status**: planned · **Priority**: high · **Created**: 2026-02-03

## Overview

Expand the built-in agent runner registry and AI tool detection to support the growing ecosystem of AI coding assistants. The current implementation supports 6 runners (claude, copilot, codex, opencode, aider, cline) in the runner registry and 8 AI tools for detection. This spec adds support for new mainstream AI CLI tools.

### Current State

**Runners (`runner.rs`)**: claude, copilot, codex, opencode, aider, cline

**AI Tools (`ai_tools.rs`)**: Copilot, Claude, Gemini, Cursor, Windsurf, Aider, Codex, Droid

### Tools to Add

| Tool | Command | Install | Agent Instructions Support | Notes |
|------|---------|---------|---------------------------|-------|
| **Kiro CLI** | `kiro-cli` | `curl -fsSL https://cli.kiro.dev/install \| bash` | AGENTS.md, steering files | AWS product, successor to Amazon Q CLI. Includes MCP, custom agents, smart hooks |
| **Amazon Q CLI** (deprecated) | `q` | brew/DMG/AppImage | AGENTS.md | Transitioned to Kiro CLI. Still usable but maintenance only |
| **Qodo CLI** | `qodo` | `npm install -g @qodo/command` | AGENTS.md | AI code review agents, CI/webhook modes, MCP server mode |
| **Amp** | `amp` | `curl -fsSL https://ampcode.com/install.sh \| bash` | AGENTS.md | Frontier coding agent, terminal TUI + VS Code/Cursor/Windsurf/JetBrains/Neovim |
| **Gemini CLI** | `gemini` | `npm install -g @google/gemini-cli` or `brew install gemini-cli` | GEMINI.md | Already in AI tools detection, needs runner registry entry |
| **Trae** | IDE only | Download from trae.ai | AGENTS.md | ByteDance's AI IDE. Has SOLO mode for autonomous coding. No standalone CLI |
| **Qwen Agent** | Python API | `pip install qwen-agent` | AGENTS.md | Framework-based, not a standalone CLI. Skip for runners |

## Design

### 1. Runner Registry Updates (`runner.rs`)

Add new runners to `RunnerRegistry::builtins()`:

```rust
// Kiro CLI (AWS)
runners.insert(
    "kiro".to_string(),
    RunnerDefinition {
        id: "kiro".to_string(),
        name: Some("Kiro CLI".to_string()),
        command: "kiro-cli".to_string(),
        args: Vec::new(),
        env: HashMap::new(),
    },
);

// Amazon Q CLI (deprecated, maps to Kiro)
runners.insert(
    "amazon-q".to_string(),
    RunnerDefinition {
        id: "amazon-q".to_string(),
        name: Some("Amazon Q CLI".to_string()),
        command: "q".to_string(),
        args: Vec::new(),
        env: HashMap::new(),
    },
);

// Gemini CLI
runners.insert(
    "gemini".to_string(),
    RunnerDefinition {
        id: "gemini".to_string(),
        name: Some("Gemini CLI".to_string()),
        command: "gemini".to_string(),
        args: Vec::new(),
        env: HashMap::from([
            ("GEMINI_API_KEY".to_string(), "${GEMINI_API_KEY}".to_string()),
        ]),
    },
);

// Amp
runners.insert(
    "amp".to_string(),
    RunnerDefinition {
        id: "amp".to_string(),
        name: Some("Amp".to_string()),
        command: "amp".to_string(),
        args: Vec::new(),
        env: HashMap::new(),
    },
);

// Qodo CLI
runners.insert(
    "qodo".to_string(),
    RunnerDefinition {
        id: "qodo".to_string(),
        name: Some("Qodo CLI".to_string()),
        command: "qodo".to_string(),
        args: Vec::new(),
        env: HashMap::new(),
    },
);

// Droid (already in ai_tools, add to runners)
runners.insert(
    "droid".to_string(),
    RunnerDefinition {
        id: "droid".to_string(),
        name: Some("Droid".to_string()),
        command: "droid".to_string(),
        args: Vec::new(),
        env: HashMap::new(),
    },
);
```

### 2. AI Tools Detection Updates (`ai_tools.rs`)

Add new tools to `AiTool` enum and detection config:

```rust
pub enum AiTool {
    Copilot,
    Claude,
    Gemini,
    Cursor,
    Windsurf,
    Aider,
    Codex,
    Droid,
    // New tools
    Kiro,
    AmazonQ,
    Qodo,
    Amp,
    OpenCode,  // Already in runners, add detection
}
```

Detection configurations for new tools:

| Tool | Commands | Config Dirs | Env Vars |
|------|----------|-------------|----------|
| Kiro | `kiro-cli` | `.kiro` | `AWS_ACCESS_KEY_ID` |
| AmazonQ | `q` | `.amazon-q` | `AWS_ACCESS_KEY_ID` |
| Qodo | `qodo` | `.qodo` | - |
| Amp | `amp` | `.amp` | - |
| OpenCode | `opencode` | - | - |

### 3. LeanSpec Support Matrix (Documentation)

Update documentation with support matrix:

| Tool | VibeKanban | OpenSpec Native | Agent Instructions File |
|------|------------|-----------------|------------------------|
| Claude Code | ✅ | ✅ (slash commands) | CLAUDE.md → AGENTS.md |
| OpenAI Codex | ✅ | ✅ (slash commands) | AGENTS.md |
| GitHub Copilot | ✅ | ✅ (slash commands) | AGENTS.md |
| Cursor | ✅ | ✅ (slash commands) | AGENTS.md |
| OpenCode | ✅ | ✅ (slash commands) | AGENTS.md |
| Qwen Code | ✅ | ⚠️ (limited) | AGENTS.md |
| Gemini CLI | ✅ | ✅ (AGENTS.md) | GEMINI.md → AGENTS.md |
| Amp | ✅ | ✅ (AGENTS.md) | AGENTS.md |
| Kiro CLI | ✅ | ✅ (AGENTS.md) | AGENTS.md, steering files |
| Droid CLI | ✅ | ✅ (AGENTS.md) | AGENTS.md |
| Qodo CLI | ✅ | ⚠️ (via MCP) | AGENTS.md |
| Trae | ✅ | ✅ (AGENTS.md) | AGENTS.md (IDE only) |

## Plan

- [ ] **Phase 1: Runner Registry** - Add new runners to `runner.rs`
  - [ ] Add Kiro CLI runner
  - [ ] Add Amazon Q CLI runner (deprecated notice)
  - [ ] Add Gemini CLI runner
  - [ ] Add Amp runner
  - [ ] Add Qodo CLI runner
  - [ ] Add Droid runner (already in ai_tools, add to runners)
  
- [ ] **Phase 2: AI Tool Detection** - Update `ai_tools.rs`
  - [ ] Add Kiro detection config
  - [ ] Add AmazonQ detection config
  - [ ] Add Qodo detection config
  - [ ] Add Amp detection config
  - [ ] Add OpenCode detection config
  - [ ] Update `all_tools()` function
  
- [ ] **Phase 3: Symlink Support** - Review symlink requirements
  - [ ] Kiro: uses AGENTS.md or steering files (`.kiro/steering.md`)
  - [ ] No new symlink requirements (all use AGENTS.md directly)

- [ ] **Phase 4: Documentation**
  - [ ] Update README with expanded tool list
  - [ ] Add support matrix to docs
  - [ ] Document runner configuration options

- [ ] **Phase 5: Testing**
  - [ ] Add unit tests for new runner definitions
  - [ ] Add detection tests with mocked commands

## Test

- [ ] All new runners compile and run with `cargo test`
- [ ] `RunnerRegistry::builtins()` includes all new runners
- [ ] `all_tools()` returns correct count (13 tools)
- [ ] Detection works when command is available
- [ ] Environment variable interpolation works for Gemini API key
- [ ] `lean-spec init` shows new tools in selection

## Notes

### Research Findings

**Kiro CLI** (AWS):
- Successor to Amazon Q CLI (open source → closed source transition)
- Install: `curl -fsSL https://cli.kiro.dev/install | bash`
- Command: `kiro-cli`
- Features: Custom agents, MCP support, smart hooks, steering files
- Agent instructions: AGENTS.md or `.kiro/steering.md`

**Amazon Q CLI** (deprecated):
- Command: `q` (CLI binary name)
- Now in maintenance mode, users encouraged to migrate to Kiro CLI
- Still works but no new features

**Qodo CLI** (formerly Codium):
- Install: `npm install -g @qodo/command`
- Command: `qodo`
- Features: Custom review agents, CI mode, webhook mode, MCP server mode
- Focus on code review and quality

**Amp** (Sourcegraph):
- Install: `curl -fsSL https://ampcode.com/install.sh | bash`
- Command: `amp`
- Features: TUI terminal experience, deep mode, librarian, oracle
- VS Code/Cursor/Windsurf/JetBrains/Neovim extensions available

**Gemini CLI** (Google):
- Install: `npm install -g @google/gemini-cli` or `brew install gemini-cli`
- Command: `gemini`
- Features: 1M token context, Google Search grounding, GEMINI.md support
- Already detected in ai_tools.rs, needs runner registry entry

**Trae** (ByteDance):
- No standalone CLI, IDE-only
- Download from trae.ai
- Features: SOLO mode (autonomous coding), CUE (completion), MCP support
- Skip for runners, but supports AGENTS.md

**Qwen Agent** (Alibaba):
- Python framework, not CLI: `pip install qwen-agent`
- Use programmatically, not as a runner
- Skip for runners

### Excluded Tools

- **Trae**: IDE-only, no CLI to run
- **Qwen Agent**: Python framework, not a CLI tool
- **Kimi/Moonshot**: Appears to be API/chat only, no dedicated CLI found
