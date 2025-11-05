# CLI Design

Command-line interface for the `lspec validate` command.

**Note:** This spec originally proposed expanding `lspec check`, but the implementation created a separate `lspec validate` command for comprehensive quality validation, while keeping `lspec check` focused on sequence conflicts.

## Basic Usage

```bash
# Validate everything (default: all validations)
lspec validate

# Validate specific aspects
lspec validate --frontmatter        # Only frontmatter validation
lspec validate --structure          # Only structure validation
lspec validate --content            # Only content validation
lspec validate --corruption         # Only corruption detection
lspec validate --staleness          # Only staleness detection
lspec validate --sub-specs          # Only sub-spec validation

# Combine validations
lspec validate --frontmatter --structure
lspec validate --sub-specs --structure  # Check sub-specs and main structure

# Skip certain checks
lspec validate --no-staleness       # Skip staleness warnings

# Validate specific spec(s)
lspec validate specs/043-official-launch-02
lspec validate 043 048 018          # Multiple specs

# Filter which specs to validate
lspec validate --status=in-progress
lspec validate --tag=api

# Note: For sequence conflicts, use `lspec check` (separate command)
```

## Output Options

```bash
# Output formatting
lspec validate --format=json        # JSON output for CI
lspec validate --quiet              # Brief output (errors only)
lspec validate --verbose            # Detailed output with explanations

# Behavior options
lspec validate --strict             # Fail on warnings (not just errors)
lspec validate --fix                # Auto-fix issues where possible
```

## Command Evolution

### Current Implementation (v0.2.0+)

Two separate commands with distinct purposes:

```bash
lspec check               # Fast sequence conflict detection
lspec validate            # Comprehensive quality validation
lspec validate [specs...] # Validate specific specs
```

### Planned Enhancements (v0.3.0+)

Expand `lspec validate` with additional validation rules:

```bash
lspec validate --all           # All validation rules
lspec validate --frontmatter   # Frontmatter validation
lspec validate --structure     # Structure validation
lspec validate --corruption    # Corruption detection
```

## Console Output Format

### Default Output

```
📋 Validating specs...

Line Count:
  ✓ 10 specs within limits
  ⚠ 1 spec approaching limit (300-400 lines)
  ✗ 1 spec exceeds limit (>400 lines)

Frontmatter:
  ✗ 1 spec has errors:
    - specs/044-spec-relationships-clarity/
      • Missing required field: created
      • Invalid status: "wip"

Structure:
  ✗ 1 spec has errors:
    - specs/044-spec-relationships-clarity/
      • Missing required section: ## Testing

Sub-Specs:
  ⚠ 2 warnings:
    - specs/018-spec-validation/
      ⚠ Sub-spec TESTING.md (421 lines) exceeds 400 line limit
      ⚠ Orphaned sub-spec: DEPRECATED.md (not linked from README.md)
  ✓ All other specs with sub-specs are valid

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

Results: 8/12 passed, 2 warnings, 4 errors

Note: For sequence conflicts, run `lspec check`
```

### Quiet Output

```
✗ 2 specs with errors
```

### Verbose Output

```
📋 Validating specs...

Line Count:
  ✓ 10 specs within limits
  
  Checked 12 specs total
  - 10 specs under 300 lines (ideal)
  - 1 spec 300-400 lines (warning zone)
  - 1 spec over 400 lines (should split)

Frontmatter:
  ✗ 1 spec has errors:
  
    specs/044-spec-relationships-clarity/
      • Missing required field: created
        → Fix: Add 'created: YYYY-MM-DD' to frontmatter
      
      • Invalid status: "wip"
        → Valid values: planned, in-progress, complete, archived
        → Fix: Change status to one of the valid values

... (more detailed explanations)
```

## JSON Output Format

For CI/CD integration:

