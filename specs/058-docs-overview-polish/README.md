---
status: complete
created: '2025-11-07'
tags:
  - documentation
  - quality
  - restructure
  - first-principles
priority: high
related:
  - '056'
  - '057'
  - 049
depends_on:
  - 049
created_at: '2025-11-07T01:53:09.673Z'
updated_at: '2025-11-07T15:18:39.640Z'
transitions:
  - status: in-progress
    at: '2025-11-07T02:17:43.534Z'
  - status: complete
    at: '2025-11-07T02:19:49.555Z'
  - status: in-progress
    at: '2025-11-07T08:00:00.000Z'
  - status: complete
    at: '2025-11-07T07:03:23.727Z'
  - status: in-progress
    at: '2025-11-07T07:12:56.735Z'
  - status: complete
    at: '2025-11-07T15:18:39.640Z'
completed_at: '2025-11-07T02:19:49.555Z'
completed: '2025-11-07'
---

# Docs-Site Comprehensive Restructure

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-07 · **Tags**: documentation, quality, restructure, first-principles

**Project**: lean-spec  
**Team**: Core Development

## Overview

**Comprehensive docs-site restructure** to align with LeanSpec First Principles (spec 049) and fix structural issues.

**Scope Changed**: Originally minor polish, now major restructure based on findings:
1. ❌ **AI Integration as separate tab** - Wrong! AI is core to LeanSpec, not optional add-on
2. ❌ **Core Concepts outdated** - Doesn't align with First Principles (spec 049)
3. ❌ **`docs/` folder not integrated** - Valuable content (MCP, migration, examples) not in docs-site
4. ❌ **Navigation structure suboptimal** - Doesn't reflect actual workflow

**Why Now**: 
- Part of v0.2.0 launch (spec 043) - must be right before launch
- Spec 049 established First Principles - docs must reflect them
- Current structure treats AI as optional when it's fundamental
- Duplicate content in `docs/` folder causes confusion

**Result**: Cohesive, principle-driven documentation that reflects LeanSpec's AI-native identity.

## Problems Identified

**See [ANALYSIS.md](./ANALYSIS.md) for detailed problem analysis.**

**Summary of Key Issues**:

1. **AI Integration Structure is Wrong** (Critical)
   - Separate "AI Integration" tab treats AI as optional
   - Should be integrated into Guide as "Working with AI"
   - Contradicts AI-native identity

2. **Core Concepts Missing First Principles** (Critical)
   - Spec 049 established 5 First Principles (Context Economy, Signal-to-Noise, etc.)
   - Current docs don't have First Principles doc
   - Philosophy appears arbitrary without showing foundation

3. **`docs/` Folder Not Integrated** (High Priority)
   - Valuable content exists outside docs-site (MCP-SERVER.md, MIGRATION.md, examples)
   - Causes confusion and duplication
   - Need single source of truth

4. **Navigation Doesn't Reflect Workflow** (Medium Priority)
   - No workflow section (board, stats, deps, validate)
   - Features and workflow mixed
   - Doesn't show progression: Concepts → Setup → Workflow → Reference

## Design

**See [DESIGN.md](./DESIGN.md) for complete design documentation.**

**See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for detailed implementation specifications** (content templates, migration steps, code examples).

### Navigation Structure (Summary)

**New Structure**:
```
Guide/
  Introduction/ (Overview, Getting Started, Examples)
  Core Concepts/ (First Principles, Philosophy, When to Use)
  Working with AI/ (Setup, Best Practices, Examples)
  Features/ (Templates, Custom Fields, Variables)
  Workflow/ (Board & Stats, Dependencies, Validation)
  Migration
  
Reference/
  CLI Commands
  Configuration
  Frontmatter Schema
  MCP Server API
  
Roadmap
```

**Key Changes**:
1. ✅ AI Integration moved into Guide as "Working with AI"
2. ✅ First Principles added (from spec 049)
3. ✅ Workflow section added (board, stats, deps, validate)
4. ✅ MCP Server API in Reference
5. ✅ Single AI tab removed

### Content Updates (Summary)

1. **Add First Principles doc** - Extract from spec 049, adapt for docs-site
2. **Update Philosophy** - Show derivation from First Principles
3. **Migrate AI content** - Move ai-integration/ into guide/
4. **Consolidate `docs/`** - Merge MCP-SERVER.md, MIGRATION.md, examples into docs-site
5. **Create Workflow docs** - New guides for board, stats, deps, validate
6. **Update Overview** - Better feature grouping, prominently feature MCP

## Plan

### Phase 1: Navigation & Structure (Foundation)
- [ ] Update `sidebars.ts` with new structure
  - [ ] Move AI Integration content into guideSidebar
  - [ ] Add Core Concepts with first-principles
  - [ ] Add Workflow section
  - [ ] Add MCP Server to Reference
  - [ ] Remove aiSidebar
- [ ] Test navigation build (ensure no broken links)

### Phase 2: Core Concepts (Critical Content)
- [ ] Create `docs-site/docs/guide/first-principles.mdx`
  - [ ] Extract content from spec 049 (FIRST-PRINCIPLES.md)
  - [ ] Adapt for docs-site format (Docusaurus)
  - [ ] Add clear examples and conflict resolution framework
- [ ] Update `docs-site/docs/guide/philosophy.mdx`
  - [ ] Add intro linking to First Principles
  - [ ] Show how philosophy derives from principles
  - [ ] Update Core Philosophy section with derivation
- [ ] Update `docs-site/docs/guide/principles.mdx`
  - [ ] Add note: "Agile Principles derive from First Principles"
  - [ ] Link to First Principles doc

