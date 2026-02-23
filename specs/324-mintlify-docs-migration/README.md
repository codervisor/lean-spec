---
status: planned
created: 2026-02-22
priority: medium
tags:
- documentation
- migration
- mintlify
- docs-site
created_at: 2026-02-22T10:33:47.447400330Z
updated_at: 2026-02-22T10:33:47.447400330Z
---

# Migrate LeanSpec Docs Site from Docusaurus to Mintlify

## Overview

The LeanSpec documentation site (`codervisor/lean-spec-docs`) currently runs on Docusaurus 3 deployed to Vercel. Mintlify is a modern AI-native documentation platform that offers a significantly better developer and reader experience—especially fitting for an AI-centric tool like LeanSpec.

**Why Migrate to Mintlify:**
- **AI-Native**: Built-in AI chat assistant (`/ai-chat`) trained on your docs—perfect for an AI orchestration platform
- **Zero-Config Hosting**: Mintlify hosts the docs directly from GitHub (no Vercel config, no build pipelines)
- **Better DX**: Single `mint.json` config replaces `docusaurus.config.ts`, `sidebars.ts`, and `vercel.json`
- **Built-in Search**: High-quality search without Algolia setup
- **Modern UI**: Clean, polished design with dark mode, tabs, callouts, and card groups out of the box
- **MDX Compatible**: Existing `.mdx` content migrates with minimal changes
- **Free for OSS**: Free tier covers open-source projects
- **Faster Iteration**: Changes deploy in seconds via the GitHub App

**Current State:** Docusaurus 3.x on Vercel, `codervisor/lean-spec-docs` repository, live at `www.lean-spec.dev`

**Success Criteria:**
- All existing documentation content migrated without loss
- Site live on Mintlify with custom domain `www.lean-spec.dev`
- AI chat assistant enabled and working
- Build and deployment fully automated via GitHub App

## Design

### Technology Stack Comparison

| Aspect | Docusaurus (current) | Mintlify (target) |
|--------|---------------------|-------------------|
| **Config** | `docusaurus.config.ts` + `sidebars.ts` | Single `mint.json` |
| **Hosting** | Vercel (manual setup) | Mintlify GitHub App (zero-config) |
| **Search** | Local / Algolia | Built-in, instant |
| **AI Assistant** | ❌ | ✅ Built-in |
| **Components** | React + Docusaurus components | MDX + Mintlify components |
| **Deploy time** | ~2 min (Vercel build) | ~10 sec |
| **Analytics** | Vercel Analytics | Mintlify Analytics |
| **Dark mode** | ✅ | ✅ |
| **i18n** | Plugin-based | Built-in (beta) |

### Mintlify Configuration (`mint.json`)

```json
{
  "$schema": "https://mintlify.com/schema.json",
  "name": "LeanSpec",
  "logo": {
    "light": "/img/logo.svg",
    "dark": "/img/logo.svg"
  },
  "favicon": "/img/favicon.ico",
  "colors": {
    "primary": "#0069ED",
    "light": "#4D9CFF",
    "dark": "#0050B4"
  },
  "topbarLinks": [
    { "name": "GitHub", "url": "https://github.com/codervisor/lean-spec" }
  ],
  "topbarCtaButton": {
    "name": "Get Started",
    "url": "/guide/getting-started"
  },
  "anchors": [
    { "name": "GitHub", "icon": "github", "url": "https://github.com/codervisor/lean-spec" }
  ],
  "navigation": [
    {
      "group": "Guide",
      "pages": ["guide/index", "guide/getting-started", "guide/philosophy"]
    },
    {
      "group": "Reference",
      "pages": ["reference/cli", "reference/config", "reference/frontmatter"]
    },
    {
      "group": "AI Integration",
      "pages": ["ai-integration/index", "ai-integration/setup", "ai-integration/best-practices"]
    }
  ],
  "footerSocials": {
    "github": "https://github.com/codervisor/lean-spec"
  }
}
```

### File Structure Changes

```
lean-spec-docs/          (codervisor/lean-spec-docs repo)
├── mint.json            # NEW: Replaces docusaurus.config.ts + sidebars.ts
├── guide/               # Docs moved from docs/guide/ → guide/
│   ├── index.mdx
│   ├── getting-started.mdx
│   ├── philosophy.mdx
│   └── ...
├── reference/           # Docs moved from docs/reference/ → reference/
│   ├── cli.mdx
│   ├── config.mdx
│   └── frontmatter.mdx
├── ai-integration/      # Docs moved from docs/ai-integration/ → ai-integration/
│   ├── index.mdx
│   ├── setup.mdx
│   └── ...
├── img/                 # Static assets (was static/img/)
│   ├── logo.svg
│   └── favicon.ico
└── REMOVE:
    ├── docusaurus.config.ts
    ├── sidebars.ts
    ├── babel.config.js
    ├── src/             # Docusaurus React pages/components
    └── package.json     # (no longer needed for Mintlify-hosted)
```

### Content Conversion

**Docusaurus frontmatter → Mintlify frontmatter:**

