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
  <a href="https://github.com/codervisor/lean-spec/tree/main/specs"><strong>Live Examples</strong></a>
</p>

---

**Lean specifications for AI-assisted development. Start simple. Iterate fast. Stay aligned.**

LeanSpec brings agile principles to technical specs—small, focused documents that evolve with your understanding. Concise enough (&lt;2,000 tokens) for both humans and AI to process without context rot.

---

## The Problem: Context Rot

You're working with an AI coding assistant. You feed it a comprehensive 2,000-line RFC with every detail:

```
🤖 AI: "I'll help you implement this feature..."
     [Produces mediocre code that misses key requirements]
```

**The issue isn't hitting context limits—it's context rot.**

Even with 200K token windows, AI performance degrades significantly with verbose specs:
- **Lost signal** - Important decisions buried in 50 pages of detail
- **Cognitive overload** - Humans can't hold >7 concepts in working memory
- **Spec decay** - Nobody updates 2,000-line docs, so they become stale
- **Implementation drift** - By the time you're done writing, requirements changed

Traditional specs fail because they're too heavyweight. Vibe coding fails because there's no shared understanding.

## The Solution: Lean Specs

**LeanSpec = Agile principles applied to specifications**

Start with minimal structure. Add detail iteratively as you learn. Keep specs focused and actionable.

- **Simple** - Markdown files with minimal ceremony
- **Small** - Under 2,000 tokens so AI maintains high performance
- **Iterative** - Update specs as understanding evolves
- **Adaptive** - Progressive structure grows with your needs

```yaml
---
status: in-progress
created: 2025-11-01
tags: [api, auth]
priority: high
---

# OAuth2 Authentication

## Problem
Users need secure third-party login without managing passwords.

## Solution
Implement OAuth2 flow with Google and GitHub providers.

## Success Criteria
- Users can sign in with Google/GitHub
- Tokens refresh automatically
- Session persists across browser restarts
```

That's it. **287 tokens.** Both humans and AI understand the full context immediately.

## What Makes It Different

**Living documents, not upfront design** - Start with 3 lines. Update as you learn. Specs evolve with your code instead of rotting in a wiki.

**Progressive structure** - Solo dev? Just status. Growing team? Add tags. Enterprise? Custom fields. Structure emerges from real needs, not "just in case" planning.

**AI-native workflow** - Built for AI collaboration from day one. MCP integration + CLI commands mean your AI assistant reads, creates, and manages specs autonomously.

**Proven velocity** - Built LeanSpec itself in 10 days: 80+ specs, full CLI/MCP/Web UI, production-ready. 90%+ AI-assisted development.

