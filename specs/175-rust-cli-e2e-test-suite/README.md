---
status: planned
created: '2025-12-18'
tags:
  - testing
  - rust
  - quality
priority: high
created_at: '2025-12-18T05:55:17.246448125+00:00'
---

# Port TypeScript E2E Test Suite to Rust CLI

> **Status**: 🗓️ Planned · **Created**: 2025-12-18

## Overview

Port the comprehensive TypeScript E2E test suite (40+ test files) to Rust integration tests for the CLI. This ensures feature parity and prevents regressions as we migrate from TypeScript to Rust.

### Background

The TypeScript CLI has excellent test coverage:
- **E2E tests**: spec-lifecycle, init, mcp-tools, create-with-content, regression tests
- **Unit tests**: validators, frontmatter parsing, git utilities, spec loader
- **Integration tests**: full command workflows

The Rust implementation currently has:
- ✅ Unit tests in `leanspec-core` (validators, spec_loader)
- ❌ NO tests in `leanspec-cli`
- ❌ NO integration/e2e tests

### Goals

1. Port all TypeScript E2E tests to Rust integration tests
2. Establish test infrastructure (helpers, fixtures, assertions)
3. Ensure all CLI commands are covered
4. Catch regressions during TS→Rust migration
5. Provide CI/CD test coverage for future development

### Existing TypeScript Test Coverage

**E2E Tests** (`packages/cli/src/__e2e__/`):
- `spec-lifecycle.e2e.test.ts` - Create→Update→Archive workflows
- `init.e2e.test.ts` - Project initialization
- `mcp-tools.e2e.test.ts` - MCP server tools
- `create-with-content.e2e.test.ts` - Template content at creation
- `regression-template.e2e.test.ts` - Regression tests

**Integration Tests**:
- `integration.test.ts` - Multi-command workflows
- `list-integration.test.ts` - List filtering

**Unit Tests**:
- Frontmatter parsing/validation
- Git timestamp utilities
- Spec loader functionality
- Structure/corruption validators
- Token counting
- Variable resolution

## Plan

### Phase 1: Test Infrastructure
- [ ] Add test dependencies (`assert_cmd`, `predicates`, optionally `insta`)
- [ ] Create `tests/helpers/mod.rs` with utilities:
  - Temporary directory management
  - CLI binary execution wrapper
  - Frontmatter parsing utilities
  - File/directory assertion helpers
  - Output capture and validation
- [ ] Create test fixtures directory structure
- [ ] Set up CI/CD test pipeline integration

### Phase 2: Port Core E2E Tests
Priority order (highest impact):
- [ ] Port `spec-lifecycle.e2e.test.ts` → `tests/integration/spec_lifecycle.rs`
  - Create→update→archive workflows
  - Multi-spec creation with sequential numbering
  - Status transitions
- [ ] Port `init.e2e.test.ts` → `tests/integration/init.rs`
  - Fresh initialization
  - Re-initialization (upgrade mode)
  - Force re-initialization
  - Template selection
  - Agent tool symlinks
  - MCP configuration
  - Error handling
- [ ] Port `create-with-content.e2e.test.ts` → `tests/integration/create.rs`
  - Content from file
  - Content from stdin
  - Template with content
- [ ] Port `mcp-tools.e2e.test.ts` → `tests/integration/mcp_tools.rs`
  - MCP server startup
  - Tool invocations
  - Error handling
- [ ] Port `regression-template.e2e.test.ts` → `tests/integration/regression.rs`
  - Known regression tests
  - Edge cases

### Phase 3: Integration Test Coverage
- [ ] Port `list-integration.test.ts` → `tests/integration/list.rs`
  - Status filtering
  - Tag filtering
  - Priority filtering
  - Assignee filtering
  - Compact output
- [ ] Create `tests/integration/link.rs` for dependency management
  - Link specs (depends_on)
  - Unlink specs
  - Circular dependency detection
- [ ] Create `tests/integration/update.rs` for metadata updates
  - Status updates
  - Priority updates
  - Tag operations (add/remove)
  - Assignee updates
- [ ] Create `tests/integration/board.rs` for board view
  - Group by status
  - Group by priority
  - Group by assignee
  - Group by tag
- [ ] Create `tests/integration/search.rs` for search functionality
  - Basic search
  - Advanced search syntax
  - Limit results
- [ ] Create `tests/integration/validate.rs` for validation
  - Single spec validation
  - All specs validation
  - Dependency alignment check
  - Strict mode
  - Warnings only mode

