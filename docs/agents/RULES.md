# Development Rules

Mandatory rules for AI agents and developers working on LeanSpec.

## AI Tool Support

**Supported AI tools for MCP/agent integration:**
- ✅ Claude Code (uses `.mcp.json` and `claude mcp add`)
- ✅ GitHub Copilot (VS Code)
- ✅ Cursor
- ✅ Windsurf
- ✅ OpenAI Codex (uses `AGENTS.md` for instructions)
- ✅ Gemini CLI

**Not supported:**
- ❌ Cline - Not officially supported; do not add Cline-specific features or configurations

## UI Development (@leanspec/ui)

### Light/Dark Theme Compatibility

**MANDATORY: All UI components must support both light and dark themes.**

| ❌ Don't | ✅ Do |
|----------|-------|
| `text-blue-300` | `text-blue-700 dark:text-blue-300` |
| `bg-blue-950/60` | `bg-blue-100 dark:bg-blue-950/60` |
| `border-white/50` | `border-gray-400 dark:border-white/50` |
| `ring-white` | `ring-gray-800 dark:ring-white` |
| `bg-[#080c14]` | `bg-gray-50 dark:bg-[#080c14]` |

**Color Guidelines:**
- Light theme: Use darker text colors (`text-blue-700`, `text-orange-600`)
- Dark theme: Use lighter text colors (`dark:text-blue-300`, `dark:text-orange-400`)
- Backgrounds: Light for light theme, dark for dark theme
- Always test in BOTH themes before committing

**Status Color Patterns:**
```typescript
// Planned - Blue
'bg-blue-500/20 text-blue-700 dark:text-blue-300'

// In Progress - Orange  
'bg-orange-500/20 text-orange-700 dark:text-orange-300'

// Complete - Green
'bg-green-500/20 text-green-700 dark:text-green-300'

// Archived - Gray
'bg-gray-500/20 text-gray-600 dark:text-gray-400'
```

## Code Style

- Use TypeScript for type safety
- Use `cn()` utility from `@/lib/utils` for conditional Tailwind classes
- Follow existing component patterns from shadcn/ui
- Run `pnpm format` before committing

## Related Documentation

- [WORKFLOWS.md](WORKFLOWS.md) - Development workflows, frontmatter management, build validation
- [COMMANDS.md](COMMANDS.md) - CLI command reference
- [PUBLISHING.md](PUBLISHING.md) - Release process
