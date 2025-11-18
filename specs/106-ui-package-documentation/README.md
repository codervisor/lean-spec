---
status: planned
created: '2025-11-18'
tags: []
priority: medium
created_at: '2025-11-18T14:33:07.663Z'
related:
  - 105-docs-site-enhancements
updated_at: '2025-11-18T14:35:46.744Z'
---

# UI Package Documentation and Integration

> **Status**: 🗓️ Planned · **Priority**: Medium · **Created**: 2025-11-18

**Project**: lean-spec  
**Team**: Core Development

## Overview

The `@leanspec/ui` package and `lean-spec ui` CLI command are complete and functional, but lack comprehensive documentation on the docs site. Users need clear guidance on:

1. **What it is**: Visual web interface for browsing and managing specs
2. **How to use it**: Both CLI command and standalone package
3. **When to use it**: Use cases and benefits over CLI
4. **How it works**: Architecture, filesystem mode, auto-detection

### Current State

**What exists:**
- ✅ `lean-spec ui` CLI command (spec 087 - complete)
- ✅ `@leanspec/ui` npm package published and working
- ✅ Basic README in `packages/ui/README.md`
- ✅ Filesystem mode integration (spec 082)
- ✅ Auto-detection of specs directory
- ✅ Monorepo dev mode support

**What's missing in docs:**
- ❌ No docs-site page for `lean-spec ui` command
- ❌ No reference docs for `@leanspec/ui` package
- ❌ No usage guide for visual spec management
- ❌ No explanation of filesystem mode vs other modes
- ❌ Not mentioned in Quick Start or tutorials
- ❌ Not in CLI reference page

### Problems

**Discovery Issue:**
Users don't know the UI exists. It's not mentioned in:
- Introduction/Quick Start
- Getting Started guides
- Usage documentation
- CLI reference

**Usage Clarity:**
Users who find it don't understand:
- Difference between `lean-spec ui` and `npx @leanspec/ui`
- When to use UI vs CLI commands
- How filesystem mode works
- What features are available in the UI

**Integration Guidance:**
Missing guidance on:
- Using UI in development workflows
- Team collaboration with UI
- CI/CD integration considerations
- Troubleshooting common issues

### Goals

1. **Comprehensive Documentation**: Full coverage in docs site
2. **Clear Discovery Path**: Prominent in Quick Start and guides
3. **Usage Guidance**: When and how to use UI effectively
4. **Technical Details**: Architecture, modes, integration
5. **Troubleshooting**: Common issues and solutions

## Design

### 1. Documentation Structure

**New Pages to Create:**

```
docs/
├── guide/
│   └── visual-mode.mdx           # NEW: Using the UI (comprehensive guide)
└── reference/
    ├── cli.mdx                   # UPDATE: Add `lean-spec ui` section
    └── ui-package.mdx            # NEW: @leanspec/ui reference
```

### 2. Content Organization

#### A. Quick Start Updates

**Location**: `docs/index.mdx` or Introduction page

Add UI to the quick start flow:

```markdown
### 4. Visual Mode (Optional)

For a visual interface to browse and manage specs:

```bash
lean-spec ui
# Or from any project:
npx @leanspec/ui
```

The UI provides:
- Interactive spec browser with rich formatting
- Dependency graph visualization
- Project overview and metrics
- Search and filtering

→ Learn more: [Visual Mode Guide](./guide/visual-mode)
```

#### B. Visual Mode Guide (New)

**File**: `docs/guide/visual-mode.mdx`

**Content Structure:**
1. **Introduction**
   - What is LeanSpec UI
   - Benefits vs CLI (visual learners, exploration, presentations)
   - When to use each

2. **Getting Started**
   - `lean-spec ui` command
   - `npx @leanspec/ui` standalone
   - Auto-detection vs explicit `--specs`
   - Port configuration, browser control

3. **Features**
   - Spec browser (list, search, filter)
   - Spec viewer (formatted markdown, syntax highlighting)
   - Dependency visualization
   - Board view (Kanban)
   - Project stats and metrics

4. **Filesystem Mode**
   - What it is (direct file reads, no database)
   - How it works (60s cache TTL, realtime updates)
   - Why this architecture (simplicity, no setup)

5. **Development Workflows**
   - Using UI alongside CLI
   - Team collaboration (share localhost, deploy UI)
   - Presentations and demos

6. **Troubleshooting**
   - Specs directory not found
   - Port already in use
   - Build not found (monorepo dev)
   - Outdated UI version

#### C. CLI Reference Updates

**File**: `docs/reference/cli.mdx`

Add new section for `ui` command:

```markdown
### `lean-spec ui`

Start local web UI for visual spec management.

**Usage:**
```bash
lean-spec ui [options]
```

**Options:**
- `-s, --specs <dir>` - Specs directory (auto-detected if omitted)
- `-p, --port <port>` - Port to run on (default: 3000)
- `--no-open` - Don't open browser automatically
- `--dev` - Development mode (LeanSpec monorepo only)
- `--dry-run` - Show command without executing

**Examples:**
```bash
# Auto-detect specs, open on port 3000
lean-spec ui

