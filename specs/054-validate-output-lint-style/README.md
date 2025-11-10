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

### Summary

The new validation output follows mainstream lint tool conventions (ESLint, TypeScript, Prettier) with these key improvements:

1. **File-centric grouping** - All issues for a spec shown together (not by validator type)
2. **Quiet success by default** - Only show specs with issues, summarize passing specs
3. **Severity-first hierarchy** - Errors shown before warnings within each file
4. **Aligned column format** - Consistent spacing like ESLint: `<severity> <message> <rule>`
5. **CLI flags** - `--verbose`, `--quiet`, `--format`, `--rule` for different use cases

**Example output:**

```bash
$ lean-spec validate

Validating 25 specs...

045-unified-dashboard/README.md
  error    Spec exceeds 400 lines (1169 lines)                   max-lines
  warning  Orphaned sub-spec: IMPLEMENTATION.md                  sub-specs

✖ 5 errors, 13 warnings (25 specs checked, 19 clean)
```

### Detailed Specifications

Complete design details are documented in sub-specs:

- **[OUTPUT-FORMAT-SPEC.md](./OUTPUT-FORMAT-SPEC.md)** - Format structure, alignment rules, CLI flags, examples
- **[DESIGN-DECISIONS.md](./DESIGN-DECISIONS.md)** - Design rationale, trade-offs, backward compatibility

### Implementation Strategy

**Phase 1:** Refactor output logic (2-3 hours)  
**Phase 2:** Implement new format (2-3 hours)  
**Phase 3:** Add CLI flags (1-2 hours)  
**Phase 4:** Testing (2 hours)  

**Total Effort:** 1-2 days

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

**Developer Familiarity:** Matches ESLint/TypeScript/Prettier conventions = lower cognitive load

**Signal-to-Noise:** 60% reduction in output (15-20 lines vs 50+ lines for 25 specs)

**Actionability:** Clear severity hierarchy, file-centric grouping, visible suggestions

### Success Metrics

**Quantitative:**
- Output size: 60% reduction for clean runs
- Time to find issue: <5 seconds (vs 10-15s currently)

**Qualitative:**
- Output "feels like" ESLint/TypeScript
- Beta tester feedback: "Looks like ESLint" positive sentiment

### Future Enhancements (Post v0.2.0)

- **Auto-fix:** `lean-spec validate --fix`
- **Watch mode:** `lean-spec validate --watch`
- **Custom formatters:** Plugin system for CI-specific formats
- **Rule configuration:** `.lean-spec/rules.json` to disable/configure rules
