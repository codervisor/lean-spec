# Configuration

Configuration options for the expanded `lspec check` command.

## Configuration File Location

Configuration is stored in `.lspec/config.json`:

```json
{
  "check": {
    // Check mode configuration
  }
}
```

## Complete Configuration Schema

```json
{
  "check": {
    "mode": "comprehensive",
    "autoCheck": true,
    "autoCheckMode": "sequences-only",
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
  "ignorePaths": [
    "archived/**"
  ]
}
```

## Configuration Options

### Check Mode

```json
{
  "check": {
    "mode": "comprehensive",  // or "sequences-only"
    "autoCheck": true,
    "autoCheckMode": "sequences-only"
  }
}
```

**Options:**
- `mode`: Default check mode when running `lspec check`
  - `"comprehensive"` - All checks (default in v0.3.0+)
  - `"sequences-only"` - Sequences only (backwards compatible)

- `autoCheck`: Enable automatic checking on spec operations
  - `true` - Auto-check after create/update
  - `false` - Manual checking only

- `autoCheckMode`: Which checks run automatically
  - `"sequences-only"` - Fast, lightweight (recommended)
  - `"comprehensive"` - All checks (slower but thorough)

### Frontmatter Rules

```json
{
  "check": {
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
- `required`: Array of required frontmatter fields
- `allowedStatus`: Valid values for `status` field
- `allowedPriority`: Valid values for `priority` field (if present)

**Example - Custom Status Values:**
```json
{
  "check": {
    "rules": {
      "frontmatter": {
        "allowedStatus": ["draft", "review", "approved", "archived"]
      }
    }
  }
}
```

### Structure Rules

```json
{
  "check": {
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
- `requireReadme`: Spec must have README.md
- `requiredSections`: Array of section names that must exist
- `forbidEmptySections`: Empty sections are invalid

**Example - Minimal Structure:**
```json
{
  "check": {
    "rules": {
      "structure": {
        "requiredSections": ["Overview"],
        "forbidEmptySections": false
      }
    }
  }
}
```

### Content Rules

```json
{
  "check": {
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
- `minLength`: Minimum character count for spec
- `forbidTodoInComplete`: No TODO/FIXME in complete specs
- `validateLinks`: Check internal links are valid

**Example - Relaxed Content Rules:**
```json
{
  "check": {
    "rules": {
      "content": {
        "minLength": 50,
        "forbidTodoInComplete": false,
        "validateLinks": false
      }
    }
  }
}
```

### Corruption Detection Rules

```json
{
  "check": {
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
- `detectDuplicateSections`: Find duplicate section headers
- `validateCodeBlocks`: Check code blocks are properly closed
- `validateJsonYaml`: Validate JSON/YAML syntax
- `detectFragments`: Find duplicated content fragments

### Staleness Rules

```json
{
  "check": {
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
- `inProgressMaxDays`: Days before warning on in-progress specs
- `noUpdateMaxDays`: Days before warning on stale specs
- `plannedMaxDays`: Days before warning on old planned specs

**Example - Stricter Staleness:**
```json
{
  "check": {
    "rules": {
      "staleness": {
        "inProgressMaxDays": 14,
        "noUpdateMaxDays": 30,
        "plannedMaxDays": 30
      }
    }
  }
}
```

## Ignore Paths

```json
{
  "ignorePaths": [
    "archived/**",
    "experiments/**",
    "old/**"
  ]
}
```

**Glob patterns** to exclude from checking:
- `archived/**` - Ignore all archived specs
- `**/OLD_*.md` - Ignore files starting with OLD_
- `experiments/` - Ignore entire directory

## Template-Specific Rules

Different templates can have different rules:

```json
{
  "check": {
    "templates": {
      "minimal": {
        "rules": {
          "structure": {
            "requiredSections": ["Goal"]
          }
        }
      },
      "standard": {
        "rules": {
          "structure": {
            "requiredSections": ["Overview", "Design", "Plan"]
          }
        }
      },
      "enterprise": {
        "rules": {
          "structure": {
            "requiredSections": ["Overview", "Research", "Design", "Plan", "Test", "Risks"]
          },
          "frontmatter": {
            "required": ["status", "created", "assignee", "reviewer"]
          }
        }
      }
    }
  }
}
```

## Custom Validation Rules (Future)

```json
{
  "check": {
    "custom": [
      {
        "name": "require-epic",
        "rule": "frontmatter.epic != null",
        "message": "All specs must have an epic",
        "severity": "error"
      },
      {
        "name": "tag-convention",
        "rule": "frontmatter.tags.every(t => t.match(/^[a-z-]+$/))",
        "message": "Tags must be lowercase with hyphens",
        "severity": "warning"
      }
    ]
  }
}
```

## Configuration Precedence

1. **Command-line flags** (highest priority)
2. **Project config** (`.lspec/config.json`)
3. **Template defaults**
4. **Built-in defaults** (lowest priority)

Example:
```bash
# Command-line flag overrides config
lspec check --no-staleness
# Even if config has staleness enabled
```

## Default Configuration

If no configuration file exists, these defaults are used:

```json
{
  "check": {
    "mode": "comprehensive",
    "autoCheck": true,
    "autoCheckMode": "sequences-only",
    "rules": {
      "frontmatter": {
        "required": ["status", "created"],
        "allowedStatus": ["planned", "in-progress", "complete", "archived"],
        "allowedPriority": ["low", "medium", "high", "critical"]
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
        "validateJsonYaml": true,
        "detectFragments": true
      },
      "staleness": {
        "inProgressMaxDays": 30,
        "noUpdateMaxDays": 90,
        "plannedMaxDays": 60
      }
    }
  }
}
```

## Configuration Examples

### Strict Mode (CI/CD)

```json
{
  "check": {
    "mode": "comprehensive",
    "rules": {
      "frontmatter": {
        "required": ["status", "created", "priority"],
        "allowedStatus": ["planned", "in-progress", "complete", "archived"]
      },
      "structure": {
        "requiredSections": ["Overview", "Design", "Plan", "Test"],
        "forbidEmptySections": true
      },
      "content": {
        "minLength": 200,
        "forbidTodoInComplete": true,
        "validateLinks": true
      }
    }
  }
}
```

### Relaxed Mode (Early Development)

```json
{
  "check": {
    "mode": "sequences-only",
    "rules": {
      "frontmatter": {
        "required": ["status"]
      },
      "structure": {
        "requiredSections": []
      }
    }
  }
}
```

### Custom Workflow

```json
{
  "check": {
    "rules": {
      "frontmatter": {
        "required": ["status", "created", "team", "sprint"],
        "allowedStatus": ["backlog", "sprint", "review", "done"]
      },
      "structure": {
        "requiredSections": ["Problem", "Solution", "Acceptance Criteria"]
      }
    }
  }
}
```
