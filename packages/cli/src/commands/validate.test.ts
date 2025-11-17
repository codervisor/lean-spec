import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { validateSpecs } from './validate.js';
import { saveConfig } from '../config.js';

describe('validateCommand', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Create temporary directory
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lean-spec-test-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);

    // Initialize basic config
    await fs.mkdir(path.join(tmpDir, '.lean-spec', 'templates'), { recursive: true });
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
      path.join(tmpDir, '.lean-spec', 'templates', 'spec-template.md'),
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

## Overview

Some overview content.

## Design

Some design content.

${Array(185).fill('Content line').join('\n')}
`;
    await fs.writeFile(path.join(specDir, 'README.md'), content, 'utf-8');

    const result = await validateSpecs();
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

## Overview

Some overview content.

## Design

Some design content.

${Array(335).fill('Content line').join('\n')}
`;
    await fs.writeFile(path.join(specDir, 'README.md'), content, 'utf-8');

    const result = await validateSpecs();
    expect(result).toBe(true); // Still passes with warning
  });

  // Note: Line-count threshold tests removed - we now use token-based validation
  // See ComplexityValidator tests for token threshold validation

  it('should validate specific specs when provided', async () => {
    const specsDir = path.join(tmpDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });
    
    // Create two specs
    const spec1Dir = path.join(specsDir, '001-good-spec');
    await fs.mkdir(spec1Dir, { recursive: true });
    await fs.writeFile(
      path.join(spec1Dir, 'README.md'),
      '---\nstatus: planned\ncreated: "2025-11-05"\n---\n\n# Good Spec\n\n## Overview\n\nContent.\n\n## Design\n\nMore content.\n\n' +
      Array(185).fill('line').join('\n'),
      'utf-8'
    );

    const spec2Dir = path.join(specsDir, '002-bad-spec');
    await fs.mkdir(spec2Dir, { recursive: true });
    await fs.writeFile(
      path.join(spec2Dir, 'README.md'),
      '---\nstatus: planned\ncreated: "2025-11-05"\n---\n\n# Bad Spec\n\n## Overview\n\nContent.\n\n## Design\n\nMore content.\n\n' +
      Array(435).fill('line').join('\n'),
      'utf-8'
    );

    // Validate only the good spec
    const result = await validateSpecs({ specs: ['001'] });
    expect(result).toBe(true);

    // Note: Removed "bad spec" test - simple repeated text doesn't generate enough tokens to fail
  });

  it('should return true when no specs found', async () => {
    const specsDir = path.join(tmpDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });

    const result = await validateSpecs();
    expect(result).toBe(true);
  });

  // Note: Removed "multiple specs with mixed results" test - line counts no longer trigger errors
  // Token-based validation is tested in ComplexityValidator tests

  it('should return false when spec not found', async () => {
    const specsDir = path.join(tmpDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });

    const result = await validateSpecs({ specs: ['999-nonexistent'] });
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

    const result = await validateSpecs();
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
    const result = await validateSpecs();
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

## Overview

This spec has valid frontmatter and structure.

## Design

Design content here.

${Array(90).fill('Content line').join('\n')}
`;
    await fs.writeFile(path.join(specDir, 'README.md'), content, 'utf-8');

    const result = await validateSpecs();
    expect(result).toBe(true); // Should pass
  });

  it('should support verbose flag to show passing specs', async () => {
    const specsDir = path.join(tmpDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });
    
    // Create two specs - one passing, one with warning
    const spec1Dir = path.join(specsDir, '001-good-spec');
    await fs.mkdir(spec1Dir, { recursive: true });
    await fs.writeFile(
      path.join(spec1Dir, 'README.md'),
      '---\nstatus: planned\ncreated: "2025-11-05"\n---\n\n# Good Spec\n\n## Overview\n\nContent.\n\n' +
      Array(90).fill('line').join('\n'),
      'utf-8'
    );

    const spec2Dir = path.join(specsDir, '002-warn-spec');
    await fs.mkdir(spec2Dir, { recursive: true });
    await fs.writeFile(
      path.join(spec2Dir, 'README.md'),
      '---\nstatus: planned\ncreated: "2025-11-05"\n---\n\n# Warn Spec\n\n## Overview\n\nContent.\n\n' +
      Array(290).fill('line').join('\n'),
      'utf-8'
    );

    // With verbose flag, should pass and output should include passing specs
    const result = await validateSpecs({ verbose: true });
    expect(result).toBe(true);
  });

  it('should support quiet flag to suppress warnings', async () => {
    const specsDir = path.join(tmpDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });
    
    // Create a spec with warning
    const specDir = path.join(specsDir, '001-warn-spec');
    await fs.mkdir(specDir, { recursive: true });
    await fs.writeFile(
      path.join(specDir, 'README.md'),
      '---\nstatus: planned\ncreated: "2025-11-05"\n---\n\n# Warn Spec\n\n## Overview\n\nContent.\n\n' +
      Array(290).fill('line').join('\n'),
      'utf-8'
    );

    // With quiet flag, warnings are suppressed, should still pass
    const result = await validateSpecs({ quiet: true });
    expect(result).toBe(true);
  });

  it('should support rule filter to show only specific rule violations', async () => {
    const specsDir = path.join(tmpDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });
    
    // Create a spec with line count warning
    const specDir = path.join(specsDir, '001-warn-spec');
    await fs.mkdir(specDir, { recursive: true });
    await fs.writeFile(
      path.join(specDir, 'README.md'),
      '---\nstatus: planned\ncreated: "2025-11-05"\n---\n\n# Warn Spec\n\n## Overview\n\nContent.\n\n' +
      Array(290).fill('line').join('\n'),
      'utf-8'
    );

    // Filter by max-lines rule
    const result = await validateSpecs({ rule: 'max-lines' });
    expect(result).toBe(true); // Should pass (only warnings)
  });

  it('should support json format output', async () => {
    const specsDir = path.join(tmpDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });
    
    // Create a spec with frontmatter error
    const specDir = path.join(specsDir, '001-bad-spec');
    await fs.mkdir(specDir, { recursive: true });
    await fs.writeFile(
      path.join(specDir, 'README.md'),
      '---\nstatus: wip\ncreated: "invalid-date"\npriority: urgent\n---\n\n# Bad Spec\n\n## Overview\n\nContent.',
      'utf-8'
    );

    // With json format, should output JSON (still fail due to frontmatter errors)
    const result = await validateSpecs({ format: 'json' });
    expect(result).toBe(false);
  });
});
