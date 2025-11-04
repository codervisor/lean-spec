import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import { loadAllSpecs, getSpec } from './spec-loader.js';
import {
  createTestEnvironment,
  initTestProject,
  createTestSpec,
  type TestContext,
} from './test-helpers.js';

describe('loadAllSpecs', () => {
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

  it('should load all specs', async () => {
    await createTestSpec(ctx.tmpDir, '20241101', '001-feature-a', {
      status: 'planned',
      created: '2024-11-01',
    });
    await createTestSpec(ctx.tmpDir, '20241101', '002-feature-b', {
      status: 'in-progress',
      created: '2024-11-01',
    });

    const specs = await loadAllSpecs({ sortOrder: 'asc' });

    expect(specs).toHaveLength(2);
    expect(specs[0].name).toBe('001-feature-a');
    expect(specs[1].name).toBe('002-feature-b');
  });

  it('should filter specs by status', async () => {
    await createTestSpec(ctx.tmpDir, '20241101', '001-planned', {
      status: 'planned',
      created: '2024-11-01',
    });
    await createTestSpec(ctx.tmpDir, '20241101', '002-in-progress', {
      status: 'in-progress',
      created: '2024-11-01',
    });
    await createTestSpec(ctx.tmpDir, '20241101', '003-complete', {
      status: 'complete',
      created: '2024-11-01',
    });

    const specs = await loadAllSpecs({
      filter: { status: 'in-progress' },
    });

    expect(specs).toHaveLength(1);
    expect(specs[0].name).toBe('002-in-progress');
  });

  it('should filter specs by multiple statuses', async () => {
    await createTestSpec(ctx.tmpDir, '20241101', '001-planned', {
      status: 'planned',
      created: '2024-11-01',
    });
    await createTestSpec(ctx.tmpDir, '20241101', '002-in-progress', {
      status: 'in-progress',
      created: '2024-11-01',
    });
    await createTestSpec(ctx.tmpDir, '20241101', '003-complete', {
      status: 'complete',
      created: '2024-11-01',
    });

    const specs = await loadAllSpecs({
      filter: { status: ['planned', 'in-progress'] },
    });

    expect(specs).toHaveLength(2);
    expect(specs.map(s => s.name)).toContain('001-planned');
    expect(specs.map(s => s.name)).toContain('002-in-progress');
  });

  it('should filter specs by tags', async () => {
    await createTestSpec(ctx.tmpDir, '20241101', '001-api-feature', {
      status: 'planned',
      created: '2024-11-01',
      tags: ['api', 'backend'],
    });
    await createTestSpec(ctx.tmpDir, '20241101', '002-frontend-feature', {
      status: 'planned',
      created: '2024-11-01',
      tags: ['frontend', 'ui'],
    });
    await createTestSpec(ctx.tmpDir, '20241101', '003-api-docs', {
      status: 'planned',
      created: '2024-11-01',
      tags: ['api', 'docs'],
    });

    const specs = await loadAllSpecs({
      filter: { tags: ['api'] },
    });

    expect(specs).toHaveLength(2);
    expect(specs.map(s => s.name)).toContain('001-api-feature');
    expect(specs.map(s => s.name)).toContain('003-api-docs');
  });

  it('should filter specs by priority', async () => {
    await createTestSpec(ctx.tmpDir, '20241101', '001-low', {
      status: 'planned',
      created: '2024-11-01',
      priority: 'low',
    });
    await createTestSpec(ctx.tmpDir, '20241101', '002-high', {
      status: 'planned',
      created: '2024-11-01',
      priority: 'high',
    });
    await createTestSpec(ctx.tmpDir, '20241101', '003-critical', {
      status: 'planned',
      created: '2024-11-01',
      priority: 'critical',
    });

    const specs = await loadAllSpecs({
      filter: { priority: ['high', 'critical'] },
    });

    expect(specs).toHaveLength(2);
    expect(specs.map(s => s.name)).toContain('002-high');
    expect(specs.map(s => s.name)).toContain('003-critical');
  });

  it('should include content when requested', async () => {
    await createTestSpec(ctx.tmpDir, '20241101', '001-feature', {
      status: 'planned',
      created: '2024-11-01',
    }, '# Feature\n\nTest content');

    const specs = await loadAllSpecs({ includeContent: true });

    expect(specs).toHaveLength(1);
    expect(specs[0].content).toBeDefined();
    expect(specs[0].content).toContain('Test content');
  });

  it('should not include content by default', async () => {
    await createTestSpec(ctx.tmpDir, '20241101', '001-feature', {
      status: 'planned',
      created: '2024-11-01',
    });

    const specs = await loadAllSpecs();

    expect(specs).toHaveLength(1);
    expect(specs[0].content).toBeUndefined();
  });

  it('should sort specs by date descending', async () => {
    await createTestSpec(ctx.tmpDir, '20241001', '001-old', {
      status: 'planned',
      created: '2024-10-01',
    });
    await createTestSpec(ctx.tmpDir, '20241101', '001-new', {
      status: 'planned',
      created: '2024-11-01',
    });
    await createTestSpec(ctx.tmpDir, '20241015', '001-middle', {
      status: 'planned',
      created: '2024-10-15',
    });

    const specs = await loadAllSpecs({ sortBy: 'created', sortOrder: 'desc' });

    expect(specs).toHaveLength(3);
    expect(specs[0].date).toBe('20241101');
    expect(specs[1].date).toBe('20241015');
    expect(specs[2].date).toBe('20241001');
  });

  it('should return empty array for non-existent specs directory', async () => {
    const newCtx = await createTestEnvironment();
    process.chdir(newCtx.tmpDir);

    const specs = await loadAllSpecs();

    expect(specs).toEqual([]);

    process.chdir(ctx.tmpDir);
    await newCtx.cleanup();
  });
});

