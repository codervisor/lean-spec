# LeanSpec

<p align="center">
  <img src="docs-site/static/img/logo-with-bg.svg" alt="LeanSpec Logo" width="120" height="120">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/lean-spec"><img src="https://img.shields.io/npm/v/lean-spec.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/lean-spec"><img src="https://img.shields.io/npm/dm/lean-spec.svg" alt="npm downloads"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>

<p align="center">
  <a href="https://www.lean-spec.dev"><strong>Docs</strong></a>
  •
  <a href="https://www.lean-spec.dev/zh-Hans/"><strong>中文</strong></a>
</p>

---

## Specs that fit in AI working memory

Traditional 2,000-line RFCs overflow AI context windows. Your AI agent can't help because it can't fit the full context.

**LeanSpec: Pragmatic spec tooling for human + AI collaboration.**

Specs under 300 lines. Intent-focused. Machine-readable. Adapts to your workflow—from solo dev to enterprise.

<p align="center">
  <a href="#quick-start-5-minutes"><strong>Quick Start (5 Minutes) →</strong></a>
</p>

---

## Why LeanSpec?

**Context Overflow**: Traditional specs are too large for AI agents. You paste a 2,000-line RFC into Cursor—"Context too large." Back to manual implementation.

**Stale Docs**: Nobody maintains specs because updates are painful. They become documentation theater.

**Wrong Balance**: Code generation tools are heavyweight. Vibe coding lacks structure. Where's the middle ground?

**LeanSpec solves this:**
- Specs under 300 lines (fits in AI context)
- Structured for AI agents, flexible for teams
- CLI & MCP tools for actual workflow support

---

## How It's Different

**Not a code generation tool** - No automated workflows or slash commands. Just specs for alignment and AI context.

**Not "vibe coding"** - Enough structure for AI agents to act on. Team alignment through shared documentation.

**Not a change-tracking system** - Direct spec editing with version control. Philosophy over process.

LeanSpec is markdown files with structure. No ceremony, no overhead. Realistic 10-30% productivity improvement through better human-AI alignment.

📖 [Full comparison & realistic expectations →](https://www.lean-spec.dev/docs/comparison)

---

## How It Works

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
Combine `lean-spec board` and `lean-spec stats` into a single
project health view for instant status insight.

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

**Key characteristics:**
- Under 300 lines (fits in AI + human working memory)
- Intent is clear ("what" and "why")
- Implementation details are minimal
- Both human and AI can understand
- Structured metadata for tooling

---

## Core Principles

LeanSpec is built on fundamental constraints of working with AI:

### 🧠 Context Economy
**Specs <300 lines fit in working memory**

AI performance degrades with longer context. Human attention is limited. Keep specs concise so both can process them effectively.

### ✂️ Signal-to-Noise Maximization
**Every word informs decisions**

Each sentence must answer: "What decision does this inform?" Cut everything else. Dense, actionable specs respect reader attention.

### 📈 Progressive Disclosure
**Add structure when you feel pain**

Solo dev needs just `status`. Teams add `tags` and `priority`. Enterprise adds custom fields. Structure adapts to you, not vice versa.

### 🎯 Intent Over Implementation
**Capture "why", let "how" emerge**

Document problem, intent, and success criteria. Implementation details change—intent stays stable.

### 🌉 Bridge the Gap
**Both humans AND AI must understand**

Clear structure for AI parsing. Natural language for human reasoning. True human-AI collaboration requires both.

---

**These aren't preferences—they're constraints.** Physics (context windows), biology (working memory), and economics (token costs) dictate what works.

📖 [Deep dive: First Principles Guide →](https://www.lean-spec.dev/docs/guide/understanding#the-five-first-principles)

---

## Key Features

### 🤖 AI-Native Integration

Works with GitHub Copilot, Claude Code, OpenAI Codex, Cursor, and Windsurf. MCP-native specs work with any tool supporting Model Context Protocol.

### 📊 Workflow Visibility

Track progress from the terminal:

```bash
$ lean-spec board

📋 Spec Kanban Board

📅 Planned (11)
  🟠 High Priority
    • readme-redesign-ai-first
    • validate-output-lint-style
  
⏳ In Progress (2)
    • unified-dashboard
    • mcp-error-handling

✅ Complete (14)
```

```bash
$ lean-spec stats

📊 Project Stats

  Total: 27 specs  |  Active: 13  |  Complete: 14
  Completion: 52%  |  Avg size: 287 lines
```

### 🎨 Progressive Structure

Start simple, add complexity when needed:

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

---

## Quick Start (5 Minutes)

### 1. Install & Initialize

```bash
npm install -g lean-spec
cd your-project
lean-spec init
```

### 2. Work with Your AI Tool

**In Cursor, Copilot, or any AI coding assistant:**

```
👤 You: "Create a spec for user authentication with OAuth2."

🤖 AI: [runs lean-spec create user-authentication]
      "I've created specs/001-user-authentication/README.md..."

👤 You: "Now implement the OAuth2 flow based on this spec."

🤖 AI: [reads spec, implements code]
      "I've implemented the OAuth2 provider in src/auth/oauth.ts..."
```

### 3. Track Progress

```bash
lean-spec board              # Check project status
lean-spec view <spec> --json # AI-friendly output
lean-spec update <spec> --status in-progress
```

**Why this works:**
- Specs <300 lines fit in AI context window
- Structured format AI can parse and act on
- You drive, AI executes

**Next steps:**
- [Full CLI Reference](https://www.lean-spec.dev/docs/reference/cli)
- [Choose a Template](https://www.lean-spec.dev/docs/guide/templates)
- [AI Agent Setup](AGENTS.md)

---

## When to Use LeanSpec

| Use LeanSpec When: | Skip It When: |
|---------------------|---------------|
| Features span multiple files/components | Trivial bug fixes |
| Architecture decisions need alignment | Self-explanatory refactors |
| Guiding AI agents on complex features | Quick experiments |
| Design rationale should be documented | Changes are obvious |

📖 [Compare with other tools (Spec Kit, OpenSpec, etc.) →](https://www.lean-spec.dev/docs/comparison)

---

## Built With LeanSpec

**LeanSpec is built using LeanSpec.** Every feature has a spec. All follow the principles—under 300 lines, AI-readable, actively maintained.

**Velocity:** 6 days from first commit to production. Full CLI, MCP server, and documentation site. 54 specs written and implemented with AI agents.

→ [Browse our specs](https://github.com/codervisor/lean-spec/tree/main/specs)

---

## Learn More

- [Getting Started Guide](https://www.lean-spec.dev/docs/guide/getting-started) - Complete setup walkthrough
- [First Principles](https://www.lean-spec.dev/docs/guide/understanding#the-five-first-principles) - The philosophy behind LeanSpec
- [CLI Reference](https://www.lean-spec.dev/docs/reference/cli) - All commands with examples
- [AI Agent Configuration](AGENTS.md) - Cursor, Copilot, Aider setup
- [MCP Server](docs/MCP-SERVER.md) - Claude Desktop integration
- [GitHub Issues](https://github.com/codervisor/lean-spec/issues) - Report bugs or request features
- [Contributing Guide](CONTRIBUTING.md) - Join the project

---

## License

MIT - See [LICENSE](LICENSE)

---

<p align="center">
  <strong>Spec-Driven Development without the overhead.</strong><br>
  Keep your specs short. Keep them clear. Keep them useful.
</p>
