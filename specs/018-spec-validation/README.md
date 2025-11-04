---
status: planned
created: '2025-11-02'
tags: ["quality","validation","cli"]
priority: high
related:
  - 043-official-launch-02
---

# Comprehensive Spec Checking (Expand lspec check)

> **Status**: 📅 Planned · **Priority**: High · **Created**: 2025-11-02

## Overview

Expand the existing `lspec check` command to be a comprehensive validation tool that checks specs for quality issues including structure, frontmatter, content, sequence conflicts, and **file corruption**.

**Current State:**
- ✅ `lspec check` exists but only checks sequence conflicts
- ❌ No way to validate spec content/frontmatter programmatically
- ❌ Easy to create specs with invalid frontmatter
- ❌ No enforcement of required fields
- ❌ No way to detect stale specs
- ❌ **No detection of file corruption/malformed content**

**Proposed Change:**
Make `lspec check` the unified validation command with flags to control what gets checked:

```bash
lspec check                    # Check everything (sequences, frontmatter, structure)
lspec check --sequences        # Only sequence conflicts (current behavior)
lspec check --frontmatter      # Only frontmatter validation
lspec check --structure        # Only structure validation
lspec check --corruption       # Only file corruption detection
lspec check --no-sequences     # Skip sequence checking
```

**Use Cases:**
1. CI/CD validation (block PRs with invalid specs)
2. Pre-commit hooks (comprehensive quality checks)
3. Local validation before creating PR
4. Detecting stale/abandoned specs
5. Enforcing team conventions (required fields, valid values)
6. Quality gates for spec completion
7. **Detecting corrupted specs from failed edits**

**What Success Looks Like:**
```bash
$ lspec check
Checking specs...

Sequences:
  ✓ No sequence conflicts detected

Frontmatter:
  ✗ 1 spec has invalid frontmatter:
    - specs/043-official-launch-02/README.md
      • Missing required field: created
      • Invalid status: "wip" (expected: planned, in-progress, complete, archived)

Structure:
  ✓ All specs have valid structure

Corruption:
  ✗ 1 spec has corruption issues:
    - specs/018-spec-validation/README.md
      • Duplicate sections found: "Auto-Fix Capability" (line 245, 320)
      • Malformed code block (line 67-68)
      • Incomplete JSON (line 156)

Results: 10/12 passed

# Or check specific things:
$ lspec check --sequences
✓ No sequence conflicts detected

$ lspec check --corruption
✗ 1 spec corrupted (see above)
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
- No empty required sections
- No duplicate section headers

**Content Validation:**
- No empty required sections
- Links are valid (no broken internal links)
- No TODO/FIXME in complete specs
- Minimum content length (avoid stub specs)

**Corruption Detection (NEW):**
- No duplicate section headers at same level
- Code blocks are properly closed (matching ``` or `````)
- JSON/YAML blocks are complete and parseable
- No fragments of old content after edits
- No malformed markdown (unclosed lists, broken tables)
- Frontmatter YAML is well-formed
- No duplicate content blocks (same text appearing multiple times)

**Staleness Validation:**
- Specs in "in-progress" for > 30 days
- Specs with no updates in > 90 days
- Planned specs older than 60 days

### 2. Command Interface

```bash
# Check everything (default: all validations)
lspec check

# Check specific aspects
lspec check --sequences          # Only sequence conflicts (backwards compatible)
lspec check --frontmatter        # Only frontmatter validation
lspec check --structure          # Only structure validation
lspec check --content            # Only content validation
lspec check --corruption         # Only corruption detection (NEW)
lspec check --staleness          # Only staleness detection

# Combine checks
lspec check --frontmatter --structure

# Skip certain checks
lspec check --no-sequences       # Skip sequence conflict check
lspec check --no-staleness       # Skip staleness warnings

# Check specific spec
lspec check specs/043-official-launch-02

# Filter which specs to check
lspec check --status=in-progress
lspec check --tag=api

# Output options
lspec check --strict             # Fail on warnings (not just errors)
lspec check --fix                # Auto-fix issues where possible
lspec check --format=json        # JSON output for CI
lspec check --quiet              # Brief output (for auto-check)

# Backwards compatibility
lspec check -q                   # Same as current behavior (sequence conflicts only, quiet)
```

### 3. Backwards Compatibility

**Migration Strategy:**

Current behavior (v0.2.0 and earlier):
```bash
lspec check          # Only checks sequence conflicts
lspec check --quiet  # Brief sequence conflict output
```

New behavior (v0.3.0+):
```bash
lspec check               # Checks everything (sequences + frontmatter + structure + corruption)
lspec check --sequences   # Only sequence conflicts (explicit)
lspec check --quiet       # Brief output for all checks

# For backwards compatibility, we can detect usage:
# - If used in auto-check context → sequences only (preserve behavior)
# - If explicitly invoked → all checks (new comprehensive behavior)
# - Add config option: checkMode: 'sequences-only' | 'comprehensive'
```

**Transition Plan:**
1. v0.2.0: Keep current behavior, document deprecation
2. v0.3.0: Add comprehensive checking with flags, default to all checks
3. Provide `checkMode` config for users who want old behavior

### 4. Configuration

**In `.lspec/config.json`:**
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

### 5. Check Output

**Console Format:**
```
📋 Checking specs...

