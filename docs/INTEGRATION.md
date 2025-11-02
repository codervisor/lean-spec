# Integrating LeanSpec with Existing Projects

LeanSpec is designed to integrate smoothly with existing projects, whether you're starting fresh or adopting it mid-project.

## Quick Integration

```bash
cd your-existing-project
lspec init
```

The init process automatically detects existing files and offers integration options.

## Existing File Detection

### What Gets Detected

LeanSpec looks for:
- `AGENTS.md` - AI agent instructions
- `.cursorrules` - Cursor IDE rules
- `.aider.conf.yml` - Aider configuration
- `.github/copilot-instructions.md` - GitHub Copilot instructions
- Other AI system prompts

### Integration Options

When existing files are detected, you'll be prompted with three choices:

#### 1. Merge (Recommended)

**What it does**: Appends LeanSpec guidance to your existing files

**Example** - If you have `AGENTS.md`:
```markdown
# Your Existing Agent Instructions

... your existing content ...

---

# LeanSpec Workflow

... LeanSpec guidance appended ...
```

**Best for**:
- You want to keep existing AI instructions
- You want LeanSpec integrated into your current workflow
- You have custom agent prompts to preserve

**Pros**:
- Preserves all existing content
- Combines workflows seamlessly
- No manual merging needed

**Cons**:
- Results in longer files (but clearly separated)

---

#### 2. Backup

**What it does**: Renames existing files with `.backup` suffix and creates fresh LeanSpec files

**Example**:
```
AGENTS.md → AGENTS.md.backup
(new) AGENTS.md (LeanSpec version)
```

**Best for**:
- You want to try LeanSpec cleanly
- Existing files are outdated or experimental
- You want to reference old content without keeping it active

**Pros**:
- Clean slate with LeanSpec approach
- Easy to restore if needed
- Old content preserved for reference

**Cons**:
- Requires manual integration if you want both

---

#### 3. Skip

**What it does**: Leaves existing files untouched, only adds `.lspec/` config and `specs/` directory

**Example**:
```
AGENTS.md (unchanged)
.lspec/ (new)
  config.json
specs/ (new)
```

**Best for**:
- You have a well-established workflow
- You want to use LeanSpec commands without changing prompts
- You want to manually integrate later

**Pros**:
- No disruption to existing setup
- Full control over integration
- Can use LeanSpec tools immediately

**Cons**:
- Manual work needed to integrate workflows

## Integration Patterns

### Pattern 1: Additive Integration (Merge)

**Use case**: You have existing AI prompts and want to add LeanSpec methodology

**Steps**:
1. Run `lspec init`
2. Choose "Merge" when prompted
3. Review merged files to ensure consistency
4. Update any conflicting instructions

**Result**: Your existing workflow enhanced with LeanSpec structure

---

### Pattern 2: Clean Slate (Backup)

**Use case**: Starting fresh with LeanSpec methodology

**Steps**:
1. Run `lspec init`
2. Choose "Backup" when prompted
3. Review old `.backup` files for useful content
4. Manually copy key instructions to new files if needed

**Result**: LeanSpec-first approach with old content available for reference

---

### Pattern 3: Gradual Adoption (Skip)

**Use case**: Testing LeanSpec without disrupting current workflow

**Steps**:
1. Run `lspec init`
2. Choose "Skip" when prompted
3. Use LeanSpec commands (create, list, board, etc.)
4. Manually update `AGENTS.md` when ready

**Result**: LeanSpec tools available without changing existing prompts

## AI Agent Integration

### For Teams Using Cursor

If you have `.cursorrules`, LeanSpec can integrate directly:

**Merged .cursorrules**:
```markdown
# Your Existing Cursor Rules

... your rules ...

---

# LeanSpec Workflow

When working on features, check specs/ directory for context:
- `lspec list` - See all specs
- `lspec search "<query>"` - Find relevant specs
- `lspec deps <spec>` - Check dependencies

Follow LeanSpec principles:
- Clarity over documentation
- Essential scenarios over exhaustive lists
- Living guide over frozen contract
```

### For Teams Using GitHub Copilot

**Merged `.github/copilot-instructions.md`**:
```markdown
# GitHub Copilot Instructions

... your instructions ...

## LeanSpec Integration

Before implementing features, consult specs:
- Read specs/YYYYMMDD/NNN-feature-name/README.md
- Check status with `lspec list --status=in-progress`
- Verify dependencies with `lspec deps <spec>`
```

### For Teams Using Aider

**Merged `.aider.conf.yml`**:
```yaml
# Your existing Aider config

# LeanSpec integration
conventions:
  - Check specs/ for feature context
  - Update spec status after implementation
  - Keep specs in sync with code changes
```

## Post-Integration Steps

### 1. Review Merged Content

Check files for any conflicting instructions:

```bash
# Review merged AGENTS.md
cat AGENTS.md

# Check for conflicts
grep -i "conflict" AGENTS.md
```

### 2. Update Custom Instructions

Adjust merged content to fit your workflow:

```bash
# Edit merged file
code AGENTS.md

# Test with AI agent
# ... verify agent follows combined instructions
```

### 3. Create First Spec

