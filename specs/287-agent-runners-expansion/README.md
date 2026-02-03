---
status: planned
created: 2026-02-03
priority: high
tags:
- cli
- runners
- ai-tools
- integrations
parent: 168-leanspec-orchestration-platform
deps:
- 288-runner-registry-consolidation
created_at: 2026-02-03T05:42:39.812085714Z
updated_at: 2026-02-03T06:19:51.438734320Z
---
# Agent Runners Expansion

> **Status**: planned · **Priority**: high · **Created**: 2026-02-03

## Overview

Expand the built-in agent runner registry to support the growing ecosystem of AI coding assistants. This spec adds 9 new runners to the unified registry.

> **Depends on**: [288-runner-registry-consolidation](../288-runner-registry-consolidation/README.md) - Consolidates runner.rs and ai_tools.rs into a single registry with detection config.

### Tools to Add

| Tool | Command | Install | Agent Instructions Support | Notes |
|------|---------|---------|---------------------------|-------|
| **Kiro CLI** | `kiro-cli` | `curl -fsSL https://cli.kiro.dev/install \| bash` | AGENTS.md, steering files | AWS product. Includes MCP, custom agents, smart hooks |
| **Kimi CLI** | `kimi` | `pip install kimi-cli` | AGENTS.md | MoonshotAI CLI, uses Kimi K2 model |
| **Qodo CLI** | `qodo` | `npm install -g @qodo/command` | AGENTS.md | AI code review agents, CI/webhook modes, MCP server mode |
| **Amp** | `amp` | `curl -fsSL https://ampcode.com/install.sh \| bash` | AGENTS.md | Frontier coding agent, terminal TUI + VS Code/Cursor/Windsurf/JetBrains/Neovim |
| **Trae Agent** | `trae` | `pip install trae-agent` | AGENTS.md | ByteDance's AI coding agent CLI |
| **Qwen Code** | `qwen-code` | `pip install qwen-code` | AGENTS.md | Alibaba's Qwen LLM coding assistant |
| **Cursor CLI** | `agent` | `curl https://cursor.com/install -fsS \| bash` | AGENTS.md | Cursor IDE's CLI agent, interactive/plan/ask modes, Cloud Agent handoff |
| **Gemini CLI** | `gemini` | `npm install -g @google/gemini-cli` or `brew install gemini-cli` | GEMINI.md | Already in AI tools detection, needs runner registry entry |

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

