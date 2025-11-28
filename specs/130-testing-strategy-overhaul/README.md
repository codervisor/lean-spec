---
status: planned
created: '2025-11-28'
tags:
  - testing
  - quality
  - dx
  - infrastructure
  - maintainability
priority: high
created_at: '2025-11-28T03:19:25.087Z'
---

# Testing Strategy Overhaul for Long-term Quality

> **Status**: 📅 Planned · **Priority**: High · **Created**: 2025-11-28

**Project**: lean-spec  
**Team**: Core Development

## Overview

As LeanSpec grows (CLI, MCP server, Web UI, core library), our testing approach needs to evolve. Current unit-focused strategy missed the `lean-spec init` re-initialization bug where "AGENTS.md preserved" was falsely reported.

**Current State:**
- 52 test files, ~17k lines, 851 tests (all unit/integration via Vitest)
- Strong coverage: validators, commands, search, frontmatter
- Gaps: E2E CLI scenarios, cross-package integration, regression testing

**Problem:** Unit tests verify individual functions but miss user-facing workflows and edge cases in real usage patterns.

## Current Test Inventory

| Package | Test Files | Focus |
|---------|-----------|-------|
| `@leanspec/cli` | 35 | Commands, validators, MCP server |
| `@leanspec/core` | 12 | Search, token counting, validators |
| `@leanspec/ui` | 5 | Components, API routes |

## Design

### Testing Pyramid for LeanSpec

```
         /\
        /E2E\        ← CLI scenarios, real filesystem
       /──────\
      /Integration\   ← Cross-package, MCP tools
     /──────────────\
    /    Unit Tests   \  ← Current strength
   /────────────────────\
```

### Proposed Test Categories

1. **Unit Tests** (keep) - Pure function logic, validators, parsers
2. **Integration Tests** (expand) - Command flows with real filesystem
3. **E2E/Scenario Tests** (new) - Full CLI workflows, realistic user journeys
4. **Regression Tests** (new) - Specific bug scenarios as guards

### E2E Test Framework

Create `packages/cli/src/__e2e__/` for scenario-based tests:

```typescript
// Example: init-scenarios.e2e.test.ts
describe('lean-spec init scenarios', () => {
  it('should recreate AGENTS.md when missing during upgrade', async () => {
    // Setup: init, delete AGENTS.md
    // Action: run init again
    // Assert: AGENTS.md exists, correct message shown
  });
  
  it('should preserve custom AGENTS.md during upgrade', async () => {
    // Setup: init, modify AGENTS.md
    // Action: run init again  
    // Assert: custom content preserved
  });
});
```

## Plan

- [ ] **Audit current coverage gaps** - Map untested user workflows
- [ ] **Create E2E test infrastructure** - `__e2e__` folder, longer timeouts, real CLI execution
- [ ] **Add init command scenarios** - Fresh, upgrade, reset, force flag
- [ ] **Add spec lifecycle scenarios** - create → update → link → archive
- [ ] **Add MCP tool scenarios** - Tool calls with real specs
- [ ] **Create regression test template** - For future bug-fix PRs
- [ ] **Document testing guidelines** - When to write which test type
- [ ] **CI integration** - Separate E2E job (slower, more resources)

## Test Categories Mapping

| Scenario | Current Coverage | Proposed |
|----------|-----------------|----------|
| `init` fresh project | ❌ None | E2E |
| `init` re-initialization | ❌ None (bug found) | E2E |
| `create` with various flags | ✅ Unit | Keep |
| `update` status transitions | ✅ Integration | Keep |
| `link`/`unlink` bidirectional | ✅ Integration | Keep |
| `validate` with real specs | ⚠️ Partial | E2E |
| MCP server tool calls | ✅ Unit | + E2E |
| Web UI API routes | ⚠️ Partial | + E2E |

## Success Criteria

- [ ] E2E tests catch the original `init` bug
- [ ] Coverage includes all major CLI commands with realistic scenarios
- [ ] Regression tests added for every bug fix
- [ ] Test execution time remains reasonable (<30s unit, <2min E2E)
- [ ] Guidelines documented in CONTRIBUTING.md

## Notes

**Why not just more unit tests?**
- Unit tests mock dependencies, missing real interactions
- The `init` bug was in the *flow* between functions, not individual functions
- E2E tests catch "works on my machine" issues

**Inspiration:**
- Playwright for CLI testing patterns
- Jest's `--runInBand` for sequential E2E
- Real filesystem over mocks for CLI tools
