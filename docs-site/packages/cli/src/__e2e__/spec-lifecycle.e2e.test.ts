/**
 * E2E Tests: spec lifecycle scenarios
 *
 * Tests the full lifecycle of specs from creation through archival:
 * - Create specs with various options
 * - Update status, priority, tags
 * - Link specs together (depends_on, related)
 * - Archive completed specs
 *
 * These tests verify that multi-command workflows work correctly
 * end-to-end, catching issues that unit tests miss.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import {
  createE2EEnvironment,
  initProject,
  createSpec,
  updateSpec,
  linkSpecs,
  archiveSpec,
  listSpecs,
  viewSpec,
  getBoard,
  fileExists,
  dirExists,
  readFile,
  listDir,
  parseFrontmatter,
  type E2EContext,
} from './e2e-helpers.js';

describe('E2E: spec lifecycle', () => {
  let ctx: E2EContext;

  beforeEach(async () => {
    ctx = await createE2EEnvironment();
    initProject(ctx.tmpDir, { yes: true });
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe('create → update → archive workflow', () => {
    it('should complete full lifecycle: create → update status → archive', async () => {
      // Step 1: Create a spec
      const createResult = createSpec(ctx.tmpDir, 'my-feature');
      expect(createResult.exitCode).toBe(0);

      // Verify spec was created (flat pattern: specs/001-my-feature)
      const specDir = path.join(ctx.tmpDir, 'specs', '001-my-feature');
      expect(await dirExists(specDir)).toBe(true);

      // Check initial status
      let readmePath = path.join(specDir, 'README.md');
      let content = await readFile(readmePath);
      let frontmatter = parseFrontmatter(content);
      expect(frontmatter.status).toBe('planned');

      // Step 2: Update to in-progress
      const updateResult1 = updateSpec(ctx.tmpDir, '001-my-feature', { status: 'in-progress' });
      expect(updateResult1.exitCode).toBe(0);

      content = await readFile(readmePath);
      frontmatter = parseFrontmatter(content);
      expect(frontmatter.status).toBe('in-progress');

      // Step 3: Update to complete
      const updateResult2 = updateSpec(ctx.tmpDir, '001-my-feature', { status: 'complete' });
      expect(updateResult2.exitCode).toBe(0);

      content = await readFile(readmePath);
      frontmatter = parseFrontmatter(content);
      expect(frontmatter.status).toBe('complete');

      // Step 4: Archive
      const archiveResult = archiveSpec(ctx.tmpDir, '001-my-feature');
      expect(archiveResult.exitCode).toBe(0);

      // Original location should be gone
      expect(await dirExists(specDir)).toBe(false);

      // Should be in archived folder
      const archivedDir = path.join(ctx.tmpDir, 'specs', 'archived', '001-my-feature');
      expect(await dirExists(archivedDir)).toBe(true);
    });

    it('should create multiple specs with sequential numbering', async () => {
      createSpec(ctx.tmpDir, 'feature-a');
      createSpec(ctx.tmpDir, 'feature-b');
      createSpec(ctx.tmpDir, 'feature-c');

      // Check sequential numbering (flat pattern)
      expect(await dirExists(path.join(ctx.tmpDir, 'specs', '001-feature-a'))).toBe(true);
      expect(await dirExists(path.join(ctx.tmpDir, 'specs', '002-feature-b'))).toBe(true);
      expect(await dirExists(path.join(ctx.tmpDir, 'specs', '003-feature-c'))).toBe(true);

      // List should show all three
      const listResult = listSpecs(ctx.tmpDir);
      expect(listResult.exitCode).toBe(0);
      expect(listResult.stdout).toContain('feature-a');
      expect(listResult.stdout).toContain('feature-b');
      expect(listResult.stdout).toContain('feature-c');
    });
  });

  describe('spec creation options', () => {
    it('should create spec with custom title', async () => {
      const result = createSpec(ctx.tmpDir, 'api-v2', { title: 'API Version 2 Redesign' });
      expect(result.exitCode).toBe(0);

      const readmePath = path.join(ctx.tmpDir, 'specs', '001-api-v2', 'README.md');
      const content = await readFile(readmePath);

      expect(content).toContain('API Version 2 Redesign');
    });

    it('should create spec with priority', async () => {
      const result = createSpec(ctx.tmpDir, 'urgent-fix', { priority: 'high' });
      expect(result.exitCode).toBe(0);

      const readmePath = path.join(ctx.tmpDir, 'specs', '001-urgent-fix', 'README.md');
      const content = await readFile(readmePath);
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.priority).toBe('high');
    });

    it('should create spec with tags', async () => {
      const result = createSpec(ctx.tmpDir, 'auth-system', { tags: 'security,backend' });
      expect(result.exitCode).toBe(0);

      const readmePath = path.join(ctx.tmpDir, 'specs', '001-auth-system', 'README.md');
      const content = await readFile(readmePath);
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.tags).toContain('security');
      expect(frontmatter.tags).toContain('backend');
    });
  });

  describe('spec updates', () => {
    it('should update priority', async () => {
      createSpec(ctx.tmpDir, 'my-spec');

      const result = updateSpec(ctx.tmpDir, '001-my-spec', { priority: 'critical' });
      expect(result.exitCode).toBe(0);

      const content = await readFile(path.join(ctx.tmpDir, 'specs', '001-my-spec', 'README.md'));
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.priority).toBe('critical');
    });

    it('should update tags', async () => {
      createSpec(ctx.tmpDir, 'my-spec');

      const result = updateSpec(ctx.tmpDir, '001-my-spec', { tags: 'api,frontend,v2' });
      expect(result.exitCode).toBe(0);

      const content = await readFile(path.join(ctx.tmpDir, 'specs', '001-my-spec', 'README.md'));
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.tags).toContain('api');
      expect(frontmatter.tags).toContain('frontend');
      expect(frontmatter.tags).toContain('v2');
    });

    it('should update assignee', async () => {
      createSpec(ctx.tmpDir, 'my-spec');

      const result = updateSpec(ctx.tmpDir, '001-my-spec', { assignee: 'john-doe' });
      expect(result.exitCode).toBe(0);

      const content = await readFile(path.join(ctx.tmpDir, 'specs', '001-my-spec', 'README.md'));
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.assignee).toBe('john-doe');
    });

    it('should record status transition timestamps', async () => {
      createSpec(ctx.tmpDir, 'my-spec');

      // Update to in-progress
      updateSpec(ctx.tmpDir, '001-my-spec', { status: 'in-progress' });

      // Update to complete
      updateSpec(ctx.tmpDir, '001-my-spec', { status: 'complete' });

      const content = await readFile(path.join(ctx.tmpDir, 'specs', '001-my-spec', 'README.md'));
      const frontmatter = parseFrontmatter(content);

      // Should have completed timestamp
      expect(frontmatter.completed).toBeDefined();
    });
  });

  describe('spec linking', () => {
    it('should link specs with depends_on', async () => {
      createSpec(ctx.tmpDir, 'database');
      createSpec(ctx.tmpDir, 'api');

      // API depends on database
      const result = linkSpecs(ctx.tmpDir, '002-api', { dependsOn: '001-database' });
      expect(result.exitCode).toBe(0);

      const content = await readFile(path.join(ctx.tmpDir, 'specs', '002-api', 'README.md'));
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.depends_on).toContain('001-database');
    });

    it('should link specs with related (bidirectional)', async () => {
      createSpec(ctx.tmpDir, 'frontend');
      createSpec(ctx.tmpDir, 'backend');

      // Link as related (should be bidirectional)
      const result = linkSpecs(ctx.tmpDir, '001-frontend', { related: '002-backend' });
      expect(result.exitCode).toBe(0);

      // Check frontend has backend as related
      const frontendContent = await readFile(
        path.join(ctx.tmpDir, 'specs', '001-frontend', 'README.md')
      );
      const frontendFm = parseFrontmatter(frontendContent);
      expect(frontendFm.related).toContain('002-backend');

      // Check backend has frontend as related (bidirectional)
      const backendContent = await readFile(
        path.join(ctx.tmpDir, 'specs', '002-backend', 'README.md')
      );
      const backendFm = parseFrontmatter(backendContent);
      expect(backendFm.related).toContain('001-frontend');
    });

    it('should create dependency chain', async () => {
      createSpec(ctx.tmpDir, 'database');
      createSpec(ctx.tmpDir, 'api');
      createSpec(ctx.tmpDir, 'frontend');

      // frontend → api → database
      linkSpecs(ctx.tmpDir, '002-api', { dependsOn: '001-database' });
      linkSpecs(ctx.tmpDir, '003-frontend', { dependsOn: '002-api' });

      const apiContent = await readFile(path.join(ctx.tmpDir, 'specs', '002-api', 'README.md'));
      const apiFm = parseFrontmatter(apiContent);
      expect(apiFm.depends_on).toContain('001-database');

      const frontendContent = await readFile(
        path.join(ctx.tmpDir, 'specs', '003-frontend', 'README.md')
      );
      const frontendFm = parseFrontmatter(frontendContent);
      expect(frontendFm.depends_on).toContain('002-api');
    });
  });

  describe('listing and filtering', () => {
    it('should list specs by status', async () => {
      createSpec(ctx.tmpDir, 'planned-spec');
      createSpec(ctx.tmpDir, 'active-spec');
      createSpec(ctx.tmpDir, 'done-spec');

      updateSpec(ctx.tmpDir, '002-active-spec', { status: 'in-progress' });
      updateSpec(ctx.tmpDir, '003-done-spec', { status: 'complete' });

      // Filter by status
      const inProgressResult = listSpecs(ctx.tmpDir, { status: 'in-progress' });
      expect(inProgressResult.stdout).toContain('active-spec');
      expect(inProgressResult.stdout).not.toContain('planned-spec');
      expect(inProgressResult.stdout).not.toContain('done-spec');

      const completeResult = listSpecs(ctx.tmpDir, { status: 'complete' });
      expect(completeResult.stdout).toContain('done-spec');
    });

    it('should list specs by priority', async () => {
      createSpec(ctx.tmpDir, 'low-priority', { priority: 'low' });
      createSpec(ctx.tmpDir, 'high-priority', { priority: 'high' });
      createSpec(ctx.tmpDir, 'critical-fix', { priority: 'critical' });

      const highResult = listSpecs(ctx.tmpDir, { priority: 'high' });
      expect(highResult.stdout).toContain('high-priority');
      expect(highResult.stdout).not.toContain('low-priority');
    });

    it('should not list archived specs by default', async () => {
      createSpec(ctx.tmpDir, 'active-spec');
      createSpec(ctx.tmpDir, 'archived-spec');

      updateSpec(ctx.tmpDir, '002-archived-spec', { status: 'complete' });
      archiveSpec(ctx.tmpDir, '002-archived-spec');

      const result = listSpecs(ctx.tmpDir);
      expect(result.stdout).toContain('active-spec');
      expect(result.stdout).not.toContain('archived-spec');
    });

    it('should include archived specs with --archived', async () => {
      createSpec(ctx.tmpDir, 'active-spec');
      createSpec(ctx.tmpDir, 'archived-spec');

      updateSpec(ctx.tmpDir, '002-archived-spec', { status: 'complete' });
      archiveSpec(ctx.tmpDir, '002-archived-spec');

      const result = listSpecs(ctx.tmpDir, { archived: '' });
      expect(result.stdout).toContain('active-spec');
      expect(result.stdout).toContain('archived-spec');
    });
  });

  describe('board view', () => {
    it('should show specs organized by status', async () => {
      createSpec(ctx.tmpDir, 'planned-work');
      createSpec(ctx.tmpDir, 'in-progress-work');
      createSpec(ctx.tmpDir, 'completed-work');

      updateSpec(ctx.tmpDir, '002-in-progress-work', { status: 'in-progress' });
      updateSpec(ctx.tmpDir, '003-completed-work', { status: 'complete' });

      const result = getBoard(ctx.tmpDir);
      expect(result.exitCode).toBe(0);

      // Board should have columns for each status
      expect(result.stdout.toLowerCase()).toContain('planned');
      expect(result.stdout.toLowerCase()).toContain('in-progress');
      expect(result.stdout.toLowerCase()).toContain('complete');
    });
  });

  describe('view command', () => {
    it('should display spec content', async () => {
      createSpec(ctx.tmpDir, 'my-feature', { title: 'My Amazing Feature' });

      const result = viewSpec(ctx.tmpDir, '001-my-feature');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('My Amazing Feature');
    });

    it('should find spec by partial name', async () => {
      createSpec(ctx.tmpDir, 'authentication-system');

      // View by spec number (CLI uses resolveSpecPath which supports number or full name)
      const result = viewSpec(ctx.tmpDir, '001');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('authentication');
    });
  });
});

/**
 * Regression tests for spec lifecycle bugs
 */
