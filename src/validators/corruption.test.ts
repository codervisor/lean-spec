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
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lspec-corruption-test-'));
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
      id: name,
      path: path.join(tempDir, name),
      filePath: path.join(tempDir, name, 'README.md'),
      title: name,
      status: 'planned',
      created: '2025-11-05',
      metadata: {
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

  describe('JSON/YAML validation', () => {
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

  describe('Duplicate content detection', () => {
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

    it('should skip JSON/YAML checks when disabled', () => {
      const validator = new CorruptionValidator({ checkJsonYaml: false });
      const content = `---
status: planned
created: '2025-11-05'
---

# Test Spec

\`\`\`json
{ invalid json }
\`\`\`
`;
      const spec = createSpecInfo('disabled-json-check');
      const result = validator.validate(spec, content);
      
      expect(result.passed).toBe(true);
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

\`\`\`json
{
  "broken": "json"
  "missing": "comma"
}
\`\`\`

## Design

Some repeated content that appears multiple times in the document.
This is substantial enough to be detected as duplication.
It should trigger a warning about potential merge conflicts.

## Implementation

Some repeated content that appears multiple times in the document.
This is substantial enough to be detected as duplication.
It should trigger a warning about potential merge conflicts.

\`\`\`typescript
const code = "that is never closed
`;
      const spec = createSpecInfo('multiple-issues');
      const result = validator.validate(spec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
