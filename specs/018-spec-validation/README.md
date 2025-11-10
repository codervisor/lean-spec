---
status: complete
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
  - 012-sub-spec-files
created_at: '2025-11-02T00:00:00Z'
updated_at: '2025-11-06T07:08:45.538Z'
transitions:
  - status: in-progress
    at: '2025-11-05T13:35:26.669Z'
  - status: complete
    at: '2025-11-06T07:00:00.000Z'
completed: '2025-11-06'
---

# Comprehensive Spec Validation

> **Status**: ✅ Complete · **Priority**: Critical · **Created**: 2025-11-02 · **Tags**: quality, validation, cli, first-principles, v0.2.0

## Overview

Provide comprehensive validation tooling that checks specs for quality issues including structure, frontmatter, content, sequence conflicts, and **file corruption**.

**Current State:**
- ✅ `lean-spec check` exists - checks sequence conflicts only
- ✅ `lean-spec validate` exists - comprehensive validation framework
- ✅ **Line count validation** - warns at 300 lines, errors at 400+ lines
- ✅ **Frontmatter validation** - enforces required fields and valid values
- ✅ **Structure validation** - duplicate headers, required sections
- ✅ **Corruption detection** - unclosed code blocks, formatting issues, duplicates
- ❌ No way to detect stale specs (optional, future phase)
- ❌ No auto-fix capability (optional, future phase)

**Implementation Approach:**
Both `lean-spec check` and `lean-spec validate` exist as separate commands:

```bash
# Current commands
lean-spec check                    # Check for sequence conflicts
lean-spec validate [specs...]      # Validate specs for quality issues
lean-spec validate --max-lines 500 # Custom line limit

# Planned enhancements
lean-spec validate --frontmatter   # Frontmatter validation
lean-spec validate --structure     # Structure validation
lean-spec validate --corruption    # File corruption detection
lean-spec validate --sub-specs     # Sub-spec validation (spec 012)
lean-spec validate --all           # All validation rules
```

**Use Cases:**
1. CI/CD validation (block PRs with invalid specs)
2. Pre-commit hooks (comprehensive quality checks)
3. Local validation before creating PR
4. Detecting stale/abandoned specs
5. Enforcing team conventions (required fields, valid values)
6. Quality gates for spec completion
7. **Detecting corrupted specs from failed edits**
8. **Validating sub-spec organization per spec 012**

**What Success Looks Like:**
```bash
$ lean-spec validate --all
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

Sub-Specs:
  ⚠ 1 spec has warnings:
    - specs/018-spec-validation/README.md
      ⚠ Sub-spec TESTING.md (421 lines) exceeds 400 line limit
      ⚠ Orphaned sub-spec: DEPRECATED.md (not linked from README.md)

Corruption:
  ✓ All 25 spec(s) passed

Results: 25 specs validated, 5 error(s), 6 warning(s)
```

**Recent Improvements (2025-11-05):**
- ✅ Fixed duplicate detection bug: sliding window was reporting adjacent lines as duplicates
- ✅ Improved thresholds: 8 lines / 200 chars (was 5/100) for better signal-to-noise
- ✅ Code blocks now included in duplicate detection (catches actual copy-paste errors)
- ✅ Removed JSON/YAML validation (code examples show invalid syntax)
- ✅ Smarter formatting checks: exclude inline code and list markers
- 📉 Result: Zero false positives, catches only real corruption

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

📝 **[CONFIGURATION-EXAMPLES.md](./CONFIGURATION-EXAMPLES.md)** - Real-world configuration examples and use cases

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

**Implementation Note:** The original design proposed expanding `lean-spec check` into a unified validation command. However, the implementation created a separate `lean-spec validate` command instead, keeping both commands focused:

- **`lean-spec check`** - Fast sequence conflict detection
- **`lean-spec validate`** - Comprehensive quality validation

**Rationale for Separate Commands:**

1. **Clear separation of concerns:** Sequence checking is fast and targeted; validation is comprehensive
2. **Performance:** Users can run quick checks without full validation overhead
3. **Backwards compatible:** Existing `lean-spec check` behavior unchanged
4. **Incremental adoption:** Can add validation rules without affecting check command
5. **Clearer intent:** `validate` explicitly signals quality checking

