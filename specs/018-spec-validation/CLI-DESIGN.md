# CLI Design

Command-line interface for the expanded `lspec check` command.

## Basic Usage

```bash
# Check everything (default: all validations)
lspec check

# Check specific aspects
lspec check --sequences          # Only sequence conflicts
lspec check --frontmatter        # Only frontmatter validation
lspec check --structure          # Only structure validation
lspec check --content            # Only content validation
lspec check --corruption         # Only corruption detection
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
```

## Output Options

```bash
# Output formatting
lspec check --format=json        # JSON output for CI
lspec check --quiet              # Brief output (errors only)
lspec check --verbose            # Detailed output with explanations

# Behavior options
lspec check --strict             # Fail on warnings (not just errors)
lspec check --fix                # Auto-fix issues where possible
```

## Backwards Compatibility

### Current Behavior (v0.1.x - v0.2.0)

```bash
lspec check          # Only checks sequence conflicts
lspec check --quiet  # Brief sequence conflict output
```

### New Behavior (v0.3.0+)

```bash
lspec check               # Checks everything (comprehensive)
lspec check --sequences   # Only sequence conflicts (explicit)
lspec check --quiet       # Brief output for all checks
```

### Migration Strategy

1. **v0.2.0**: Keep current behavior, document upcoming changes
2. **v0.3.0**: Default to comprehensive checking
3. **Config option**: `checkMode: 'sequences-only' | 'comprehensive'`

For backwards compatibility:
- Auto-check context → sequences only (preserve fast behavior)
- Explicit invocation → all checks (new comprehensive behavior)

## Console Output Format

### Default Output

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

### Quiet Output

```
✗ 2 specs with errors
```

### Verbose Output

```
📋 Checking specs...

Sequences:
  ✓ No conflicts detected
  
  Checked 12 specs in specs/
  No duplicate sequence numbers found

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

Exit codes remain backwards compatible with current `lspec check`.

## Auto-Fix Mode

```bash
lspec check --fix
```

**What Gets Fixed:**
- Missing frontmatter fields (adds with defaults)
- Date formatting (converts to ISO 8601)
- Duplicate sections (removes duplicates, keeps first)
- Unclosed code blocks (closes them)
- Visual badges (updates from frontmatter)

**What Doesn't Get Fixed:**
- Invalid status values (requires decision)
- Empty sections (requires content)
- Broken links (requires investigation)
- Complex corruption (requires judgment)

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
lspec check --status=in-progress
lspec check --status=planned,in-progress

# By tag
lspec check --tag=api
lspec check --tag=quality,validation

# By priority
lspec check --priority=high,critical

# By path pattern
lspec check specs/2025*
lspec check specs/archived/
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Check spec quality
  run: |
    lspec check --format=json --strict > check-results.json
  continue-on-error: true

- name: Comment PR with results
  uses: actions/github-script@v6
  with:
    script: |
      const results = require('./check-results.json');
      // Post comment with results
```

### Pre-Commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

# Run comprehensive checks
lspec check --format=json > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo "❌ Spec quality checks failed!"
  echo "Run 'lspec check' to see details"
  echo "Run 'lspec check --fix' to auto-fix issues"
  exit 1
fi

echo "✓ All spec quality checks passed"
```

## Design Decisions

### Why Expand `check` Instead of New `validate` Command?

1. **Simpler mental model**: One command for all quality checks
2. **Backwards compatible**: Preserve current behavior with flags
3. **More intuitive**: `lspec check` naturally means "check for issues"
4. **Avoids confusion**: No need to remember multiple commands
5. **Better UX**: Flags control what gets checked

### Flag Design Philosophy

- **Positive flags**: Enable specific checks (`--frontmatter`)
- **Negative flags**: Disable checks (`--no-sequences`)
- **Default**: Comprehensive (all checks) when no flags specified
- **Backwards compat**: `--sequences` alone = sequences-only mode

### Performance Considerations

- Fast by default (< 1s for 100 specs)
- Parallel spec loading
- Incremental checking (only changed specs in auto-check)
- Caching of check results
