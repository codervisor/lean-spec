# Documentation Migration

**Date:** 2025-11-02

The LeanSpec documentation has been migrated from VitePress to Docusaurus.

## New Documentation Location

- **Directory:** `docs-site/`
- **Live Site:** https://lean-spec.dev (when deployed to Vercel)
- **Technology:** Docusaurus 3.9.2 + Vercel

## Old Documentation

The previous VitePress-based documentation has been removed from the repository.
If you need to access the old documentation, it's available in git history:
- Last commit with VitePress docs: Before commit 12aec67
- Use: `git checkout 791b2a5` to view the old docs

## Development Commands

```bash
# Start development server
npm run docs:dev

# Build for production
npm run docs:build

# Preview production build
npm run docs:serve
```

## Deployment

The site is configured for automatic deployment to Vercel via `vercel.json`.
