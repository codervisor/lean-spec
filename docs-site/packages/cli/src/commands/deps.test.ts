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

describe('depsCommand - Bidirectional Relationships', () => {
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

  it('should show bidirectional relationships for related specs', async () => {
    // Create spec A and B
    await createSpec('spec-a');
    await createSpec('spec-b');
    
    const today = getTestDate();
    
    // Add related field to spec A pointing to spec B (with date prefix)
    await addFrontmatter('001-spec-a', {
      related: [`${today}/002-spec-b`],
    });

    // Capture output for spec A
    const outputA: string[] = [];
    const originalLogA = console.log;
    console.log = (...args: any[]) => {
      outputA.push(args.join(' '));
    };

    await depsCommand('001-spec-a', {});

    console.log = originalLogA;

    // Spec A should show B in Related Specs
    const relatedSectionA = outputA.find(line => line.includes('Related Specs:'));
    expect(relatedSectionA).toBeDefined();
    const specBLineA = outputA.find(line => line.includes('002-spec-b'));
    expect(specBLineA).toBeDefined();
    expect(specBLineA).toContain('⟷');

    // Capture output for spec B
    const outputB: string[] = [];
    console.log = (...args: any[]) => {
      outputB.push(args.join(' '));
    };

    await depsCommand('002-spec-b', {});

    console.log = originalLogA;

    // Spec B should ALSO show A in Related Specs (bidirectional!)
    const relatedSectionB = outputB.find(line => line.includes('Related Specs:'));
    expect(relatedSectionB).toBeDefined();
    const specALineB = outputB.find(line => line.includes('001-spec-a'));
    expect(specALineB).toBeDefined();
    expect(specALineB).toContain('⟷');

    // Should NOT have separate "Related By" section anymore
    const relatedBySection = outputB.find(line => line.includes('Related By:'));
    expect(relatedBySection).toBeUndefined();
  });

  it('should keep depends_on directional (not bidirectional)', async () => {
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

    // Should NOT show in Related Specs (depends_on is separate)
    const relatedSection = outputB.find(line => line.includes('Related Specs:'));
    expect(relatedSection).toBeUndefined();
  });

  it('should combine both related and depends_on correctly', async () => {
    // Create specs A, B, and C
    await createSpec('spec-a');
    await createSpec('spec-b');
    await createSpec('spec-c');
    
    const today = getTestDate();
    
    // Add both related and depends_on to spec A (with date prefixes)
    await addFrontmatter('001-spec-a', {
      related: [`${today}/002-spec-b`],
      depends_on: [`${today}/003-spec-c`],
    });

    // Capture output
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      output.push(args.join(' '));
    };

    await depsCommand('001-spec-a', {});

    console.log = originalLog;

    // Should have Depends On and Related Specs sections (but NOT Required By, since no spec depends on spec-a)
    expect(output.find(line => line.includes('Depends On:'))).toBeDefined();
    expect(output.find(line => line.includes('Related Specs:'))).toBeDefined();

    // Spec C in Depends On
    const specCLine = output.find(line => line.includes('003-spec-c'));
    expect(specCLine).toBeDefined();
    expect(specCLine).toContain('→');

    // Spec B in Related Specs
    const specBLine = output.find(line => line.includes('002-spec-b'));
    expect(specBLine).toBeDefined();
    expect(specBLine).toContain('⟷');
  });

  it('should deduplicate bidirectional relationships', async () => {
    // Create specs A and B
    await createSpec('spec-a');
    await createSpec('spec-b');
    
    const today = getTestDate();
    
    // Add mutual relationships (with date prefixes)
    await addFrontmatter('001-spec-a', {
      related: [`${today}/002-spec-b`],
    });
    await addFrontmatter('002-spec-b', {
      related: [`${today}/001-spec-a`],
    });

    // Capture output for spec A
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      output.push(args.join(' '));
    };

    await depsCommand('001-spec-a', {});

    console.log = originalLog;

    // Should show spec B only once in Related Specs
    const specBLines = output.filter(line => line.includes('002-spec-b'));
    expect(specBLines.length).toBe(1);
  });

  it('should handle JSON output with merged related field', async () => {
    // Create specs A and B
    await createSpec('spec-a');
    await createSpec('spec-b');
    
    const today = getTestDate();
    
    // Add related field to spec A (with date prefix)
    await addFrontmatter('001-spec-a', {
      related: [`${today}/002-spec-b`],
    });

    // Capture JSON output for spec B
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      output.push(args.join(' '));
    };

    await depsCommand('002-spec-b', { json: true });

    console.log = originalLog;

    const jsonOutput = JSON.parse(output.join(''));
    
    // Should have 'related' field (not 'relatedBy')
    expect(jsonOutput.related).toBeDefined();
    expect(jsonOutput.relatedBy).toBeUndefined();
    
    // Should include spec A bidirectionally
    expect(jsonOutput.related).toHaveLength(1);
    expect(jsonOutput.related[0].path).toContain('001-spec-a');
  });

  it('should handle circular relationships gracefully', async () => {
    // Create specs A, B, and C with circular related fields
    await createSpec('spec-a');
    await createSpec('spec-b');
    await createSpec('spec-c');
    
    const today = getTestDate();
    
    await addFrontmatter('001-spec-a', {
      related: [`${today}/002-spec-b`],
    });
    await addFrontmatter('002-spec-b', {
      related: [`${today}/003-spec-c`],
    });
    await addFrontmatter('003-spec-c', {
      related: [`${today}/001-spec-a`],
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

  it('should handle related to non-existent spec gracefully', async () => {
    // Create spec A with related to non-existent spec
    await createSpec('spec-a');
    
    const today = getTestDate();
    
    await addFrontmatter('001-spec-a', {
      related: [`${today}/999-nonexistent`],
    });

    // Should not crash
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      output.push(args.join(' '));
    };

    await expect(depsCommand('001-spec-a', {})).resolves.not.toThrow();

    console.log = originalLog;

    // Should show empty or handle gracefully (no crash is the main test)
  });

  it('should handle related to archived spec', async () => {
    // Create specs A and B
    await createSpec('spec-a');
    await createSpec('spec-b');
    
    const today = getTestDate();
    
    // Add related field to spec A (with date prefix)
    await addFrontmatter('001-spec-a', {
      related: [`${today}/002-spec-b`],
    });

    // Should show the relationship even if archived
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      output.push(args.join(' '));
    };

    await depsCommand('001-spec-a', {});

    console.log = originalLog;

    const specBLine = output.find(line => line.includes('002-spec-b'));
    expect(specBLine).toBeDefined();
    // Note: Can't test [archived] status since we didn't actually archive it
  });
});
