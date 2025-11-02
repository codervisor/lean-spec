---
id: 'templates'
title: 'Templates'
sidebar_position: 7
---
# Templates

LeanSpec provides customizable templates to match your workflow and team structure.

## Overview

Templates are complete working models that include:
- Spec structure and examples
- `AGENTS.md` for AI agent integration
- Supporting files (CONTRIBUTING.md, checklists, etc.)
- Project-specific configuration

## Available Templates

### Solo Dev

Quick setup for solo developers (default).

**Best for:** Individual developers, side projects, MVP development

**Includes:**
- Minimal configuration
- Simple spec structure (status, created date only)
- Basic AGENTS.md
- Focus on speed and simplicity

**Example frontmatter:**
```yaml
---
status: planned
created: 2025-11-02
---
```

### Team

Small team collaboration with workflow guides.

**Best for:** Teams of 2-10 people, startups, small product teams

**Includes:**
- Status, tags, priority fields
- Team workflow guidance
- Code review checklist
- CONTRIBUTING.md

**Example frontmatter:**
```yaml
---
status: in-progress
created: 2025-11-02
tags: [api, feature]
priority: high
---
```

### Enterprise

Enterprise-grade with governance & compliance.

**Best for:** Large organizations, regulated industries, complex projects

**Includes:**
- Full metadata (assignee, reviewer, issue, epic)
- Approval workflow
- Compliance checklist
- Integration with JIRA/Linear
- Audit trail

**Example frontmatter:**
```yaml
---
status: in-progress
created: 2025-11-02
tags: [security, compliance]
priority: critical
assignee: alice
reviewer: bob
issue: JIRA-1234
epic: security-hardening
---
```

### API First

API-driven development with endpoint specs.

**Best for:** API-focused projects, microservices, backend teams

**Includes:**
- API endpoint templates
- Request/response examples
- OpenAPI integration
- Contract testing guidance

**Example frontmatter:**
```yaml
---
status: planned
created: 2025-11-02
tags: [api, rest]
priority: high
endpoint: POST /api/users
---
```

## Choosing a Template

Run `lspec init` and choose "Choose a template":

```bash
lspec init
```

```
? How would you like to set up LeanSpec?
  Quick start (solo-dev, zero config)
  ❯ Choose a template
  Customize everything

? Which template would you like to use?
  ❯ solo-dev - Quick setup for solo developers
    team - Small team collaboration
    enterprise - Enterprise-grade with governance
    api-first - API-driven development
```

## Custom Templates

You can create your own templates in `.lspec/templates/`.

### Creating a Custom Template

1. Create template file:
```bash
mkdir -p .lspec/templates
touch .lspec/templates/my-template.md
```

2. Edit template with placeholders:
```markdown
---
status: planned
created: {date}
---

# {name}

**Team**: {team}
**Author**: {author}

## Overview

[Your custom sections...]
```

3. Configure in `.lspec/config.json`:
```json
{
  "templateFile": ".lspec/templates/my-template.md"
}
```

### Available Variables

- `{name}` - Spec name
- `{date}` - Creation date (ISO format)
- `{project_name}` - From package.json
- `{author}` - From git config user.name
- `{git_user}` - Git username
- `{git_email}` - Git email
- `{git_repo}` - Repository name

Add custom variables in config:
```json
{
  "variables": {
    "team": "Platform Engineering",
    "company": "Acme Corp"
  }
}
```

## Template Structure

A complete template includes:

### 1. Frontmatter
```yaml
---
status: planned
created: {date}
tags: []
priority: medium
---
```

### 2. Visual Badges
```markdown
> **Status**: 📅 Planned · **Created**: {date}
```

### 3. Content Sections
```markdown
## Overview
## Goal
## Key Scenarios
## Acceptance Criteria
## Technical Approach
## Non-Goals
```

Customize sections to fit your needs.

## Switching Templates

To change templates mid-project:

1. Update `.lspec/config.json`:
```json
{
  "templateFile": ".lspec/templates/new-template.md"
}
```

2. New specs will use the new template

3. Existing specs remain unchanged (update manually if needed)

## Best Practices

::: tip Start Simple
Begin with solo-dev or team template. Add complexity only when you feel the pain of not having it.
:::

::: tip Iterate on Templates
Refine your templates based on what actually gets used. Remove unused sections.
:::

::: tip Keep Sections Optional
Not every spec needs every section. Use what adds value, skip what doesn't.
:::

::: tip Share Templates
Export your `.lspec/templates/` directory to share with other teams or projects.
:::

---

**Next**: Learn about [Frontmatter](/docs/guide/frontmatter) fields or explore [Custom Fields](/docs/guide/custom-fields).
