# Implementation Plan

This document outlines the 11-phase plan to restructure the documentation site.

## Phase 1: Core Concepts Restructure (WHY)

- [ ] Restructure `guide/understanding.mdx` (KEEP as entry point)
  - [ ] Merge positioning + "When to Use" content from `when-to-use.mdx`
  - [ ] Add problem/solution overview
  - [ ] Add decision framework
  - [ ] Add Core Concepts overview with links
- [ ] Extract `guide/first-principles.mdx` from understanding.mdx
  - [ ] Keep constraints and 5 principles sections
  - [ ] Remove mindset/beliefs content (move to philosophy)
  - [ ] Keep conflict resolution examples
- [ ] Create `guide/context-engineering.mdx` (NEW)
  - [ ] Reference spec 059 CONTEXT-ENGINEERING.md
  - [ ] Explain 4 strategies and 4 failure modes
  - [ ] Show how LeanSpec applies context engineering
  - [ ] Link to First Principles (Context Economy)
- [ ] Create `guide/ai-agent-memory.mdx` (NEW)
  - [ ] Explain specs as persistent memory layer
  - [ ] Reference LangChain article on agent memory
  - [ ] Connect to semantic memory concept
  - [ ] Show MCP integration for memory retrieval
- [ ] Update `guide/philosophy.mdx`
  - [ ] Extract mindset/beliefs from old understanding.mdx
  - [ ] Add links to First Principles, Context Engineering, AI Agent Memory
  - [ ] Integrate memory concept into mental models
  - [ ] Structure: Beliefs → Mental Models → Mindset

## Phase 2: Remove "Working with AI" Section

- [ ] Merge AI setup into Getting Started
  - [ ] Update `guide/getting-started.mdx` with MCP setup
  - [ ] Add AGENTS.md reference
  - [ ] Keep setup concise
- [ ] Migrate AI best practices content
  - [ ] Will move to new `usage/ai-assisted/` section in Phase 4
- [ ] Delete `guide/ai/` directory after migration complete

## Phase 3: Create Usage Section Structure

- [ ] Create `guide/usage/` directory structure
  - [ ] `basic-commands/`
  - [ ] `project-management/`
  - [ ] `advanced-features/`
  - [ ] `ai-assisted/`

## Phase 4: Essential Usage (New Content)

- [ ] Create `guide/usage/essential-usage/creating-managing.mdx`
  - [ ] Document create, update, archive commands
  - [ ] Include examples and common workflows
  - [ ] Add cross-links to CLI Reference
- [ ] Create `guide/usage/essential-usage/finding-specs.mdx`
  - [ ] Document list, search, view commands
  - [ ] Show filtering and querying examples
  - [ ] Add cross-links to CLI Reference
- [ ] Create `guide/usage/essential-usage/spec-structure.mdx`
  - [ ] Explain frontmatter fields
  - [ ] Document content section conventions
  - [ ] Metadata management best practices
  - [ ] Add cross-links to Frontmatter Reference and Config Reference

## Phase 5: Project Management (Rename Workflow)

- [ ] Move `guide/board-stats.mdx` → `guide/usage/project-management/board-stats.mdx`
- [ ] Move `guide/dependencies.mdx` → `guide/usage/project-management/dependencies.mdx`
- [ ] Move `guide/validation.mdx` → `guide/usage/project-management/validation.mdx`
- [ ] Add index page `guide/usage/project-management/index.mdx`

## Phase 6: Advanced Features (Rename Features)

- [ ] Move `guide/templates.mdx` → `guide/usage/advanced-features/templates.mdx`
- [ ] Move `guide/custom-fields.mdx` → `guide/usage/advanced-features/custom-fields.mdx`
- [ ] Move `guide/variables.mdx` → `guide/usage/advanced-features/variables.mdx`
- [ ] Move `guide/frontmatter.mdx` → `guide/usage/advanced-features/frontmatter.mdx`
- [ ] Add sub-specs documentation (if not exists)

## Phase 7: AI-Assisted Writing

