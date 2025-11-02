# Frontmatter Reference

Complete reference for LeanSpec frontmatter fields.

This page provides a quick reference of all available fields. For usage examples and best practices, see the main frontmatter documentation.

## Required Fields

### status

**Type:** `string`  
**Values:** `planned` | `in-progress` | `complete` | `blocked` | `cancelled`  
**Description:** Current state of the spec

**Icons:**
- 📅 Planned
- 🔨 In progress
- ✅ Complete
- 🚫 Blocked
- ❌ Cancelled

### created

**Type:** `string`  
**Format:** `YYYY-MM-DD`  
**Description:** Date when spec was created

Auto-filled by `lspec create`.

## Optional Fields

### tags

**Type:** `array`  
**Description:** Categories for organization and filtering

**Example:**
```yaml
tags: [api, security, mvp]
```

### priority

**Type:** `string`  
**Values:** `low` | `medium` | `high` | `critical`  
**Description:** Importance level

### completed

**Type:** `string`  
**Format:** `YYYY-MM-DD`  
**Description:** Date when work was completed

Auto-added when status is set to `complete`.

## Custom Fields

Define in `.lspec/config.json`:

```json
{
  "frontmatter": {
    "custom": {
      "assignee": "string",
      "reviewer": "string",
      "epic": "string",
      "sprint": "number",
      "estimate": "string",
      "issue": "string"
    }
  }
}
```

**Supported types:**
- `string` - Text values
- `number` - Numeric values
- `boolean` - true/false
- `array` - Lists

## Complete Example

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
estimate: large
needs_security_review: true
---
```

---

**See also:**
- [Frontmatter Guide](/guide/frontmatter) - Usage examples
- [Custom Fields](/guide/custom-fields) - Defining custom fields
- [CLI Commands](/reference/cli) - Managing frontmatter via CLI
