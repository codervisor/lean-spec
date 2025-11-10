---
status: complete
created: '2025-11-06'
tags:
  - validation
  - cli
  - ux
  - v0.2.0
priority: high
related:
  - '043'
created_at: '2025-11-07T03:20:34.342Z'
updated_at: '2025-11-07T03:20:34.342Z'
completed_at: '2025-11-07T03:20:34.342Z'
completed: '2025-11-07'
transitions:
  - status: complete
    at: '2025-11-07T03:20:34.342Z'
---

# Lint-Style Validate Output

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-06 · **Tags**: validation, cli, ux, v0.2.0

**Project**: lean-spec  
**Team**: Core Development

## Overview

Redesign `lean-spec validate` output to follow mainstream lint tool conventions (ESLint, TypeScript, Prettier, etc.) for better consistency, clarity, and developer familiarity.

**Current Problems:**

1. **Inconsistent grouping logic** - Mixes validator-based and spec-based grouping
2. **Verbose for clean files** - Shows every passing spec (noisy when 20+ specs pass)
3. **Poor severity hierarchy** - Errors and warnings mixed in output flow
4. **Unfamiliar format** - Doesn't match tools developers use daily
5. **Redundant information** - Line count shown 3 times for same spec

**Inspiration from Mainstream Tools:**

```bash
# ESLint - File-centric, severity-grouped, clean summary
/src/utils.ts
  12:5   error    'foo' is not defined         no-undef
  15:10  warning  Unexpected console statement no-console

/src/index.ts
  8:3   error    Missing semicolon            semi

✖ 2 errors, 1 warning (2 files, 5 files clean)

# TypeScript - Location-first, concise messages
src/utils.ts(12,5): error TS2304: Cannot find name 'foo'.
src/index.ts(8,3): error TS1005: ';' expected.

Found 2 errors in 2 files.

# Prettier - Clear pass/fail, actionable suggestions
Checking formatting...
[warn] src/utils.ts
[warn] src/index.ts
Code style issues found. Run `prettier --write` to fix.
```

**Key Learnings:**

1. **File-centric grouping** - Group by file, not by rule type
2. **Severity-first** - Show errors before warnings
3. **Quiet success** - Only summarize passing files
4. **Actionable suggestions** - Clear fix recommendations
5. **Consistent formatting** - Predictable structure across runs

## Design

### Output Structure Redesign

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

### Key Design Decisions

**1. File-Centric Grouping**

Group all issues by file path, not by validator type:

```diff
- Line Count:
-   ✗ 045-unified-dashboard (1169 lines - exceeds limit!)
-   ⚠ 049-leanspec-first-principles (373 lines - approaching limit)
- 
- Structure:
-   ✓ All 25 spec(s) passed
- 
- Sub-Specs:
-   ⚠ 045-unified-dashboard
-     • Orphaned sub-spec: IMPLEMENTATION.md

+ 045-unified-dashboard/README.md
+   error    Spec exceeds 400 lines (1169 lines)                   max-lines
+   warning  Orphaned sub-spec: IMPLEMENTATION.md                  sub-specs
+
+ 049-leanspec-first-principles/README.md
+   warning  Spec approaching limit (373/400 lines)                max-lines
```

**Rationale:** Matches ESLint/TypeScript. Easier to find issues for a specific spec.

**2. Compact Error Format**

Use aligned columns like ESLint:

```
<severity>  <message>  <rule-name>
           <suggestion>
```

**3. Quiet Success Mode (Default)**

Only show specs with issues, summarize clean specs:

```diff
- Line Count:
-   ✓ 053-spec-assets-philosophy (98 lines)
-   ✓ 052-branding-assets (129 lines)
-   ✓ 043-official-launch-02 (200 lines)
-   ... (15 more passing specs)

+ ✖ 5 errors, 13 warnings (25 specs checked, 19 clean)
```

**4. Verbose Mode for Details**

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

**5. Severity Hierarchy**

Always show errors before warnings within a file:

```bash
045-unified-dashboard/README.md
  error    Spec exceeds 400 lines (1169 lines)      # Error first
  warning  Orphaned sub-spec: IMPLEMENTATION.md      # Warning second
```

### Output Format Specification

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

### CLI Flags

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

