# Configuration Examples

> Part of spec: [018-spec-validation](README.md)

Configuration examples for different use cases of `lspec validate`.

## Strict Mode (CI/CD)

Use for production/CI environments where you want maximum validation:

```json
{
  "validate": {
    "mode": "comprehensive",
    "autoValidate": false,
    "rules": {
      "frontmatter": {
        "required": ["status", "created", "priority"],
        "allowedStatus": ["planned", "in-progress", "complete", "archived"],
        "allowedPriority": ["low", "medium", "high", "critical"]
      },
      "structure": {
        "requireReadme": true,
        "requiredSections": ["Overview", "Design", "Plan", "Test"],
        "forbidEmptySections": true
      },
      "content": {
        "minLength": 200,
        "forbidTodoInComplete": true,
        "validateLinks": true
      },
      "corruption": {
        "detectDuplicateSections": true,
        "validateCodeBlocks": true,
        "validateJsonYaml": true,
        "detectFragments": true
      },
      "staleness": {
        "inProgressMaxDays": 30,
        "noUpdateMaxDays": 90,
        "plannedMaxDays": 60
      }
    }
  },
  "ignorePaths": [
    "archived/**",
    "drafts/**"
  ]
}
```

## Relaxed Mode (Early Development)

Use for early-stage projects or rapid prototyping:

```json
{
  "validate": {
    "mode": "quick",
    "autoValidate": false,
    "rules": {
      "frontmatter": {
        "required": ["status"],
        "allowedStatus": ["planned", "in-progress", "complete", "archived"]
      },
      "structure": {
        "requireReadme": true,
        "requiredSections": [],
        "forbidEmptySections": false
      },
      "content": {
        "minLength": 50,
        "forbidTodoInComplete": false,
        "validateLinks": false
      },
      "corruption": {
        "detectDuplicateSections": true,
        "validateCodeBlocks": false,
        "validateJsonYaml": false,
        "detectFragments": false
      },
      "staleness": {
        "inProgressMaxDays": 90,
        "noUpdateMaxDays": 180,
        "plannedMaxDays": 120
      }
    }
  }
}
```

## Custom Workflow (Sprint-Based)

Example for teams using sprint-based workflow:

```json
{
  "validate": {
    "mode": "comprehensive",
    "rules": {
      "frontmatter": {
        "required": ["status", "created", "team", "sprint"],
        "allowedStatus": ["backlog", "sprint", "review", "done"],
        "allowedPriority": ["p0", "p1", "p2", "p3"]
      },
      "structure": {
        "requiredSections": ["Problem", "Solution", "Acceptance Criteria"],
        "forbidEmptySections": true
      },
      "content": {
        "minLength": 150,
        "forbidTodoInComplete": true,
        "validateLinks": true
      }
    }
  },
  "ignorePaths": [
    "archived/**",
    "experiments/**"
  ]
}
```

## Minimal Configuration

Bare minimum for validation (uses most defaults):

```json
{
  "validate": {
    "mode": "quick"
  }
}
```

## Feature-Specific Examples

### Enforce Custom Fields

```json
{
  "validate": {
    "rules": {
      "frontmatter": {
        "required": ["status", "created", "owner", "cost_estimate"],
        "customFields": {
          "owner": { "type": "string", "pattern": "^[a-z]+$" },
          "cost_estimate": { "type": "number", "min": 0 }
        }
      }
    }
  }
}
```

### Template-Specific Validation

```json
{
  "validate": {
    "templateRules": {
      "feature": {
        "requiredSections": ["Use Cases", "Technical Design", "Rollout Plan"]
      },
      "bug": {
        "requiredSections": ["Root Cause", "Fix", "Prevention"]
      },
      "spike": {
        "requiredSections": ["Questions", "Findings", "Recommendation"]
      }
    }
  }
}
```

### Ignore Patterns

```json
{
  "validate": {
    "mode": "comprehensive"
  },
  "ignorePaths": [
    "archived/**",
    "drafts/**",
    "experiments/**",
    "**/*.backup.md",
    "temp-*/**"
  ]
}
```

## Usage with Examples

### Apply Strict Mode

```bash
# Add to .lspec/config.json, then run:
lspec validate

# Or override via CLI:
lspec validate --mode comprehensive
```

### Apply Relaxed Mode

```bash
# Use during early development:
lspec validate --mode quick

# Or with specific rules disabled:
lspec validate --no-links --no-staleness
```

### Custom Workflow

```bash
# Configure custom status values:
# .lspec/config.json with custom allowedStatus
# Then validate normally:
lspec validate
```

## Tips

1. **Start relaxed, tighten gradually** - Begin with `quick` mode, add rules as project matures
2. **Use strict mode in CI** - Catch issues before merge
3. **Customize for your workflow** - Adapt `allowedStatus` and `requiredSections` to match your process
4. **Use ignore paths wisely** - Don't validate archived or experimental specs
5. **Test configuration** - Run `lspec validate --dry-run` to preview changes
