# LeanSpec

<p align="center">
  <img src="https://github.com/codervisor/lean-spec-docs/blob/main/static/img/logo-with-bg.svg" alt="LeanSpec Logo" width="120" height="120">
</p>

<p align="center">
  <a href="https://github.com/codervisor/lean-spec/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/codervisor/lean-spec/ci.yml?branch=main" alt="CI Status"></a>
  <a href="https://www.npmjs.com/package/lean-spec"><img src="https://img.shields.io/npm/v/lean-spec.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/lean-spec"><img src="https://img.shields.io/npm/dm/lean-spec.svg" alt="npm downloads"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>

<p align="center">
  <a href="https://www.lean-spec.dev"><strong>Documentation</strong></a>
  •
  <a href="https://www.lean-spec.dev/zh-Hans/docs/guide/"><strong>中文文档</strong></a>
  •
  <a href="https://web.lean-spec.dev"><strong>Live Examples</strong></a>
  •
  <a href="https://www.lean-spec.dev/docs/tutorials/first-spec-with-ai"><strong>Tutorials</strong></a>
</p>

---

**Ship faster with higher quality. Lean specs that both humans and AI understand.**

LeanSpec brings agile principles to SDD (Spec-Driven Development)—small, focused documents (<2,000 tokens) that keep you and your AI aligned.

---

## Quick Start

```bash
# Try with a tutorial project
npx lean-spec init --example dark-theme
cd dark-theme && npm install && npm start

# Or add to your existing project
npm install -g lean-spec && lean-spec init
```

**Visualize your project:**

```bash
lean-spec board    # Kanban view
lean-spec stats    # Project metrics
lean-spec ui       # Web UI at localhost:3000
```

**Next:** [Your First Spec with AI](https://www.lean-spec.dev/docs/tutorials/first-spec-with-ai) (10 min tutorial)

---

## Why LeanSpec?

**High velocity + High quality.** Other SDD frameworks add process overhead (multi-step workflows, rigid templates). Vibe coding is fast but chaotic (no shared understanding). LeanSpec hits the sweet spot:

- **Fast iteration** - Living documents that grow with your code
- **AI performance** - Small specs = better AI output (context rot is real)
- **Always current** - Lightweight enough that you actually update them

📖 [Compare with Spec Kit, OpenSpec, Kiro →](https://www.lean-spec.dev/docs/guide/why-leanspec)

---

## AI Integration

Works with any AI coding assistant via MCP or CLI:

```json
{
  "mcpServers": {
    "lean-spec": { "command": "npx", "args": ["-y", "@leanspec/mcp"] }
  }
}
```

**OpenCode config (`opencode.json`):**

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "leanspec": {
      "type": "local",
      "command": ["npx", "-y", "@leanspec/mcp"]
    }
  }
}
```

**Compatible with:** VS Code Copilot, Claude Code, Gemini CLI, Cursor, Windsurf, OpenCode, Kiro CLI, Kimi CLI, Qodo CLI, Amp, Trae Agent, Qwen Code, Droid, and more.

📖 [Full AI integration guide →](https://www.lean-spec.dev/docs/guide/usage/ai-coding-workflow)

---

## Agent Skills

Teach your AI assistant the Spec-Driven Development methodology:

```bash
# Recommended (uses skills.sh)
lean-spec skill install

