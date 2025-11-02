# Testing

## Quick Start

```bash
# Run all tests
pnpm test

# Run tests once (CI mode)
pnpm test:run

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage
```

## Test Suite Overview

The LeanSpec project has comprehensive test coverage for all basic specs management CLI commands:

### 📊 Test Statistics

- **Total Tests**: 61
- **Test Files**: 4
- **Coverage**: Core commands, frontmatter, spec loading, and integration workflows

### 🧪 Test Files

1. **commands.test.ts** (19 tests)
   - Tests for `createSpec`, `archiveSpec`, `updateSpec`, and `listSpecs`
   - Covers spec lifecycle, error handling, and file operations

2. **frontmatter.test.ts** (23 tests)
   - YAML frontmatter parsing and validation
   - Filter matching logic
   - Content preservation during updates

3. **spec-loader.test.ts** (14 tests)
   - Loading and querying specs
   - Filtering by status, tags, priority, and assignee
   - Content loading and sorting

4. **integration.test.ts** (5 tests)
   - End-to-end workflows
   - Multiple specs management
   - Complex filtering scenarios

## Test Strategy

### Isolation
Each test runs in an isolated temporary directory that is cleaned up automatically. This ensures:
- No test pollution between tests
- Deterministic results
- Safe parallel execution

### Real File System
Tests use the real file system (via temporary directories) rather than mocking. This provides:
- Confidence that CLI works with actual file operations
- Detection of file system edge cases
- Realistic error conditions

### Comprehensive Coverage
Tests cover:
- ✅ Happy path scenarios
- ✅ Error conditions
- ✅ Edge cases
- ✅ File system operations
- ✅ Complex filtering logic
- ✅ End-to-end workflows

## Test Helpers

The `test-helpers.ts` module provides utilities for:
- Creating isolated test environments
- Initializing test projects
- Creating test specs with frontmatter
- File system operations

## Continuous Integration

Tests are designed to run in CI environments:
- Fast execution (typically < 1 second)
- No external dependencies
- Deterministic results
- Clear error messages

## Next Steps

For detailed test documentation, see [testing-details.md](testing-details.md).

To add new tests:
1. Create test file with `.test.ts` suffix
2. Use test helpers from `test-helpers.ts`
3. Follow existing patterns for setup/teardown
4. Run `pnpm test` to verify