describe('E2E: spec lifecycle regressions', () => {
  let ctx: E2EContext;

  beforeEach(async () => {
    ctx = await createE2EEnvironment();
    initProject(ctx.tmpDir, { yes: true });
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('REGRESSION: should preserve created date format after updates', async () => {
    // Bug: YAML serialization was converting YYYY-MM-DD to ISO datetime

    createSpec(ctx.tmpDir, 'date-test');

    const readmePath = path.join(ctx.tmpDir, 'specs', '001-date-test', 'README.md');

    // Get initial created date
    let content = await readFile(readmePath);
    let frontmatter = parseFrontmatter(content);
    const initialCreated = frontmatter.created;

    // Update something
    updateSpec(ctx.tmpDir, '001-date-test', { status: 'in-progress' });

    // Created date should still be in YYYY-MM-DD format
    content = await readFile(readmePath);
    frontmatter = parseFrontmatter(content);

    expect(frontmatter.created).toBe(initialCreated);
    expect(frontmatter.created).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(frontmatter.created).not.toContain('T');
  });

  it('REGRESSION: should handle specs with special characters in name', async () => {
    // Names with dashes, underscores should work
    createSpec(ctx.tmpDir, 'my-cool_feature');

    expect(await dirExists(path.join(ctx.tmpDir, 'specs', '001-my-cool_feature'))).toBe(true);
  });

  it('REGRESSION: bidirectional links should update both specs', async () => {
    createSpec(ctx.tmpDir, 'spec-a');
    createSpec(ctx.tmpDir, 'spec-b');

    linkSpecs(ctx.tmpDir, '001-spec-a', { related: '002-spec-b' });

    // Both should have the link
    const contentA = await readFile(path.join(ctx.tmpDir, 'specs', '001-spec-a', 'README.md'));
    const contentB = await readFile(path.join(ctx.tmpDir, 'specs', '002-spec-b', 'README.md'));

    const fmA = parseFrontmatter(contentA);
    const fmB = parseFrontmatter(contentB);

    expect(fmA.related).toContain('002-spec-b');
    expect(fmB.related).toContain('001-spec-a');
  });
});
