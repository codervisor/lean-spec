# Workflow Examples

Detailed workflow examples and patterns for working with LeanSpec.

## Spec-Driven Development (SDD) Workflow

The core workflow for implementing features with LeanSpec:

### 1. Discover
Check existing specs before starting:
```bash
lean-spec list
lean-spec search "authentication"
```

### 2. Plan
Create spec with clear intent:
```bash
lean-spec create user-authentication \
  --title "User Authentication System" \
  --priority high \
  --tags auth,security
```

Status starts as `planned` automatically.

### 3. Start Work
**BEFORE implementing**, update status:
```bash
lean-spec update user-authentication --status in-progress
```

### 4. Implement
Write code/docs, keep spec in sync as you learn:
- Document design decisions in the spec
- Update implementation notes based on learnings
- Link related specs as dependencies emerge

### 5. Complete
**AFTER implementation is done**, mark complete:
```bash
lean-spec update user-authentication --status complete
```

## Understanding "Work" vs "Spec Writing"

**CRITICAL - What "Work" Means:**
- ❌ **NOT**: Creating/writing the spec document itself
- ✅ **YES**: Implementing what the spec describes (code, docs, features, etc.)

**Example:**
```bash
# Day 1: Create spec for docs restructuring
lean-spec create docs-restructure
# Status: planned ✓ (spec created, but work not started)

# Day 2: Start restructuring the actual docs
lean-spec update docs-restructure --status in-progress
# Status: in-progress ✓ (actively restructuring docs)

# Day 3: Finish restructuring
lean-spec update docs-restructure --status complete
# Status: complete ✓ (docs are restructured)
```

## Managing Spec Relationships

### Bidirectional Soft Reference (`related`)
Use for informational relationships:

```bash
# Spec 042 and 043 are related
lean-spec link 042 --related 043

# View from either side
lean-spec deps 042  # Shows: ⟷ 043-official-launch-02
lean-spec deps 043  # Shows: ⟷ 042-mcp-error-handling
```

**Use when:**
- Specs cover related topics or features
- Work is coordinated but not blocking
- Context is helpful but not required

### Directional Blocking Dependency (`depends_on`)
Use for hard dependencies:

```bash
# Spec A depends on Spec B
lean-spec link spec-a --depends-on spec-b

# View dependency graph
lean-spec deps spec-a  # Shows: → spec-b (depends on)
lean-spec deps spec-b  # Shows: ← spec-a (blocks)
```

**Use when:**
- Spec truly cannot start until another completes
- There's a clear dependency chain
- Work must be done in specific order

### Best Practice
**Use `related` by default** - It's simpler and matches most use cases. Reserve `depends_on` for true blocking dependencies.

## Managing Spec Complexity

### Check Token Count
```bash
lean-spec tokens my-spec
# Output: Total: 3,800 tokens ⚠️
```

### Analyze and Split
When spec exceeds 3,500 tokens:

```bash
# 1. Analyze structure
lean-spec analyze my-spec --json

# 2. Identify heavy sections (example output):
# Lines 100-250: "Detailed Architecture" (850 tokens)
# Lines 300-450: "Test Strategy" (600 tokens)

# 3. Extract to sub-specs
lean-spec split my-spec --output "DESIGN.md:100-250"
lean-spec split my-spec --output "TESTING.md:300-450"

# 4. Compact main README
lean-spec compact my-spec --remove "100-250" --remove "300-450"

# 5. Add navigation links manually to main README
# Add: See [DESIGN.md](./DESIGN.md) for architecture details
```

## Frontmatter Management

**CRITICAL RULE: Never manually edit system-managed frontmatter**

**System-managed fields:**
- `status`, `priority`, `tags`, `assignee`
- `transitions`, `created_at`, `updated_at`, `completed_at`
- `depends_on`, `related`

**Always use CLI commands:**
```bash
# ✅ CORRECT
lean-spec update <spec> --status in-progress
lean-spec update <spec> --priority high
lean-spec update <spec> --tags api,backend
lean-spec link <spec> --depends-on other-spec

# ❌ WRONG - Will cause metadata corruption
# Opening README.md and editing:
# status: in-progress
# priority: high
```

**Verify changes:**
```bash
lean-spec deps <spec>     # View relationships
lean-spec view <spec>     # Check all metadata
```

## Quality Validation Workflow

Before completing work:

