---
status: planned
created: 2025-12-18
priority: high
tags:
- testing
- ui
- e2e
- playwright
- quality
depends_on:
- 175-rust-cli-e2e-test-suite
created_at: 2025-12-18T05:59:35.417522304Z
updated_at: 2025-12-18T05:59:47.266245980Z
---

# UI E2E Test Suite with Playwright

> **Status**: 🗓️ Planned · **Created**: 2025-12-18

## Overview

Implement comprehensive E2E test suite for the LeanSpec UI (Next.js web application) using Playwright. While the UI has some unit tests, it lacks end-to-end testing for critical user workflows.

### Current UI Test Coverage

**Existing Tests** (8 test files):
- ✅ `markdown-link.test.ts` - Link transformation logic
- ✅ `mermaid-diagram.test.ts` - Diagram detection
- ✅ `db/__tests__/queries.test.ts` - Database queries
- ✅ `i18n/config.test.ts` - Internationalization config
- ✅ `utils/__tests__/leanYaml.test.ts` - YAML parsing
- ✅ `specs/__tests__/relationships.test.ts` - Spec relationships
- ✅ `projects/__tests__/constants.test.ts` - Project constants
- ✅ `projects/__tests__/registry.test.ts` - Project registry

**Missing Coverage**:
- ❌ No E2E tests for user workflows
- ❌ No browser interaction testing
- ❌ No visual regression testing
- ❌ No multi-project mode testing
- ❌ No real-time sync testing

### Why E2E Tests Matter

The UI is a complex Next.js application with:
1. **Real-time features** - Spec syncing, live updates
2. **Multi-project management** - Project switching, registry
3. **Complex interactions** - Dependency graphs, editing, navigation
4. **Visual components** - Mermaid diagrams, DAG visualization
5. **Internationalization** - Chinese/English switching

Unit tests can't catch:
- Navigation issues
- Visual regressions
- Real-time sync bugs
- Multi-project state management
- Browser compatibility issues

### Goals

1. Implement E2E test framework (Playwright)
2. Test critical user workflows end-to-end
3. Visual regression testing for components
4. Multi-project mode testing
5. Real-time sync validation
6. Internationalization testing
7. Performance and accessibility testing

## Critical User Workflows

### Core Workflows
1. **Project Management**
   - Add new project
   - Switch between projects
   - Remove project
   - Default project handling

2. **Spec Browsing**
   - View spec list
   - Filter by status/priority/tags
   - Search specs
   - Navigate to spec detail
   - View sub-specs

3. **Spec Viewing**
   - Render markdown content
   - Display frontmatter metadata
   - Render Mermaid diagrams
   - Transform internal links
   - Sub-spec navigation

4. **Dependencies**
   - View dependency graph (DAG)
   - View network visualization
   - Focus mode interactions
   - Dependency navigation

5. **Metadata Editing**
   - Edit status
   - Edit priority
   - Edit tags
   - Edit assignee
   - Save changes

6. **Board View**
   - View specs by status
   - Drag and drop (if implemented)
   - Group by different fields

7. **Internationalization**
   - Switch language EN→ZH
   - Verify translations
   - Persist language preference

## Plan

### Phase 1: Test Framework Setup
- [ ] Choose and install Playwright
- [ ] Configure `playwright.config.ts`:
  - Test directory structure
  - Base URL configuration
  - Multi-browser setup (Chrome, Firefox, Safari)
  - Screenshot on failure
  - Trace on retry
  - Parallel execution
- [ ] Set up test database/fixtures:
  - Sample project structures
  - Test data isolation
  - Cleanup strategies
- [ ] Create test utilities and helpers:
  - `setup.ts` - Project setup
  - `navigation.ts` - Navigation helpers
  - `assertions.ts` - Custom assertions
  - `projects.ts` - Project management
- [ ] Configure CI/CD integration:
  - GitHub Actions workflow
  - Test result reporting
  - Artifact uploads

