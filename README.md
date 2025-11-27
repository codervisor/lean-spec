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
  <a href="https://www.lean-spec.dev/zh-Hans/"><strong>中文文档</strong></a>
  •
  <a href="#quick-start"><strong>Quick Start</strong></a>
  •
  <a href="https://web.lean-spec.dev"><strong>Live Examples</strong></a>
  •
  <a href="https://github.com/codervisor/lean-spec/blob/main/CHANGELOG.md"><strong>Changelog</strong></a>
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
    "lean-spec": { "command": "npx", "args": ["@leanspec/mcp"] }
  }
}
```

**Compatible with:** VS Code Copilot, Cursor, Windsurf, Claude Code, Gemini CLI, and more.

📖 [Full AI integration guide →](https://www.lean-spec.dev/docs/guide/usage/ai-coding-workflow)

---

## Features

| Feature | Description |
|---------|-------------|
| **📊 Kanban Board** | `lean-spec board` - visual project tracking |
| **🔍 Smart Search** | `lean-spec search` - find specs by content or metadata |
| **🔗 Dependencies** | Track spec relationships with `depends_on` and `related` |
| **🎨 Web UI** | `lean-spec ui` - browser-based dashboard |
| **📈 Project Stats** | `lean-spec stats` - health metrics and bottleneck detection |
| **🤖 AI-Native** | MCP server + CLI for AI assistants |

<p align="center">
  <img src="https://github.com/codervisor/lean-spec-docs/blob/main/static/img/ui/ui-board-view.png" alt="Kanban Board View" width="800">
</p>

---

## Documentation

📖 [Full Documentation](https://www.lean-spec.dev) · [CLI Reference](https://www.lean-spec.dev/docs/reference/cli) · [First Principles](https://www.lean-spec.dev/docs/advanced/first-principles) · [中文文档](https://www.lean-spec.dev/zh-Hans/)

## Community

💬 [Discussions](https://github.com/codervisor/lean-spec/discussions) · 🐛 [Issues](https://github.com/codervisor/lean-spec/issues) · 🤝 [Contributing](CONTRIBUTING.md)

---

### 联系我 (Contact Me)

如果您觉得 LeanSpec 对您有帮助，欢迎添加微信（备注 "LeanSpec"）加入交流群。

<p align="center">
  <img src="https://github.com/codervisor/lean-spec-docs/blob/main/static/img/qr-code.png" alt="微信联系" height="280">
</p>