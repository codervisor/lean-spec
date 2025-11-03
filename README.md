# LeanSpec

> A lightweight, flexible Spec-Driven Development (SDD) methodology for modern AI-powered development.

📚 **[Read the full documentation →](https://www.lean-spec.dev)**

## The Problem

**AI coding agents need clear context. Traditional SDD approaches fail them.**

Ever tried giving an AI agent a specification to implement, only to find:
- 🤦 **Context overload** - 30-page documents blow up the AI's context window
- 🎯 **Lost intent** - Buried "why" means AI can't make good decisions
- 🔒 **Too rigid** - Fixed formats don't fit your diverse feature types
- 📉 **Gets stale fast** - Nobody updates docs, so AI gets outdated context

**The catch-22**: Lightweight SDD lacks detail for AI. Detailed SDD is too heavy for anyone to maintain.

You need **SDD that's clear enough for AI to act on, lean enough for humans to maintain**.

## The LeanSpec Solution

**[Spec-Driven Development](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html) for the AI era: Clarity without overhead. Structure that adapts, not constrains.**

In AI-powered development, SDD isn't just for humans—it's how you guide AI coding agents. LeanSpec is a methodology that gives both humans and AI the context they need:
- 🎯 **Write only what matters** - Clear intent AI can act on, not 50 pages of noise
- 🤖 **AI-native from day one** - Works with Cursor, GitHub Copilot, Aider, and custom agents
- 📈 **Scale naturally** - Solo dev → Small team → Enterprise, same approach
- 🔧 **Built-in workflow support** - Boards, timelines, dependency tracking—manage AI + human work together
- 🎨 **Your structure** - Custom fields, flexible templates, adapt to any workflow

### Adaptive by Design

```yaml
# Day 1: Solo developer
status: planned
created: 2025-11-01

# Week 2: Small team joins
+ tags: [api, feature]
+ priority: high

# Month 3: Enterprise needs
+ assignee: alice
+ epic: PROJ-123
+ reviewer: bob
```

Add complexity only when you feel the pain. Never rewrite your specifications to change approach.

### Who Uses LeanSpec

✅ **AI-powered development teams** - Give your agents clear context without overwhelming their context window  
✅ **Developers using Cursor, Copilot, Aider** - SDD that works with your AI workflow  
✅ **Teams outgrowing simple markdown docs** - Need structure without heavyweight frameworks  
✅ **Startups scaling from solo to team** - One approach that grows with you  
✅ **Anyone frustrated with verbose SDD** - Write less, accomplish more

## Quick Start

```bash
# Install
pnpm install -g lean-spec

# Initialize in your project
lspec init

# Create your first specification
lspec create my-feature

# Core commands
lspec list                    # See all specifications
lspec board                   # Kanban view
lspec stats                   # Project statistics
lspec search "query"          # Find specifications
lspec update <spec> --status=complete
```

**Templates available**: minimal, standard (recommended), enterprise, api-first

## Flexible Folder Structure

LeanSpec supports multiple folder organization patterns to match your workflow:

### Flat Pattern (Default - Recommended)
Simple, single-level organization with **global sequence numbers**. Perfect for small teams and solo developers.

```bash
specs/
├── 001-typescript-cli-migration/
├── 002-template-system-redesign/
├── 011-docusaurus-vercel-migration/
└── archived/
```

**Configuration:**
```json
{
  "structure": {
    "pattern": "flat",
    "prefix": "",  // Empty by default - global numbering
    "sequenceDigits": 3
  }
}
```

**Key features:**
- ✅ **Global unique sequence numbers** - 001, 002, 003... across entire project
- ✅ **Simple references** - Just say "spec 011" or "specs/011-feature"
- ✅ **Easy to navigate** - No date folders to dig through

**Optional prefix for chronological sorting:**
```json
{
  "structure": {
    "pattern": "flat",
    "sequenceDigits": 3,
    "prefix": "{YYYYMMDD}-"  // Results in: 20251103-001-feature/
  }
}
```

### Custom Pattern - Date-Based Grouping
Group specifications by date, month, or year. **Note**: Sequence numbers are still globally unique across all date folders.

```bash
specs/
├── 20251031/
│   ├── 001-typescript-cli/
│   └── 002-template-system/
├── 20251103/
│   ├── 003-feature-c/    # ← Global sequence continues
│   └── 004-another/      # ← Next global number
└── archived/
```

**Configuration:**
```json
{
  "structure": {
    "pattern": "custom",
    "groupExtractor": "{YYYYMMDD}",  // or "{YYYY-MM}" for monthly
    "sequenceDigits": 3
  }
}
```

**Note**: Sequence numbers remain globally unique. Date folders are for organization only.

### Custom Pattern - Field-Based Grouping
Group by milestone, sprint, release, or any custom field.

```bash
specs/
├── milestone-1/
│   ├── 001-feature-a/
│   └── 002-feature-b/
├── milestone-2/
│   └── 003-feature-c/
├── backlog/  # Fallback for specs without milestone
└── archived/
```

**Configuration:**
```json
{
  "structure": {
    "pattern": "custom",
    "groupExtractor": "milestone-{milestone}",
    "groupFallback": "backlog",
    "sequenceDigits": 3
  },
  "frontmatter": {
    "custom": {
      "milestone": "string"
    }
  }
}
```

**Creating specs:**
```bash
lspec create feature-a --field milestone=1
# → specs/milestone-1/001-feature-a/

lspec create feature-b --field milestone=1
# → specs/milestone-1/002-feature-b/

lspec create unassigned
# → specs/backlog/003-unassigned/  (uses fallback)
```

**Key Features:**
- ✅ **Global unique sequence numbers** - `001`, `002`, `003` across entire project (all folders)
- ✅ **Flexible references** - Find specs by number alone: `lspec update 024 --status=complete`
- ✅ **Flat archive** - All patterns archive to `specs/archived/` (flat structure)
- ✅ **Zero breaking changes** - Existing projects maintain their structure

## Core Principles & Features

- **Flexible structure** - Adapt SDD to your workflow, not vice versa
- **Custom fields** - Add sprints, epics, reviewers—whatever your team needs
- **Built-in visualization** - Board, timeline, Gantt, dependency analysis
- **AI-native** - Built for human + AI development teams (see `AGENTS.md`)
- **Portable specs** - Plain markdown that works with any workflow

## When to Use LeanSpec

**Perfect for:**
- Features that span multiple files/components
- API designs and architecture decisions
- Breaking changes needing team alignment
- Providing context to AI coding agents

**Skip for:**
- Trivial bug fixes (just fix it)
- Self-explanatory refactors
- API reference docs (use code comments + auto-gen)

## Learn More

### 📖 Core Concepts
- **[Philosophy & Principles](docs/PHILOSOPHY.md)** - The LeanSpec mindset and core principles
- **[Command Reference](docs/COMMANDS.md)** - Complete CLI documentation
- **[Template System](docs/TEMPLATES.md)** - Choose and customize templates
- **[Frontmatter Spec](docs/FRONTMATTER.md)** - Metadata and custom fields

### 🚀 Getting Started
- **[Integration Guide](docs/INTEGRATION.md)** - Add LeanSpec to existing projects
- **[AI Agent Setup](AGENTS.md)** - Configure for AI-powered development

### 🔍 For Researchers
- **[Comparisons](docs/COMPARISONS.md)** - How LeanSpec compares to BMAD, SpecKit, Kiro, OpenSpec, Agent OS
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute
- **[Examples](examples/)** - Real-world usage examples

## License

MIT - See [LICENSE](LICENSE) for details.