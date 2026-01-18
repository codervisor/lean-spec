# AI Agent Instructions

## Project: LeanSpec

Lightweight spec methodology for AI-powered development.

## Project-Specific Rules

1. Always use `pnpm` instead of `npm` where applicable.
2. **DRY Principle** - Extract shared logic; avoid duplication.
3. **Translations**: UI/MCP/CLI changes require updates to both locales:
	- packages/ui/src/locales/en/common.json
	- packages/ui/src/locales/zh-CN/common.json
	- packages/mcp/src/locales/en/common.json
	- packages/mcp/src/locales/zh-CN/common.json
4. Docs updates should include corresponding zh-Hans translations in docs-site/i18n/zh-Hans.