# Custom directory and port
lean-spec ui --specs ./docs/specs --port 3100

# Don't open browser
lean-spec ui --no-open
```

**How it works:**
- In LeanSpec monorepo: runs local web package
- External projects: delegates to `npx @leanspec/ui`
- Uses filesystem mode (direct file reads)
- Auto-opens browser unless `--no-open`

→ See: [Visual Mode Guide](../guide/visual-mode)
```

#### D. UI Package Reference (New)

**File**: `docs/reference/ui-package.mdx`

**Content:**
1. **Overview**
   - Standalone web UI package
   - Can be used without CLI
   - Wraps Next.js application

2. **Installation & Usage**
   ```bash
   # Direct usage (no install needed)
   npx @leanspec/ui
   
   # Or install globally
   npm install -g @leanspec/ui
   leanspec-ui
   ```

3. **CLI Options** (same as `lean-spec ui`)

4. **Environment Variables**
   - `SPECS_MODE=filesystem` (set automatically)
   - `SPECS_DIR` (absolute path)
   - `PORT` (server port)

5. **Architecture**
   - Next.js standalone output
   - Filesystem mode implementation
   - Caching strategy (60s TTL)

6. **Development** (for contributors)
   - Building from monorepo
   - `prepare-dist.mjs` script
   - Publishing process

7. **Troubleshooting** (mirrors Visual Mode guide)

### 3. Cross-References

Update existing pages to reference UI:

**Pages to update:**
- `docs/guide/getting-started.mdx` - Mention UI as alternative
- `docs/guide/ai-assisted-workflows.mdx` - UI in AI workflows
- `docs/tutorials/*.mdx` - Add UI screenshots/mentions
- `docs/faq.mdx` - Add UI-related FAQs

### 4. Visual Assets

**Screenshots to add:**
1. UI landing page (spec list)
2. Spec detail view
3. Dependency graph visualization
4. Board view (Kanban)
5. Search results

**Diagrams:**
1. Architecture: CLI → UI package → Next.js
2. Filesystem mode flow diagram
3. Monorepo vs external delegation

### 5. Translation

All new content needs Chinese translation:
- `i18n/zh-Hans/docusaurus-plugin-content-docs/current/guide/visual-mode.mdx`
- `i18n/zh-Hans/docusaurus-plugin-content-docs/current/reference/ui-package.mdx`
- Update translated CLI reference

### Technical Approach

**Phase 1: Content Creation**
- Write English docs first
- Get feedback on structure/content
- Iterate on clarity

**Phase 2: Integration**
- Update existing pages with cross-references
- Add to navigation (sidebars.ts)
- Ensure all links work

**Phase 3: Visual Assets**
- Take screenshots of current UI
- Create architecture diagrams
- Add to docs

**Phase 4: Translation**
- Translate all new content to Chinese
- Verify terminology consistency
- Update Chinese navigation

## Plan

### Phase 1: Content Writing
- [ ] Write `docs/guide/visual-mode.mdx` (comprehensive guide)
  - [ ] Introduction and benefits
  - [ ] Getting started (both methods)
  - [ ] Features overview
  - [ ] Filesystem mode explanation
  - [ ] Development workflows
  - [ ] Troubleshooting section
- [ ] Write `docs/reference/ui-package.mdx` (package reference)
  - [ ] Overview and installation
  - [ ] CLI options
  - [ ] Environment variables
  - [ ] Architecture details
  - [ ] Development guide
  - [ ] Troubleshooting
- [ ] Update `docs/reference/cli.mdx`
  - [ ] Add `lean-spec ui` section
  - [ ] Document all options
  - [ ] Add examples
  - [ ] Link to visual mode guide

### Phase 2: Integration
- [ ] Update Quick Start
  - [ ] Add "Visual Mode" step to Introduction
  - [ ] Include UI in main flow
  - [ ] Add screenshots
- [ ] Update existing guides
  - [ ] `getting-started.mdx` - mention UI option
  - [ ] `ai-assisted-workflows.mdx` - UI in workflows
  - [ ] Update tutorials with UI mentions
- [ ] Update FAQ
  - [ ] Add UI-related questions
  - [ ] CLI vs UI comparison
- [ ] Update navigation (sidebars.ts)
  - [ ] Add visual-mode to Guide section
  - [ ] Add ui-package to Reference section
  - [ ] Ensure proper ordering

### Phase 3: Visual Assets
- [ ] Take screenshots
  - [ ] Spec list view
  - [ ] Spec detail view
  - [ ] Dependency graph
  - [ ] Board view
  - [ ] Search interface
- [ ] Create diagrams
  - [ ] Architecture (CLI → UI → Next.js)
  - [ ] Filesystem mode flow
  - [ ] Monorepo vs external
- [ ] Add images to docs
  - [ ] Place in `static/img/ui/`
  - [ ] Reference in markdown
  - [ ] Optimize for web

### Phase 4: Translation
- [ ] Translate visual-mode.mdx to Chinese
- [ ] Translate ui-package.mdx to Chinese
- [ ] Update Chinese CLI reference
- [ ] Update Chinese Quick Start
- [ ] Update Chinese navigation
- [ ] Verify terminology consistency

