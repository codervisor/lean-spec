---
status: in-progress
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
updated_at: '2025-11-05T14:03:23.163Z'
transitions:
  - status: in-progress
    at: '2025-11-05T13:35:26.669Z'
---

# Comprehensive Spec Validation

> **Status**: ⏳ In progress · **Priority**: Critical · **Created**: 2025-11-02 · **Tags**: quality, validation, cli, first-principles, v0.2.0

## Overview

Provide comprehensive validation tooling that checks specs for quality issues including structure, frontmatter, content, sequence conflicts, and **file corruption**.

**Current State:**
- ✅ `lspec check` exists - checks sequence conflicts only
- ✅ `lspec validate` exists - basic validation framework with line count checking
- ⏳ Need comprehensive validation rules (frontmatter, structure, corruption)
- ❌ No enforcement of required fields
- ❌ No way to detect stale specs
- ❌ **No detection of file corruption/malformed content**

**Implementation Approach:**
Both `lspec check` and `lspec validate` exist as separate commands:

```bash
# Current commands
lspec check                    # Check for sequence conflicts
lspec validate [specs...]      # Validate specs for quality issues
lspec validate --max-lines 500 # Custom line limit

# Planned enhancements
lspec validate --frontmatter   # Frontmatter validation
lspec validate --structure     # Structure validation
lspec validate --corruption    # File corruption detection
lspec validate --all           # All validation rules
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
$ lspec validate --all
Validating specs...

Line Count:
  ✓ 043-official-launch-02 (387 lines)
  ⚠ 048-spec-complexity-analysis (356 lines - approaching limit)
  ✗ 018-spec-validation (455 lines - exceeds limit!)
     → Consider splitting into sub-specs (see spec 012)

Frontmatter:
  ✗ 1 spec has invalid frontmatter:
    - specs/043-official-launch-02/README.md
      • Invalid status: "wip" (expected: planned, in-progress, complete, archived)

Structure:
  ✓ All specs have valid structure

Corruption:
  ✗ 1 spec has corruption issues:
    - specs/018-spec-validation/README.md
      • Duplicate sections found: "Auto-Fix Capability" (line 245, 320)
      • Malformed code block (line 67-68)

Results: 10/13 passed, 1 warning, 3 failed
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

**Implementation Note:** The original design proposed expanding `lspec check` into a unified validation command. However, the implementation created a separate `lspec validate` command instead, keeping both commands focused:

- **`lspec check`** - Fast sequence conflict detection
- **`lspec validate`** - Comprehensive quality validation

**Rationale for Separate Commands:**

1. **Clear separation of concerns:** Sequence checking is fast and targeted; validation is comprehensive
2. **Performance:** Users can run quick checks without full validation overhead
3. **Backwards compatible:** Existing `lspec check` behavior unchanged
4. **Incremental adoption:** Can add validation rules without affecting check command
5. **Clearer intent:** `validate` explicitly signals quality checking

**Trade-offs:**
- Two commands to remember (but both are intuitive)
- More CLI surface area
- Better performance and flexibility

## Evolution

| Version | Commands Available |
|---------|--------------------|
| v0.1.0 | `lspec check` (sequence conflicts only) |
| v0.2.0+ | `lspec check` (sequences) + `lspec validate` (line counts) |
| v0.3.0+ | Both commands with comprehensive validation rules |

## Launch Strategy

**v0.2.0 Scope (Current):**
- ✅ `lspec check` for sequence conflicts
- ✅ `lspec validate` with basic framework and line count validation
- ⏳ Expand validation rules in upcoming phases

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

**Current Phase:** Phase 1b Complete (Frontmatter validation)

**Completed:**
- ✅ Validation framework architecture
- ✅ `LineCountValidator` with warning/error thresholds
- ✅ `lspec validate` command with `--max-lines` flag
- ✅ `FrontmatterValidator` for comprehensive frontmatter validation
  - Required fields (status, created)
  - Valid status/priority values
  - Date format validation (ISO 8601)
  - Tags format validation
- ✅ Integration tests and documentation
- ✅ Tested with real repository specs

**Next Steps:**
- Phase 2: Structure validation (README.md exists, required sections, etc.)
- Phase 3: Corruption detection (duplicate sections, malformed code blocks)
- Phase 4: Content validation (minimum length, TODO/FIXME detection)

**Estimated Effort (Remaining):**
- Phases 2-4: 6-7 days
- Complete (All phases): 11-13 days

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
# CI/CD - Quick sequence check
lspec check

# CI/CD - Comprehensive validation
lspec validate --all --format=json

# Pre-commit hook - Fast validation
lspec validate --max-lines 400

# Manual comprehensive check
lspec validate --all --fix
```

**References:**
- Markdownlint: Markdown linting tool (inspiration)
- JSON Schema: Validation schema standard
- YAML Lint: YAML validation patterns
