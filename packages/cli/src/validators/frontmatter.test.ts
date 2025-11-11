import { describe, it, expect } from 'vitest';
import { FrontmatterValidator } from './frontmatter.js';
import type { SpecInfo } from '../spec-loader.js';

describe('FrontmatterValidator', () => {
  const mockSpec: SpecInfo = {
    path: 'specs/001-test-spec',
    fullPath: '/test/specs/001-test-spec',
    filePath: '/test/specs/001-test-spec/README.md',
    name: '001-test-spec',
    date: '20251105',
    frontmatter: {
      status: 'planned',
      created: '2025-11-05',
    },
  };

  describe('valid frontmatter', () => {
    const validator = new FrontmatterValidator();

    it('should pass for valid minimal frontmatter', () => {
      const content = `---
status: planned
created: 2025-11-05
---

# Test Spec
`;
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should pass for valid complete frontmatter', () => {
      const content = `---
status: in-progress
created: 2025-11-05
priority: high
tags:
  - api
  - feature
updated: 2025-11-06
assignee: alice
reviewer: bob
---

# Test Spec
`;
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass for all valid status values', () => {
      const statuses = ['planned', 'in-progress', 'complete', 'archived'];
      const validator = new FrontmatterValidator();

      for (const status of statuses) {
        const content = `---
status: ${status}
created: 2025-11-05
---

# Test
`;
        const result = validator.validate(mockSpec, content);
        expect(result.passed).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('should pass for all valid priority values', () => {
      const priorities = ['low', 'medium', 'high', 'critical'];
      const validator = new FrontmatterValidator();

      for (const priority of priorities) {
        const content = `---
status: planned
created: 2025-11-05
priority: ${priority}
---

# Test
`;
        const result = validator.validate(mockSpec, content);
        expect(result.passed).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('should pass for ISO 8601 date formats', () => {
      const dates = [
        '2025-11-05',
        '2025-01-01',
        '2025-12-31',
      ];

      for (const date of dates) {
        const content = `---
status: planned
created: ${date}
---

# Test
`;
        const result = validator.validate(mockSpec, content);
        expect(result.passed).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('should pass for ISO 8601 timestamp formats', () => {
      const timestamps = [
        '2025-11-05T00:00:00Z',
        '2025-11-05T00:00:00.123Z',
        '2025-11-05T00:00:00.1Z',
        '2025-11-05T00:00:00+00:00',
        '2025-11-05T00:00:00-05:00',
      ];

      for (const timestamp of timestamps) {
        const content = `---
status: planned
created: ${timestamp}
---

# Test
`;
        const result = validator.validate(mockSpec, content);
        expect(result.passed).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('should pass for tags as array', () => {
      const content = `---
status: planned
created: 2025-11-05
tags:
  - api
  - feature
  - validation
---

# Test
`;
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('missing required fields', () => {
    const validator = new FrontmatterValidator();

    it('should fail when status is missing', () => {
      const content = `---
created: 2025-11-05
---

# Test
`;
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Missing required field: status');
      expect(result.errors[0].suggestion).toBeTruthy();
    });

    it('should fail when created is missing', () => {
      const content = `---
status: planned
---

# Test
`;
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Missing required field: created');
      expect(result.errors[0].suggestion).toBeTruthy();
    });

    it('should fail when both required fields are missing', () => {
      const content = `---
tags:
  - test
---

# Test
`;
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.some(e => e.message.includes('status'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('created'))).toBe(true);
    });

    it('should fail when no frontmatter exists', () => {
      const content = `# Test Spec

No frontmatter here.
`;
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('No frontmatter found');
    });
  });

  describe('invalid status values', () => {
    const validator = new FrontmatterValidator();

    it('should fail for invalid status value', () => {
      const content = `---
status: wip
created: 2025-11-05
---

# Test
`;
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Invalid status: "wip"');
      expect(result.errors[0].suggestion).toContain('planned, in-progress, complete, archived');
    });

    it('should coerce non-string status to string and validate', () => {
      const content = `---
status: 123
created: 2025-11-05
---

# Test
`;
      const result = validator.validate(mockSpec, content);
      
      // Should fail because "123" is not a valid status value
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('Invalid status: "123"');
    });
  });

  describe('invalid priority values', () => {
    const validator = new FrontmatterValidator();

    it('should fail for invalid priority value', () => {
      const content = `---
status: planned
created: 2025-11-05
priority: urgent
---

# Test
`;
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Invalid priority: "urgent"');
      expect(result.errors[0].suggestion).toContain('low, medium, high, critical');
    });

    it('should coerce non-string priority to string and validate', () => {
      const content = `---
status: planned
created: 2025-11-05
priority: 5
---

# Test
`;
      const result = validator.validate(mockSpec, content);
      
      // Should fail because "5" is not a valid priority value
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('Invalid priority: "5"');
    });
  });

  describe('date format validation', () => {
    const validator = new FrontmatterValidator();

    it('should fail for invalid date format', () => {
      const content = `---
status: planned
created: 11/05/2025
---

# Test
`;
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors.some(e => e.message.includes('invalid date format'))).toBe(true);
      expect(result.errors.some(e => e.suggestion?.includes('YYYY-MM-DD'))).toBe(true);
    });

    it('should fail for invalid date value', () => {
      const content = `---
status: planned
created: 2025-99-99
---

# Test
`;
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors.some(e => e.message.includes('invalid date'))).toBe(true);
    });

    it('should warn for invalid optional date fields', () => {
      const content = `---
status: planned
created: 2025-11-05
updated: invalid-date
---

# Test
`;
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(true); // Still passes because updated is optional
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('invalid date format');
    });

    it('should fail for non-string/non-date created field', () => {
      const content = `---
status: planned
created: 20251105
---

# Test
`;
      const result = validator.validate(mockSpec, content);
      
      // YAML parses 20251105 as number, which isn't a valid date string
      expect(result.passed).toBe(false);
      expect(result.errors.some(e => e.message.includes('invalid date format'))).toBe(true);
    });
  });

  describe('tags validation', () => {
    const validator = new FrontmatterValidator();

    it('should fail when tags is not an array', () => {
      const content = `---
status: planned
created: 2025-11-05
tags: api, feature
---

# Test
`;
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('must be an array');
    });

    it('should accept tags with various types (YAML parses them)', () => {
      // Note: YAML will parse numbers and booleans, which is fine
      // They'll be coerced to strings when used
      const content = `---
status: planned
created: 2025-11-05
tags:
  - api
  - 123
  - true
---

# Test
`;
      const result = validator.validate(mockSpec, content);
      
      // Should pass - we accept YAML's parsing behavior
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass for empty tags array', () => {
      const content = `---
status: planned
created: 2025-11-05
tags: []
---

# Test
`;
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('YAML parsing errors', () => {
    const validator = new FrontmatterValidator();

    it('should fail for malformed YAML', () => {
      // This YAML is actually valid - just has an unusual value
      // Let's use truly malformed YAML
      const content = `---
status: planned
created: [2025-11-05
---

# Test
`;
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Failed to parse frontmatter YAML');
    });
  });

  describe('custom valid values', () => {
    it('should respect custom valid statuses', () => {
      const validator = new FrontmatterValidator({
        validStatuses: ['todo', 'doing', 'done'],
      });

      const content = `---
status: doing
created: 2025-11-05
---

# Test
`;
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(true);
    });

    it('should fail with custom valid statuses for default values', () => {
      const validator = new FrontmatterValidator({
        validStatuses: ['todo', 'doing', 'done'],
      });

      const content = `---
status: planned
created: 2025-11-05
---

# Test
`;
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('Invalid status: "planned"');
    });
  });

  describe('validator metadata', () => {
    const validator = new FrontmatterValidator();

    it('should have correct name', () => {
      expect(validator.name).toBe('frontmatter');
    });

    it('should have description', () => {
      expect(validator.description).toBeTruthy();
      expect(validator.description).toContain('frontmatter');
    });
  });
});
