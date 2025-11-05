---
status: planned
created: '2025-11-02'
tags:
  - quality
  - validation
  - cli
  - first-principles
  - v0.2.0
priority: critical
related:
  - 043-official-launch-02
created_at: '2025-11-02T00:00:00Z'
updated_at: '2025-11-05T05:03:54.949Z'
---

# Comprehensive Spec Checking (Expand lspec check)

> **Status**: 🗓️ Planned · **Priority**: Critical · **Created**: 2025-11-02 · **Tags**: quality, validation, cli, first-principles, v0.2.0

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
```

## Design

This spec has been split into focused sub-documents for clarity and maintainability.

### Core Documents

📋 **[VALIDATION-RULES.md](./VALIDATION-RULES.md)** - What gets validated
- Frontmatter validation rules
- Structure validation rules
- Content validation rules
- Corruption detection rules
- Staleness detection rules
- Auto-fix capabilities

🔧 **[CLI-DESIGN.md](./CLI-DESIGN.md)** - Command interface
- Command syntax and flags
- Output formats (console, JSON)
- Backwards compatibility strategy
- Exit codes
- CI/CD integration examples

⚙️ **[CONFIGURATION.md](./CONFIGURATION.md)** - Configuration schema
- Complete config options
- Rule customization
- Template-specific rules
- Default configuration
- Configuration examples

🗺️ **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** - Implementation plan
- 8-phase implementation plan
- Priority and scope decisions
- Launch strategy (v0.2.0 vs v0.3.0)
- Dependencies and risks
- Migration path

✅ **[TESTING.md](./TESTING.md)** - Test strategy
- Test categories and coverage
- Integration tests
- Performance tests
- Manual testing checklist

## Design Decision

**Why Expand `check` Instead of Adding `validate`?**

1. **Simpler mental model:** One command for all quality checks
2. **Backwards compatible:** Can preserve current behavior with flags
3. **More intuitive:** `lspec check` naturally means "check for issues"
4. **Avoids confusion:** No need to remember multiple commands
5. **Better UX:** Flags control what gets checked

## Evolution

| Version | Behavior |
|---------|----------|
| v0.1.0 - v0.2.0 | `lspec check` = sequence conflicts only |
| v0.3.0+ | `lspec check` = comprehensive (all checks by default) |
| v0.3.0+ | `lspec check --sequences` = backwards compatible (sequences only) |

## Launch Strategy

**v0.2.0 Scope:**
- Keep current behavior (sequences only)
- Document expansion plan
- Lay groundwork for v0.3.0

**v0.3.0 Scope:**
- **MUST HAVE:** Framework + frontmatter + structure validation
- **HIGHLY RECOMMENDED:** Corruption detection (addresses real pain point)
- **SHOULD HAVE:** Auto-fix capability
- **NICE TO HAVE:** Content and staleness validation

**Post-v0.3.0:**
- Advanced features based on user feedback
- Custom validation rules
- Performance optimizations

## Implementation Status

See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for detailed plan.

**Current Phase:** Planning (spec 048 refactor demonstrates sub-spec approach)

**Estimated Effort:**
- Minimum viable (Phases 1-4): 9-10 days
- Complete (All phases): 15-18 days

## Quick Links

- **Validation Details:** [VALIDATION-RULES.md](./VALIDATION-RULES.md)
- **CLI Reference:** [CLI-DESIGN.md](./CLI-DESIGN.md)
- **Configuration:** [CONFIGURATION.md](./CONFIGURATION.md)
- **Implementation:** [IMPLEMENTATION.md](./IMPLEMENTATION.md)
- **Testing:** [TESTING.md](./TESTING.md)

## Notes

**Why This Matters:**

This addresses real pain points we've experienced:
- Spec corruption from failed AI edits
- Invalid frontmatter causing issues
- No way to enforce quality standards
- Manual validation is time-consuming

**Performance Goals:**
- < 1s for 100 specs
- Parallel checking
- Incremental mode for auto-check
- Caching for repeated checks

**Integration:**
```bash
# CI/CD
lspec check --strict --format=json

# Pre-commit hook
lspec check --sequences --corruption

# Manual comprehensive check
lspec check --fix
```

**References:**
- Markdownlint: Markdown linting tool (inspiration)
- JSON Schema: Validation schema standard
- YAML Lint: YAML validation patterns
