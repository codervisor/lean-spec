# Development Rules

**Critical requirements** for all LeanSpec contributions. These enforce project quality and consistency.

## Mandatory Rules (Enforced by CI/Hooks)

### 1. Package Manager: pnpm Only

**ALWAYS use pnpm**, never npm or yarn.

```bash
# ✅ Correct
pnpm install
pnpm add dependency
pnpm build

# ❌ Wrong
npm install
yarn add dependency
```

**Why**: Workspace configuration, scripts, and caching all depend on pnpm.

### 2. Light/Dark Theme Support

**ALL UI components MUST support both themes.**

```typescript
// ✅ Good - Both themes
className="text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60"

// ❌ Bad - Only dark theme
className="text-blue-300 bg-blue-950/60"
```

**Pattern for all UI elements:**
- Text: `text-{color}-700 dark:text-{color}-300`
- Background: `bg-{color}-100 dark:bg-{color}-950`
- Borders: `border-{color}-400 dark:border-{color}-600`

**Why**: Breaks user experience for ~50% of users.

### 3. Internationalization (i18n)

**Update BOTH en and zh-CN locales** for all user-facing strings.

**Files to update:**
```
packages/ui/src/locales/
├── en/common.json        ← English
└── zh-CN/common.json     ← Chinese (Simplified)

packages/mcp/src/locales/
├── en/common.json
└── zh-CN/common.json

docs-site/
├── docs/                 ← English docs
└── i18n/zh-Hans/         ← Chinese docs
```

**Example:**
```json
// en/common.json
{"status": {"planned": "Planned", "in_progress": "In Progress"}}

// zh-CN/common.json  
{"status": {"planned": "计划中", "in_progress": "进行中"}}
```

**Why**: Incomplete translations break Chinese user experience.

### 4. Regression Tests Required

**All bug fixes MUST include regression tests** that:
1. Fail WITHOUT the fix
2. Pass WITH the fix
3. Use naming: `REGRESSION #ISSUE: description`

```typescript
it('REGRESSION #123: should handle empty spec titles', async () => {
  // This MUST fail on main branch before your fix
  const result = await parseSpec({ title: '' });
  expect(result.errors).toContain('Title cannot be empty');
});
```

**Add to existing E2E files:**
- Spec creation bugs → `__e2e__/spec-lifecycle.e2e.test.ts`
- Validation bugs → `__e2e__/validation.e2e.test.ts`
- Dependency bugs → `__e2e__/dependencies.e2e.test.ts`

**Why**: Prevents regressions and documents fixes as executable specs.

### 5. Rust Quality: Clippy Must Pass

**All Rust code must pass** `cargo clippy -- -D warnings`

```bash
# Check before commit
pnpm lint:rust

# Or directly
cargo clippy --manifest-path rust/Cargo.toml -- -D warnings
```

**Pre-commit hooks enforce this automatically.**

**Why**: Maintains code quality and catches common bugs.

### 6. Spec Relationships: depends_on Only

**Only `depends_on` field is supported.** The `related` field was removed.

```yaml
# ✅ Correct
depends_on:
  - 047-feature-foundation
  - 048-api-integration

# ❌ Wrong - field removed
related:
  - 047-feature-foundation
```

**Why**: `related` was ambiguous. `depends_on` expresses clear blocking relationships.

### 7. Use shadcn/ui Components (No Native HTML Form Elements)

**ALWAYS use shadcn/ui components** instead of native HTML form elements.

```typescript
// ✅ Correct - shadcn/ui components
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

<Input placeholder="Enter value" />
<Select><SelectTrigger><SelectValue /></SelectTrigger></Select>
<Button>Click me</Button>
<Checkbox />
<Textarea />

// ❌ Wrong - Native HTML elements
<input type="text" />
<select><option>...</option></select>
<button>Click me</button>
<input type="checkbox" />
<textarea />
```

**Components to use:**
| Instead of                | Use                                               |
| ------------------------- | ------------------------------------------------- |
| `<input>`                 | `<Input>` from `@/components/ui/input`            |
| `<select>`                | `<Select>` from `@/components/ui/select`          |
| `<button>`                | `<Button>` from `@/components/ui/button`          |
| `<textarea>`              | `<Textarea>` from `@/components/ui/textarea`      |
| `<input type="checkbox">` | `<Checkbox>` from `@/components/ui/checkbox`      |
| `<input type="radio">`    | `<RadioGroup>` from `@/components/ui/radio-group` |
| `<dialog>`                | `<Dialog>` from `@/components/ui/dialog`          |

