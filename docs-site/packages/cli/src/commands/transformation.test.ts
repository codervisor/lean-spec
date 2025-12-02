import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { compressCommand } from './compress.js';
import { isolateCommand } from './isolate.js';
import {
  createTestEnvironment,
  initTestProject,
  type TestContext,
} from '../test-helpers.js';

describe('Transformation Commands (Spec 059)', () => {
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

  describe('compressCommand', () => {
    it('should replace line ranges with summary text (dry run)', async () => {
      // Create a test spec
      const specDir = path.join(ctx.tmpDir, 'specs', '001-test-spec');
      await fs.mkdir(specDir, { recursive: true });
      
      const content = [
        '---',
        'status: planned',
        'created: 2025-11-13T00:00:00.000Z',
        '---',
        '',
        '# Test Spec',
        '',
        '## Section 1',
        '',
        'Line 1',
        'Line 2',
        'Line 3',
        'Line 4',
        '',
        '## Section 2',
        '',
        'Keep this.',
      ].join('\n');
      
      await fs.writeFile(path.join(specDir, 'README.md'), content);
      
      // Test compress with dry run
      await compressCommand('001', {
        replaces: [{
          lines: '10-13',
          text: 'Summary line',
        }],
        dryRun: true,
      });
      
      // Verify file was not modified (dry run)
      const afterContent = await fs.readFile(path.join(specDir, 'README.md'), 'utf-8');
      expect(afterContent).toBe(content);
    });

    it('should actually replace content when not in dry run mode', async () => {
      // Create a test spec
      const specDir = path.join(ctx.tmpDir, 'specs', '002-test-spec');
      await fs.mkdir(specDir, { recursive: true });
      
      const content = [
        '---',
        'status: planned',
        'created: 2025-11-13T00:00:00.000Z',
        '---',
        '',
        '# Test Spec',
        '',
        '## Section 1',
        '',
        'Line 1',
        'Line 2',
        'Line 3',
        'Line 4',
        '',
        '## Section 2',
        '',
        'Keep this.',
      ].join('\n');
      
      await fs.writeFile(path.join(specDir, 'README.md'), content);
      
      // Apply compress
      await compressCommand('002', {
        replaces: [{
          lines: '10-13',
          text: 'Summary line',
        }],
      });
      
      // Verify content was replaced
      const afterContent = await fs.readFile(path.join(specDir, 'README.md'), 'utf-8');
      expect(afterContent).toContain('Summary line');
      expect(afterContent).not.toContain('Line 1');
      expect(afterContent).toContain('Keep this.');
    });
  });

  describe('isolateCommand', () => {
    it('should preview isolation without modifying files (dry run)', async () => {
      // Create a test spec
      const specDir = path.join(ctx.tmpDir, 'specs', '003-source-spec');
      await fs.mkdir(specDir, { recursive: true });
      
      const content = [
        '---',
        'status: planned',
        'created: 2025-11-13T00:00:00.000Z',
        '---',
        '',
        '# Source Spec',
        '',
        '## Section 1',
        '',
        'Keep this.',
        '',
        '## Section 2',
        '',
        'Isolate this section.',
        'More content.',
        '',
        '## Section 3',
        '',
        'Keep this too.',
      ].join('\n');
      
      await fs.writeFile(path.join(specDir, 'README.md'), content);
      
      // Test isolate with dry run
      await isolateCommand('003', {
        lines: '12-15',
        to: '004-isolated',
        dryRun: true,
      });
      
      // Verify source was not modified
      const afterContent = await fs.readFile(path.join(specDir, 'README.md'), 'utf-8');
      expect(afterContent).toBe(content);
      
      // Verify target was not created
      const targetDir = path.join(ctx.tmpDir, 'specs', '004-isolated');
      await expect(fs.access(targetDir)).rejects.toThrow();
    });

    it('should move content to new spec when not in dry run mode', async () => {
      // Create a test spec
      const specDir = path.join(ctx.tmpDir, 'specs', '005-source-spec');
      await fs.mkdir(specDir, { recursive: true });
      
      const content = [
        '---',
        'status: planned',
        'created: 2025-11-13T00:00:00.000Z',
        '---',
        '',
        '# Source Spec',
        '',
        '## Section 1',
        '',
        'Keep this.',
        '',
        '## Section 2',
        '',
        'Isolate this section.',
        'More content.',
        '',
        '## Section 3',
        '',
        'Keep this too.',
      ].join('\n');
      
      await fs.writeFile(path.join(specDir, 'README.md'), content);
      
      // Apply isolation
      await isolateCommand('005', {
        lines: '12-15',
        to: '006-isolated',
        addReference: true,
      });
      
      // Verify source was modified
      const sourceContent = await fs.readFile(path.join(specDir, 'README.md'), 'utf-8');
      expect(sourceContent).not.toContain('Isolate this section.');
      expect(sourceContent).toContain('Keep this.');
      expect(sourceContent).toContain('Keep this too.');
      expect(sourceContent).toContain('006-isolated'); // Cross-reference added
      
      // Verify target was created
      const targetDir = path.join(ctx.tmpDir, 'specs', '006-isolated');
      const targetContent = await fs.readFile(path.join(targetDir, 'README.md'), 'utf-8');
      expect(targetContent).toContain('Isolate this section.');
      expect(targetContent).toContain('More content.');
      
      // Verify target has frontmatter
      expect(targetContent).toMatch(/^---/);
      expect(targetContent).toContain('status: planned');
    });
  });
});
