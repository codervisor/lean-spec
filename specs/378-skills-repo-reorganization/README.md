---
status: planned
created: 2026-03-25
priority: high
parent: 289-universal-skills-initiative
supersedes:
- 290-skills-repository-migration
tags:
- agent-skills
- distribution
- repository
- naming
created_at: 2026-03-25T00:00:00Z
updated_at: 2026-03-25T00:00:00Z
---

# Reorganize LeanSpec Skills Distribution

## Overview

### Problems

Three issues with the current skills setup:

1. **Missing user-facing skill** — The `leanspec-sdd` skill was deleted in commit 926f1d2 (delegated to `npx skills add codervisor/lean-spec`), but the repo has no public skill to serve. Running `npx skills add codervisor/lean-spec` would pick up internal skills (`leanspec-development`, `agent-browser`) instead.

2. **Internal skills leak** — `.agents/skills/` contains 4 skills, all internal:
   - `leanspec-development` — CI/CD, publishing, dev workflows
   - `agent-browser` — browser automation for testing
   - `github-integration` — sourced from `codervisor/forge`
   - `parallel-worktrees` — sourced from `codervisor/forge`

   None of these should be distributed to end users.

3. **Naming** — "leanspec-sdd" is jargon. Users searching for "LeanSpec skill" don't think "SDD." The skill should simply be called `leanspec`.

### Goals

1. Create `codervisor/skills` as the canonical public skills repository
2. Rename `leanspec-sdd` → `leanspec` for user-friendliness
3. Restore the deleted SDD methodology skill content under the new name
4. Keep internal skills in `codervisor/lean-spec` — never distribute them
5. Update spec 290 references and AGENTS.md

## Design

### Why `codervisor/skills` (not `codervisor/leanspec-skills`)

| Factor | `codervisor/leanspec-skills` | `codervisor/skills` |
|--------|------------------------------|---------------------|
| Scales to future products | No — one repo per product | Yes — all codervisor skills in one place |
| Install UX | `npx skills add codervisor/leanspec-skills` | `npx skills add codervisor/skills@leanspec` |
| Discoverability | Users must know the exact repo name | Single repo to browse all available skills |
| Complements `codervisor/forge` | Overlapping concern | Clean separation: forge = infra skills, skills = product skills |
| Community contributions | Fragmented across repos | Single contribution point |

### Repository Structure

```
codervisor/skills
├── README.md                    # Catalog + installation guide
├── LICENSE                      # MIT
├── .agents/
│   └── skills/
│       └── leanspec/            # ← the user-facing skill (renamed from leanspec-sdd)
│           ├── SKILL.md         # SDD methodology
│           └── references/
│               ├── workflow.md
│               ├── best-practices.md
│               ├── commands.md
│               └── examples.md
├── .github/
│   └── workflows/
│       └── validate.yml         # Skill validation CI
└── package.json                 # Optional, for npm publishing
```

### Installation UX

```bash
# Install the LeanSpec skill
npx skills add codervisor/skills@leanspec

# Future skills from the same repo
npx skills add codervisor/skills@some-future-skill
```

### Skill Naming: `leanspec` (not `leanspec-sdd`)

The skill name `leanspec` is:
- **Discoverable** — matches the product name
- **Concise** — no jargon suffix
- **Unambiguous** — there's only one user-facing LeanSpec skill
- **Consistent** — follows the pattern of tool-named skills (e.g., `prettier`, `eslint`)

The SDD methodology is simply what LeanSpec *is* — no need to spell it out in the skill name.

### What Stays in `codervisor/lean-spec`

Internal skills remain in `.agents/skills/` with no changes:
- `leanspec-development` — for contributors to this repo
- `agent-browser` — for testing this project's web UI
- `github-integration` (symlink from forge)
- `parallel-worktrees` (symlink from forge)

These are never distributed. The `npx skills` framework reads from `codervisor/skills`, not `codervisor/lean-spec`.