### Phase 5: Validation
- [ ] Build docs site (`npm run build`)
- [ ] Verify all links work
- [ ] Test navigation flow
- [ ] Check screenshots display correctly
- [ ] Verify Chinese translations
- [ ] Proofread all content

## Test

### Content Quality
- [ ] Visual mode guide is comprehensive and clear
- [ ] All features explained with examples
- [ ] Troubleshooting covers common issues
- [ ] Architecture explanation is accurate
- [ ] Code examples are correct and tested

### Navigation & Discovery
- [ ] UI mentioned in Quick Start/Introduction
- [ ] Easy to find visual-mode guide from nav
- [ ] UI package reference easy to find
- [ ] CLI reference includes `ui` command
- [ ] Cross-references work between pages

### Accuracy
- [ ] All commands match actual implementation
- [ ] Options and flags are current
- [ ] Environment variables correct
- [ ] Architecture diagrams accurate
- [ ] Filesystem mode explanation matches spec 082

### Visual Assets
- [ ] Screenshots are current and clear
- [ ] Images display at proper size
- [ ] Diagrams are readable and accurate
- [ ] All images have alt text
- [ ] Images optimized for web

### Translation
- [ ] All English content has Chinese equivalent
- [ ] Terminology consistent across translations
- [ ] Technical terms properly translated
- [ ] Navigation works in both languages
- [ ] Code examples don't need translation

### Build & Technical
- [ ] `npm run build` succeeds
- [ ] No broken links
- [ ] No missing images
- [ ] Search includes new pages
- [ ] Sitemap updated

### User Experience
- [ ] New users can discover UI feature
- [ ] Clear when to use UI vs CLI
- [ ] Troubleshooting helps solve common issues
- [ ] Examples are practical and useful
- [ ] Flow from Quick Start → Guide → Reference makes sense

## Notes

### Key Information from Spec 087

**Package Details:**
- Name: `@leanspec/ui`
- Published to npm: https://www.npmjs.com/package/@leanspec/ui
- Binary: `leanspec-ui`
- Current version: 0.2.5 (check for latest)

**CLI Command:**
- `lean-spec ui` delegates to `@leanspec/ui` in external projects
- Runs local web package in LeanSpec monorepo (dev mode)
- Auto-detects package manager (pnpm/yarn/npm)

**Filesystem Mode (Spec 082):**
- Direct reads from specs/ directory
- No database required
- 60-second cache TTL
- Changes appear within 60s
- Environment: `SPECS_MODE=filesystem`, `SPECS_DIR=/path/to/specs`

**Architecture:**
- Next.js standalone output (`output: 'standalone'`)
- `scripts/prepare-dist.mjs` copies build artifacts
- `bin/ui.js` entry point with CLI parsing
- Uses `@leanspec/core` for spec parsing

### Design Decisions

**Why separate UI documentation?**
The UI is a distinct interface with its own use cases and workflows. While CLI docs focus on command execution, UI docs need to cover:
- Visual exploration and discovery
- Interactive features (graphs, boards)
- Team collaboration scenarios
- Presentation use cases

**Why include both `lean-spec ui` and `@leanspec/ui`?**
Users may encounter either:
- `lean-spec ui` - if they have CLI installed
- `@leanspec/ui` - if they find it via npm/docs
Both should be documented as they serve slightly different audiences.

**Why emphasize filesystem mode?**
It's a key differentiator:
- No setup required
- Works immediately
- No database configuration
- Realtime updates without manual sync

### Content Priorities

**Must have:**
1. Clear explanation of what UI is and why use it
2. Getting started (both methods)
3. Feature overview with screenshots
4. Troubleshooting common issues

**Should have:**
1. Architecture details
2. Development workflows
3. Team collaboration guidance
4. Comparison with CLI

**Could have:**
1. Advanced configuration
2. Deployment options (hosting UI)
3. Performance considerations
4. Future roadmap hints

### Related Specs

- **Spec 087**: CLI UI Command (implementation reference)
- **Spec 082**: Web Realtime Sync Architecture (filesystem mode)
- **Spec 035**: Live Specs Showcase (future web app)
- **Spec 081**: Web App UX Redesign (current UI design)
- **Spec 105**: Docs Site Enhancements (related doc improvements)

### Open Questions

- [ ] Should we include video demos/GIFs in addition to screenshots?
- [ ] Should we document advanced use cases (deploy UI for team, reverse proxy, etc.)?
- [ ] Should we add a "UI vs CLI" comparison matrix?
- [ ] Should we mention future features (from spec 087: export, share, watch mode)?

### Writing Guidelines

**Tone:**
- Friendly and approachable
- Visual learners are primary audience
- Less technical than CLI reference
- More narrative than reference docs

**Structure:**
- Show, don't just tell (screenshots important)
- Progressive disclosure (simple → advanced)
- Practical examples over theory
- Troubleshooting prominent

**Terminology:**
- "UI" or "web UI" (not "GUI" or "interface")
- "Visual mode" as feature name
- "Filesystem mode" for architecture
- Consistent with CLI terminology