- [ ] Move `guide/ai-executable-patterns.mdx` → `guide/usage/ai-assisted/ai-executable-patterns.mdx`
- [ ] Create `guide/usage/ai-assisted/mcp-integration.mdx`
  - [ ] MCP server setup (migrate from guide/ai/setup.mdx)
  - [ ] Usage examples
  - [ ] Troubleshooting
- [ ] Create `guide/usage/ai-assisted/agent-configuration.mdx`
  - [ ] AGENTS.md explanation
  - [ ] Configuration examples
  - [ ] Best practices (migrate from guide/ai/best-practices.mdx)

## Phase 8: Update Navigation (sidebars.ts)

- [ ] Update `docs-site/sidebars.ts`
  - [ ] Restructure Core Concepts section
  - [ ] Remove "Working with AI" section
  - [ ] Remove "Features" and "Workflow" sections
  - [ ] Add new "Usage" section with 4 subcategories
  - [ ] Update all item paths

## Phase 9: Update Cross-References

- [ ] Update all internal links in documentation
  - [ ] Fix links to moved pages
  - [ ] Update "Working with AI" references
  - [ ] Update "Features" and "Workflow" references
- [ ] Update Getting Started links
- [ ] Update Overview page links

## Phase 10: Cleanup

- [ ] Delete old files
  - [ ] `guide/when-to-use.mdx` (content merged into understanding.mdx)
  - [ ] `guide/ai/` directory (all content migrated)
- [ ] Delete empty directories
- [ ] Remove old sections from sidebars.ts

## Phase 11: Testing & Validation

- [ ] Build docs-site: `cd docs-site && npm run build`
- [ ] Verify no broken links
- [ ] Check navigation flow
- [ ] Test all cross-references
- [ ] Validate search functionality
- [ ] Review on mobile/desktop

## Estimated Effort

- **Phase 1-2 (Core Concepts + new pages)**: 4-5 hours
- **Phase 3-7 (Usage)**: 5-6 hours
- **Phase 8-11 (Navigation + Testing)**: 2-3 hours
- **Total**: 11-14 hours over 2-3 days

## Content Migration Map

```
OLD LOCATION                          → NEW LOCATION
================================================================
guide/understanding.mdx               → Split & Restructure:
  - Positioning + Problem/Solution    → guide/understanding.mdx (keep, restructure)
  - Constraints + 5 Principles        → guide/first-principles.mdx (extract)
  - Mindset + Beliefs                 → guide/philosophy.mdx (extract)

guide/when-to-use.mdx                 → guide/understanding.mdx (merge into)

(NEW - from spec 059)                 → guide/context-engineering.mdx
(NEW - from research)                 → guide/ai-agent-memory.mdx

guide/ai-executable-patterns.mdx      → guide/usage/ai-assisted/ai-executable-patterns.mdx

guide/ai/setup.mdx                    → Split:
  - Setup basics                      → guide/getting-started.mdx (merged)
  - MCP details                       → guide/usage/ai-assisted/mcp-integration.mdx

guide/ai/best-practices.mdx           → guide/usage/ai-assisted/agent-configuration.mdx (merged)

guide/ai/agents-md.mdx                → guide/usage/ai-assisted/agent-configuration.mdx (merged)

guide/ai/examples.mdx                 → Distribute to relevant sections

guide/templates.mdx                   → guide/usage/advanced-features/templates.mdx
guide/custom-fields.mdx               → guide/usage/advanced-features/custom-fields.mdx
guide/variables.mdx                   → guide/usage/advanced-features/variables.mdx
guide/frontmatter.mdx                 → guide/usage/advanced-features/frontmatter.mdx

guide/board-stats.mdx                 → guide/usage/project-management/board-stats.mdx
guide/dependencies.mdx                → guide/usage/project-management/dependencies.mdx
guide/validation.mdx                  → guide/usage/project-management/validation.mdx

(NEW)                                 → guide/usage/essential-usage/creating-managing.mdx
(NEW)                                 → guide/usage/essential-usage/finding-specs.mdx
(NEW)                                 → guide/usage/essential-usage/spec-structure.mdx
```
