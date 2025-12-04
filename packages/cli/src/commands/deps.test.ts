import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { depsCommand } from './deps.js';
import { createSpec } from './index.js';
import {
  createTestEnvironment,
  initTestProject,
  getTestDate,
  type TestContext,
} from '../test-helpers.js';

describe('depsCommand - Dependency Relationships', () => {
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
   * Helper to add frontmatter fields to an existing spec
   */
  async function addFrontmatter(specName: string, fields: Record<string, any>): Promise<void> {
    const today = getTestDate();
    const specPath = path.join(ctx.tmpDir, 'specs', today, specName, 'README.md');
    const content = await fs.readFile(specPath, 'utf-8');
    
    // Parse existing frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      throw new Error('No frontmatter found');
    }
    
    // Add new fields to frontmatter
    let frontmatter = frontmatterMatch[1];
    for (const [key, value] of Object.entries(fields)) {
      if (Array.isArray(value)) {
        frontmatter += `\n${key}:\n${value.map(v => `  - ${v}`).join('\n')}`;
      } else {
        frontmatter += `\n${key}: ${JSON.stringify(value)}`;
      }
    }
    
    // Replace frontmatter in content
    const newContent = content.replace(/^---\n[\s\S]*?\n---/, `---\n${frontmatter}\n---`);
    await fs.writeFile(specPath, newContent, 'utf-8');
  }

  it('should show depends_on directional relationships', async () => {
    // Create spec A and B
    await createSpec('spec-a');
    await createSpec('spec-b');
    
    const today = getTestDate();
    
    // Add depends_on field to spec A pointing to spec B (with date prefix)
    await addFrontmatter('001-spec-a', {
      depends_on: [`${today}/002-spec-b`],
    });

    // Capture output for spec A
    const outputA: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      outputA.push(args.join(' '));
    };

    await depsCommand('001-spec-a', {});

    console.log = originalLog;

    // Spec A should show B in Depends On
    const dependsOnSection = outputA.find(line => line.includes('Depends On:'));
    expect(dependsOnSection).toBeDefined();
    const specBLine = outputA.find(line => line.includes('002-spec-b'));
    expect(specBLine).toBeDefined();
    expect(specBLine).toContain('→');

    // Capture output for spec B
    const outputB: string[] = [];
    console.log = (...args: any[]) => {
      outputB.push(args.join(' '));
    };

    await depsCommand('002-spec-b', {});

    console.log = originalLog;

    // Spec B should show A in Required By section (directional inverse)
    const blocksSection = outputB.find(line => line.includes('Required By:'));
    expect(blocksSection).toBeDefined();
    const specALine = outputB.find(line => line.includes('001-spec-a'));
    expect(specALine).toBeDefined();
    expect(specALine).toContain('←');
  });

  it('should handle multiple dependencies', async () => {
    // Create specs A, B, and C
    await createSpec('spec-a');
    await createSpec('spec-b');
    await createSpec('spec-c');
    
    const today = getTestDate();
    
    // Spec A depends on B and C
    await addFrontmatter('001-spec-a', {
      depends_on: [`${today}/002-spec-b`, `${today}/003-spec-c`],
    });

    // Capture output
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      output.push(args.join(' '));
    };

    await depsCommand('001-spec-a', {});

    console.log = originalLog;

    // Should have Depends On section
    expect(output.find(line => line.includes('Depends On:'))).toBeDefined();

    // Both specs should be listed
    expect(output.find(line => line.includes('002-spec-b'))).toBeDefined();
    expect(output.find(line => line.includes('003-spec-c'))).toBeDefined();
  });

  it('should handle JSON output', async () => {
    // Create specs A and B
    await createSpec('spec-a');
    await createSpec('spec-b');
    
    const today = getTestDate();
    
    await addFrontmatter('001-spec-a', {
      depends_on: [`${today}/002-spec-b`],
    });

    // Capture JSON output
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      output.push(args.join(' '));
    };

    await depsCommand('001-spec-a', { json: true });

    console.log = originalLog;

    const jsonOutput = JSON.parse(output.join(''));
    
    // Should have dependsOn field
    expect(jsonOutput.dependsOn).toBeDefined();
    expect(jsonOutput.dependsOn).toHaveLength(1);
    expect(jsonOutput.dependsOn[0].path).toContain('002-spec-b');
  });

  it('should handle circular dependencies gracefully', async () => {
    // Create specs A, B, and C with circular depends_on
    await createSpec('spec-a');
    await createSpec('spec-b');
    await createSpec('spec-c');
    
    const today = getTestDate();
    
    await addFrontmatter('001-spec-a', {
      depends_on: [`${today}/002-spec-b`],
    });
    await addFrontmatter('002-spec-b', {
      depends_on: [`${today}/003-spec-c`],
    });
    await addFrontmatter('003-spec-c', {
      depends_on: [`${today}/001-spec-a`],
    });

    // Should not crash or hang
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      output.push(args.join(' '));
    };

    await expect(depsCommand('001-spec-a', {})).resolves.not.toThrow();

    console.log = originalLog;
  });

  it('should handle non-existent dependency gracefully', async () => {
    // Create spec A with depends_on to non-existent spec
    await createSpec('spec-a');
    
    const today = getTestDate();
    
    await addFrontmatter('001-spec-a', {
      depends_on: [`${today}/999-nonexistent`],
    });

    // Should not crash
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      output.push(args.join(' '));
    };

    await expect(depsCommand('001-spec-a', {})).resolves.not.toThrow();

    console.log = originalLog;
  });

  it('should show no dependencies message for isolated spec', async () => {
    await createSpec('spec-a');

    const output: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      output.push(args.join(' '));
    };

    await depsCommand('001-spec-a', {});

    console.log = originalLog;

    expect(output.find(line => line.includes('No dependencies'))).toBeDefined();
  });
});