### AGENTS.md Update

```diff
 ### Core Skills

-1. **leanspec-sdd** - Spec-Driven Development methodology
-   - Location: [.agents/skills/leanspec-sdd/SKILL.md](.agents/skills/leanspec-sdd/SKILL.md)
+1. **leanspec** - Spec-Driven Development methodology
+   - Install: `npx skills add codervisor/skills@leanspec`
+   - Source: [codervisor/skills](https://github.com/codervisor/skills)
    - Use when: Working with specs, planning features, multi-step changes
    - Key: Run `board` or `search` before creating specs
```

### Skill Content Recovery

The full `leanspec-sdd` SKILL.md and references/ were deleted in commit `926f1d2`. Recovery steps:

```bash
# Extract deleted skill content from git history
git show 926f1d2^:.agents/skills/leanspec-sdd/SKILL.md > SKILL.md
git show 926f1d2^:.agents/skills/leanspec-sdd/references/workflow.md > references/workflow.md
git show 926f1d2^:.agents/skills/leanspec-sdd/references/best-practices.md > references/best-practices.md
git show 926f1d2^:.agents/skills/leanspec-sdd/references/commands.md > references/commands.md
git show 926f1d2^:.agents/skills/leanspec-sdd/references/examples.md > references/examples.md
```

Then rename the frontmatter `name: leanspec-sdd` → `name: leanspec` in SKILL.md.

## Plan

### Phase 1: Create `codervisor/skills` repo
- [ ] Create `codervisor/skills` GitHub repository (public, MIT)
- [ ] Add README.md with skill catalog and installation instructions
- [ ] Set up `.agents/skills/leanspec/` directory structure
- [ ] Recover and migrate `leanspec-sdd` content → rename to `leanspec`
- [ ] Update SKILL.md frontmatter: `name: leanspec`
- [ ] Add CI workflow for skill validation

### Phase 2: Update `codervisor/lean-spec` (this repo)
- [ ] Update AGENTS.md — point `leanspec` to external install
- [ ] Remove stale `leanspec-sdd` references from AGENTS.md
- [ ] Update skills-lock.json if the lock file should track the new source
- [ ] Mark spec 290 as superseded by this spec

### Phase 3: Validate distribution
- [ ] Verify `npx skills add codervisor/skills@leanspec` works
- [ ] Verify `npx skills add codervisor/lean-spec` does NOT expose internal skills
- [ ] Test installation across tools (Claude, Cursor, Copilot)

## Test

- [ ] `npx skills add codervisor/skills@leanspec` installs the skill correctly
- [ ] Installed SKILL.md has `name: leanspec` (not `leanspec-sdd`)
- [ ] Internal skills (`leanspec-development`, `agent-browser`) are not accessible via `npx skills add codervisor/lean-spec`
- [ ] AGENTS.md references the correct install command
- [ ] Skill content matches the recovered 926f1d2^ version (with name update)
- [ ] CI validates skill structure on PRs to `codervisor/skills`

## Notes

### Relationship to Existing Specs

- **Supersedes 290** — Same goal (migrate public skills to dedicated repo) but with corrected repo name (`codervisor/skills` vs `codervisor/leanspec-skills`) and skill name (`leanspec` vs `leanspec-sdd`)
- **Builds on 211** — Uses the skill content created in spec 211, just recovered and renamed
- **Aligns with 289** — Fulfills the universal skills initiative goal of clean distribution

### Future Skills in `codervisor/skills`

The repo structure supports adding more skills over time:
```
.agents/skills/
├── leanspec/          # SDD methodology (this spec)
├── lean-review/       # Future: AI code review patterns
└── lean-test/         # Future: Test strategy skill
```

### `codervisor/forge` Relationship

- `codervisor/forge` — Infrastructure/tooling skills (github-integration, parallel-worktrees)
- `codervisor/skills` — Product/methodology skills (leanspec, future product skills)

Clean separation of concerns.