```bash
# 1. Validate specs
node bin/lean-spec.js validate

# 2. Build docs site
cd docs-site && npm run build

# 3. Fix any errors
# ... make corrections ...

# 4. Mark complete
lean-spec update <spec> --status complete
```

## Local Development

When working on LeanSpec codebase itself:

```bash
# ❌ Don't use published package
# npx lean-spec <command>

# ✅ Use local build
pnpm build
node bin/lean-spec.js <command>
```

## Project Health Monitoring

### Quick Overview
```bash
lean-spec board              # Kanban view
lean-spec stats              # Quick metrics
```

### Detailed Analysis
```bash
lean-spec stats --full       # All analytics
lean-spec tokens             # All specs by token count
lean-spec validate           # Check for issues
```

## Common Patterns

### Feature Implementation
```bash
# 1. Create and plan
lean-spec create payment-integration --priority high --tags backend,api

# 2. Start work
lean-spec update payment-integration --status in-progress

# 3. Link dependencies
lean-spec link payment-integration --depends-on user-authentication

# 4. Check impact
lean-spec deps payment-integration --impact

# 5. Complete
lean-spec update payment-integration --status complete
```

### Refactoring Complex Spec
```bash
# 1. Check size
lean-spec tokens large-feature
# Output: 4,200 tokens ⚠️

# 2. Get recommendations
lean-spec analyze large-feature

# 3. Split into focused sub-specs
lean-spec split large-feature --output "DESIGN.md:50-200"
lean-spec split large-feature --output "IMPLEMENTATION.md:250-400"
lean-spec split large-feature --output "TESTING.md:450-550"

# 4. Clean up main file
lean-spec compact large-feature --remove "50-200" --remove "250-400" --remove "450-550"

# 5. Verify
lean-spec tokens large-feature
# Output: 1,800 tokens ✅
```

### Coordinated Work Across Specs
```bash
# Launch depends on multiple features
lean-spec link product-launch --depends-on payment-integration
lean-spec link product-launch --depends-on user-dashboard
lean-spec link product-launch --depends-on dark-theme-support

# View full dependency graph
lean-spec deps product-launch --impact
```

## Parallel Development with Git Worktrees

Need to work on multiple specs simultaneously? Use Git worktrees for complete code isolation.

### Why Git Worktrees?

- **Native Git feature** - No additional tools required
- **Complete isolation** - Each worktree has independent working directory
- **Shared history** - Efficient disk usage, all worktrees share `.git`
- **No context switching** - Work on multiple specs without stashing/committing

### Basic Setup

```bash
# Main repo structure after creating worktrees:
~/project/                    # Primary worktree (main branch)
~/project/.worktrees/
  ├── spec-045-dashboard/     # Worktree for spec 045
  ├── spec-047-timestamps/    # Worktree for spec 047
  └── spec-048-analysis/      # Worktree for spec 048
```

### Pattern 1: Solo Developer - Parallel Features

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
# Merge and clean up when done:
git worktree remove .worktrees/spec-045-dashboard
```

### Pattern 2: Team - Multiple Developers

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

### Pattern 3: Experiment + Stable Work

```bash
# Keep main worktree for stable/production work
cd ~/project  # Main worktree on main branch

# Create experimental worktree for risky spec
git worktree add .worktrees/spec-048-experiment -b experiment/048
cd .worktrees/spec-048-experiment
# Try experimental approach...

# If experiment fails, just remove worktree
git worktree remove .worktrees/spec-048-experiment
# Main work remains untouched
```

### Handling Dependencies

When specs have dependencies (`depends_on`):

```bash
# Spec 048 depends on 045
# Option 1: Wait for 045 to merge to main
git worktree add .worktrees/spec-048 -b feature/048
# Work on 048 after 045 is merged

# Option 2: Branch from 045's feature branch (when 045 not yet merged)
cd ~/project  # Back to main worktree
git worktree add .worktrees/spec-048-analysis feature/045-dashboard -b feature/048-from-045
# 048 includes all changes from 045's branch
```

### Best Practices

1. **Worktree naming**: Use spec number + short name (e.g., `spec-045-dashboard`)
2. **Branch strategy**: Feature branches per spec (e.g., `feature/045-dashboard`)
3. **Cleanup**: Remove worktrees after merge (`git worktree remove <path>`)
4. **Status updates**: Update spec status from main worktree where `specs/` lives
5. **Dependencies**: Branch from dependent spec's feature branch if needed
6. **Ignore worktrees**: Add `.worktrees/` to `.gitignore`
