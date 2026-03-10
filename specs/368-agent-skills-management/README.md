---
status: planned
created: 2026-03-10
priority: high
tags:
- agent-skills
- cli
- mcp
- ui
- skills
- management
parent: 289-universal-skills-initiative
created_at: 2026-03-10T07:43:07.994459997Z
updated_at: 2026-03-10T07:43:12.964449221Z
---

# Agent Skills Management (Project & User Scope)

## Overview

Provide full agent skills lifecycle management across CLI, MCP, and UI — supporting both **project-scoped** and **user-scoped** skills. Today `lean-spec skill` wraps `npx skills` for install/update/list of the bundled `leanspec-sdd` skill, but there is no way to:

1. **Create** custom skills from templates (like the VS Code agent-customization / skill-creator pattern)
2. **Remove** installed skills
3. **Inspect** skill details (view SKILL.md content, metadata, scope)
4. **Manage scope** — explicitly install/remove at project vs user level
5. **Discover** available skills from registries or repos
6. **Surface skills in MCP/UI** — currently CLI-only

This spec adds a comprehensive skill management subsystem across all three interfaces.

## Non-Goals

- Hosting a public skill marketplace/registry (future work)
- Rewriting the skills.sh integration (keep as backend for remote skills)
- Changing the Agent Skills spec format itself
- Auto-generating SKILL.md content from code analysis

## Requirements

### CLI: `lean-spec skill` Subcommands

#### Skill Listing & Inspection

- [ ] `lean-spec skill list` — show installed skills with scope indicator (project/user), tool target, and version
- [ ] `lean-spec skill list --scope project` — filter to project-scoped skills only
- [ ] `lean-spec skill list --scope user` — filter to user-scoped skills only
- [ ] `lean-spec skill view <name>` — display SKILL.md content and metadata for an installed skill
- [ ] `lean-spec skill info <name>` — show metadata summary (name, description, scope, path, tool targets, version)

#### Skill Installation & Removal

- [ ] `lean-spec skill install` — current behavior (install leanspec-sdd via skills.sh)
- [ ] `lean-spec skill install <repo>` — install skill(s) from a GitHub repo via skills.sh
- [ ] `lean-spec skill install --scope user` — install to user-level skills directory
- [ ] `lean-spec skill install --scope project` — install to project-level skills directory (default)
- [ ] `lean-spec skill remove <name>` — remove an installed skill (with confirmation)
- [ ] `lean-spec skill remove <name> --scope user` — remove from user-level only
- [ ] `lean-spec skill update` — update all installed skills (current behavior)
- [ ] `lean-spec skill update <name>` — update a specific skill

#### Skill Creation (Skill-Creator Pattern)

- [ ] `lean-spec skill create <name>` — scaffold a new custom skill from template
- [ ] Interactive prompts: name, description, trigger keywords, tool targets
- [ ] Generate SKILL.md with proper frontmatter and section scaffolding
- [ ] Generate optional `references/` directory with placeholder files
- [ ] `--scope project` (default) creates in `.agents/skills/<name>/` or detected tool's skills dir
- [ ] `--scope user` creates in `~/.agents/skills/<name>/` or detected tool's user skills dir
- [ ] `--tool <tool>` flag to target a specific tool (copilot, claude, cursor, etc.)
- [ ] `--template <template>` flag for different skill templates (minimal, full, workflow)

#### Skill Templates

- [ ] `minimal` template: SKILL.md with frontmatter + basic sections (When to Use, Instructions)
- [ ] `full` template: SKILL.md + references/ dir + scripts/ dir with placeholders
- [ ] `workflow` template: SKILL.md structured as a step-by-step workflow skill

### MCP: Skill Management Tools

- [ ] `skill_list` tool — returns installed skills with scope/metadata (JSON)
- [ ] `skill_view` tool — returns SKILL.md content for a given skill name
- [ ] `skill_info` tool — returns metadata summary for a skill
- [ ] `skill_install` tool — install a skill from repo (wraps CLI)
- [ ] `skill_remove` tool — remove an installed skill
- [ ] `skill_create` tool — scaffold a new skill with given name, description, template
- [ ] All tools support `scope` parameter (`project` | `user`)

### UI: Skills Management Page