### Phase 2: Core Workflow Tests
- [ ] **Project Management E2E** (`project-management.spec.ts`)
  - Add project from filesystem
  - Switch active project
  - Delete project
  - Handle default project
  - Multi-project sidebar navigation
  - Verify project persistence
  - Error handling (invalid path, missing config)
- [ ] **Spec List E2E** (`spec-list.spec.ts`)
  - Load and display spec list
  - Filter by status
  - Filter by tags
  - Filter by priority
  - Search functionality
  - Pagination (if applicable)
  - Sort by different fields
  - Empty state handling
- [ ] **Spec Detail View E2E** (`spec-detail.spec.ts`)
  - Navigate to spec from list
  - Render markdown content correctly
  - Display frontmatter metadata
  - Render Mermaid diagrams
  - Transform internal links (../NNN-spec → /specs/NNN)
  - Navigate sub-specs via links
  - Scroll position persistence
  - Back button navigation

### Phase 3: Advanced Features
- [ ] **Dependencies Page E2E** (`dependencies.spec.ts`)
  - Load dependency graph page
  - DAG visualization renders correctly
  - Network visualization renders
  - Focus mode interaction
  - Navigate to specs from graph
  - Toggle between DAG/Network views
  - Handle circular dependencies
  - Empty dependencies state
- [ ] **Metadata Editing E2E** (`metadata-editing.spec.ts`)
  - Open edit modal/dialog
  - Change status dropdown
  - Change priority
  - Add tags (create new tag)
  - Remove tags
  - Change assignee
  - Save and verify changes persist
  - Cancel without saving
  - Validation error messages
  - Optimistic updates
- [ ] **Board View E2E** (`board-view.spec.ts`)
  - Load board/kanban view
  - Group by status columns
  - Group by priority
  - Group by assignee
  - Navigate to specs from cards
  - Drag and drop (if implemented)
  - Empty columns display

### Phase 4: Real-time & Sync
- [ ] **Real-time Updates** (`real-time-sync.spec.ts`)
  - File system watch triggers
  - Auto-refresh on external changes
  - Optimistic updates on edit
  - Conflict resolution UI
  - Loading states
  - Error recovery
- [ ] **Multi-project State** (`multi-project-state.spec.ts`)
  - Project registry persistence (localStorage)
  - Active project state preservation
  - Cross-project navigation
  - Project isolation (no data leakage)
  - Concurrent project operations

### Phase 5: Visual & Accessibility
- [ ] **Visual Regression** (`visual-regression.spec.ts`)
  - Spec list page snapshots (multiple states)
  - Spec detail snapshots (with diagrams)
  - Dependencies graph snapshots
  - Board view snapshots
  - Modal/dialog snapshots
  - Empty states
  - Error states
  - Loading states
- [ ] **Accessibility Testing** (`accessibility.spec.ts`)
  - Keyboard navigation (Tab, Enter, Escape)
  - Screen reader support (aria-labels)
  - Focus management (modals, navigation)
  - Color contrast validation
  - Heading hierarchy
  - Alt text for images
  - Form label associations

### Phase 6: Internationalization
- [ ] **Language Switching** (`internationalization.spec.ts`)
  - Switch EN→ZH via language selector
  - Switch ZH→EN
  - Persist language preference (localStorage)
  - Verify UI translations (buttons, labels)
  - Verify content translations (if any)
  - RTL support (if applicable)
- [ ] **Chinese Content** (`chinese-content.spec.ts`)
  - Render Chinese spec names correctly
  - Chinese search functionality
  - Chinese tags display
  - Chinese markdown rendering
  - Font rendering

### Phase 7: Performance & Edge Cases
- [ ] **Performance** (`performance.spec.ts`)
  - Large spec repository (100+ specs) load time
  - Large spec content (>5000 lines) render time
  - Complex dependency graphs rendering
  - Multiple Mermaid diagrams on page
  - Scroll performance with many specs
  - Search performance
