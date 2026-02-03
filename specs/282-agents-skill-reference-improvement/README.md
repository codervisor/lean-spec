---
status: planned
created: 2026-02-02
priority: medium
parent: 289-universal-skills-initiative
tags:
- cli
- init
- skills
- dx
created_at: 2026-02-02T06:16:07.390387064Z
updated_at: 2026-02-02T06:16:07.390387064Z
---

# Improve AGENTS.md Skills Reference in Init

## Overview

When `lean-spec init` installs skills to a project, the generated `AGENTS.md` uses a generic example path rather than the actual installed skill location. This creates confusion and requires manual updates.

### Current Problem

The `AGENTS-with-skill.md` template contains:
```markdown
- **Location**: See your skills directory (e.g., `.github/skills/leanspec-sdd/SKILL.md`)
```

But skills can be installed to various locations based on detected AI tool:
- `.github/skills/` (GitHub Copilot)
- `.claude/skills/` (Claude)
- `.cursor/skills/` (Cursor)
- `.codex/skills/` (Codex)
- `.gemini/skills/` (Gemini)
- `.vscode/skills/` (VS Code)

### Goals

1. Reference the actual skill installation path in AGENTS.md
2. Align with structured skills section format (like this project's own AGENTS.md)
3. Support multiple skill locations when skills are installed to multiple tools

## Design

### Option A: Template Substitution (Recommended)

Pass the installed skill paths to the template and substitute a placeholder:

```markdown
### leanspec-sdd - Spec-Driven Development

- **Location**: [{skill_path}]({skill_path})
- **Use when**: Working with specs, planning features, multi-step changes
```

Where `{skill_path}` is replaced with the relative path like `.github/skills/leanspec-sdd/SKILL.md`.

### Option B: Multiple Skills Section

When skills install to multiple locations, list all:

```markdown
## Skills

### leanspec-sdd - Spec-Driven Development

Installed locations:
- [.github/skills/leanspec-sdd/SKILL.md](.github/skills/leanspec-sdd/SKILL.md)
- [.cursor/skills/leanspec-sdd/SKILL.md](.cursor/skills/leanspec-sdd/SKILL.md)
```

### Implementation Approach

1. Modify `scaffold_agents()` to accept the list of installed skill paths
2. Update template with `{skill_locations}` placeholder
3. Generate proper markdown links for each installed location
4. Handle edge case: no skills installed (fallback to current generic message)

## Plan

- [ ] Update `AGENTS-with-skill.md` template with placeholder
- [ ] Modify `scaffold_agents()` signature to accept skill paths
- [ ] Pass installed paths from `handle_skills_install()` to `scaffold_agents()`
- [ ] Implement placeholder substitution logic
- [ ] Handle multiple skill locations formatting
- [ ] Add unit tests for template substitution

## Test

- [ ] Init with Copilot detected → AGENTS.md references `.github/skills/...`
- [ ] Init with Cursor detected → AGENTS.md references `.cursor/skills/...`
- [ ] Init with multiple tools → AGENTS.md lists all locations
- [ ] Init without skills → Uses appropriate fallback message
- [ ] Existing AGENTS.md preserved (not overwritten)

## Notes

### Reference: This Project's AGENTS.md Skills Format

```markdown
## Skills

### leanspec-sdd - Spec-Driven Development methodology
- Location: [.github/skills/leanspec-sdd/SKILL.md](.github/skills/leanspec-sdd/SKILL.md)
- Use when: Working with specs, planning features, multi-step changes
- Key: Run `board` or `search` before creating specs
```

This format uses proper markdown links for easy navigation.