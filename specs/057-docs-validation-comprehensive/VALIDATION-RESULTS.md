# Documentation Validation Results

**Validation Date**: 2025-11-06  
**Spec**: 057-docs-validation-comprehensive  
**Purpose**: Comprehensive validation of all documentation against actual implementation

## Executive Summary

This document contains systematic validation of all LeanSpec documentation against:
- Source code implementation (`src/`)
- CLI command behavior (`lspec --help`)
- Template files (`templates/`)
- Configuration schemas (`config.ts`, `frontmatter.ts`)

**Status**: 🚧 In Progress (Primary validation complete, testing phase next)

**Issues Found**: 11 critical/medium issues documented

**Most Critical Findings:**
1. **Configuration structure completely out of sync** - Documentation shows wrong field structure
2. **Invalid status values in docs** - Documents `blocked` and `cancelled` which don't exist
3. **Missing CLI options** - Many commands missing documented options
4. **Init prompts documented but not validated** - Need to verify actual prompts match

---

## Validation Progress

### Documentation Pages

- [ ] `docs/guide/index.mdx` - Overview
- [ ] `docs/guide/getting-started.mdx` - Installation & init
- [ ] `docs/guide/philosophy.mdx` - Core philosophy
- [ ] `docs/guide/first-principles.mdx` - First principles
- [ ] `docs/guide/principles.mdx` - Agile principles  
- [ ] `docs/guide/when-to-use.mdx` - Decision framework
- [ ] `docs/guide/templates.mdx` - Template system
- [ ] `docs/guide/frontmatter.mdx` - Frontmatter fields
- [ ] `docs/guide/custom-fields.mdx` - Custom fields
- [ ] `docs/guide/variables.mdx` - Variable substitution
- [ ] `docs/guide/development.mdx` - Contributing
- [x] `docs/reference/cli.mdx` - CLI commands (in progress)
- [ ] `docs/reference/config.mdx` - Configuration
- [ ] `docs/reference/frontmatter.mdx` - Frontmatter reference
- [ ] `docs/ai-integration/index.mdx` - AI overview
- [ ] `docs/ai-integration/setup.mdx` - AI setup
- [ ] `docs/ai-integration/agents-md.mdx` - AGENTS.md template
- [ ] `docs/ai-integration/best-practices.mdx` - AI best practices
- [ ] `docs/ai-integration/examples.mdx` - AI examples

---

## Issues Found

### Critical Issues

#### Issue #1: Missing CLI options in `lspec create` documentation

- **Location**: `docs-site/docs/reference/cli.mdx` (lines 54-58)
- **Docs say**: 
  ```
  Options:
  - `--status <status>` - Set initial status (default: `planned`)
  - `--priority <priority>` - Set priority (`low`, `medium`, `high`, `critical`)
  - `--tags <tags>` - Comma-separated tags
  - `--field <key=value>` - Set custom field (can be used multiple times)
  ```
- **Reality is**: CLI has additional options not documented:
  ```
  --title <title>          Set custom title
  --description <desc>     Set initial description
  --assignee <name>        Set assignee
  --template <template>    Use a specific template
  --no-prefix              Skip date prefix even if configured
  ```
- **Severity**: **Critical** - Users are missing important functionality
- **Fix**: Add missing options to the documentation
- **Verification**: Run `lspec create --help` and compare to docs

#### Issue #2: Status icon mismatch in `lspec list` output

- **Location**: `docs-site/docs/reference/cli.mdx` (lines 139-144)
- **Docs say**:
  ```
  Status Icons:
  - 📅 Planned
  - 🔨 In progress
  - ✅ Complete
  - 🚫 Blocked
  - ❌ Cancelled
  ```
- **Reality is**: Need to verify actual icon implementation in source code
- **Severity**: **Medium** - Icons "Blocked" and "Cancelled" may not exist in StatusSchema
- **Fix**: Verify against `src/frontmatter.ts` StatusSchema and update
- **Verification**: Check StatusSchema type definition: `'planned' | 'in-progress' | 'complete' | 'archived'`

**UPDATE**: Verified - StatusSchema only has: `planned`, `in-progress`, `complete`, `archived`. No `blocked` or `cancelled`.

---

### Medium Issues

#### Issue #3: Missing validation of `lspec list` filtering options

- **Location**: `docs-site/docs/reference/cli.mdx` (lines 97-102)
- **Docs say**: Several filtering options listed
- **Reality is**: Need to verify all options against actual CLI help output
- **Severity**: **Medium** - Need to ensure complete accuracy
- **Fix**: Cross-reference with `lspec list --help` output
- **Verification**: Command shows:
  ```
  --archived               Include archived specs
  --status <status>        Filter by status (planned, in-progress, complete, archived)
  --tag <tag...>           Filter by tag (can specify multiple)
  --priority <priority>    Filter by priority (low, medium, high, critical)
  --assignee <name>        Filter by assignee
  --field <name=value...>  Filter by custom field (can specify multiple)
  --sort <field>           Sort by field (id, created, name, status, priority) (default: "id")
  --order <order>          Sort order (asc, desc) (default: "desc")
  ```

