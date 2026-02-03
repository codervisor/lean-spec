---
status: planned
created: 2026-02-03
priority: medium
parent: 289-universal-skills-initiative
tags:
- agent-skills
- github
- migration
- repository
created_at: 2026-02-03T07:54:58.397969506Z
updated_at: 2026-02-03T07:54:58.397969506Z
---

# Migrate Public Skills to Dedicated Repository

## Overview

Migrate public LeanSpec skills (starting with `leanspec-sdd`) to a dedicated GitHub repository at `codervisor/leanspec-skills`. This separates skill maintenance from CLI development and enables community contributions.

### Problem

Currently, skills live inside the main `lean-spec` repository:
- `.github/skills/leanspec-sdd/` - project-specific copy
- `packages/cli/templates/skills/` - bundled with CLI

This creates issues:
1. Skills versioning tied to CLI releases
2. Higher barrier for community skill contributions
3. Duplicate copies need manual synchronization
4. Hard to add third-party skills

### Goals

1. Create `codervisor/leanspec-skills` repository
2. Migrate `leanspec-sdd` skill with full history
3. Set up CI for skill validation
4. Update CLI to reference external skills
5. Document contribution workflow

## Design

### Repository Structure

```
codervisor/leanspec-skills
├── README.md               # Skills overview, contribution guide
├── LICENSE                 # MIT
├── skills/
│   └── leanspec-sdd/
│       ├── SKILL.md
│       └── references/
│           ├── WORKFLOW.md
│           ├── BEST-PRACTICES.md
│           └── EXAMPLES.md
├── .github/
│   ├── workflows/
│   │   ├── validate.yml    # Run skills-ref validate
│   │   └── release.yml     # Tag-based releases
│   └── CODEOWNERS
└── package.json            # For npm publishing (optional)
```

### Source of Truth Strategy

**Option A: External Repo as Source (Recommended)**
- `codervisor/leanspec-skills` is the source
- `lean-spec` CLI fetches/bundles during build
- `lean-spec` repo keeps dev copy via git submodule or sync script

**Option B: Bidirectional Sync**
- Both repos maintain copies
- GitHub Action syncs changes
- More complex, higher risk of conflicts

### CLI Integration

```typescript
// Current: bundled templates
const skillPath = path.join(__dirname, 'templates/skills/leanspec-sdd');

// New: fetch from published location or bundle
const skillPath = await resolveSkillPath('leanspec-sdd', {
  sources: [
    'bundled',                    // Fallback: bundled copy
    'npm:@leanspec/skills',       // npm package
    'github:codervisor/leanspec-skills', // Direct fetch
  ]
});
```

### Versioning

- Skills tagged independently: `leanspec-sdd@1.0.0`
- CLI specifies compatible skill versions
- Graceful fallback to bundled version if fetch fails

## Plan

- [ ] Create `codervisor/leanspec-skills` repository
- [ ] Migrate `leanspec-sdd` skill with commit history
- [ ] Set up GitHub Actions for validation
- [ ] Add CONTRIBUTING.md with skill contribution guide
- [ ] Update CLI to support external skill sources
- [ ] Add sync mechanism for dev copy in lean-spec repo
- [ ] Update documentation

## Test

- [ ] New repo passes `skills-ref validate`
- [ ] CLI can install skills from new repo
- [ ] GitHub Actions run on PR
- [ ] Dev copy in lean-spec stays in sync
- [ ] Old installations continue working

## Notes

### Migration Command

```bash
# Create new repo
gh repo create codervisor/leanspec-skills --public --description "LeanSpec Agent Skills"

# Clone and add skills
git clone git@github.com:codervisor/leanspec-skills.git
mkdir -p skills
cp -r ../lean-spec/.github/skills/leanspec-sdd skills/

# Commit and push
git add .
git commit -m "feat: initial leanspec-sdd skill"
git push origin main
```

### Future Skills

The new repo structure supports additional skills:
- `leanspec-development` - Development workflow skill
- `leanspec-publishing` - Publishing workflow skill
- Community-contributed skills