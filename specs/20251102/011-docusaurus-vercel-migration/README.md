---
status: complete
created: 2025-11-02
tags: [documentation, migration, docusaurus, vercel]
priority: high
---

# Documentation Migration: Docusaurus + Vercel

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-02 · **Tags**: documentation, migration, docusaurus, vercel

## Overview

Migrate the LeanSpec documentation site from VitePress + GitHub Pages to Docusaurus + Vercel. While the current VitePress setup works, Docusaurus offers better documentation features, plugin ecosystem, and Vercel provides superior deployment experience with preview deployments and analytics.

**Why Migrate:**
- **Better DX**: Docusaurus has richer documentation-specific features (versioning, i18n, plugin system)
- **Preview Deployments**: Vercel automatically creates preview deployments for PRs
- **Better Analytics**: Vercel Web Analytics and Speed Insights built-in
- **Community**: Larger documentation community (React, Jest, Redwood, etc. use it)
- **Future-Ready**: Easier to add interactive features, versioning, and multi-language support
- **Build Performance**: Faster builds and better caching on Vercel

**What Success Looks Like:**
- All existing documentation content migrated without loss
- Live on Vercel with custom domain support
- Preview deployments working for PRs
- Better performance metrics than current site
- Enhanced search functionality
- Modern React-based UI with better UX

## Design

### Technology Stack

**Docusaurus 3.0+**
- Meta's documentation framework
- React-based with MDX support
- Built-in versioning and i18n
- Powerful plugin system
- Better sidebar and navigation control
- Native blog support (for changelogs, announcements)

**Vercel Hosting**
- Automatic deployments from GitHub
- Preview deployments for every PR
- Edge network for fast global delivery
- Built-in analytics and performance monitoring
- Environment variables for configuration
- Zero-config TypeScript support

### Site Structure

```
docs-site/                    # New root for Docusaurus
├── docs/                     # Documentation content
│   ├── guide/
│   │   ├── index.md
│   │   ├── getting-started.md
│   │   ├── quick-start.md
│   │   ├── philosophy.md
│   │   ├── principles.md
│   │   ├── when-to-use.md
│   │   ├── templates.md
│   │   ├── frontmatter.md
│   │   ├── custom-fields.md
│   │   └── variables.md
│   ├── reference/
│   │   ├── cli.md
│   │   ├── config.md
│   │   └── frontmatter.md
│   ├── ai-integration/
│   │   ├── index.md
│   │   ├── setup.md
│   │   ├── agents-md.md
│   │   ├── best-practices.md
│   │   └── examples.md
│   └── contributing.md
├── blog/                     # Optional: for announcements
│   └── 2025-11-02-v0.1.0.md
├── src/
│   ├── components/          # Custom React components
│   ├── css/                 # Custom styles
│   └── pages/               # Custom pages (landing, etc.)
├── static/                  # Static assets
│   ├── img/
│   └── favicon.ico
├── docusaurus.config.ts     # Main config
├── sidebars.ts              # Sidebar configuration
├── package.json
└── tsconfig.json
```

### Migration Mapping

| VitePress Location | Docusaurus Location | Notes |
|-------------------|---------------------|-------|
| `docs/index.md` | `docs-site/src/pages/index.tsx` | Custom React landing page |
| `docs/guide/*.md` | `docs-site/docs/guide/*.md` | Direct copy with frontmatter updates |
| `docs/reference/*.md` | `docs-site/docs/reference/*.md` | Direct copy |
| `docs/ai-integration/*.md` | `docs-site/docs/ai-integration/*.md` | Direct copy |
| `docs/.vitepress/config.ts` | `docs-site/docusaurus.config.ts` | Rewrite configuration |
| `docs/public/*` | `docs-site/static/*` | Move static assets |

### Configuration Strategy

