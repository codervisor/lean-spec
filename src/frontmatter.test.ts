import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  parseFrontmatter,
  updateFrontmatter,
  matchesFilter,
  getSpecFile,
  validateCustomField,
  validateCustomFields,
  type SpecFrontmatter,
  type SpecFilterOptions,
} from './frontmatter.js';
import {
  createTestEnvironment,
  createTestSpec,
  type TestContext,
} from './test-helpers.js';
import type { LeanSpecConfig } from './config.js';

describe('parseFrontmatter', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestEnvironment();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('should parse valid frontmatter', async () => {
    const date = '20241101';
    const specName = '001-test-spec';
    const specDir = await createTestSpec(ctx.tmpDir, date, specName, {
      status: 'planned',
      created: '2024-11-01',
      tags: ['api', 'backend'],
      priority: 'high',
    });

    const specFile = path.join(specDir, 'README.md');
    const frontmatter = await parseFrontmatter(specFile);

    expect(frontmatter).not.toBeNull();
    expect(frontmatter?.status).toBe('planned');
    expect(frontmatter?.created).toBe('2024-11-01');
    expect(frontmatter?.tags).toEqual(['api', 'backend']);
    expect(frontmatter?.priority).toBe('high');
  });

  it('should return null for missing required fields', async () => {
    const specFile = path.join(ctx.tmpDir, 'test.md');
    await fs.writeFile(
      specFile,
      `---
tags: [test]
---

# Test
`,
      'utf-8'
    );

    const frontmatter = await parseFrontmatter(specFile);
    expect(frontmatter).toBeNull();
  });

  it('should parse fallback inline fields', async () => {
    const specFile = path.join(ctx.tmpDir, 'test.md');
    await fs.writeFile(
      specFile,
      `# Test Spec

**Status**: 📅 Planned  
**Created**: 2024-11-01

## Overview
`,
      'utf-8'
    );

    const frontmatter = await parseFrontmatter(specFile);

    expect(frontmatter).not.toBeNull();
    expect(frontmatter?.status).toBe('planned');
    expect(frontmatter?.created).toBe('2024-11-01');
  });

  it('should handle missing file gracefully', async () => {
    const nonExistentFile = path.join(ctx.tmpDir, 'nonexistent.md');
    const frontmatter = await parseFrontmatter(nonExistentFile);
    expect(frontmatter).toBeNull();
  });

  it('should parse all valid status values', async () => {
    const statuses = ['planned', 'in-progress', 'complete', 'archived'];

    for (const status of statuses) {
      const specFile = path.join(ctx.tmpDir, `${status}.md`);
      await fs.writeFile(
        specFile,
        `---
status: ${status}
created: 2024-11-01
---

# Test
`,
        'utf-8'
      );

      const frontmatter = await parseFrontmatter(specFile);
      expect(frontmatter?.status).toBe(status);
    }
  });

  it('should parse all valid priority values', async () => {
    const priorities = ['low', 'medium', 'high', 'critical'];

    for (const priority of priorities) {
      const specFile = path.join(ctx.tmpDir, `${priority}.md`);
      await fs.writeFile(
        specFile,
        `---
status: planned
created: 2024-11-01
priority: ${priority}
---

# Test
`,
        'utf-8'
      );

      const frontmatter = await parseFrontmatter(specFile);
      expect(frontmatter?.priority).toBe(priority);
    }
  });

  it('should still parse frontmatter with invalid status value', async () => {
    const specFile = path.join(ctx.tmpDir, 'invalid-status.md');
    await fs.writeFile(
      specFile,
      `---
status: draft
created: 2024-11-01
tags: [test]
---

# Test
`,
      'utf-8'
    );

    const frontmatter = await parseFrontmatter(specFile);
    
    // Should still return the frontmatter even with invalid status
    expect(frontmatter).not.toBeNull();
    expect(frontmatter?.status).toBe('draft'); // Returns the invalid status as-is
    // The created field might be parsed as a Date object by gray-matter
    expect(frontmatter?.created).toBeDefined();
    expect(frontmatter?.tags).toEqual(['test']);
  });

  it('should normalize tags from JSON string to array', async () => {
    const specFile = path.join(ctx.tmpDir, 'json-tags.md');
    await fs.writeFile(
      specFile,
      `---
status: planned
created: 2024-11-01
tags: '["integration","mcp","ai"]'
---

# Test
`,
      'utf-8'
    );

    const frontmatter = await parseFrontmatter(specFile);
    
    expect(frontmatter).not.toBeNull();
    expect(frontmatter?.tags).toEqual(['integration', 'mcp', 'ai']);
    expect(Array.isArray(frontmatter?.tags)).toBe(true);
  });

  it('should normalize tags from comma-separated string to array', async () => {
    const specFile = path.join(ctx.tmpDir, 'csv-tags.md');
    await fs.writeFile(
      specFile,
      `---
status: planned
created: 2024-11-01
tags: 'api, backend, database'
---

# Test
`,
      'utf-8'
    );

    const frontmatter = await parseFrontmatter(specFile);
    
    expect(frontmatter).not.toBeNull();
    expect(frontmatter?.tags).toEqual(['api', 'backend', 'database']);
    expect(Array.isArray(frontmatter?.tags)).toBe(true);
  });
});