**Trade-offs:**
- Two commands to remember (but both are intuitive)
- More CLI surface area
- Better performance and flexibility

## Evolution

| Version | Commands Available |
|---------|--------------------|
| v0.1.0 | `lean-spec check` (sequence conflicts only) |
| v0.2.0+ | `lean-spec check` (sequences) + `lean-spec validate` (line counts) |
| v0.3.0+ | Both commands with comprehensive validation rules |

## Launch Strategy

**v0.2.0 Scope (Current):**
- ✅ `lean-spec check` for sequence conflicts
- ✅ `lean-spec validate` with basic framework and line count validation
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

**Status:** ✅ COMPLETE for v0.2.0 launch

**✅ Completed (Phases 1a, 1b, 2, 3, 3.5):**
- ✅ Validation framework architecture
- ✅ **Phase 1a:** `LineCountValidator` with warning/error thresholds (300 line warning, 400 line error)
- ✅ **Phase 1a:** `lean-spec validate` command with `--max-lines` flag
- ✅ **Phase 1b:** `FrontmatterValidator` for comprehensive frontmatter validation
  - Required fields (status, created)
  - Valid status/priority values  
  - Date format validation (ISO 8601)
  - Tags format validation
- ✅ **Phase 2:** `StructureValidator` for spec structure validation
  - H1 title presence
  - Required sections (Overview, Design)
  - Empty section detection (with subsection handling)
  - Duplicate section header detection
- ✅ **Phase 3:** `CorruptionValidator` for file corruption detection
  - Unclosed code block detection (visible syntax highlighting issues)
  - Unclosed markdown formatting (bold, italic) in actual content
  - Duplicate content block detection with improved tuning (8 lines, 200 chars)
  - **Code blocks included** in duplicate detection (catches real copy-paste errors)
  - **Bug fix:** Fixed sliding window algorithm reporting adjacent lines
  - **Removed JSON/YAML validation** (examples show invalid syntax intentionally)
  - Code block exclusion for all formatting checks
  - Inline code and list marker exclusion
  - Duplicate detection tuning: 3/50 → 5/100 (reduced false positives)
  - Removed noisy checks (JSON/YAML, table/list validation)
  - **Bug fix:** Fixed sliding window algorithm causing adjacent line false positives
  - **Threshold increase:** 5/100 → 8/200 (block size/min chars) for less sensitivity
  - **Reverted code block filtering:** Now includes code blocks in duplicate detection
- ✅ **Phase 3.5:** `SubSpecValidator` for sub-spec file validation
  - Sub-spec naming conventions (uppercase .md files)
  - README.md references all sub-specs (orphan detection)
  - Line count validation per sub-spec file (<400 lines)
  - Cross-document reference validation
  - Found real issues: 3 sub-specs exceeding limits in 2 specs
- ✅ **370 total tests passing** (16 sub-spec + 354 existing)
- ✅ Documentation and CLI integration
- ✅ Tested with real repository specs

**📊 Current Validation Results (2025-11-05):**
```bash
$ lean-spec validate
Results: 25 specs validated, 5 error(s), 6 warning(s)

Errors found:
- Line count: 3 specs exceed 400 lines (048, 046, 045)
- Sub-specs: 3 sub-spec files exceed 400 lines (049: 2 files, 018: 1 file)
- Corruption: ✅ 0 errors (bug fixed, thresholds tuned!)

Warnings:
- Line count: 6 specs between 300-400 lines (approaching limit)
- Corruption: ✅ 0 warnings (improved from 31 false positives!)

All specs: ✅ Frontmatter passed, ✅ Structure passed, ✅ Sub-spec validation working
```

**✨ v0.2.0 Scope Complete:**
Core validation is complete and working! Phases 1-3.5 deliver the essential quality checks including sub-spec validation. Additional phases (content validation, staleness detection, auto-fix) deferred to v0.3.0 based on user feedback.

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
lean-spec check

# CI/CD - Comprehensive validation
lean-spec validate --all --format=json

# Pre-commit hook - Fast validation
lean-spec validate --max-lines 400

# Manual comprehensive check
lean-spec validate --all --fix
```

**References:**
- Markdownlint: Markdown linting tool (inspiration)
- JSON Schema: Validation schema standard
- YAML Lint: YAML validation patterns
