---
status: planned
created: '2025-11-24'
tags:
  - templates
  - dx
priority: medium
created_at: '2025-11-24T07:08:39.244Z'
---

# Simplify Template System to Standard + Detailed

> **Status**: 📅 Planned · **Priority**: Medium · **Created**: 2025-11-24

**Project**: lean-spec  
**Team**: Core Development

## Overview

### Problem
The template engine layer adds unnecessary complexity without proportional value:

**Current architecture:**
```
Template Engine Layer:
├── agents-template.hbs (Handlebars template)
├── agents-components/ (15+ component files)
│   ├── core-rules-base.md
│   ├── discovery-commands-{minimal,standard,enterprise}.md
│   ├── essential-commands-{minimal,standard,enterprise}.md
│   └── ... more variations
├── agents-config.json × 3 (minimal, standard, enterprise)
└── Build script generates AGENTS.md files
```

**Issues:**
1. **Indirection**: Edit component → rebuild → test → repeat (slow feedback)
2. **Cognitive overhead**: Understanding which components combine into final AGENTS.md
3. **Build complexity**: Handlebars + build script + validation script
4. **Debugging difficulty**: Generated file bugs require tracing back to source components
5. **Minimal value**: Prevents duplication but we only have 2-3 templates

**Evidence from tutorial testing:**
When users run `npx lean-spec init --example dark-theme` and prompt "Help me add dark theme support to this app using LeanSpec", the AI doesn't follow proper SDD workflow (using `lean-spec create`, `lean-spec update --status`) because the generated AGENTS.md lacks proper emphasis.

**Root cause**: We built elaborate template engine (specs 073, 086) to solve duplication, but the abstraction cost exceeds the duplication cost for 2-3 templates.

### Success Criteria
- Only 2 templates: `standard` (default) and `enterprise` (teams)
- **No template engine** - directly maintain AGENTS.md files
- `standard` AGENTS.md has **strong emphasis** on CLI commands for SDD workflow
- Faster iteration (edit file → test, no build step)
- Tutorial experience improved (AI follows CLI workflow properly)
- No loss of essential features for solo devs or teams

## Design

### Eliminate Template Engine Completely

**Philosophy**: For 2-3 templates, direct maintenance is simpler than build abstraction.

**New architecture:**
```
templates/
├── standard/
│   ├── AGENTS.md              # System prompt (directly maintained)
│   └── files/
│       └── README.md          # Single-file spec template
└── detailed/
    ├── AGENTS.md              # System prompt (directly maintained)
    └── files/
        ├── README.md          # Main spec (overview + links)
        ├── DESIGN.md          # Sub-spec: Design details
        ├── PLAN.md            # Sub-spec: Implementation plan
        └── TEST.md            # Sub-spec: Testing strategy
```

**Key insight:** 
- AGENTS.md at template root (system prompt for AI)
- files/ contains spec structure to be copied
- Detailed template demonstrates sub-spec pattern!

### How Templates Connect to `.lean-spec/`

**During `lean-spec init`:**

1. **Template selection:**
   - User runs `lean-spec init` (uses standard) or `lean-spec init --template detailed`
   - CLI reads from `packages/cli/templates/{standard|detailed}/`

2. **Files copied:**
   ```
   From: packages/cli/templates/standard/
   ├── AGENTS.md              → project-root/AGENTS.md
   └── files/README.md        → .lean-spec/templates/spec-template.md
   ```

3. **Result in user project:**
   ```
   project-root/
   ├── AGENTS.md              # System prompt (from template/AGENTS.md)
   ├── .lean-spec/
   │   ├── config.json        # Generated config (unchanged structure)
   │   └── templates/
   │       └── spec-template.md    # From template/files/README.md
   └── specs/                 # Empty directory created
   ```

**For detailed template:**
```
From: packages/cli/templates/detailed/
├── AGENTS.md              → project-root/AGENTS.md
└── files/
    ├── README.md          → .lean-spec/templates/spec-template.md (or README.md)
    ├── DESIGN.md          → .lean-spec/templates/DESIGN.md
    ├── PLAN.md            → .lean-spec/templates/PLAN.md
    └── TEST.md            → .lean-spec/templates/TEST.md
```

**What stays the same:**
- `.lean-spec/config.json` structure (unchanged)
- `.lean-spec/templates/` directory purpose (stores spec templates)
- How `lean-spec create` reads templates from `.lean-spec/templates/`
- **Backward compatibility**: Support both `spec-template.md` and `README.md` naming
- All CLI commands and their behavior