**Missing in docs**: `--archived`, `--sort`, `--order`, `--assignee`

---

#### Issue #4: Incorrect status values in frontmatter documentation

- **Location**: `docs-site/docs/reference/frontmatter.mdx` (line 17)
- **Docs say**: 
  ```
  Values: `planned` | `in-progress` | `complete` | `blocked` | `cancelled`
  ```
- **Reality is**: According to `src/frontmatter.ts` line 9:
  ```typescript
  export type SpecStatus = 'planned' | 'in-progress' | 'complete' | 'archived';
  ```
- **Severity**: **Critical** - Documentation shows invalid status values
- **Fix**: Remove `blocked` and `cancelled`, change to match actual schema
- **Verification**: Check StatusSchema type in `src/frontmatter.ts`

#### Issue #5: Status icon mismatch in frontmatter docs (duplicate)

- **Location**: `docs-site/docs/reference/frontmatter.mdx` (lines 20-25)
- **Same as Issue #2** - Shows icons for `blocked` and `cancelled` which don't exist
- **Severity**: **Critical**
- **Fix**: Remove lines for blocked and cancelled icons
- **Verification**: Only show icons for: planned, in-progress, complete, archived

---

### Minor Issues

#### Issue #6: Variable status formatting differs

- **Location**: `docs-site/docs/guide/variables.mdx` - documents built-in variables
- **Docs say**: Variables like `{status}` can be used
- **Reality is**: `src/utils/variable-resolver.ts` shows status formatting:
  ```typescript
  'planned': '📅 Planned',
  'in-progress': '⏳ In progress',  // Note: ⏳ not 🔨
  'complete': '✅ Complete',
  'archived': '📦 Archived',
  ```
- **Severity**: **Minor** - Icon for in-progress is ⏳ not 🔨 as shown in CLI docs
- **Fix**: Standardize icons across all documentation
- **Verification**: Check `variable-resolver.ts` line 70-76

#### Issue #7: Missing CLI options for `lspec list`

- **Location**: `docs-site/docs/reference/cli.mdx` (lines 97-102)
- **Docs say**: Lists filtering options but missing several
- **Reality is**: According to `lspec list --help`:
  - Missing: `--archived` (Include archived specs)
  - Missing: `--sort <field>` (Sort by field)
  - Missing: `--order <order>` (Sort order)
  - Missing: `--assignee <name>` (Filter by assignee)
- **Severity**: **Medium** - Users missing useful filtering options
- **Fix**: Add all missing options to documentation
- **Verification**: Run `lspec list --help`

#### Issue #8: Missing CLI options for `lspec search`

- **Location**: `docs-site/docs/reference/cli.mdx` (lines 211-215)
- **Docs say**: Lists some filtering options
- **Reality is**: According to `lspec search --help`:
  - Missing: `--priority <priority>` (Filter by priority)
  - Missing: `--assignee <name>` (Filter by assignee)
- **Severity**: **Medium** - Incomplete option documentation
- **Fix**: Add missing options
- **Verification**: Run `lspec search --help`

#### Issue #9: Missing CLI options for `lspec update`

- **Location**: `docs-site/docs/reference/cli.mdx` (lines 162-167)
- **Docs say**: Lists update options
- **Reality is**: According to `lspec update --help`:
  - Missing: `--assignee <name>` (Set assignee)
- **Severity**: **Medium** - Missing documented option
- **Fix**: Add `--assignee` option to docs
- **Verification**: Run `lspec update --help`

---

### Validation In Progress

#### Issue #10: Configuration documentation completely out of sync

- **Location**: `docs-site/docs/reference/config.mdx` (entire file)
- **Docs say**: Shows simplified config structure:
  ```json
  {
    "specsDir": "specs",
    "archiveDir": "archive",
    "templateFile": ".lspec/templates/spec-template.md",
    "frontmatter": {...},
    "variables": {}
  }
  ```
- **Reality is**: According to `src/config.ts`, actual structure is:
  ```typescript
  {
    template: string;
    templates?: Record<string, string>;
    specsDir: string;
    autoCheck?: boolean;
    structure: {
      pattern: 'flat' | 'custom' | string;
      dateFormat: string;
      sequenceDigits: number;
      defaultFile: string;
      prefix?: string;
      groupExtractor?: string;
      groupFallback?: string;
    };
    features?: {...};
    frontmatter?: {...};
    variables?: {...};
  }
  ```
- **Severity**: **CRITICAL** - Documentation shows completely different structure
- **Fix**: Rewrite entire configuration reference to match actual implementation
- **Missing fields in docs**:
  - `template` (used instead of `templateFile`)
  - `templates` (multiple template support)
  - `autoCheck` (sequence conflict checking)
  - `structure` object (entire section missing)
  - `features` object (AI agents, examples, etc.)
  - No mention of `archiveDir` in actual code
- **Verification**: Compare against `LeanSpecConfig` interface in `src/config.ts`

#### Issue #11: Getting started shows wrong structure explanation

