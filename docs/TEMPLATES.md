# Template System

LeanSpec templates provide complete project structures tailored to different team sizes and workflows. Each template is a working model you can start from.

## Template Philosophy

Templates in LeanSpec are **starting points, not constraints**. They demonstrate good practices but are meant to be adapted to your needs.

### What's Included

Every template includes:
- **Spec structure** - Example specs showing the methodology
- **AGENTS.md** - AI agent instructions and coding standards
- **Supporting files** - CONTRIBUTING.md, checklists, guides
- **config.json** - Frontmatter fields and variables

## Available Templates

### Minimal Template

**Best for**: Solo developers, quick prototypes, learning LeanSpec

**Frontmatter fields**:
- `status` (required)
- `created` (required)

**Structure**:
```
specs/
  example-feature/
    README.md
AGENTS.md (minimal AI guidance)
```

**Philosophy**: Absolute minimum to get started. Add complexity only when needed.

---

### Standard Template (Recommended)

**Best for**: Small teams (2-5 people), startups, side projects

**Frontmatter fields**:
- `status`, `created` (required)
- `tags`, `priority` (optional)

**Structure**:
```
specs/
  example-feature/
    README.md
    implementation-notes.md
AGENTS.md (AI coding standards)
CONTRIBUTING.md (workflow guide)
```

**Philosophy**: Balanced between simplicity and organization. Recommended starting point for most teams.

---

### Enterprise Template

**Best for**: Large teams (10+ people), regulated industries, complex projects

**Frontmatter fields**:
- `status`, `created` (required)
- `tags`, `priority` (optional)
- `assignee`, `reviewer`, `issue`, `epic` (custom fields)

**Structure**:
```
specs/
  example-feature/
    README.md
    technical-details.md
    security-review.md
    compliance-checklist.md
AGENTS.md (comprehensive AI standards)
CONTRIBUTING.md (team workflow)
CODE_REVIEW_CHECKLIST.md
SECURITY_GUIDELINES.md
```

**Philosophy**: Governance, compliance, and coordination. More structure for larger teams.

---

### API-First Template

**Best for**: API development, microservices, integration-focused projects

**Frontmatter fields**:
- `status`, `created` (required)
- `tags`, `priority` (optional)
- `version`, `breaking_change` (custom fields)

**Structure**:
```
specs/
  example-endpoint/
    README.md
    api-contract.md
    integration-tests.md
AGENTS.md (API design principles)
API_GUIDELINES.md
VERSIONING.md
```

**Philosophy**: API contracts first, with clear versioning and integration guidance.

## Choosing a Template

### Decision Tree

1. **Solo developer or learning?** → Minimal
2. **Small team, flexible needs?** → Standard
3. **Large team or regulated industry?** → Enterprise
4. **Building APIs or microservices?** → API-First

### You Can Switch Later

Templates are starting points. You can:
- Start minimal, add fields as needed
- Customize any template after initialization
- Mix and match elements from different templates

## Template Commands

### List Available Templates

```bash
lspec templates
```

Shows all templates with brief descriptions.

### View Template Details

```bash
lspec templates show <name>
```

View detailed information about a specific template:

```bash
lspec templates show standard
lspec templates show enterprise
```

### Initialize with Template

```bash
lspec init
```

Interactive initialization lets you choose a template. Or specify directly:

```bash
lspec init --template=standard
lspec init --template=enterprise
```

## Customization

### Custom Fields

Each template can define custom frontmatter fields in `.lspec/config.json`:

```json
{
  "frontmatter": {
    "custom": {
      "epic": "string",
      "sprint": "number",
      "estimate": "string"
    }
  }
}
```

See [FRONTMATTER.md](FRONTMATTER.md) for details.

### Template Variables

Templates support variable substitution in `spec-template.md`:

**Built-in variables**:
- `{name}` - Spec name
- `{date}` - Creation date
- `{project_name}` - From package.json
- `{author}`, `{git_user}`, `{git_email}`, `{git_repo}` - From git config

**Custom variables** (defined in config):
```json
{
  "variables": {
    "team": "Platform Engineering",
    "company": "Acme Corp"
  }
}
```

**Example template**:
```markdown
---
status: planned
created: {date}
---

# {name}

**Team**: {team}  
**Project**: {project_name}  
**Author**: {author}

## Overview
...
```

Variables are automatically resolved when creating specs.

## Creating Custom Templates

### Directory Structure

Create a template directory with:

```
my-template/
  config.json          # Template configuration
  README.md            # Template documentation
  spec-template.md     # Template for new specs
  files/               # Files to copy during init
    AGENTS.md
    CONTRIBUTING.md
    ...
```

### config.json

Define template configuration:

```json
{
  "name": "my-template",
  "description": "Custom template for my team",
  "frontmatter": {
    "custom": {
      "team": "string",
      "project": "string"
    }
  },
  "variables": {
    "team": "Platform Team",
    "default_reviewer": "alice"
  }
}
```

### spec-template.md

Define the structure for new specs:

```markdown
---
status: planned
created: {date}
tags: []
priority: medium
team: {team}
---

# {name}

> **Status**: 📅 Planned · **Created**: {date}

## Overview

## Key Scenarios

## Acceptance Criteria

## Technical Details

## Non-Goals
```

### Installation

Place your template in:
- `~/.lspec/templates/my-template/` (user-level)
- `.lspec/templates/my-template/` (project-level)

## Template Comparison

### Flexibility vs Structure

| Template | Fields | Files | Governance | Flexibility |
|----------|--------|-------|------------|-------------|
| Minimal | 2 | 2 | None | Maximum |
| Standard | 4 | 3 | Light | High |
| Enterprise | 8+ | 6+ | Strong | Medium |
| API-First | 6 | 4 | Medium | High |

### Ideal Team Size

- **Minimal**: 1 person
- **Standard**: 2-5 people
- **Enterprise**: 10+ people
- **API-First**: Any size (API-focused)

### Learning Curve

- **Minimal**: 5 minutes
- **Standard**: 15 minutes
- **Enterprise**: 1 hour
- **API-First**: 30 minutes

## Best Practices

### Start Simple

Begin with Minimal or Standard. Add complexity only when you feel the pain:
- Too many specs? Add tags
- Unclear priorities? Add priority field
- Team coordination issues? Add assignee/reviewer
- Project tracking needs? Add custom fields for epics/sprints

### Keep Templates Updated

As your team's needs evolve:
1. Update `.lspec/config.json` with new fields
2. Update `spec-template.md` to include new structure
3. Document conventions in template README.md

### Share Templates

If you create a useful custom template:
- Share with your team via git
- Consider contributing back to LeanSpec
- Document your conventions clearly

### Don't Over-Structure

Remember LeanSpec's philosophy: clarity over documentation. Templates should reduce friction, not create it.

If your template feels too rigid or verbose, simplify it. The goal is to help you ship better software, not to create documentation overhead.
