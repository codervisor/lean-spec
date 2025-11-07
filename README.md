# LeanSpec

<p align="center">
  <img src="docs-site/static/img/logo-with-bg.svg" alt="LeanSpec Logo" width="120" height="120">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/lean-spec"><img src="https://img.shields.io/npm/v/lean-spec.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/lean-spec"><img src="https://img.shields.io/npm/dm/lean-spec.svg" alt="npm downloads"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>

---

## Specs that fit in AI working memory

Traditional 2,000-line RFCs overflow AI context windows. Your AI agent can't help because it can't fit the full context.

```diff
- Heavyweight process (multi-step workflows) → AI context overflow
- Vibe coding (no specs) → Team misalignment
+ LeanSpec: Structure without overhead
```

**LeanSpec: A lean SDD methodology for human + AI collaboration.**

Specs under 300 lines. Intent-focused. Machine-readable. Adapts to your workflow—from solo dev to enterprise.

*Lean = adaptive and progressive. Tools (CLI/MCP) support the methodology.*

<p align="center">
  <a href="#quick-start-5-minutes"><strong>Quick Start (5 Minutes) →</strong></a> •
  <a href="https://www.lean-spec.dev"><strong>Documentation</strong></a> •
  <a href="https://www.lean-spec.dev/docs/examples"><strong>Examples</strong></a>
</p>

---

## The SDD Dilemma

### Scenario 1: Context Overflow 🔴

You paste a traditional spec into Cursor. **"Context too large."** Your AI agent can't help—it can't fit the full context. Back to manual implementation.

### Scenario 2: Stale Documentation 📄

Your team has beautiful specs. None match the current code. Nobody updates them because it's too painful. They're documentation theater.

### Scenario 3: Wrong Tool for the Job ⚖️

You tried automated code generation tools—powerful but heavyweight. You tried vibe coding—fast but team gets misaligned. Where's the **lightweight spec methodology**?

**LeanSpec solves this:**
- ✅ Specs fit in AI context windows (<300 lines)
- ✅ Structured enough for AI agents to understand
- ✅ Flexible enough to grow with your team
- ✅ CLI & MCP tools to support the workflow

---

## How LeanSpec is Different