describe('getSpec', () => {
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

  it('should get spec by path', async () => {
    await createTestSpec(ctx.tmpDir, '20241101', '001-feature', {
      status: 'planned',
      created: '2024-11-01',
    }, '# Feature\n\nTest content');

    const spec = await getSpec('20241101/001-feature');

    expect(spec).not.toBeNull();
    expect(spec?.name).toBe('001-feature');
    expect(spec?.date).toBe('20241101');
    expect(spec?.content).toContain('Test content');
  });

  it('should return null for non-existent spec', async () => {
    const spec = await getSpec('20241101/999-nonexistent');

    expect(spec).toBeNull();
  });

  it('should get spec by absolute path', async () => {
    const specDir = await createTestSpec(ctx.tmpDir, '20241101', '001-feature', {
      status: 'planned',
      created: '2024-11-01',
    });

    const spec = await getSpec(specDir);

    expect(spec).not.toBeNull();
    expect(spec?.name).toBe('001-feature');
  });

  it('should include content in result', async () => {
    await createTestSpec(ctx.tmpDir, '20241101', '001-feature', {
      status: 'planned',
      created: '2024-11-01',
    }, '# Feature\n\nDetailed content here');

    const spec = await getSpec('20241101/001-feature');

    expect(spec).not.toBeNull();
    expect(spec?.content).toBeDefined();
    expect(spec?.content).toContain('Detailed content here');
  });

  it('should parse frontmatter correctly', async () => {
    await createTestSpec(ctx.tmpDir, '20241101', '001-feature', {
      status: 'in-progress',
      created: '2024-11-01',
      tags: ['api', 'backend'],
      priority: 'high',
    });

    const spec = await getSpec('20241101/001-feature');

    expect(spec).not.toBeNull();
    expect(spec?.frontmatter.status).toBe('in-progress');
    expect(spec?.frontmatter.tags).toEqual(['api', 'backend']);
    expect(spec?.frontmatter.priority).toBe('high');
  });
});
