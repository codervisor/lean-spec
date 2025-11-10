# Configuration

Configuration options for the `lean-spec validate` command.

> See [CONFIGURATION-EXAMPLES.md](./CONFIGURATION-EXAMPLES.md) for practical examples

## Configuration File

Configuration is stored in `.lean-spec/config.json`:

```json
{
  "validate": {
    "mode": "comprehensive",
    "rules": { /* rule configuration */ }
  },
  "ignorePaths": ["archived/**"]
}
```

## Complete Schema

```json
{
  "validate": {
    "mode": "comprehensive",
    "autoValidate": false,
    "rules": {
      "frontmatter": {
        "required": ["status", "created"],
        "allowedStatus": ["planned", "in-progress", "complete", "archived"],
        "allowedPriority": ["low", "medium", "high", "critical"]
      },
      "structure": {
        "requireReadme": true,
        "requiredSections": ["Overview", "Design", "Plan"],
        "forbidEmptySections": true
      },
      "content": {
        "minLength": 100,
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
  "ignorePaths": ["archived/**"]
}
```

## Configuration Options

### Validation Mode

```json
{
  "validate": {
    "mode": "comprehensive"  // or "quick"
  }
}
```

**Modes:**
- `"comprehensive"` - All validations (default)
- `"quick"` - Basic checks only (faster)

### Frontmatter Rules

```json
{
  "validate": {
    "rules": {
      "frontmatter": {
        "required": ["status", "created"],
        "allowedStatus": ["planned", "in-progress", "complete", "archived"],
        "allowedPriority": ["low", "medium", "high", "critical"]
      }
    }
  }
}
```

**Options:**
- `required` - Required frontmatter fields (array of strings)
- `allowedStatus` - Valid status values (array of strings)
- `allowedPriority` - Valid priority values (array of strings)

### Structure Rules

```json
{
  "validate": {
    "rules": {
      "structure": {
        "requireReadme": true,
        "requiredSections": ["Overview", "Design", "Plan"],
        "forbidEmptySections": true
      }
    }
  }
}
```

**Options:**
- `requireReadme` - Spec must have README.md (boolean)
- `requiredSections` - Section headers that must exist (array of strings)
- `forbidEmptySections` - Empty sections are invalid (boolean)

### Content Rules

```json
{
  "validate": {
    "rules": {
      "content": {
        "minLength": 100,
        "forbidTodoInComplete": true,
        "validateLinks": true
      }
    }
  }
}
```

**Options:**
- `minLength` - Minimum character count (number)
- `forbidTodoInComplete` - No TODO/FIXME in complete specs (boolean)
- `validateLinks` - Check internal links are valid (boolean)

### Corruption Detection

```json
{
  "validate": {
    "rules": {
      "corruption": {
        "detectDuplicateSections": true,
        "validateCodeBlocks": true,
        "validateJsonYaml": true,
        "detectFragments": true
      }
    }
  }
}
```

**Options:**
- `detectDuplicateSections` - Find duplicate section headers (boolean)
- `validateCodeBlocks` - Check code blocks are properly closed (boolean)
- `validateJsonYaml` - Validate JSON/YAML syntax (boolean)
- `detectFragments` - Find duplicated content fragments (boolean)

### Staleness Rules

```json
{
  "validate": {
    "rules": {
      "staleness": {
        "inProgressMaxDays": 30,
        "noUpdateMaxDays": 90,
        "plannedMaxDays": 60
      }
    }
  }
}
```

**Options:**
- `inProgressMaxDays` - Days before warning on in-progress specs (number)
- `noUpdateMaxDays` - Days before warning on stale specs (number)
- `plannedMaxDays` - Days before warning on old planned specs (number)

## Ignore Paths

```json
{
  "ignorePaths": [
    "archived/**",
    "experiments/**",
    "drafts/**"
  ]
}
```

Glob patterns to exclude from validation:
- `archived/**` - Ignore all archived specs
- `**/OLD_*.md` - Ignore files starting with OLD_
- `experiments/` - Ignore entire directory

## Configuration Precedence

1. **Command-line flags** (highest priority)
2. **Project config** (`.lean-spec/config.json`)
3. **Built-in defaults** (lowest priority)

Example:
```bash
# CLI flag overrides config
lean-spec validate --mode quick
```

## Default Configuration

If no configuration file exists:

```json
{
  "validate": {
    "mode": "comprehensive",
    "autoValidate": false,
    "rules": {
      "frontmatter": {
        "required": ["status", "created"],
        "allowedStatus": ["planned", "in-progress", "complete", "archived"]
      },
      "structure": {
        "requireReadme": true,
        "requiredSections": [],
        "forbidEmptySections": false
      },
      "content": {
        "minLength": 0,
        "forbidTodoInComplete": false,
        "validateLinks": false
      },
      "corruption": {
        "detectDuplicateSections": true,
        "validateCodeBlocks": true,
        "validateJsonYaml": false,
        "detectFragments": false
      },
      "staleness": {
        "inProgressMaxDays": 90,
        "noUpdateMaxDays": 180,
        "plannedMaxDays": 120
      }
    }
  },
  "ignorePaths": []
}
```

## Quick Reference

### Common Configurations

**Strict (CI/CD):**
```json
{
  "validate": {
    "mode": "comprehensive",
    "rules": {
      "content": { "minLength": 200, "forbidTodoInComplete": true },
      "structure": { "forbidEmptySections": true },
      "staleness": { "inProgressMaxDays": 14 }
    }
  }
}
```

**Relaxed (Development):**
```json
{
  "validate": {
    "mode": "quick",
    "rules": {
      "content": { "minLength": 50 },
      "staleness": { "inProgressMaxDays": 90 }
    }
  }
}
```

See [CONFIGURATION-EXAMPLES.md](./CONFIGURATION-EXAMPLES.md) for more examples.
