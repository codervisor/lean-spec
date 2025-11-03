# LeanSpec Configuration Examples

Example configurations for common use cases.

## Enterprise Team

Full tracking with epics, sprints, and reviewers:

```json
{
  "template": "spec-template.md",
  "specsDir": "specs",
  "structure": {
    "pattern": "flat",
    "prefix": "",  // No prefix - just global numbering
    "sequenceDigits": 3,
    "defaultFile": "README.md"
  },
  "frontmatter": {
    "custom": {
      "epic": "string",
      "sprint": "number",
      "estimate": "string",
      "reviewer": "string",
      "issue": "string",
      "pr": "string"
    }
  },
  "variables": {
    "team": "Platform Engineering",
    "company": "Acme Corp",
    "default_reviewer": "tech-lead"
  }
}
```

**Usage:**
```bash
lspec create user-auth \
  --field epic=PROJ-123 \
  --field sprint=42 \
  --field estimate=large \
  --field reviewer=alice \
  --priority high \
  --tags backend,security
```

## Agile Team with Sprints

Focus on sprint planning:

```json
{
  "template": "spec-template.md",
  "specsDir": "specs",
  "structure": {
    "pattern": "flat",
    "prefix": "",
    "sequenceDigits": 3,
    "defaultFile": "README.md"
  },
  "frontmatter": {
    "custom": {
      "sprint": "number",
      "story_points": "number",
      "assignee": "string"
    }
  },
  "variables": {
    "team": "Product Team",
    "sprint_length": "2 weeks"
  }
}
```

**Usage:**
```bash
# Create story for current sprint
lspec create checkout-flow \
  --field sprint=15 \
  --field story_points=8 \
  --field assignee=bob

# List all specs in sprint 15
lspec list --field sprint=15
```

## Open Source Project

Minimal tracking with issue references:

```json
{
  "template": "spec-template.md",
  "specsDir": "specs",
  "structure": {
    "pattern": "flat",
    "prefix": "",
    "sequenceDigits": 3,
    "defaultFile": "README.md"
  },
  "frontmatter": {
    "custom": {
      "issue": "string",
      "contributor": "string"
    }
  },
  "variables": {
    "project": "my-oss-project",
    "license": "MIT"
  }
}
```

**Usage:**
```bash
# Create spec linked to GitHub issue
lspec create rate-limiting \
  --field issue=GH-456 \
  --field contributor=alice \
  --tags enhancement

# Find specs by contributor
lspec list --field contributor=alice
```

## Simple Solo Developer

Bare minimum with just custom tags:

```json
{
  "template": "spec-template.md",
  "specsDir": "specs",
  "structure": {
    "pattern": "flat",
    "prefix": "",
    "sequenceDigits": 3,
    "defaultFile": "README.md"
  },
  "variables": {
    "author": "Jane Doe"
  }
}
```

No custom fields needed - use built-in `tags` and `priority` only.

## API-First Development

Track API versions and endpoints:

```json
{
  "template": "spec-template.md",
  "specsDir": "specs",
  "structure": {
    "pattern": "flat",
    "prefix": "",
    "sequenceDigits": 3,
    "defaultFile": "README.md"
  },
  "frontmatter": {
    "custom": {
      "api_version": "string",
      "endpoint": "string",
      "breaking": "boolean"
    }
  },
  "variables": {
    "api_base": "https://api.example.com",
    "current_version": "v2"
  }
}
```

**Usage:**
```bash
lspec create user-endpoint \
  --field api_version=v2 \
  --field endpoint=/api/v2/users \
  --field breaking=false \
  --tags api,users

# Find all breaking changes
lspec list --field breaking=true
```

## Tips

1. **Start minimal** - Add custom fields only when you need them
2. **Type validation** - Use appropriate types (string, number, boolean, array)
3. **Variables for constants** - Use variables for values that rarely change
4. **Custom fields for filtering** - Make fields filterable if you'll search by them
5. **Keep it team-specific** - Adapt to your team's actual workflow
