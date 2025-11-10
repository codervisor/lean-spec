# Analysis: Documentation Structure Issues

This document contains the detailed problem analysis that informed the redesign.

## Current State Analysis

### Problem #1: AI Integration Structure is Wrong (Critical)

**Current State**: Separate "AI Integration" tab in navigation

**Why This is Wrong**:
- LeanSpec is **fundamentally AI-native** - not an optional feature
- Treating AI as separate contradicts our core identity
- Users think: "I don't use AI, I can skip this" - Wrong mindset!
- Should be integrated into Guide as "Working with AI" workflow

**Evidence**:
- README.md emphasizes "AI-native" in first paragraph
- Spec 049 First Principles designed for human + AI collaboration
- MCP server is a core tool, not an add-on
- Every workflow assumes AI agents

**Fix**: Move "AI Integration" into Guide section as "Working with AI"

### Problem #2: Core Concepts Don't Reflect First Principles (Critical)

**Current State**: Core Concepts has:
- `philosophy.mdx` - Mentions first principles but doesn't deeply explain them
- `principles.mdx` - "Agile Principles" (good but missing foundation)
- Missing: **First Principles doc itself**

**Why This is Wrong**:
- Spec 049 established 5 First Principles (Context Economy, Signal-to-Noise, etc.)
- These are the **foundation** - everything derives from them
- Current docs don't show the derivation hierarchy
- Philosophy appears arbitrary without showing it derives from principles

**Fix**: Add First Principles doc, update Philosophy to show derivation

### Problem #3: `docs/` Folder Content Not Integrated (High Priority)

**Current State**: Valuable content exists in `docs/` but not in docs-site:
- `docs/MCP-SERVER.md` - Comprehensive MCP setup (more detailed than docs-site)
- `docs/MIGRATION.md` - Migration guides
- `docs/examples/` - Custom fields examples and configs

**Why This is Wrong**:
- Duplicate content causes confusion ("which one is canonical?")
- `docs/` folder has better detail (e.g., MCP troubleshooting, security)
- Users may miss important content
- Hard to maintain two documentation sources

**Fix**: Migrate `docs/` content into docs-site, deprecate `docs/` folder

### Problem #4: Navigation Doesn't Reflect Workflow (Medium Priority)

**Current Structure**:
```
Guide/
  - Introduction (Overview, Getting Started)
  - Core Concepts (Philosophy, Principles, When to Use)
  - Features (Templates, Frontmatter, Custom Fields, Variables)
Reference/
  - CLI, Config, Frontmatter
AI Integration/ (separate tab)
Roadmap
```