### Phase 4: Command Coverage Validation
Ensure every CLI command has test coverage:
- [ ] `agent` - AI agent dispatch
- [ ] `analyze` - Spec complexity analysis
- [ ] `archive` - Move spec to archived/
- [ ] `backfill` - Git timestamp backfill
- [ ] `board` - Project board view (covered in Phase 3)
- [ ] `check` - Sequence conflict detection
- [ ] `compact` - Remove line ranges
- [ ] `create` - Spec creation (covered in Phase 2)
- [ ] `deps` - Dependency graph
- [ ] `examples` - List example projects
- [ ] `files` - List spec files
- [ ] `gantt` - Timeline with dependencies
- [ ] `init` - Project initialization (covered in Phase 2)
- [ ] `link` - Link specs (covered in Phase 3)
- [ ] `list` - List specs (covered in Phase 3)
- [ ] `mcp` - MCP server (see spec 176)
- [ ] `migrate` - Migrate from other tools
- [ ] `open` - Open spec in editor
- [ ] `search` - Search specs (covered in Phase 3)
- [ ] `split` - Split spec into files
- [ ] `stats` - Project statistics
- [ ] `templates` - Manage templates
- [ ] `timeline` - Creation/completion timeline
- [ ] `tokens` - Token counting
- [ ] `ui` - Start web UI
- [ ] `unlink` - Remove dependency link (covered in Phase 3)
- [ ] `update` - Update metadata (covered in Phase 3)
- [ ] `validate` - Validate specs (covered in Phase 3)
- [ ] `view` - View spec details

### Phase 5: CI/CD Integration
- [ ] Configure test execution in GitHub Actions
- [ ] Set up test coverage reporting
- [ ] Add test performance benchmarks
- [ ] Document testing guidelines for contributors

## Test Structure

```
rust/leanspec-cli/
  tests/
    helpers/
      mod.rs              # Test utilities
      fixtures.rs         # Fixture management
      assertions.rs       # Custom assertions
    integration/
      mod.rs              # Integration test helpers
      spec_lifecycle.rs   # Create→update→archive
      init.rs             # Init command
      create.rs           # Spec creation
      update.rs           # Metadata updates
      link.rs             # Dependency linking
      list.rs             # List & filtering
      board.rs            # Board view
      search.rs           # Search
      validate.rs         # Validation
      backfill.rs         # Git backfill
      mcp_tools.rs        # MCP tools (basic CLI tests)
      regression.rs       # Regression tests
      commands/           # Individual command tests
        agent.rs
        analyze.rs
        archive.rs
        check.rs
        compact.rs
        deps.rs
        examples.rs
        files.rs
        gantt.rs
        migrate.rs
        open.rs
        split.rs
        stats.rs
        templates.rs
        timeline.rs
        tokens.rs
        ui.rs
        view.rs
    fixtures/
      minimal-project/    # Test fixtures
      multi-spec/
      with-dependencies/
      archived/
```

## Dependencies

Add to `Cargo.toml`:

```toml
[dev-dependencies]
tempfile.workspace = true
pretty_assertions.workspace = true
assert_cmd = "2.0"       # CLI testing utilities
predicates = "3.0"       # Assertion predicates
insta = "1.34"          # Snapshot testing (optional)
```

## Success Criteria

- [ ] All TypeScript E2E tests ported to Rust
- [ ] Test infrastructure established and documented
- [ ] All 29 CLI commands have test coverage
- [ ] CI/CD integration test pipeline configured
- [ ] Test execution time <30 seconds
- [ ] Test coverage report available
- [ ] Documentation for adding new tests
- [ ] Zero test failures on main branch

## Notes

### Test Helper Examples

Reference TypeScript `e2e-helpers.ts` patterns:

```typescript
// TypeScript
export function execCli(args: string[], options: { cwd: string }): ExecResult {
  const command = `node "${CLI_PATH}" ${args.join(' ')}`;
  const stdout = execSync(command, { cwd, encoding: 'utf-8' });
  return { stdout, stderr: '', exitCode: 0 };
}
```

Rust equivalent:

```rust
// Rust
pub fn exec_cli(args: &[&str], cwd: &Path) -> TestResult {
    Command::cargo_bin("lean-spec")?
        .args(args)
        .current_dir(cwd)
        .assert()
        .success();
    Ok(())
}
```

### Related Specs

- **Spec 176**: Rust MCP Server Test Suite (MCP protocol testing)
- **Spec 177**: UI E2E Test Suite with Playwright (UI testing)
- **Spec 170**: CLI/MCP/Core Rust Migration Evaluation (context)
- **Spec 173**: Rust Binaries CI/CD Pipeline (test execution infrastructure)
