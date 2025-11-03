# AI Agent Instructions

## Project: LeanSpec

Lightweight spec methodology for AI-powered development.

## Core Rules

1. **Read README.md first** - Understand project context
2. **Check specs/** - Review existing specs before starting
3. **Follow LeanSpec principles** - Clarity over documentation
4. **Keep it minimal** - If it doesn't add clarity, cut it

## When to Use Specs

- Features that affect multiple parts of the system
- Breaking changes or significant refactors
- Design decisions that need team alignment
- Complex features that benefit from upfront thinking

Skip specs for:
- Bug fixes
- Trivial changes
- Self-explanatory refactors

## Discovery Commands

Before starting work, understand project context:

- `lspec stats` - See work distribution across specs
- `lspec board` - View specs organized by status
- `lspec list --tag=<tag>` - Find specs by tag (e.g., `--tag=api`)
- `lspec search "<query>"` - Full-text search across specs
- `lspec deps <spec>` - Check dependencies before starting work

These commands help you understand what exists, what's in progress, and what depends on what.

## Spec Frontmatter

When creating or updating specs, include YAML frontmatter at the top:

```yaml
---
status: draft|planned|in-progress|complete|blocked|cancelled
created: YYYY-MM-DD
tags: [tag1, tag2]  # optional but helpful
priority: low|medium|high|critical  # optional
---
```

**Keep it minimal:**
- `status` and `created` are the core fields
- Add `tags` and `priority` when they add clarity
- Update `status` as work progresses

**Update status with:**
```bash
lspec update <spec> --status in-progress
# or edit frontmatter directly
```

## Custom Fields & Variables

LeanSpec supports custom frontmatter fields and template variables for team-specific needs.

### Custom Frontmatter Fields

Define custom fields in `.lspec/config.json`:

```json
{
  "frontmatter": {
    "custom": {
      "epic": "string",
      "sprint": "number",
      "estimate": "string",
      "reviewer": "string",
      "issue": "string"
    }
  }
}
```

**Usage:**
```bash
# Create with custom fields
lspec create auth-system --field epic=PROJ-123 --field sprint=42

# Update custom fields
lspec update my-spec --field reviewer=alice --field estimate=large

# Filter by custom fields
lspec list --field epic=PROJ-123
lspec search "database" --field sprint=42
```

### Template Variables

Use variables in `.lspec/templates/spec-template.md`:

**Built-in variables:**
- `{name}` - Spec name
- `{date}` - Creation date
- `{project_name}` - From package.json
- `{author}`, `{git_user}`, `{git_email}`, `{git_repo}` - From git config

**Custom variables** (define in config):
```json
{
  "variables": {
    "team": "Platform Team",
    "company": "Acme Corp",
    "default_reviewer": "alice"
  }
}
```

**Example template:**
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

## Workflow

1. **Discover context** - Run `lspec stats` or `lspec board` to see current state
2. **Search existing specs** - Use `lspec search` or `lspec list` to find relevant work
3. **Check dependencies** - Run `lspec deps <spec>` if working on existing spec
4. **Create or update spec** - Add frontmatter with `status` and `created`
5. **Implement changes** - Keep spec in sync as you learn
6. **Update status** - Mark progress: `draft` → `in-progress` → `complete`
7. **Archive when done** - `lspec archive <spec>` moves to archive

## Folder Structure

**Default (v0.2.0+)**: Flat structure with global sequence numbers
```
specs/
├── 001-typescript-cli-migration/
├── 002-template-system-redesign/
├── 024-flat-structure-migration/
└── archived/
```

**Legacy (v0.1.x)**: Date-based grouping (still supported via config)
```
specs/
├── 20251031/
│   ├── 001-feature-a/
│   └── 002-feature-b/
└── 20251103/
    └── 003-feature-c/  # Global sequence continues
```

**Note**: Sequence numbers are globally unique across the entire project, regardless of folder organization. See `.lspec/config.json` for current structure.

## Quality Standards

- Code is clear and maintainable
- Tests cover critical paths
- No unnecessary complexity
- Documentation where needed (not everywhere)
- Specs stay in sync with implementation

---

**Remember**: LeanSpec is a mindset. Adapt these guidelines to what actually helps.