**docusaurus.config.ts** - Main configuration:
```typescript
import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';

const config: Config = {
  title: 'LeanSpec',
  tagline: 'Lightweight spec methodology for AI-powered development',
  favicon: 'img/favicon.ico',
  
  url: 'https://lean-spec.dev', // Custom domain
  baseUrl: '/',
  
  organizationName: 'codervisor',
  projectName: 'lean-spec',
  
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/codervisor/lean-spec/tree/main/docs-site/',
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/codervisor/lean-spec/tree/main/docs-site/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      },
    ],
  ],
  
  themeConfig: {
    navbar: {
      title: 'LeanSpec',
      logo: {
        alt: 'LeanSpec Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'guideSidebar',
          position: 'left',
          label: 'Guide',
        },
        {
          type: 'docSidebar',
          sidebarId: 'referenceSidebar',
          position: 'left',
          label: 'Reference',
        },
        {
          type: 'docSidebar',
          sidebarId: 'aiSidebar',
          position: 'left',
          label: 'AI Integration',
        },
        {to: '/blog', label: 'Blog', position: 'left'},
        {
          href: 'https://github.com/codervisor/lean-spec',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {label: 'Getting Started', to: '/docs/guide'},
            {label: 'CLI Reference', to: '/docs/reference/cli'},
            {label: 'AI Integration', to: '/docs/ai-integration'},
          ],
        },
        {
          title: 'Community',
          items: [
            {label: 'GitHub', href: 'https://github.com/codervisor/lean-spec'},
            {label: 'Issues', href: 'https://github.com/codervisor/lean-spec/issues'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} codervisor. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
    algolia: {
      // Algolia DocSearch (better than local search)
      appId: 'YOUR_APP_ID',
      apiKey: 'YOUR_SEARCH_API_KEY',
      indexName: 'lean-spec',
    },
  },
};

export default config;
```

### Vercel Configuration

**vercel.json**:
```json
{
  "buildCommand": "cd docs-site && npm run build",
  "outputDirectory": "docs-site/build",
  "framework": "docusaurus",
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

**Environment Variables** (in Vercel Dashboard):
- `NODE_VERSION`: 18
- `DOCUSAURUS_URL`: https://lean-spec.dev
- `ALGOLIA_APP_ID`: (for search)
- `ALGOLIA_API_KEY`: (for search)

## Plan

### Phase 1: Setup & Configuration (Day 1)
- [ ] Create new `docs-site/` directory in repository root
- [ ] Initialize Docusaurus with TypeScript: `npx create-docusaurus@latest docs-site classic --typescript`
- [ ] Configure `docusaurus.config.ts` with LeanSpec branding
- [ ] Set up sidebar structure in `sidebars.ts`
- [ ] Configure Vercel project and link to GitHub repository
- [ ] Set up Vercel environment variables
- [ ] Configure custom domain (if ready) or use vercel.app subdomain

### Phase 2: Content Migration (Day 1-2)
- [ ] Migrate homepage to custom React page (`src/pages/index.tsx`)
- [ ] Copy and adapt all guide documentation
- [ ] Copy and adapt reference documentation
- [ ] Copy and adapt AI integration documentation
- [ ] Update frontmatter format to Docusaurus standard
- [ ] Migrate static assets (images, logos) to `static/`
- [ ] Update all internal links to new structure
- [ ] Create initial blog post announcing v0.1.0

### Phase 3: Enhancement (Day 2)
- [ ] Design custom landing page with hero section
- [ ] Add code block enhancements (copy button, line highlighting)
- [ ] Configure Algolia DocSearch or local search plugin
- [ ] Add custom React components for features showcase
- [ ] Set up analytics (Vercel Analytics)
- [ ] Configure SEO metadata
- [ ] Add social preview images

### Phase 4: Testing & Deployment (Day 2-3)
- [ ] Test build locally: `npm run build && npm run serve`
- [ ] Verify all links work
- [ ] Test responsive design on mobile/tablet
- [ ] Push to GitHub and verify Vercel auto-deployment
- [ ] Test preview deployment on feature branch
- [ ] Configure custom domain DNS (if applicable)
- [ ] Verify search functionality

### Phase 5: Cleanup & Documentation (Day 3)
- [ ] Archive old VitePress setup:
  - [ ] Move `docs/` to `docs-old/` or delete
  - [ ] Remove `.github/workflows/docs.yml`
  - [ ] Remove VitePress dependencies from `package.json`
  - [ ] Update root `package.json` scripts
- [ ] Update main `README.md` with new docs URL
- [ ] Update `CONTRIBUTING.md` with Docusaurus docs contribution guide
- [ ] Create `.github/workflows/docs-preview.yml` for preview comments
- [ ] Mark spec as complete

## Technical Details

### Frontmatter Migration

**VitePress format:**
```yaml
---
title: Getting Started
description: Start using LeanSpec
---
```

**Docusaurus format:**
```yaml
---
id: getting-started
title: Getting Started
sidebar_label: Getting Started
description: Start using LeanSpec
sidebar_position: 1
---
```

### Sidebar Configuration

**sidebars.ts** example:
```typescript
import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  guideSidebar: [
    {
      type: 'category',
      label: 'Introduction',
      items: ['guide/index', 'guide/getting-started', 'guide/quick-start'],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      items: ['guide/philosophy', 'guide/principles', 'guide/when-to-use'],
    },
    {
      type: 'category',
      label: 'Features',
      items: ['guide/templates', 'guide/frontmatter', 'guide/custom-fields', 'guide/variables'],
    },
  ],
  referenceSidebar: [
    'reference/cli',
    'reference/config',
    'reference/frontmatter',
  ],
  aiSidebar: [
    'ai-integration/index',
    'ai-integration/setup',
    'ai-integration/agents-md',
    'ai-integration/best-practices',
    'ai-integration/examples',
  ],
};