### Phase 3: Working with AI (Move from Separate Tab)
- [ ] Rename/move AI integration content into Guide
  - [ ] `ai-integration/index.mdx` → `guide/ai-setup.mdx`
  - [ ] `ai-integration/setup.mdx` → merge into `guide/ai-setup.mdx`
  - [ ] `ai-integration/best-practices.mdx` → `guide/ai-best-practices.mdx`
  - [ ] `ai-integration/examples.mdx` → `guide/ai-examples.mdx`
  - [ ] `ai-integration/agents-md.mdx` → incorporate into `guide/ai-setup.mdx`
- [ ] Update internal links (all references to `/docs/ai-integration/` → `/docs/guide/`)
- [ ] Delete old `docs-site/docs/ai-integration/` directory

### Phase 4: Migrate `docs/` Content (Consolidation)
- [ ] Create `docs-site/docs/reference/mcp-server.mdx`
  - [ ] Migrate content from `docs/MCP-SERVER.md`
  - [ ] Enhance with comprehensive setup, troubleshooting, security
  - [ ] Format for Docusaurus
- [ ] Create `docs-site/docs/guide/migration.mdx`
  - [ ] Migrate content from `docs/MIGRATION.md`
  - [ ] Add to Guide section
- [ ] Enhance `docs-site/docs/guide/custom-fields.mdx`
  - [ ] Incorporate examples from `docs/examples/CUSTOM-FIELDS-GUIDE.md`
  - [ ] Add config examples from `docs/examples/`
- [ ] Deprecate `docs/` folder
  - [ ] Create `docs/README.md` with redirect message
  - [ ] Keep folder but mark as deprecated

### Phase 5: Workflow Section (New Content)
- [ ] Create `docs-site/docs/guide/board-stats.mdx`
  - [ ] Document board and stats commands
  - [ ] Show project visibility workflows
- [ ] Create `docs-site/docs/guide/dependencies.mdx`
  - [ ] Document deps command
  - [ ] Explain `related` vs `depends_on`
  - [ ] Show relationship patterns
- [ ] Create `docs-site/docs/guide/validation.mdx`
  - [ ] Document validate command
  - [ ] Explain complexity analysis
  - [ ] Show quality workflows

### Phase 6: Overview Updates (Original Scope)
- [ ] Update `docs-site/docs/guide/index.mdx`
  - [ ] Replace "How It Works" with "What You Get"
  - [ ] Prominently feature MCP server
  - [ ] Group features: CLI, MCP, Templates
  - [ ] Update example to match actual templates
  - [ ] Fix example date
  - [ ] Link to roadmap page

### Phase 7: Testing & Validation
- [ ] Build docs-site: `cd docs-site && npm run build`
- [ ] Verify no broken links
- [ ] Check all internal references updated
- [ ] Review navigation flow
- [ ] Test search functionality
- [ ] Validate on mobile/desktop

### Phase 8: Cleanup & Polish
- [ ] Update README.md if needed (ensure it matches docs-site)
- [ ] Update AGENTS.md with new doc structure
- [ ] Archive or remove redundant content
- [ ] Add migration notes to CHANGELOG.md

## Test

**Success Criteria**:

### Navigation & Structure
- [ ] AI Integration moved into Guide as "Working with AI"
- [ ] First Principles doc exists and is prominent
- [ ] Workflow section exists (board-stats, dependencies, validation)
- [ ] MCP Server reference complete and comprehensive
- [ ] No separate AI Integration tab
- [ ] Sidebar navigation logical and intuitive

### Content Quality
- [ ] First Principles clearly explained with examples
- [ ] Philosophy shows derivation from First Principles
- [ ] All `docs/` content integrated into docs-site
- [ ] MCP Server docs comprehensive (setup, troubleshooting, security)
- [ ] Migration guide complete
- [ ] Custom fields examples included

### Completeness
- [ ] MCP server prominently featured in overview
- [ ] Features grouped logically (CLI, MCP, Templates)
- [ ] Workflow docs complete (board, stats, deps, validate)
- [ ] All internal links updated (no `/docs/ai-integration/` references)
- [ ] `docs/` folder deprecated with redirect message

### Technical
- [ ] Docs-site builds without errors: `cd docs-site && npm run build`
- [ ] No broken links
- [ ] Search functionality works
- [ ] Mobile/desktop rendering correct
- [ ] All images/assets load

### Alignment
- [ ] Docs reflect First Principles (spec 049)
- [ ] AI-native identity clear throughout
- [ ] README.md consistent with docs-site
- [ ] AGENTS.md reflects new structure

**Validation Commands**:
```bash
# Build docs-site
cd docs-site && npm run build

# Validate specs
cd .. && npx lean-spec validate

# Check for broken links (if link checker installed)
# npm run check-links
```

## Notes

**See [NOTES.md](./NOTES.md) for implementation notes, decisions, and lessons learned.**

**Key Points**:
- Scope expanded from minor polish to comprehensive restructure
- User feedback + First Principles (spec 049) drove changes
- AI Integration → Working with AI (AI is core, not optional)
- Single source of truth (docs-site), deprecate `docs/` folder
- Estimated effort: 8-12 hours over 1-2 days

**Related Specs**:
- **Spec 049**: LeanSpec First Principles (foundation for this work)
- **Spec 056**: Initial docs audit (fixed major issues)
- **Spec 057**: Comprehensive validation (found these issues)
- **Spec 043**: v0.2.0 launch (parent context, this blocks launch)

---

**Status**: 🚧 In Progress (scope expanded from minor polish to comprehensive restructure)  
**Next Steps**: Execute Phase 1 (Navigation & Structure)
