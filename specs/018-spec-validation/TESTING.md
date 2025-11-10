# Testing Strategy

Comprehensive test plan for the `lean-spec validate` command.

**Note:** This spec originally proposed expanding `lean-spec check`, but the implementation created `lean-spec validate` as a separate command.

## Test Categories

### 1. Frontmatter Validation Tests ✅

**Status: Phase 1b Complete - 27 tests passing**

**Missing Required Fields:**
- [x] Detects missing `status` field ✅
- [x] Detects missing `created` field ✅
- [x] Passes when all required fields present ✅
- [x] Detects when no frontmatter exists ✅
- [ ] Detects missing custom required fields (if configured) - future

**Invalid Status Values:**
- [x] Detects invalid status "wip" ✅
- [x] Detects invalid status values (any non-standard) ✅
- [x] Passes valid status "planned" ✅
- [x] Passes valid status "in-progress" ✅
- [x] Passes valid status "complete" ✅
- [x] Passes valid status "archived" ✅
- [x] Coerces non-string status to string and validates ✅

**Invalid Priority Values:**
- [x] Detects invalid priority "urgent" ✅
- [x] Detects invalid priority values (any non-standard) ✅
- [x] Passes valid priority "low" ✅
- [x] Passes valid priority "medium" ✅
- [x] Passes valid priority "high" ✅
- [x] Passes valid priority "critical" ✅
- [x] Passes when priority is optional and missing ✅
- [x] Coerces non-string priority to string and validates ✅

**Date Format Validation:**
- [x] Detects invalid date formats (11/05/2025, etc.) ✅
- [x] Detects invalid date values (2025-99-99) ✅
- [x] Passes valid date "2025-11-04" ✅
- [x] Passes valid ISO timestamps (with timezone, milliseconds) ✅
- [x] Warns for invalid optional date fields (e.g., updated) ✅
- [x] Fails for non-string/non-date created field ✅

**Tags Validation:**
- [x] Detects tags as string instead of array ✅
- [x] Accepts tags with various types (YAML parsing) ✅
- [x] Passes valid tags array ✅
- [x] Passes empty tags array ✅

**YAML Parsing:**
- [x] Detects malformed YAML frontmatter ✅

**Custom Configuration:**
- [x] Respects custom valid statuses (configurable) ✅
- [x] Validator metadata (name, description) ✅

### 2. Structure Validation Tests

**File Requirements:**
- [ ] Detects missing README.md
- [ ] Detects invalid YAML frontmatter syntax
- [ ] Detects missing title (H1 heading)
- [ ] Passes spec with valid structure

**Section Requirements:**
- [ ] Detects missing required section "Overview"
- [ ] Detects missing required section "Design"
- [ ] Detects missing required section "Plan"
- [ ] Passes when all required sections present
- [ ] Template-specific section validation

**Empty Sections:**
- [ ] Detects empty required sections (when configured)
- [ ] Passes sections with only comments (if allowed)
- [ ] Passes sections with content

**Duplicate Sections:**
- [ ] Detects duplicate "## Plan" sections
- [ ] Detects duplicate "## Test" sections
- [ ] Allows same section name at different levels
- [ ] Passes unique sections

### 3. Corruption Detection Tests

**Duplicate Sections:**
- [ ] Detects exact duplicate sections
- [ ] Detects sections with same name at same level
- [ ] Reports line numbers of duplicates
- [ ] Passes specs with unique sections