### Implementation Strategy

**Phase 1: Refactor Output Logic** (2-3 hours)
- Extract output formatting into separate module (`src/utils/validate-formatter.ts`)
- Keep existing validation logic unchanged
- Implement new file-centric grouping

**Phase 2: Implement New Format** (2-3 hours)
- Replace current display logic with new formatter
- Add alignment and color formatting
- Implement severity-first sorting

**Phase 3: Add Flags** (1-2 hours)
- Add `--verbose` flag
- Add `--quiet` flag
- Add `--format=json` support

**Phase 4: Testing** (2 hours)
- Update existing tests
- Add snapshot tests for output format
- Test with real repository

**Total Effort:** 1-2 days

### Backward Compatibility

**Breaking Changes:**

- Output format completely different (but exit codes unchanged)
- Default behavior: quiet success (was: show all passing specs)

**Migration:**

1. Release in v0.2.0 with clear CHANGELOG notes
2. Add migration guide showing old vs new output
3. Keep `--verbose` as escape hatch for old-style detail

**Rationale:** v0.2.0 is the "official launch" - acceptable time for UX breaking changes.

## Plan

**Status:** 📅 Planned for v0.2.0 (Pre-launch polish)

- [ ] Phase 1: Refactor output logic (extract formatter module)
- [ ] Phase 2: Implement new file-centric format
- [ ] Phase 3: Add CLI flags (--verbose, --quiet, --format)
- [ ] Phase 4: Update tests and documentation
- [ ] Dogfood: Run on lean-spec repo and verify clarity
- [ ] Update CHANGELOG and migration guide

**Estimated Effort:** 1-2 days

**Priority:** High - Critical for v0.2.0 UX polish

## Test

**Verification Strategy:**

- [ ] Output matches ESLint-style format (file-centric, aligned columns)
- [ ] Default mode hides passing specs (quiet success)
- [ ] `--verbose` shows all specs including passing ones
- [ ] `--quiet` suppresses warnings and summary
- [ ] `--format=json` produces valid JSON output
- [ ] Exit code 0 for warnings-only, 1 for errors (unchanged)
- [ ] Snapshot tests for output format stability
- [ ] Real repository test: `lean-spec validate` on lean-spec itself

**Success Criteria:**

- 60% reduction in output size for clean runs
- Issues are immediately visible (no scrolling)
- Beta tester feedback: "Looks like ESLint"

## Notes

### Why This Matters

**Developer Familiarity:**
- Developers use ESLint/TypeScript/Prettier daily
- Familiar format = lower cognitive load
- Matches expectations from other tools

**Signal-to-Noise:**
- Current output: 50+ lines for 25 specs (20 passing shown individually)
- New output: 15-20 lines for same data (only issues + summary)
- 60% reduction in noise

**Actionability:**
- Clear severity hierarchy (errors first)
- File-centric grouping (easier to fix spec-by-spec)
- Concise suggestions (visible, not buried)

### Design Trade-offs

**Considered: Keep Validator Grouping**

```
Pros: Shows all line count issues together
Cons: Requires scanning multiple sections per spec
```

**Decision:** File-centric grouping (like ESLint/TypeScript)

**Rationale:** Developers fix issues file-by-file, not rule-by-rule. Better to show all issues for a file together.

**Considered: Show All Passing Specs**

```
Pros: Complete transparency
Cons: Noisy output, hard to spot issues
```

**Decision:** Quiet success by default, `--verbose` for details

**Rationale:** ESLint/Prettier only show issues. Summary line provides confidence.

### Success Metrics

**Qualitative:**
- Output "feels like" ESLint/TypeScript
- Issues are immediately obvious
- Fix suggestions are actionable

**Quantitative:**
- Output size: 60% reduction for clean runs
- Time to find issue: <5 seconds (vs 10-15s currently)
- Beta tester feedback: "Looks like ESLint" positive sentiment

### Future Enhancements (Post v0.2.0)

- **Auto-fix support:** `lean-spec validate --fix` (aligns with ESLint)
- **Watch mode:** `lean-spec validate --watch` (continuous validation)
- **Custom formatters:** Plugin system for CI-specific formats
- **Rule configuration:** `.lspec/rules.json` to disable/configure rules
