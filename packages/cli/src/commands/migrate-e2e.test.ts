import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrateCommand, scanDocuments } from './migrate.js';
import {
  createTestEnvironment,
  initTestProject,
  type TestContext,
} from '../test-helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('End-to-end migration workflows', () => {
  let ctx: TestContext;
  let originalCwd: string;
  const fixturesRoot = path.resolve(__dirname, '../../test-fixtures/migration-samples');

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

  describe('spec-kit migration workflow', () => {
    it('should provide migration instructions for spec-kit sample', async () => {
      const specKitRoot = path.join(fixturesRoot, 'spec-kit-sample', '.specify', 'specs');

      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        logs.push(args.join(' '));
      };

      try {
        await migrateCommand(specKitRoot);

        const output = logs.join('\n');

        // Should provide general migration guidance
        expect(output).toContain('LeanSpec Migration Instructions');
        expect(output).toContain('lean-spec create');
        expect(output).toContain('lean-spec update');
        expect(output).toContain('lean-spec validate');

        // Should mention found documents
        expect(output).toMatch(/\d+ documents? found/);
      } finally {
        console.log = originalLog;
      }
    });

    it('should identify spec-kit structure characteristics', async () => {
      const specKitRoot = path.join(fixturesRoot, 'spec-kit-sample', '.specify', 'specs');
      const docs = await scanDocuments(specKitRoot);

      // spec-kit already uses numbered folders
      const paths = docs.map(d => d.path);
      const hasNumberedFolders = paths.some(p => /\/\d{3}-/.test(p));
      expect(hasNumberedFolders).toBe(true);

      // Contains both simple and complex specs
      const taskMgmtDocs = docs.filter(d => d.path.includes('001-task-management'));
      const authDocs = docs.filter(d => d.path.includes('002-user-authentication'));

      // Task management is complex (multiple files)
      expect(taskMgmtDocs.length).toBeGreaterThan(1);

      // User authentication is simple (single file)
      expect(authDocs.length).toBe(1);
    });

    it('should handle multi-file spec structure', async () => {
      const taskMgmtPath = path.join(
        fixturesRoot,
        'spec-kit-sample',
        '.specify',
        'specs',
        '001-task-management'
      );
      const docs = await scanDocuments(taskMgmtPath);

      // Should find multiple markdown files
      expect(docs.length).toBeGreaterThanOrEqual(3);

      const fileNames = docs.map(d => d.name);
      expect(fileNames).toContain('spec.md');
      expect(fileNames).toContain('plan.md');
      expect(fileNames).toContain('tasks.md');

      // All should have content
      docs.forEach(doc => {
        expect(doc.size).toBeGreaterThan(0);
      });
    });
  });

  describe('OpenSpec migration workflow', () => {
    it('should provide migration instructions for OpenSpec sample', async () => {
      const openSpecRoot = path.join(fixturesRoot, 'openspec-sample', 'openspec');

      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        logs.push(args.join(' '));
      };

      try {
        await migrateCommand(openSpecRoot);

        const output = logs.join('\n');

        // Should provide migration guidance
        expect(output).toContain('LeanSpec Migration Instructions');
        expect(output).toContain('4 documents found'); // auth, api-gateway, user-management, oauth-integration
      } finally {
        console.log = originalLog;
      }
    });

    it('should identify split directory structure', async () => {
      const openSpecRoot = path.join(fixturesRoot, 'openspec-sample', 'openspec');
      const specsPath = path.join(openSpecRoot, 'specs');
      const archivePath = path.join(openSpecRoot, 'changes', 'archive');

      const specsDocs = await scanDocuments(specsPath);
      const archiveDocs = await scanDocuments(archivePath);

      // Should have docs in both locations
      expect(specsDocs.length).toBe(3); // Active specs
      expect(archiveDocs.length).toBe(1); // Archived spec

      // All use same filename
      const allDocs = [...specsDocs, ...archiveDocs];
      expect(allDocs.every(d => d.name === 'spec.md')).toBe(true);
    });

    it('should identify missing numbering in folders', async () => {
      const specsPath = path.join(fixturesRoot, 'openspec-sample', 'openspec', 'specs');
      const docs = await scanDocuments(specsPath);

      const paths = docs.map(d => d.path);

      // Should have named folders without numbers
      expect(paths.some(p => p.includes('/auth/'))).toBe(true);
      expect(paths.some(p => p.includes('/api-gateway/'))).toBe(true);
      expect(paths.some(p => p.includes('/user-management/'))).toBe(true);

      // Should NOT have numbered folders
      expect(paths.every(p => !/\/\d{3}-/.test(p))).toBe(true);
    });

    it('should verify archived spec has date-based folder', async () => {
      const archivePath = path.join(
        fixturesRoot,
        'openspec-sample',
        'openspec',
        'changes',
        'archive'
      );
      const docs = await scanDocuments(archivePath);

      expect(docs.length).toBe(1);

      const archivedPath = docs[0].path;
      // Should be in date-based folder (YYYY-MM-DD format)
      expect(archivedPath).toMatch(/\d{4}-\d{2}-\d{2}-/);
      expect(archivedPath).toContain('oauth-integration');
    });
  });

  describe('ADR migration workflow', () => {
    it('should provide migration instructions for ADR sample', async () => {
      const adrRoot = path.join(fixturesRoot, 'adr-sample', 'docs', 'adr');

      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        logs.push(args.join(' '));
      };

      try {
        await migrateCommand(adrRoot);

        const output = logs.join('\n');

        // Should provide migration guidance
        expect(output).toContain('LeanSpec Migration Instructions');
        expect(output).toContain('4 documents found');
      } finally {
        console.log = originalLog;
      }
    });

    it('should identify flat file structure', async () => {
      const adrRoot = path.join(fixturesRoot, 'adr-sample', 'docs', 'adr');
      const docs = await scanDocuments(adrRoot);

      // All in same directory
      const dirs = docs.map(d => path.dirname(d.path));
      const uniqueDirs = [...new Set(dirs)];
      expect(uniqueDirs.length).toBe(1);

      // All are markdown files (not in subdirectories)
      expect(docs.every(d => d.name.endsWith('.md'))).toBe(true);
    });

    it('should identify sparse numbering scheme', async () => {
      const adrRoot = path.join(fixturesRoot, 'adr-sample', 'docs', 'adr');
      const docs = await scanDocuments(adrRoot);

      const fileNames = docs.map(d => d.name).sort();

      // Extract numbers from filenames
      const numbers = fileNames.map(name => {
        const match = name.match(/^(\d+)-/);
        return match ? parseInt(match[1], 10) : 0;
      });

      // Should have sparse numbering
      expect(numbers).toContain(1);
      expect(numbers).toContain(42);
      expect(numbers).toContain(105);
      expect(numbers).toContain(203);

      // Gaps indicate need for renumbering
      expect(Math.max(...numbers)).toBeGreaterThan(numbers.length * 10);
    });

    it('should parse ADR status from content', async () => {
      const adrPath = path.join(
        fixturesRoot,
        'adr-sample',
        'docs',
        'adr',
        '0001-use-microservices.md'
      );

      const content = await fs.readFile(adrPath, 'utf-8');

      // Should contain ADR status section
      expect(content).toContain('## Status');
      expect(content).toContain('Accepted');

      // Should have decision date
      expect(content).toMatch(/Date:\s*\d{4}-\d{2}-\d{2}/);
    });

    it('should identify ADR structure requiring mapping', async () => {
      const adrRoot = path.join(fixturesRoot, 'adr-sample', 'docs', 'adr');
      const docs = await scanDocuments(adrRoot);

      for (const doc of docs) {
        const content = await fs.readFile(doc.path, 'utf-8');

        // All ADRs should have standard structure
        expect(content).toContain('## Status');
        expect(content).toContain('## Context');
        expect(content).toContain('## Decision');
        expect(content).toContain('## Consequences');
      }
    });
  });

  describe('Mixed content migration', () => {
    it('should handle entire migration-samples directory', async () => {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        logs.push(args.join(' '));
      };

      try {
        await migrateCommand(fixturesRoot);

        const output = logs.join('\n');

        // Should find all markdown files across all samples
        expect(output).toContain('LeanSpec Migration Instructions');
        expect(output).toMatch(/\d+ documents? found/);
      } finally {
        console.log = originalLog;
      }
    });

    it('should find documentation alongside samples', async () => {
      const docs = await scanDocuments(fixturesRoot);

      const fileNames = docs.map(d => d.name);

      // Should include guide files
      expect(fileNames).toContain('README.md');
      expect(fileNames).toContain('QUICK-START.md');
      expect(fileNames).toContain('EXPECTED-OUTPUT.md');
      expect(fileNames).toContain('SUMMARY.md');
      expect(fileNames).toContain('INDEX.md');

      // Should include spec files
      expect(fileNames).toContain('spec.md');
    });
  });

  describe('Migration output validation', () => {
    it('should provide clear step-by-step instructions', async () => {
      const specKitRoot = path.join(fixturesRoot, 'spec-kit-sample', '.specify', 'specs');

      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        logs.push(args.join(' '));
      };

      try {
        await migrateCommand(specKitRoot);

        const output = logs.join('\n');

        // Should have numbered steps
        expect(output).toMatch(/1\.\s+Analyze/i);
        expect(output).toMatch(/2\.\s+.*extract/i);
        expect(output).toMatch(/3\.\s+Migrate/i);
        expect(output).toMatch(/4\.\s+After migration/i);

        // Should mention key commands
        expect(output).toContain('lean-spec create');
        expect(output).toContain('lean-spec update');
        expect(output).toContain('lean-spec validate');
        expect(output).toContain('lean-spec board');
      } finally {
        console.log = originalLog;
      }
    });

    it('should explain metadata requirements', async () => {
      const adrRoot = path.join(fixturesRoot, 'adr-sample', 'docs', 'adr');

      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        logs.push(args.join(' '));
      };

      try {
        await migrateCommand(adrRoot);

        const output = logs.join('\n');

        // Should explain what to extract
        expect(output).toContain('Title');
        expect(output).toContain('Status');
        expect(output).toContain('Priority');
        expect(output).toContain('Creation date');

        // Should mention status mapping
        expect(output).toMatch(/planned.*in-progress.*complete.*archived/);
      } finally {
        console.log = originalLog;
      }
    });

    it('should provide frontmatter editing warnings', async () => {
      const openSpecRoot = path.join(fixturesRoot, 'openspec-sample', 'openspec');

      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        logs.push(args.join(' '));
      };

      try {
        await migrateCommand(openSpecRoot);

        const output = logs.join('\n');

        // Should warn about NOT editing frontmatter manually
        expect(output).toContain('NEVER edit frontmatter manually');
        expect(output).toContain('lean-spec update');

        // Should explain manual edits for relationships
        expect(output).toContain('related');
        expect(output).toContain('manual frontmatter edit');
      } finally {
        console.log = originalLog;
      }
    });

    it('should mention validation after migration', async () => {
      const specKitRoot = path.join(fixturesRoot, 'spec-kit-sample', '.specify', 'specs');

      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        logs.push(args.join(' '));
      };

      try {
        await migrateCommand(specKitRoot);

        const output = logs.join('\n');

        // Should recommend validation
        expect(output).toContain('lean-spec validate');
        expect(output).toContain('lean-spec board');
      } finally {
        console.log = originalLog;
      }
    });

    it('should suggest AI-assisted mode option', async () => {
      const adrRoot = path.join(fixturesRoot, 'adr-sample', 'docs', 'adr');

      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        logs.push(args.join(' '));
      };

      try {
        await migrateCommand(adrRoot);

        const output = logs.join('\n');

        // Should mention AI-assisted option
        expect(output).toContain('AI-assisted migration');
        expect(output).toContain('--with');
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('Error handling', () => {
    it('should error on non-existent path', async () => {
      const exitSpy = { called: false, code: 0 };
      const originalExit = process.exit;
      process.exit = ((code?: number) => {
        exitSpy.called = true;
        exitSpy.code = code || 0;
        throw new Error('process.exit');
      }) as any;

      const errors: string[] = [];
      const originalError = console.error;
      console.error = (...args: any[]) => {
        errors.push(args.join(' '));
      };

      try {
        await migrateCommand('/nonexistent/path/to/specs').catch(() => {});
        expect(exitSpy.called).toBe(true);
        expect(exitSpy.code).toBe(1);

        const errorOutput = errors.join('\n');
        expect(errorOutput).toContain('Path not found');
      } finally {
        process.exit = originalExit;
        console.error = originalError;
      }
    });

    it('should error on file instead of directory', async () => {
      // Create a file
      const testFile = path.join(ctx.tmpDir, 'test.md');
      await fs.writeFile(testFile, '# Test');

      const exitSpy = { called: false, code: 0 };
      const originalExit = process.exit;
      process.exit = ((code?: number) => {
        exitSpy.called = true;
        exitSpy.code = code || 0;
        throw new Error('process.exit');
      }) as any;

      const errors: string[] = [];
      const originalError = console.error;
      console.error = (...args: any[]) => {
        errors.push(args.join(' '));
      };

      try {
        await migrateCommand(testFile).catch(() => {});
        expect(exitSpy.called).toBe(true);
        expect(exitSpy.code).toBe(1);

        const errorOutput = errors.join('\n');
        expect(errorOutput).toContain('must be a directory');
      } finally {
        process.exit = originalExit;
        console.error = originalError;
      }
    });

    it('should error on directory with no markdown files', async () => {
      // Create empty directory
      const emptyDir = path.join(ctx.tmpDir, 'empty');
      await fs.mkdir(emptyDir);

      const exitSpy = { called: false, code: 0 };
      const originalExit = process.exit;
      process.exit = ((code?: number) => {
        exitSpy.called = true;
        exitSpy.code = code || 0;
        throw new Error('process.exit');
      }) as any;

      const errors: string[] = [];
      const originalError = console.error;
      console.error = (...args: any[]) => {
        errors.push(args.join(' '));
      };

      try {
        await migrateCommand(emptyDir).catch(() => {});
        expect(exitSpy.called).toBe(true);
        expect(exitSpy.code).toBe(1);

        const errorOutput = errors.join('\n');
        expect(errorOutput).toContain('No documents found');
      } finally {
        process.exit = originalExit;
        console.error = originalError;
      }
    });
  });
});
