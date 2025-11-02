# LeanSpec Test Suite

Comprehensive tests for the LeanSpec CLI tool's core functionality.

## Test Coverage

### commands.test.ts (19 tests)

Tests for the main CLI commands:

#### `createSpec`
- ✅ Creates new specs with default structure
- ✅ Generates sequential numbers for specs created on the same day
- ✅ Supports custom titles
- ✅ Supports descriptions
- ✅ Handles duplicate specs by incrementing sequence

#### `archiveSpec`
- ✅ Archives specs to `archived/` directory
- ✅ Preserves directory structure when archiving
- ✅ Preserves spec content when archiving
- ✅ Throws error for non-existent specs

#### `updateSpec`
- ✅ Updates spec status
- ✅ Updates spec priority
- ✅ Updates spec tags
- ✅ Updates multiple fields simultaneously
- ✅ Finds specs by relative path
- ✅ Finds specs by name only (searches date directories)
- ✅ Throws error for non-existent specs

#### `listSpecs`
- ✅ Lists all specs in the directory
- ✅ Filters specs by status
- ✅ Handles empty specs directory gracefully
- ✅ Handles non-existent specs directory gracefully

### frontmatter.test.ts (23 tests)

Tests for frontmatter parsing and filtering:

#### `parseFrontmatter`
- ✅ Parses valid YAML frontmatter
- ✅ Returns null for missing required fields (status, created)
- ✅ Falls back to inline field parsing for legacy specs
- ✅ Handles missing files gracefully
- ✅ Parses all valid status values (planned, in-progress, complete, archived)
- ✅ Parses all valid priority values (low, medium, high, critical)

#### `updateFrontmatter`
- ✅ Updates frontmatter fields
- ✅ Preserves existing fields when updating
- ✅ Auto-sets completed timestamp when status becomes complete
- ✅ Preserves content when updating frontmatter

#### `matchesFilter`
- ✅ Matches single status filter
- ✅ Matches multiple status values
- ✅ Matches tags filter (all tags must be present)
- ✅ Matches priority filter
- ✅ Matches multiple priority values
- ✅ Matches assignee filter
- ✅ Matches multiple filters combined (AND logic)
- ✅ Rejects if any filter fails

#### `getSpecFile`
- ✅ Finds default spec file (README.md)
- ✅ Returns null if spec file doesn't exist
- ✅ Supports custom default file names

### spec-loader.test.ts (14 tests)

Tests for spec loading and querying:

#### `loadAllSpecs`
- ✅ Loads all specs from directory
- ✅ Filters by single status
- ✅ Filters by multiple statuses
- ✅ Filters by tags
- ✅ Filters by priority
- ✅ Optionally includes content
- ✅ Excludes content by default
- ✅ Sorts specs by date descending (newest first)
- ✅ Returns empty array for non-existent directory

#### `getSpec`
- ✅ Gets spec by relative path
- ✅ Returns null for non-existent spec
- ✅ Gets spec by absolute path
- ✅ Includes content in result
- ✅ Parses frontmatter correctly

### integration.test.ts (5 tests)

End-to-end integration tests for complete workflows:

#### Full Spec Lifecycle
- ✅ Complete workflow: create → update → archive
- ✅ Verifies status transitions and metadata updates
- ✅ Confirms archived specs are accessible with flag

#### Multiple Specs and Filtering
- ✅ Manages multiple specs with different priorities and tags
- ✅ Tests complex filtering scenarios
- ✅ Verifies filter combinations work correctly

#### Spec Content and Search
- ✅ Loads spec content for searching
- ✅ Simulates basic content-based filtering

#### Spec Retrieval
- ✅ Retrieves specs using various path formats
- ✅ Tests different path resolution strategies

#### Date-based Organization
- ✅ Organizes specs by date
- ✅ Maintains sequential numbering within dates

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test

# Run tests once (CI mode)
pnpm test:run

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage
```
## Test Summary

**Total: 61 tests across 4 test files**

- commands.test.ts: 19 tests
- frontmatter.test.ts: 23 tests  
- spec-loader.test.ts: 14 tests
- integration.test.ts: 5 tests

## Coverage

All core functionality is covered:
- ✅ Spec creation and lifecycle management
- ✅ Frontmatter parsing and validation
- ✅ Spec filtering and querying
- ✅ File system operations
- ✅ Error handling
- ✅ End-to-end workflows
- ✅ Multiple path resolution strategies
- ✅ Date-based organizationc()` - Creates a test spec with frontmatter
- `readSpecFile()` - Reads spec file content
- `dirExists()` - Checks if directory exists
- `getTestDate()` - Gets formatted date for testing

## Test Strategy

### Isolation
Each test runs in an isolated temporary directory that is cleaned up after the test completes. This prevents test pollution and ensures tests are deterministic.

### Real File System
Tests use the real file system (via temporary directories) rather than mocking. This provides confidence that the CLI works correctly with actual file operations.

### Console Output
Commands that print to console (like `listSpecs`) are tested indirectly by verifying the underlying data structures rather than capturing stdout. This keeps tests focused on behavior rather than presentation.

### Error Handling
Error cases are tested to ensure proper error messages and graceful failure modes.

## Coverage

All core functionality is covered:
- Spec creation and lifecycle management
- Frontmatter parsing and validation
- Spec filtering and querying
- File system operations
- Error handling

## Future Tests

Potential areas for additional testing:
- `initProject` command (complex interactive flow)
- Template system
- Advanced CLI commands (board, deps, search, etc.)
- Integration tests for full workflows
- Performance tests for large spec directories
