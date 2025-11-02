---
status: planned
created: 2025-11-02
tags: [quality, validation, cli]
priority: medium
---

# spec-validation

> **Status**: 📅 Planned · **Priority**: Medium · **Created**: 2025-11-02

## Overview

Add a `lspec validate` command to check spec structure, frontmatter, and content quality. Help teams maintain spec quality standards and catch issues early.

**Current State:**
- No way to validate specs programmatically
- Easy to create specs with invalid frontmatter
- No enforcement of required fields
- No way to detect stale specs

**Use Cases:**
1. CI/CD validation (block PRs with invalid specs)
2. Pre-commit hooks
3. Local validation before creating PR
4. Detecting stale/abandoned specs
5. Enforcing team conventions

**What Success Looks Like:**
```bash
$ lspec validate
✓ 12 specs validated
✗ 1 spec has errors:
  - specs/20251102/003-npm-publishing/README.md
    • Missing required field: created
    • Invalid status: "wip" (expected: planned, in-progress, complete, archived)
```

## Design

### 1. Validation Rules

**Frontmatter Validation:**
- Required fields present (status, created)
- Valid status values (planned, in-progress, complete, archived)
- Valid priority values (low, medium, high, critical)
- Valid date formats (ISO 8601)
- Tags are array of strings
- Custom fields match config schema

