---
id: 'frontmatter'
title: 'Frontmatter'
sidebar_position: 8
---
# Frontmatter

LeanSpec uses YAML frontmatter for structured metadata at the top of each spec.

## What is Frontmatter?

Frontmatter is machine-readable metadata in YAML format:

```markdown
---
status: in-progress
created: 2025-11-02
tags: [api, security]
priority: high
---

# Your Spec Title

[Spec content...]
```

## Core Fields

### status (required)

Current state of the spec.

**Valid values:**
- `planned` - Not started yet
- `in-progress` - Currently being worked on
- `complete` - Work is finished
- `blocked` - Waiting on something
- `cancelled` - Work was abandoned

**Example:**
```yaml
status: in-progress
```

### created (required)

Date when spec was created (ISO 8601 format).

**Format:** `YYYY-MM-DD`

**Example:**
```yaml
created: 2025-11-02
```

This is auto-filled when you use `lspec create`.

## Optional Fields

### tags

Array of tags for categorization and filtering.

**Example:**
```yaml
tags: [api, security, mvp]
```

**Usage:**
```bash
lspec list --tag=api
```

### priority

Importance level of the work.

**Valid values:**
- `low`
- `medium`
- `high`
- `critical`

**Example:**
```yaml
priority: high
```

**Usage:**
```bash
lspec list --priority=high
```

### completed

Date when work was completed (auto-added).

**Format:** `YYYY-MM-DD`

**Example:**
```yaml
completed: 2025-11-05
```

This is automatically added when you set `status: complete`.

## Custom Fields

You can define custom fields in `.lspec/config.json`:

```json
{
  "frontmatter": {
    "custom": {
      "assignee": "string",
      "reviewer": "string",
      "epic": "string",
      "sprint": "number",
      "estimate": "string"
    }
  }
}
```

**Supported types:**
- `string`
- `number`
- `boolean`
- `array`

**Usage:**
```bash
lspec create feature --field assignee=alice --field sprint=42
lspec list --field epic=PROJ-123
```

See [Custom Fields](/docs/guide/custom-fields) for details.

## Visual Badges

LeanSpec auto-generates visual badges from frontmatter:

```markdown
> **Status**: 🔨 In progress · **Priority**: High · **Created**: 2025-11-02 · **Tags**: api, security
```

**Status icons:**
- 📅 Planned
- 🔨 In progress
- ✅ Complete
- 🚫 Blocked
- ❌ Cancelled

These badges are automatically updated when you use `lspec update`.

## Full Example

```yaml
---
status: in-progress
created: 2025-11-02
completed: 
tags: [api, authentication, security]
priority: high
assignee: alice
reviewer: bob
epic: PROJ-123
sprint: 42
---

# User Authentication API

> **Status**: 🔨 In progress · **Priority**: High · **Created**: 2025-11-02  
> **Tags**: api, authentication, security · **Assignee**: alice · **Reviewer**: bob

[Spec content...]
```

## Editing Frontmatter

### Via CLI

Recommended approach:

```bash
lspec update specs/20251102/001-feature --status=complete --priority=critical
```

This updates both frontmatter and visual badges.

### Manual Editing

You can also edit frontmatter directly in the file:

1. Open `README.md` in editor
2. Modify YAML between `---` markers
3. Save file

Note: Manual edits don't auto-update visual badges. Run `lspec update` to sync.

## Best Practices

::: tip Start Minimal
Begin with just `status` and `created`. Add fields only when you need them.
:::

::: tip Use Tags Consistently
Establish tag conventions for your team. Examples: `api`, `ui`, `backend`, `security`.
:::

::: tip Update Status Regularly
Keep status current. Use `lspec list` to see what's in progress.
:::

::: tip Don't Over-Customize
Add custom fields sparingly. Each field is overhead to maintain.
:::

---

**Next**: Learn about [Custom Fields](/docs/guide/custom-fields) or explore [Variables](/docs/guide/variables).
