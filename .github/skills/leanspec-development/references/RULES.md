# Development Rules

Mandatory rules and best practices for AI agents and developers working on LeanSpec.

## Mandatory Rules

### 1. Package Manager
**ALWAYS use pnpm**, never npm or yarn.

```bash
# ✅ Correct
pnpm install
pnpm add vite
pnpm build

# ❌ Wrong
npm install
npm i vite
yarn add vite
```

### 2. Spec Relationships
**Only `depends_on` is supported.** The `related` field has been removed.

```yaml
# ✅ Correct
depends_on:
  - 047-feature-foundation
  - 048-api-integration

# ❌ Wrong - removed field
related:
  - 047-feature-foundation
```

**Rationale**: `related` was ambiguous. `depends_on` expresses clear blocking relationships.

### 3. Light/Dark Theme (UI)
**ALL UI components MUST support both themes.**

| ❌ Don't | ✅ Do |
|----------|-------|
| `text-blue-300` | `text-blue-700 dark:text-blue-300` |
| `bg-blue-950/60` | `bg-blue-100 dark:bg-blue-950/60` |
| `border-white/50` | `border-gray-400 dark:border-white/50` |
| `ring-white` | `ring-gray-800 dark:ring-white` |
| `bg-[#080c14]` | `bg-gray-50 dark:bg-[#080c14]` |

**Testing**: Always test in BOTH themes before committing.

### 4. Rust Quality
**All Rust code MUST pass `cargo clippy -- -D warnings`**

```bash
# Before committing Rust changes
make rust-clippy

# Or
pnpm lint:rust
```

Pre-commit hooks enforce this automatically.

### 5. Internationalization
**Update BOTH locales** when changing UI strings:

```
packages/ui/src/locales/
├── en/common.json        ← Update this
└── zh-CN/common.json     ← AND this

packages/mcp/src/locales/
├── en/common.json        ← Update this
└── zh-CN/common.json     ← AND this

docs-site/
├── docs/                 ← Update this
└── i18n/zh-Hans/         ← AND this
```

### 6. Regression Tests
**Bug fixes MUST include regression tests** that:
1. Fail WITHOUT the fix
2. Pass WITH the fix
3. Are named `REGRESSION #ISSUE: description`

```typescript
// ✅ Correct pattern
it('REGRESSION #123: should handle empty spec titles', async () => {
  // This test must fail on main branch
  const result = await parseSpec({ title: '' });
  expect(result.errors).toHaveLength(1);
});
```

## Best Practices

### TypeScript

**Type Safety**
```typescript
// ✅ Do - Explicit types
function parseSpec(content: string): ParsedSpec {
  // ...
}

// ❌ Don't - Implicit any
function parseSpec(content) {
  // ...
}
```

**Use Type Guards**
```typescript
// ✅ Do
if (typeof value === 'string' && value.length > 0) {
  return value.trim();
}

// ❌ Don't
if (value) {
  return value.trim(); // Unsafe
}
```

### UI Components

**Use cn() for Conditional Classes**
```typescript
import { cn } from '@/lib/utils';

// ✅ Do
const className = cn(
  'base-class',
  isActive && 'active-class',
  variant === 'primary' && 'primary-class'
);

// ❌ Don't
const className = `base-class ${isActive ? 'active-class' : ''} ${variant === 'primary' ? 'primary-class' : ''}`;
```

**Status Color Patterns**
```typescript
const STATUS_COLORS = {
  planned: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  'in-progress': 'bg-orange-500/20 text-orange-700 dark:text-orange-300',
  complete: 'bg-green-500/20 text-green-700 dark:text-green-300',
  archived: 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
};
```

**Follow shadcn/ui Patterns**
- Use existing components from `ui-components`
- Follow composition patterns
- Extract reusable variants

### Testing

