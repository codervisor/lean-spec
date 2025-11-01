# LeanSpec

A lightweight, agile Spec-Driven Development (SDD) methodology and adaptive workflow designed to reduce spec "mind burden" and keep teams—both humans and AI coding agents—focused on what truly matters.

> **LeanSpec is not just a document—it's an adaptive workflow, SOP (Standard Operating Procedure), and living process for AI-powered development teams.**

## The Problem

Traditional software specifications often suffer from:
- **Documentation Overload**: Lengthy documents that nobody (human or AI) reads or maintains
- **Frozen Contracts**: Specs that become outdated as soon as development begins
- **Exhaustive Overthinking**: Trying to document every possible edge case upfront
- **Mind Burden**: Cognitive load from managing verbose, complicated documentation
- **Lost Intent**: The "why" gets buried under mountains of "what" and "how"

Development teams—including AI coding agents—need clear direction without being buried in documentation debt.

## The LeanSpec Solution

LeanSpec is a **mindset and methodology, not a rigid format or tool**. It's about capturing what truly matters with minimal overhead.

A simple example structure might include:
- **The Goal**: Why this work exists
- **Key Scenarios**: The critical user journeys that must succeed
- **Acceptance Criteria**: Clear, testable conditions for "done"
- **Technical Contracts**: Essential interfaces and constraints
- **Non-Goals**: What we're explicitly not doing (to maintain focus)

But the key is the mindset: focus on clarity, keep it lean, make it living documentation. The structure should serve your needs, not constrain them.

## Agile Principles

LeanSpec is built on these core principles:

### 🎯 Clarity over Documentation
Write just enough to communicate intent clearly. If it doesn't add clarity, don't write it.

### 🚀 Essential Scenarios over Exhaustive Lists
Focus on the 20% of scenarios that deliver 80% of the value. Document what must work, not every possible edge case.

### 📱 Living Guide over Frozen Contract
Specs should evolve with the project. Update them as you learn, don't treat them as immutable contracts.

### 🧠 Reduced Mind Burden over Comprehensive Coverage
Keep specs short and scannable. The goal is to reduce cognitive load, not create reference manuals.

### ⚡ Speed over Perfection
Ship a "good enough" spec quickly. You can always refine it based on feedback and learning.

### 🤝 Collaboration over Specification
Use specs as conversation starters, not as replacements for human communication.

## Getting Started

The LeanSpec mindset is simple:

1. **Start with why**: What problem are you solving?
2. **Capture the essentials**: What absolutely must be communicated?
3. **Stay lean**: If it doesn't add clarity, cut it
4. **Keep it living**: Update as you learn

For a practical example, see `templates/` for available project initialization templates. Each template contains:
- Full project structure (specs/ directory, examples)
- `AGENTS.md` - AI agent instructions and coding standards
- Supporting files - CONTRIBUTING.md, checklists, or other guides
- `config.json` - Template configuration

Initialize with `lspec init` to set up your project.

## Quick Start

```bash
# Install globally
pnpm install -g lean-spec

# Or use locally in your project
pnpm add -D lean-spec

# Initialize LeanSpec in your project (interactive)
lspec init

# Create your first spec (creates specs/YYYYMMDD/NNN-name/ folder)
lspec create my-feature

# List all specs
lspec list

# Filter specs by status, tags, or priority
lspec list --status=in-progress
lspec list --tag=api --priority=high

# Update spec metadata
lspec update specs/20251031/001-my-feature --status=complete
lspec update specs/20251031/001-my-feature --priority=high --tags=api,backend

# List available templates
lspec templates

# Archive old specs
lspec archive specs/20251031/001-my-feature
```

### Initialize Your Project

`lspec init` provides three paths:

1. **Quick start** - Zero configuration, solo-dev defaults
2. **Choose template** - Pick from solo-dev, team, enterprise, or api-first
3. **Customize everything** - Full control (coming soon)

Each template is a complete working model with:
- Spec structure and examples
- AGENTS.md for AI agent integration
- Supporting files (CONTRIBUTING.md, checklists, etc.)
- Project-specific config

#### Spec Metadata with Frontmatter

LeanSpec uses YAML frontmatter for structured metadata. Each template includes different field sets:

**Minimal Template** (status, created only):
```yaml
---
status: planned
created: 2025-11-01
---

# My Feature

> **Status**: 📅 Planned · **Created**: 2025-11-01
```

**Standard Template** (recommended - adds tags and priority):
```yaml
---
status: in-progress
created: 2025-11-01
tags: [api, feature]
priority: high
---

# My Feature

> **Status**: 🔨 In progress · **Priority**: High · **Created**: 2025-11-01 · **Tags**: api, feature
```

**Enterprise Template** (adds team fields and tracking):
```yaml
---
status: in-progress
created: 2025-11-01
tags: [security, compliance]
priority: critical
assignee: alice
reviewer: bob
issue: JIRA-1234
epic: security-hardening
---

# My Feature

> **Status**: 🔨 In progress · **Priority**: Critical · **Created**: 2025-11-01 · **Tags**: security, compliance  
> **Assignee**: alice · **Reviewer**: bob
```

**Key Features**:
- **Dual Format**: Machine-readable YAML frontmatter + human-readable visual badges
- **Auto-sync**: Visual badges automatically update when metadata changes
- **Status Emojis**: 📅 Planned, 🔨 In progress, ✅ Complete, 📦 Archived

**Philosophy**: Start minimal. Add fields only when you feel the pain of not having them.

