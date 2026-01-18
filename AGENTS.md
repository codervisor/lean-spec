# AI Agent Instructions

## Project: LeanSpec

Lightweight spec methodology for AI-powered development.

## Available Skills

This project provides specialized skills for progressive discovery:

- **leanspec-sdd** - Spec-Driven Development methodology (always active in this project)
- **leanspec-development** - Development workflows, testing, and contributing
- **leanspec-publishing** - Publishing, releases, and npm distribution

See [.github/skills/](.github/skills/) for skill implementations.

## Project-Specific Rules

1. Always use `pnpm` instead of `npm` where applicable.
2. **DRY Principle** - Extract shared logic; avoid duplication.
3. **Translations**: UI/MCP/CLI changes require updates to both locales:
	- packages/ui/src/locales/en/common.json
	- packages/ui/src/locales/zh-CN/common.json
	- packages/mcp/src/locales/en/common.json
	- packages/mcp/src/locales/zh-CN/common.json
4. Docs updates should include corresponding zh-Hans translations in docs-site/i18n/zh-Hans.
