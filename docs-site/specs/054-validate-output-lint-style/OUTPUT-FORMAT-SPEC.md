# Output Format Specification

## Output Structure

**Principle: File-Centric, Severity-First**

Show each spec once with all its issues grouped together:

```bash
$ lean-spec validate

Validating 25 specs...

045-unified-dashboard/README.md
  error    Spec exceeds 400 lines (1169 lines)                   max-lines
  warning  Orphaned sub-spec: IMPLEMENTATION.md                  sub-specs
           → Add a link to IMPLEMENTATION.md in README.md

045-unified-dashboard/IMPLEMENTATION.md
  error    Sub-spec exceeds 400 lines (685 lines)                max-lines
           → Consider splitting or simplifying

046-stats-dashboard-refactor/README.md
  error    Spec exceeds 400 lines (685 lines)                    max-lines
           → Consider splitting into sub-specs (see spec 012)

048-spec-complexity-analysis/README.md
  error    Spec exceeds 400 lines (601 lines)                    max-lines
           → Consider splitting into sub-specs (see spec 012)

049-leanspec-first-principles/README.md
  warning  Spec approaching limit (373/400 lines)                max-lines
           → Consider simplification or splitting

049-leanspec-first-principles/ANALYSIS.md
  error    Sub-spec exceeds 400 lines (428 lines)                max-lines
           → Consider further splitting

✖ 5 errors, 13 warnings (25 specs checked, 19 clean)

Run with --verbose to see passing specs.
```

## Format Specification

**Structure:**

```
<spec-path>/<file>
  <severity>  <message>  <rule>
             <suggestion>
  <severity>  <message>  <rule>

<spec-path>/<file>
  ...

<summary>
```

**Alignment:**

```
<severity>: 7 chars left-aligned  ("error  " or "warning")
<message>:  50 chars left-aligned (truncate if needed)
<rule>:     right-aligned after message
```

**Colors:**

- `error` - Red text
- `warning` - Yellow text
- `suggestion` (→ line) - Gray text
- `summary` - Bold white (errors) or bold yellow (warnings only)
- File paths - Cyan underlined (like ESLint)

**Summary Format:**

```
✖ <N> errors, <M> warnings (<total> specs checked, <clean> clean)
```

If only warnings:
```
⚠ <M> warnings (<total> specs checked, <clean> clean)
```

If all pass:
```
✓ All <total> specs passed
```

## CLI Flags

**New Flags:**

```bash
--verbose     # Show passing specs (default: false)
--quiet       # Suppress all output except errors (no warnings, no summary)
--format      # Output format: 'default' | 'json' | 'compact'
--rule        # Filter by rule name (e.g., --rule=max-lines)
```

**Examples:**

```bash
# Default: Show only issues, quiet success
lean-spec validate

# Show everything including passing specs
lean-spec validate --verbose

# Only errors, no warnings
lean-spec validate --quiet

# JSON for CI integration
lean-spec validate --format=json

# Check only line count issues
lean-spec validate --rule=max-lines
```

## Severity Hierarchy

Always show errors before warnings within a file:

```bash
045-unified-dashboard/README.md
  error    Spec exceeds 400 lines (1169 lines)      # Error first
  warning  Orphaned sub-spec: IMPLEMENTATION.md      # Warning second
```

## Verbose Mode

Show passing specs only when requested:

```bash
$ lean-spec validate --verbose

# ... issues shown first ...

✓ 19 specs passed:
  014-complete-custom-frontmatter
  017-vscode-extension
  024-pattern-aware-list-grouping
  ...
```
