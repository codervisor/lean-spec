/**
 * Tests for sub-spec validator
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { SubSpecValidator } from './sub-spec.js';
import type { SpecInfo } from '../spec-loader.js';

// Test constants - aligned with validator token thresholds
// Using dense content (~15 tokens per line): "This is substantial content..."
const UNDER_THRESHOLD_LINES = 130; // ~1900 tokens - should pass (< 2K excellent)
const IN_WARNING_RANGE_LINES = 270; // ~4000 tokens - warning range (3.5K-5K)
const OVER_LIMIT_LINES = 350; // ~5200 tokens - should error (> 5K)

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

  describe('Token-Based Validation', () => {
    it('should pass when sub-specs are under token threshold', async () => {
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

      // Create a sub-spec with UNDER_THRESHOLD_LINES (~130 lines = ~1900 tokens, under 2K threshold)
      const designContent = '# Design\n\n' + 'Line content\n'.repeat(UNDER_THRESHOLD_LINES - 2);
      await fs.writeFile(path.join(specDir, 'DESIGN.md'), designContent);

      const spec = createSpecInfo(specDir);
      const result = await validator.validate(spec, readmeContent);

      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
      // Should have no token-related warnings (though may have orphaned file warnings)
      const tokenWarnings = result.warnings.filter(w => w.message.includes('token'));
      expect(tokenWarnings).toHaveLength(0);
    });

    it('should warn when sub-spec has high token count (3.5K-5K tokens)', async () => {
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

      // Create a sub-spec with ~4000 tokens (in warning range 3.5K-5K)
      // IN_WARNING_RANGE_LINES (270) - 4 header lines = 266 content lines
      const designContent = '# Design\n\n## Section\n\n' + 'This is substantial content that will generate tokens for testing the validator threshold behavior.\n'.repeat(IN_WARNING_RANGE_LINES - 4);
      await fs.writeFile(path.join(specDir, 'DESIGN.md'), designContent);

      const spec = createSpecInfo(specDir);
      const result = await validator.validate(spec, readmeContent);

      expect(result.passed).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.message.includes('tokens'))).toBe(true);
    });

    it('should error when sub-spec exceeds token threshold (>5K tokens)', async () => {
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

      // Create a sub-spec with OVER_LIMIT_LINES (~350 lines with dense content = ~5200 tokens, over 5K threshold)
      const designContent = '# Design\n\n## Section\n\n' + 'This is substantial content that will generate many tokens for testing the validator threshold behavior and exceed the limit.\n'.repeat(OVER_LIMIT_LINES - 4);
      await fs.writeFile(path.join(specDir, 'DESIGN.md'), designContent);

      const spec = createSpecInfo(specDir);
      const result = await validator.validate(spec, readmeContent);

      expect(result.passed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('tokens');
      expect(result.errors[0].message).toContain('threshold');
    });

    it('should respect custom token thresholds', async () => {
      // Use custom token thresholds
      const customGoodThreshold = 2000;
      const customWarningThreshold = 3000;
      const customValidator = new SubSpecValidator({ 
        goodThreshold: customGoodThreshold,
        warningThreshold: customWarningThreshold 
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

      // Create content that will trigger warning with custom threshold (~2500 tokens, in 2K-3K range)
      // Custom thresholds: good=2K, warning=3K (so 2K-3K should warn, >3K should error)
      const designContent = '# Design\n\n## Section\n\n' + 'This is content for testing custom thresholds in the validator.\n'.repeat(220);
      await fs.writeFile(path.join(specDir, 'DESIGN.md'), designContent);

      const spec = createSpecInfo(specDir);
      const result = await customValidator.validate(spec, readmeContent);

      expect(result.passed).toBe(true);
      expect(result.warnings.some(w => w.message.includes('tokens'))).toBe(true);
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

      // Lowercase filename (warning) + Over token threshold (error)
      const designContent = '# Design\n\n## Section\n\n' + 'This is substantial content that will generate many tokens for testing the validator threshold behavior and exceed the limit for error reporting.\n'.repeat(OVER_LIMIT_LINES);
      await fs.writeFile(path.join(specDir, 'design.md'), designContent);

      // Not linked (warning)
      await fs.writeFile(path.join(specDir, 'TESTING.md'), '# Testing\n');

      const spec = createSpecInfo(specDir);
      const result = await validator.validate(spec, readmeContent);

      expect(result.passed).toBe(false); // Has errors
      expect(result.errors.length).toBeGreaterThan(0); // Token count error
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