Sequences:
  ✓ No conflicts detected

Frontmatter:
  ✗ 1 spec has errors:
    - specs/044-spec-relationships-clarity/
      • Missing required field: created
      • Invalid status: "wip"

Structure:
  ✗ 1 spec has errors:
    - specs/044-spec-relationships-clarity/
      • Missing required section: Test

Corruption:
  ✗ 1 spec corrupted:
    - specs/018-spec-validation/
      • Duplicate section: "Auto-Fix Capability" (lines 245, 320)
      • Malformed code block (line 67)
      • Incomplete JSON (line 156)

Content:
  ⚠ 1 warning:
    - specs/043-official-launch-02/
      ⚠ In progress for 45 days

Results: 1/3 passed, 1 warning, 2 errors
```

**JSON Format:**
```json
{
  "summary": {
    "total": 3,
    "passed": 1,
    "failed": 2,
    "warnings": 1,
    "checks": {
      "sequences": {"passed": true, "conflicts": 0},
      "frontmatter": {"passed": false, "errors": 1},
      "structure": {"passed": false, "errors": 1},
      "corruption": {"passed": false, "errors": 3},
      "content": {"passed": true, "warnings": 1}
    }
  },
  "results": [
    {
      "path": "specs/018-spec-validation/",
      "valid": false,
      "checks": {
        "sequences": {"passed": true},
        "frontmatter": {"passed": true},
        "structure": {"passed": true},
        "corruption": {
          "passed": false,
          "errors": [
            {
              "type": "duplicate-section",
              "message": "Duplicate section: 'Auto-Fix Capability'",
              "locations": [245, 320],
              "severity": "error"
            },
            {
              "type": "malformed-code-block",
              "message": "Code block not properly closed",
              "line": 67,
              "severity": "error"
            }
          ]
        }
      }
    }
  ]
}
```

### 6. Auto-Fix Capability

```bash
lspec check --fix
```

**Fixable Issues:**
- Add missing required frontmatter fields (use defaults)
- Format dates to ISO 8601
- Sort frontmatter fields
- Add missing required sections (as comments)
- Update visual badges from frontmatter
- Close unclosed code blocks (where unambiguous)
- Remove duplicate sections (keep first occurrence)

**Non-Fixable (require manual intervention):**
- Invalid status/priority values
- Empty required sections
- Broken links
- Stale specs
- Complex corruption requiring human judgment

### 7. Exit Codes

- `0` - All checks passed
- `1` - Errors found (any check failed)
- `2` - Warnings found (only in --strict mode)
- `3` - Command error (invalid arguments, etc.)

**Backwards compatible:** Exit codes remain the same as current `lspec check`

## Plan

**Status (2025-11-04):** Planned - part of Phase 2 feature work for v0.2.0/v0.3.0 launch

**Implementation Priority:** HIGH - Critical for quality gates and prevents spec corruption

### Phase 1: Refactor Existing Check Command
- [ ] Refactor `check.ts` to support multiple check types
- [ ] Create modular check framework (pluggable validators)
- [ ] Implement check result data structure
- [ ] Update console output formatter for multiple check types
- [ ] Implement JSON output formatter
- [ ] Add flag parsing for --sequences, --frontmatter, --corruption, etc.
- [ ] Maintain backwards compatibility with current behavior

**Notes:** Build on existing `check` command rather than creating new command. Preserve auto-check behavior.

### Phase 2: Frontmatter Validation (HIGHEST PRIORITY)
- [ ] Create frontmatter validator module
- [ ] Validate required fields present
- [ ] Validate status values
- [ ] Validate priority values
- [ ] Validate date formats
- [ ] Validate tags format
- [ ] Validate custom fields (if defined in config)
- [ ] Integrate into `lspec check --frontmatter`

**Notes:** Most critical for catching common mistakes. Enables comprehensive pre-commit hooks.

### Phase 3: Structure Validation
- [ ] Create structure validator module
- [ ] Check README.md exists
- [ ] Validate YAML frontmatter syntax
- [ ] Check for title (H1 heading)
- [ ] Validate required sections present
- [ ] Check for empty sections
- [ ] Detect duplicate section headers
- [ ] Integrate into `lspec check --structure`

**Notes:** Ensures spec consistency across team.

### Phase 4: Corruption Detection (NEW - HIGH PRIORITY)
- [ ] Create corruption detector module
- [ ] Detect duplicate sections at same level
- [ ] Validate code blocks are properly closed
- [ ] Check JSON/YAML blocks are complete and parseable
- [ ] Detect content fragments (partial duplicates)
- [ ] Validate markdown structure (lists, tables)
- [ ] Detect malformed frontmatter
- [ ] Integrate into `lspec check --corruption`

**Notes:** Prevents the corruption issues we've been experiencing. Should run by default.

### Phase 5: Content Validation (OPTIONAL for v0.2.0)
- [ ] Minimum content length check
- [ ] Detect TODO/FIXME in complete specs
- [ ] Validate internal links
- [ ] Check for placeholder text

**Notes:** Nice to have, can defer to v0.3.0 if time-constrained.

### Phase 6: Staleness Detection (OPTIONAL for v0.2.0)
- [ ] Calculate spec age (created date)
- [ ] Calculate last update (git or file mtime)
- [ ] Warn on in-progress specs > 30 days
- [ ] Warn on no updates > 90 days
- [ ] Warn on planned specs > 60 days

**Notes:** Useful for maintenance, lower priority for launch.

### Phase 7: Auto-Fix (OPTIONAL for v0.2.0)
- [ ] Implement --fix flag
- [ ] Add missing frontmatter fields
- [ ] Format dates to ISO 8601
- [ ] Sort frontmatter fields
- [ ] Update visual badges
- [ ] Remove duplicate sections
- [ ] Close unclosed code blocks
- [ ] Report what was fixed

**Notes:** Great UX feature, can defer to post-launch iteration.

### Phase 8: Integration & Polish
- [ ] Add tests for all check types
- [ ] Update README with expanded check command
- [ ] Update AGENTS.md to mention comprehensive checking
- [ ] Create pre-commit hook example
- [ ] Document migration guide for backwards compatibility
- [ ] Update MCP server to expose new check capabilities

**Launch Strategy (2025-11-04):**
- **MUST HAVE:** Phases 1-3 (refactored framework + frontmatter + structure validation)
- **HIGHLY RECOMMENDED:** Phase 4 (corruption detection - addresses real pain point)
- **SHOULD HAVE:** Phase 7 (auto-fix, at least for corruption issues)
- **NICE TO HAVE:** Phases 5-6 (content, staleness)
- **v0.2.0 Scope:** Keep current behavior, document expansion plan
- **v0.3.0 Scope:** Roll out comprehensive checking with backwards compatibility
- **Post-v0.3.0:** Add advanced features based on user feedback

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
- [ ] Detects duplicate section headers

### Corruption Detection Tests (NEW)
- [ ] Detects duplicate sections
- [ ] Detects unclosed code blocks
- [ ] Detects incomplete JSON/YAML
- [ ] Detects content fragments
- [ ] Detects malformed markdown
- [ ] Passes clean, well-formed specs

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
- [ ] Removes duplicate sections
- [ ] Closes unclosed code blocks
- [ ] Reports fixed issues
- [ ] Doesn't break valid specs

### Integration Tests
- [ ] Validates all specs in project
- [ ] Filters work correctly
- [ ] JSON output is valid
- [ ] Exit codes are correct
- [ ] Works with custom config
- [ ] Backwards compatible with old usage

## Notes

**Design Decision: Why Expand `check` Instead of Adding `validate`?**

1. **Simpler mental model:** One command for quality checks
2. **Backwards compatible:** Can preserve current behavior with flags
3. **More intuitive:** `lspec check` naturally means "check my specs for issues"
4. **Avoids confusion:** No need to remember which command does what
5. **Better UX:** Flags let users control what gets checked

**Evolution:**

| Version | Behavior |
|---------|----------|
| v0.1.0 - v0.2.0 | `lspec check` = sequence conflicts only |
| v0.3.0+ | `lspec check` = comprehensive (all checks by default) |
| v0.3.0+ | `lspec check --sequences` = backwards compatible (sequences only) |

**Integration with CI/CD:**
Single command for all quality checks:
```bash
lspec check                  # Everything
lspec check --format=json    # For CI parsing
lspec check --strict         # Fail on warnings too
```

**Pre-Commit Hook Example:**
```bash
#!/bin/sh
# .git/hooks/pre-commit