**Valid Status Values**: `planned`, `in-progress`, `complete`, `archived`  
**Valid Priority Values**: `low`, `medium`, `high`, `critical`

Use `lspec list` with filters to find specs:
- `lspec list --status=in-progress` - Show active work
- `lspec list --priority=high` - Focus on critical items
- `lspec list --tag=api` - Find related specs
- Combine filters: `lspec list --status=planned --priority=high --tag=api`

Update spec metadata without editing files:
- `lspec update <path> --status=complete` - Mark as done (auto-adds completion date)
- `lspec update <path> --priority=high --tags=api,backend` - Update multiple fields

#### Integrating with Existing Projects

If you already have `AGENTS.md`, `.cursorrules`, or other system prompts, `lspec init` will detect them and offer three options:

1. **Merge** - Appends LeanSpec guidance to your existing `AGENTS.md` (preserves your content)
2. **Backup** - Saves existing files as `.backup` and creates fresh ones
3. **Skip** - Only adds `.lspec` config and `specs/` directory, keeps your files untouched

This makes it easy to adopt LeanSpec incrementally without disrupting your existing AI agent setup.

### Available Templates

- **solo-dev** - Quick setup for solo developers (default)
- **team** - Small team collaboration with workflow guides
- **enterprise** - Enterprise-grade with governance & compliance
- **api-first** - API-driven development with endpoint specs

Run `lspec templates` to see all available templates.

See `AGENTS.md` for AI agent integration guidance.

## Development

### Testing

```bash
pnpm test        # Run tests in watch mode
pnpm test:run    # Run tests once (CI mode)
```

See [docs/testing.md](docs/testing.md) for comprehensive testing documentation.

### Build

This project is built with TypeScript and pnpm:

```bash
# Install dependencies
pnpm install

# Build CLI
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm typecheck
```

**Note**: LeanSpec methodology is language/framework-agnostic. This TS implementation is for the CLI tool only.

## When to Use LeanSpec

**Perfect for:**
- New features or components
- API designs
- Architecture decisions that need shared understanding
- Quick alignment on work direction
- Providing context to AI coding agents for implementation tasks
- **Establishing an adaptive SOP for AI-powered development teams**
- **Integrating with system prompts and agent instructions**

**Not ideal for:**
- Detailed API reference documentation (use code comments + auto-generated docs)
- Step-by-step user manuals (use dedicated user documentation)
- Compliance requirements that mandate specific formats

## LeanSpec for AI Coding Agents

In the era of AI-assisted development, LeanSpec serves as both a methodology and an adaptive workflow for AI-powered development teams. It's not just about writing specs—it's about establishing a living process that integrates with AI agent systems.

### Core Benefits for AI Teams

- **Clear Context**: Starting with "why" gives AI agents the purpose behind the work
- **Concrete Scenarios**: Specific examples help AI understand expected behavior
- **Testable Criteria**: Clear targets guide AI implementation
- **Boundaries**: Explicit non-goals help AI avoid scope creep
- **Adaptable Structure**: Whatever format you choose, consistency helps AI parse effectively

AI coding agents work best with clear, concise specifications that balance context with brevity—exactly what the LeanSpec mindset promotes.

### Implementing LeanSpec as an AI Workflow

LeanSpec becomes truly powerful when integrated as a **Standard Operating Procedure (SOP)** for your AI-powered development team:

#### System Prompts and Context Engineering

To effectively use LeanSpec with AI agents, consider implementing:

1. **System-Level Instructions** (e.g., `AGENTS.md`)
   - Define how AI agents should interpret and apply LeanSpec principles
   - Establish coding standards and conventions
   - Specify how to handle ambiguity or missing information
   - Set expectations for testing, documentation, and code quality

2. **Context Engineering**
   - Structure your repository to make LeanSpec documents discoverable
   - Use consistent naming conventions (e.g., `LEANSPEC_*.md`)
   - Place specs near the code they describe
   - Link related specs together for complex features

3. **Adaptive Workflow Integration**
   - Start each work item with a LeanSpec document
   - Have AI agents reference the spec during implementation
   - Update specs as understanding evolves (living documentation)
   - Use specs as the source of truth for feature discussions

#### Example: AGENTS.md for LeanSpec Workflow

Create an `AGENTS.md` file in your repository to guide AI agents. See this repo's `AGENTS.md` for a working example.

## Philosophy

> "The best spec is the one that gets read, understood, and acted upon—by humans and AI alike."

LeanSpec is a **mindset, methodology, and adaptive workflow**—not just a format. It embraces agile thinking: start small, iterate based on feedback, and focus on outcomes over outputs. A one-page spec that everyone (including AI coding agents) understands beats a fifty-page document that nobody reads.

The methodology is about principles over process—adapt it to your team, your tools, and your context. When working with AI-powered development teams, LeanSpec becomes an SOP that integrates with system prompts, context engineering, and agent instructions to create a cohesive, intelligent workflow.

## Contributing

Have ideas for improving LeanSpec? Open an issue or submit a pull request. Keep it lean! 🚀

## License

MIT License - See [LICENSE](LICENSE) for details.## Documentation

- **[Getting Started](README.md)** - You are here!
- **[AI Agent Integration](AGENTS.md)** - Setup for AI-powered development
- **[Contributing](CONTRIBUTING.md)** - How to contribute to LeanSpec
- **[Developer Guide](docs/)** - Testing and technical docs

## Contributing

Have ideas for improving LeanSpec? See [CONTRIBUTING.md](CONTRIBUTING.md) for details. Keep it lean! 🚀