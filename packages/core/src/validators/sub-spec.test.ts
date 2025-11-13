/**
 * Tests for sub-spec validator
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { SubSpecValidator } from './sub-spec.js';
import type { SpecInfo } from '../types/index.js';

// Test constants - aligned with validator defaults
const DEFAULT_MAX_LINES = 400;
const DEFAULT_WARNING_THRESHOLD = 300;
const UNDER_THRESHOLD_LINES = DEFAULT_WARNING_THRESHOLD - 50; // 250 lines
const IN_WARNING_RANGE_LINES = DEFAULT_WARNING_THRESHOLD + 50; // 350 lines
const OVER_LIMIT_LINES = DEFAULT_MAX_LINES + 50; // 450 lines

describe('SubSpecValidator', () => {
  let tmpDir: string;
  let validator: SubSpecValidator;

  beforeEach(async () => {
    // Create a temporary directory for test specs
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lean-spec-sub-spec-test-'));
    validator = new SubSpecValidator();
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('Naming Conventions', () => {
    it('should pass when sub-specs follow uppercase naming convention', async () => {
      const specDir = path.join(tmpDir, 'test-spec');
      await fs.mkdir(specDir, { recursive: true });

      // Create README.md
      const readmeContent = `---
status: in-progress
created: '2025-11-01'
---

# Test Spec

Links to sub-specs:
- [Design](./DESIGN.md)
- [Implementation](./IMPLEMENTATION.md)
`;
      await fs.writeFile(path.join(specDir, 'README.md'), readmeContent);

      // Create uppercase sub-specs
      await fs.writeFile(path.join(specDir, 'DESIGN.md'), '# Design\n\nDesign content here.');
      await fs.writeFile(path.join(specDir, 'IMPLEMENTATION.md'), '# Implementation\n\nImplementation here.');

      const spec = createSpecInfo(specDir);
      const result = await validator.validate(spec, readmeContent);

      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn when sub-spec filename is not uppercase', async () => {
      const specDir = path.join(tmpDir, 'test-spec');
      await fs.mkdir(specDir, { recursive: true });

      const readmeContent = `---
status: in-progress
created: '2025-11-01'
---

# Test Spec

Some content with no links
`;
      await fs.writeFile(path.join(specDir, 'README.md'), readmeContent);
      await fs.writeFile(path.join(specDir, 'design.md'), '# Design\n');

      const spec = createSpecInfo(specDir);
      const result = await validator.validate(spec, readmeContent);

      expect(result.passed).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.message.includes('should be uppercase'))).toBe(true);
      expect(result.warnings.some(w => w.suggestion?.includes('DESIGN.md'))).toBe(true);
    });

    it('should warn for mixed case filenames', async () => {
      const specDir = path.join(tmpDir, 'test-spec');
      await fs.mkdir(specDir, { recursive: true });

      const readmeContent = `---
status: in-progress
created: '2025-11-01'
---

# Test Spec
`;
      await fs.writeFile(path.join(specDir, 'README.md'), readmeContent);
      await fs.writeFile(path.join(specDir, 'Design.md'), '# Design\n');

      const spec = createSpecInfo(specDir);
      const result = await validator.validate(spec, readmeContent);

      expect(result.warnings.some(w => w.message.includes('should be uppercase'))).toBe(true);
    });
  });

  describe('Line Count Validation', () => {
    it('should pass when all sub-specs are under 300 lines', async () => {
      const specDir = path.join(tmpDir, 'test-spec');
      await fs.mkdir(specDir, { recursive: true });

      const readmeContent = `---
status: in-progress
created: '2025-11-01'
---

# Test Spec

[Design](./DESIGN.md)
`;
      await fs.writeFile(path.join(specDir, 'README.md'), readmeContent);

      // Create a sub-spec with UNDER_THRESHOLD_LINES (250 lines)
      const designContent = '# Design\n\n' + 'Line content\n'.repeat(UNDER_THRESHOLD_LINES - 2);
      await fs.writeFile(path.join(specDir, 'DESIGN.md'), designContent);

      const spec = createSpecInfo(specDir);
      const result = await validator.validate(spec, readmeContent);

      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn when sub-spec has elevated token count (3.5K-5K tokens)', async () => {
      const specDir = path.join(tmpDir, 'test-spec');
      await fs.mkdir(specDir, { recursive: true });

      const readmeContent = `---
status: in-progress
created: '2025-11-01'
---

# Test Spec

[Design](./DESIGN.md)
`;
      await fs.writeFile(path.join(specDir, 'README.md'), readmeContent);

      // Create a sub-spec with elevated token count by using verbose content
      // Target ~4000 tokens which should be in warning zone (3.5K-5K)
      const paragraphs = `
This is a detailed paragraph about the design of the system. It contains multiple sentences
that describe various aspects of the architecture, implementation details, and design decisions.
We need to make sure this content is substantial enough to reach our target token count for testing.

The system implements a complex workflow that involves multiple stages of processing. Each stage
has its own set of requirements and constraints that must be carefully managed to ensure proper
operation. This includes handling edge cases, error conditions, and performance optimization.

Additional considerations include scalability concerns, security requirements, and maintainability
objectives. The design must balance these competing concerns while delivering a solution that
meets all functional requirements and non-functional requirements specified by stakeholders.
`.trim();
      
      // Repeat enough times to reach ~4000 tokens (each paragraph is roughly 150 tokens)
      // Use 24 repetitions = ~3600 tokens (well within 3.5K-5K warning zone)
      const designContent = '# Design\n\n' + (paragraphs + '\n\n').repeat(24);
      await fs.writeFile(path.join(specDir, 'DESIGN.md'), designContent);

      const spec = createSpecInfo(specDir);
      const result = await validator.validate(spec, readmeContent);

      // Should pass (warning zone, not error)
      expect(result.passed).toBe(true);
      // Should have at least one warning about complexity/tokens
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should error when sub-spec exceeds 5K token threshold', async () => {
      const specDir = path.join(tmpDir, 'test-spec');
      await fs.mkdir(specDir, { recursive: true });

      const readmeContent = `---
status: in-progress
created: '2025-11-01'
---

# Test Spec

[Design](./DESIGN.md)
`;
      await fs.writeFile(path.join(specDir, 'README.md'), readmeContent);

      // Create a sub-spec with >5000 tokens (should trigger error)
      // "Line content text here\n" is ~5 tokens, so 1100 lines ~= 5500 tokens
      const designContent = '# Design\n\n' + 'Line content text here\n'.repeat(1100);
      await fs.writeFile(path.join(specDir, 'DESIGN.md'), designContent);

      const spec = createSpecInfo(specDir);
      const result = await validator.validate(spec, readmeContent);

      expect(result.passed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('complexity too high');
    });

    it('should respect custom token thresholds', async () => {
      const customValidator = new SubSpecValidator({ 
        warningThreshold: 1500,  // Lower warning threshold
        maxLines: 200
      });
      const specDir = path.join(tmpDir, 'test-spec');
      await fs.mkdir(specDir, { recursive: true });

      const readmeContent = `---
status: in-progress
created: '2025-11-01'
---

# Test Spec

[Design](./DESIGN.md)
`;
      await fs.writeFile(path.join(specDir, 'README.md'), readmeContent);

      // Create a sub-spec with ~1800 tokens (below default but above custom threshold)
      // "Line content text here\n" is ~5 tokens, so 360 lines ~= 1800 tokens
      const designContent = '# Design\n\n' + 'Line content text here\n'.repeat(360);
      await fs.writeFile(path.join(specDir, 'DESIGN.md'), designContent);

      const spec = createSpecInfo(specDir);
      const result = await customValidator.validate(spec, readmeContent);

      expect(result.passed).toBe(false); // Should error with custom lower threshold
      expect(result.errors.some(e => e.message.includes('complexity too high'))).toBe(true);
    });
  });

  describe('Orphaned Sub-Specs', () => {
    it('should warn when sub-spec is not linked from README', async () => {
      const specDir = path.join(tmpDir, 'test-spec');
      await fs.mkdir(specDir, { recursive: true });

      const readmeContent = `---
status: in-progress
created: '2025-11-01'
---

# Test Spec

Some content but no links to DESIGN.md
`;
      await fs.writeFile(path.join(specDir, 'README.md'), readmeContent);
      await fs.writeFile(path.join(specDir, 'DESIGN.md'), '# Design\n');

      const spec = createSpecInfo(specDir);
      const result = await validator.validate(spec, readmeContent);

      expect(result.passed).toBe(true);
      expect(result.warnings.some(w => w.message.includes('Orphaned sub-spec'))).toBe(true);
      expect(result.warnings.some(w => w.message.includes('DESIGN.md'))).toBe(true);
    });

    it('should pass when all sub-specs are linked from README', async () => {
      const specDir = path.join(tmpDir, 'test-spec');
      await fs.mkdir(specDir, { recursive: true });

      const readmeContent = `---
status: in-progress
created: '2025-11-01'
---

# Test Spec

See:
- [Design Details](./DESIGN.md)
- [Implementation Plan](./IMPLEMENTATION.md)
`;
      await fs.writeFile(path.join(specDir, 'README.md'), readmeContent);
      await fs.writeFile(path.join(specDir, 'DESIGN.md'), '# Design\n');
      await fs.writeFile(path.join(specDir, 'IMPLEMENTATION.md'), '# Implementation\n');

      const spec = createSpecInfo(specDir);
      const result = await validator.validate(spec, readmeContent);

      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect links with and without ./ prefix', async () => {
      const specDir = path.join(tmpDir, 'test-spec');
      await fs.mkdir(specDir, { recursive: true });

      const readmeContent = `---
status: in-progress
created: '2025-11-01'
---

# Test Spec

Links:
- [Design](./DESIGN.md) - with prefix
- [Testing](TESTING.md) - without prefix
`;
      await fs.writeFile(path.join(specDir, 'README.md'), readmeContent);
      await fs.writeFile(path.join(specDir, 'DESIGN.md'), '# Design\n');
      await fs.writeFile(path.join(specDir, 'TESTING.md'), '# Testing\n');

      const spec = createSpecInfo(specDir);
      const result = await validator.validate(spec, readmeContent);

      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('Cross-Reference Validation', () => {
    it('should pass when all cross-references are valid', async () => {
      const specDir = path.join(tmpDir, 'test-spec');
      await fs.mkdir(specDir, { recursive: true });

      const readmeContent = `---
status: in-progress
created: '2025-11-01'
---

# Test Spec

[Design](./DESIGN.md)
[Testing](./TESTING.md)
`;
      await fs.writeFile(path.join(specDir, 'README.md'), readmeContent);

      const designContent = '# Design\n\nSee [Testing](./TESTING.md) for test details.';
      await fs.writeFile(path.join(specDir, 'DESIGN.md'), designContent);

      const testingContent = '# Testing\n\nSee [Design](./DESIGN.md) for context.';
      await fs.writeFile(path.join(specDir, 'TESTING.md'), testingContent);

      const spec = createSpecInfo(specDir);
      const result = await validator.validate(spec, readmeContent);

      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn when cross-reference points to non-existent file', async () => {
      const specDir = path.join(tmpDir, 'test-spec');
      await fs.mkdir(specDir, { recursive: true });

      const readmeContent = `---
status: in-progress
created: '2025-11-01'
---

# Test Spec

[Design](./DESIGN.md)
`;
      await fs.writeFile(path.join(specDir, 'README.md'), readmeContent);

      const designContent = '# Design\n\nSee [Missing](./MISSING.md) for details.';
      await fs.writeFile(path.join(specDir, 'DESIGN.md'), designContent);

      const spec = createSpecInfo(specDir);
      const result = await validator.validate(spec, readmeContent);

      expect(result.passed).toBe(true);
      expect(result.warnings.some(w => w.message.includes('Broken reference'))).toBe(true);
      expect(result.warnings.some(w => w.message.includes('MISSING.md'))).toBe(true);
    });

    it('should allow references to README.md', async () => {
      const specDir = path.join(tmpDir, 'test-spec');
      await fs.mkdir(specDir, { recursive: true });

      const readmeContent = `---
status: in-progress
created: '2025-11-01'
---

# Test Spec

[Design](./DESIGN.md)
`;
      await fs.writeFile(path.join(specDir, 'README.md'), readmeContent);

      const designContent = '# Design\n\nSee [Overview](./README.md) for context.';
      await fs.writeFile(path.join(specDir, 'DESIGN.md'), designContent);

      const spec = createSpecInfo(specDir);
      const result = await validator.validate(spec, readmeContent);

      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should skip cross-reference validation when disabled', async () => {
      const noCheckValidator = new SubSpecValidator({ checkCrossReferences: false });
      const specDir = path.join(tmpDir, 'test-spec');
      await fs.mkdir(specDir, { recursive: true });

      const readmeContent = `---
status: in-progress
created: '2025-11-01'
---

# Test Spec

[Design](./DESIGN.md)
`;
      await fs.writeFile(path.join(specDir, 'README.md'), readmeContent);

      const designContent = '# Design\n\nSee [Missing](./MISSING.md) for details.';
      await fs.writeFile(path.join(specDir, 'DESIGN.md'), designContent);

      const spec = createSpecInfo(specDir);
      const result = await noCheckValidator.validate(spec, readmeContent);

      expect(result.warnings.some(w => w.message.includes('Broken reference'))).toBe(false);
    });
  });

  describe('No Sub-Specs', () => {
    it('should pass when spec has no sub-specs', async () => {
      const specDir = path.join(tmpDir, 'test-spec');
      await fs.mkdir(specDir, { recursive: true });

      const readmeContent = `---
status: in-progress
created: '2025-11-01'
---

# Test Spec

Just a simple spec with no sub-files.
`;
      await fs.writeFile(path.join(specDir, 'README.md'), readmeContent);

      const spec = createSpecInfo(specDir);
      const result = await validator.validate(spec, readmeContent);

      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('Multiple Issues', () => {
    it('should report multiple issues in a single validation', async () => {
      const specDir = path.join(tmpDir, 'test-spec');
      await fs.mkdir(specDir, { recursive: true });

      const readmeContent = `---
status: in-progress
created: '2025-11-01'
---

# Test Spec

Only links [Testing](./TESTING.md)
`;
      await fs.writeFile(path.join(specDir, 'README.md'), readmeContent);

      // Lowercase filename (warning) + Over token limit (error)
      // "Line content text\n" is ~4 tokens, so 1300 lines ~= 5200 tokens (> 5000 threshold)
      const designContent = '# Design\n\n' + 'Line content text\n'.repeat(1300);
      await fs.writeFile(path.join(specDir, 'design.md'), designContent);

      // Not linked (warning)
      await fs.writeFile(path.join(specDir, 'TESTING.md'), '# Testing\n');

      const spec = createSpecInfo(specDir);
      const result = await validator.validate(spec, readmeContent);

      expect(result.passed).toBe(false); // Has errors
      expect(result.errors.length).toBeGreaterThan(0); // Complexity error
      expect(result.warnings.length).toBeGreaterThan(0); // Naming + orphaned
    });
  });
});

/**
 * Helper to create a SpecInfo object for testing
 */
function createSpecInfo(specDir: string): SpecInfo {
  return {
    path: path.basename(specDir),
    fullPath: specDir,
    filePath: path.join(specDir, 'README.md'),
    name: path.basename(specDir),
    date: '20251105',
    frontmatter: {
      status: 'in-progress',
      created: '2025-11-01',
    },
  };
}
