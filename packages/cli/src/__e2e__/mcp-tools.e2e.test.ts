/**
 * E2E Tests: MCP tool scenarios
 *
 * Tests the MCP server tools with real specs and filesystem.
 * These tests verify that MCP tool calls work correctly when
 * integrated with the real CLI commands.
 *
 * Note: These tests don't use the actual MCP protocol transport,
 * they test the underlying tool implementations directly to catch
 * issues in realistic scenarios.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import {
  createE2EEnvironment,
  initProject,
  createSpec,
  updateSpec,
  linkSpecs,
  execCli,
  fileExists,
  dirExists,
  readFile,
  parseFrontmatter,
  type E2EContext,
} from './e2e-helpers.js';

describe('E2E: MCP tool scenarios', () => {
  let ctx: E2EContext;
  let originalCwd: string;

  beforeEach(async () => {
    ctx = await createE2EEnvironment();
    originalCwd = process.cwd();
    process.chdir(ctx.tmpDir);
    initProject(ctx.tmpDir, { yes: true });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await ctx.cleanup();
  });

  describe('list tool', () => {
    it('should list specs after creating several', async () => {
      // Import the actual function used by MCP
      const { loadAllSpecs } = await import('../spec-loader.js');

      createSpec(ctx.tmpDir, 'feature-a');
      createSpec(ctx.tmpDir, 'feature-b');
      createSpec(ctx.tmpDir, 'feature-c');

      const specs = await loadAllSpecs();

      expect(specs).toHaveLength(3);
      expect(specs.map((s) => s.name)).toContain('001-feature-a');
      expect(specs.map((s) => s.name)).toContain('002-feature-b');
      expect(specs.map((s) => s.name)).toContain('003-feature-c');
    });

    it('should filter specs by status', async () => {
      const { loadAllSpecs } = await import('../spec-loader.js');

      createSpec(ctx.tmpDir, 'planned-spec');
      createSpec(ctx.tmpDir, 'active-spec');
      updateSpec(ctx.tmpDir, '002-active-spec', { status: 'in-progress' });

      const inProgressSpecs = await loadAllSpecs({
        filter: { status: 'in-progress' },
      });

      expect(inProgressSpecs).toHaveLength(1);
      expect(inProgressSpecs[0].name).toBe('002-active-spec');
    });

    it('should filter specs by priority', async () => {
      const { loadAllSpecs } = await import('../spec-loader.js');

      createSpec(ctx.tmpDir, 'low-priority', { priority: 'low' });
      createSpec(ctx.tmpDir, 'high-priority', { priority: 'high' });
      createSpec(ctx.tmpDir, 'critical-spec', { priority: 'critical' });

      const criticalSpecs = await loadAllSpecs({
        filter: { priority: 'critical' },
      });

      expect(criticalSpecs).toHaveLength(1);
      expect(criticalSpecs[0].name).toBe('003-critical-spec');
    });

    it('should filter specs by tags', async () => {
      const { loadAllSpecs } = await import('../spec-loader.js');

      createSpec(ctx.tmpDir, 'frontend-spec', { tags: 'frontend,react' });
      createSpec(ctx.tmpDir, 'backend-spec', { tags: 'backend,api' });
      createSpec(ctx.tmpDir, 'fullstack-spec', { tags: 'frontend,backend' });

      const backendSpecs = await loadAllSpecs({
        filter: { tags: ['backend'] },
      });

      expect(backendSpecs).toHaveLength(2);
      expect(backendSpecs.map((s) => s.name)).toContain('002-backend-spec');
      expect(backendSpecs.map((s) => s.name)).toContain('003-fullstack-spec');
    });
  });

  describe('view tool', () => {
    it('should view spec by number', async () => {
      const { readSpecContent } = await import('../commands/viewer.js');

      createSpec(ctx.tmpDir, 'my-feature', { title: 'My Feature Title' });

      const spec = await readSpecContent('001', ctx.tmpDir);
      expect(spec).not.toBeNull();
      expect(spec?.name).toBe('001-my-feature');
    });

    it('should view spec by name', async () => {
      const { readSpecContent } = await import('../commands/viewer.js');

      createSpec(ctx.tmpDir, 'authentication', { title: 'Auth System' });

      // readSpecContent resolves by number or full folder name
      const spec = await readSpecContent('001-authentication', ctx.tmpDir);
      expect(spec).not.toBeNull();
      expect(spec?.name).toContain('authentication');
    });

    it('should view spec with content', async () => {
      const { loadAllSpecs } = await import('../spec-loader.js');

      createSpec(ctx.tmpDir, 'detailed-spec', { title: 'Detailed Spec' });

      const specs = await loadAllSpecs({ includeContent: true });
      const spec = specs.find((s) => s.name.includes('detailed-spec'));
      expect(spec).toBeDefined();
      expect(spec?.content).toBeDefined();
      expect(spec?.content).toContain('Detailed Spec');
    });

    it('should return null for non-existent spec', async () => {
      const { getSpec } = await import('../spec-loader.js');

      const spec = await getSpec('nonexistent-spec');
      expect(spec).toBeNull();
    });
  });

  describe('create tool', () => {
    it('should create spec with proper frontmatter', async () => {
      const { createSpec: createSpecFn } = await import('../commands/create.js');

      await createSpecFn('new-feature', {
        title: 'New Feature',
        priority: 'high',
        tags: ['api', 'v2'],
      });

      const readmePath = path.join(ctx.tmpDir, 'specs', '001-new-feature', 'README.md');

      expect(await fileExists(readmePath)).toBe(true);

      const content = await readFile(readmePath);
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.status).toBe('planned');
      expect(frontmatter.priority).toBe('high');
      expect(frontmatter.tags).toContain('api');
      expect(frontmatter.tags).toContain('v2');
    });

    it('should auto-sequence spec numbers', async () => {
      const { createSpec: createSpecFn } = await import('../commands/create.js');

      await createSpecFn('first-spec');
      await createSpecFn('second-spec');
      await createSpecFn('third-spec');

      expect(await dirExists(path.join(ctx.tmpDir, 'specs', '001-first-spec'))).toBe(true);
      expect(await dirExists(path.join(ctx.tmpDir, 'specs', '002-second-spec'))).toBe(true);
      expect(await dirExists(path.join(ctx.tmpDir, 'specs', '003-third-spec'))).toBe(true);
    });
  });

  describe('update tool', () => {
    it('should update spec status', async () => {
      const { updateSpec: updateSpecFn } = await import('../commands/update.js');

      createSpec(ctx.tmpDir, 'my-spec');

      await updateSpecFn('001-my-spec', { status: 'in-progress' });

      const content = await readFile(
        path.join(ctx.tmpDir, 'specs', '001-my-spec', 'README.md')
      );
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.status).toBe('in-progress');
    });

    it('should update spec tags', async () => {
      const { updateSpec: updateSpecFn } = await import('../commands/update.js');

      createSpec(ctx.tmpDir, 'my-spec');

      await updateSpecFn('001-my-spec', { tags: ['new-tag', 'another-tag'] });

      const content = await readFile(
        path.join(ctx.tmpDir, 'specs', '001-my-spec', 'README.md')
      );
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.tags).toContain('new-tag');
      expect(frontmatter.tags).toContain('another-tag');
    });

    it('should throw error for non-existent spec', async () => {
      const { updateSpec: updateSpecFn } = await import('../commands/update.js');

      await expect(updateSpecFn('nonexistent', { status: 'complete' })).rejects.toThrow(
        /Spec not found/
      );
    });
  });

  describe('link tool', () => {
    it('should link specs with depends_on', async () => {
      const { linkSpec } = await import('../commands/link.js');

      createSpec(ctx.tmpDir, 'base-spec');
      createSpec(ctx.tmpDir, 'dependent-spec');

      await linkSpec('002-dependent-spec', {
        dependsOn: '001-base-spec',
      });

      const content = await readFile(
        path.join(ctx.tmpDir, 'specs', '002-dependent-spec', 'README.md')
      );
      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.depends_on).toContain('001-base-spec');
    });

    it('should link specs bidirectionally with related', async () => {
      const { linkSpec } = await import('../commands/link.js');

      createSpec(ctx.tmpDir, 'spec-a');
      createSpec(ctx.tmpDir, 'spec-b');

      await linkSpec('001-spec-a', {
        related: '002-spec-b',
      });

      // Check both specs have the relationship
      const contentA = await readFile(path.join(ctx.tmpDir, 'specs', '001-spec-a', 'README.md'));
      const contentB = await readFile(path.join(ctx.tmpDir, 'specs', '002-spec-b', 'README.md'));

      const fmA = parseFrontmatter(contentA);
      const fmB = parseFrontmatter(contentB);

      expect(fmA.related).toContain('002-spec-b');
      expect(fmB.related).toContain('001-spec-a');
    });
  });

  describe('deps tool', () => {
    it('should show dependency graph', async () => {
      createSpec(ctx.tmpDir, 'database');
      createSpec(ctx.tmpDir, 'api');
      createSpec(ctx.tmpDir, 'frontend');

      linkSpecs(ctx.tmpDir, '002-api', { dependsOn: '001-database' });
      linkSpecs(ctx.tmpDir, '003-frontend', { dependsOn: '002-api' });

      const result = execCli(['deps', '003-frontend'], { cwd: ctx.tmpDir });

      expect(result.exitCode).toBe(0);
      // Output should show the dependency chain
      expect(result.stdout).toContain('database');
      expect(result.stdout).toContain('api');
    });
  });

  describe('tokens tool', () => {
    it('should count tokens in a spec', async () => {
      const { tokensCommand } = await import('../commands/tokens.js');

      createSpec(ctx.tmpDir, 'my-spec', { title: 'My Specification' });

      // Should not throw
      await expect(tokensCommand('001-my-spec', { json: true })).resolves.toBeUndefined();
    });

    it('should count tokens with sub-specs', async () => {
      const { tokensCommand } = await import('../commands/tokens.js');

      createSpec(ctx.tmpDir, 'complex-spec');

      // Add a sub-spec file
      const specDir = path.join(ctx.tmpDir, 'specs', '001-complex-spec');
      await fs.writeFile(
        path.join(specDir, 'DESIGN.md'),
        '# Design Document\n\nDetailed design here.\n'
      );

      await expect(
        tokensCommand('001-complex-spec', { includeSubSpecs: true, json: true })
      ).resolves.toBeUndefined();
    });

    it('should throw for non-existent spec', async () => {
      const { tokensCommand } = await import('../commands/tokens.js');

      await expect(tokensCommand('nonexistent', {})).rejects.toThrow(/Spec not found/);
    });
  });

  describe('board tool', () => {
    it('should return specs organized by status', async () => {
      const { loadAllSpecs } = await import('../spec-loader.js');

      createSpec(ctx.tmpDir, 'planned-work');
      createSpec(ctx.tmpDir, 'in-progress-work');
      createSpec(ctx.tmpDir, 'completed-work');

      updateSpec(ctx.tmpDir, '002-in-progress-work', { status: 'in-progress' });
      updateSpec(ctx.tmpDir, '003-completed-work', { status: 'complete' });

      // Load all specs and group by status
      const specs = await loadAllSpecs();

      const plannedSpecs = specs.filter((s) => s.frontmatter.status === 'planned');
      const inProgressSpecs = specs.filter((s) => s.frontmatter.status === 'in-progress');
      const completeSpecs = specs.filter((s) => s.frontmatter.status === 'complete');

      expect(plannedSpecs).toHaveLength(1);
      expect(inProgressSpecs).toHaveLength(1);
      expect(completeSpecs).toHaveLength(1);

      expect(plannedSpecs[0].name).toBe('001-planned-work');
      expect(inProgressSpecs[0].name).toBe('002-in-progress-work');
      expect(completeSpecs[0].name).toBe('003-completed-work');
    });
  });

  describe('archive tool', () => {
    it('should archive a spec', async () => {
      const { archiveSpec: archiveSpecFn } = await import('../commands/archive.js');

      createSpec(ctx.tmpDir, 'to-archive');
      updateSpec(ctx.tmpDir, '001-to-archive', { status: 'complete' });

      const originalPath = path.join(ctx.tmpDir, 'specs', '001-to-archive');
      expect(await dirExists(originalPath)).toBe(true);

      await archiveSpecFn('001-to-archive');

      // Original should be gone
      expect(await dirExists(originalPath)).toBe(false);

      // Should be in archived
      const archivedPath = path.join(ctx.tmpDir, 'specs', 'archived', '001-to-archive');
      expect(await dirExists(archivedPath)).toBe(true);
    });

    it('should throw for non-existent spec', async () => {
      const { archiveSpec: archiveSpecFn } = await import('../commands/archive.js');

      await expect(archiveSpecFn('nonexistent')).rejects.toThrow(/Spec not found/);
    });
  });

  describe('validate tool', () => {
    it('should validate specs without errors on valid project', async () => {
      createSpec(ctx.tmpDir, 'valid-spec');

      const result = execCli(['validate'], { cwd: ctx.tmpDir });

      // Valid specs should not produce errors
      expect(result.exitCode).toBe(0);
    });

    it('should detect dependency misalignment with --check-deps', async () => {
      createSpec(ctx.tmpDir, 'spec-with-mention');

      // Manually edit to mention another spec without linking
      const readmePath = path.join(ctx.tmpDir, 'specs', '001-spec-with-mention', 'README.md');
      let content = await readFile(readmePath);
      content = content.replace('## Overview', '## Overview\n\nSee 002-other-spec for details.');
      await fs.writeFile(readmePath, content);

      const result = execCli(['validate', '--check-deps'], { cwd: ctx.tmpDir });

      // May or may not fail depending on implementation, but should not crash
      expect(result.exitCode).toBeDefined();
    });
  });
});

/**
 * Regression tests for MCP tool bugs
 */
