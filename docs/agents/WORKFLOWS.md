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
lean-spec link product-launch --depends-on email-notifications

# View full dependency graph
lean-spec deps product-launch --impact
```