```json
{
  "summary": {
    "total": 12,
    "passed": 10,
    "failed": 2,
    "warnings": 1,
    "checks": {
      "sequences": {"passed": true, "conflicts": 0},
      "frontmatter": {"passed": false, "errors": 2},
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
              "severity": "error",
              "fixable": true
            },
            {
              "type": "malformed-code-block",
              "message": "Code block not properly closed",
              "line": 67,
              "severity": "error",
              "fixable": false
            }
          ]
        }
      }
    }
  ]
}
```

## Exit Codes

- `0` - All checks passed
- `1` - Errors found (any check failed)
- `2` - Warnings found (only in --strict mode)
- `3` - Command error (invalid arguments, etc.)

**Note:** `lspec check` (sequence conflicts) uses same exit code pattern.

## Auto-Fix Mode

```bash
lspec validate --fix
```

**What Gets Fixed:**
- Missing frontmatter fields (adds with defaults)
- Date formatting (converts to ISO 8601)
- Duplicate sections (removes duplicates, keeps first)
- Unclosed code blocks (closes them)
- Visual badges (updates from frontmatter)
- Missing sub-spec references in README.md (adds links)

**What Doesn't Get Fixed:**
- Invalid status values (requires decision)
- Empty sections (requires content)
- Broken links (requires investigation)
- Complex corruption (requires judgment)
- Sub-specs exceeding line limits (requires manual splitting)
- Orphaned sub-specs (requires decision to keep or remove)

**Output:**
```
📋 Checking and fixing specs...

Fixed 3 issues:
  ✓ specs/044-spec-relationships-clarity/
    • Added missing field: created = 2025-11-04
    • Formatted date: 2025/11/04 → 2025-11-04
  
  ✓ specs/018-spec-validation/
    • Removed duplicate section: "Auto-Fix Capability"

Could not auto-fix 2 issues:
  ✗ specs/044-spec-relationships-clarity/
    • Invalid status: "wip" - Please use: planned, in-progress, complete, archived

Results: Auto-fixed 3/5 issues
```

## Filtering Specs

```bash
# By status
lspec validate --status=in-progress
lspec validate --status=planned,in-progress

# By tag
lspec validate --tag=api
lspec validate --tag=quality,validation

# By priority
lspec validate --priority=high,critical

# By path pattern
lspec validate specs/2025*
lspec validate specs/archived/
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Check spec quality
  run: |
    lspec validate --format=json --strict > validate-results.json
  continue-on-error: true

- name: Comment PR with results
  uses: actions/github-script@v6
  with:
    script: |
      const results = require('./validate-results.json');
      // Post comment with results
```

### Pre-Commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

# Run comprehensive validation
lspec validate --format=json > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo "❌ Spec quality checks failed!"
  echo "Run 'lspec validate' to see details"
  echo "Run 'lspec validate --fix' to auto-fix issues"
  exit 1
fi

echo "✓ All spec quality checks passed"
```

## Design Decisions

### Why Separate `validate` Command (Implementation Choice)

The original spec proposed expanding `lspec check`, but the implementation created a separate `lspec validate` command:

**Rationale:**
1. **Separation of concerns**: Sequence checking is fast/targeted; validation is comprehensive
2. **Performance**: Users can run quick sequence checks without validation overhead
3. **Backwards compatible**: Existing `lspec check` behavior unchanged
4. **Incremental adoption**: Can add validation rules without affecting check command
5. **Clearer intent**: `validate` explicitly signals quality checking vs. `check` for conflicts

**Trade-offs:**
- Two commands to remember (but both are intuitive)
- More CLI surface area
- Better performance and flexibility

### Flag Design Philosophy

- **Positive flags**: Enable specific validations (`--frontmatter`, `--structure`)
- **Negative flags**: Disable validations (`--no-staleness`)
- **Default**: All available validations when no flags specified
- **Specificity**: Can validate individual specs or filter by status/tags

### Performance Considerations

- Fast by default (< 1s for 100 specs)
- Parallel spec loading
- Incremental checking (only changed specs in auto-check)
- Caching of check results
