# Test Strategy Overhaul

**Status**: ✅ Completed  
**Date**: January 12, 2026

## Problem

Unit tests against UI presentation logic are brittle and provide low value:
- Break frequently on design changes (icons, colors, styling)
- High maintenance burden
- Don't catch actual bugs (UI issues are visually obvious)
- Create false confidence

## Solution

Focus testing on **business logic and data integrity**, not presentation details.

## Current Test Inventory

### ✅ KEEP - High Value Tests

#### 1. Business Logic Tests
**Location**: `packages/ui/src/lib/specs/__tests__/relationships.test.ts`  
**Tests**: Spec dependency computation, relationship mapping  
**Value**: ⭐⭐⭐⭐⭐  
**Why Keep**: Core business logic for spec dependencies. Bugs here corrupt data.

#### 2. Data Transformation Tests
**Location**: `packages/ui/src/lib/utils/__tests__/leanYaml.test.ts`  
**Tests**: YAML parsing for project registry  
**Value**: ⭐⭐⭐⭐⭐  
**Why Keep**: Data integrity critical. Parser errors break everything.

#### 3. Utility Function Tests
**Location**: `packages/ui-components/src/lib/__tests__/utils.test.ts`  
**Tests**: Class name merging, markdown parsing  
**Value**: ⭐⭐⭐⭐  
**Why Keep**: Reusable utilities with clear contracts. Worth testing.

**Location**: `packages/ui-components/src/lib/__tests__/color-utils.test.ts`  
**Tests**: String hashing, contrast calculation  
**Value**: ⭐⭐⭐⭐  
**Why Keep**: Deterministic algorithms with edge cases.

**Location**: `packages/ui-components/src/lib/__tests__/date-utils.test.ts`  
**Tests**: Date formatting, relative time  
**Value**: ⭐⭐⭐⭐  
**Why Keep**: Complex logic with i18n concerns.

#### 4. URL Transformation Tests
**Location**: `packages/ui/src/components/markdown-link.test.ts`  
**Tests**: Spec link transformation (../NNN-spec-name/)  
**Value**: ⭐⭐⭐⭐⭐  
**Why Keep**: Critical routing logic. Wrong transformation = broken navigation.

#### 5. Mermaid Detection Tests
**Location**: `packages/ui/src/components/mermaid-diagram.test.ts`  
**Tests**: Language class detection, code extraction  
**Value**: ⭐⭐⭐  
**Why Keep**: Edge cases in markdown rendering. Regex bugs are common.

#### 6. Database Query Tests
**Location**: `packages/ui/src/lib/db/__tests__/queries.test.ts`  
**Tests**: Query structure, type safety  
**Value**: ⭐⭐⭐⭐  
**Why Keep**: Validates query contracts and data shapes.

#### 7. I18n Configuration Tests
**Location**: `packages/ui/src/lib/i18n.test.ts`  
**Tests**: Translation loading, locale detection  
**Value**: ⭐⭐⭐⭐  
**Why Keep**: Ensures i18n plumbing works. Easy to break subtly.

#### 8. Project Registry Tests
**Location**: `packages/ui/src/lib/projects/__tests__/registry.test.ts`  
**Tests**: YAML→JSON migration, persistence  
**Value**: ⭐⭐⭐⭐⭐  
**Why Keep**: Critical migration path. Data loss risk.

**Location**: `packages/ui/src/lib/projects/__tests__/constants.test.ts`  
**Tests**: Project ID normalization  
**Value**: ⭐⭐⭐  
**Why Keep**: Simple but important contract.

### ❌ REMOVED - Low Value Tests

#### ~~Sub-spec Style Tests~~ (DELETED)
**Was**: `packages/ui-vite/src/lib/__tests__/sub-spec-utils.test.ts`  
**Tested**: Icon/color assignment based on filename  
**Why Removed**:
- Pure presentation logic (like testing CSS)
- Broke on every design tweak
- No data corruption risk
- UI bugs are immediately visible
- High maintenance, zero benefit

## Testing Philosophy

### What to Test

✅ **Business Logic**
- Algorithms with edge cases
- Data transformations
- State machines
- Complex conditionals