**What changes:**
- Source location: `packages/cli/templates/{template}/files/*` instead of `packages/cli/templates/{template}/spec-template.md`
- AGENTS.md now at template root instead of `files/AGENTS.md`
- Detailed template includes multiple template files (README.md, DESIGN.md, etc.)

**Backward compatibility strategy:**
- Existing projects: Keep using `.lean-spec/templates/spec-template.md`
- New standard projects: Copy to `.lean-spec/templates/spec-template.md` (maintain convention)
- New detailed projects: Copy as `.lean-spec/templates/README.md` + other sub-specs
- CLI should check for both `spec-template.md` and `README.md` when creating specs

**When creating new specs:**
- `lean-spec create <name>` reads from `.lean-spec/templates/spec-template.md` (same as before)
- For detailed template, it would also copy DESIGN.md, PLAN.md, TEST.md (new behavior)

**Remove entirely:**
- `_shared/agents-template.hbs` (Handlebars template)
- `_shared/agents-components/` (all 15+ component files)
- `agents-config.json` files (all 3)
- `scripts/build-agents-templates.ts`
- `scripts/validate-agents-templates.ts`

### Template Consolidation

**Remove `minimal` template entirely:**
- Unclear differentiation from standard
- Adds maintenance burden without clear user value
- Tutorial shows minimal doesn't work well (too simplified)

**Keep 2 templates:**

1. **`standard/` (default)**
   - For simple specs, quick projects
   - Single-file spec (all sections in README.md)
   - Strong CLI command emphasis
   - Clear SDD workflow instructions
   - Tutorial template

2. **`detailed/`**
   - For complex specs with lots of content
   - **Uses sub-spec pattern** (splits README.md into DESIGN.md, PLAN.md, TEST.md)
   - Demonstrates how to keep specs under token limits
   - Shows real sub-spec organization
   - Example spec included showing the pattern
   - Opt-in: `lean-spec init --template detailed`

**Benefits of sub-spec approach for detailed:**
- Demonstrates real-world sub-spec usage
- Shows how to split complex specs
- Keeps main README.md as overview/navigation
- Users learn pattern for managing token limits
- AGENTS.md identical to standard (same workflow)

### AGENTS.md Structure (Same for Both Templates)

**Command-first approach** (fix tutorial issue):

```markdown
# AI Agent Instructions

## Project: {{project_name}}

Lightweight spec methodology for AI-powered development.

## Core Rules

1. **Read README.md first** - Understand project context
2. **Check specs/** - Review existing specs before starting
3. **ALWAYS use CLI commands** - Never manually edit frontmatter
4. **Follow LeanSpec principles** - Clarity over documentation
5. **Keep it minimal** - If it doesn't add clarity, cut it

## Essential Commands

**CRITICAL: Use CLI commands for all spec operations**

**Working with specs:**
- `lean-spec create <name>` - Create new spec (status: `planned`)
- `lean-spec update <spec> --status in-progress` - BEFORE implementing
- `lean-spec update <spec> --status complete` - AFTER implementing

**Discovery:**
- `lean-spec list` - See all specs
- `lean-spec search "<query>"` - Find relevant specs
- `lean-spec deps <spec>` - Check dependencies

**Project overview:**
- `lean-spec board` - Kanban view
- `lean-spec stats` - Quick metrics

## SDD Workflow

1. **Discover** - Check existing specs: `lean-spec list`
2. **Plan** - Create spec: `lean-spec create <name>` (status: `planned`)
3. **Start Work** - Mark in-progress BEFORE implementing: `lean-spec update <spec> --status in-progress`
4. **Implement** - Write code/docs, keep spec in sync
5. **Complete** - Mark complete AFTER implementation: `lean-spec update <spec> --status complete`

**CRITICAL - What "Work" Means:**
- ❌ NOT: Creating/writing the spec document itself
- ✅ YES: Implementing what the spec describes (code, docs, features)

## When to Use Specs

[content about when to write specs vs skip]

## Quality Standards

[status tracking, validation, etc.]
```

**Note:** Both standard and detailed templates use identical AGENTS.md. The difference is in spec structure, not workflow.

### Spec Template Differences