- [ ] **Edge Cases** (`edge-cases.spec.ts`)
  - Empty project (no specs)
  - Corrupted spec files (invalid frontmatter)
  - Missing frontmatter fields
  - Network errors (if API calls exist)
  - Browser back/forward buttons
  - Direct URL access to spec
  - Invalid spec number in URL
  - Refresh during edit
  - Concurrent edits (multiple tabs)

## Test Structure

```
packages/ui/
  e2e/
    fixtures/
      projects/
        sample-project/       # 10-20 sample specs
          specs/
            001-feature-a/
            002-feature-b/
            ...
          .leanspec.json
        large-project/        # 100+ specs for performance
        multi-project/        # Multiple project configs
        with-dependencies/    # Complex dependency graph
        chinese-content/      # Chinese spec names/content
    helpers/
      setup.ts               # Test setup utilities
      navigation.ts          # Navigation helpers
      assertions.ts          # Custom assertions
      projects.ts            # Project management helpers
      fixtures.ts            # Fixture loading
    tests/
      project-management.spec.ts
      spec-list.spec.ts
      spec-detail.spec.ts
      dependencies.spec.ts
      metadata-editing.spec.ts
      board-view.spec.ts
      search.spec.ts
      internationalization.spec.ts
      chinese-content.spec.ts
      real-time-sync.spec.ts
      multi-project-state.spec.ts
      visual-regression.spec.ts
      accessibility.spec.ts
      performance.spec.ts
      edge-cases.spec.ts
  playwright.config.ts       # Playwright configuration
```

## Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
  ],
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

## Example Test Pattern

```typescript
// e2e/tests/spec-list.spec.ts
import { test, expect } from '@playwright/test';
import { setupProject } from '../helpers/setup';

test.describe('Spec List', () => {
  test.beforeEach(async ({ page }) => {
    await setupProject(page, 'sample-project');
    await page.goto('/');
  });

  test('should display all specs', async ({ page }) => {
    // Wait for specs to load
    await expect(page.locator('[data-testid="spec-list"]')).toBeVisible();
    
    // Verify spec count
    const specItems = page.locator('[data-testid="spec-item"]');
    await expect(specItems).toHaveCount(10);
  });

  test('should filter by status', async ({ page }) => {
    // Apply status filter
    await page.click('[data-testid="filter-status"]');
    await page.click('[data-testid="status-planned"]');
    
    // Verify filtered results
    const specs = page.locator('[data-testid="spec-item"]');
    for (const spec of await specs.all()) {
      await expect(spec.locator('[data-testid="status-badge"]'))
        .toHaveText('planned');
    }
  });

  test('should search specs', async ({ page }) => {
    // Search for spec
    await page.fill('[data-testid="search-input"]', 'rust migration');
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // Verify results
    await expect(page.locator('[data-testid="spec-item"]'))
      .toHaveCount(1);
    await expect(page.locator('[data-testid="spec-title"]'))
      .toContainText('Rust Migration');
  });

  test('should navigate to spec detail', async ({ page }) => {
    // Click first spec
    await page.click('[data-testid="spec-item"]:first-child');
    
    // Verify navigation
    await expect(page).toHaveURL(/\/specs\/\d+/);
    await expect(page.locator('[data-testid="spec-content"]')).toBeVisible();
  });
});
```

## Dependencies

Add to `packages/ui/package.json`:

```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@axe-core/playwright": "^4.8.0",
    "playwright": "^1.40.0"
  },
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report"
  }
}
```

## Data-testid Strategy

Add `data-testid` attributes to UI components for stable test selectors:

```tsx
// components/spec-list.tsx
export function SpecList({ specs }: Props) {
  return (
    <div data-testid="spec-list">
      {specs.map(spec => (
        <div 
          key={spec.id}
          data-testid="spec-item"
          data-spec-id={spec.id}
        >
          <h3 data-testid="spec-title">{spec.title}</h3>
          <span data-testid="status-badge">{spec.status}</span>
        </div>
      ))}
    </div>
  );
}
```