**Code Block Validation:**
- [ ] Detects unclosed code block (missing closing ```)
- [ ] Detects extra closing ``` without opening
- [ ] Detects mismatched code fence lengths
- [ ] Passes properly closed code blocks

**JSON/YAML Validation:**
- [ ] Detects incomplete JSON in code blocks
- [ ] Detects invalid JSON syntax
- [ ] Detects incomplete YAML in frontmatter
- [ ] Detects invalid YAML syntax
- [ ] Passes valid JSON blocks
- [ ] Passes valid YAML blocks

**Content Fragments:**
- [ ] Detects duplicated content blocks
- [ ] Detects partial duplicates (merge artifacts)
- [ ] Detects remnants from failed edits
- [ ] Passes unique content

**Markdown Structure:**
- [ ] Detects malformed lists
- [ ] Detects broken tables
- [ ] Detects unclosed formatting (bold, italic)
- [ ] Passes valid markdown

### 4. Content Validation Tests

**Minimum Length:**
- [ ] Detects specs below minimum length
- [ ] Passes specs above minimum length
- [ ] Respects configured minimum

**TODO/FIXME Detection:**
- [ ] Detects TODO in complete specs
- [ ] Detects FIXME in complete specs
- [ ] Allows TODO in non-complete specs
- [ ] Passes complete specs without TODO

**Link Validation:**
- [ ] Detects broken internal links
- [ ] Detects links to non-existent specs
- [ ] Passes valid internal links
- [ ] Passes external links (not validated)

**Placeholder Text:**
- [ ] Detects common placeholder patterns
- [ ] Passes real content

### 5. Staleness Tests

**In-Progress Specs:**
- [ ] Warns on in-progress spec > 30 days old
- [ ] No warning for recent in-progress specs
- [ ] Respects configured threshold

**No Updates:**
- [ ] Warns on spec with no updates > 90 days
- [ ] No warning for recently updated specs
- [ ] Uses git history when available
- [ ] Falls back to file mtime

**Planned Specs:**
- [ ] Warns on planned spec > 60 days old
- [ ] No warning for recent planned specs

**Archived Specs:**
- [ ] No staleness warnings for archived specs

### 6. Auto-Fix Tests

**Frontmatter Fixes:**
- [ ] Adds missing `status` field with default
- [ ] Adds missing `created` field with current date
- [ ] Formats dates to ISO 8601
- [ ] Sorts frontmatter fields alphabetically
- [ ] Updates visual badges from frontmatter

**Structure Fixes:**
- [ ] Adds missing required sections as comments
- [ ] Removes duplicate sections (keeps first)

**Corruption Fixes:**
- [ ] Closes unclosed code blocks
- [ ] Removes exact duplicate sections

**Non-Fixable Issues:**
- [ ] Reports invalid status (requires manual fix)
- [ ] Reports empty sections (requires content)
- [ ] Reports broken links (requires investigation)

**Fix Reporting:**
- [ ] Reports what was fixed
- [ ] Reports what couldn't be fixed
- [ ] Doesn't break valid specs
- [ ] Maintains spec readability

### 7. Integration Tests

**Multiple Specs:**
- [ ] Validates all specs in project
- [ ] Reports aggregate results
- [ ] Handles large number of specs (100+)

**Filtering:**
- [ ] Filters by status work correctly
- [ ] Filters by tag work correctly
- [ ] Filters by priority work correctly
- [ ] Path pattern filtering works

**Output Formats:**
- [ ] Console output is readable
- [ ] JSON output is valid
- [ ] Quiet mode produces minimal output
- [ ] Verbose mode includes details

**Exit Codes:**
- [ ] Returns 0 when all checks pass
- [ ] Returns 1 when errors found
- [ ] Returns 2 when warnings in strict mode
- [ ] Returns 3 on command error

**Configuration:**
- [ ] Respects custom config
- [ ] Falls back to defaults
- [ ] Command-line flags override config
- [ ] Template-specific rules work

**Backwards Compatibility:**
- [ ] `lean-spec check` (sequence conflicts) behavior unchanged
- [ ] `lean-spec validate` doesn't interfere with check command
- [ ] Exit codes follow standard pattern
- [ ] Output format is consistent

### 8. Performance Tests

**Speed:**
- [ ] Validates 10 specs in < 100ms
- [ ] Validates 100 specs in < 1s
- [ ] Parallel validation improves performance

**Memory:**
- [ ] Memory usage stays reasonable
- [ ] No memory leaks with many specs

**Caching:**
- [ ] Cached results speed up repeated checks
- [ ] Cache invalidation works correctly

### 9. Edge Cases

**Empty Specs:**
- [ ] Handles specs with only frontmatter
- [ ] Handles completely empty files

**Large Specs:**
- [ ] Handles specs > 1000 lines
- [ ] Handles specs with > 100 sections
- [ ] Performance doesn't degrade

**Special Characters:**
- [ ] Handles Unicode in frontmatter
- [ ] Handles special characters in content
- [ ] Handles emoji in titles

**Symlinks:**
- [ ] Follows symlinks correctly
- [ ] Detects circular symlinks

**Sub-Spec Files:**
- [ ] Validates specs with sub-files
- [ ] Checks README.md in multi-file specs
- [ ] Doesn't validate sub-files as specs

## Test Organization

```
src/
  commands/
    check.test.ts              # Command-level tests
    validators/
      frontmatter.test.ts      # Frontmatter validator tests
      structure.test.ts        # Structure validator tests
      corruption.test.ts       # Corruption detector tests
      content.test.ts          # Content validator tests
      staleness.test.ts        # Staleness detector tests
  integration/
    check-integration.test.ts  # End-to-end tests
```

## Test Data

```
test-fixtures/
  valid/
    001-valid-spec/
      README.md                # Completely valid spec
  invalid-frontmatter/
    002-missing-status/
      README.md                # Missing status field
    003-invalid-status/
      README.md                # Invalid status value
  invalid-structure/
    004-missing-sections/
      README.md                # Missing required sections
    005-duplicate-sections/
      README.md                # Duplicate section headers
  corrupted/
    006-unclosed-code-block/
      README.md                # Unclosed code block
    007-invalid-json/
      README.md                # Malformed JSON in code block
    008-duplicate-content/
      README.md                # Duplicated content
  stale/
    009-old-in-progress/
      README.md                # Old in-progress spec
```

## Continuous Testing

**Pre-Commit:**
```bash
npm test  # Run all tests
```

**CI/CD:**
```yaml
- name: Run tests
  run: npm test

- name: Check coverage
  run: npm run test:coverage
```

**Test Coverage Goals:**
- Overall: >80%
- Validators: >90%
- Critical paths: 100%

## Manual Testing Checklist

**Before Release:**
- [ ] Test on real project (this repo)
- [ ] Test backwards compatibility
- [ ] Test performance with 100+ specs
- [ ] Test all output formats
- [ ] Test all command-line flags
- [ ] Test configuration options
- [ ] Test auto-fix on corrupted specs
- [ ] Test CI/CD integration
- [ ] Test pre-commit hook

**Dogfooding:**
- [ ] Use comprehensive checking on lean-spec itself
- [ ] Fix any issues found
- [ ] Verify no false positives
- [ ] Collect user feedback

## Test Automation

**Snapshot Testing:**
- Output format snapshots
- JSON structure snapshots
- Error message snapshots

**Property-Based Testing:**
- Generate random specs
- Verify validators don't crash
- Verify auto-fix doesn't corrupt

**Regression Testing:**
- Save examples of past bugs
- Ensure fixes remain effective
- Prevent regressions
