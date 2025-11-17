---
status: planned
created: '2025-11-17'
tags:
  - infrastructure
  - docs
  - monorepo
priority: high
created_at: '2025-11-17T04:54:37.212Z'
updated_at: '2025-11-17T04:55:16.581Z'
---

# Migrate docs-site to separate repository as submodule

> **Status**: 🗓️ Planned · **Priority**: High · **Created**: 2025-11-17 · **Tags**: infrastructure, docs, monorepo

**Project**: lean-spec  
**Team**: Core Development

## Overview

The `docs-site/` directory is currently nested in the lean-spec monorepo. This causes unnecessary Vercel deployments whenever any part of the monorepo changes, even when documentation hasn't been modified. 

Migrating docs-site to a separate repository with git submodule integration will:
- Decouple docs deployment from CLI/core development
- Reduce unnecessary CI/CD runs and Vercel builds
- Enable independent versioning and release cycles for documentation
- Maintain single source of truth while allowing separate workflows

## Design

### Repository Structure

**New repository**: `codervisor/lean-spec-docs`
- Standalone Docusaurus project
- Independent deployment to Vercel
- Own package.json, dependencies, CI/CD

**Main repository**: `codervisor/lean-spec`
- Add `docs-site/` as git submodule pointing to `lean-spec-docs`
- Update build scripts to handle submodule
- Update CONTRIBUTING.md with submodule workflow

### Migration Strategy

1. **Create new repository**
   - Create `codervisor/lean-spec-docs` on GitHub
   - Initialize with existing `docs-site/` content
   - Set up Vercel deployment for new repo
   - Configure build settings (same as current)

2. **Remove from monorepo**
   - Remove `docs-site/` directory from lean-spec
   - Update root `package.json` workspaces config
   - Update `turbo.json` to remove docs-site tasks
   - Remove docs-site from `pnpm-workspace.yaml`

3. **Add as submodule**
   - `git submodule add https://github.com/codervisor/lean-spec-docs.git docs-site`
   - Configure submodule to track `main` branch
   - Update `.gitmodules` with branch tracking

4. **Update workflows**
   - GitHub Actions: Skip docs builds unless docs changed
   - Update CONTRIBUTING.md with submodule commands
   - Add documentation for working with submodules

### Vercel Configuration

**Current setup**: Single Vercel project for entire monorepo
**New setup**: Separate Vercel projects
- `lean-spec` monorepo: Deploy only if CLI/core changes
- `lean-spec-docs`: Deploy only on docs changes

### Developer Workflow

**Clone with submodule**:
```bash
git clone --recurse-submodules https://github.com/codervisor/lean-spec.git
```

**Update docs**:
```bash
cd docs-site
git checkout main
git pull
cd ..
git add docs-site
git commit -m "chore: update docs submodule"
```

**Work on docs**:
```bash
cd docs-site
# Make changes, commit to lean-spec-docs
git push
cd ..
git add docs-site
git commit -m "chore: update docs submodule pointer"
```

## Plan

- [ ] Create `codervisor/lean-spec-docs` repository on GitHub
- [ ] Copy `docs-site/` content to new repository
- [ ] Set up Vercel deployment for new docs repo
- [ ] Test docs build and deployment independently
- [ ] Remove `docs-site/` from lean-spec monorepo
- [ ] Update workspace configs (package.json, pnpm-workspace.yaml, turbo.json)
- [ ] Add docs-site as git submodule
- [ ] Update CONTRIBUTING.md with submodule workflow
- [ ] Update GitHub Actions to skip docs builds
- [ ] Test full workflow: clone, build, deploy
- [ ] Document submodule best practices in README

## Test

- [ ] New docs repo builds successfully on Vercel
- [ ] Docs deploy independently when pushed to lean-spec-docs
- [ ] Main repo builds without docs-site directory
- [ ] Submodule clone works: `git clone --recurse-submodules`
- [ ] Submodule update works: `git submodule update --remote`
- [ ] CI/CD skips docs builds when only CLI/core changes
- [ ] Developers can work on docs independently

## Notes

### Alternatives Considered

**Keep in monorepo**: Simpler but causes unnecessary deployments and tight coupling

**Separate repo without submodule**: Loses visibility in main repo, harder to track docs version

**Monorepo with conditional Vercel deploys**: Possible but requires complex CI configuration, still coupled in git history

### Open Questions

- Should we keep docs versioned with CLI releases or independently?
- Do we want to enforce docs updates as part of CLI PRs?
- Should submodule track `main` or specific release tags?

### References

- Current Vercel config: `vercel.json`, `docs-site/vercel.json`
- Git submodules: https://git-scm.com/book/en/v2/Git-Tools-Submodules
