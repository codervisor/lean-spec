import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { migrateCommand, scanDocuments } from './migrate.js';
import {
  createTestEnvironment,
  initTestProject,
  type TestContext,
} from '../test-helpers.js';

// Mock child_process at the top level
vi.mock('node:child_process', async () => {
  const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process');
  return {
    ...actual,
    execSync: vi.fn(),
  };
});

describe('migrate command', () => {
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

  describe('scanDocuments', () => {
    it('should find markdown files in directory', async () => {
      // Create test documents
      const testDir = path.join(ctx.tmpDir, 'test-docs');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, 'doc1.md'), '# Document 1');
      await fs.writeFile(path.join(testDir, 'doc2.md'), '# Document 2');
      await fs.writeFile(path.join(testDir, 'readme.txt'), 'Not markdown');

      const docs = await scanDocuments(testDir);

      expect(docs).toHaveLength(2);
      expect(docs[0].name).toBe('doc1.md');
      expect(docs[1].name).toBe('doc2.md');
    });

    it('should find markdown files recursively', async () => {
      // Create nested structure
      const testDir = path.join(ctx.tmpDir, 'test-docs');
      const subDir = path.join(testDir, 'subdir');
      await fs.mkdir(subDir, { recursive: true });
      await fs.writeFile(path.join(testDir, 'doc1.md'), '# Document 1');
      await fs.writeFile(path.join(subDir, 'doc2.md'), '# Document 2');

      const docs = await scanDocuments(testDir);

      expect(docs).toHaveLength(2);
    });

    it('should skip hidden directories', async () => {
      // Create hidden directory
      const testDir = path.join(ctx.tmpDir, 'test-docs');
      const hiddenDir = path.join(testDir, '.hidden');
      await fs.mkdir(hiddenDir, { recursive: true });
      await fs.writeFile(path.join(testDir, 'doc1.md'), '# Document 1');
      await fs.writeFile(path.join(hiddenDir, 'doc2.md'), '# Document 2');

      const docs = await scanDocuments(testDir);

      expect(docs).toHaveLength(1);
      expect(docs[0].name).toBe('doc1.md');
    });

    it('should skip node_modules', async () => {
      // Create node_modules directory
      const testDir = path.join(ctx.tmpDir, 'test-docs');
      const nmDir = path.join(testDir, 'node_modules');
      await fs.mkdir(nmDir, { recursive: true });
      await fs.writeFile(path.join(testDir, 'doc1.md'), '# Document 1');
      await fs.writeFile(path.join(nmDir, 'doc2.md'), '# Document 2');

      const docs = await scanDocuments(testDir);

      expect(docs).toHaveLength(1);
      expect(docs[0].name).toBe('doc1.md');
    });

    it('should handle .markdown extension', async () => {
      const testDir = path.join(ctx.tmpDir, 'test-docs');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, 'doc1.markdown'), '# Document 1');

      const docs = await scanDocuments(testDir);

      expect(docs).toHaveLength(1);
      expect(docs[0].name).toBe('doc1.markdown');
    });

    it('should return empty array for directory with no markdown files', async () => {
      const testDir = path.join(ctx.tmpDir, 'test-docs');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, 'readme.txt'), 'Not markdown');

      const docs = await scanDocuments(testDir);

      expect(docs).toHaveLength(0);
    });

    it('should include file size in results', async () => {
      const testDir = path.join(ctx.tmpDir, 'test-docs');
      await fs.mkdir(testDir, { recursive: true });
      const content = '# Document 1\n\nThis is a test document.';
      await fs.writeFile(path.join(testDir, 'doc1.md'), content);

      const docs = await scanDocuments(testDir);

      expect(docs).toHaveLength(1);
      expect(docs[0].size).toBeGreaterThan(0);
    });
  });

  describe('migrateCommand - manual mode', () => {
    it('should output migration instructions for valid directory', async () => {
      // Create test documents
      const testDir = path.join(ctx.tmpDir, 'test-adr');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, '0001-adr.md'), '# ADR 1');
      await fs.writeFile(path.join(testDir, '0002-adr.md'), '# ADR 2');

      // Capture console output
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        logs.push(args.join(' '));
      };

      try {
        await migrateCommand(testDir);

        // Verify output contains key elements
        const output = logs.join('\n');
        expect(output).toContain('LeanSpec Migration Instructions');
        expect(output).toContain('2 documents found');
        expect(output).toContain('lean-spec create');
        expect(output).toContain('lean-spec update');
        expect(output).toContain('lean-spec validate');
      } finally {
        console.log = originalLog;
      }
    });

    it('should exit with error for non-existent path', async () => {
      const exitSpy = { called: false };
      const originalExit = process.exit;
      process.exit = ((() => {
        exitSpy.called = true;
        throw new Error('process.exit');
      }) as any);

      try {
        await migrateCommand('/nonexistent/path').catch(() => {});
        expect(exitSpy.called).toBe(true);
      } finally {
        process.exit = originalExit;
      }
    });

    it('should exit with error for directory with no markdown files', async () => {
      const testDir = path.join(ctx.tmpDir, 'empty-dir');
      await fs.mkdir(testDir, { recursive: true });

      const exitSpy = { called: false };
      const originalExit = process.exit;
      process.exit = ((() => {
        exitSpy.called = true;
        throw new Error('process.exit');
      }) as any);

      try {
        await migrateCommand(testDir).catch(() => {});
        expect(exitSpy.called).toBe(true);
      } finally {
        process.exit = originalExit;
      }
    });
  });

  describe('migrateCommand - AI-assisted mode', () => {
    it('should show error when AI CLI not installed', async () => {
      // Create test documents
      const testDir = path.join(ctx.tmpDir, 'test-adr');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, '0001-adr.md'), '# ADR 1');

      // Mock execSync to simulate CLI not installed
      const { execSync } = await import('node:child_process');
      const mockExecSync = execSync as any;
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const exitSpy = { called: false, code: 0 };
      const originalExit = process.exit;
      process.exit = ((code?: number) => {
        exitSpy.called = true;
        exitSpy.code = code || 0;
        throw new Error('process.exit');
      }) as any;

      // Capture console output
      const errors: string[] = [];
      const originalError = console.error;
      console.error = (...args: any[]) => {
        errors.push(args.join(' '));
      };

      try {
        await migrateCommand(testDir, { aiProvider: 'copilot' }).catch(() => {});
        expect(exitSpy.called).toBe(true);
        expect(exitSpy.code).toBe(1);
        const errorOutput = errors.join('\n');
        expect(errorOutput).toContain('CLI not found');
        expect(errorOutput).toContain('Install:');
      } finally {
        process.exit = originalExit;
        console.error = originalError;
        mockExecSync.mockClear();
      }
    });

    it('should show placeholder message for AI-assisted mode', async () => {
      // This test verifies that AI provider option is accepted
      // and placeholder message is shown (no exit since it's not an error)
      const testDir = path.join(ctx.tmpDir, 'test-adr');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, '0001-adr.md'), '# ADR 1');

      // Mock execSync to simulate Claude CLI being installed
      const { execSync } = await import('node:child_process');
      const mockExecSync = execSync as any;
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes('which claude')) {
          return Buffer.from('/usr/local/bin/claude');
        }
        if (cmd.includes('claude --version')) {
          return Buffer.from('claude version 1.0.0');
        }
        return Buffer.from('');
      });

      // Mock console.log to capture output
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = ((...args: any[]) => {
        logs.push(args.join(' '));
      }) as any;

      try {
        await migrateCommand(testDir, { aiProvider: 'claude' });
        // Should show placeholder message
        const output = logs.join('\n');
        expect(output).toContain('AI-assisted migration is not yet fully implemented');
      } finally {
        console.log = originalLog;
        mockExecSync.mockClear();
      }
    });
  });
});