**Why**: Ensures consistent styling, accessibility (ARIA), keyboard navigation, and theme support across the application.

### 8. Interactive Items Must Use cursor-pointer

**All interactive shadcn/ui items MUST use `cursor-pointer`**, not `cursor-default`.

```typescript
// ✅ Correct - cursor-pointer for interactive items
className="... cursor-pointer ..."

// ❌ Wrong - cursor-default on clickable elements
className="... cursor-default ..."
```

**Applies to:**
- `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioItem`, `DropdownMenuSubTrigger`
- `SelectItem`
- `CommandItem`

**Does NOT apply to:**
- Labels (`DropdownMenuLabel`, `SelectLabel`)
- Separators (`DropdownMenuSeparator`, `SelectSeparator`)
- Non-interactive elements (shortcuts, icons)

**Why**: Consistent visual feedback that elements are clickable improves UX. Users expect the pointer cursor on interactive items.

## Testing Rules

### What to Test

✅ **Test**: Business logic, algorithms, parsers, validators, file operations, data transformations  
❌ **Don't test**: CSS classes, icons, trivial getters, third-party libraries, presentation

### Test Types

| Type            | Purpose                   | When                            |
| --------------- | ------------------------- | ------------------------------- |
| **Unit**        | Pure function logic       | Always for core logic           |
| **Integration** | Cross-package workflows   | When multiple packages interact |
| **E2E**         | User-facing CLI workflows | For all user commands           |
| **Regression**  | Bug fixes                 | Required for every bug fix      |

### Test Pattern

```typescript
// E2E test structure
it('should create and link specs', async () => {
  await withTempDir(async (dir) => {
    // 1. Setup
    await execCLI(dir, 'init');
    
    // 2. Execute
    await execCLI(dir, 'create my-feature');
    
    // 3. Assert
    const spec = await readSpec(dir, '001-my-feature');
    expect(spec).toBeDefined();
  });
});
```

## Code Style Rules

### TypeScript

- **Explicit types** - No implicit `any`
- **Type guards** - Use for runtime checks
- **No console.log** - Remove before commit

### UI Components

- **Use `cn()` utility** for conditional classes
- **Follow shadcn/ui patterns**
- **Extract shared logic** (DRY principle)

```typescript
// ✅ Good
const className = cn(
  'text-blue-700 dark:text-blue-300',
  isActive && 'font-bold'
);

// ❌ Bad
const className = `text-blue-300 ${isActive ? 'font-bold' : ''}`;
```

### Rust

- **No `.unwrap()` in library code** - Use proper error handling
- **Descriptive names** - No abbreviations
- **Follow Rust conventions** - snake_case, etc.

```rust
// ✅ Good
fn validate_spec_frontmatter(spec: &Spec) -> Result<()> {
    let content = fs::read_to_string(&spec.path)?;
    parse_frontmatter(&content)
}

// ❌ Bad
fn validate(s: &Spec) -> Result<()> {
    let content = fs::read_to_string(&s.path).unwrap();
    parse_frontmatter(&content).unwrap()
}
```

## Git Workflow Rules

### Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

**Examples:**
```bash
feat(cli): add spec validation command
fix: handle empty spec titles (REGRESSION #456)
refactor(ui): extract shared status component
```

### Pre-Commit Validation

```bash
# Run before every commit
pnpm pre-release
```

**This runs:**
- Type checking
- All tests
- Build
- Clippy checks

**Pre-commit hooks also enforce:**
- Rust formatting (`cargo fmt`)
- Clippy validation
- No warnings allowed

## AI Tool Support

**Supported:**
- ✅ Claude Desktop (`.mcp.json`)
- ✅ GitHub Copilot
- ✅ Cursor
- ✅ Windsurf
- ✅ OpenAI Codex (`AGENTS.md`)

**Not supported:**
- ❌ Cline

## Validation Checklist

Before submitting PR:

```bash
pnpm pre-release  # Automated checks
```

**Manual checks:**
- [ ] i18n updated (both en and zh-CN)
- [ ] Light/dark theme tested
- [ ] Regression test added (if bug fix)
- [ ] No console.log or debug code
- [ ] Related specs updated

## Common Commands

**See root `package.json` for all commands.** Key ones:

```bash
pnpm install       # Setup
pnpm build         # Build all
pnpm test          # Run tests
pnpm pre-release   # Full validation
pnpm dev           # Start dev servers
```

## When in Doubt

1. **Read existing code** - Follow established patterns
2. **Check CI failures** - They tell you what's wrong
3. **Ask in PR** - Maintainers will guide you

---

**Philosophy**: Keep it lean, keep it working, keep it accessible.
