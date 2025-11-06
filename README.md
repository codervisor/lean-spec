# LeanSpec

<p align="center">
  <img src="docs-site/static/img/logo-with-bg.svg" alt="LeanSpec Logo" width="120" height="120">
</p>

<p align="center">
  <strong>Spec-Driven Development for the AI era</strong><br>
  Clarity without overhead. Structure that adapts, not constrains.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/lean-spec"><img src="https://img.shields.io/npm/v/lean-spec.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/lean-spec"><img src="https://img.shields.io/npm/dm/lean-spec.svg" alt="npm downloads"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>

<p align="center">
  📚 <a href="https://www.lean-spec.dev"><strong>Documentation</strong></a> •
  🚀 <a href="#quick-start"><strong>Quick Start</strong></a> •
  💡 <a href="https://www.lean-spec.dev/docs/examples"><strong>Examples</strong></a>
</p>

---

## Why LeanSpec?

```diff
- 30-page specs that AI can't fit in context
- Rigid templates that don't match your workflow  
- Docs that get stale because they're painful to update
+ <300 line specs optimized for human + AI understanding
+ Flexible structure that grows with your team
+ Lightweight enough to actually maintain
```

**The problem**: Traditional SDD is either too heavy (AI context overload, nobody maintains it) or too light (lacks detail AI needs to act on).

**LeanSpec solves this**: Specs clear enough for AI agents to implement. Lean enough for humans to maintain.

---

## ✨ Key Features

<table>
<tr>
<td width="33%" valign="top">

### 🎯 Context Economy
Specs fit in working memory (<300 lines). Both humans and AI can actually read them.

</td>
<td width="33%" valign="top">

### 📈 Progressive Growth
Start minimal. Add fields as you need them. No upfront complexity.

```yaml
# Day 1
status: planned

# Month 3
+ tags: [api]
+ priority: high
+ assignee: alice
```

</td>
<td width="33%" valign="top">

### 🤖 AI-Native
Works with Cursor, Copilot, Aider, Claude via MCP. Clear specs = better code.

</td>
</tr>
</table>

### Built-in Workflow Tools

```bash
$ lspec board
┌─────────────────────────────────────────────┐
│  📋 PLANNED    🚧 IN PROGRESS   ✅ COMPLETE │
│  • api-v2     • user-auth      • cli-tool  │
│  • dashboard  • db-migration   • docs-site │
└─────────────────────────────────────────────┘

$ lspec stats
�� Project Health: 23 specs • 8 complete • 12 in-progress • 3 planned
```

---

## Core Principles

LeanSpec is built on 5 first principles:

1. **Context Economy** - Specs fit in working memory (<300 lines)
2. **Signal-to-Noise** - Every word informs decisions
3. **Progressive Disclosure** - Add complexity only when needed
4. **Intent Over Implementation** - Capture "why," let "how" emerge
5. **Bridge the Gap** - Both humans and AI must understand

These aren't principles we chose—they're constraints we discovered. LeanSpec works because it aligns with how humans and AI actually work.

📖 [Deep dive: First Principles Guide →](https://www.lean-spec.dev/docs/guide/first-principles)

---

## 🚀 Quick Start

```bash
# Install
npm install -g lean-spec

# Initialize
cd your-project
lspec init

# Create your first spec
lspec create user-authentication

# View and manage
lspec list                    # See all specs
lspec board                   # Kanban view
lspec view user-authentication
lspec update user-authentication --status=in-progress
```

**Next steps**: 
- 📘 [CLI Reference](https://www.lean-spec.dev/docs/cli-reference) - All commands with examples
- 🗂️ [Folder Structure Options](https://www.lean-spec.dev/docs/guide/folder-structure) - Flat, date-based, or custom grouping
- 🎨 [Templates](https://www.lean-spec.dev/docs/templates) - Choose minimal, standard, or enterprise

---

## 💡 Use Cases

| Situation | Action |
|-----------|--------|
| ✅ Multi-file features | Write a spec |
| ✅ Architecture decisions | Write a spec |
| ✅ Guiding AI agents | Write a spec |
| ❌ Trivial bug fixes | Skip it, just fix |
| ❌ Self-explanatory refactors | Skip it |

---

## 🤝 Who Uses LeanSpec

- **AI-powered dev teams** - Give agents clear context without context window overload
- **Cursor/Copilot/Aider users** - SDD that fits your AI workflow  
- **Scaling startups** - One approach from solo dev → team → enterprise
- **Teams outgrowing docs** - Need structure without heavyweight processes

---

## 📚 Learn More

**Getting Started**
- [Installation & Setup](https://www.lean-spec.dev/docs/getting-started)
- [AI Agent Configuration](AGENTS.md) - Connect with Cursor, Claude, Aider
- [MCP Server Setup](docs/MCP-SERVER.md) - Claude Desktop integration

**Core Concepts**
- [First Principles](https://www.lean-spec.dev/docs/guide/first-principles) - The philosophy behind LeanSpec
- [Custom Fields](https://www.lean-spec.dev/docs/guide/custom-fields) - Adapt to your workflow
- [Sub-Specs](https://www.lean-spec.dev/docs/guide/sub-specs) - Manage complex features

**Resources**
- [Examples](https://www.lean-spec.dev/docs/examples) - Real-world usage
- [VS Code Extension](https://www.lean-spec.dev/docs/tools/vscode) - Enhanced editor support
- [Contributing](CONTRIBUTING.md) - Join the project

---

## 📄 License

MIT - See [LICENSE](LICENSE)
