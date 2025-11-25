---
status: planned
created: '2025-11-25'
tags:
  - workflow
  - documentation
  - git
priority: high
created_at: '2025-11-25T06:46:20.670Z'
updated_at: '2025-11-25T06:47:19.875Z'
---

# Parallel Spec Implementation Workflow

> **Status**: 🗓️ Planned · **Priority**: High · **Created**: 2025-11-25 · **Tags**: workflow, documentation, git

**Project**: lean-spec  
**Team**: Core Development

## Overview

Users need to work on multiple specs simultaneously in local development, but the current LeanSpec workflow assumes sequential development on a single branch. While GitHub's cloud coding agent handles parallelism through feature branches and PRs, local development lacks a clear pattern for code/branch isolation when implementing multiple specs concurrently.

**Problem**: 
- Single working directory = can only work on one spec at a time locally
- Switching branches disrupts active work (uncommitted changes, context switching)
- Need to implement multiple specs in parallel without conflicts or context loss

**Goals**:
1. Enable parallel local development of multiple specs
2. Maintain code isolation between concurrent implementations
3. Preserve LeanSpec's lightweight philosophy (no complex tooling overhead)
4. Provide clear patterns for both solo devs and teams

## Design

### Core Approach: Git Worktrees + Branch Strategy

Use `git worktree` as the foundation for parallel spec implementation:

```bash
# Main repo structure
~/project/                    # Primary worktree (main branch)
~/project/.worktrees/
  ├── spec-045-dashboard/     # Worktree for spec 045
  ├── spec-047-timestamps/    # Worktree for spec 047
  └── spec-048-analysis/      # Worktree for spec 048
```

**Why Git Worktrees?**
- Native Git feature (no additional tools)
- Complete code isolation per spec
- Each worktree has independent working directory + branch
- Shared Git history (efficient disk usage)
- Works seamlessly with existing LeanSpec workflows

### Workflow Patterns

#### Pattern 1: Solo Developer - Parallel Features

```bash
# Start spec 045
lean-spec update 045 --status in-progress
git worktree add .worktrees/spec-045-dashboard -b feature/045-dashboard
cd .worktrees/spec-045-dashboard
# Implement spec 045...

# While 045 is ongoing, start spec 047 in parallel
cd ~/project  # Back to main worktree
lean-spec update 047 --status in-progress
git worktree add .worktrees/spec-047-timestamps -b feature/047-timestamps
cd .worktrees/spec-047-timestamps
# Implement spec 047...

# Work continues independently in each worktree
# Complete and merge whenever ready
```

#### Pattern 2: Team - Multiple Developers

```bash
# Developer A works on spec 045
git worktree add .worktrees/spec-045 -b feature/045-dashboard
cd .worktrees/spec-045
lean-spec update 045 --status in-progress --assignee "dev-a"

# Developer B works on spec 047 (from their clone)
git worktree add .worktrees/spec-047 -b feature/047-timestamps
cd .worktrees/spec-047
lean-spec update 047 --status in-progress --assignee "dev-b"

# Each developer has isolated environment
# Merge to main when complete
```

#### Pattern 3: Experiment + Stable Work

```bash
# Keep main worktree for stable/production work
cd ~/project  # Main worktree on main branch

# Create experimental worktree for risky spec
git worktree add .worktrees/spec-048-experiment -b experiment/048
cd .worktrees/spec-048-experiment
# Try experimental approach...

# If experiment fails, just remove worktree
# Main work remains untouched
```

### Helper Commands (Optional)

Add convenience commands to `lean-spec` CLI:

```bash
# Create worktree + update spec status in one command
lean-spec worktree create 045 [--path .worktrees/spec-045]

# List active worktrees with associated specs
lean-spec worktree list

# Complete spec and clean up worktree
lean-spec worktree complete 045 [--merge] [--remove]
```

**Implementation**: Shell wrappers around `git worktree` + `lean-spec update`

### Dependency Handling

When specs have dependencies (`depends_on`):

```bash
# Spec 048 depends on 045
# Option 1: Wait for 045 to merge to main
git worktree add .worktrees/spec-048 -b feature/048
# Work on 048 after 045 is merged

# Option 2: Branch from 045's feature branch
cd .worktrees/spec-045-dashboard
git worktree add ../spec-048-analysis -b feature/048-from-045
# 048 includes changes from 045
```

### Best Practices

1. **Worktree Naming**: Use spec number + short name (`spec-045-dashboard`)
2. **Branch Strategy**: Feature branches per spec (`feature/045-dashboard`)
3. **Cleanup**: Remove worktrees after merge (`git worktree remove`)
4. **Spec Status**: Update status in main worktree where specs/ lives
5. **Dependencies**: Branch from dependent spec's feature branch if needed

### Documentation Updates

Add new section to docs:
- **Guide > Workflows > Parallel Development**: Comprehensive guide
- **Reference > CLI > Worktree Commands**: If we add CLI helpers
- **FAQ**: "How do I work on multiple specs at once?"

## Plan

- [ ] Document git worktree workflow in `docs/guide/workflows/parallel-development.mdx`
- [ ] Add examples for solo dev, team, and experimental patterns
- [ ] Create FAQ entry for parallel spec development
- [ ] Evaluate if CLI helpers add value (lean toward NO - keep it simple)
- [ ] Add best practices section to AGENTS.md
- [ ] Update tutorials to mention parallel development option

## Test

**Verification Criteria**:

- [ ] Documentation clearly explains worktree setup for parallel specs
- [ ] Examples cover common use cases (solo, team, dependencies)
- [ ] Users can work on 2+ specs simultaneously without conflicts
- [ ] Spec status updates work correctly from any worktree
- [ ] Cleanup process is documented and straightforward
- [ ] FAQ addresses common questions about parallel work

**Real-world Validation**:

- [ ] Test parallel development on 2-3 active specs
- [ ] Verify dependency handling (spec branching from another spec)
- [ ] Confirm spec commands work from worktree directories
- [ ] Test merge workflow (worktree → main, cleanup)

## Notes

**Why Not Other Solutions?**

- **Stashing/committing**: Context switching overhead, easy to lose work
- **Separate clones**: Wastes disk space, separate Git histories
- **Submodules**: Overcomplicated, not designed for this use case
- **Branch switching**: Disrupts active work, requires clean state

**Git Worktree Advantages**:

- Native Git (no external dependencies)
- Lightweight (shares .git directory)
- Perfect isolation (separate working directories)
- Standard Git workflows (branches, merges, PRs)

**Potential CLI Helpers (Low Priority)**:

Could add `lean-spec worktree` commands, but risks violating "lean" philosophy:
- Native `git worktree` is already simple
- Wrappers add maintenance burden
- Documentation might be sufficient

**Decision**: Start with documentation-only approach. Add CLI helpers only if users request it.

**Research**:
- Git worktree docs: https://git-scm.com/docs/git-worktree
- Used successfully in monorepo development (Nx, Turborepo)
- Common pattern for kernel development (parallel builds)