**Standard template (files/README.md):**
```markdown
---
status: planned
created: 'YYYY-MM-DD'
---

# {{spec_name}}

## Overview
## Design  
## Plan
## Test
## Notes
```
All sections in single README.md file.

**Detailed template (files/):**
```
specs/{{spec_name}}/
├── README.md       # Overview + navigation to sub-specs
├── DESIGN.md       # Design details
├── PLAN.md         # Implementation plan
└── TEST.md         # Testing strategy
```
Main README.md links to sub-specs for detailed sections.

### Maintenance Strategy

**AGENTS.md (shared):**
- ✅ Single AGENTS.md maintained, copied to both templates
- ✅ Edit once, use twice
- ✅ Test immediately (no build step)
- Target: ~100-120 lines

**Spec templates (different):**
- Standard: Single `spec-template.md` (all sections in one file)
- Detailed: `spec-template.md` + example showing sub-spec pattern

**Managing updates:**
- AGENTS.md: Edit once, copy to both template directories
- Standard spec-template.md: Simple single file
- Detailed: Maintain example spec with sub-specs (DESIGN.md, PLAN.md, TEST.md)
- No component system complexity
- No build steps

## Plan

### Phase 1: Remove Template Engine
- [ ] Delete `packages/cli/templates/_shared/agents-template.hbs`
- [ ] Delete `packages/cli/templates/_shared/agents-components/` (entire directory)
- [ ] Delete all `agents-config.json` files (minimal, standard, enterprise)
- [ ] Delete `scripts/build-agents-templates.ts`
- [ ] Delete `scripts/validate-agents-templates.ts`
- [ ] Remove template build from `package.json` scripts
- [ ] Remove Handlebars dependency if only used for this

### Phase 2: Consolidate to 2 Templates

**Shared AGENTS.md:**
- [ ] Write single AGENTS.md from scratch (command-first, ~100-120 lines)
- [ ] Strong CLI workflow emphasis
- [ ] Copy to both `standard/AGENTS.md` and `detailed/AGENTS.md`

**Standard template restructure:**
- [ ] Move current `spec-template.md` → `standard/files/README.md`
- [ ] Create `standard/AGENTS.md` at template root
- [ ] Update any references to old layout

**Detailed template creation:**
- [ ] Rename `enterprise/` directory to `detailed/`
- [ ] Create `detailed/AGENTS.md` (same as standard)
- [ ] Create `detailed/files/` directory with sub-spec example:
  - [ ] `files/README.md` (overview + links to sub-specs)
  - [ ] `files/DESIGN.md` (design details)
  - [ ] `files/PLAN.md` (implementation plan)
  - [ ] `files/TEST.md` (testing strategy)

**Update init command:**
- [ ] Update file copying logic to handle new layout:
  - Copy `{template}/AGENTS.md` → project root
  - Copy `{template}/files/*` → `.lean-spec/templates/`
  - Standard: Copy `files/README.md` as `spec-template.md` (backward compat)
  - Detailed: Copy all files (README.md, DESIGN.md, etc.) preserving names
- [ ] Update `lean-spec create` to support both naming conventions:
  - Check for `spec-template.md` first (existing projects)
  - Fall back to `README.md` if not found (new detailed projects)
- [ ] Delete `packages/cli/templates/minimal/` directory
- [ ] Add `detailed` template option
- [ ] Handle legacy `enterprise`/`minimal` gracefully (suggest alternatives)

### Phase 3: Validation & Testing
- [ ] Test `lean-spec init` (should use standard)
- [ ] Test `lean-spec init --template enterprise`
- [ ] Test `lean-spec init --template minimal` (should show error or default to standard)
- [ ] Run tutorial test: `npx lean-spec init --example dark-theme`
- [ ] Verify AI prompt "Help me add dark theme support using LeanSpec" now uses CLI commands
- [ ] Verify AGENTS.md files are copied correctly on init

### Phase 4: Documentation
- [ ] Update README.md (remove references to template engine)
- [ ] Update docs about templates (only mention standard/enterprise)
- [ ] Update tutorial if needed
- [ ] Remove any build instructions for templates

## Test