**Benefits**:
- Stable selectors (won't break with CSS changes)
- Clear test intent
- Easy to find in tests
- Self-documenting UI components

## Test Data Management

### Fixture Setup

```typescript
// e2e/helpers/setup.ts
import { Page } from '@playwright/test';
import fs from 'fs-extra';
import path from 'path';

export async function setupProject(
  page: Page,
  fixtureName: string
): Promise<string> {
  // Copy fixture to temp directory
  const fixtureDir = path.join(__dirname, '..', 'fixtures', 'projects', fixtureName);
  const tempDir = path.join(os.tmpdir(), `leanspec-test-${Date.now()}`);
  
  await fs.copy(fixtureDir, tempDir);
  
  // Configure UI to use temp project
  await page.goto('/');
  await page.evaluate((projectPath) => {
    localStorage.setItem('leanspec-projects', JSON.stringify([{
      id: 'test-project',
      path: projectPath,
      name: 'Test Project',
      default: true,
    }]));
  }, tempDir);
  
  await page.reload();
  return tempDir;
}

export async function teardownProject(projectPath: string) {
  await fs.remove(projectPath);
}
```

### Data Isolation

- Each test gets fresh fixture copy
- Use `test.beforeEach` for setup
- Use `test.afterEach` for cleanup
- No shared state between tests

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/ui-e2e.yml
name: UI E2E Tests

on:
  pull_request:
    paths:
      - 'packages/ui/**'
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm --filter @leanspec/ui build
      - run: npx playwright install --with-deps
      - run: pnpm --filter @leanspec/ui test:e2e
      
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: packages/ui/playwright-report/
          retention-days: 7
```

### Test Reporting

- HTML report for local development
- JSON report for CI processing
- Screenshots on failure
- Videos on failure
- Trace files for debugging

## Success Criteria

- [ ] E2E test framework configured and running
- [ ] All critical user workflows tested (7+ workflows)
- [ ] Visual regression tests for key pages (5+ pages)
- [ ] Accessibility tests passing (WCAG 2.1 Level AA)
- [ ] Multi-browser testing (Chrome, Firefox, Safari)
- [ ] CI/CD integration with test reports
- [ ] Test execution time <5 minutes (full suite)
- [ ] Test coverage for all major features
- [ ] Documentation for writing UI tests
- [ ] Zero test failures on main branch
- [ ] 90%+ critical path coverage

## Notes

### Incremental Implementation

Start with highest-value tests first:
1. Spec list and detail (core functionality)
2. Project management (multi-project critical)
3. Dependencies (unique feature)
4. Metadata editing (data integrity)
5. Visual regression (prevent UI breaks)
6. Performance (scalability)
7. Edge cases (robustness)

### Performance Optimization

- Use `test.describe.configure({ mode: 'parallel' })` for independent tests
- Reuse browser contexts when possible
- Minimize page reloads
- Use fixtures efficiently
- Run visual regression tests separately (slower)

### Maintenance Strategy

- Add data-testid when building new features
- Update tests when UI changes
- Review test failures carefully (real issues vs flakes)
- Keep fixtures updated with new features
- Refactor test helpers as patterns emerge

## Related Specs

- **Spec 175**: Rust CLI E2E Test Suite (CLI testing)
- **Spec 176**: Rust MCP Server Test Suite (MCP testing)
- **Spec 130**: Testing Strategy Overhaul (overall testing strategy)
- **Spec 103**: UI Standalone Consolidation (UI architecture)
- **Spec 107**: UI/UX Refinements (UI features)
- **Spec 137**: UI Dependencies Page (dependency visualization)
- **Spec 141**: Multi-Project Management UI Improvements (multi-project)
