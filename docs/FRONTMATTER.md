# Frontmatter Specification

LeanSpec uses YAML frontmatter for structured metadata in specs. This provides both machine-readable data and human-readable visual badges.

## Philosophy: Start Minimal

**Core principle**: Add fields only when you feel the pain of not having them.

Start with the minimal template (status and created date). Add more fields as your team's needs grow.

## Standard Fields

### Required Fields

#### status
- **Type**: `string`
- **Values**: `planned`, `in-progress`, `complete`, `archived`
- **Description**: Current state of the spec

#### created
- **Type**: `date` (ISO 8601 format: YYYY-MM-DD)
- **Description**: When the spec was created

### Optional Standard Fields

#### tags
- **Type**: `array` of `string`
- **Example**: `[api, feature, security]`
- **Description**: Categorize and group related specs
- **Usage**: Filter with `lspec list --tag=api`

#### priority
- **Type**: `string`
- **Values**: `low`, `medium`, `high`, `critical`
- **Description**: Importance level
- **Usage**: Filter with `lspec list --priority=high`

## Template Examples

### Minimal Template

Start here for solo developers or small projects:

```yaml
---
status: planned
created: 2025-11-01
---

# My Feature

> **Status**: 📅 Planned · **Created**: 2025-11-01
```

### Standard Template (Recommended)

Adds tags and priority for better organization:

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

### Enterprise Template

Adds team coordination fields:

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

## Status Values & Emojis

- **📅 planned** - Spec is written, work hasn't started
- **🔨 in-progress** - Actively being implemented
- **✅ complete** - Implementation finished (auto-adds completion date)
- **📦 archived** - Moved to archive

## Custom Fields

Define custom fields in `.lspec/config.json` to extend metadata for your team's needs.

### Defining Custom Fields

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

**Supported types**:
- `string` - Text values
- `number` - Numeric values
- `boolean` - true/false
- `array` - Lists of values

### Using Custom Fields

#### In Commands

```bash
# Create with custom fields
lspec create user-auth --field epic=PROJ-123 --field sprint=42

# Update custom fields
lspec update my-spec --field reviewer=alice --field estimate=large

# Filter by custom fields
lspec list --field epic=PROJ-123
lspec search "API" --field sprint=42
```

#### In Frontmatter

```yaml
---
status: in-progress
created: 2025-11-01
tags: [api]
priority: high
epic: PROJ-123
sprint: 42
estimate: large
reviewer: alice
---
```

### Type Validation

Custom fields are validated and type-coerced automatically:

```bash
# This creates sprint as a number, not a string
lspec create my-spec --field sprint=42

# This creates active as a boolean
lspec create my-spec --field active=true
```

## Dual Format: YAML + Visual Badges

LeanSpec maintains both formats:

1. **YAML frontmatter** - Machine-readable for tooling
2. **Visual badges** - Human-readable summary after the title

### Auto-Sync

Visual badges automatically update when metadata changes via `lspec update`. You can also manually edit either format—they're kept in sync.

### Badge Format

The visual badge (markdown quote block) provides at-a-glance information:

```markdown
> **Status**: 🔨 In progress · **Priority**: High · **Created**: 2025-11-01 · **Tags**: api, feature
```

Multi-line for enterprise templates:

```markdown
> **Status**: 🔨 In progress · **Priority**: Critical · **Created**: 2025-11-01 · **Tags**: security, compliance  
> **Assignee**: alice · **Reviewer**: bob · **Issue**: JIRA-1234
```

## Evolution Path

1. **Start minimal** - status + created (2 fields)
2. **Add organization** - tags + priority (4 fields)
3. **Add team coordination** - assignee + reviewer (6 fields)
4. **Add project tracking** - issue + epic + custom fields (8+ fields)

Only add what you need. Keep it lean.

## Best Practices

### Keep Fields Consistent
Use consistent values across specs:
- Tags: `api`, `frontend`, `backend` (not `APIs`, `front-end`)
- Priority: Stick to the four standard values
- Custom fields: Document your conventions in team docs

### Update Status Regularly
```bash
lspec update <spec> --status=complete
```

When marking complete, LeanSpec automatically adds a completion date.

### Use Tags Strategically
Group related work for easier filtering:
- Technology: `api`, `database`, `frontend`
- Type: `feature`, `bugfix`, `refactor`
- Domain: `auth`, `payments`, `analytics`

### Define Custom Fields Early
If your team uses sprints, epics, or issue tracking, define custom fields during `lspec init` to establish conventions early.

## Migration

### From Minimal to Standard

Add tags and priority to existing specs:

```bash
lspec update specs/20251031/001-my-feature --priority=high --tags=api,feature
```

### From Standard to Enterprise

Define custom fields in `.lspec/config.json`, then update specs:

```bash
lspec update specs/20251031/001-my-feature --field assignee=alice --field epic=PROJ-123
```

### Bulk Updates

Use shell scripting for bulk updates:

```bash
# Mark all planned specs as high priority
for spec in $(lspec list --status=planned --json | jq -r '.[].path'); do
  lspec update "$spec" --priority=high
done
```
