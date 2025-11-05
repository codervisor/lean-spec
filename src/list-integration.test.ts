import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { listSpecs } from './commands/list.js';
import { createSpec } from './commands/index.js';
import {
  createTestEnvironment,
  initTestProject,
  type TestContext,
} from './test-helpers.js';

describe('List command: Pattern-aware grouping', () => {
  let ctx: TestContext;
  let originalCwd: string;
  let consoleOutput: string[];

  // Capture console.log output for testing
  const originalLog = console.log;
  
  beforeEach(() => {
    consoleOutput = [];
    console.log = (...args: unknown[]) => {
      consoleOutput.push(args.map(arg => String(arg)).join(' '));
    };
  });

  afterEach(async () => {
    console.log = originalLog;
    if (originalCwd) process.chdir(originalCwd);
    if (ctx) await ctx.cleanup();
  });

  describe('Flat pattern', () => {
    beforeEach(async () => {
      ctx = await createTestEnvironment();
      originalCwd = process.cwd();
      process.chdir(ctx.tmpDir);
      
      // Initialize with flat pattern
      await initTestProject(ctx.tmpDir, {
        structure: {
          pattern: 'flat',
          dateFormat: 'YYYYMMDD',
          sequenceDigits: 3,
          defaultFile: 'README.md',
        },
      });

      // Create some specs
      await createSpec('first-spec', { title: 'First Spec' });
      await createSpec('second-spec', { title: 'Second Spec' });
      await createSpec('third-spec', { title: 'Third Spec' });
    });

    it('should render flat list without date grouping', async () => {
      await listSpecs();
      
      const output = consoleOutput.join('\n');
      
      // Should show spec list
      expect(output).toContain('Spec List');
      expect(output).toContain('001-first-spec');
      expect(output).toContain('002-second-spec');
      expect(output).toContain('003-third-spec');
      expect(output).toContain('Total: 3 specs');
      
      // Should NOT show date group headers (e.g., "📅 20251105/")
      expect(output).not.toMatch(/📅\s+\d{8}\//);
    });
  });

  describe('Date-grouped pattern', () => {
    beforeEach(async () => {
      ctx = await createTestEnvironment();
      originalCwd = process.cwd();
      process.chdir(ctx.tmpDir);
      
      // Initialize with date-grouped custom pattern
      await initTestProject(ctx.tmpDir, {
        structure: {
          pattern: 'custom',
          groupExtractor: '{YYYYMMDD}',
          dateFormat: 'YYYYMMDD',
          sequenceDigits: 3,
          defaultFile: 'README.md',
        },
      });

      // Create specs (will be organized by date folders)
      await createSpec('first-spec', { title: 'First Spec' });
      await createSpec('second-spec', { title: 'Second Spec' });
    });

    it('should render grouped list with date headers', async () => {
      await listSpecs();
      
      const output = consoleOutput.join('\n');
      
      // Should show spec list
      expect(output).toContain('Spec List');
      expect(output).toContain('001-first-spec');
      expect(output).toContain('002-second-spec');
      expect(output).toContain('Total: 2 specs');
      
      // Should show date group header (e.g., "📅 20251105/")
      expect(output).toMatch(/📅\s+\d{8}\//);
    });
  });

  describe('Custom-grouped pattern (non-date)', () => {
    beforeEach(async () => {
      ctx = await createTestEnvironment();
      originalCwd = process.cwd();
      process.chdir(ctx.tmpDir);
      
      // Initialize with milestone-grouped custom pattern
      await initTestProject(ctx.tmpDir, {
        structure: {
          pattern: 'custom',
          groupExtractor: 'milestone-{milestone}',
          groupFallback: 'milestone-backlog',
          dateFormat: 'YYYYMMDD',
          sequenceDigits: 3,
          defaultFile: 'README.md',
        },
        frontmatter: {
          custom: {
            milestone: 'string',
          },
        },
      });

      // Create specs with milestone field
      await createSpec('milestone-1-spec', {
        title: 'Milestone 1 Spec',
        fields: { milestone: '1' },
      });
      await createSpec('milestone-2-spec', {
        title: 'Milestone 2 Spec',
        fields: { milestone: '2' },
      });
    });

    it('should render grouped list with milestone headers', async () => {
      await listSpecs();
      
      const output = consoleOutput.join('\n');
      
      // Should show spec list
      expect(output).toContain('Spec List');
      expect(output).toContain('001-milestone-1-spec');
      expect(output).toContain('002-milestone-2-spec');
      expect(output).toContain('Total: 2 specs');
      
      // Should show milestone group headers
      expect(output).toMatch(/milestone-\d/);
    });
  });

  describe('Flat pattern with date prefix', () => {
    beforeEach(async () => {
      ctx = await createTestEnvironment();
      originalCwd = process.cwd();
      process.chdir(ctx.tmpDir);
      
      // Initialize with flat pattern but date prefix
      await initTestProject(ctx.tmpDir, {
        structure: {
          pattern: 'flat',
          prefix: '{YYYYMMDD}-',
          dateFormat: 'YYYYMMDD',
          sequenceDigits: 3,
          defaultFile: 'README.md',
        },
      });

      // Create some specs
      await createSpec('prefixed-spec', { title: 'Prefixed Spec' });
    });

    it('should render flat list even with date prefix in names', async () => {
      await listSpecs();
      
      const output = consoleOutput.join('\n');
      
      // Should show spec list
      expect(output).toContain('Spec List');
      expect(output).toMatch(/\d{8}-001-prefixed-spec/);
      expect(output).toContain('Total: 1 spec');
      
      // Should NOT show date group headers (prefix is in name, not a folder)
      expect(output).not.toMatch(/📅\s+\d{8}\//);
    });
  });
});
