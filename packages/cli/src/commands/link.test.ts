import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import { linkSpec } from './link.js';
import { unlinkSpec } from './unlink.js';
import { createSpec } from './create.js';
import { parseFrontmatter } from '../frontmatter.js';
import {
  createTestEnvironment,
  initTestProject,
  type TestContext,
} from '../test-helpers.js';

describe('link and unlink commands', () => {
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

  /**
   * Helper to get spec README path - uses date-based structure
   */
  function getSpecPath(specName: string): string {
    const today = getTestDate();
    return path.join(ctx.tmpDir, 'specs', today, specName, 'README.md');
  }

  /**
   * Helper to get test date in YYYYMMDD format
   */
  function getTestDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * Helper to read frontmatter
   */
  async function getFrontmatter(specName: string): Promise<any> {
    const specPath = getSpecPath(specName);
    const fm = await parseFrontmatter(specPath);
    if (!fm) {
      throw new Error(`Failed to parse frontmatter from ${specPath}`);
    }
    return fm;
  }

  describe('linkSpec', () => {
    it('should add a dependency to a spec', async () => {
      // Create two specs
      await createSpec('spec-a');
      await createSpec('spec-b');

      // Link spec-a to depend on spec-b
      await linkSpec('001-spec-a', { dependsOn: '002-spec-b' });

      // Verify dependency was added
      const frontmatter = await getFrontmatter('001-spec-a');
      expect(frontmatter.depends_on).toContain('002-spec-b');
    });

    it('should add multiple dependencies at once', async () => {
      await createSpec('spec-a');
      await createSpec('spec-b');
      await createSpec('spec-c');

      // Link spec-a to depend on spec-b and spec-c
      await linkSpec('001-spec-a', { dependsOn: '002-spec-b,003-spec-c' });

      const frontmatter = await getFrontmatter('001-spec-a');
      expect(frontmatter.depends_on).toContain('002-spec-b');
      expect(frontmatter.depends_on).toContain('003-spec-c');
    });

    it('should add related specs bidirectionally', async () => {
      await createSpec('spec-a');
      await createSpec('spec-b');

      // Link spec-a as related to spec-b
      await linkSpec('001-spec-a', { related: '002-spec-b' });

      // Verify spec-a has spec-b as related
      const frontmatterA = await getFrontmatter('001-spec-a');
      expect(frontmatterA.related).toContain('002-spec-b');

      // Verify spec-b has spec-a as related (bidirectional)
      const frontmatterB = await getFrontmatter('002-spec-b');
      expect(frontmatterB.related).toContain('001-spec-a');
    });

    it('should be idempotent when adding existing dependency', async () => {
      await createSpec('spec-a');
      await createSpec('spec-b');

      // Add dependency twice
      await linkSpec('001-spec-a', { dependsOn: '002-spec-b' });
      await linkSpec('001-spec-a', { dependsOn: '002-spec-b' });

      // Should only appear once
      const frontmatter = await getFrontmatter('001-spec-a');
      const count = frontmatter.depends_on.filter((d: string) => d === '002-spec-b').length;
      expect(count).toBe(1);
    });

    it('should reject self-reference', async () => {
      await createSpec('spec-a');

      // Try to link spec to itself
      await expect(
        linkSpec('001-spec-a', { dependsOn: '001-spec-a' })
      ).rejects.toThrow('Cannot link spec to itself');
    });

    it('should reject non-existent spec', async () => {
      await createSpec('spec-a');

      // Try to link to non-existent spec
      await expect(
        linkSpec('001-spec-a', { dependsOn: '999-nonexistent' })
      ).rejects.toThrow('Spec not found: 999-nonexistent');
    });

    it('should work with spec numbers only', async () => {
      await createSpec('spec-a');
      await createSpec('spec-b');

      // Link using just numbers
      await linkSpec('1', { dependsOn: '2' });

      const frontmatter = await getFrontmatter('001-spec-a');
      expect(frontmatter.depends_on).toContain('002-spec-b');
    });
  });

  describe('unlinkSpec', () => {
    it('should remove a dependency from a spec', async () => {
      await createSpec('spec-a');
      await createSpec('spec-b');

      // Add then remove dependency
      await linkSpec('001-spec-a', { dependsOn: '002-spec-b' });
      await unlinkSpec('001-spec-a', { dependsOn: '002-spec-b' });

      // Verify dependency was removed
      const frontmatter = await getFrontmatter('001-spec-a');
      expect(frontmatter.depends_on || []).not.toContain('002-spec-b');
    });

    it('should remove related specs bidirectionally', async () => {
      await createSpec('spec-a');
      await createSpec('spec-b');

      // Add then remove related
      await linkSpec('001-spec-a', { related: '002-spec-b' });
      await unlinkSpec('001-spec-a', { related: '002-spec-b' });

      // Verify spec-a no longer has spec-b as related
      const frontmatterA = await getFrontmatter('001-spec-a');
      expect(frontmatterA.related || []).not.toContain('002-spec-b');

      // Verify spec-b no longer has spec-a as related (bidirectional)
      const frontmatterB = await getFrontmatter('002-spec-b');
      expect(frontmatterB.related || []).not.toContain('001-spec-a');
    });

    it('should remove all dependencies with --all flag', async () => {
      await createSpec('spec-a');
      await createSpec('spec-b');
      await createSpec('spec-c');

      // Add multiple dependencies
      await linkSpec('001-spec-a', { dependsOn: '002-spec-b,003-spec-c' });

      // Remove all dependencies
      await unlinkSpec('001-spec-a', { dependsOn: true, all: true });

      // Verify all dependencies removed
      const frontmatter = await getFrontmatter('001-spec-a');
      expect(frontmatter.depends_on || []).toHaveLength(0);
    });

    it('should handle removing non-existent dependency gracefully', async () => {
      await createSpec('spec-a');
      await createSpec('spec-b');

      // Try to remove a dependency that doesn't exist (should not throw)
      await expect(
        unlinkSpec('001-spec-a', { dependsOn: '002-spec-b' })
      ).resolves.not.toThrow();
    });

    it('should remove specific dependencies while keeping others', async () => {
      await createSpec('spec-a');
      await createSpec('spec-b');
      await createSpec('spec-c');

      // Add two dependencies
      await linkSpec('001-spec-a', { dependsOn: '002-spec-b,003-spec-c' });

      // Remove only one
      await unlinkSpec('001-spec-a', { dependsOn: '002-spec-b' });

      // Verify spec-b removed but spec-c remains
      const frontmatter = await getFrontmatter('001-spec-a');
      expect(frontmatter.depends_on).not.toContain('002-spec-b');
      expect(frontmatter.depends_on).toContain('003-spec-c');
    });
  });

  describe('cycle detection', () => {
    it('should not block dependency cycles', async () => {
      await createSpec('spec-a');
      await createSpec('spec-b');
      await createSpec('spec-c');

      // Create a cycle: A -> B -> C -> A
      await linkSpec('001-spec-a', { dependsOn: '002-spec-b' });
      await linkSpec('002-spec-b', { dependsOn: '003-spec-c' });
      await linkSpec('003-spec-c', { dependsOn: '001-spec-a' });

      // Dependency should still be added despite cycle
      const frontmatter = await getFrontmatter('003-spec-c');
      expect(frontmatter.depends_on).toContain('001-spec-a');
    });
  });
});