Validate integration by creating a spec:

```bash
lspec create test-integration
cat specs/*/001-test-integration/README.md
```

### 4. Update Team Documentation

Document the integration for your team:

```markdown
# Our LeanSpec Integration

We've integrated LeanSpec using the [Merge/Backup/Skip] approach.

Key files:
- `AGENTS.md` - Combined AI instructions
- `specs/` - Feature specifications
- `.lspec/config.json` - LeanSpec configuration

Workflow:
1. Check existing specs: `lspec list`
2. Create spec for new work: `lspec create <feature>`
3. Implement feature following spec
4. Update status: `lspec update <spec> --status=complete`
```

## Migration Strategies

### From Other SDD Tools

#### From BMAD

BMAD specs are typically verbose. When migrating:

1. **Extract essentials**: Focus on "The Goal" and key scenarios
2. **Cut overhead**: Remove exhaustive details that don't add clarity
3. **Adapt structure**: Use LeanSpec's flexible structure

**Example migration**:
```bash
# Create LeanSpec version
lspec create user-authentication

# Copy relevant sections from BMAD spec
# - Business motivation → The Goal
# - Use cases → Key Scenarios
# - Success criteria → Acceptance Criteria
```

#### From GitHub SpecKit

SpecKit uses rigid templates. When migrating:

1. **Choose template**: Pick Standard or Enterprise template
2. **Map fields**: Align SpecKit metadata to LeanSpec frontmatter
3. **Simplify**: Remove unnecessary sections

#### From Kiro

Kiro focuses on API specs. Use the API-First template:

```bash
lspec init --template=api-first
```

Migrate Kiro specs by focusing on contracts and versioning.

### From No Formal Specs

If you're adopting specs for the first time:

1. **Start minimal**: Use Minimal template
2. **Document current work**: Create specs for in-progress features
3. **Evolve gradually**: Add fields and structure as needed

```bash
# Start minimal
lspec init --template=minimal

# Document current work
lspec create current-feature-1 --field status=in-progress
lspec create current-feature-2 --field status=in-progress

# Add details incrementally
```

## Troubleshooting

### Conflicting Instructions

**Problem**: Merged `AGENTS.md` has conflicting guidance

**Solution**:
1. Review both sections
2. Choose the approach that fits your team
3. Edit file to reconcile differences

### Duplicate Content

**Problem**: Similar instructions appear twice after merge

**Solution**:
1. Compare sections
2. Keep the more detailed or accurate version
3. Remove duplicates

### Integration Not Working

**Problem**: AI agents not following LeanSpec workflow

**Solution**:
1. Check that `AGENTS.md` is in repository root
2. Verify AI tool is reading the file
3. Add explicit "check specs/" instructions at the top

### Custom Fields Not Recognized

**Problem**: Template custom fields not working after merge

**Solution**:
1. Check `.lspec/config.json` exists
2. Verify custom fields are defined in config
3. Restart IDE or AI agent to reload config

## Best Practices

### Clear Separation

When merging, use clear section dividers:

```markdown
# Existing Instructions

... your content ...

---

# LeanSpec Integration

... LeanSpec guidance ...
```

### Prioritize Instructions

Put most important instructions first:

```markdown
# Critical Instructions (Read First)

1. Check specs/ before implementing
2. Follow our coding standards
3. Write tests for all features

---

# Detailed LeanSpec Workflow

... detailed guidance ...
```

### Keep It Lean

Even when merging, avoid bloat:
- Remove redundant sections
- Consolidate similar guidance
- Link to docs instead of duplicating

### Document Your Integration

Create `docs/LEANSPEC_INTEGRATION.md` explaining your setup:

```markdown
# Our LeanSpec Integration

## Approach
We merged LeanSpec with existing AGENTS.md [date]

## Key Changes
- Added spec workflow to AI instructions
- Defined custom fields for sprint tracking
- Created templates for API and frontend specs

## Workflow
[Your team's specific workflow]
```

## Examples

### Example 1: Cursor Integration

**Before** (`.cursorrules`):
```markdown
# Code Style
- Use TypeScript strict mode
- Prefer functional components
- Write tests for all features
```

**After** (merged):
```markdown
# Code Style
- Use TypeScript strict mode
- Prefer functional components
- Write tests for all features

---

# LeanSpec Workflow

Before implementing:
1. Run `lspec list --status=planned` to see pending work
2. Check spec in specs/YYYYMMDD/NNN-name/README.md
3. Verify no blocking dependencies with `lspec deps <spec>`

After implementing:
1. Update spec status: `lspec update <spec> --status=complete`
2. Ensure tests pass
3. Update any dependent specs
```

### Example 2: GitHub Copilot Integration

See `examples/integration-merge-example.md` in this repository for a complete example.

## Summary

LeanSpec integrates flexibly with existing projects:

1. **Detect** - Automatically finds existing AI prompts
2. **Choose** - Merge, Backup, or Skip based on your needs
3. **Integrate** - Preserves your workflow while adding LeanSpec tools
4. **Evolve** - Adapt over time as your team grows

The goal is to enhance your workflow, not disrupt it. Start where you are, integrate incrementally, and adapt to what works for your team.