describe('updateFrontmatter', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestEnvironment();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('should update frontmatter fields', async () => {
    const specFile = path.join(ctx.tmpDir, 'test.md');
    await fs.writeFile(
      specFile,
      `---
status: planned
created: 2024-11-01
---

# Test Spec
`,
      'utf-8'
    );

    await updateFrontmatter(specFile, {
      status: 'in-progress',
      priority: 'high',
    });

    const frontmatter = await parseFrontmatter(specFile);
    expect(frontmatter?.status).toBe('in-progress');
    expect(frontmatter?.priority).toBe('high');
  });

  it('should preserve existing fields when updating', async () => {
    const specFile = path.join(ctx.tmpDir, 'test.md');
    await fs.writeFile(
      specFile,
      `---
status: planned
created: 2024-11-01
tags: [api, backend]
priority: medium
---

# Test Spec
`,
      'utf-8'
    );

    await updateFrontmatter(specFile, {
      status: 'in-progress',
    });

    const frontmatter = await parseFrontmatter(specFile);
    expect(frontmatter?.status).toBe('in-progress');
    expect(frontmatter?.tags).toEqual(['api', 'backend']);
    expect(frontmatter?.priority).toBe('medium');
  });

  it('should auto-set completed timestamp when status is complete', async () => {
    const specFile = path.join(ctx.tmpDir, 'test.md');
    await fs.writeFile(
      specFile,
      `---
status: in-progress
created: 2024-11-01
---

# Test Spec
`,
      'utf-8'
    );

    await updateFrontmatter(specFile, {
      status: 'complete',
    });

    const frontmatter = await parseFrontmatter(specFile);
    expect(frontmatter?.status).toBe('complete');
    expect(frontmatter?.completed).toBeDefined();
  });

  it('should preserve content when updating frontmatter', async () => {
    const content = `# Test Spec

## Overview

This is test content that should be preserved.

## Details

- Point 1
- Point 2
`;

    const specFile = path.join(ctx.tmpDir, 'test.md');
    await fs.writeFile(
      specFile,
      `---
status: planned
created: 2024-11-01
---

${content}`,
      'utf-8'
    );

    await updateFrontmatter(specFile, {
      status: 'in-progress',
    });

    const updatedContent = await fs.readFile(specFile, 'utf-8');
    expect(updatedContent).toContain('This is test content that should be preserved');
    expect(updatedContent).toContain('- Point 1');
  });
});

