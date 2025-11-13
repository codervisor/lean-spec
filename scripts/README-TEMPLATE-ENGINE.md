# Template Engine for AGENTS.md

This document describes the template engine system used to generate AGENTS.md files for LeanSpec templates.

## Overview

The AGENTS.md template engine eliminates duplication across template files by:
- Storing shared content in reusable component files
- Using Handlebars templates to compose AGENTS.md files
- Generating templates at build time to ensure consistency

## Architecture

### Directory Structure

```
packages/cli/templates/
├── _shared/
│   ├── agents-components/        # Reusable component files
│   │   ├── core-rules-base.md
│   │   ├── discovery-commands-*.md
│   │   ├── frontmatter-*.md
│   │   ├── workflow-*.md
│   │   └── ... (18 components total)
│   └── agents-template.hbs       # Main Handlebars template
├── minimal/
│   ├── agents-config.json        # Component selection config
│   └── files/
│       └── AGENTS.md             # Generated file
├── standard/
│   ├── agents-config.json
│   └── files/
│       └── AGENTS.md
└── enterprise/
    ├── agents-config.json
    └── files/
        └── AGENTS.md
```

## Usage

### Building Templates

Generate all AGENTS.md files:

```bash
pnpm build:templates
```

This is automatically run as part of the main build:

```bash
pnpm build
```

### Making Changes

To update content across all templates:

1. Edit the relevant component file in `_shared/agents-components/`
2. Run `pnpm build:templates`
3. All AGENTS.md files will be regenerated with the change

To update a specific template:

1. Edit the template's `agents-config.json` to use different components
2. Or create a new component file for template-specific content
3. Run `pnpm build:templates`

## Benefits

✅ **Single Source of Truth**: Edit once, update everywhere  
✅ **No Drift**: Templates stay in sync automatically  
✅ **Easy Maintenance**: Update one component file instead of 3+ templates  
✅ **Template Flexibility**: Mix and match components per template  
✅ **Build-time Generation**: No runtime overhead, generated files committed to repo

## Examples

### Example: Adding a New Rule

To add a new rule to all templates:

1. Edit `packages/cli/templates/_shared/agents-components/core-rules-base.md`
2. Add the new rule
3. Run `pnpm build:templates`
4. All minimal and standard templates get the update
5. Enterprise uses `core-rules-enterprise.md`, so update that separately if needed

See spec 073 for full details and planned Phase 2 features.