export default sidebars;
```

### Custom Landing Page

Create a React-based hero section in `src/pages/index.tsx`:
```typescript
import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/guide">
            Get Started →
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - ${siteConfig.tagline}`}
      description="Lightweight spec methodology for AI-powered development">
      <HomepageHeader />
      <main>{/* Feature sections */}</main>
    </Layout>
  );
}
```

### Vercel Deployment

1. **Connect GitHub Repository** to Vercel
2. **Configure Project**:
   - Framework Preset: Docusaurus
   - Root Directory: `docs-site`
   - Build Command: `npm run build`
   - Output Directory: `build`
3. **Enable Preview Deployments** for all branches
4. **Configure Domain**:
   - Add custom domain: `lean-spec.dev`
   - Vercel handles SSL automatically

### Enhanced Features

**Algolia DocSearch** (better than local search):
- Submit site to [Algolia DocSearch](https://docsearch.algolia.com/)
- Free for open source projects
- Provides instant search with autocomplete

**Vercel Analytics**:
```typescript
// docusaurus.config.ts
scripts: [
  {
    src: 'https://cdn.vercel-insights.com/v1/script.debug.js',
    defer: true,
  },
],
```

**MDX Components** - Add interactive examples:
```typescript
// src/components/SpecExample.tsx
export function SpecExample({ title, children }) {
  return (
    <div className="spec-example">
      <h4>{title}</h4>
      {children}
    </div>
  );
}
```

## Test

### Migration Verification
- [ ] All existing documentation pages accessible
- [ ] No broken links (internal or external)
- [ ] Search functionality works correctly
- [ ] Mobile responsive design verified
- [ ] Code blocks render correctly with syntax highlighting
- [ ] Navigation (sidebar, navbar) works as expected

### Performance Metrics
- [ ] Lighthouse score > 90 for all categories
- [ ] Time to Interactive < 2s
- [ ] First Contentful Paint < 1s
- [ ] Build time < 2 minutes

### Deployment Verification
- [ ] Production deployment successful on Vercel
- [ ] Preview deployments work for PRs
- [ ] Custom domain resolves correctly (if configured)
- [ ] SSL certificate active
- [ ] Analytics tracking works

### User Experience
- [ ] Documentation is easier to navigate than VitePress version
- [ ] Search returns relevant results
- [ ] Code examples are easy to copy
- [ ] Dark mode toggle works
- [ ] Edit on GitHub links work

## Benefits Over VitePress

### Feature Comparison

| Feature | VitePress | Docusaurus |
|---------|-----------|------------|
| **Search** | Local only | Algolia DocSearch |
| **Versioning** | Manual | Built-in |
| **Blog** | Not included | Built-in |
| **i18n** | Basic | Full support |
| **Plugins** | Limited | Rich ecosystem |
| **MDX** | Limited | Full React components |
| **Analytics** | Manual setup | Vercel built-in |
| **Preview Deploys** | No (GitHub Pages) | Yes (Vercel) |
| **Build Speed** | Fast | Fast + better caching |
| **Community** | Growing | Large & mature |

### Why Docusaurus Wins for LeanSpec

1. **Better for Tool Documentation**: Designed for developer tools (like ours)
2. **Plugin Ecosystem**: Can add diagram support, OpenAPI specs, etc.
3. **React Components**: Can build interactive spec examples
4. **Versioning Ready**: When we hit v1.0, v2.0, etc.
5. **Proven at Scale**: Used by Meta, Jest, React Native, Redwood
6. **Better Search**: Algolia integration is superior
7. **Vercel DX**: Preview deployments are game-changing for docs PRs

## Non-Goals

- **Versioned Docs**: Not implementing versioning initially (add later when needed)
- **Internationalization**: English only for v0.1.0
- **Custom Theme**: Use default Docusaurus theme with minor customizations
- **Complex Plugins**: Start simple, add plugins as needed
- **Multiple Domains**: Single domain deployment initially

## Success Metrics

- [ ] Migration completed within 3 days
- [ ] Zero content loss from VitePress version
- [ ] Lighthouse performance score > 90
- [ ] Preview deployments working for all PRs
- [ ] Vercel deployment time < 2 minutes
- [ ] All internal links verified working
- [ ] Search functionality superior to VitePress local search

## Open Questions

- [ ] **Custom Domain**: Use `lean-spec.dev` (primary) or add `www.lean-spec.dev` redirect?
  - **Decision**: Use `lean-spec.dev` as primary, configure `www` redirect in Vercel
- [ ] **Keep Old Docs**: Archive `docs/` or delete entirely?
  - **Recommendation**: Move to `docs-old/` temporarily, delete after 1 month
- [ ] **Blog Usage**: Use blog for changelogs or keep CHANGELOG.md?
  - **Recommendation**: Keep CHANGELOG.md, use blog for announcements/tutorials
- [ ] **Algolia DocSearch**: Apply immediately or wait?
  - **Recommendation**: Apply immediately (free for OSS, takes 1-2 weeks approval)

## References

- [Docusaurus Documentation](https://docusaurus.io/)
- [Vercel Documentation](https://vercel.com/docs)
- [Algolia DocSearch](https://docsearch.algolia.com/)
- [Docusaurus Migration Guide](https://docusaurus.io/docs/migration/v2)
- [Example: Jest Docs](https://jestjs.io/) - Great Docusaurus example
- [Example: Redwood Docs](https://redwoodjs.com/) - Another excellent example

---

## Implementation Notes

**Completed:** 2025-11-02

### What Was Done

1. **Setup Phase**
   - Initialized Docusaurus 3.9.2 with TypeScript in `docs-site/` directory
   - Configured `docusaurus.config.ts` with LeanSpec branding, URL (lean-spec.dev), and navigation
   - Set up three sidebars: Guide, Reference, and AI Integration
   - Created `vercel.json` for Vercel deployment configuration

2. **Content Migration**
   - Migrated all documentation from VitePress to Docusaurus:
     - Guide: 11 documents (overview, getting started, philosophy, etc.)
     - Reference: 3 documents (CLI, config, frontmatter)
     - AI Integration: 5 documents (setup, best practices, etc.)
   - Added Docusaurus-compatible frontmatter to all documents (id, title, sidebar_position)
   - Fixed internal links to use `/docs/` prefix for Docusaurus routing
   - Escaped curly braces in variables.md to prevent MDX parsing errors
   - Copied static assets (logo.svg) to `docs-site/static/img/`
   - Created welcome blog post

3. **Configuration Changes**
   - Updated root `package.json`:
     - Changed docs scripts to point to Docusaurus
     - Updated homepage URL to `lean-spec.dev`
     - Removed VitePress dependency
   - Updated `README.md` with new documentation URL
   - Updated `.gitignore` to exclude Docusaurus build artifacts

4. **Cleanup**
   - Archived old VitePress docs to `docs-vitepress-old/`
   - Removed `.github/workflows/docs.yml` (GitHub Pages deployment)
   - Added archive notice to old docs directory

5. **Verification**
   - Build tested successfully: `npm run build` in docs-site
   - Local preview verified: `npm run serve` in docs-site
   - All internal links validated
   - No broken links or build errors

### Next Steps for Deployment

The Docusaurus site is ready for Vercel deployment:

1. **Connect Repository to Vercel:**
   - Import the `codervisor/lean-spec` repository
   - Framework Preset: Docusaurus
   - Root Directory: `docs-site`
   - Build Command: `npm run build`
   - Output Directory: `build`

2. **Configure Custom Domain:**
   - Add `lean-spec.dev` in Vercel project settings
   - Update DNS records as instructed by Vercel
   - Vercel will automatically provision SSL certificate

3. **Optional Enhancements (Future):**
   - Apply for Algolia DocSearch (better search than local)
   - Enable Vercel Analytics
   - Add versioning when needed
   - Internationalization if required

### Files Changed

- Created: `docs-site/` (full Docusaurus project)
- Created: `vercel.json` (Vercel configuration)
- Modified: `package.json` (updated docs scripts, homepage, removed VitePress)
- Modified: `README.md` (updated docs URL)
- Modified: `.gitignore` (updated for Docusaurus)
- Renamed: `docs/` → `docs-vitepress-old/` (archived)
- Removed: `.github/workflows/docs.yml` (GitHub Pages workflow)