**From Automated Tools (like [Spec Kit](https://github.com/speckai/speckai)):**
- ❌ No multi-step workflows or slash commands
- ❌ No code generation or task execution
- ✅ Just specs for team alignment and AI context

**From Lightweight Approaches (vibe coding):**
- ❌ Not "just chat with AI"
- ✅ Enough structure for AI agents to act on
- ✅ Team alignment through shared specs
- ✅ Maintainable documentation

**From Change-Tracking Systems (like [OpenSpec](https://github.com/openspec-dev/openspec)):**
- ❌ No proposals or change folders
- ❌ No diff-based workflows
- ✅ Direct spec editing with version control
- ✅ Philosophy over process

**LeanSpec = Just the specs.** Markdown files with structure. No ceremony, no overhead.

---

## How It Works

### A Real LeanSpec in Action

Here's an actual spec from this project (287 lines):

```yaml
---
status: in-progress
created: 2025-11-01
tags: [cli, dx]
priority: high
---

# Unified Dashboard

## Overview
Combine `lspec board` and `lspec stats` into a single, comprehensive
project health view. Give users instant insight into project status,
bottlenecks, and team velocity.

## Design
- Board view (Kanban columns)
- Key metrics (completion rate, avg spec size)
- Bottleneck detection (specs >400 lines, stale specs)
- Health score (0-100)

## Plan
1. Merge board + stats logic
2. Add health scoring algorithm
3. Implement bottleneck detection
4. Add color-coded indicators

## Success Criteria
- Shows full project state in <5 seconds
- Identifies bottlenecks automatically
- Used daily by team leads
```

**Notice:**
- ✅ Under 300 lines (fits in AI + human working memory)
- ✅ Intent is clear ("what" and "why")
- ✅ Implementation details are minimal (not a PRD)
- ✅ Both human and AI can understand
- ✅ Structured metadata (status, tags, priority)

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

## Features Designed for AI-First Development

### 🤖 AI-Native Integration

Works seamlessly with popular AI coding tools:

- **GitHub Copilot** - AI pair programmer in VS Code & JetBrains IDEs
- **Claude Code** - Anthropic's AI coding assistant
- **OpenAI Codex** - OpenAI's coding agent (CLI, IDE, cloud)
- **Cursor / Windsurf** - AI-first code editor built on VS Code

MCP-native specs. Works with any tool that supports Model Context Protocol.

### 📊 Workflow Visibility

Track progress without leaving the terminal:

```bash
$ lspec board

📋 Spec Kanban Board

📅 Planned (11)
  🟠 High Priority
    • readme-redesign-ai-first
    • validate-output-lint-style
  
⏳ In Progress (2)
    • unified-dashboard
    • mcp-error-handling

✅ Complete (14)
    • stats-dashboard-refactor
    • git-backfill-timestamps
    ...
```

```bash
$ lspec stats

📊 Project Stats

  Total: 27 specs  |  Active: 13  |  Complete: 14
  Completion: 52%  |  Avg size: 287 lines
```

Simple, focused CLI for spec status and team visibility.

### 🎨 Progressive Structure

Start simple, add complexity only when you need it:

```yaml
# Day 1: Solo dev
status: planned

# Week 2: Small team  
status: in-progress
tags: [api, feature]
priority: high

# Month 3: Enterprise
assignee: alice
epic: PROJ-123
sprint: 2025-Q4-S3
```

Custom fields fully supported. Adapts to your workflow as you grow.

### ⚡ Actually Maintainable

**The problem:** Traditional specs get stale because updating them is too painful.

**LeanSpec solution:**
- **Short specs** - Fits in AI context window for easy updates
- **CLI tools** - Quick viewing and editing from terminal
- **AI-friendly format** - Structured markdown AI agents can parse and update
- **Version control** - Git tracks changes, diffs show what evolved

**Result:** Specs light enough to actually keep in sync with code.

---

## Quick Start (5 Minutes)

### 1. Install & Initialize

```bash
npm install -g lean-spec
cd your-project
lspec init
```

### 2. Work with Your AI Tool

**In Cursor, Copilot, or any AI coding assistant:**

```
👤 You: "Create a spec for user authentication with OAuth2."

🤖 AI: [runs lspec create user-authentication]
      "I've created specs/001-user-authentication/README.md.
      Here's the spec..."

👤 You: "Now implement the OAuth2 flow based on this spec."

🤖 AI: [reads spec, implements code]
      "I've implemented the OAuth2 provider in src/auth/oauth.ts..."
```

### 3. Track Progress

```bash
# Check project status
lspec board

# View spec with AI-friendly output
lspec view user-authentication --json

# Update status as you progress
lspec update user-authentication --status in-progress
```

**The workflow:**
1. ✅ Ask AI to create spec (it uses `lspec create`)
2. ✅ AI reads spec and implements (spec fits in context)
3. ✅ Track with `lspec board` / `lspec stats`
4. ✅ Update status as work progresses

**Why this works:**
- Specs <300 lines → Fit in AI context window
- Structured format → AI can parse and act on
- CLI tools → AI knows how to use them
- You drive, AI executes

**Next steps:**
- 📘 [Full CLI Reference](https://www.lean-spec.dev/docs/cli-reference) - All commands
- 🎨 [Choose a Template](https://www.lean-spec.dev/docs/templates) - Minimal, standard, or enterprise
- 🤖 [AI Agent Setup](AGENTS.md) - Configure Cursor, Claude, Aider

---

## Choose the Right Tool

Not every project needs the same level of structure. Here's when to use what:

| Use This | When You Need |
|----------|---------------|
| **[Spec Kit](https://github.com/speckai/speckai)** | Automated code generation from specs • Multi-step workflows |
| **[OpenSpec](https://github.com/openspec-dev/openspec)** | Change proposals and delta tracking • Brownfield modifications |
| **LeanSpec** | AI-native specs that fit in context • Human + AI collaboration • Solo to enterprise |
| **Vibe Coding** | Rapid prototyping • Solo experiments • Trivial features |

**Why LeanSpec?** The only SDD methodology designed from first principles for AI context windows. Specs that both humans and AI can actually use.

---

## Who Uses LeanSpec

### AI-First Development Teams
Give agents clear context without context window overload. Works with Cursor, Copilot, Aider, Claude.

### Scaling Startups
One methodology from solo dev → team → enterprise. Add structure progressively as you grow.

### Teams Seeking Balance
Need structure for alignment and AI context, but heavyweight processes slow you down.

### Developers Building AI Agents
MCP-native specs. Structured input format agents can parse reliably.

---

## We Practice What We Preach

**LeanSpec is built using LeanSpec.** Every feature, refactor, and design decision has a spec. All specs follow the first principles—under 300 lines, AI-readable, actively maintained.

**Real velocity from zero to official launch:**
- **6 days** from first commit to production
- Full-featured CLI, MCP server, documentation site
- 54 specs written and implemented—all with AI agents
- Derived first principles from practicing LeanSpec 

We dogfood our own methodology. Specs that fit in AI context enable the velocity we promise.

→ [Browse our specs](https://github.com/codervisor/lean-spec/tree/main/specs)

---

## When to Use (and Skip) Specs

| Use LeanSpec When: | Skip It When: |
|---------------------|---------------|
| ✅ Features span multiple files/components | ❌ Trivial bug fixes |
| ✅ Architecture decisions need alignment | ❌ Self-explanatory refactors |
| ✅ Guiding AI agents on complex features | ❌ Pure API reference (use code comments) |
| ✅ Design rationale should be documented | ❌ Quick experiments |
| ✅ Team needs to coordinate work | ❌ Changes are obvious |

**Philosophy:** Write specs when they add clarity. Skip them when they don't.

---

## Learn More

### 📚 Documentation
- [Getting Started Guide](https://www.lean-spec.dev/docs/getting-started) - Complete setup walkthrough
- [First Principles](https://www.lean-spec.dev/docs/guide/first-principles) - The philosophy behind LeanSpec
- [CLI Reference](https://www.lean-spec.dev/docs/cli-reference) - All commands with examples

### 🛠️ Integrations
- [AI Agent Configuration](AGENTS.md) - Cursor, Copilot, Aider setup
- [MCP Server](docs/MCP-SERVER.md) - Claude Desktop integration
- [VS Code Extension](https://www.lean-spec.dev/docs/tools/vscode) - Enhanced editor support

### 🎓 Guides
- [Custom Fields](https://www.lean-spec.dev/docs/guide/custom-fields) - Adapt to your workflow
- [Sub-Specs](https://www.lean-spec.dev/docs/guide/sub-specs) - Manage complex features
- [Folder Structure](https://www.lean-spec.dev/docs/guide/folder-structure) - Organize your specs

### 🤝 Community
- [GitHub Issues](https://github.com/codervisor/lean-spec/issues) - Report bugs or request features
- [Contributing Guide](CONTRIBUTING.md) - Join the project
- [Examples](https://www.lean-spec.dev/docs/examples) - Real-world usage patterns

---

## License

MIT - See [LICENSE](LICENSE)

---

<p align="center">
  <strong>Spec-Driven Development without the overhead.</strong><br>
  Keep your specs short. Keep them clear. Keep them useful.
</p>
