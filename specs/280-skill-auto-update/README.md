---
status: complete
created: 2026-02-02
priority: medium
tags:
- skills
- versioning
- dx
- npm
created_at: 2026-02-02T05:51:32.831985072Z
updated_at: 2026-02-02T06:58:48.523955341Z
completed_at: 2026-02-02T06:58:48.523955341Z
transitions:
- status: complete
  at: 2026-02-02T06:58:48.523955341Z
---

# Skill Auto-Update Mechanism

## Overview

Agent skills (`leanspec-sdd`, etc.) need a clear distribution and update strategy that works for npm package users.

**Context:**
- npm packages (`lean-spec`, `@leanspec/mcp`) are versioned and published to npm
- Skills live in `.github/skills/` in the repo but are NOT bundled in npm packages
- Users of npm packages have no built-in way to get/update skills

**Problem:**
- Skills and npm packages can drift out of sync
- No clear guidance on how npm package users should install skills
- Skills reference CLI/MCP commands that may change between versions

## Current State

### npm packages (lean-spec, @leanspec/mcp)
- Published to npm with semantic versioning
- Skills **embedded in Rust binary** via `include_str!`
- `lean-spec init` installs bundled skills (version-locked to CLI)

### Skills (leanspec-sdd, etc.)
- Source lives in `skills/` in the repo
- Bundled into CLI binary at compile time
- Also available via skills.sh for fresh updates

## Problem

Skills bundled in CLI are frozen at release time. Between releases:
- Bug fixes in skills don't reach users
- Workflow improvements are delayed
- New agent support requires CLI update
- Binary bloat from embedded skill files

## Solution: Delegate to skills.sh

Remove embedded skills from CLI. Add `lean-spec skill` command that wraps `npx skills`.

### Proposed CLI Commands

```bash
# Install skills (during init or standalone)
lean-spec skill install

# Update to latest
lean-spec skill update

# List installed skills
lean-spec skill list
```

### Implementation

```rust
// Wrapper that shells out to npx skills
fn skill_install() -> Result<()> {
    Command::new("npx")
        .args(["skills", "add", "codervisor/lean-spec", "-y"])
        .status()?;
    Ok(())
}

fn skill_update() -> Result<()> {
    Command::new("npx")
        .args(["skills", "update"])
        .status()?;
    Ok(())
}
```

### Changes to `lean-spec init`

```diff
- // Install embedded skills
- install_bundled_skills(&root)?;
+ // Install skills via skills.sh
+ println!("Installing agent skills...");
+ skill_install()?;
```

### Benefits

| Before (Hybrid) | After (skills.sh only) |
|-----------------|------------------------|
| Skills frozen at CLI release | Always latest from main |
| Binary bloat (~132KB embedded) | Smaller binary |
| Two update paths | Single source of truth |
| Maintenance burden | Delegate to skills.sh |

### Considerations

- **Requires Node.js**: `npx` needs Node installed (already required for @leanspec/mcp)
- **Network dependency**: First install needs internet
- **Fallback**: Could bundle skills as fallback if `npx` fails (optional)

## Validation (skills.sh)

**Tested 2026-02-02**: skills.sh works with our repo structure.

### Public vs Internal Skills

skills.sh supports `metadata.internal: true` to hide internal skills:

```yaml
# SKILL.md frontmatter
metadata:
  internal: true  # Hidden from public discovery
```

**Before** (all 4 visible):
```
◇  Found 4 skills
   github-actions, leanspec-development, leanspec-publishing, leanspec-sdd
```

**After** adding `internal: true` to 3 internal skills:
```
◇  Found 1 skill
   leanspec-sdd
```

Internal skills are only visible with `INSTALL_INTERNAL_SKILLS=1`.

## Decision

**Delegate skill management to skills.sh via CLI wrapper.**

| Skill | Type | `internal` |
|-------|------|------------|
| leanspec-sdd | Public | `false` (default) |
| leanspec-development | Internal | `true` |
| leanspec-publishing | Internal | `true` |
| github-actions | Internal | `true` |

## Plan

- [x] Verify skill format compatibility with skills.sh requirements
- [x] Test `npx skills add codervisor/lean-spec` with current structure
- [x] Add `metadata.internal: true` to internal skills
- [x] Verify only `leanspec-sdd` is public
- [x] Add `lean-spec skill` subcommand (install, update, list)
- [x] Update `lean-spec init` to use `skill install` instead of embedded skills
- [x] Remove embedded skill files from Rust binary
- [x] Update AGENTS.md with skill management docs
- [x] Update docs-site with new workflow

## Test

- [x] Skills install correctly via `npx skills add codervisor/lean-spec`
- [x] Internal skills hidden from public discovery
- [x] Only `leanspec-sdd` visible to users
- [x] `lean-spec skill install` works
- [x] `lean-spec init` installs skills via skills.sh
- [x] Graceful error when Node.js not available

Verified:
- `pnpm test:rust`
- `/home/marvin/projects/codervisor/lean-spec/rust/target/debug/lean-spec skill install`
- `/home/marvin/projects/codervisor/lean-spec/rust/target/debug/lean-spec init -y`
- `PATH=/nonexistent /home/marvin/projects/codervisor/lean-spec/rust/target/debug/lean-spec skill install`

## Notes

### Removed: Embedded Skills

Previously skills were embedded in the Rust binary:
```rust
// TO BE REMOVED
const SKILL_FILES: &[(&str, &str)] = &[
    ("SKILL.md", include_str!("../../../../../skills/leanspec-sdd/SKILL.md")),
    // ...
];
```

### Node.js Dependency

This approach requires Node.js for `npx`. This is acceptable because:
- `@leanspec/mcp` already requires Node.js
- Most AI coding tools (Cursor, Copilot, etc.) are in Node ecosystems
- Fallback: describe manual install in error message

### Remaining Questions

1. Should we bundle skills as offline fallback?
2. Add `--offline` flag that uses embedded skills?