describe('matchesFilter', () => {
  it('should match status filter', () => {
    const frontmatter: SpecFrontmatter = {
      status: 'planned',
      created: '2024-11-01',
    };

    const filter: SpecFilterOptions = {
      status: 'planned',
    };

    expect(matchesFilter(frontmatter, filter)).toBe(true);
  });

  it('should not match wrong status', () => {
    const frontmatter: SpecFrontmatter = {
      status: 'planned',
      created: '2024-11-01',
    };

    const filter: SpecFilterOptions = {
      status: 'in-progress',
    };

    expect(matchesFilter(frontmatter, filter)).toBe(false);
  });

  it('should match multiple status values', () => {
    const frontmatter: SpecFrontmatter = {
      status: 'in-progress',
      created: '2024-11-01',
    };

    const filter: SpecFilterOptions = {
      status: ['planned', 'in-progress'],
    };

    expect(matchesFilter(frontmatter, filter)).toBe(true);
  });

  it('should match tags filter (all tags must match)', () => {
    const frontmatter: SpecFrontmatter = {
      status: 'planned',
      created: '2024-11-01',
      tags: ['api', 'backend', 'urgent'],
    };

    const filter: SpecFilterOptions = {
      tags: ['api', 'backend'],
    };

    expect(matchesFilter(frontmatter, filter)).toBe(true);
  });

  it('should not match if not all tags present', () => {
    const frontmatter: SpecFrontmatter = {
      status: 'planned',
      created: '2024-11-01',
      tags: ['api'],
    };

    const filter: SpecFilterOptions = {
      tags: ['api', 'backend'],
    };

    expect(matchesFilter(frontmatter, filter)).toBe(false);
  });

  it('should match priority filter', () => {
    const frontmatter: SpecFrontmatter = {
      status: 'planned',
      created: '2024-11-01',
      priority: 'high',
    };

    const filter: SpecFilterOptions = {
      priority: 'high',
    };

    expect(matchesFilter(frontmatter, filter)).toBe(true);
  });

  it('should match multiple priority values', () => {
    const frontmatter: SpecFrontmatter = {
      status: 'planned',
      created: '2024-11-01',
      priority: 'high',
    };

    const filter: SpecFilterOptions = {
      priority: ['high', 'critical'],
    };

    expect(matchesFilter(frontmatter, filter)).toBe(true);
  });

  it('should match assignee filter', () => {
    const frontmatter: SpecFrontmatter = {
      status: 'planned',
      created: '2024-11-01',
      assignee: 'john',
    };

    const filter: SpecFilterOptions = {
      assignee: 'john',
    };

    expect(matchesFilter(frontmatter, filter)).toBe(true);
  });

  it('should match multiple filters combined', () => {
    const frontmatter: SpecFrontmatter = {
      status: 'in-progress',
      created: '2024-11-01',
      tags: ['api', 'backend'],
      priority: 'high',
      assignee: 'john',
    };

    const filter: SpecFilterOptions = {
      status: 'in-progress',
      tags: ['api'],
      priority: 'high',
      assignee: 'john',
    };

    expect(matchesFilter(frontmatter, filter)).toBe(true);
  });

  it('should not match if any filter fails', () => {
    const frontmatter: SpecFrontmatter = {
      status: 'in-progress',
      created: '2024-11-01',
      tags: ['api', 'backend'],
      priority: 'high',
      assignee: 'john',
    };

    const filter: SpecFilterOptions = {
      status: 'in-progress',
      tags: ['api'],
      priority: 'low', // Wrong priority
      assignee: 'john',
    };

    expect(matchesFilter(frontmatter, filter)).toBe(false);
  });
});

describe('getSpecFile', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestEnvironment();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('should find default spec file', async () => {
    const specDir = path.join(ctx.tmpDir, 'spec');
    await fs.mkdir(specDir, { recursive: true });
    
    const specFile = path.join(specDir, 'README.md');
    await fs.writeFile(specFile, '# Test', 'utf-8');

    const result = await getSpecFile(specDir);
    expect(result).toBe(specFile);
  });

  it('should return null if spec file does not exist', async () => {
    const specDir = path.join(ctx.tmpDir, 'spec');
    await fs.mkdir(specDir, { recursive: true });

    const result = await getSpecFile(specDir);
    expect(result).toBeNull();
  });

  it('should use custom default file name', async () => {
    const specDir = path.join(ctx.tmpDir, 'spec');
    await fs.mkdir(specDir, { recursive: true });
    
    const specFile = path.join(specDir, 'SPEC.md');
    await fs.writeFile(specFile, '# Test', 'utf-8');

    const result = await getSpecFile(specDir, 'SPEC.md');
    expect(result).toBe(specFile);
  });
});