**Issues**:
- No workflow section (board, stats, deps, validate are in CLI reference)
- Features and workflow mixed together
- No MCP reference (it's only in AI Integration)
- Doesn't show progression: Concepts → Setup → Workflow → Reference

**Fix**: Restructure navigation to match user journey

## Original Issues (Minor Priority)

### Issue #1: Feature Section Needs Restructuring

**Location**: "How It Works" section in overview

**Problem**: Section lists 5 CLI capabilities but:
1. Missing **MCP server** - major feature for AI integration!
2. Missing other key commands: `board`, `stats`, `deps`, `validate`, etc.
3. These are CLI commands, but framed as "what LeanSpec provides" (confusing scope)
4. No mention of roadmap/vision (VS Code extension, GitHub Action, PM integrations, etc.)

**Proposed Solution**: Replace "How It Works" with "What You Get" section that groups by:
- Core CLI (create, organize, search, board, stats, validate)
- MCP Server (AI integration)
- Templates & Customization (minimal/standard/enterprise, custom fields)

### Issue #2: Example Structure vs Templates

**Location**: "A Simple Example" section

**Problem**: Example structure doesn't match actual templates:
- **Minimal template**: Goal, Key Points, Non-Goals, Notes
- **Standard template**: Overview, Design, Plan, Test, Notes
- **Example**: Goal, Key Scenarios, Acceptance Criteria, Technical Contracts, Non-Goals

**Fix**: Add clarifying note that example is illustrative, not prescriptive

### Issue #3: Example Date

**Location**: Same example

**Problem**: Date is in the past (`created: 2025-11-02`)

**Fix**: Change to `created: 2025-11-07` or use `{date}` variable

## Comparative Analysis

### Current vs Proposed Structure

**Current (Problematic)**:
- 3 top-level tabs (Guide, Reference, AI Integration)
- AI treated as optional add-on
- No First Principles documentation
- Duplicate content in `docs/` folder
- Workflow buried in CLI reference

**Proposed (Aligned)**:
- 2 top-level tabs (Guide, Reference)
- AI integrated into Guide workflow
- First Principles prominent in Core Concepts
- Single source of truth (docs-site)
- Dedicated Workflow section

## User Journey Mapping

### Current Journey (Confusing)
1. Read Overview → "What is LeanSpec?"
2. Core Concepts → Philosophy (but why these principles?)
3. Features → Templates (how to start?)
4. Stuck: Where's AI integration? Where's workflow?

### Proposed Journey (Clear)
1. Introduction → Overview, Getting Started, Examples
2. Core Concepts → First Principles (foundation), Philosophy (application)
3. Working with AI → Setup, Best Practices (integrated workflow)
4. Features → Templates, Custom Fields (customization)
5. Workflow → Board/Stats, Dependencies, Validation (daily usage)
6. Reference → CLI, Config, Frontmatter, MCP API (technical details)

## Content Migration Map

### From `docs/` to docs-site

| Source | Destination | Action |
|--------|-------------|--------|
| `docs/MCP-SERVER.md` | `docs-site/docs/reference/mcp-server.mdx` | Migrate + enhance |
| `docs/MIGRATION.md` | `docs-site/docs/guide/migration.mdx` | Migrate |
| `docs/examples/CUSTOM-FIELDS-GUIDE.md` | `docs-site/docs/guide/custom-fields.mdx` | Merge |
| `docs/examples/*.json` | Inline in custom-fields.mdx | Include as examples |

### Within docs-site

| Source | Destination | Action |
|--------|-------------|--------|
| `ai-integration/index.mdx` | `guide/ai-setup.mdx` | Move + rename |
| `ai-integration/setup.mdx` | Merge into `guide/ai-setup.mdx` | Merge |
| `ai-integration/best-practices.mdx` | `guide/ai-best-practices.mdx` | Move |
| `ai-integration/examples.mdx` | `guide/ai-examples.mdx` | Move |
| `ai-integration/agents-md.mdx` | Incorporate into `guide/ai-setup.mdx` | Merge |

## Impact Analysis

### Breaking Changes
- None (only documentation reorganization)
- Old URLs redirect or show clear navigation

### User Impact
- **Positive**: Clearer structure, easier to find content
- **Neutral**: Content is the same, just reorganized
- **Negative**: None expected (all content remains accessible)

### Maintenance Impact
- **Reduced**: Single docs source (docs-site)
- **Improved**: Clear structure for future additions
- **Easier**: Less duplication, clearer ownership

## Risk Assessment

### Low Risk
- ✅ No code changes
- ✅ No API changes
- ✅ Content reorganization only

### Medium Risk
- ⚠️ Broken internal links (mitigated by thorough testing)
- ⚠️ User confusion during transition (mitigated by clear communication)

### High Risk
- None identified

## Success Metrics

### Quantitative
- Zero broken links after migration
- Build time remains <30 seconds
- All internal references updated
- Zero 404s after deployment

### Qualitative
- Navigation flows logically
- First Principles clearly explained
- AI integration feels core, not optional
- Users can find content in <2 clicks

## Validation Strategy

### Automated
1. Build docs-site without errors
2. Check for broken links (link checker)
3. Validate spec structure (`lean-spec validate`)
4. Search functionality still works

### Manual
1. Review navigation flow
2. Verify all content migrated
3. Check mobile/desktop rendering
4. Test search for common queries

## Timeline Estimate

| Phase | Estimated Time | Critical Path |
|-------|----------------|---------------|
| Navigation & Structure | 2-3 hours | Yes |
| Core Concepts | 2-3 hours | Yes (foundation) |
| AI Content Move | 3-4 hours | Yes (biggest change) |
| Migrate `docs/` | 2-3 hours | No |
| Workflow Section | 2-3 hours | No |
| Overview Updates | 1-2 hours | No |
| Testing | 1-2 hours | Yes |
| Polish | 1 hour | No |

**Total**: 8-12 hours over 1-2 days

**Critical Path**: 7-9 hours (Navigation → Core Concepts → AI Move → Testing)
