# Contributing to LeanSpec

Thanks for your interest in contributing! LeanSpec is about keeping things lean, so our contribution process is too.

## Quick Start

1. Fork the repo
2. Create a branch: `git checkout -b feat/my-feature`
3. Make your changes (see [Development Workflow](#development-workflow))
4. Run validation: `pnpm pre-release`
5. Commit: `git commit -m "feat: add feature X"`
6. Push and open a PR

> **Note**: See [SETUP.md](SETUP.md) for detailed environment setup instructions.

## Development Workflow

### 1. Install Dependencies

```bash
pnpm install
pnpm build
```

### 2. Make Changes

#### For Features
```bash
# Create or find spec
lean-spec create my-feature
lean-spec update <spec> --status in-progress

# Implement feature with tests
# ...

# Mark complete
lean-spec update <spec> --status complete
```

#### For Bug Fixes
```bash
# 1. Write regression test (must fail)
# 2. Fix bug (test now passes)
# 3. Add test to E2E suite
```

### 3. Run Development Servers

```bash
# Web UI
pnpm dev:web

# CLI (watch mode)
pnpm dev:cli

# Desktop app
pnpm dev:desktop
```

### 4. Write Tests

See [Testing Strategy](#testing-strategy) for details.

### 5. Validate Changes

```bash
# Full validation
pnpm pre-release
```

This runs:
- Version sync
- Type checking
- All tests
- Build
- Spec validation
- Rust clippy (if applicable)

## Testing Strategy

### Test Pyramid

```
         /\
        /E2E\        ← CLI scenarios, real filesystem
       /──────\
      /Integration\   ← Cross-package, MCP tools
     /──────────────\
    /    Unit Tests   \  ← Pure function logic
   /────────────────────\
```

### When to Write Which Test

| Test Type | Use When | Location | Example |
|-----------|----------|----------|---------|
| **Unit** | Testing pure functions, validators, parsers | `*.test.ts` alongside source | Parser logic, validation rules |
| **Integration** | Testing workflows with mocked deps | `integration.test.ts` | MCP tool chains |
| **E2E** | Testing user-facing CLI workflows | `__e2e__/*.e2e.test.ts` | `create → update → link` |
| **Regression** | Fixing a bug (must fail before, pass after) | Relevant `__e2e__` file | Bug reproduction |

### Writing Tests

**Unit Test Example**
```typescript
// packages/cli/src/parsers/frontmatter.test.ts
describe('parseFrontmatter', () => {
  it('should parse valid YAML frontmatter', () => {
    const content = '---\ntitle: Test\nstatus: planned\n---\n\nBody';
    const result = parseFrontmatter(content);
    
    expect(result.title).toBe('Test');
    expect(result.status).toBe('planned');
  });
});
```

**E2E Test Example**
```typescript
// packages/cli/src/__e2e__/spec-lifecycle.e2e.test.ts
import { withTempDir, execCLI } from './e2e-helpers';

it('should create and update spec', async () => {
  await withTempDir(async (dir) => {
    // Setup
    await execCLI(dir, 'init');
    
    // Execute
    await execCLI(dir, 'create my-feature --title "My Feature"');
    await execCLI(dir, 'update 001-my-feature --status in-progress');
    
    // Assert
    const spec = await readSpec(dir, '001-my-feature');
    expect(spec.status).toBe('in-progress');
  });
});
```

**Regression Test Example**
```typescript
it('REGRESSION #123: should handle empty spec titles', async () => {
  // This test MUST fail without the fix
  await withTempDir(async (dir) => {
    await execCLI(dir, 'init');
    
    // Execute - this should fail gracefully
    const result = await execCLI(dir, 'create "" --title ""');
    
    // Assert - should show error, not crash
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Title cannot be empty');
  });
});
```

### Running Tests

```bash
# All tests (watch mode)
pnpm test

# All tests (CI mode)
pnpm test:run

# Only E2E tests
pnpm test:run -- --testPathPattern="e2e"

# With coverage
pnpm test:coverage

# With UI
pnpm test:ui
```

## Internationalization (i18n)

When adding or modifying UI strings, update **BOTH** locales:

```
packages/ui/src/locales/
├── en/common.json        ← English
└── zh-CN/common.json     ← Chinese

packages/mcp/src/locales/
├── en/common.json        ← English
└── zh-CN/common.json     ← Chinese
```

**Example**:
```json
// en/common.json
{
  "status": {
    "planned": "Planned",
    "in_progress": "In Progress",
    "complete": "Complete"
  }
}

// zh-CN/common.json
{
  "status": {
    "planned": "计划中",
    "in_progress": "进行中",
    "complete": "已完成"
  }
}
```

## Code Style

### TypeScript
- Use explicit types (no implicit `any`)
- Use type guards for runtime checks
- Follow existing patterns

### UI Development
- **MANDATORY**: Support both light and dark themes
- Use `cn()` utility for conditional classes
- Follow shadcn/ui component patterns

```typescript
// ✅ Good
className={cn(
  'text-blue-700 dark:text-blue-300',
  isActive && 'font-bold'
)}

// ❌ Bad
className="text-blue-300"  // No light theme support
```

### Rust
- All code must pass `cargo clippy -- -D warnings`
- Use proper error handling (no `.unwrap()` in library code)
- Follow Rust naming conventions

### Formatting

```bash
# Format all code
pnpm format

# Includes:
# - TypeScript/JavaScript (Prettier)
# - Rust (cargo fmt)
```

## Commit Guidelines

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples
```bash
feat(cli): add spec validation command

Implements comprehensive validation for spec files including:
- Frontmatter validation
- Dependency checking
- Token counting

Closes #123

---

fix: handle empty spec titles (REGRESSION #456)

Empty titles were causing parser to crash. Added validation
to return error instead.

---

refactor(ui): extract shared status component

Moved status badge logic to shared component to avoid duplication
across board and list views.
```

## Pull Request Process

1. **Create PR** with clear description
2. **Link related specs** (if applicable)
3. **Ensure CI passes**:
   - All tests pass
   - Type checking passes
   - Build succeeds
   - Clippy checks pass (Rust)
4. **Address review feedback**
5. **Squash commits** if requested

### PR Checklist

- [ ] Tests added/updated
- [ ] i18n updated (both locales)
- [ ] Light/dark theme tested (UI changes)
- [ ] Regression test added (bug fixes)
- [ ] Documentation updated
- [ ] Related specs updated
- [ ] `pnpm pre-release` passes

## Project Philosophy

Keep changes aligned with LeanSpec first principles (see [specs/049-leanspec-first-principles](../../specs/049-leanspec-first-principles)):

1. **Context Economy** - Specs must fit in working memory (<400 lines)
2. **Signal-to-Noise Maximization** - Every word informs decisions
3. **Intent Over Implementation** - Capture why, not just how
4. **Bridge the Gap** - Both human and AI must understand
5. **Progressive Disclosure** - Add complexity when pain is felt

When in doubt: **Clarity over documentation, Essential over exhaustive, Speed over perfection**

## Areas for Contribution

### High Priority (v0.3.0+)
- Programmatic spec management tools (spec 059)
- VS Code extension (spec 017)
- GitHub Action for CI integration (spec 016)
- Copilot Chat integration (spec 034)
- Live specs showcase on docs site (spec 035)

### Currently Implemented ✅
- Core CLI commands (create, list, update, archive, search, deps)
- YAML frontmatter with validation and custom fields
- Template system with minimal/standard/enterprise presets
- Visualization tools (board, stats, timeline, gantt)
- Spec validation with complexity analysis
- MCP server for AI agent integration
- Git-based timestamp backfilling
- Comprehensive test suite with high coverage
- First principles documentation
- Relationship tracking (depends_on)

### Future Ideas (v0.4.0+)
- PM system integrations (GitHub Issues, Jira, Azure DevOps) - spec 036
- Spec coverage reports
- Additional language-specific templates
- Export to other formats (PDF, HTML dashboards)
- Automated spec compaction and transformation

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/codervisor/lean-spec/issues)
- **Discussions**: [GitHub Discussions](https://github.com/codervisor/lean-spec/discussions)
- **Docs**: [leanspec.dev](https://leanspec.dev)

## Related Documentation

- [SETUP.md](SETUP.md) - Environment setup
- [MONOREPO.md](MONOREPO.md) - Monorepo structure and version management
- [RULES.md](RULES.md) - Mandatory rules and best practices
- [RUST-QUALITY.md](RUST-QUALITY.md) - Rust quality standards