```yaml
# Before (Docusaurus)
---
id: getting-started
title: Getting Started
sidebar_label: Getting Started
sidebar_position: 1
description: Start using LeanSpec
---

# After (Mintlify)
---
title: "Getting Started"
description: "Start using LeanSpec"
---
```

**Component mapping:**

| Docusaurus | Mintlify |
|-----------|---------|
| `:::note` admonitions | `<Note>`, `<Warning>`, `<Tip>`, `<Info>` |
| `<Tabs>` / `<TabItem>` | `<Tabs>` / `<Tab>` |
| Code blocks | Unchanged (standard markdown) |
| `<details>` | `<Accordion>` |
| Card grids | `<CardGroup>` / `<Card>` |

### Deployment Setup

1. Install [Mintlify GitHub App](https://github.com/apps/mintlify) on `codervisor/lean-spec-docs`
2. Create account at [mintlify.com](https://mintlify.com) and connect repository
3. Configure custom domain `www.lean-spec.dev` in Mintlify dashboard
4. Remove Vercel project for `lean-spec-docs`
5. Update DNS if needed (Mintlify provides CNAME target)

## Plan

### Phase 1: Setup & Config
- [ ] Create Mintlify account and connect `codervisor/lean-spec-docs` repository
- [ ] Install Mintlify GitHub App on `codervisor/lean-spec-docs`
- [ ] Create `mint.json` with branding, navigation, and color config
- [ ] Preview the default Mintlify build (no content changes yet)

### Phase 2: Content Migration
- [ ] Move doc files from `docs/guide/` → `guide/`, `docs/reference/` → `reference/`, `docs/ai-integration/` → `ai-integration/`
- [ ] Move static assets from `static/img/` → `img/`
- [ ] Update frontmatter: remove `id`, `sidebar_label`, `sidebar_position` fields
- [ ] Replace Docusaurus-specific admonitions with Mintlify components (`<Note>`, `<Warning>`, `<Tip>`)
- [ ] Replace `<Tabs>`/`<TabItem>` with Mintlify `<Tabs>`/`<Tab>`
- [ ] Update any `<details>` blocks to `<Accordion>` components
- [ ] Fix internal links to use new flat paths (no `/docs/` prefix)
- [ ] Update `mint.json` navigation to reference all pages

### Phase 3: Remove Docusaurus
- [ ] Delete `docusaurus.config.ts`, `sidebars.ts`, `babel.config.js`
- [ ] Delete `src/` directory (custom React pages/components)
- [ ] Remove Docusaurus dependencies from `package.json` (or remove `package.json` if only used for Docusaurus)
- [ ] Delete `vercel.json`
- [ ] Update `.gitignore` to remove Docusaurus build artifacts

### Phase 4: Deployment & Domain
- [ ] Verify Mintlify build succeeds via GitHub App
- [ ] Configure custom domain `www.lean-spec.dev` in Mintlify dashboard
- [ ] Verify DNS/CNAME resolves correctly
- [ ] Remove Vercel project for docs (after verifying Mintlify is live)
- [ ] Enable Mintlify AI assistant for the docs site

### Phase 5: Quality Check
- [ ] Verify all pages render correctly
- [ ] Verify navigation and sidebar structure matches current site
- [ ] Verify internal links work
- [ ] Verify search works on all pages
- [ ] Test AI assistant is trained on content
- [ ] Update `README.md` in `lean-spec-docs` with Mintlify contribution instructions

## Test

- [ ] All existing documentation pages accessible at new URLs
- [ ] No broken internal links
- [ ] Custom domain `www.lean-spec.dev` resolves to Mintlify
- [ ] Search returns relevant results
- [ ] AI assistant answers questions about LeanSpec
- [ ] Dark mode toggles correctly
- [ ] Mobile layout renders correctly
- [ ] Code blocks render with correct syntax highlighting
- [ ] Admonitions (`<Note>`, `<Warning>`, etc.) render correctly

## Notes

### Why Now
Mintlify has become the standard for AI-native developer tool documentation (used by Anthropic, Cursor, Linear, etc.). Given LeanSpec's positioning as an AI orchestration platform, having docs on Mintlify signals alignment with the AI-native ecosystem.

### Alternatives Considered
- **Keep Docusaurus**: Works fine but lacks AI assistant, slower deploys, more configuration overhead
- **GitBook**: Good but less developer-friendly than Mintlify; fewer MDX components
- **Nextra**: Next.js based, still requires own hosting

### Migration Risk
Low risk—Mintlify uses standard MDX files. All content is preserved; only configuration and component syntax changes. Rollback is trivial (just restore Docusaurus config + re-enable Vercel).

### Related Specs
- **021-docusaurus-vercel-migration**: Original migration from VitePress → Docusaurus
- **092-docs-site-submodule-migration**: Moved docs to separate `lean-spec-docs` repo
- **278-docs-site-orchestration-pivot**: Planned docs content updates (compatible with this migration)

### References
- [Mintlify Documentation](https://mintlify.com/docs)
- [Mintlify GitHub App](https://github.com/apps/mintlify)
- [Mintlify Migration Guide](https://mintlify.com/docs/migration)
- [mint.json Schema](https://mintlify.com/schema.json)
