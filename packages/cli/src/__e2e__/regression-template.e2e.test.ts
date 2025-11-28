/**
 * Regression Test Template
 *
 * INSTRUCTIONS FOR BUG-FIX PRs:
 *
 * 1. Copy this template to a new test file or add to existing E2E tests
 * 2. Replace ISSUE_NUMBER with the GitHub issue number
 * 3. Replace the description with a clear explanation of the bug
 * 4. Write a test that FAILS without your fix and PASSES with your fix
 * 5. Include setup, action, and assertion steps
 *
 * Naming Convention:
 * - Test name: `REGRESSION #ISSUE: brief description`
 * - Alternative: `REGRESSION: brief description` if no issue number
 *
 * Example locations:
 * - packages/cli/src/__e2e__/init.e2e.test.ts - for init command bugs
 * - packages/cli/src/__e2e__/spec-lifecycle.e2e.test.ts - for CRUD bugs
 * - packages/cli/src/__e2e__/mcp-tools.e2e.test.ts - for MCP server bugs
 *
 * This file serves as documentation and a template for future regression tests.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import {
  createE2EEnvironment,
  initProject,
  createSpec,
  updateSpec,
  execCli,
  fileExists,
  dirExists,
  readFile,
  writeFile,
  remove,
  parseFrontmatter,
  type E2EContext,
} from './e2e-helpers.js';

/**
 * TEMPLATE: Regression tests for [COMPONENT_NAME]
 *
 * Add regression tests here when fixing bugs in [COMPONENT_NAME].
 * Each test should:
 * 1. Reproduce the exact conditions that triggered the bug
 * 2. Verify the bug no longer occurs with the fix
 * 3. Document the issue number and brief description
 */
describe('E2E: Regression tests template', () => {
  let ctx: E2EContext;

  beforeEach(async () => {
    ctx = await createE2EEnvironment();
    initProject(ctx.tmpDir, { yes: true });
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  /**
   * TEMPLATE: Single regression test
   *
   * Replace ISSUE_NUMBER with the actual issue number.
   * Replace the description and test body with your specific bug scenario.
   */
  it.skip('REGRESSION #ISSUE_NUMBER: Brief description of the bug', async () => {
    // SETUP: Create the conditions that triggered the bug
    // Example: Create a spec, modify a file, etc.

    // ACTION: Perform the action that used to trigger the bug
    // Example: Run a command, call a function, etc.

    // ASSERT: Verify the bug no longer occurs
    // Example: Check file contents, verify output, etc.

    // The test should:
    // - FAIL if the bug is present (before fix)
    // - PASS if the bug is fixed (after fix)
  });

  /**
   * EXAMPLE: Real regression test (for reference)
   *
   * This test catches the bug where init reported "AGENTS.md preserved"
   * even when the file was missing and needed to be recreated.
   */
  it('REGRESSION: init should not report AGENTS.md preserved when it was deleted', async () => {
    // SETUP: init, then delete AGENTS.md
    const agentsPath = path.join(ctx.tmpDir, 'AGENTS.md');
    expect(await fileExists(agentsPath)).toBe(true);
    await remove(agentsPath);
    expect(await fileExists(agentsPath)).toBe(false);

    // ACTION: run init again
    const result = initProject(ctx.tmpDir, { yes: true });

    // ASSERT:
    // 1. Command should succeed
    expect(result.exitCode).toBe(0);

    // 2. File should be recreated
    expect(await fileExists(agentsPath)).toBe(true);

    // 3. Output should indicate creation, not preservation
    // The output contains "What was preserved:" header which always appears,
    // but "Your AGENTS.md" line should NOT appear since it was deleted and recreated.
    const output = result.stdout.toLowerCase();
    
    // Should say it was created/missing, not preserved
    expect(output).toContain('agents.md created');
    // "Your AGENTS.md" should NOT appear in the preserved section
    expect(output).not.toContain('your agents.md');
  });

  /**
   * EXAMPLE: Regression test for date format preservation
   */
  it('REGRESSION: should preserve created date format after updates', async () => {
    // SETUP
    createSpec(ctx.tmpDir, 'date-test');
    // Flat pattern: specs/001-date-test (not date-grouped)
    const readmePath = path.join(ctx.tmpDir, 'specs', '001-date-test', 'README.md');

    // Get initial created date
    let content = await readFile(readmePath);
    let frontmatter = parseFrontmatter(content);
    const initialCreated = frontmatter.created as string;

    // ACTION: Update something
    updateSpec(ctx.tmpDir, '001-date-test', { status: 'in-progress' });

    // ASSERT: Created date should still be in YYYY-MM-DD format
    content = await readFile(readmePath);
    frontmatter = parseFrontmatter(content);

    expect(frontmatter.created).toBe(initialCreated);
    expect(frontmatter.created).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(frontmatter.created).not.toContain('T'); // No ISO timestamp
  });
});

/**
 * CHECKLIST for adding regression tests:
 *
 * □ Issue number is included in test name (if available)
 * □ Test reproduces the exact bug scenario
 * □ Test fails without the fix
 * □ Test passes with the fix
 * □ Setup, action, and assertion are clearly commented
 * □ Test is added to the appropriate E2E test file
 * □ PR description references the regression test
 */
