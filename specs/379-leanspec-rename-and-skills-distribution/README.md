---
status: planned
created: 2026-03-25
priority: high
parent: 289-universal-skills-initiative
tags:
- naming
- repository
- agent-skills
- distribution
- breaking-change
created_at: 2026-03-25T00:00:00Z
updated_at: 2026-03-25T00:00:00Z
---

# Rename to LeanSpec and Reorganize Skills Distribution

## Overview

### Problem

The project has an inconsistent naming problem and a broken skills distribution:

1. **Inconsistent naming** — The product is referred to as both `lean-spec` (hyphenated: repo, CLI, npm) and `leanspec` (no hyphen: code, types, internal references). This causes confusion for users and contributors.

2. **Missing user-facing skill** — The `leanspec-sdd` skill was deleted (commit 926f1d2) when skill management was delegated to `npx skills`. But no public skill exists to distribute.

3. **Internal skills leak** — `npx skills add codervisor/lean-spec` would expose internal-only skills (`leanspec-development`, `agent-browser`).

4. **Unfriendly skill name** — "leanspec-sdd" is jargon. Users don't search for "SDD."

### Goals

1. Rename GitHub repo `codervisor/lean-spec` → `codervisor/leanspec`
2. Rename CLI binary `lean-spec` → `leanspec`
3. Rename npm package `lean-spec` → `leanspec`
4. Create `codervisor/skills` repo for public skill distribution
5. Name the user-facing skill simply `leanspec`
6. Keep internal skills in the main repo, never distributed

## Design

### Naming Unification

Everything becomes `leanspec` (no hyphen):

| Asset | Before | After |
|-------|--------|-------|
| GitHub repo | `codervisor/lean-spec` | `codervisor/leanspec` |
| CLI command | `lean-spec` | `leanspec` |
| npm package | `lean-spec` | `leanspec` |
| Skill name | `leanspec-sdd` | `leanspec` |
| Skills repo | _(none)_ | `codervisor/skills` |
| Rust crates | `leanspec-core`, `leanspec-http`, etc. | _(no change — already unhyphenated)_ |

Note: Rust crates already use `leanspec-*` naming, so this rename aligns everything else to match.

### GitHub Repo Rename

GitHub automatically redirects `codervisor/lean-spec` → `codervisor/leanspec` for:
- Web URLs
- Git clone/fetch/push
- API calls

The redirect persists until another repo is created with the old name.

**Action items:**
- Rename via GitHub Settings > General > Repository name
- Update CI workflows, badges, README links
- Update `Cargo.toml` repository URLs
- Update `package.json` repository URLs

### CLI Binary Rename

```diff
- lean-spec init
- lean-spec list
- lean-spec board
+ leanspec init
+ leanspec list
+ leanspec board
```

**Backwards compatibility:**
- Keep `lean-spec` as a shell alias/symlink in the npm package `bin` field for one major version
- Deprecation warning: "lean-spec is deprecated, use leanspec instead"
- Remove alias in next major version

### npm Package Rename

```diff
# package.json
- "name": "lean-spec",
+ "name": "leanspec",
  "bin": {
-   "lean-spec": "./bin/lean-spec"
+   "leanspec": "./bin/leanspec",
+   "lean-spec": "./bin/leanspec"   # backwards compat alias, remove in next major
  }
```

**Migration path:**
1. Publish `leanspec` package
2. Publish final `lean-spec` version that depends on `leanspec` + prints deprecation notice
3. Users run `npm install -g leanspec` (or `npx leanspec`)

### Skills Distribution via `codervisor/skills`

#### Why `codervisor/skills` (not `codervisor/leanspec-skills`)

- Scales to future products without creating per-product repos
- Single place for users to discover all codervisor skills
- Clean install: `npx skills add codervisor/skills@leanspec`
- Complements `codervisor/forge` (infra skills vs product skills)

#### `@` syntax confirmed

Research confirms `@` in `npx skills add` is a **skill name selector**, not a git ref:
- `npx skills add codervisor/skills@leanspec` → installs only the `leanspec` skill
- Equivalent to `npx skills add codervisor/skills --skill leanspec`
- The CLI matches against the `name` field in SKILL.md frontmatter

