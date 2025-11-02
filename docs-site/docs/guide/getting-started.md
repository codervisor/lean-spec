---
id: 'getting-started'
title: 'Getting Started'
sidebar_position: 2
---
# Getting Started

This guide will help you install LeanSpec and set up your first project.

## Installation

LeanSpec can be installed globally or as a project dependency.

### Global Installation

```bash
npm install -g lean-spec
```

This makes the `lspec` command available system-wide.

### Project Installation

```bash
# Using npm
npm install -D lean-spec

# Using pnpm
pnpm add -D lean-spec

# Using yarn
yarn add -D lean-spec
```

For project installation, you'll need to use `npx lspec` or add scripts to your `package.json`.

## Verify Installation

Check that LeanSpec is installed correctly:

```bash
lspec --version
```

You should see the version number (e.g., `0.1.0`).

## Initialize Your Project

Navigate to your project directory and run:

```bash
lspec init
```

This interactive command will guide you through three setup paths:

### 1. Quick Start (Recommended for Solo Developers)

Zero configuration, solo-dev defaults. Gets you up and running in seconds.

```bash
? How would you like to set up LeanSpec?
  ❯ Quick start (solo-dev, zero config)
    Choose a template
    Customize everything
```

This creates:
- `.lspec/config.json` with minimal configuration
- `specs/` directory for your specs
- `AGENTS.md` with AI agent integration guidance (if not present)

### 2. Choose a Template

Select from pre-configured templates for different team sizes and workflows:

- **solo-dev**: Quick setup for solo developers (default)
- **team**: Small team collaboration with workflow guides
- **enterprise**: Enterprise-grade with governance & compliance
- **api-first**: API-driven development with endpoint specs

Each template includes:
- Spec structure and examples
- AGENTS.md for AI agent integration
- Supporting files (CONTRIBUTING.md, checklists, etc.)
- Project-specific configuration

### 3. Customize Everything

Full control over configuration (coming soon).

## Project Structure

After initialization, your project will have:

```
your-project/
├── .lspec/
│   ├── config.json         # LeanSpec configuration
│   └── templates/          # Custom spec templates (optional)
│       └── spec-template.md
├── specs/                  # All your specs live here
│   └── YYYYMMDD/          # Date-organized folders
│       └── NNN-name/      # Sequential spec folders
│           └── README.md  # The actual spec
├── AGENTS.md              # AI agent integration guidance
└── ... (your project files)
```

## Integrating with Existing Projects

If you already have `AGENTS.md`, `.cursorrules`, or other system prompts, `lspec init` will detect them and offer three options:

1. **Merge** - Appends LeanSpec guidance to your existing `AGENTS.md` (preserves your content)
2. **Backup** - Saves existing files as `.backup` and creates fresh ones
3. **Skip** - Only adds `.lspec` config and `specs/` directory, keeps your files untouched

This makes it easy to adopt LeanSpec incrementally without disrupting your existing AI agent setup.

## Configuration File

The `.lspec/config.json` file controls LeanSpec behavior:

```json
{
  "specsDir": "specs",
  "templateFile": ".lspec/templates/spec-template.md",
  "frontmatter": {
    "required": ["status", "created"],
    "optional": ["tags", "priority", "assignee", "reviewer"],
    "custom": {}
  },
  "variables": {}
}
```

You can customize this to fit your workflow. See [Configuration Reference](/docs/reference/config) for details.

## Create Your First Spec

Now you're ready to create your first spec:

```bash
lspec create my-feature
```

This creates:
- `specs/20251102/001-my-feature/` folder (date-based organization)
- `README.md` inside with your template content
- Frontmatter with default metadata

Edit the `README.md` file to document your feature.

## Basic Commands

Here are the essential commands to get you started:

```bash
# Create a spec
lspec create feature-name

# List all specs
lspec list

# Update spec metadata
lspec update specs/20251102/001-my-feature --status=in-progress

# Archive completed specs
lspec archive specs/20251102/001-my-feature
```

For a complete command reference, see [CLI Commands](/docs/reference/cli).

## What's Next?

Now that you have LeanSpec set up, you can:

- Read the [Quick Start Tutorial](/docs/guide/quick-start) for a hands-on walkthrough
- Learn about [Templates](/docs/guide/templates) to customize your workflow
- Explore [AI Integration](/docs/ai-integration/) to set up AI coding agents
- Understand the [Core Philosophy](/docs/guide/philosophy) behind LeanSpec

## Need Help?

- Check out the [CLI Reference](/docs/reference/cli) for detailed command documentation
- Visit the [GitHub repository](https://github.com/codervisor/lean-spec) to report issues
- Read [Best Practices](/docs/ai-integration/best-practices) for tips on effective spec writing