# Run all quality checks
lspec check --format=json > /dev/null

if [ $? -ne 0 ]; then
  echo "Spec quality checks failed. Run 'lspec check' to see details."
  exit 1
fi
```

**Auto-Check Behavior:**
Current behavior will be preserved for auto-check (sequence conflicts only) to keep it lightweight:
```typescript
// In config
{
  "check": {
    "autoCheck": true,
    "autoCheckMode": "sequences-only"  // Lightweight for auto-check
  }
}

// Manual invocation defaults to comprehensive
lspec check  // Runs all checks including corruption detection
```

**Why Corruption Detection Matters:**

This addresses a real pain point we've experienced multiple times:
- Incomplete file edits leaving fragments
- Duplicate sections from failed merge operations  
- Unclosed code blocks from partial replacements
- JSON/YAML corruption from string manipulation errors

Having automated detection prevents shipping corrupted specs and catches issues early.

**Checking vs. Linting:**
- Checking (this spec): Structure, required fields, data types, conflicts, corruption
- Linting (future): Style, conventions, best practices, consistency

**Performance:**
- Should be fast (< 1s for 100 specs)
- Parallelize spec loading
- Cache check results
- Only check changed specs in auto-check mode

**Custom Rules:**
Future enhancement - allow custom validation rules:
```json
{
  "check": {
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

**References:**
- Markdownlint: Markdown linting tool (inspiration for corruption detection)
- JSON Schema: Validation schema standard
- YAML Lint: YAML validation patterns