- [ ] New "Skills" page/section in web UI accessible from sidebar
- [ ] List view showing all installed skills with scope badge (project/user)
- [ ] Skill detail view showing SKILL.md content rendered as markdown
- [ ] Metadata panel: name, description, version, tool targets, scope, path
- [ ] Install button — opens dialog for repo URL or skill name
- [ ] Remove button with confirmation dialog
- [ ] Create skill form — name, description, template selection, scope, tool target
- [ ] Scope filter toggle (All / Project / User)
- [ ] Visual distinction between built-in skills (leanspec-sdd) and custom skills

### Core: Skill Discovery & Resolution

- [ ] Implement `SkillManager` in `leanspec-core` for unified skill operations
- [ ] Scan project-level skill directories: `.agents/skills/`, `.github/skills/`, `.claude/skills/`, `.cursor/skills/`, etc.
- [ ] Scan user-level skill directories: `~/.agents/skills/`, `~/.copilot/skills/`, `~/.claude/skills/`, etc.
- [ ] Parse SKILL.md frontmatter to extract metadata (name, description, version, internal flag)
- [ ] Resolve skill by name across all scopes (project takes precedence over user)
- [ ] Detect tool targets from installation path (`.github/skills/` → copilot, `.claude/skills/` → claude)
- [ ] Support scope-aware CRUD operations

## Technical Notes

### Skill Resolution Order

When resolving a skill by name:
1. Project-scoped skills (`.agents/skills/`, tool-specific project dirs)
2. User-scoped skills (`~/.agents/skills/`, tool-specific user dirs)
3. Project scope overrides user scope if same skill exists in both

### Skill-Creator Template Structure

```
<skill-name>/
├── SKILL.md              # Main skill file with frontmatter
├── references/           # Optional detailed docs
│   └── DETAILS.md
└── scripts/              # Optional automation scripts
    └── validate.sh
```

**Generated SKILL.md (minimal template):**
```markdown
---
name: <skill-name>
description: <user-provided description>
---

# <Skill Title>

## When to Use

Activate when:
- [Describe trigger conditions]

## Instructions

[Core instructions for the agent]
```

### Integration with Runner Registry

Reuse `RunnerRegistry` detection (spec 126) to map detected tools → skill installation paths. The mapping already exists in `runner_to_skills_agent()` in `skill.rs`.

### Architecture

```
leanspec-core/
├── skills/
│   ├── manager.rs        # SkillManager: list, view, install, remove, create
│   ├── discovery.rs      # Scan & resolve skills across scopes
│   ├── templates.rs      # Skill templates for creation
│   └── mod.rs

leanspec-cli/
├── commands/
│   └── skill.rs          # Extended CLI subcommands

leanspec-http/
├── handlers/
│   └── skills.rs         # REST endpoints for UI

leanspec-mcp/
├── tools/
│   └── skills.rs         # MCP tool handlers

packages/ui/
├── src/pages/
│   └── skills/           # Skills management page
```

## Acceptance Criteria

- [ ] `lean-spec skill list` shows all skills with scope and tool info
- [ ] `lean-spec skill create my-skill` scaffolds a new skill with valid SKILL.md
- [ ] `lean-spec skill remove <name>` removes a skill with confirmation
- [ ] `lean-spec skill view <name>` displays skill content
- [ ] Project vs user scope works correctly for all operations
- [ ] MCP tools expose equivalent functionality to CLI
- [ ] UI page lists skills with install/remove/create actions
- [ ] Custom-created skills are discoverable by AI tools (placed in correct directory)
- [ ] Existing `lean-spec skill install/update` behavior preserved (backward compatible)

## Dependencies

- **280-skill-auto-update** (complete) — current skill install/update via skills.sh
- **226-agent-skills-init-integration** (complete) — skills install during init
- **222-cross-tool-agent-skills-compatibility** (planned) — tool detection and paths
- **289-universal-skills-initiative** (planned) — umbrella for skills ecosystem

## Related Specs

- **211-leanspec-as-anthropic-skill** — original skill creation (complete)
- **282-agents-skill-reference-improvement** — AGENTS.md skill references (planned)
- **290-skills-repository-migration** — migrate to dedicated repo (planned)
- **225-context-page-ai-focus** — UI context/agent pages (planned)