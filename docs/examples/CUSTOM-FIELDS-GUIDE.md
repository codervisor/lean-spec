# Custom Frontmatter and Variables Examples

This document demonstrates how to use custom frontmatter fields and variable substitution in LeanSpec.

## Configuration

Add custom fields and variables to your `.lean-spec/config.json`:

```json
{
  "frontmatter": {
    "required": ["status", "created"],
    "optional": ["tags", "priority"],
    "custom": {
      "epic": "string",
      "sprint": "number",
      "estimate": "string",
      "issue": "string",
      "reviewer": "string",
      "team": "string",
      "jira_id": "string",
      "points": "number"
    }
  },
  "variables": {
    "team": "Platform Engineering",
    "default_reviewer": "alice",
    "company": "Acme Corp",
    "product": "MyProduct"
  }
}
```

## Creating Specs with Custom Fields

### Basic custom field usage:

```bash
lspec create user-authentication \
  --field epic=AUTH-2024 \
  --field sprint=5 \
  --field estimate=3d \
  --field reviewer=bob
```

### With all options:

```bash
lspec create payment-integration \
  --title "Stripe Payment Integration" \
  --description "Integrate Stripe for subscription payments" \
  --tags backend,payment,api \
  --priority high \
  --assignee alice \
  --field epic=PAYMENT-2024 \
  --field sprint=6 \
  --field estimate=5d \
  --field jira_id=PROJ-123 \
  --field points=8
```

## Updating Custom Fields

```bash
# Update custom fields
lspec update 001-user-authentication \
  --field sprint=6 \
  --field estimate=2d

# Update standard and custom fields together
lspec update 001-user-authentication \
  --status in-progress \
  --priority high \
  --field sprint=6
```

## Filtering by Custom Fields

### List specs by custom field:

```bash
# Filter by epic
lspec list --field epic=AUTH-2024

# Filter by sprint
lspec list --field sprint=5

# Combine with standard filters
lspec list --status in-progress --field sprint=6

# Multiple custom fields
lspec list --field epic=AUTH-2024 --field sprint=6
```

### Search with custom field filters:

```bash
# Search with custom field filter
lspec search "authentication" --field epic=AUTH-2024

# Combine with other filters
lspec search "payment" \
  --status in-progress \
  --priority high \
  --field epic=PAYMENT-2024
```

## Variable Substitution

Variables are automatically substituted when creating specs from templates.

### Built-in Variables:

- `{name}` - Spec name
- `{date}` - Current date (YYYY-MM-DD)
- `{project_name}` - From package.json
- `{author}` - From git config user.name
- `{git_user}` - From git config user.name (alias)
- `{git_email}` - From git config user.email
- `{git_repo}` - Repository name from git remote

### Custom Variables:

Define in `.lean-spec/config.json`:

```json
{
  "variables": {
    "team": "Platform Engineering",
    "default_reviewer": "alice",
    "company": "Acme Corp",
    "product": "MyProduct"
  }
}
```

Use in templates:

```markdown
---
status: planned
created: '{date}'
assignee: '{author}'
reviewer: '{default_reviewer}'
team: '{team}'
---

# {name}

**Project**: {project_name}  
**Company**: {company}  
**Team**: {team}  
**Author**: {author} ({git_email})
```

### Frontmatter Variables:

Reference frontmatter fields in the template body:

```markdown
---
status: planned
priority: high
epic: 'AUTH-2024'
sprint: 5
---

# {name}

> **Status**: {status} · **Priority**: {priority}

This spec is part of **Epic**: {epic} in **Sprint**: {sprint}.
```

## Custom Field Types

Supported field types with automatic validation:

- **string**: Any text value
- **number**: Numeric values (auto-converted from strings)
- **boolean**: true/false values (accepts: true, false, yes, no, 1, 0)
- **array**: Array of values (must be defined in frontmatter as array)

Example with all types:

```json
{
  "custom": {
    "epic": "string",
    "sprint": "number",
    "is_breaking": "boolean",
    "tags": "array",
    "estimate": "string",
    "points": "number"
  }
}
```

## Real-World Examples

### Agile Team Setup:

```json
{
  "frontmatter": {
    "custom": {
      "epic": "string",
      "sprint": "number",
      "story_points": "number",
      "jira_id": "string",
      "team": "string"
    }
  },
  "variables": {
    "team": "Backend Squad",
    "default_reviewer": "tech-lead",
    "sprint_duration": "2 weeks"
  }
}
```

### Enterprise Setup:

```json
{
  "frontmatter": {
    "custom": {
      "department": "string",
      "cost_center": "string",
      "compliance_review": "boolean",
      "security_review": "boolean",
      "approval_status": "string",
      "budget_code": "string"
    }
  },
  "variables": {
    "company": "Enterprise Corp",
    "department": "IT",
    "compliance_officer": "jane.doe"
  }
}
```

### Open Source Project:

```json
{
  "frontmatter": {
    "custom": {
      "issue": "string",
      "pr": "string",
      "breaking": "boolean",
      "version": "string"
    }
  },
  "variables": {
    "project": "open-source-tool",
    "maintainer": "community"
  }
}
```

## Best Practices

1. **Keep it minimal**: Only add custom fields you'll actually use
2. **Use descriptive names**: `jira_id` not `j_id`
3. **Consistent naming**: Use snake_case or camelCase consistently
4. **Document your fields**: Add comments in config explaining custom fields
5. **Type safety**: Use correct types for validation (number for counts, boolean for flags)
6. **Variable defaults**: Set sensible defaults in the variables section

## Troubleshooting

### Custom fields not recognized?

Make sure they're defined in `.lean-spec/config.json` under `frontmatter.custom`.

### Variables not substituting?

- Check that variables are defined in `config.json` under `variables`
- For git variables, ensure git is configured (`git config user.name`)
- For project_name, ensure `package.json` exists with a `name` field

### Type validation errors?

If you see warnings like "Cannot convert to number", check that you're passing the correct type:

```bash
# Wrong
lspec create test --field sprint=five

# Right
lspec create test --field sprint=5
```
