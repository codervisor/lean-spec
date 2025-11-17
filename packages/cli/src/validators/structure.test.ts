/**
 * Tests for structure validator
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { StructureValidator } from './structure.js';
import type { SpecInfo } from '../spec-loader.js';

describe('StructureValidator', () => {
  let tempDir: string;
  let validator: StructureValidator;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lean-spec-structure-test-'));
    validator = new StructureValidator();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to create a spec directory with README.md
   */
  async function createSpec(name: string, content: string): Promise<SpecInfo | any> {
    const specPath = path.join(tempDir, name);
    await fs.mkdir(specPath, { recursive: true });
    const readmePath = path.join(specPath, 'README.md');
    await fs.writeFile(readmePath, content);

    return {
      id: name,
      path: specPath,
      filePath: readmePath,
      title: name,
      status: 'planned',
      created: '2025-11-05',
      metadata: {
        status: 'planned',
        created: '2025-11-05',
      },
    };
  }

  describe('H1 title validation', () => {
    it('should fail if no H1 title exists', async () => {
      const content = `---
status: planned
created: '2025-11-05'
---

## Overview

No H1 title here.
`;
      const spec = await createSpec('no-title', content);
      const result = await validator.validate(spec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors.some(e => e.message.includes('Missing H1 title'))).toBe(true);
    });

    it('should pass if H1 title exists', async () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# My Spec Title

## Overview

Content here.
`;
      const spec = await createSpec('with-title', content);
      const result = await validator.validate(spec, content);
      
      expect(result.passed).toBe(true);
    });
  });

  describe('Section recommendations', () => {
    it('should skip warnings when overview/design sections are missing', async () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

## Implementation

Only implementation, no Overview or Design.
`;
      const spec = await createSpec('missing-sections', content);
      const result = await validator.validate(spec, content);

      expect(result.passed).toBe(true);
      expect(result.warnings.length).toBe(0);
    });

    it('should ignore strict mode (required sections disabled)', async () => {
      const strictValidator = new StructureValidator({ strict: true });
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

## Implementation

Only implementation section.
`;
      const spec = await createSpec('missing-sections-strict', content);
      const result = await strictValidator.validate(spec, content);

      expect(result.passed).toBe(true);
      expect(result.warnings.length).toBe(0);
      expect(result.errors.length).toBe(0);
    });

    it('should still pass complete specs without emitting warnings', async () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

## Overview

Overview content.

## Design

Design content.
`;
      const spec = await createSpec('all-sections', content);
      const result = await validator.validate(spec, content);

      expect(result.passed).toBe(true);
      expect(result.warnings.length).toBe(0);
    });
  });

  describe('Empty sections handling', () => {
    it('should treat empty sections as acceptable noise', async () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

## Overview

## Design

Content in design.
`;
      const spec = await createSpec('empty-section', content);
      const result = await validator.validate(spec, content);

      expect(result.passed).toBe(true);
      expect(result.warnings.length).toBe(0);
    });

    it('should focus on duplicates rather than empty optional sections', async () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

## Overview

Content here.

## Optional Empty Section

## Another Section

Final content.
`;
      const spec = await createSpec('empty-optional', content);
      const result = await validator.validate(spec, content);

      expect(result.passed).toBe(true);
      expect(result.warnings.length).toBe(0);
    });
  });

  describe('Duplicate headers detection', () => {
    it('should fail if duplicate headers exist at same level', async () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

## Overview

First overview.

## Design

Design content.

## Overview

Duplicate overview!
`;
      const spec = await createSpec('duplicate-headers', content);
      const result = await validator.validate(spec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors.some(e => e.message.includes('Duplicate section header: ## Overview'))).toBe(true);
    });

    it('should allow same header text at different levels', async () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

## Overview

Main overview.

### Overview

Sub-overview (different level).

## Design

Design content.
`;
      const spec = await createSpec('different-levels', content);
      const result = await validator.validate(spec, content);
      
      expect(result.passed).toBe(true);
    });

    it('should detect multiple duplicates', async () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

## Overview

First.

## Design

First design.

## Overview

Second.

## Design

Second design.

## Overview

Third!
`;
      const spec = await createSpec('multiple-duplicates', content);
      const result = await validator.validate(spec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors.filter(e => e.message.includes('Duplicate section header: ## Overview')).length).toBeGreaterThan(0);
      expect(result.errors.filter(e => e.message.includes('Duplicate section header: ## Design')).length).toBeGreaterThan(0);
    });

    it('should be case-insensitive for duplicate detection', async () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

## Overview

First overview.

## OVERVIEW

Duplicate with different case!
`;
      const spec = await createSpec('case-sensitive-dup', content);
      const result = await validator.validate(spec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors.some(e => e.message.includes('Duplicate section header'))).toBe(true);
    });
  });

  describe('Frontmatter parsing errors', () => {
    it('should handle malformed frontmatter gracefully', async () => {
      const content = `---
status: planned
invalid yaml: [
---

# Test Spec

## Overview

Content.
`;
      const spec = await createSpec('bad-frontmatter', content);
      const result = await validator.validate(spec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors.some(e => e.message.includes('Failed to parse frontmatter'))).toBe(true);
    });
  });

  describe('Complete valid spec', () => {
    it('should pass for a complete valid spec', async () => {
      const content = `---
status: in-progress
created: '2025-11-05'
tags:
  - feature
  - test
priority: medium
---

# Complete Test Spec

> **Status**: ⏳ In progress · **Priority**: Medium

## Overview

This is a complete spec with all required sections.

## Design

### Architecture

Design details here.

### Implementation

More details.

## Testing

Test plan here.

## Notes

Additional notes.
`;
      const spec = await createSpec('complete-spec', content);
      const result = await validator.validate(spec, content);
      
      expect(result.passed).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.length).toBe(0);
    });
  });
});
