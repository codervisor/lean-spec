---
status: complete
created: '2025-11-03'
tags:
  - security
  - refactor
priority: high
completed: '2025-11-03'
---

# console-log-chalk-security

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-03 · **Tags**: security, refactor

**Project**: lean-spec  
**Team**: Core Development

## Overview

**Security Issue**: Direct use of `console.log` with `chalk` throughout the codebase creates a potential security vulnerability. User-controlled input that flows through chalk formatting without proper sanitization could be exploited via terminal escape sequences or ANSI injection attacks.

**Why now**: This is a security concern that should be addressed before wider adoption. The codebase has 40+ instances of `console.log` + `chalk` usage that need to be audited and potentially refactored.

## Security Concerns

1. **ANSI Injection**: Malicious spec names or metadata could inject terminal control sequences
2. **Terminal Escape Abuse**: Unescaped user input could manipulate terminal behavior
3. **Output Integrity**: Attackers could craft inputs that alter display or hide information

**Attack Vector Example**:
```
lean-spec create "\x1b[0m\x1b[31mFAKE ERROR\x1b[0m"
```

## Design

**Approach**: Create a safe output abstraction layer

1. **Centralized Output Module** (`src/utils/safe-output.ts`):
   - Sanitize all user-provided input before chalk formatting
   - Strip ANSI sequences from untrusted strings
   - Provide safe wrappers: `safeLog()`, `safeSuccess()`, `safeWarn()`, etc.

2. **Input Sanitization**:
   - Escape or strip terminal control characters
   - Validate spec names, paths, and metadata
   - Use allowlist approach for known-safe characters

3. **Migration Strategy**:
   - Replace direct `console.log(chalk...)` with safe wrappers
   - Update `src/utils/ui.ts` to use sanitization
   - Audit all instances found in grep results

## Plan

- [ ] Create `src/utils/safe-output.ts` with sanitization utilities
- [ ] Implement `stripAnsi()` and `sanitizeUserInput()` functions
- [ ] Add safe output wrappers (safeLog, safeSuccess, safeWarn, etc.)
- [ ] Update `src/utils/ui.ts` to use safe wrappers internally
- [ ] Migrate all console.log + chalk usage in commands:
  - [ ] `src/commands/board.ts` (18 instances)
  - [ ] `src/commands/search.ts` (8 instances)
  - [ ] `src/commands/files.ts` (9 instances)
  - [ ] `src/commands/deps.ts` (1 instance)
  - [ ] `src/commands/update.ts` (2 instances)
  - [ ] `src/utils/template-helpers.ts` (3 instances)
- [ ] Add ESLint rule to prevent direct console.log + chalk usage
- [ ] Add security documentation to README

## Test

- [ ] Unit tests for ANSI injection attempts
- [ ] Test spec creation with malicious names containing escape sequences
- [ ] Verify output sanitization doesn't break legitimate formatting
- [ ] Test edge cases: unicode, emojis, special characters
- [ ] Manual testing with terminal escape sequences
- [ ] Verify no ANSI bleeding in error messages

## Notes

**Libraries to consider**:
- `strip-ansi` - Well-maintained library for stripping ANSI codes
- `ansi-regex` - For detection/validation

**Files with console.log + chalk**:
- 40+ instances found across 7 files
- Most concentrated in `board.ts` (18), `search.ts` (8), `files.ts` (9)

**Severity**: High - This affects all user-facing output and could be exploited in automated environments or CI/CD pipelines where lean-spec commands process untrusted input.