📖 [Compare with Spec Kit, OpenSpec, Vibe Coding →](https://www.lean-spec.dev/docs/comparison)

---

## How It Works

### Real Example from This Project

Here's [spec 106](https://github.com/codervisor/lean-spec/tree/main/specs/106-ui-package-documentation) - documentation for the UI package:

```yaml
---
status: complete
created: 2025-11-18
tags: []
priority: medium
---

# UI Package Documentation and Integration

## Overview
The `@leanspec/ui` package and `lean-spec ui` CLI command are 
complete and functional, but lack comprehensive documentation.

## Problems
- Users don't know the UI exists
- Missing usage clarity and integration guidance
- No docs-site page for visual spec management

## Design
Create comprehensive documentation:
1. New guide: Visual Mode (how to use UI)
2. New reference: UI Package (technical details)
3. Update CLI reference with `ui` command
4. Add to Quick Start flow

## Success Criteria
- ✅ Full coverage in docs site
- ✅ Prominent in Quick Start
- ✅ Clear discovery path for users
- ✅ Troubleshooting guide included
```

**Total size:** 1,847 tokens. Complete feature documentation with design and implementation plan.

<p align="center">
  <img src="https://github.com/codervisor/lean-spec-docs/blob/main/static/img/ui/ui-spec-detail.png" alt="Spec Detail View" width="800">
  <br>
  <em>Spec detail view showing structure, metadata, and content</em>
</p>

### The AI Workflow

```bash
# 1. Create spec with your AI assistant
👤 You: "Create a spec for user authentication with OAuth2"
🤖 AI: [creates specs/002-oauth-authentication/README.md]

# 2. AI implements based on spec
👤 You: "Implement spec 002"
🤖 AI: [reads spec, writes code, tests, updates spec]

# 3. Track progress
$ lean-spec board
📋 Planned (3)  ⏳ In Progress (1)  ✅ Complete (8)
```

**Why this works:**
- **Lean** - Small specs avoid context rot, maintain AI performance
- **Simple** - Clear structure AI can parse, humans can scan
- **Iterative** - Update spec as you learn, keep it in sync
- **Focused** - Intent explicit enough to guide implementation

---

## Core Principles

LeanSpec applies lean thinking to specifications:

**🧠 Context Economy** - Keep specs under 2,000 tokens. AI performance degrades with verbosity even in 200K windows. Humans can't hold >7 concepts in working memory.

**✂️ Signal-to-Noise** - Every word must inform decisions. Test: "What decision does this sentence enable?" If it doesn't answer, cut it.

**🎯 Intent Over Implementation** - Document why and what. Let how emerge through iteration. Requirements evolve—capture stable intent, not volatile details.

**🌉 Bridge the Gap** - Clear structure (for AI) + natural language (for humans) = true collaboration. Simple markdown with just enough metadata.

**📈 Progressive Disclosure** - Start minimal. Add structure only when you feel pain. Like agile ceremonies, complexity emerges from real needs.

📖 [Deep dive into the principles →](https://www.lean-spec.dev/docs/advanced/first-principles)

---

## Key Features

### 🤖 Works with Your AI Tools

**Two integration methods for any AI coding assistant:**

**1. MCP Server** (Recommended) - AI-native structured access:

```json
{
  "mcpServers": {
    "lean-spec": {
      "command": "npx",
      "args": ["@leanspec/mcp"]
    }
  }
}
```

**2. CLI Commands** - AI agents directly invoke commands:

```bash
lean-spec create <name>
lean-spec search "<query>"
lean-spec update <spec> --status in-progress
```

**SDD Workflow Guidance**: Both methods work with `AGENTS.md`—a system prompt that teaches your AI the Spec-Driven Development workflow, LeanSpec principles, and best practices.

**Compatible with:**

| Category | AI Tools |
|----------|----------|
| **CLI-based** | [GitHub Copilot CLI](https://github.com/features/copilot/cli), [Claude Code](https://www.claude.com/product/claude-code), [Gemini CLI](https://geminicli.com/), [Open Code](https://opencode.ai/) |
| **IDE/Editor** | [VS Code (GitHub Copilot)](https://code.visualstudio.com/docs/copilot/overview), [Cursor](https://cursor.com/), [Windsurf](https://windsurf.com/), [Antigravity](https://antigravity.google/) |
| **Cloud Coding Agents** | [GitHub Copilot Coding Agent](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent), [OpenAI Codex Cloud](https://developers.openai.com/codex/cloud/), [Replit AI](https://replit.com/ai) |

Your AI can read, search, create, and manage specs—no manual copy-paste needed.

### 📊 Instant Project Visibility

Track progress from your terminal:

```bash
$ lean-spec board

📋 Spec Kanban Board

📅 Planned (11)
  🟠 High Priority
    • user-authentication
    • payment-integration
  
⏳ In Progress (2)
    • oauth-flow
    • stripe-checkout

✅ Complete (14)
```

<p align="center">
  <img src="https://github.com/codervisor/lean-spec-docs/blob/main/static/img/ui/ui-board-view.png" alt="Kanban Board View" width="800">
  <br>
  <em>Visual Kanban board showing project status at a glance</em>
</p>

```bash
$ lean-spec stats

📊 Project Health

  Total: 27 specs  |  Active: 13  |  Complete: 14
  Completion: 52%  |  Avg size: 1,847 tokens
  
  ⚠️ Bottlenecks Detected:
    • spec-validation (3,127 tokens - consider splitting)
    • oauth-flow (stale for 14 days)
```

<p align="center">
  <img src="https://github.com/codervisor/lean-spec-docs/blob/main/static/img/ui/ui-dashboard.png" alt="Project Dashboard" width="800">
  <br>
  <em>Web UI dashboard with real-time project metrics and health indicators</em>
</p>

### 🎨 Adaptive Structure (Progressive Disclosure)

**Start simple. Scale iteratively as needs emerge:**

```yaml
# Solo developer - Day 1
# Just status. That's it.
status: planned

# Small team - Week 2
# Feeling coordination pain? Add tags and priority.
status: in-progress
tags: [api, auth]
priority: high

# Enterprise - Month 3
# Scaling up? Add custom fields for your workflow.
status: in-progress
tags: [api, auth, security]
priority: high
assignee: alice
epic: PROJ-123
sprint: 2025-Q4-S3
custom_field: your-value
```

**Lean principle**: Don't add structure "just in case." Add it when you feel the pain. Full custom field support adapts to your workflow.

<p align="center">
  <img src="https://github.com/codervisor/lean-spec-docs/blob/main/static/img/ui/ui-project-stats.png" alt="Project Health Metrics" width="800">
  <br>
  <em>Project health dashboard showing how metadata enables powerful insights</em>
</p>

### 🚀 Tutorial Projects & Automation

**Learn with complete examples:**
```bash
npx lean-spec init --example dark-theme
```

Three projects (beginner → advanced): `dark-theme`, `dashboard-widgets`, `api-refactor`

**JSON output for CI/CD:**
```bash
lean-spec board --json | jq '.columns[]'
lean-spec list --json --status=complete > report.json
```

---

## Quick Start

### Option 1: Start with an Example (Recommended)

**Best way to learn—hands-on with a complete project:**

```bash
# Clone a tutorial project
npx lean-spec init --example dark-theme
cd dark-theme

# Install dependencies and start
npm install
npm start
```

You now have:
- ✅ Working React app
- ✅ LeanSpec already configured  
- ✅ Real feature specs to learn from
- ✅ Ready for the [tutorial](https://www.lean-spec.dev/docs/tutorials/first-spec-with-ai)

**Available examples:** `dark-theme`, `dashboard-widgets`, `api-refactor`

### Option 2: Add to Your Project

```bash
# Install globally
npm install -g lean-spec

# Initialize in your project
cd your-project
lean-spec init
```

Now you're ready to create specs with your AI assistant!

### Visualize Your Project

```bash
# Terminal UI
lean-spec board              # Kanban view
lean-spec stats              # Project metrics

# Web UI  
lean-spec ui                 # Opens http://localhost:3000
```

<p align="center">
  <img src="https://github.com/codervisor/lean-spec-docs/blob/main/static/img/ui/ui-dependency-graph.png" alt="Dependency Graph Visualization" width="800">
  <br>
  <em>Interactive dependency graph showing spec relationships</em>
</p>

### Next Steps

- **Learn by doing:** [Your First Spec with AI](https://www.lean-spec.dev/docs/tutorials/first-spec-with-ai) (10 min)
- **Understand the principles:** [First Principles Guide](https://www.lean-spec.dev/docs/advanced/first-principles)
- **Configure AI tools:** [MCP Integration](https://www.lean-spec.dev/docs/guide/usage/ai-assisted/mcp-integration) for Claude/Cline/Zed
- **Explore examples:** [Browse live specs from this project](https://github.com/codervisor/lean-spec/tree/main/specs)

---

## Documentation & Resources

### Getting Started
- 📖 [Getting Started Guide](https://www.lean-spec.dev/docs/guide/getting-started) - 5-minute setup
- 🎓 [First Spec Tutorial](https://www.lean-spec.dev/docs/tutorials/first-spec-with-ai) - Hands-on learning (10 min)
- 🧠 [First Principles](https://www.lean-spec.dev/docs/advanced/first-principles) - The philosophy explained
- 🔍 [Understanding LeanSpec](https://www.lean-spec.dev/docs/guide/understanding-leanspec) - Core concepts

### Usage Guides  
- ⚡ [CLI Reference](https://www.lean-spec.dev/docs/reference/cli) - All commands with examples
- 🤖 [MCP Integration](https://www.lean-spec.dev/docs/guide/usage/ai-assisted/mcp-integration) - Connect Claude, Cline, Zed
- 📝 [Spec Structure](https://www.lean-spec.dev/docs/guide/usage/spec-structure) - Anatomy of good specs
- 🔗 [Managing Dependencies](https://www.lean-spec.dev/docs/guide/usage/cli/dependencies) - Link related work

### Advanced Topics
- 🎯 [Context Engineering](https://www.lean-spec.dev/docs/advanced/context-engineering) - AI performance optimization
- 🏗️ [Large Projects](https://www.lean-spec.dev/docs/tutorials/large-project-management) - Scaling strategies
- ✍️ [AI-Assisted Spec Writing](https://www.lean-spec.dev/docs/advanced/ai-assisted-spec-writing) - Co-create with AI
- 🔬 [Why AI Performance Degrades](https://www.lean-spec.dev/blog/ai-agent-performance) - The research

### Community
- 💬 [GitHub Discussions](https://github.com/codervisor/lean-spec/discussions) - Ask questions, share ideas
- 🐛 [Report Issues](https://github.com/codervisor/lean-spec/issues) - Bugs and feature requests  
- 🤝 [Contributing Guide](CONTRIBUTING.md) - Join the project
- 🌏 [中文文档](https://www.lean-spec.dev/zh-Hans/) - Chinese documentation

### Contact Me

If you feel LeanSpec could benefit your daily work or your company, please add the author's Wechat account noting "LeanSpec" to enter the discussion group.

<p align="center">
  <img src="https://github.com/codervisor/lean-spec-docs/blob/main/static/img/qr-code.png" alt="Contact Me on WeChat" width="800">
  <br>
  <em>Contact Me on WeChat</em>
</p>