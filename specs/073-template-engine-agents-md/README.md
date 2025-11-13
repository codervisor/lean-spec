---
status: planned
created: '2025-11-13'
tags:
  - templates
  - maintainability
  - dx
  - refactor
  - ai-first
priority: medium
related:
  - '025'
  - '072'
  - '074'
created_at: '2025-11-13T08:35:40.229Z'
updated_at: '2025-11-13T09:02:39.867Z'
---

# template-engine-agents-md

> **Status**: 🗓️ Planned · **Priority**: Medium · **Created**: 2025-11-13 · **Tags**: templates, maintainability, dx, refactor, ai-first

**Project**: lean-spec  
**Team**: Core Development

## Overview

**Problem**: Template AGENTS.md files have significant duplication and drift issues:

1. **Duplication**: Core content (First Principles, commands, workflow) duplicated across 3+ templates
2. **Maintenance Burden**: Single change (like nested code blocks rule) requires updating 4+ files
3. **Drift Risk**: Templates diverge over time as updates miss some files
4. **Template System Mismatch**: Current `.lean-spec/templates/` only handles spec files (README.md), not supporting files (AGENTS.md)

**Example**: Just added "nested code blocks" rule to all 4 AGENTS.md files - this is not scalable.

**Current State**:
- Root `AGENTS.md` (reference implementation)
- `packages/cli/templates/minimal/files/AGENTS.md`
- `packages/cli/templates/standard/files/AGENTS.md`
- `packages/cli/templates/enterprise/files/AGENTS.md`
- Each ~85-125 lines with 70%+ shared content

**Goal**: Use template engine to generate AGENTS.md from shared components, eliminate duplication, prevent drift.

**Related Issue**: `.lean-spec/templates/` system also needs redesign - currently only generates main spec file, should support optional sub-specs (DESIGN.md, TESTING.md, etc.).

**Related Specs**:
- `012-sub-spec-files` (archived) - Original sub-spec design (implemented)
- `013-custom-spec-templates` (archived) - Template system v1
- `025-template-config-updates` - Config format updates
- `072-ai-agent-first-use-workflow` - Current AGENTS.md improvement driving this
- `074-content-at-creation` - Spec creation with content flags (similar AI-first approach)

## Design

### Problem Analysis

**Current AGENTS.md Structure**:

```
1. Project description (varies)
2. Core Rules (mostly shared, 1-2 project-specific rules)
3. Discovery Commands (identical across templates)
4. Spec Frontmatter (varies by template - minimal/standard/enterprise)
5. When to Use Specs (similar with minor variations)
6. Workflow (enterprise has approval, others standard)
7. Quality Standards (identical)
```

**Shared (~70%)**: Core Rules, Discovery Commands, Quality Standards, most workflow steps
**Variable (~30%)**: Project description, frontmatter fields, approval workflow

### Solution: Two-Part Improvement

#### Part 1: Template Engine for AGENTS.md (Immediate)

Use simple template engine (Handlebars or similar) with shared components:

**Structure**:
```
packages/cli/templates/
├── _shared/
│   ├── agents-components/
│   │   ├── core-rules.md
│   │   ├── discovery-commands.md
│   │   ├── essential-commands.md
│   │   ├── workflow-standard.md
│   │   ├── workflow-enterprise.md
│   │   └── quality-standards.md
│   └── agents-template.hbs
├── minimal/
│   ├── config.json
│   ├── agents-config.json  # NEW: defines which components + vars
│   └── files/
│       └── spec-template.md
├── standard/
│   ├── config.json
│   ├── agents-config.json
│   └── files/
│       └── spec-template.md
└── enterprise/
    ├── config.json
    ├── agents-config.json
    └── files/
        └── spec-template.md
```

**agents-config.json** (example for standard):
```json
{
  "project_name": "{project_name}",
  "description": "Lightweight spec methodology for AI-powered development.",
  "components": [
    "core-rules",
    "discovery-commands",
    "essential-commands",
    "frontmatter-standard",
    "workflow-standard",
    "quality-standards"
  ],
  "customRules": [],
  "workflowType": "standard"
}
```

**Build Process**:
```bash
# During package build or on-demand
npm run build:agents-templates
# Generates AGENTS.md in each template from shared components
```

**Benefits**:
- ✅ Single source of truth for shared content
- ✅ Easy to update all templates (edit one component file)
- ✅ Template-specific customization still possible
- ✅ Prevents drift automatically
- ✅ Can version control both source and generated files

#### Part 2: Redesign `.lean-spec/templates/` System (Future)

**Current Problem**: Templates only generate main spec file (README.md), but specs often need sub-files.

**Proposed Design**:
```
.lean-spec/
└── templates/
    ├── default/
    │   ├── README.md         # Main spec template (required)
    │   ├── DESIGN.md.opt     # Optional sub-spec
    │   └── TESTING.md.opt    # Optional sub-spec
    └── api/
        ├── README.md
        ├── API.md.opt
        └── SCHEMAS.md.opt
```

