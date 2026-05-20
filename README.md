# LeanSpec

<p align="center">
  <img src="https://github.com/codervisor/lean-spec-docs/blob/main/static/img/logo-with-bg.svg" alt="LeanSpec Logo" width="120" height="120">
</p>

<p align="center">
  <a href="https://github.com/codervisor/leanspec/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/codervisor/leanspec/ci.yml?branch=main" alt="CI Status"></a>
  <a href="https://www.npmjs.com/package/@leanspec/cli"><img src="https://img.shields.io/npm/v/@leanspec/cli.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@leanspec/cli"><img src="https://img.shields.io/npm/dm/@leanspec/cli.svg" alt="npm downloads"></a>
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

**The tool-agnostic spec framework. Use any spec backend — your workflow, your rules.**

LeanSpec is a spec coding framework that works with whatever spec workflow you already use. GitHub Issues for personal projects, ADO Work Items for enterprise, Jira, Linear, or plain markdown — LeanSpec provides the unified interface, AI integration, and intelligence layer on top.

---

## Quick Start

```bash
# Markdown specs (default — works out of the box)
npm install -g @leanspec/cli && leanspec init

# Or try with a tutorial project
npx -p @leanspec/cli leanspec init --example dark-theme
cd dark-theme && npm install && npm start
```

**Configure your spec backend:**

```yaml
# leanspec.provider.yaml

# Option 1: Markdown files (default, zero config)
provider: markdown
directory: specs

# Option 2: GitHub Issues as specs
# provider: github
# owner: myuser
# repo: myproject

# Option 3: Azure DevOps Work Items as specs
# provider: ado
# organization: mycompany
# project: myproject
```

**Visualize your project (works with any backend):**

```bash
leanspec board    # Kanban view
leanspec stats    # Project metrics
leanspec ui       # Web UI at localhost:3000
```

**Next:** [Your First Spec with AI](https://www.lean-spec.dev/docs/tutorials/first-spec-with-ai) (10 min tutorial)

---

## Why LeanSpec?

**Your workflow, not ours.** Other SDD frameworks force you to adopt their spec format and tooling. LeanSpec adapts to whatever you already use:

- **Tool-agnostic** - GitHub Issues, ADO, Jira, Linear, Notion, or plain markdown
- **One interface** - Same CLI, MCP, and UI regardless of backend
- **AI-native** - Structured spec data for any AI coding assistant
- **Fast iteration** - Living documents that grow with your code
- **Context economy** - Small specs (<2K tokens) = better AI output

📖 [Compare with Spec Kit, OpenSpec, Kiro →](https://www.lean-spec.dev/docs/guide/why-leanspec)

---

## AI Integration

Works with any AI coding assistant via MCP or CLI:

```json
{
  "mcpServers": {
    "leanspec": { "command": "npx", "args": ["@leanspec/mcp"] }
  }
}
```

**Compatible with:** VS Code Copilot, Claude Code, Gemini CLI, Cursor, Windsurf, Kiro CLI, Kimi CLI, Qodo CLI, Amp, Trae Agent, Qwen Code, Droid, and more.

📖 [Full AI integration guide →](https://www.lean-spec.dev/docs/guide/usage/ai-coding-workflow)

---

## Spec Providers

LeanSpec connects to your existing spec workflow through a provider architecture:

| Provider | Backend | Status |
|----------|---------|--------|
| `markdown` | Local `specs/` directory (default) | **Available** |
| `github` | GitHub Issues + Projects | Planned |
| `ado` | Azure DevOps Work Items | Planned |
| `jira` | Jira tickets | Future |
| `linear` | Linear issues | Future |

Core LeanSpec concepts map naturally to each backend:

| Concept | GitHub Issues | ADO Work Items | Markdown |
|---------|--------------|----------------|----------|
| Spec ID | Issue number | Work Item ID | Directory name |
| Status | Labels | State field | Frontmatter |
| Priority | Labels | Priority field | Frontmatter |
| Tags | Labels | Tags | Frontmatter |
| Assignee | Assignees | Assigned To | Frontmatter |
| Content | Issue body | Description | Markdown body |

📖 [Provider architecture →](https://www.lean-spec.dev/docs/guide/providers)

---

## Agent Skills

Teach your AI assistant the Spec-Driven Development methodology:

```bash
# Install the leanspec skill
npx skills add codervisor/leanspec@leanspec
```

This installs the **leanspec** skill which teaches AI agents:
- When to create specs vs. implement directly
- How to discover existing specs before creating new ones
- Best practices for context economy and progressive disclosure
- Complete SDD workflow (Discover → Design → Implement → Validate)

**Compatible with:** Claude Code, Cursor, Windsurf, GitHub Copilot, and other [Agent Skills](https://skills.sh/) compatible tools.

📖 [Skill source →](skills/leanspec/SKILL.md)

---

## Features

| Feature             | Description                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| **📊 Kanban Board**  | `leanspec board` - visual project tracking                                                        |
| **🔍 Smart Search**  | `leanspec search` - find specs by content or metadata                                             |
| **🔗 Dependencies**  | Track spec relationships with `depends_on` and `related`                                          |
| **🎨 Web UI**        | `leanspec ui` - browser-based dashboard                                                           |
| **📈 Project Stats** | `leanspec stats` - health metrics and bottleneck detection                                        |
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

💬 [Discussions](https://github.com/codervisor/leanspec/discussions) · 🐛 [Issues](https://github.com/codervisor/leanspec/issues) · 🤝 [Contributing](CONTRIBUTING.md) · 📋 [Changelog](CHANGELOG.md) · 📄 [LICENSE](LICENSE)

---

### Contact Me | 联系我

If you find LeanSpec helpful, feel free to add me on WeChat (note "LeanSpec") to join the discussion group.

如果您觉得 LeanSpec 对您有帮助，欢迎添加微信（备注 "LeanSpec"）加入交流群。

<p align="center">
  <img src="https://github.com/codervisor/lean-spec-docs/blob/main/static/img/qr-code.png" alt="WeChat Contact | 微信联系" height="280">
</p>