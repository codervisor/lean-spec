---
status: complete
created: '2025-11-24'
tags:
  - cli
  - bug
  - examples
  - init
priority: high
created_at: '2025-11-24T06:11:04.198Z'
related:
  - '114'
  - 114-example-projects-scaffold
updated_at: '2025-11-24T06:28:37.554Z'
transitions:
  - status: in-progress
    at: '2025-11-24T06:12:17.567Z'
  - status: complete
    at: '2025-11-24T06:28:37.554Z'
completed_at: '2025-11-24T06:28:37.554Z'
completed: '2025-11-24'
---

# Fix: `lean-spec init --example` Missing LeanSpec Files

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-24 · **Tags**: cli, bug, examples, init

**Project**: lean-spec  
**Team**: Core Development

## Overview

**Critical Bug**: `lean-spec init --example <name>` scaffolds example projects but **doesn't include any LeanSpec files**:
- ❌ No `AGENTS.md`
- ❌ No `.lean-spec/` directory
- ❌ No `specs/` folder
- ❌ No spec template

**Impact**: Users following tutorials get application code but can't actually use LeanSpec because the project isn't initialized. This defeats the entire purpose of example projects.

**Root Cause**: The `scaffoldExample()` function in `init.ts` only copies example template files via `copyDirectoryRecursive()`. It never runs LeanSpec initialization.

**Why Now**: Spec 114 is marked complete, but this critical functionality gap makes the feature incomplete.

**Related**: Spec 114 - Example Projects and Init Scaffold for Tutorials

## Design

### Solution: Initialize LeanSpec After Scaffolding

**Approach**: After copying example files, automatically run LeanSpec initialization in the new directory.

**Implementation Options**:

**Option 1: Call `initProject()` after copying** (Recommended)
```typescript
async function scaffoldExample(exampleName: string, customName?: string) {
  // ... existing copy logic ...
  await copyDirectoryRecursive(examplePath, targetPath);
  
  // Initialize LeanSpec in the new directory
  const originalCwd = process.cwd();
  process.chdir(targetPath);
  await initProject(true); // Use -y flag for defaults
  process.chdir(originalCwd);
  
  // ... rest of the function ...
}
```

**Option 2: Add LeanSpec files to example templates**
- Add `AGENTS.md`, `.lean-spec/`, `specs/` to each example template
- ❌ Problem: Duplicate maintenance (must update all examples when templates change)
- ❌ Problem: Examples grow larger (more files to maintain)

**Option 3: Hybrid approach** (BEST)
- Keep examples focused on application code only
- Add LeanSpec initialization as separate step after scaffolding
- Include example-specific `AGENTS.md` content in template
- Merge example's AGENTS.md with standard LeanSpec AGENTS.md

**Chosen Approach**: Option 3 - Hybrid
- Examples remain minimal (just application code + example-specific README)
- `scaffoldExample()` runs full LeanSpec init after copying
- If example has `AGENTS.md`, merge it with LeanSpec template (use AI-Assisted Merge)

### Modified Workflow

**Current** (broken):
```bash
lean-spec init --example dark-theme
# 1. Copy dark-theme/ template
# 2. npm install
# 3. Done - but no LeanSpec files!
```

**Fixed**:
```bash
lean-spec init --example dark-theme
# 1. Create directory: dark-theme/
# 2. Copy example template files (app code)
# 3. Run LeanSpec init with standard template
# 4. If example has AGENTS.md, merge with LeanSpec AGENTS.md
# 5. npm install
# 6. Show next steps
```

### Example-Specific AGENTS.md Content

Each example can optionally include `AGENTS.md` with project-specific context:

**Example: `dark-theme/AGENTS.md`**:
```markdown
# Dark Theme Task Manager - AI Instructions

## Project Context

You're working on a simple task manager web app. Current state:
- Light theme only (style.css)
- No dark mode support
- No system preference detection

## Your Task

Add dark theme support with:
- CSS variables for theming
- Dark mode styles
- System preference detection (prefers-color-scheme)
- Theme toggle button
```

This will be **merged** with standard LeanSpec AGENTS.md during init.

## Plan

### Phase 1: Core Fix
- [x] Analyze current `scaffoldExample()` implementation
- [x] Add LeanSpec initialization to `scaffoldExample()`
- [x] Handle example-specific AGENTS.md merging
- [x] Update success message to mention LeanSpec files

