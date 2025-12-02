# Design: Documentation Structure Redesign

This document contains the architecture and key design decisions for the new documentation structure.

## Navigation Restructure

### New Sidebar Structure

```typescript
const sidebars: SidebarsConfig = {
  guideSidebar: [
    {
      type: 'category',
      label: 'Introduction',
      items: ['guide/index', 'guide/getting-started', 'guide/examples'],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      items: ['guide/first-principles', 'guide/philosophy', 'guide/when-to-use'],
    },
    {
      type: 'category',
      label: 'Working with AI',
      items: ['guide/ai-setup', 'guide/ai-best-practices', 'guide/ai-examples'],
    },
    {
      type: 'category',
      label: 'Features',
      items: ['guide/templates', 'guide/custom-fields', 'guide/variables'],
    },
    {
      type: 'category',
      label: 'Workflow',
      items: ['guide/board-stats', 'guide/dependencies', 'guide/validation'],
    },
    'guide/migration',
    'roadmap',
  ],
  referenceSidebar: [
    'reference/cli',
    'reference/config',
    'reference/frontmatter',
    'reference/mcp-server',
  ],
};
```

**Key Changes**:
1. Remove `aiSidebar` completely (content moved to guideSidebar)
2. AI Integration → "Working with AI" in Guide
3. Add First Principles to Core Concepts
4. Add Workflow section
5. Add MCP Server to Reference

### Key Design Decisions

**Decision #1: AI Integration → Working with AI**
- **Rationale**: AI is core to LeanSpec, not optional
- **Placement**: Within Guide (part of workflow)
- **First Principle**: Bridge the Gap (align human + AI)

**Decision #2: First Principles Prominent**
- **Rationale**: Foundation for everything else
- **Placement**: First item in Core Concepts
- **First Principle**: Intent Over Implementation (capture why)

**Decision #3: Workflow Section**
- **Rationale**: Practical usage needs dedicated section
- **Placement**: After Features (progression: learn → customize → use)
- **First Principle**: Progressive Disclosure (add structure when useful)

**Decision #4: MCP in Reference**
- **Rationale**: Technical API documentation
- **Placement**: Reference section (alongside CLI, Config)
- **First Principle**: Context Economy (separate concerns)

## Content Architecture

### Documentation Hierarchy

```
Introduction (What & Why)
  ├─ Overview: What is LeanSpec, why it exists
  ├─ Getting Started: Install, init, first spec
  └─ Examples: Real specs from this project

Core Concepts (Foundation)
  ├─ First Principles: 5 fundamental constraints
  ├─ Philosophy: How to apply principles
  └─ When to Use: Appropriate use cases

Working with AI (Integration)
  ├─ Setup: AGENTS.md, MCP, IDE integration
  ├─ Best Practices: Writing specs for AI
  └─ Examples: Real workflows

Features (Customization)
  ├─ Templates: Minimal, standard, enterprise
  ├─ Custom Fields: Adapt to workflow
  └─ Variables: Template variables

Workflow (Daily Usage)
  ├─ Board & Stats: Project visibility
  ├─ Dependencies: Spec relationships
  └─ Validation: Quality checks

Reference (Technical)
  ├─ CLI Commands: Complete reference
  ├─ Configuration: config.json schema
  ├─ Frontmatter: Schema and fields
  └─ MCP Server: API reference

Roadmap (Future)
```

### Content Flow

**User Journey**:
1. **Introduction** → Understand what LeanSpec is
2. **Core Concepts** → Learn the foundation
3. **Working with AI** → Set up tools
4. **Features** → Customize to needs
5. **Workflow** → Use daily
6. **Reference** → Look up details

## Content Changes

**See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for detailed content specifications.**

### Summary of Changes

**New Content**:
- `guide/first-principles.mdx` (from spec 049)
- `guide/board-stats.mdx` (new)
- `guide/dependencies.mdx` (new)
- `guide/validation.mdx` (new)
- `reference/mcp-server.mdx` (enhanced from `docs/MCP-SERVER.md`)
- `guide/migration.mdx` (from `docs/MIGRATION.md`)

**Updated Content**:
- `guide/philosophy.mdx` (add First Principles derivation)
- `guide/ai-setup.mdx` (merge from ai-integration/)
- `guide/custom-fields.mdx` (merge examples from `docs/examples/`)

**Moved Content**:
- `ai-integration/` → `guide/` (all AI content)

**Deleted**:
- `docs-site/docs/ai-integration/` directory (after migration)
- `docs/` folder content (after integration, keep folder with redirect)

## Migration Strategy

### Phase-by-Phase Approach

**Phase 1: Structure** (Non-breaking)
- Update `sidebars.ts`
- Create placeholder files
- Test build

**Phase 2: Content** (Content-heavy)
- Create first-principles.mdx
- Update philosophy.mdx
- Migrate AI content

**Phase 3: Consolidation** (Critical)
- Migrate `docs/` content
- Update all links
- Delete old structure

**Phase 4: Polish** (Quality)
- Add examples
- Improve formatting
- Final testing

### Backward Compatibility

**Link Redirects**:
```
/docs/ai-integration/setup → /docs/guide/ai-setup
/docs/ai-integration/best-practices → /docs/guide/ai-best-practices
[etc.]
```

**Implementation**:
- Use Docusaurus redirect plugin
- Add redirect entries to `docusaurus.config.ts`

## Design Validation

### Alignment with First Principles

**Context Economy**: ✅
- Clear section boundaries
- Logical grouping
- Easy to navigate

**Signal-to-Noise**: ✅
- No duplicate content
- Clear purpose for each section
- Progressive depth

**Intent Over Implementation**: ✅
- Shows why (First Principles)
- Shows how (Philosophy, Workflow)
- References for details

**Bridge the Gap**: ✅
- Human-readable navigation
- AI-friendly structure
- Both audiences served

**Progressive Disclosure**: ✅
- Introduction → Concepts → Setup → Features → Workflow → Reference
- Can start simple, go deep as needed

### User Journey Validation

**New Developer**:
1. Introduction → Quick start
2. Core Concepts → Understand foundation
3. Working with AI → Set up tools
4. Templates → First spec
✅ Clear path

**Experienced Developer**:
1. Jump to Workflow → Daily usage
2. Reference → Command details
✅ Fast access

**AI Agent**:
1. Can parse structure
2. Clear hierarchies
3. Unambiguous references
✅ Machine-friendly

## Technical Considerations

### Build Impact
- No build time increase expected
- Same number of pages (reorganized, not expanded)
- Search index regenerated (automatic)

### Performance
- Navigation depth unchanged
- Asset loading unchanged
- No performance impact

### SEO
- Update sitemap (automatic)
- Some URL changes (redirects handle)
- Content quality improves (better structure)

## Success Criteria

### Structural
- [x] Clear hierarchy (Introduction → Concepts → AI → Features → Workflow → Reference)
- [x] No duplicate content
- [x] Logical grouping
- [x] Consistent depth

### Content
- [x] First Principles clearly explained
- [x] Philosophy shows derivation
- [x] AI integration feels core
- [x] All `docs/` content integrated

### Technical
- [x] Builds without errors
- [x] No broken links
- [x] Redirects configured
- [x] Search works

### User Experience
- [x] Can find content in <2 clicks
- [x] Navigation flows logically
- [x] Mobile-friendly
- [x] Accessible
