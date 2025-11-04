import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  createTestEnvironment,
  initTestProject,
  createTestSpec,
  getTestDate,
  type TestContext,
} from '../test-helpers.js';
import { showCommand, readCommand, viewCommand, openCommand, readSpecContent } from './viewer.js';

describe('Viewer Commands', () => {
  let testCtx: TestContext;
  let originalCwd: string;

  beforeEach(async () => {
    testCtx = await createTestEnvironment();
    originalCwd = process.cwd();
    process.chdir(testCtx.tmpDir);

    // Initialize with date-based structure for testing
    await initTestProject(testCtx.tmpDir, {
      structure: {
        pattern: '{date}/{seq}-{name}/',
        dateFormat: 'YYYYMMDD',
        sequenceDigits: 3,
        defaultFile: 'README.md',
      },
    });

    // Create test specs
    const date = getTestDate();
    await createTestSpec(
      testCtx.tmpDir,
      date,
      '001-test-spec',
      {
        status: 'planned',
        created: '2025-11-03',
        priority: 'high',
        tags: ['test', 'demo'],
      },
      `# Test Spec

## Overview

This is a test specification for viewer commands.

## Features

- Feature 1
- Feature 2
- Feature 3

## Code Example

\`\`\`typescript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

## Notes

Some additional notes here.`
    );

    await createTestSpec(
      testCtx.tmpDir,
      date,
      '002-another-spec',
      {
        status: 'in-progress',
        created: '2025-11-03',
        priority: 'medium',
        assignee: 'alice',
      },
      `# Another Spec

Short content here.`
    );
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await testCtx.cleanup();
  });

  describe('readSpecContent', () => {
    it('should read spec by full path', async () => {
      const date = getTestDate();
      const specPath = `${date}/001-test-spec`;
      
      const spec = await readSpecContent(specPath, testCtx.tmpDir);
      
      expect(spec).not.toBeNull();
      expect(spec?.name).toBe('001-test-spec');
      expect(spec?.frontmatter.status).toBe('planned');
      expect(spec?.frontmatter.priority).toBe('high');
      expect(spec?.frontmatter.tags).toEqual(['test', 'demo']);
      expect(spec?.content).toContain('This is a test specification');
      expect(spec?.rawContent).toContain('---');
      expect(spec?.rawContent).toContain('status:');
    });

    it('should read spec by name only', async () => {
      const spec = await readSpecContent('001-test-spec', testCtx.tmpDir);
      
      expect(spec).not.toBeNull();
      expect(spec?.name).toBe('001-test-spec');
      expect(spec?.frontmatter.status).toBe('planned');
    });

    it('should read spec by sequence number', async () => {
      const spec = await readSpecContent('1', testCtx.tmpDir);
      
      expect(spec).not.toBeNull();
      expect(spec?.name).toBe('001-test-spec');
      expect(spec?.frontmatter.status).toBe('planned');
    });

    it('should read spec by padded sequence number', async () => {
      const spec = await readSpecContent('002', testCtx.tmpDir);
      
      expect(spec).not.toBeNull();
      expect(spec?.name).toBe('002-another-spec');
      expect(spec?.frontmatter.status).toBe('in-progress');
    });

    it('should return null for non-existent spec', async () => {
      const spec = await readSpecContent('999-nonexistent', testCtx.tmpDir);
      
      expect(spec).toBeNull();
    });

    it('should parse frontmatter correctly', async () => {
      const spec = await readSpecContent('002', testCtx.tmpDir);
      
      expect(spec).not.toBeNull();
      expect(spec?.frontmatter.assignee).toBe('alice');
      expect(spec?.frontmatter.priority).toBe('medium');
    });

    it('should extract content without frontmatter', async () => {
      const spec = await readSpecContent('001', testCtx.tmpDir);
      
      expect(spec).not.toBeNull();
      expect(spec?.content).not.toContain('---');
      expect(spec?.content).not.toContain('status:');
      expect(spec?.content).toContain('# Test Spec');
    });

    it('should include raw content with frontmatter', async () => {
      const spec = await readSpecContent('001', testCtx.tmpDir);
      
      expect(spec).not.toBeNull();
      expect(spec?.rawContent).toContain('---');
      expect(spec?.rawContent).toContain('status:');
      expect(spec?.rawContent).toContain('# Test Spec');
    });
  });

  describe('showCommand', () => {
    it('should display spec with formatted output', async () => {
      // Capture console output
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => logs.push(args.join(' '));

      try {
        await showCommand('001-test-spec', { noColor: false });

        const output = logs.join('\n');
        expect(output).toContain('001-test-spec');
        expect(output).toContain('planned');
        expect(output).toContain('high');
        expect(output).toContain('test');
        expect(output).toContain('demo');
      } finally {
        console.log = originalLog;
      }
    });

    it('should handle spec with assignee', async () => {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => logs.push(args.join(' '));

      try {
        await showCommand('002');

        const output = logs.join('\n');
        expect(output).toContain('002-another-spec');
        expect(output).toContain('alice');
        expect(output).toContain('in-progress');
      } finally {
        console.log = originalLog;
      }
    });

    it('should throw error for non-existent spec', async () => {
      await expect(
        showCommand('999-nonexistent')
      ).rejects.toThrow('Spec not found: 999-nonexistent');
    });
  });

  describe('viewCommand', () => {
    it('should work as alias for showCommand', async () => {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => logs.push(args.join(' '));

      try {
        await viewCommand('001-test-spec', {});

        const output = logs.join('\n');
        expect(output).toContain('001-test-spec');
        expect(output).toContain('planned');
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('readCommand', () => {
    it('should output raw markdown by default', async () => {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => logs.push(args.join(' '));

      try {
        await readCommand('001-test-spec', {});

        const output = logs.join('\n');
        expect(output).toContain('---');
        expect(output).toContain('status:');
        expect(output).toContain('# Test Spec');
      } finally {
        console.log = originalLog;
      }
    });

    it('should output JSON format when requested', async () => {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => logs.push(args.join(' '));

      try {
        await readCommand('001-test-spec', { format: 'json' });

        const output = logs.join('\n');
        const parsed = JSON.parse(output);
        
        expect(parsed.name).toBe('001-test-spec');
        expect(parsed.frontmatter.status).toBe('planned');
        expect(parsed.frontmatter.priority).toBe('high');
        expect(parsed.content).toContain('# Test Spec');
      } finally {
        console.log = originalLog;
      }
    });

    it('should output only frontmatter when requested', async () => {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => logs.push(args.join(' '));

      try {
        await readCommand('001-test-spec', { frontmatterOnly: true });

        const output = logs.join('\n');
        const parsed = JSON.parse(output);
        
        expect(parsed.status).toBe('planned');
        expect(parsed.priority).toBe('high');
        expect(parsed.tags).toEqual(['test', 'demo']);
        expect(parsed.content).toBeUndefined();
      } finally {
        console.log = originalLog;
      }
    });

    it('should work with spec number', async () => {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => logs.push(args.join(' '));

      try {
        await readCommand('2', { format: 'json' });

        const output = logs.join('\n');
        const parsed = JSON.parse(output);
        
        expect(parsed.name).toBe('002-another-spec');
        expect(parsed.frontmatter.status).toBe('in-progress');
      } finally {
        console.log = originalLog;
      }
    });

    it('should throw error for non-existent spec', async () => {
      await expect(
        readCommand('999-nonexistent', {})
      ).rejects.toThrow('Spec not found: 999-nonexistent');
    });
  });

  describe('openCommand', () => {
    it('should resolve spec path and prepare to open', async () => {
      // This test verifies that the spec path resolves correctly
      // We can't easily test the actual spawn without complex mocking,
      // so we'll just verify it doesn't throw for a valid spec
      const config = await import('../config.js').then(m => m.loadConfig(testCtx.tmpDir));
      const specsDir = path.join(testCtx.tmpDir, config.specsDir);
      const pathHelpers = await import('../utils/path-helpers.js');
      
      const resolved = await pathHelpers.resolveSpecPath('001-test-spec', testCtx.tmpDir, specsDir);
      expect(resolved).toBeTruthy();
      expect(resolved).toContain('001-test-spec');
    });

    it('should throw error for non-existent spec', async () => {
      await expect(
        openCommand('999-nonexistent', { editor: 'echo' })
      ).rejects.toThrow('Spec not found: 999-nonexistent');
    });
  });
});
