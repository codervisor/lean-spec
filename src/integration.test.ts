import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import { createSpec, updateSpec, archiveSpec } from './commands.js';
import { loadAllSpecs, getSpec } from './spec-loader.js';
import { parseFrontmatter } from './frontmatter.js';
import {
  createTestEnvironment,
  initTestProject,
  getTestDate,
  dirExists,
  type TestContext,
} from './test-helpers.js';

describe('Integration: Full spec lifecycle', () => {
  let ctx: TestContext;
  let originalCwd: string;

  beforeEach(async () => {
    ctx = await createTestEnvironment();
    originalCwd = process.cwd();
    process.chdir(ctx.tmpDir);
    await initTestProject(ctx.tmpDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await ctx.cleanup();
  });

  it('should handle complete spec workflow: create → update → archive', async () => {
    // Step 1: Create a new spec
    const specName = 'api-redesign';
    await createSpec(specName, {
      title: 'API Redesign',
      description: 'Redesign REST API for v2',
    });

    const today = getTestDate();
    const specDir = path.join(ctx.tmpDir, 'specs', today, `001-${specName}`);
    
    // Verify spec was created
    expect(await dirExists(specDir)).toBe(true);
    
    let specs = await loadAllSpecs();
    expect(specs).toHaveLength(1);
    expect(specs[0].frontmatter.status).toBe('planned');

    // Step 2: Start work on the spec
    await updateSpec(`001-${specName}`, {
      status: 'in-progress',
      priority: 'high',
      tags: ['api', 'backend', 'breaking'],
    });

    specs = await loadAllSpecs();
    expect(specs[0].frontmatter.status).toBe('in-progress');
    expect(specs[0].frontmatter.priority).toBe('high');
    expect(specs[0].frontmatter.tags).toEqual(['api', 'backend', 'breaking']);

    // Step 3: Complete the spec
    await updateSpec(`001-${specName}`, {
      status: 'complete',
    });

    specs = await loadAllSpecs();
    expect(specs[0].frontmatter.status).toBe('complete');
    expect(specs[0].frontmatter.completed).toBeDefined();

    // Step 4: Archive the completed spec
    await archiveSpec(specDir);

    // Verify spec was archived
    expect(await dirExists(specDir)).toBe(false);
    const archivedPath = path.join(ctx.tmpDir, 'specs', 'archived', today, `001-${specName}`);
    expect(await dirExists(archivedPath)).toBe(true);

    // Verify active specs list is empty
    specs = await loadAllSpecs();
    expect(specs).toHaveLength(0);

    // Verify archived spec is accessible with includeArchived flag
    specs = await loadAllSpecs({ includeArchived: true });
    expect(specs).toHaveLength(1);
    expect(specs[0].path).toContain('archived');
  });
});

describe('Integration: Multiple specs and filtering', () => {
  let ctx: TestContext;
  let originalCwd: string;

  beforeEach(async () => {
    ctx = await createTestEnvironment();
    originalCwd = process.cwd();
    process.chdir(ctx.tmpDir);
    await initTestProject(ctx.tmpDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await ctx.cleanup();
  });

  it('should manage multiple specs with different priorities and tags', async () => {
    // Create multiple specs with different attributes
    await createSpec('urgent-bug-fix', {
      title: 'Critical Bug Fix',
      description: 'Fix production issue',
    });
    await updateSpec('001-urgent-bug-fix', {
      status: 'in-progress',
      priority: 'critical',
      tags: ['bug', 'production'],
    });

    await createSpec('new-feature', {
      title: 'New Feature',
      description: 'Add new dashboard',
    });
    await updateSpec('002-new-feature', {
      status: 'planned',
      priority: 'medium',
      tags: ['feature', 'frontend'],
    });

    await createSpec('api-refactor', {
      title: 'API Refactor',
      description: 'Clean up API code',
    });
    await updateSpec('003-api-refactor', {
      status: 'planned',
      priority: 'low',
      tags: ['refactor', 'api'],
    });

    await createSpec('urgent-security', {
      title: 'Security Patch',
      description: 'Apply security updates',
    });
    await updateSpec('004-urgent-security', {
      status: 'in-progress',
      priority: 'critical',
      tags: ['security', 'urgent'],
    });

    // Test: Get all specs
    let specs = await loadAllSpecs();
    expect(specs).toHaveLength(4);

    // Test: Filter by status
    specs = await loadAllSpecs({
      filter: { status: 'in-progress' },
    });
    expect(specs).toHaveLength(2);
    expect(specs.map(s => s.name)).toContain('001-urgent-bug-fix');
    expect(specs.map(s => s.name)).toContain('004-urgent-security');

    // Test: Filter by priority
    specs = await loadAllSpecs({
      filter: { priority: 'critical' },
    });
    expect(specs).toHaveLength(2);
    expect(specs.map(s => s.name)).toContain('001-urgent-bug-fix');
    expect(specs.map(s => s.name)).toContain('004-urgent-security');

    // Test: Filter by multiple priorities
    specs = await loadAllSpecs({
      filter: { priority: ['high', 'critical'] },
    });
    expect(specs).toHaveLength(2); // Only critical specs exist

    // Test: Filter by tags
    specs = await loadAllSpecs({
      filter: { tags: ['api'] },
    });
    expect(specs).toHaveLength(1);
    expect(specs[0].name).toBe('003-api-refactor');

    // Test: Combine multiple filters
    specs = await loadAllSpecs({
      filter: {
        status: 'in-progress',
        priority: 'critical',
      },
    });
    expect(specs).toHaveLength(2);
  });
});

describe('Integration: Spec content and search', () => {
  let ctx: TestContext;
  let originalCwd: string;

  beforeEach(async () => {
    ctx = await createTestEnvironment();
    originalCwd = process.cwd();
    process.chdir(ctx.tmpDir);
    await initTestProject(ctx.tmpDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await ctx.cleanup();
  });

  it('should load spec content for searching', async () => {
    // Create specs with distinct content
    await createSpec('authentication', {
      title: 'Authentication System',
      description: 'Implement OAuth2 authentication with JWT tokens',
    });

    await createSpec('database-migration', {
      title: 'Database Migration',
      description: 'Migrate from MySQL to PostgreSQL',
    });

    await createSpec('api-versioning', {
      title: 'API Versioning',
      description: 'Add version support to REST API endpoints',
    });

    // Load specs with content
    const specs = await loadAllSpecs({ includeContent: true });
    expect(specs).toHaveLength(3);
    
    // Verify all specs have content
    for (const spec of specs) {
      expect(spec.content).toBeDefined();
      expect(spec.content!.length).toBeGreaterThan(0);
    }

    // Simulate basic content search
    const authSpecs = specs.filter(s => s.content?.includes('authentication'));
    expect(authSpecs).toHaveLength(1);
    expect(authSpecs[0].name).toBe('001-authentication');

    const apiSpecs = specs.filter(s => s.content?.includes('API'));
    expect(apiSpecs.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Integration: Spec retrieval by different paths', () => {
  let ctx: TestContext;
  let originalCwd: string;

  beforeEach(async () => {
    ctx = await createTestEnvironment();
    originalCwd = process.cwd();
    process.chdir(ctx.tmpDir);
    await initTestProject(ctx.tmpDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await ctx.cleanup();
  });

  it('should retrieve specs using various path formats', async () => {
    await createSpec('my-feature', {
      title: 'My Feature',
      description: 'Test feature',
    });

    const today = getTestDate();
    const specName = '001-my-feature';

    // Method 1: Get by full relative path
    let spec = await getSpec(`${today}/${specName}`);
    expect(spec).not.toBeNull();
    expect(spec?.name).toBe(specName);

    // Method 2: Get by absolute path
    const absolutePath = path.join(ctx.tmpDir, 'specs', today, specName);
    spec = await getSpec(absolutePath);
    expect(spec).not.toBeNull();
    expect(spec?.name).toBe(specName);

    // Method 3: Update by spec name only
    await updateSpec(specName, { priority: 'high' });
    
    const specFile = path.join(ctx.tmpDir, 'specs', today, specName, 'README.md');
    const frontmatter = await parseFrontmatter(specFile);
    expect(frontmatter?.priority).toBe('high');
  });
});

describe('Integration: Date-based organization', () => {
  let ctx: TestContext;
  let originalCwd: string;

  beforeEach(async () => {
    ctx = await createTestEnvironment();
    originalCwd = process.cwd();
    process.chdir(ctx.tmpDir);
    await initTestProject(ctx.tmpDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await ctx.cleanup();
  });

  it('should organize specs by date and maintain sequence', async () => {
    // Create multiple specs on the same day
    await createSpec('feature-a');
    await createSpec('feature-b');
    await createSpec('feature-c');

    const today = getTestDate();
    const todayDir = path.join(ctx.tmpDir, 'specs', today);

    // Verify sequential numbering
    expect(await dirExists(path.join(todayDir, '001-feature-a'))).toBe(true);
    expect(await dirExists(path.join(todayDir, '002-feature-b'))).toBe(true);
    expect(await dirExists(path.join(todayDir, '003-feature-c'))).toBe(true);

    // Verify specs are returned in correct order
    const specs = await loadAllSpecs();
    expect(specs).toHaveLength(3);
    expect(specs[0].name).toBe('001-feature-a');
    expect(specs[1].name).toBe('002-feature-b');
    expect(specs[2].name).toBe('003-feature-c');
  });
});