// Kimi CLI (MoonshotAI)
runners.insert(
    "kimi".to_string(),
    RunnerDefinition {
        id: "kimi".to_string(),
        name: Some("Kimi CLI".to_string()),
        command: "kimi".to_string(),
        args: Vec::new(),
        env: HashMap::from([
            ("MOONSHOT_API_KEY".to_string(), "${MOONSHOT_API_KEY}".to_string()),
        ]),
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

// Trae Agent (ByteDance)
runners.insert(
    "trae".to_string(),
    RunnerDefinition {
        id: "trae".to_string(),
        name: Some("Trae Agent".to_string()),
        command: "trae".to_string(),
        args: Vec::new(),
        env: HashMap::new(),
    },
);

// Qwen Code (Alibaba)
runners.insert(
    "qwen-code".to_string(),
    RunnerDefinition {
        id: "qwen-code".to_string(),
        name: Some("Qwen Code".to_string()),
        command: "qwen-code".to_string(),
        args: Vec::new(),
        env: HashMap::from([
            ("DASHSCOPE_API_KEY".to_string(), "${DASHSCOPE_API_KEY}".to_string()),
        ]),
    },
);

// Cursor CLI
runners.insert(
    "cursor".to_string(),
    RunnerDefinition {
        id: "cursor".to_string(),
        name: Some("Cursor CLI".to_string()),
        command: "agent".to_string(),
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

### 2. Detection Config for New Runners

Each new runner includes detection config (uses consolidated `RunnerDefinition` from spec 288):

| Runner | Config Dirs | Env Vars | Symlink |
|--------|-------------|----------|---------|
| claude | `.claude` | `ANTHROPIC_API_KEY` | CLAUDE.md |
| gemini | `.gemini` | `GEMINI_API_KEY` | GEMINI.md |
| kiro | `.kiro` | `AWS_ACCESS_KEY_ID` | - |
| kimi | `.kimi` | `MOONSHOT_API_KEY` | - |
| qodo | `.qodo` | - | - |
| trae | `.trae` | - | - |
| qwen-code | `.qwen-code` | `DASHSCOPE_API_KEY` | - |
| amp | `.amp` | - | - |
| opencode | - | - | - |
| cursor | `.cursor` | - | - |
| windsurf | `.windsurf` | - | - |

### 3. LeanSpec Support Matrix (Documentation)

Update documentation with support matrix:

| Tool | VibeKanban | OpenSpec Native | Agent Instructions File |
|------|------------|-----------------|------------------------|
| Claude Code | ✅ | ✅ (slash commands) | CLAUDE.md → AGENTS.md |
| OpenAI Codex | ✅ | ✅ (slash commands) | AGENTS.md |
| GitHub Copilot | ✅ | ✅ (slash commands) | AGENTS.md |
| Cursor | ✅ | ✅ (slash commands) | AGENTS.md |
| OpenCode | ✅ | ✅ (slash commands) | AGENTS.md |
| Qwen Code | ✅ | ✅ (AGENTS.md) | AGENTS.md |
| Gemini CLI | ✅ | ✅ (AGENTS.md) | GEMINI.md → AGENTS.md |
| Amp | ✅ | ✅ (AGENTS.md) | AGENTS.md |
| Kiro CLI | ✅ | ✅ (AGENTS.md) | AGENTS.md, steering files |
| Kimi CLI | ✅ | ✅ (AGENTS.md) | AGENTS.md |
| Droid CLI | ✅ | ✅ (AGENTS.md) | AGENTS.md |
| Qodo CLI | ✅ | ⚠️ (via MCP) | AGENTS.md |
| Trae Agent | ✅ | ✅ (AGENTS.md) | AGENTS.md |

## Plan

- [ ] **Phase 1: Runner Registry** - Add new runners to `runner.rs`
  - [ ] Add Kiro CLI runner
  - [ ] Add Kimi CLI runner
  - [ ] Add Gemini CLI runner
  - [ ] Add Amp runner
  - [ ] Add Qodo CLI runner
  - [ ] Add Trae Agent runner
  - [ ] Add Qwen Code runner
  - [ ] Add Cursor CLI runner
  - [ ] Add Droid runner (already in ai_tools, add to runners)
  
- [ ] **Phase 2: Detection Config** - Add detection config to new runners
  - [ ] Add detection config to Kiro runner
  - [ ] Add detection config to Kimi runner
  - [ ] Add detection config to Qodo runner
  - [ ] Add detection config to Trae runner
  - [ ] Add detection config to Qwen Code runner
  - [ ] Add detection config to Cursor CLI runner
  - [ ] Add detection config to Amp runner
  - [ ] Add detection config to OpenCode runner
  
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
- [ ] `RunnerRegistry::builtins()` includes all new runners (15 total after expansion)
- [ ] Detection config present for all new runners
- [ ] Environment variable interpolation works for API keys
- [ ] `lean-spec init` shows new tools in selection

## Notes

### Research Findings

**Kiro CLI** (AWS):
- Install: `curl -fsSL https://cli.kiro.dev/install | bash`
- Command: `kiro-cli`
- Features: Custom agents, MCP support, smart hooks, steering files
- Agent instructions: AGENTS.md or `.kiro/steering.md`

**Kimi CLI** (MoonshotAI):
- GitHub: https://github.com/MoonshotAI/kimi-cli
- Install: `pip install kimi-cli`
- Command: `kimi`
- Features: Uses Kimi K2 model, terminal-based coding assistant
- Env: `MOONSHOT_API_KEY`

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

**Trae Agent** (ByteDance):
- GitHub: https://github.com/bytedance/trae-agent
- Install: `pip install trae-agent`
- Command: `trae`
- Features: ByteDance's AI coding agent, SOLO mode for autonomous coding
- Agent instructions: AGENTS.md

**Qwen Code** (Alibaba):
- GitHub: https://github.com/QwenLM/qwen-code
- Install: `pip install qwen-code`
- Command: `qwen-code`
- Features: Alibaba's Qwen LLM-based coding assistant
- Env: `DASHSCOPE_API_KEY`

**Cursor CLI** (Anysphere):
- Website: https://cursor.com/docs/cli/overview
- Install: `curl https://cursor.com/install -fsS | bash`
- Command: `agent`
- Features: Interactive mode, Plan mode, Ask mode, non-interactive/print mode, Cloud Agent handoff, session resume
- Already in ai_tools.rs detection, needs runner registry entry