### Phase 2: Example Template Updates
- [x] Keep examples focused on app code (don't duplicate .lean-spec files)
- [x] Example-specific AGENTS.md merging is handled by existing `handleExistingFiles()` logic
- [x] No changes needed to example templates (standard template provides AGENTS.md)

### Phase 3: Testing
- [x] Test `lean-spec init --example dark-theme` creates all files
- [x] Verify `.lean-spec/` directory exists with config
- [x] Verify `specs/` directory exists
- [x] Verify `AGENTS.md` includes LeanSpec instructions
- [x] Test with custom directory name: `--name my-demo`
- [x] Test all three examples (dark-theme, dashboard-widgets, api-refactor)
- [x] Verify all LeanSpec CLI commands work in scaffolded projects

### Phase 4: Documentation
- [x] Implementation complete and tested
- [x] No documentation changes needed (behavior is now as expected)
- [x] Help text already describes the feature correctly

## Test

**Success Criteria:**

After running `lean-spec init --example dark-theme`:
- [x] Directory `dark-theme/` created ✅
- [x] Application files copied (package.json, src/, etc.) ✅
- [x] LeanSpec files present:
  - [x] `.lean-spec/config.json` exists ✅
  - [x] `.lean-spec/templates/spec-template.md` exists ✅
  - [x] `AGENTS.md` exists with LeanSpec instructions ✅
  - [x] `specs/` directory exists (empty initially) ✅
- [x] `npm install` runs successfully ✅
- [x] All LeanSpec CLI commands work (list, create, etc.) ✅

**Test Cases**:
```bash
# Basic usage
cd /tmp
lean-spec init --example dark-theme
cd dark-theme
ls -la  # Should show: AGENTS.md, .lean-spec/, specs/, src/, package.json
lean-spec list  # Should work (confirms LeanSpec is initialized)

# Custom name
cd /tmp
lean-spec init --example dark-theme --name my-feature
cd my-feature
ls -la  # Should show all LeanSpec files

# Interactive mode
cd /tmp
lean-spec init --example
# Select dark-theme from menu
# Should create same result
```

**Validation**:
1. All LeanSpec CLI commands work in scaffolded project
2. `lean-spec create my-feature` works
3. `lean-spec list` shows specs
4. Tutorial prompts work correctly
5. Example-specific AGENTS.md context is preserved

## Notes

### Implementation Summary

**What was already in place:**
- `scaffoldExample()` function already included LeanSpec initialization logic:
  - Copies example files from template
  - Changes to target directory and calls `initProject(true)` 
  - `initProject()` with `-y` flag creates all LeanSpec files (`.lean-spec/`, `AGENTS.md`, `specs/`)
  - Handles example-specific AGENTS.md through existing `handleExistingFiles()` with AI-assisted merge
  - Installs dependencies via npm/yarn/pnpm
  - Shows success message with next steps

**What needed to be fixed:**
- Command option definition: Changed `--example <name>` to `--example [name]` to allow interactive mode
  - With `<name>` syntax, Commander requires a value (e.g., `--example dark-theme`)
  - With `[name]` syntax, value is optional and triggers interactive selection when omitted
  - Updated help text to clarify interactive mode

**Test Results:**
- ✅ All three examples (dark-theme, dashboard-widgets, api-refactor) scaffold correctly
- ✅ All LeanSpec files created: `.lean-spec/config.json`, `.lean-spec/templates/spec-template.md`, `AGENTS.md`, `specs/`
- ✅ All LeanSpec CLI commands work in scaffolded projects
- ✅ Custom directory names work (`--name my-demo`)
- ✅ Dependencies install automatically
- ✅ Success message shows correct information

### Design Decisions

**Why not add .lean-spec/ to example templates?**
- Templates would need constant updates when LeanSpec changes
- Increases maintenance burden
- Examples become less focused (more files to maintain)
- Better to use existing `initProject()` function (DRY principle)

**Why merge AGENTS.md instead of replace?**
- Example-specific context is valuable for AI
- LeanSpec general instructions are also needed
- Merging gives best of both worlds
- Uses existing merge logic from `handleExistingFiles()`

**Why use `initProject(true)` with -y flag?**
- Examples should use sensible defaults
- No user interaction needed during scaffolding
- Standard template is appropriate for tutorials
- Users can customize later if needed

### Edge Cases

**What if example directory already exists?**
- Current behavior: Error if non-empty ✅
- Keep this behavior after fix

**What if npm install fails?**
- Current behavior: Show warning, continue ✅
- Keep this behavior after fix

**What if user cancels during init?**
- LeanSpec init should handle gracefully
- Partial files cleaned up by initProject()

### Implementation Details

**Key function to modify**:
```typescript
// packages/cli/src/commands/init.ts

async function scaffoldExample(exampleName: string, customName?: string) {
  // ... validation and directory creation ...
  
  // Copy example template
  const examplePath = path.join(EXAMPLES_DIR, exampleName);
  await copyDirectoryRecursive(examplePath, targetPath);
  console.log(chalk.green('✓ Copied example project'));
  
  // NEW: Initialize LeanSpec
  const originalCwd = process.cwd();
  try {
    process.chdir(targetPath);
    console.log(chalk.gray('Initializing LeanSpec...'));
    await initProject(true); // Use defaults
    console.log(chalk.green('✓ Initialized LeanSpec'));
  } finally {
    process.chdir(originalCwd);
  }
  
  // ... rest of function (npm install, show next steps) ...
}
```

**Files to modify**:
- `packages/cli/src/commands/init.ts` - Add LeanSpec init call
- Example templates (optional) - Add project-specific AGENTS.md

### Alternative Solutions Considered

**1. Pre-bundle .lean-spec/ in examples**
- ❌ Maintenance nightmare
- ❌ Examples become bloated
- ❌ Templates version gets out of sync

**2. Separate command: `lean-spec init-example`**
- ❌ Confusing UX (two init commands)
- ❌ Duplicates initialization logic
- ❌ `--example` flag is clearer

**3. Document manual initialization**
- ❌ Bad UX (extra steps for users)
- ❌ Defeats purpose of scaffolding
- ❌ Error-prone

**Chosen**: Automatic initialization during scaffolding
- ✅ Zero extra steps for users
- ✅ Reuses existing init logic
- ✅ Examples stay minimal
- ✅ Always in sync with latest LeanSpec
