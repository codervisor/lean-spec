/**
 * Integration tests for atomic spec operations
 * 
 * Tests that concurrent spec create/update operations don't corrupt files
 * when using atomic write operations.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import { readFile } from 'node:fs/promises';
import matter from 'gray-matter';
import {
  createTestEnvironment,
  initTestProject,
  getTestDate,
  type TestContext,
} from '../test-helpers.js';
import { createSpec, updateSpec } from '../commands/index.js';

describe('Atomic Spec Operations - Integration', () => {
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

  it('should handle concurrent spec updates without corruption', async () => {
    // Create a spec
    await createSpec('test-feature');
    
    const today = getTestDate();
    const specDir = path.join(ctx.tmpDir, 'specs', today, '001-test-feature');
    const specFile = path.join(specDir, 'README.md');

    // Perform concurrent updates to same spec
    await Promise.all([
      updateSpec(specDir, { status: 'in-progress' }),
      updateSpec(specDir, { priority: 'high' }),
      updateSpec(specDir, { tags: ['api', 'backend'] }),
    ]);

    // Verify file is valid (not corrupted)
    const content = await readFile(specFile, 'utf-8');
    const parsed = matter(content);
    
    // Should have valid frontmatter with all fields defined
    expect(parsed.data).toBeDefined();
    expect(parsed.data.status).toBeDefined();
    expect(parsed.data.created).toBeDefined();
    
    // At least some updates should have been applied
    // (last write wins, so we can't guarantee all are present)
    const hasUpdates = 
      parsed.data.status === 'in-progress' ||
      parsed.data.priority === 'high' ||
      (parsed.data.tags && parsed.data.tags.length > 0);
    
    expect(hasUpdates).toBe(true);
    
    // Content should be valid markdown with frontmatter
    expect(content).toContain('---');
    expect(content).toContain('# test-feature');
  });

  it('should handle concurrent spec creations without conflicts', async () => {
    // Create multiple specs concurrently
    // Note: Sequence numbering may have conflicts (expected), but file writes should be atomic
    const results = await Promise.allSettled([
      createSpec('feature-a'),
      createSpec('feature-b'),
      createSpec('feature-c'),
    ]);

    // At least some should succeed (atomic writes prevent corruption)
    const successful = results.filter(r => r.status === 'fulfilled');
    expect(successful.length).toBeGreaterThan(0);

    const today = getTestDate();
    const specsDir = path.join(ctx.tmpDir, 'specs', today);
    
    // Check that all created specs have valid content
    const { readdir } = await import('node:fs/promises');
    const specs = await readdir(specsDir, { withFileTypes: true });
    const specDirs = specs.filter(e => e.isDirectory());

    for (const dir of specDirs) {
      const readmePath = path.join(specsDir, dir.name, 'README.md');
      const content = await readFile(readmePath, 'utf-8');
      const parsed = matter(content);

      // Should have valid frontmatter
      expect(parsed.data.status).toBe('planned');
      expect(parsed.data.created).toBeDefined();
      
      // Content should be valid
      expect(content).toContain('---');
      expect(content).toContain('# feature-');
    }
  });

  it('should not leave temp files after operations', async () => {
    await createSpec('temp-test');
    
    const today = getTestDate();
    const specDir = path.join(ctx.tmpDir, 'specs', today, '001-temp-test');
    
    // Do multiple updates
    await updateSpec(specDir, { status: 'in-progress' });
    await updateSpec(specDir, { priority: 'high' });
    await updateSpec(specDir, { tags: ['test'] });

    // Check for temp files
    const { readdir } = await import('node:fs/promises');
    const files = await readdir(specDir);
    const tempFiles = files.filter(f => f.includes('.tmp-'));

    expect(tempFiles).toHaveLength(0);
  });

  it('should maintain file integrity across rapid updates', async () => {
    await createSpec('rapid-update');
    
    const today = getTestDate();
    const specDir = path.join(ctx.tmpDir, 'specs', today, '001-rapid-update');
    const specFile = path.join(specDir, 'README.md');

    // Perform many rapid updates
    const updates = [];
    for (let i = 0; i < 10; i++) {
      updates.push(
        updateSpec(specDir, { 
          tags: [`tag-${i}`],
          priority: i % 2 === 0 ? 'high' : 'low'
        })
      );
    }

    await Promise.all(updates);

    // File should still be valid
    const content = await readFile(specFile, 'utf-8');
    const parsed = matter(content);

    expect(parsed.data).toBeDefined();
    expect(parsed.data.status).toBeDefined();
    expect(parsed.data.created).toBeDefined();
    
    // Should be valid YAML
    expect(() => matter(content)).not.toThrow();
  });

  it('should handle update during read operations', async () => {
    await createSpec('read-write-test');
    
    const today = getTestDate();
    const specDir = path.join(ctx.tmpDir, 'specs', today, '001-read-write-test');
    const specFile = path.join(specDir, 'README.md');

    // Start update operation
    const updatePromise = updateSpec(specDir, { status: 'in-progress' });
    
    // Immediately read file (simulating concurrent read)
    const readPromise = readFile(specFile, 'utf-8').then(content => {
      const parsed = matter(content);
      return parsed.data;
    });

    const [, readData] = await Promise.all([updatePromise, readPromise]);

    // Read should get either old or new data, but valid data
    expect(readData).toBeDefined();
    expect(readData.created).toBeDefined();
    expect(['planned', 'in-progress']).toContain(readData.status);
  });
});