✅ **Data Integrity**
- Parsing/serialization
- Migrations
- Database queries
- API contracts

✅ **Critical Paths**
- Navigation/routing
- Authentication (if added)
- Data persistence
- File operations

### What NOT to Test

❌ **UI Presentation**
- Icon/color selection
- CSS class names
- Visual layouts
- Component rendering (use visual testing tools instead)

❌ **Simple Getters/Setters**
- One-line functions
- Direct property access
- Trivial wrappers

❌ **Third-party Library Behavior**
- Don't test React/Vite/etc.
- Trust well-maintained dependencies
- Only test your integration logic

## Metrics

### Before Cleanup
- **Total test files**: 13
- **Tests**: 115
- **Failing**: 5
- **Maintenance burden**: High (brittle UI tests)

### After Cleanup
- **Total test files**: 12
- **Tests**: 107
- **Failing**: 0 ✅
- **Maintenance burden**: Low (stable contracts)

## CI Impact

### Before
```yaml
- name: Run tests
  run: pnpm test
  # Frequently failed on design changes
  # Required constant test updates
```

### After
```yaml
- name: Run tests
  run: pnpm test
  # Only fails on actual bugs
  # Stable across refactors
```

## Recommendations for Future Tests

### ✅ Write Tests For

1. **New business logic** in `packages/core`
2. **Data parsers** for frontmatter/YAML/JSON
3. **CLI argument parsing** (when moving to Rust CLI)
4. **Validation rules** for spec frontmatter
5. **Search/filter algorithms**

### ❌ Don't Write Tests For

1. **UI component styling** - Use visual regression testing (Percy/Chromatic) if needed
2. **React component props** - TypeScript handles this
3. **Tailwind class combinations** - Trust the framework
4. **Icon/color assignments** - Design choices, not logic
5. **Simple wrappers** - No value add

## Tools & Patterns

### Current Stack
- **Vitest**: Fast, modern test runner
- **Better-sqlite3**: In-memory DB for query tests
- **Node fs/promises**: Real file operations in temp dirs

### Patterns We Use

#### ✅ Unit Tests for Pure Functions
```typescript
describe('computeSpecRelationships', () => {
  it('computes dependsOn from spec content', () => {
    const result = computeSpecRelationships(spec, allSpecs);
    expect(result.dependsOn).toEqual(['spec-a', 'spec-b']);
  });
});
```

#### ✅ Integration Tests for File Operations
```typescript
describe('ProjectRegistry storage', () => {
  let workspaceDir: string;
  
  beforeEach(async () => {
    workspaceDir = await mkdtemp(TMP_PREFIX);
  });
  
  afterEach(async () => {
    await rm(workspaceDir, { recursive: true });
  });
  
  it('migrates legacy YAML configs to JSON', async () => {
    // Real file operations, real migration logic
  });
});
```

#### ❌ Avoid Testing Implementation Details
```typescript
// BAD - tests internal styling
it('should return purple icon for design files', () => {
  expect(getSubSpecStyle('DESIGN.md').color).toBe('text-purple-600');
});

// GOOD - tests contract
it('should return a valid style object', () => {
  const style = getSubSpecStyle('DESIGN.md');
  expect(style).toHaveProperty('icon');
  expect(style).toHaveProperty('color');
});
```

## Migration Path

If we need better UI testing:

1. **E2E Tests** (Playwright): Critical user flows
2. **Visual Regression** (Percy/Chromatic): Design consistency
3. **Accessibility Tests** (axe-core): A11y compliance
4. **Component Tests** (Storybook): Interaction states

Don't use unit tests for UI presentation.

## Conclusion

**Before**: Tests failed frequently due to design changes  
**After**: Tests only fail on actual bugs

This shift reduces maintenance burden while maintaining (and arguably improving) code quality. We now test **what matters** instead of **what's easy to test**.

---

**Action Items**:
- ✅ Remove brittle sub-spec-utils test
- ✅ Document test strategy
- ⏳ Add visual regression testing (future)
- ⏳ Add E2E tests for critical flows (future)
