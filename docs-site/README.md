# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Installation

```bash
pnpm install
```

## Local Development

```bash
pnpm start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
pnpm build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Validation Scripts

### Validate MDX Syntax

Validates source MDX files in Chinese documentation and blog posts for syntax issues that would cause build errors:

```bash
# Validate all content (docs + blogs) - recommended
pnpm validate:mdx

# Or use the script directly with options:

# Validate only blogs
node scripts/validate-mdx-syntax.js --type blog

# Validate only docs
node scripts/validate-mdx-syntax.js --type docs

# Validate specific file
node scripts/validate-mdx-syntax.js --type docs --file guide/index.mdx

# Verbose output
node scripts/validate-mdx-syntax.js --verbose
```

**Issues detected:**
- Unescaped angle brackets `<` `>` (use `&lt;` `&gt;` or backticks)
- Unescaped curly braces `{` `}` (use `\{` `\}` or backticks)
- Bold formatting spacing in Chinese text
- Bold text with quotes needing spacing

**Fast:** Checks source files directly - no build or browser needed!

See `agents/documentation-quality-standards.md` for formatting rules.

## Deployment

Using SSH:

```bash
USE_SSH=true yarn deploy
```

Not using SSH:

```bash
GIT_USER=<Your GitHub username> yarn deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.