#### Repository structure

```
codervisor/skills
├── README.md                      # Skill catalog + install instructions
├── LICENSE                        # MIT
├── .agents/
│   └── skills/
│       └── leanspec/              # The user-facing SDD methodology skill
│           ├── SKILL.md           # name: leanspec
│           └── references/
│               ├── workflow.md
│               ├── best-practices.md
│               ├── commands.md
│               └── examples.md
└── .github/
    └── workflows/
        └── validate.yml
```

#### Skill content

Recover from git history (commit 926f1d2^) and update:
- Rename frontmatter `name: leanspec-sdd` → `name: leanspec`
- Update any `lean-spec` CLI references to `leanspec`
- Review and refresh content for accuracy

### What Stays in `codervisor/leanspec` (main repo)

Internal skills remain in `.agents/skills/` — not distributed:
- `leanspec-development` — contributor dev workflows
- `agent-browser` — internal browser testing
- `github-integration` (from `codervisor/forge`)
- `parallel-worktrees` (from `codervisor/forge`)

### MCP Server Updates

The MCP server name should also align:

```diff
# MCP configuration
- "lean-spec": {
+ "leanspec": {
    "command": "leanspec",
    "args": ["mcp"]
  }
```

## Plan

### Phase 1: Create `codervisor/skills` repo
- [ ] Create `codervisor/skills` GitHub repository (public, MIT)
- [ ] Recover `leanspec-sdd` skill content from git history
- [ ] Rename to `leanspec` (frontmatter + any internal references)
- [ ] Set up CI for skill validation
- [ ] Add README with catalog and install instructions
- [ ] Verify `npx skills add codervisor/skills@leanspec` works

### Phase 2: Rename CLI and npm package
- [ ] Rename binary entry point `lean-spec` → `leanspec`
- [ ] Add `lean-spec` backwards-compat alias with deprecation warning
- [ ] Update all internal references (scripts, docs, CI)
- [ ] Publish `leanspec` npm package
- [ ] Publish deprecation version of `lean-spec` package

### Phase 3: Rename GitHub repo
- [ ] Rename `codervisor/lean-spec` → `codervisor/leanspec` via GitHub Settings
- [ ] Update `Cargo.toml` repository URLs
- [ ] Update `package.json` repository fields
- [ ] Update CI workflow references and badges
- [ ] Update CLAUDE.md, AGENTS.md, README
- [ ] Verify GitHub redirect works for old URLs

### Phase 4: Update all references
- [ ] Update AGENTS.md skill references
- [ ] Update MCP config examples in docs
- [ ] Update `leanspec init` templates to use new names
- [ ] Update specs that reference old names
- [ ] Update deploy configs (Railway, Fly.io, Render)
- [ ] Update Docker configs

## Test

- [ ] `npx leanspec` works
- [ ] `npx lean-spec` shows deprecation warning but still works
- [ ] `npx skills add codervisor/skills@leanspec` installs correctly
- [ ] `npx skills add codervisor/leanspec` does NOT expose internal skills
- [ ] GitHub redirect: `codervisor/lean-spec` URLs → `codervisor/leanspec`
- [ ] All CI workflows pass after rename
- [ ] MCP server works with new config name
- [ ] `leanspec init` generates correct AGENTS.md references

## Notes

### Risk: npm package name availability

Check if `leanspec` is available on npm before proceeding. If taken, alternatives:
- `@leanspec/cli`
- `@codervisor/leanspec`

### Relationship to other specs

- **Absorbs 378** (skills-repo-reorganization) — this spec covers skills distribution plus the broader rename
- **Supersedes 290** (skills-repository-migration) — already archived
- **Builds on 211** (skill content creation) — reuses the skill content
- **Part of 289** (universal skills initiative) — fulfills the distribution goal

### Migration timeline

Recommended order: Phase 1 → 2 → 3 → 4. The skills repo (Phase 1) is independent and can ship first. The CLI rename (Phase 2) should land before the repo rename (Phase 3) so users have the new binary name before URLs change.