**Convention**:
- `{name}.md` - Always generated
- `{name}.md.opt` - Generate only if requested (flag or prompt)
- `{name}.md.req` - Always generated (for templates requiring sub-specs)

**Usage** (AI-first, flag-based by default):
```bash
# Standard: generates README.md only
lean-spec create my-feature

# With explicit sub-spec flags (AI-friendly)
lean-spec create my-feature --design --testing

# Human interactive mode (opt-in)
lean-spec create my-feature --with-subs
? Include optional sub-specs? (space to select)
  [ ] DESIGN.md
  [x] TESTING.md
  [ ] IMPLEMENTATION.md

# Rationale: AI agents primarily use CLI, prefer declarative flags over interactive prompts
```

**Config Enhancement**:
```json
{
  "templates": {
    "default": {
      "main": "README.md",
      "optional": ["DESIGN.md", "TESTING.md", "IMPLEMENTATION.md"],
      "required": [],
      "flags": {
        "--design": "DESIGN.md",
        "--testing": "TESTING.md",
        "--implementation": "IMPLEMENTATION.md"
      }
    },
    "api": {
      "main": "README.md",
      "optional": ["SCHEMAS.md"],
      "required": ["API.md"],
      "flags": {
        "--schemas": "SCHEMAS.md"
      }
    }
  }
}
```

### Technical Approach

**Phase 1**: AGENTS.md Template Engine
- Tool: Handlebars.js (lightweight, widely used)
- Build script: `scripts/build-agents-templates.ts`
- Runs during: `pnpm build` or `pnpm build:templates`
- Generated files committed to repo (easier distribution)

**Phase 2**: Sub-Spec Template System (AI-First Design)
- Extend existing template resolution in `src/commands/creator.ts`
- Add explicit sub-spec flags (`--design`, `--testing`, etc.) - primary interface
- Add `--with-subs` interactive prompt - opt-in for human users
- Support `.opt` and `.req` file conventions
- Update config schema for template metadata and flag mappings

### Alternative Approaches Considered

1. **Runtime Template Composition**: Generate AGENTS.md during `lean-spec init`
   - ❌ Requires template engine in runtime dependency
   - ❌ More complex error handling
   - ✅ Could work but build-time is simpler

2. **Symbolic Links**: Link shared content
   - ❌ Breaks on Windows
   - ❌ Confusing in version control
   - ❌ Doesn't solve the problem

3. **Single AGENTS.md with Conditionals**: One file with template-specific sections
   - ❌ Becomes unreadable
   - ❌ Hard to maintain
   - ❌ Doesn't scale

**Decision**: Build-time generation with Handlebars is the sweet spot - simple, reliable, works everywhere.

## Plan

### Phase 1: AGENTS.md Template Engine

- [ ] **Setup Template Infrastructure**
  - [ ] Create `packages/cli/templates/_shared/agents-components/` directory
  - [ ] Extract shared components from existing AGENTS.md files
  - [ ] Create `agents-template.hbs` main template
  - [ ] Add Handlebars dependency to CLI package

- [ ] **Create Component Files**
  - [ ] `core-rules-base.md` - 4 shared rules
  - [ ] `discovery-commands.md` - identical across templates
  - [ ] `essential-commands.md` - command reference
  - [ ] `frontmatter-minimal.md` - minimal frontmatter guidance
  - [ ] `frontmatter-standard.md` - standard frontmatter
  - [ ] `frontmatter-enterprise.md` - enterprise frontmatter
  - [ ] `workflow-standard.md` - standard SDD workflow
  - [ ] `workflow-enterprise.md` - enterprise approval workflow
  - [ ] `quality-standards.md` - identical across templates

- [ ] **Create Template Configs**
  - [ ] `minimal/agents-config.json`
  - [ ] `standard/agents-config.json`
  - [ ] `enterprise/agents-config.json`

- [ ] **Build Script**
  - [ ] Create `scripts/build-agents-templates.ts`
  - [ ] Implement template composition logic
  - [ ] Add validation for generated output
  - [ ] Integrate into `pnpm build` script

- [ ] **Validation & Testing**
  - [ ] Verify generated AGENTS.md matches current versions
  - [ ] Test `lean-spec init` with each template
  - [ ] Update CI to fail if generated files out of sync
  - [ ] Add pre-commit hook to regenerate if source changed

### Phase 2: Sub-Spec Template System

- [ ] **Design & Planning**
  - [ ] Define `.opt` / `.req` file convention
  - [ ] Design config schema for template metadata and flag mappings
  - [ ] Design flag-based interface (primary) + interactive mode (opt-in)
  - [ ] Document sub-spec template authoring guide

- [ ] **Implementation**
  - [ ] Extend `creator.ts` to handle sub-spec templates
  - [ ] Add explicit sub-spec flags (`--design`, `--testing`, etc.)
  - [ ] Add `--with-subs` interactive mode (opt-in for humans)
  - [ ] Implement file filtering logic (opt/req/flags)
  - [ ] Update template resolution and variable substitution

