---
status: planned
created: '2025-11-13'
tags:
  - cli
  - dx
priority: medium
created_at: '2025-11-13T08:40:40.882Z'
updated_at: '2025-11-26T06:03:51.202Z'
---

# Pass Content Directly to lean-spec create

> **Status**: 🗓️ Planned · **Priority**: Medium · **Created**: 2025-11-13 · **Tags**: cli, dx

**Project**: lean-spec  
**Team**: Core Development

## Overview

Enable passing spec content directly during creation instead of requiring post-creation editing. Supports AI agents and automation workflows that generate complete specs.

## Design

### Current State

`lean-spec create` currently supports:
- `--description <text>` - Populates Overview section only
- Post-creation editing required for full content

### Problem

**AI agents and automation scripts** often generate complete spec content but must:
1. Create the spec with minimal metadata
2. Write full content in a separate step
3. Handle file paths and parsing

This is inefficient for programmatic spec creation.

### Proposed Solution: Hybrid Approach

**Option 1: Keep `--description`** (existing)
- Quick Overview text for CLI users
- Current behavior: replaces `<!-- What are we solving? Why now? -->` placeholder

**Option 2: Add `--content <text>`**
- Pass full markdown body content
- Replaces template body (after frontmatter)
- Good for AI agents generating entire specs

**Option 3: Add `--file <path>`**
- Read content from file
- Shorthand for: `--content "$(cat spec.md)"`
- Better DX than shell escaping

**Option 4: Support stdin**
- Detect piped input: `echo "..." | lean-spec create my-spec`
- Unix-philosophy friendly
- Works with script output

### Design Questions

1. **Precedence**: What if multiple content sources specified?
   - Suggestion: `--file` > `--content` > stdin > `--description` > template
   
2. **Merge or Replace**: Does `--content` replace entire body or append sections?
   - Suggestion: Replace entire body (full control for generators)
   - `--description` remains section-specific (backward compat)

3. **Frontmatter Handling**: How do `--priority`, `--tags` interact with content frontmatter?
   - Suggestion: CLI options override content frontmatter
   - Ensures command-line control

### Alternative Considered

**Section-specific options** (`--overview`, `--design`, `--implementation`):
- ❌ Too many options to maintain
- ❌ Still awkward for multi-line content
- ❌ Complex CLI interface

## Plan

- [ ] Decide on design approach (hybrid vs single method)
- [ ] Determine precedence rules for multiple content sources
- [ ] Implement `--content <text>` option
- [ ] Implement `--file <path>` option
- [ ] Implement stdin detection and handling
- [ ] Update tests for all content input methods
- [ ] Update CLI documentation
- [ ] Add examples for AI agent workflows

## Test

**Content Input Methods:**
- [ ] `--description` populates Overview only (existing behavior)
- [ ] `--content` replaces template body with provided markdown
- [ ] `--file` reads and uses file content
- [ ] stdin input works when content is piped
- [ ] Precedence rules work correctly when multiple sources provided

**Frontmatter Interaction:**
- [ ] CLI options (`--priority`, `--tags`) override content frontmatter
- [ ] Template variables resolve correctly with provided content
- [ ] Timestamps auto-generated regardless of content source

**Edge Cases:**
- [ ] Empty content handled gracefully
- [ ] Invalid markdown doesn't break creation
- [ ] Large content (>10KB) works without issues
- [ ] Binary file rejected with clear error message

## Notes

### Use Cases

**AI Agent Workflow:**
```bash
# Generate spec content programmatically
lean-spec create my-feature --content "$generated_markdown" --priority high
```

**File-based Workflow:**
```bash
# Import from existing markdown
lean-spec create imported-spec --file ./docs/design.md --tags migration
```

**Pipeline Workflow:**
```bash
# Process and pipe content
cat template.md | envsubst | lean-spec create processed-spec
```

### Related

- Current implementation: `packages/cli/src/commands/create.ts`
- Similar feature in other tools: ADR tools often support `--from-file`