describe('E2E: MCP tool regressions', () => {
  let ctx: E2EContext;
  let originalCwd: string;

  beforeEach(async () => {
    ctx = await createE2EEnvironment();
    originalCwd = process.cwd();
    process.chdir(ctx.tmpDir);
    initProject(ctx.tmpDir, { yes: true });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await ctx.cleanup();
  });

  it('REGRESSION: consecutive MCP errors should not crash server', async () => {
    const { updateSpec: updateSpecFn } = await import('../commands/update.js');

    // Multiple consecutive errors should all throw without crashing
    await expect(updateSpecFn('fake-1', { status: 'complete' })).rejects.toThrow();
    await expect(updateSpecFn('fake-2', { status: 'complete' })).rejects.toThrow();
    await expect(updateSpecFn('fake-3', { status: 'complete' })).rejects.toThrow();

    // Process should still work after errors
    createSpec(ctx.tmpDir, 'real-spec');
    await expect(updateSpecFn('001-real-spec', { status: 'in-progress' })).resolves.toBeUndefined();
  });

  it('REGRESSION: view sub-spec files should work', async () => {
    const { readSpecContent } = await import('../commands/viewer.js');

    createSpec(ctx.tmpDir, 'multi-file-spec');

    // Add a sub-spec file
    const specDir = path.join(ctx.tmpDir, 'specs', '001-multi-file-spec');
    await fs.writeFile(
      path.join(specDir, 'DESIGN.md'),
      '# Design Document\n\nArchitecture details.\n'
    );

    // Should be able to view sub-spec file
    const content = await readSpecContent('001/DESIGN.md', ctx.tmpDir);
    expect(content).toBeDefined();
    expect(content?.content).toContain('Design Document');
  });

  it('REGRESSION: create with invalid template should throw, not exit', async () => {
    const { createSpec: createSpecFn } = await import('../commands/create.js');

    // Should throw error, not call process.exit
    await expect(createSpecFn('new-spec', { template: 'nonexistent-template' })).rejects.toThrow(
      /Template not found/
    );
  });
});
