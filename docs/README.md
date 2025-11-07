# Documentation Moved

📚 **LeanSpec documentation has moved to the docs-site!**

All documentation previously in this `docs/` folder has been migrated to the comprehensive documentation site at [https://lean-spec.dev](https://lean-spec.dev).

## What Changed?

- ✅ **MCP Server Guide** → [Reference: MCP Server](https://lean-spec.dev/docs/reference/mcp-server)
- ✅ **Migration Guide** → [Guide: Migration](https://lean-spec.dev/docs/guide/migration)
- ✅ **Custom Fields Examples** → [Guide: Custom Fields](https://lean-spec.dev/docs/guide/custom-fields)

## Why the Change?

We consolidated all documentation into a single source of truth:

1. **Better discoverability** - All docs in one place
2. **Integrated navigation** - Easier to find related content
3. **Consistent format** - Uniform documentation experience
4. **Easier maintenance** - Single location to update

## Accessing Documentation

Visit the comprehensive documentation site:

**🌐 [https://lean-spec.dev](https://lean-spec.dev)**

Or run locally:

```bash
cd docs-site
npm install
npm start
```

## For Contributors

When adding or updating documentation:

1. Edit files in `docs-site/docs/`
2. Test locally with `npm start` in `docs-site/`
3. Build to verify: `npm run build` in `docs-site/`

---

**Note**: This `docs/` folder is kept for backwards compatibility but is no longer actively maintained. Please use the docs-site for all documentation needs.