- [ ] **Template Updates**
  - [ ] Create example templates with sub-specs
  - [ ] Update existing templates with `.opt` convention
  - [ ] Add template metadata to config.json files

- [ ] **Documentation & Testing**
  - [ ] Update docs for sub-spec usage
  - [ ] Create examples in templates
  - [ ] Test all combinations of sub-spec generation
  - [ ] Add integration tests

## Test

**Phase 1: AGENTS.md Template Engine**

- [ ] **Component Extraction Test**: Generated AGENTS.md matches current files byte-for-byte
- [ ] **Build Integration Test**: `pnpm build` successfully generates all templates
- [ ] **Template Variability Test**: Each template (minimal/standard/enterprise) has correct unique content
- [ ] **Shared Content Test**: Changes to shared components propagate to all templates
- [ ] **CI Validation Test**: CI fails if source components changed but generated files not updated

**Test Protocol**:
```bash
# 1. Generate templates
pnpm build:templates

# 2. Compare with current
diff packages/cli/templates/minimal/files/AGENTS.md packages/cli/templates/minimal/files/AGENTS.md.bak

# 3. Test template selection during init
lean-spec init --template standard
# Verify AGENTS.md was copied correctly

# 4. Modify shared component
echo "\n6. Test rule" >> templates/_shared/agents-components/core-rules-base.md
pnpm build:templates
# Verify all AGENTS.md files updated
```

**Phase 2: Sub-Spec Template System**

- [ ] **Basic Sub-Spec Generation**: `lean-spec create feat --design` generates README.md + DESIGN.md
- [ ] **Interactive Selection**: Prompt allows selecting multiple optional sub-specs
- [ ] **Required Sub-Spec**: Templates with `.req` files always generate those files
- [ ] **Variable Substitution**: Variables work in sub-spec templates
- [ ] **No Sub-Specs**: Default behavior (no flags) generates only README.md

**Test Protocol**:
```bash
# 1. Test required sub-spec
lean-spec create api-endpoint --template api
# Should generate README.md + API.md (required)

# 2. Test explicit flags (AI-first interface)
lean-spec create feature --design --testing
# Should generate README.md + DESIGN.md + TESTING.md

# 3. Test interactive mode (human opt-in)
lean-spec create feature --with-subs
# Interactive prompt, select TESTING.md only
# Should generate README.md + TESTING.md

# 4. Test default (no sub-specs)
lean-spec create simple-fix
# Should generate only README.md

# 5. AI agent usage test
# AI should prefer: lean-spec create feature --design --implementation
# Not: lean-spec create feature --with-subs (requires interaction)
```

## Notes

### Why This Matters

**Immediate Pain**: Just added "nested code blocks" rule to 4 files. Next update will be same pain.

**Long-term Impact**: 
- As LeanSpec grows, AGENTS.md will evolve frequently (new commands, updated workflows, etc.)
- Every change requires 4-file update currently
- Risk of inconsistency grows over time
- Template engine fixes this permanently

### Build vs Runtime Trade-offs

**Build-time generation** (chosen):
- ✅ No runtime overhead
- ✅ Simple distribution (generated files in npm package)
- ✅ Easy to audit (see generated output in git)
- ✅ No template engine dependency at runtime
- ⚠️ Must remember to rebuild after editing components

**Runtime generation** (rejected):
- ✅ Always fresh
- ❌ Template engine in runtime deps
- ❌ More complex error handling
- ❌ Harder to debug

### AI-First Design Rationale

**Why flag-based over interactive by default?**

In AI-human co-op spec writing mode:
- **AI agents primarily use the CLI**, not humans
- **Interactive prompts block automation** - AI can't respond to prompts effectively
- **Flags are declarative** - AI can determine needed sub-specs and invoke with explicit flags
- **Humans can opt-in** - `--with-subs` flag preserves interactive experience when desired

**Example AI workflow**:
```
AI analyzes task → determines needs DESIGN + TESTING sub-specs
→ runs: lean-spec create feature --design --testing
→ no interaction needed, continues working
```

This aligns with `072-ai-agent-first-use-workflow` principles: optimize for AI, accommodate humans.

### Related Specs

See Overview section for full list of related specs.

### Open Questions

- Should we also template-ize spec templates (README.md)? Or just AGENTS.md?
- Do we need a `lean-spec templates validate` command?
- Should CI auto-regenerate and commit, or just fail?
- Can we detect if AGENTS.md was manually edited and warn?

### Success Metrics

- **Maintenance Time**: Adding new rule takes 1 file edit + build (not 4 file edits)
- **Consistency**: No drift between templates (verified by tests)
- **Flexibility**: Easy to create new templates with different combinations
- **Adoption**: Sub-spec templates used in 20%+ of new specs within 2 months