### Template System
- [ ] `lean-spec init` uses standard template
- [ ] AGENTS.md copied from `standard/AGENTS.md` to project root
- [ ] Standard: `files/README.md` copied as `.lean-spec/templates/spec-template.md` (backward compat)
- [ ] Detailed: All files copied preserving names to `.lean-spec/templates/`
- [ ] `lean-spec create` works with both `spec-template.md` and `README.md`
- [ ] `lean-spec init --template detailed` copies AGENTS.md + sub-spec files
- [ ] Existing projects with `spec-template.md` continue working
- [ ] `lean-spec init --template minimal` handles gracefully (error or default to standard)
- [ ] `lean-spec init --template enterprise` handles gracefully (suggest detailed instead)
- [ ] No build errors related to missing template scripts
- [ ] AGENTS.md files are identical in both templates

### Backward Compatibility
- [ ] Projects initialized before this change continue working
- [ ] `lean-spec create` checks for `spec-template.md` first, then `README.md`
- [ ] Documentation mentions both naming conventions
- [ ] Migration path documented for users wanting to switch to detailed template

### Tutorial Validation (Critical)
- [ ] Run `npx lean-spec init --example dark-theme`
- [ ] Check AGENTS.md has strong CLI command emphasis
- [ ] Prompt AI: "Help me add dark theme support using LeanSpec"
- [ ] Verify AI uses `lean-spec create` command (not manual file creation)
- [ ] Verify AI uses `lean-spec update --status in-progress` before implementing
- [ ] Verify AI uses `lean-spec update --status complete` after implementing
- [ ] Workflow section is prominent and clear

### Code Quality
- [ ] No references to template engine in codebase
- [ ] No orphaned component files
- [ ] No unused dependencies (Handlebars)
- [ ] Clean git status (all deleted files removed)

## Notes

### Why Eliminate Template Engine

**From First Principles:**

1. **Context Economy** - Fit in working memory
   - Template engine: Understand Handlebars + components + config + build process
   - Direct files: Just read/edit AGENTS.md
   - **Verdict**: Direct files fit in working memory better

2. **Signal-to-Noise** - Every abstraction must earn its keep
   - Template engine prevents duplication across 3 templates
   - But we only need 2 templates (~100-150 lines each)
   - Duplication cost < abstraction cost
   - **Verdict**: Engine is noise for this scale

3. **Progressive Disclosure** - Add complexity when pain is felt
   - Built engine before feeling duplication pain at scale
   - Only 2 templates needed, not 10
   - **Verdict**: Premature abstraction

**The Abstraction Tax:**
- Learning: Handlebars syntax, component system, config schema
- Debugging: Trace generated output back to source components
- Iteration: Edit component → build → test (slow feedback loop)
- Cognitive load: "Which components combine to create this section?"

**For 2 templates:** This tax exceeds duplication cost.

### Historical Context

**What we built:**
- Spec 073: Template engine with Handlebars + components
- Spec 086: Component deduplication with composition patterns
- Result: Technically excellent, well-architected system

**What we learned:**
- Tutorial testing revealed real problem: CLI workflow emphasis
- Engine complexity doesn't solve this - content does
- Maintaining 2 AGENTS.md files is easier than maintaining engine
- Direct editing gives faster feedback and clearer results

**Quote from spec 073:**
> "Goal: Use template engine to generate AGENTS.md from shared components, eliminate duplication, prevent drift."

**Reality check:**
- Duplication: Only 2 files, ~40% shared content (60 lines)
- Drift: Not a problem with 2 files + good testing
- Engine: Adds indirection that slows iteration

### Alternatives Considered

**Option A: Keep engine, simplify components**
- Reduce component variations
- **Rejected**: Still has abstraction tax, doesn't fix tutorial issue

**Option B: Keep 3 templates, remove engine**
- Direct AGENTS.md but keep minimal
- **Rejected**: 3 templates still unclear differentiation

**Option C: Keep engine, improve standard config**
- Fix tutorial by changing component composition
- **Rejected**: Slower iteration (build step), doesn't remove complexity

**Chosen: 2 direct templates + detailed demonstrates sub-specs**
- Remove engine entirely
- Shared AGENTS.md for both templates (~100 lines)
- Standard: Single-file specs (files/README.md)
- Detailed: Sub-spec pattern example (files/ with DESIGN.md, PLAN.md, TEST.md)
- No duplication (AGENTS.md is identical)
- Fast iteration on content
- **Bonus**: Detailed template teaches token management pattern

### Related Specs
- `073-template-engine-agents-md` - Built template engine (complete)
- `086-template-component-deduplication` - Refined components (complete)
- **This spec**: Remove both (learned abstraction wrong for this scale)
