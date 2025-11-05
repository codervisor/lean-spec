import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { validateCommand } from './validate.js';
import { saveConfig } from '../config.js';

describe('validateCommand', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Create temporary directory
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lspec-test-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);

    // Initialize basic config
    await fs.mkdir(path.join(tmpDir, '.lspec', 'templates'), { recursive: true });
    await saveConfig({
      template: 'spec-template.md',
      templates: { default: 'spec-template.md' },
      specsDir: 'specs',
      structure: {
        pattern: 'flat',
        dateFormat: 'YYYYMMDD',
        sequenceDigits: 3,
        defaultFile: 'README.md',
      },
      features: {
        aiAgents: true,
        examples: true,
      },
    });

    // Create template
    const templateContent = `---
status: planned
created: {date}
---

# {name}

## Overview
<!-- What are we solving? Why now? -->
`;
    await fs.writeFile(
      path.join(tmpDir, '.lspec', 'templates', 'spec-template.md'),
      templateContent,
      'utf-8'
    );
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should pass validation for specs under 300 lines', async () => {
    const specsDir = path.join(tmpDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });
    
    // Create a spec with 200 lines
    const specDir = path.join(specsDir, '001-small-spec');
    await fs.mkdir(specDir, { recursive: true });
    const content = `---
status: planned
created: "2025-11-05"
---

# Small Spec

${Array(195).fill('Content line').join('\n')}
`;
    await fs.writeFile(path.join(specDir, 'README.md'), content, 'utf-8');

    const result = await validateCommand();
    expect(result).toBe(true);
  });

  it('should warn for specs between 300-400 lines', async () => {
    const specsDir = path.join(tmpDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });
    
    // Create a spec with 350 lines
    const specDir = path.join(specsDir, '001-medium-spec');
    await fs.mkdir(specDir, { recursive: true });
    const content = `---
status: planned
created: "2025-11-05"
---

# Medium Spec

${Array(345).fill('Content line').join('\n')}
`;
    await fs.writeFile(path.join(specDir, 'README.md'), content, 'utf-8');

    const result = await validateCommand();
    expect(result).toBe(true); // Still passes with warning
  });

  it('should fail validation for specs over 400 lines', async () => {
    const specsDir = path.join(tmpDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });
    
    // Create a spec with 450 lines
    const specDir = path.join(specsDir, '001-large-spec');
    await fs.mkdir(specDir, { recursive: true });
    const content = `---
status: planned
created: "2025-11-05"
---

# Large Spec

${Array(445).fill('Content line').join('\n')}
`;
    await fs.writeFile(path.join(specDir, 'README.md'), content, 'utf-8');

    const result = await validateCommand();
    expect(result).toBe(false);
  });

  it('should respect custom maxLines option', async () => {
    const specsDir = path.join(tmpDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });
    
    // Create a spec with 450 lines
    const specDir = path.join(specsDir, '001-spec');
    await fs.mkdir(specDir, { recursive: true });
    const content = `---
status: planned
created: "2025-11-05"
---

# Spec

${Array(445).fill('Content line').join('\n')}
`;
    await fs.writeFile(path.join(specDir, 'README.md'), content, 'utf-8');

    // Should fail with default (400)
    let result = await validateCommand();
    expect(result).toBe(false);

    // Should pass with higher limit (500)
    result = await validateCommand({ maxLines: 500 });
    expect(result).toBe(true);
  });

  it('should validate specific specs when provided', async () => {
    const specsDir = path.join(tmpDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });
    
    // Create two specs
    const spec1Dir = path.join(specsDir, '001-good-spec');
    await fs.mkdir(spec1Dir, { recursive: true });
    await fs.writeFile(
      path.join(spec1Dir, 'README.md'),
      '---\nstatus: planned\ncreated: "2025-11-05"\n---\n\n# Good Spec\n\n' +
      Array(195).fill('line').join('\n'),
      'utf-8'
    );

    const spec2Dir = path.join(specsDir, '002-bad-spec');
    await fs.mkdir(spec2Dir, { recursive: true });
    await fs.writeFile(
      path.join(spec2Dir, 'README.md'),
      '---\nstatus: planned\ncreated: "2025-11-05"\n---\n\n# Bad Spec\n\n' +
      Array(445).fill('line').join('\n'),
      'utf-8'
    );

    // Validate only the good spec
    const result = await validateCommand({ specs: ['001'] });
    expect(result).toBe(true);

    // Validate only the bad spec
    const result2 = await validateCommand({ specs: ['002'] });
    expect(result2).toBe(false);
  });

  it('should return true when no specs found', async () => {
    const specsDir = path.join(tmpDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });

    const result = await validateCommand();
    expect(result).toBe(true);
  });

  it('should handle multiple specs with mixed results', async () => {
    const specsDir = path.join(tmpDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });
    
    // Create specs with different line counts
    const specs = [
      { name: '001-small', lines: 200 },
      { name: '002-medium', lines: 350 },
      { name: '003-large', lines: 450 },
    ];

    for (const spec of specs) {
      const specDir = path.join(specsDir, spec.name);
      await fs.mkdir(specDir, { recursive: true });
      const content = `---
status: planned
created: "2025-11-05"
---

# Spec

${Array(spec.lines - 10).fill('line').join('\n')}
`;
      await fs.writeFile(path.join(specDir, 'README.md'), content, 'utf-8');
    }

    const result = await validateCommand();
    expect(result).toBe(false); // Should fail because one spec exceeds limit
  });

  it('should return false when spec not found', async () => {
    const specsDir = path.join(tmpDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });

    const result = await validateCommand({ specs: ['999-nonexistent'] });
    expect(result).toBe(false);
  });

  it('should detect frontmatter errors', async () => {
    const specsDir = path.join(tmpDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });
    
    // Create a spec with invalid frontmatter
    const specDir = path.join(specsDir, '001-invalid-spec');
    await fs.mkdir(specDir, { recursive: true });
    const content = `---
status: wip
created: invalid-date
priority: urgent
---

# Invalid Spec

This spec has multiple frontmatter issues.
`;
    await fs.writeFile(path.join(specDir, 'README.md'), content, 'utf-8');

    const result = await validateCommand();
    expect(result).toBe(false); // Should fail due to frontmatter errors
  });

  it('should skip specs with missing required frontmatter fields during loading', async () => {
    const specsDir = path.join(tmpDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });
    
    // Create a spec without required fields - it won't be loaded by spec-loader
    const specDir = path.join(specsDir, '001-no-frontmatter');
    await fs.mkdir(specDir, { recursive: true });
    const content = `---
tags:
  - test
---

# No Required Fields

Missing status and created fields - spec-loader will skip this.
`;
    await fs.writeFile(path.join(specDir, 'README.md'), content, 'utf-8');

    // The spec-loader filters out specs with missing required fields
    // so no specs will be found, and validation returns true (nothing to validate)
    const result = await validateCommand();
    expect(result).toBe(true); // No specs found = success
  });

  it('should pass for specs with valid frontmatter', async () => {
    const specsDir = path.join(tmpDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });
    
    // Create a spec with valid frontmatter
    const specDir = path.join(specsDir, '001-valid-spec');
    await fs.mkdir(specDir, { recursive: true });
    const content = `---
status: in-progress
created: "2025-11-05"
priority: high
tags:
  - api
  - feature
---

# Valid Spec

This spec has valid frontmatter.

${Array(100).fill('Content line').join('\n')}
`;
    await fs.writeFile(path.join(specDir, 'README.md'), content, 'utf-8');

    const result = await validateCommand();
    expect(result).toBe(true); // Should pass
  });
});
