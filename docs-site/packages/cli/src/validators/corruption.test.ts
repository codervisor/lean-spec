/**
 * Tests for corruption validator
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { CorruptionValidator } from './corruption.js';
import type { SpecInfo } from '../spec-loader.js';

describe('CorruptionValidator', () => {
  let tempDir: string;
  let validator: CorruptionValidator;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lean-spec-corruption-test-'));
    validator = new CorruptionValidator();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to create a spec info for testing
   */
  function createSpecInfo(name: string): SpecInfo {
    return {
      path: name,
      fullPath: path.join(tempDir, name),
      filePath: path.join(tempDir, name, 'README.md'),
      name: name,
      date: '20251105',
      frontmatter: {
        status: 'planned',
        created: '2025-11-05',
      },
    };
  }

  describe('Code block validation', () => {
    it('should pass for properly closed code blocks', () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

Some content.

\`\`\`javascript
const x = 1;
console.log(x);
\`\`\`

More content.
`;
      const spec = createSpecInfo('valid-code-block');
      const result = validator.validate(spec, content);
      
      expect(result.passed).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should fail for unclosed code blocks', () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

Some content.

\`\`\`javascript
const x = 1;
console.log(x);

More content without closing.
`;
      const spec = createSpecInfo('unclosed-code-block');
      const result = validator.validate(spec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors.some(e => e.message.includes('Unclosed code block'))).toBe(true);
    });

    it('should handle multiple code blocks correctly', () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

\`\`\`javascript
const x = 1;
\`\`\`

Some text.

\`\`\`python
y = 2
\`\`\`

More text.
`;
      const spec = createSpecInfo('multiple-code-blocks');
      const result = validator.validate(spec, content);
      
      expect(result.passed).toBe(true);
    });
  });

  // NOTE: JSON/YAML validation removed - code examples often intentionally show invalid syntax
  // This was causing too many false positives (examples vs real content)
  describe.skip('JSON/YAML validation (REMOVED)', () => {
    it('should pass for valid JSON blocks', () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

\`\`\`json
{
  "name": "test",
  "value": 123
}
\`\`\`
`;
      const spec = createSpecInfo('valid-json');
      const result = validator.validate(spec, content);
      
      expect(result.passed).toBe(true);
    });

    it('should fail for invalid JSON blocks', () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

\`\`\`json
{
  "name": "test"
  "value": 123
}
\`\`\`
`;
      const spec = createSpecInfo('invalid-json');
      const result = validator.validate(spec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors.some(e => e.message.includes('Invalid JSON'))).toBe(true);
    });

    it('should pass for valid YAML blocks', () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

\`\`\`yaml
name: test
value: 123
items:
  - one
  - two
\`\`\`
`;
      const spec = createSpecInfo('valid-yaml');
      const result = validator.validate(spec, content);
      
      expect(result.passed).toBe(true);
    });

    it('should fail for invalid YAML blocks', () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

\`\`\`yaml
name: test
value: [incomplete
items:
  - one
\`\`\`
`;
      const spec = createSpecInfo('invalid-yaml');
      const result = validator.validate(spec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors.some(e => e.message.includes('Invalid YAML'))).toBe(true);
    });

    it('should handle JSONC with comments', () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

\`\`\`jsonc
{
  "name": "test", // This is a comment
  "value": 123
}
\`\`\`
`;
      const spec = createSpecInfo('jsonc-with-comments');
      const result = validator.validate(spec, content);
      
      expect(result.passed).toBe(true);
    });

    it('should skip non-JSON/YAML code blocks', () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

\`\`\`javascript
const x = { this is not valid JS but we don't check it }
\`\`\`
`;
      const spec = createSpecInfo('non-json-yaml');
      const result = validator.validate(spec, content);
      
      expect(result.passed).toBe(true);
    });
  });

  // NOTE: Duplicate content detection removed - too noisy, not actual corruption
  // Most "duplicates" were boilerplate, templates, or similar code examples
  describe.skip('Duplicate content detection (REMOVED)', () => {
    it('should warn about duplicate content blocks', () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

## Section One

This is a long paragraph with substantial content that should not be duplicated.
It contains multiple lines and meaningful text.

## Section Two

This is a long paragraph with substantial content that should not be duplicated.
It contains multiple lines and meaningful text.
`;
      const spec = createSpecInfo('duplicate-content');
      const result = validator.validate(spec, content);
      
      expect(result.passed).toBe(true); // Duplicates are warnings, not errors
      expect(result.warnings.some(w => w.message.includes('Duplicate content block'))).toBe(true);
    });

    it('should not warn about short duplicated lines', () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

- Item 1
- Item 2
- Item 1

No warning for short duplicates.
`;
      const spec = createSpecInfo('short-duplicates');
      const result = validator.validate(spec, content);
      
      expect(result.passed).toBe(true);
      expect(result.warnings.length).toBe(0);
    });

    it('should not warn about empty line duplicates', () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec



Some content.



More content.
`;
      const spec = createSpecInfo('empty-duplicates');
      const result = validator.validate(spec, content);
      
      expect(result.passed).toBe(true);
      expect(result.warnings.length).toBe(0);
    });
  });

  describe('Markdown structure validation', () => {
    it('should fail for unclosed bold formatting', () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

This is **bold text that is never closed.

More content here.
`;
      const spec = createSpecInfo('unclosed-bold');
      const result = validator.validate(spec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors.some(e => e.message.includes('Unclosed bold formatting'))).toBe(true);
    });

    it('should fail for unclosed italic formatting', () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

This is *italic text that is never closed.

More content here.
`;
      const spec = createSpecInfo('unclosed-italic');
      const result = validator.validate(spec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors.some(e => e.message.includes('Unclosed italic formatting'))).toBe(true);
    });

    it('should pass for properly formatted markdown', () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

This is **bold** and this is *italic* and **both are *closed* properly**.

More content here.
`;
      const spec = createSpecInfo('proper-formatting');
      const result = validator.validate(spec, content);
      
      expect(result.passed).toBe(true);
    });

    it('should handle nested formatting correctly', () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

This is **bold with *italic* inside** and it works.
`;
      const spec = createSpecInfo('nested-formatting');
      const result = validator.validate(spec, content);
      
      expect(result.passed).toBe(true);
    });
  });

  describe('Selective validation', () => {
    it('should skip code block checks when disabled', () => {
      const validator = new CorruptionValidator({ checkCodeBlocks: false });
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

\`\`\`javascript
unclosed code block
`;
      const spec = createSpecInfo('disabled-check');
      const result = validator.validate(spec, content);
      
      expect(result.passed).toBe(true); // No error because check is disabled
    });

    it('should skip markdown structure checks when disabled', () => {
      const validator = new CorruptionValidator({ checkMarkdownStructure: false });
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

This has **unclosed bold formatting.
`;
      const spec = createSpecInfo('disabled-markdown-check');
      const result = validator.validate(spec, content);
      
      expect(result.passed).toBe(true);
    });
  });

  describe('Duplicate content detection', () => {
    it('should not flag overlapping windows as duplicates', () => {
      // This tests the bug fix: sliding window creates overlapping blocks
      // that share 4 out of 5 lines, causing false positives
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

## Overview

Line 1 of normal content
Line 2 of normal content
Line 3 of normal content
Line 4 of normal content
Line 5 of normal content
Line 6 of normal content
Line 7 of normal content

More content here.
`;
      const spec = createSpecInfo('overlapping-windows');
      const result = validator.validate(spec, content);
      
      expect(result.passed).toBe(true);
      // Should not report adjacent lines as duplicates (e.g., lines 12, 13)
      expect(result.warnings.length).toBe(0);
    });

    it('should detect actual duplicate blocks separated by distance', () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

## Section One

This is a very long paragraph with substantial content that should not be duplicated anywhere in the document.
It contains multiple lines and meaningful text specifically for testing purposes and validation.
We need at least 200 characters to trigger the duplicate detection logic with current thresholds.
This ensures we only catch real duplicates, not short common phrases or similar patterns.
Line five adds more content to meet the character requirement for duplicate detection.
Line six continues with unique text to ensure the block is long enough.
Line seven adds even more content to guarantee we exceed the minimum length threshold.
Line eight completes our substantial block of duplicated content for testing purposes.

## Middle Section

Some different content in the middle to separate the duplicates.
This provides distance between the duplicate blocks.
It has completely different text that won't match.
More unique content here.

## Section Two

This is a very long paragraph with substantial content that should not be duplicated anywhere in the document.
It contains multiple lines and meaningful text specifically for testing purposes and validation.
We need at least 200 characters to trigger the duplicate detection logic with current thresholds.
This ensures we only catch real duplicates, not short common phrases or similar patterns.
Line five adds more content to meet the character requirement for duplicate detection.
Line six continues with unique text to ensure the block is long enough.
Line seven adds even more content to guarantee we exceed the minimum length threshold.
Line eight completes our substantial block of duplicated content for testing purposes.
`;
      const spec = createSpecInfo('real-duplicates');
      const result = validator.validate(spec, content);
      
      expect(result.passed).toBe(true); // Duplicates are warnings, not errors
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.message.includes('Duplicate content block'))).toBe(true);
    });

    it('should detect duplicates in code blocks', () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

\`\`\`typescript
This is a very long paragraph with substantial content that should not be duplicated anywhere.
It contains multiple lines and meaningful text specifically for testing purposes and validation.
We need at least 200 characters to trigger the duplicate detection logic with current thresholds.
This ensures we only catch real duplicates, not short common phrases or similar patterns.
Line five adds more content to meet the character requirement for duplicate detection.
Line six continues with unique text to ensure the block is long enough.
Line seven adds even more content to guarantee we exceed the minimum length threshold.
Line eight completes our substantial block of duplicated content for testing purposes.
\`\`\`

Some content between.

\`\`\`typescript
This is a very long paragraph with substantial content that should not be duplicated anywhere.
It contains multiple lines and meaningful text specifically for testing purposes and validation.
We need at least 200 characters to trigger the duplicate detection logic with current thresholds.
This ensures we only catch real duplicates, not short common phrases or similar patterns.
Line five adds more content to meet the character requirement for duplicate detection.
Line six continues with unique text to ensure the block is long enough.
Line seven adds even more content to guarantee we exceed the minimum length threshold.
Line eight completes our substantial block of duplicated content for testing purposes.
\`\`\`
`;
      const spec = createSpecInfo('duplicates-in-code');
      const result = validator.validate(spec, content);
      
      expect(result.passed).toBe(true); // Duplicates are warnings, not errors
      expect(result.warnings.length).toBeGreaterThan(0); // Should warn about code block duplicates
      expect(result.warnings.some(w => w.message.includes('Duplicate content block'))).toBe(true);
    });
  });

  describe('Real-world corruption scenarios', () => {
    it('should detect multiple corruption issues in one spec', () => {
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

## Overview

This section has **unclosed bold.

## Design

Some content here.

\`\`\`typescript
const code = "that is never closed
`;
      const spec = createSpecInfo('multiple-issues');
      const result = validator.validate(spec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      // Note: No warnings anymore (removed duplicate detection and JSON/YAML validation)
    });
  });
});