**Structure Validation:**
- README.md exists in spec directory
- Frontmatter is valid YAML
- Spec has title (# heading)
- Required sections present (based on template)

**Content Validation:**
- No empty required sections
- Links are valid (no broken internal links)
- No TODO/FIXME in complete specs
- Minimum content length (avoid stub specs)

**Age/Staleness Validation:**
- Specs in "in-progress" for > 30 days
- Specs with no updates in > 90 days
- Planned specs older than 60 days

### 2. Command Interface

```bash
# Validate all specs
lspec validate

# Validate specific spec
lspec validate specs/20251102/003-npm-publishing

# Validate with filters
lspec validate --status=in-progress
lspec validate --tag=api

# Validation options
lspec validate --strict          # Fail on warnings
lspec validate --fix             # Auto-fix issues
lspec validate --format=json     # JSON output
lspec validate --rules=frontmatter,structure,content
```

### 3. Validation Rules Configuration

**In `.lspec/config.json`:**
```json
{
  "validation": {
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
      "staleness": {
        "inProgressMaxDays": 30,
        "noUpdateMaxDays": 90,
        "plannedMaxDays": 60
      }
    },
    "ignorePaths": [
      "archived/**"
    ]
  }
}
```

### 4. Validation Output

**Console Format:**
```
📋 Validating specs...

✓ specs/20251102/001-custom-spec-templates/
✗ specs/20251102/002-complete-custom-frontmatter/
  Errors:
    • [frontmatter] Missing required field: created
    • [structure] Missing required section: Test
  Warnings:
    ⚠ [staleness] In progress for 45 days

✓ specs/20251102/003-npm-publishing/

Results: 2 passed, 1 failed, 1 warning
```

**JSON Format:**
```json
{
  "summary": {
    "total": 3,
    "passed": 2,
    "failed": 1,
    "warnings": 1
  },
  "results": [
    {
      "path": "specs/20251102/002-complete-custom-frontmatter/",
      "valid": false,
      "errors": [
        {
          "rule": "frontmatter",
          "field": "created",
          "message": "Missing required field: created",
          "severity": "error"
        }
      ],
      "warnings": [
        {
          "rule": "staleness",
          "message": "In progress for 45 days",
          "severity": "warning"
        }
      ]
    }
  ]
}
```

### 5. Auto-Fix Capability

```bash
lspec validate --fix
```

**Fixable Issues:**
- Add missing required frontmatter fields (use defaults)
- Format dates to ISO 8601
- Sort frontmatter fields
- Add missing required sections (as comments)
- Update visual badges from frontmatter

**Non-Fixable (require manual intervention):**
- Invalid status/priority values
- Empty required sections
- Broken links
- Stale specs

### 6. Exit Codes

- `0` - All specs valid
- `1` - Validation errors found
- `2` - Warnings found (only in --strict mode)
- `3` - Command error (invalid arguments, etc.)

## Plan

### Phase 1: Core Validation Framework
- [ ] Create `validate.ts` command
- [ ] Implement validation result data structure
- [ ] Add config schema for validation rules
- [ ] Implement console output formatter
- [ ] Implement JSON output formatter
- [ ] Add exit code handling

### Phase 2: Frontmatter Validation
- [ ] Validate required fields present
- [ ] Validate status values
- [ ] Validate priority values
- [ ] Validate date formats
- [ ] Validate tags format
- [ ] Validate custom fields (if defined in config)

### Phase 3: Structure Validation
- [ ] Check README.md exists
- [ ] Validate YAML frontmatter syntax
- [ ] Check for title (H1 heading)
- [ ] Validate required sections present
- [ ] Check for empty sections

### Phase 4: Content Validation
- [ ] Minimum content length check
- [ ] Detect TODO/FIXME in complete specs
- [ ] Validate internal links
- [ ] Check for placeholder text

### Phase 5: Staleness Detection
- [ ] Calculate spec age (created date)
- [ ] Calculate last update (git or file mtime)
- [ ] Warn on in-progress specs > 30 days
- [ ] Warn on no updates > 90 days
- [ ] Warn on planned specs > 60 days

### Phase 6: Auto-Fix
- [ ] Implement --fix flag
- [ ] Add missing frontmatter fields
- [ ] Format dates to ISO 8601
- [ ] Sort frontmatter fields
- [ ] Update visual badges
- [ ] Report what was fixed

### Phase 7: Integration & Polish
- [ ] Add tests for all validation rules
- [ ] Update README with validate command
- [ ] Update AGENTS.md to mention validation
- [ ] Create pre-commit hook example
- [ ] Document in CI/CD guide

## Test

### Frontmatter Validation Tests
- [ ] Detects missing required fields
- [ ] Detects invalid status values
- [ ] Detects invalid priority values
- [ ] Detects invalid date formats
- [ ] Passes valid frontmatter

### Structure Validation Tests
- [ ] Detects missing README.md
- [ ] Detects invalid YAML syntax
- [ ] Detects missing title
- [ ] Detects missing required sections
- [ ] Detects empty sections

### Content Validation Tests
- [ ] Detects specs below minimum length
- [ ] Detects TODO in complete specs
- [ ] Detects broken internal links
- [ ] Passes valid content

### Staleness Tests
- [ ] Warns on old in-progress specs
- [ ] Warns on specs with no updates
- [ ] Warns on old planned specs
- [ ] No warnings for recent specs

### Auto-Fix Tests
- [ ] Adds missing frontmatter fields
- [ ] Formats dates correctly
- [ ] Updates visual badges
- [ ] Reports fixed issues
- [ ] Doesn't break valid specs

### Integration Tests
- [ ] Validates all specs in project
- [ ] Filters work correctly
- [ ] JSON output is valid
- [ ] Exit codes are correct
- [ ] Works with custom config

## Notes

**Integration with GitHub Action:**
This command is essential for the GitHub Action (spec 004). The action will use `lspec validate` under the hood.

**Validation vs. Linting:**
- Validation: Structure, required fields, data types
- Linting: Style, conventions, best practices
- This spec focuses on validation; linting is future work

**Performance:**
- Should be fast (< 1s for 100 specs)
- Parallelize spec loading
- Cache validation results
- Only validate changed specs (in CI)

**Custom Rules:**
Future enhancement - allow custom validation rules:
```json
{
  "validation": {
    "custom": [
      {
        "name": "require-epic",
        "rule": "frontmatter.epic != null",
        "message": "All specs must have an epic",
        "severity": "error"
      }
    ]
  }
}
```

**Pre-Commit Hook Example:**
```bash
#!/bin/sh
# .git/hooks/pre-commit
lspec validate --format=json > /dev/null
if [ $? -ne 0 ]; then
  echo "Spec validation failed. Run 'lspec validate' to see errors."
  exit 1
fi
```

**References:**
- Markdownlint: Markdown linting tool
- JSON Schema: Validation schema standard
