# Existing Project Integration - Summary

## What We Built

Added smart detection and handling for projects that already have `AGENTS.md` or other system prompts when running `lspec init`.

## Key Features

### 1. Auto-Detection
Detects these common system prompt files:
- `AGENTS.md`
- `.cursorrules`  
- `.github/copilot-instructions.md`

### 2. Three Integration Modes

When existing files are detected, users choose how to proceed:

**Merge Mode** (for AGENTS.md)
- Preserves existing content completely
- Appends LeanSpec section with clear `---` delimiter
- Best for: Adding LeanSpec to established projects

**Backup Mode**
- Renames existing files to `.backup`
- Creates fresh files from template
- Best for: Starting over while keeping old content safe

**Skip Mode**
- Leaves existing files completely untouched
- Only adds `.lspec/` config and `specs/` directory
- Best for: Manual integration or using existing setup as-is

### 3. Intelligent File Copying

The `copyDirectory` function now:
- Checks for file existence before copying
- Skips files the user wants to preserve
- Only copies what's needed

## Files Changed

1. **src/commands.ts**
   - Added `detectExistingSystemPrompts()` - Checks for system prompt files
   - Added `handleExistingFiles()` - Implements merge/backup/skip logic
   - Modified `initProject()` - Integrated detection flow
   - Modified `copyDirectory()` - Support for skipping files

2. **README.md**
   - Added "Integrating with Existing Projects" section
   - Documents all three modes with use cases

3. **specs/20251101/001-existing-project-integration/README.md**
   - Complete spec for the feature
   - Marked as ✅ Complete with implementation notes

4. **examples/integration-merge-example.md**
   - Shows before/after of merge mode
   - Explains benefits and alternatives

5. **test-integration.sh**
   - Basic test script for file detection
   - Instructions for manual testing

## Usage Example

```bash
# Project with existing AGENTS.md
cd my-existing-project

# Run lspec init
lspec init

# Output:
# Welcome to LeanSpec!
# 
# Found existing: AGENTS.md
# How would you like to proceed?
#   > Merge - Add LeanSpec section to existing files
#     Backup - Save existing and create new
#     Skip - Keep existing files as-is

# Choose your preferred mode!
```

## Testing

1. **Automated**: Run `./test-integration.sh` for basic checks
2. **Manual**: 
   ```bash
   cd /tmp/lspec-test-existing
   node /path/to/lean-spec/bin/lspec.js init
   # Test each mode: merge, backup, skip
   ```

## Future Enhancements

Potential improvements (not in current scope):
- Extend merge support to `.cursorrules` and other files
- Smart content parsing to avoid duplicate sections
- Template-aware merging (different merge strategies per template)
- Diff preview before merge

## Dogfooding Note

This feature itself follows LeanSpec principles:
- Clear goal: Don't clobber existing files
- Essential scenarios: merge, backup, skip
- Minimal implementation: Simple append for merge, straightforward backup/skip
- Living: Can extend merge support to more files if needed

Keeping it lean! 🚀