- **Location**: `docs-site/docs/guide/getting-started.mdx` (lines 126-136)
- **Docs say**: Shows simplified config structure (same as Issue #10)
- **Reality is**: Same structural issues as Issue #10
- **Severity**: **CRITICAL** - Users will be confused
- **Fix**: Update example config to match actual structure
- **Verification**: Test that shown config actually works

---

## Summary of Issues

### By Severity

**Critical (5 issues):**
- Issue #1: Missing CLI options in `lspec create`
- Issue #2: Invalid status values in `lspec list` docs
- Issue #4: Invalid status values in frontmatter reference
- Issue #5: Status icons for non-existent statuses
- Issue #10: Configuration structure completely out of sync

**Medium (5 issues):**
- Issue #3: Missing validation needed for list options
- Issue #7: Missing CLI options for `lspec list`
- Issue #8: Missing CLI options for `lspec search`
- Issue #9: Missing CLI options for `lspec update`
- Issue #11: Getting started config example wrong

**Minor (1 issue):**
- Issue #6: Inconsistent status icon (⏳ vs 🔨)

### By File

**`docs-site/docs/reference/cli.mdx`** (6 issues):
- Issues #1, #2, #3, #7, #8, #9

**`docs-site/docs/reference/frontmatter.mdx`** (2 issues):
- Issues #4, #5

**`docs-site/docs/reference/config.mdx`** (1 issue):
- Issue #10

**`docs-site/docs/guide/getting-started.mdx`** (1 issue):
- Issue #11

**`docs-site/docs/guide/variables.mdx`** (1 issue):
- Issue #6

### Validation Coverage

**Validated:**
- ✅ CLI command help output vs documentation
- ✅ Status schema (StatusSchema type)
- ✅ Priority schema (PrioritySchema type)
- ✅ Configuration structure (LeanSpecConfig interface)
- ✅ Variable resolution system
- ✅ Template files existence and structure
- ✅ Frontmatter field definitions

**Still Need Validation:**
- ⏳ Init flow interactive prompts
- ⏳ Code examples (bash commands)
- ⏳ YAML/JSON examples (syntax validation)
- ⏳ Link validation (internal references)
- ⏳ AI integration setup accuracy
- ⏳ Custom fields filtering behavior
- ⏳ Variable substitution in practice

---

## Recommendations

### High Priority Fixes

1. **Fix Status Schema** - Remove `blocked` and `cancelled` everywhere
   - Files: `cli.mdx`, `frontmatter.mdx`
   - Change to: `planned`, `in-progress`, `complete`, `archived`

2. **Rewrite Configuration Reference** - Match actual structure
   - File: `config.mdx`
   - Must include: `template`, `templates`, `structure`, `features`, `autoCheck`
   - Remove: `archiveDir`, `templateFile` (wrong field names)

3. **Add Missing CLI Options** - Document all available options
   - Files: `cli.mdx`
   - Commands: `create`, `list`, `search`, `update`

4. **Standardize Status Icons** - Use consistent icons
   - Decide: ⏳ or 🔨 for in-progress
   - Update all documentation to match source code

### Medium Priority

5. **Validate Code Examples** - Test all bash commands
6. **Validate Init Prompts** - Match actual interactive flow
7. **Fix Getting Started Config** - Show correct structure

### Testing Plan

**Phase 1: Unit Testing**
- Test each CLI command with all options
- Verify config file loading with various structures
- Test variable substitution

**Phase 2: Integration Testing**
- Run `lspec init` and verify prompts
- Create specs with various options
- Test filtering and searching

**Phase 3: Example Testing**
- Run every bash command in documentation
- Validate every YAML/JSON example
- Test every configuration snippet

---

## Next Steps

1. **Complete validation** - Finish remaining areas
2. **Create fix PR** - Address all critical issues
3. **Test fixes** - Verify all corrections work
4. **Update spec 057** - Mark as complete

---

**Completed:**
- [x] CLI commands - basic validation
- [x] Status schema validation
- [x] Variables system validation
- [x] Template structure validation
- [x] Configuration structure validation

**Remaining:**
- [ ] Init flow prompts validation
- [ ] Custom fields validation
- [ ] AI integration documentation
- [ ] Code examples testing
- [ ] Link validation

More issues to be documented as validation continues...

---

## Next Steps

1. Continue systematic validation of remaining documentation pages
2. Verify all CLI commands against help output
3. Validate configuration options against `config.ts`
4. Validate frontmatter schemas against `frontmatter.ts`
5. Test all code examples
6. Create fix PR for all identified issues

---

## Methodology

**For each documentation page:**

1. **Read documentation** - Extract all claims about behavior
2. **Check source code** - Verify against implementation
3. **Test CLI** - Run commands and verify output
4. **Test examples** - Ensure all examples actually work
5. **Document issues** - Record any mismatches found

**Sources of truth:**
- `src/` - Source code implementation
- `lspec --help` - CLI help output
- `templates/` - Template files
- Actual command execution - Real behavior

**Severity levels:**
- **Critical**: Wrong information that breaks user workflows
- **Medium**: Missing or incomplete information
- **Minor**: Formatting, examples, or non-critical details
