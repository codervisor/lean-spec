---
status: complete
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
  - '078'
created_at: '2025-11-13T08:35:40.229Z'
updated_at: '2025-11-13T10:32:28.046Z'
transitions:
  - status: in-progress
    at: '2025-11-13T09:26:58.535Z'
  - status: complete
    at: '2025-11-13T09:29:32.737Z'
  - status: in-progress
    at: '2025-11-13T09:48:01.526Z'
  - status: complete
    at: '2025-11-13T10:32:28.046Z'
completed_at: '2025-11-13T09:29:32.737Z'
completed: '2025-11-13'
---

# template-engine-agents-md

> **Status**: ✅ Complete · **Priority**: Medium · **Created**: 2025-11-13 · **Tags**: templates, maintainability, dx, refactor, ai-first

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

**Scope**: This spec covers Phase 1 only (AGENTS.md template engine). Phase 2 (sub-spec template system) was split into spec 078.

**Related Specs**:
- `012-sub-spec-files` (archived) - Original sub-spec design (implemented)
- `013-custom-spec-templates` (archived) - Template system v1
- `025-template-config-updates` - Config format updates
- `072-ai-agent-first-use-workflow` - Current AGENTS.md improvement driving this
- `074-content-at-creation` - Spec creation with content flags (similar AI-first approach)
- `078-sub-spec-template-system` - Phase 2 split into separate spec (sub-spec generation)

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

### Technical Approach

**AGENTS.md Template Engine**:
- Tool: Handlebars.js (lightweight, widely used)
- Build script: `scripts/build-agents-templates.ts`
- Runs during: `pnpm build` or `pnpm build:templates`
- Generated files committed to repo (easier distribution)

**Note**: Originally this spec included Phase 2 (Sub-Spec Template System) for generating optional sub-spec files. That has been split into spec 078 for clearer separation of concerns

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

- [x] **Setup Template Infrastructure**
  - [x] Create `packages/cli/templates/_shared/agents-components/` directory
  - [x] Extract shared components from existing AGENTS.md files
  - [x] Create `agents-template.hbs` main template
  - [x] Add Handlebars dependency to CLI package

- [x] **Create Component Files**
  - [x] `core-rules-base.md` - 4 shared rules
  - [x] `discovery-commands.md` - identical across templates
  - [x] `essential-commands.md` - command reference
  - [x] `frontmatter-minimal.md` - minimal frontmatter guidance
  - [x] `frontmatter-standard.md` - standard frontmatter
  - [x] `frontmatter-enterprise.md` - enterprise frontmatter
  - [x] `workflow-standard.md` - standard SDD workflow
  - [x] `workflow-enterprise.md` - enterprise approval workflow
  - [x] `quality-standards.md` - identical across templates

- [x] **Create Template Configs**
  - [x] `minimal/agents-config.json`
  - [x] `standard/agents-config.json`
  - [x] `enterprise/agents-config.json`

- [x] **Build Script**
  - [x] Create `scripts/build-agents-templates.ts`
  - [x] Implement template composition logic
  - [x] Add validation for generated output
  - [x] Integrate into `pnpm build` script

- [x] **Validation & Testing**
  - [x] Verify generated AGENTS.md matches current versions
  - [x] Test `lean-spec init` with each template
  - [x] Update CI to fail if generated files out of sync
  - [ ] Add pre-commit hook to regenerate if source changed (deferred - CI validation sufficient)

**Note**: Phase 2 (Sub-Spec Template System) has been moved to spec 078-sub-spec-template-system

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
**Decision**: Build-time generation with Handlebars is the sweet spot - simple, reliable, works everywhere.

### Phase 2 Split Decision

**Why split into separate spec (078)?**
- Phase 1 (AGENTS.md template engine) is complete and independent
- Phase 2 (sub-spec template system) is a different feature with different scope
- Cleaner separation allows independent planning and archiving
- Phase 1 can be archived when appropriate while Phase 2 continues as spec 078

### Related Specs

See Overview section for full list of related specs.

### Open Questions

- Should we also template-ize spec templates (README.md)? Or just AGENTS.md?
- ~~Do we need a `lean-spec templates validate` command?~~ ✅ Implemented as `pnpm validate:templates`
- ~~Should CI auto-regenerate and commit, or just fail?~~ ✅ CI fails on drift (regeneration is manual)
- Can we detect if AGENTS.md was manually edited and warn?
- ~~Should we support optional sub-specs?~~ ✅ Moved to spec 078

### Success Metrics

- **Maintenance Time**: Adding new rule takes 1 file edit + build (not 4 file edits) ✅ **Achieved**
- **Consistency**: No drift between templates (verified by tests) ✅ **Achieved** (CI validation in place)
- **Flexibility**: Easy to create new templates with different combinations ✅ **Achieved**

## Completion Summary

**Status**: Complete ✅

**Completed Work**:
1. ✅ Template infrastructure created with component-based architecture
2. ✅ All component files extracted and organized
3. ✅ Build system integrated (`pnpm build:templates`)
4. ✅ Validation system implemented (`pnpm validate:templates`)
5. ✅ CI integration added to prevent drift
6. ✅ Manual testing completed for all three templates (minimal, standard, enterprise)
7. ✅ Documentation updated with validation guide

**Benefits Realized**:
- Single source of truth for shared content
- Automated validation prevents template drift
- Easy maintenance: update once, propagates to all templates
- CI ensures quality and consistency

**Note**: Originally planned Phase 2 (Sub-Spec Template System) has been split into spec 078-sub-spec-template-system for clearer separation of concerns