**Focus on What Matters**
```typescript
// ✅ Test - Business logic
it('should parse frontmatter correctly', () => {
  const result = parseFrontmatter('---\ntitle: Test\n---');
  expect(result.title).toBe('Test');
});

// ❌ Don't test - UI implementation
it('should have blue text', () => {
  render(<Status status="planned" />);
  expect(screen.getByText('Planned')).toHaveClass('text-blue-700');
});
```

**E2E Test Structure**
```typescript
import { withTempDir, execCLI } from './e2e-helpers';

it('should create and link specs', async () => {
  await withTempDir(async (dir) => {
    // 1. Setup
    await execCLI(dir, 'init');
    await execCLI(dir, 'create base-feature');
    
    // 2. Execute
    await execCLI(dir, 'create dependent-feature --depends-on 001-base-feature');
    
    // 3. Assert
    const spec = await readSpec(dir, '002-dependent-feature');
    expect(spec.depends_on).toContain('001-base-feature');
  });
});
```

### Rust Development

**Error Handling**
```rust
// ✅ Do - Proper error propagation
fn read_spec(path: &Path) -> Result<Spec> {
    let content = fs::read_to_string(path)?;
    parse_spec(&content)
}

// ❌ Don't - Unwrap in library code
fn read_spec(path: &Path) -> Spec {
    let content = fs::read_to_string(path).unwrap();
    parse_spec(&content).unwrap()
}
```

**Use Descriptive Names**
```rust
// ✅ Do
fn validate_spec_frontmatter(spec: &Spec) -> ValidationResult {
    // ...
}

// ❌ Don't
fn validate(s: &Spec) -> VR {
    // ...
}
```

### Code Organization

**DRY Principle**
```typescript
// ✅ Do - Extract shared logic
function formatSpecStatus(status: Status): string {
  return status.replace('-', ' ').toUpperCase();
}

// Use in multiple places
const display1 = formatSpecStatus(spec1.status);
const display2 = formatSpecStatus(spec2.status);

// ❌ Don't - Duplicate logic
const display1 = spec1.status.replace('-', ' ').toUpperCase();
const display2 = spec2.status.replace('-', ' ').toUpperCase();
```

**File Organization**
```
packages/ui/src/
├── components/       # Reusable UI components
├── features/         # Feature-specific code
├── lib/              # Utilities and helpers
├── hooks/            # Custom React hooks
└── types/            # TypeScript types
```

### Git Workflow

**Commit Messages**
```bash
# ✅ Good
feat: add spec validation command
fix: handle empty spec titles (REGRESSION #123)
refactor: extract shared validation logic
docs: update contribution guidelines

# ❌ Bad
Update code
Fix bug
Changes
```

**Branch Names**
```bash
# ✅ Good
feat/spec-validation
fix/empty-titles-123
refactor/shared-validation

# ❌ Bad
my-feature
fix
test
```

## AI Tool Support

**Supported AI tools for MCP/agent integration:**
- ✅ Claude Desktop (uses `.mcp.json`)
- ✅ GitHub Copilot (VS Code)
- ✅ Cursor
- ✅ Windsurf
- ✅ OpenAI Codex (uses `AGENTS.md`)
- ✅ Gemini CLI

**Not supported:**
- ❌ Cline - No Cline-specific features or configurations

## Pre-Commit Checklist

Before every commit:

```bash
# 1. Format code
pnpm format

# 2. Type check
pnpm typecheck

# 3. Run tests
pnpm test:run

# 4. Lint Rust (if applicable)
make rust-clippy

# Or run everything:
pnpm pre-release
```

Manual checks:
- [ ] i18n updated (both locales)
- [ ] Light/dark theme tested
- [ ] Regression test added (if bug fix)
- [ ] Types are explicit (no implicit `any`)
- [ ] No console.log left in code

## Related Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md) - Full contribution guide
- [SETUP.md](SETUP.md) - Environment setup
- [MONOREPO.md](MONOREPO.md) - Monorepo structure
- [RUST-QUALITY.md](RUST-QUALITY.md) - Rust quality standards