describe('validateCustomField', () => {
  it('should validate string type', () => {
    const result = validateCustomField('test', 'string');
    expect(result.valid).toBe(true);
    expect(result.coerced).toBe('test');
  });

  it('should coerce to string', () => {
    const result = validateCustomField(123, 'string');
    expect(result.valid).toBe(true);
    expect(result.coerced).toBe('123');
  });

  it('should validate number type', () => {
    const result = validateCustomField(42, 'number');
    expect(result.valid).toBe(true);
    expect(result.coerced).toBe(42);
  });

  it('should coerce to number', () => {
    const result = validateCustomField('42', 'number');
    expect(result.valid).toBe(true);
    expect(result.coerced).toBe(42);
  });

  it('should fail to coerce invalid number', () => {
    const result = validateCustomField('not-a-number', 'number');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should validate boolean type', () => {
    const result = validateCustomField(true, 'boolean');
    expect(result.valid).toBe(true);
    expect(result.coerced).toBe(true);
  });

  it('should coerce string to boolean', () => {
    expect(validateCustomField('true', 'boolean').coerced).toBe(true);
    expect(validateCustomField('yes', 'boolean').coerced).toBe(true);
    expect(validateCustomField('1', 'boolean').coerced).toBe(true);
    expect(validateCustomField('false', 'boolean').coerced).toBe(false);
    expect(validateCustomField('no', 'boolean').coerced).toBe(false);
    expect(validateCustomField('0', 'boolean').coerced).toBe(false);
  });

  it('should fail to coerce invalid boolean', () => {
    const result = validateCustomField('maybe', 'boolean');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should validate array type', () => {
    const result = validateCustomField(['a', 'b'], 'array');
    expect(result.valid).toBe(true);
    expect(result.coerced).toEqual(['a', 'b']);
  });

  it('should fail non-array for array type', () => {
    const result = validateCustomField('not-an-array', 'array');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('validateCustomFields', () => {
  it('should validate and coerce custom fields from config', () => {
    const frontmatter = {
      status: 'planned',
      created: '2024-11-01',
      sprint: '42',
      estimate: 'large',
    };

    const config: LeanSpecConfig = {
      template: 'spec-template.md',
      specsDir: 'specs',
      structure: {
        pattern: '{date}/{seq}-{name}/',
        dateFormat: 'YYYYMMDD',
        sequenceDigits: 3,
        defaultFile: 'README.md',
      },
      frontmatter: {
        custom: {
          sprint: 'number',
          estimate: 'string',
        },
      },
    };

    const validated = validateCustomFields(frontmatter, config);
    expect(validated.sprint).toBe(42); // Coerced to number
    expect(validated.estimate).toBe('large');
  });

  it('should work without custom fields in config', () => {
    const frontmatter = {
      status: 'planned',
      created: '2024-11-01',
    };

    const config: LeanSpecConfig = {
      template: 'spec-template.md',
      specsDir: 'specs',
      structure: {
        pattern: '{date}/{seq}-{name}/',
        dateFormat: 'YYYYMMDD',
        sequenceDigits: 3,
        defaultFile: 'README.md',
      },
    };

    const validated = validateCustomFields(frontmatter, config);
    expect(validated).toEqual(frontmatter);
  });

  it('should handle missing custom fields gracefully', () => {
    const frontmatter = {
      status: 'planned',
      created: '2024-11-01',
    };

    const config: LeanSpecConfig = {
      template: 'spec-template.md',
      specsDir: 'specs',
      structure: {
        pattern: '{date}/{seq}-{name}/',
        dateFormat: 'YYYYMMDD',
        sequenceDigits: 3,
        defaultFile: 'README.md',
      },
      frontmatter: {
        custom: {
          sprint: 'number',
          estimate: 'string',
        },
      },
    };

    const validated = validateCustomFields(frontmatter, config);
    expect(validated).toEqual(frontmatter);
  });
});

describe('Date Format Handling', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestEnvironment();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('should maintain date as string format (YYYY-MM-DD) after updates', async () => {
    const specFile = path.join(ctx.tmpDir, 'test.md');
    await fs.writeFile(
      specFile,
      `---
status: planned
created: '2025-11-03'
tags: []
priority: medium
---

# Test Spec

Content here.
`,
      'utf-8'
    );

    // Update with tags - this triggers gray-matter parse/stringify cycle
    await updateFrontmatter(specFile, {
      tags: ['test', 'bug-fix'],
    });

    // Read back and check the date format
    const content = await fs.readFile(specFile, 'utf-8');
    const frontmatter = await parseFrontmatter(specFile);
    
    // Date should remain as simple YYYY-MM-DD string, not ISO format
    expect(frontmatter?.created).toBe('2025-11-03');
    expect(typeof frontmatter?.created).toBe('string');
    
    // Verify in raw content that it's not the ISO format with timestamp
    expect(content).not.toContain('2025-11-03T00:00:00.000Z');
    expect(content).toContain("created: '2025-11-03'");
  });

  it('should convert Date objects to YYYY-MM-DD strings during updates', async () => {
    const specFile = path.join(ctx.tmpDir, 'test.md');
    
    // Simulate a case where gray-matter parses unquoted date as Date object
    await fs.writeFile(
      specFile,
      `---
status: planned
created: 2025-11-03
---

# Test Spec
`,
      'utf-8'
    );

    // Update - this should trigger our safeguard
    await updateFrontmatter(specFile, {
      status: 'in-progress',
    });

    // Read back and verify date is now a proper string
    const content = await fs.readFile(specFile, 'utf-8');
    const frontmatter = await parseFrontmatter(specFile);
    
    expect(typeof frontmatter?.created).toBe('string');
    expect(frontmatter?.created).toBe('2025-11-03');
    
    // Should NOT contain ISO timestamp format
    expect(content).not.toContain('T00:00:00.000Z');
  });
});