# Or directly via skills.sh
npx skills add codervisor/lean-spec -y
```

This installs the **leanspec-sdd** skill which teaches AI agents:
- When to create specs vs. implement directly
- How to discover existing specs before creating new ones
- Best practices for context economy and progressive disclosure
- Complete SDD workflow (Discover → Design → Implement → Validate)

**Compatible with:** Claude Code, Cursor, Windsurf, GitHub Copilot, OpenCode, and other [Agent Skills](https://skills.sh/) compatible tools.

📖 [View skill documentation →](skills/leanspec-sdd/SKILL.md)

---

## Features

| Feature             | Description                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| **📊 Kanban Board**  | `lean-spec board` - visual project tracking                                                       |
| **🔍 Smart Search**  | `lean-spec search` - find specs by content or metadata                                            |
| **🔗 Dependencies**  | Track spec relationships with `depends_on` and `related`                                          |
| **🎨 Web UI**        | `lean-spec ui` - browser-based dashboard                                                          |
| **📈 Project Stats** | `lean-spec stats` - health metrics and bottleneck detection                                       |
| **🤖 AI-Native**     | MCP server + CLI for AI assistants                                                                |
| **🖥️ Desktop App**   | Desktop app repo: [codervisor/lean-spec-desktop](https://github.com/codervisor/lean-spec-desktop) |

<p align="center">
  <img src="https://github.com/codervisor/lean-spec-docs/blob/main/static/img/ui/ui-board-view.png" alt="Kanban Board View" width="800">
</p>

---

## Requirements

### Runtime
- **Node.js**: `>= 20.0.0`
- **pnpm**: `>= 10.0.0` (preferred package manager)

### Development
- **Node.js**: `>= 20.0.0`
- **Rust**: `>= 1.70` (for building CLI/MCP/HTTP binaries)
- **pnpm**: `>= 10.0.0`

**Quick Check:**
```bash
node --version   # Should be v20.0.0 or higher
pnpm --version   # Should be 10.0.0 or higher
rustc --version  # Should be 1.70 or higher (dev only)
```

---

## Desktop App

The desktop application has moved to a dedicated repository:

- https://github.com/codervisor/lean-spec-desktop

Use that repository for desktop development, CI, and release workflows.

---

## Developer Workflow

Common development tasks using `pnpm`:

```bash
# Development
pnpm install             # Install dependencies
pnpm build               # Build all packages
pnpm dev                 # Start dev mode (UI + Core)
pnpm dev:web             # UI only
pnpm dev:cli             # CLI only

# Testing
pnpm test                # Run all tests
pnpm test:ui             # Tests with UI
pnpm test:coverage       # Coverage report
pnpm typecheck           # Type check all packages

# Rust
pnpm rust:build          # Build Rust packages (release)
pnpm rust:build:dev      # Build Rust (dev, faster)
pnpm rust:test           # Run Rust tests
pnpm rust:check          # Quick Rust check
pnpm rust:clippy         # Rust linting
pnpm rust:fmt            # Format Rust code

# CLI (run locally)
pnpm cli board           # Show spec board
pnpm cli list            # List specs
pnpm cli create my-feat  # Create new spec
pnpm cli validate        # Validate specs

# Documentation
pnpm docs:dev            # Start docs site
pnpm docs:build          # Build docs

# Release
pnpm pre-release         # Run all pre-release checks
pnpm prepare-publish     # Prepare for npm publish
pnpm restore-packages    # Restore after publish
```

See [package.json](package.json) for all available scripts.

---

## Documentation

📖 [Full Documentation](https://www.lean-spec.dev) · [CLI Reference](https://www.lean-spec.dev/docs/reference/cli) · [First Principles](https://www.lean-spec.dev/docs/advanced/first-principles) · [FAQ](https://www.lean-spec.dev/docs/faq) · [中文文档](https://www.lean-spec.dev/zh-Hans/)

## Community

💬 [Discussions](https://github.com/codervisor/lean-spec/discussions) · 🐛 [Issues](https://github.com/codervisor/lean-spec/issues) · 🤝 [Contributing](CONTRIBUTING.md) · 📋 [Changelog](CHANGELOG.md) · 📄 [LICENSE](LICENSE)

---

### Contact Me | 联系我

If you find LeanSpec helpful, feel free to add me on WeChat (note "LeanSpec") to join the discussion group.

如果您觉得 LeanSpec 对您有帮助，欢迎添加微信（备注 "LeanSpec"）加入交流群。

<p align="center">
  <img src="https://github.com/codervisor/lean-spec-docs/blob/main/static/img/qr-code.png" alt="WeChat Contact | 微信联系" height="280">
</p>
