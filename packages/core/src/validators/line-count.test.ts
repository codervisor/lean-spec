import { describe, it, expect } from 'vitest';
import { LineCountValidator } from './line-count.js';
import type { SpecInfo } from '../spec-loader.js';

describe('LineCountValidator', () => {
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

  describe('default thresholds (300 warning, 400 error)', () => {
    const validator = new LineCountValidator();

    it('should pass for specs under 300 lines', () => {
      // Generate exactly 250 lines (249 lines with content + 1 final newline)
      const content = Array(250).fill('line').join('\n');
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should pass with warning for specs between 300-400 lines', () => {
      // Generate exactly 350 lines
      const content = Array(350).fill('line').join('\n');
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('approaching limit');
      expect(result.warnings[0].message).toContain('350/400');
    });

    it('should warn at exactly 301 lines', () => {
      // Generate exactly 301 lines
      const content = Array(301).fill('line').join('\n');
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('301/400');
    });

    it('should pass without warning at exactly 300 lines', () => {
      // Generate exactly 300 lines
      const content = Array(300).fill('line').join('\n');
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should fail for specs over 400 lines', () => {
      // Generate exactly 450 lines
      const content = Array(450).fill('line').join('\n');
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('exceeds 400 lines');
      expect(result.errors[0].message).toContain('450 lines');
      expect(result.errors[0].suggestion).toContain('splitting into sub-specs');
      expect(result.warnings).toHaveLength(0);
    });

    it('should fail at exactly 401 lines', () => {
      // Generate exactly 401 lines
      const content = Array(401).fill('line').join('\n');
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('401 lines');
    });

    it('should pass at exactly 400 lines', () => {
      // Generate exactly 400 lines
      const content = Array(400).fill('line').join('\n');
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(1); // Still in warning zone (300-400)
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('custom thresholds', () => {
    it('should respect custom maxLines', () => {
      const validator = new LineCountValidator({ maxLines: 500 });
      const content = Array(450).fill('line').join('\n');
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail with custom maxLines', () => {
      const validator = new LineCountValidator({ maxLines: 200 });
      const content = Array(250).fill('line').join('\n');
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('exceeds 200 lines');
    });

    it('should respect custom warningThreshold', () => {
      const validator = new LineCountValidator({ warningThreshold: 100 });
      const content = Array(150).fill('line').join('\n');
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('approaching limit');
    });

    it('should use both custom thresholds', () => {
      const validator = new LineCountValidator({
        maxLines: 100,
        warningThreshold: 80,
      });
      
      // Below warning threshold
      let result = validator.validate(mockSpec, Array(70).fill('line').join('\n'));
      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(0);
      
      // In warning zone
      result = validator.validate(mockSpec, Array(90).fill('line').join('\n'));
      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(1);
      
      // Above max
      result = validator.validate(mockSpec, Array(110).fill('line').join('\n'));
      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    const validator = new LineCountValidator();

    it('should handle empty content', () => {
      const result = validator.validate(mockSpec, '');
      
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle single line', () => {
      const result = validator.validate(mockSpec, 'single line');
      
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should count lines correctly with different line endings', () => {
      const content = 'line1\nline2\nline3';
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(true);
      // Content has 3 lines (split by \n creates 3 elements)
    });

    it('should handle content without trailing newline', () => {
      const content = Array(300).fill('line').join('\n');
      const result = validator.validate(mockSpec, content);
      
      expect(result.passed).toBe(true);
    });
  });

  describe('validator metadata', () => {
    const validator = new LineCountValidator();

    it('should have correct name', () => {
      expect(validator.name).toBe('max-lines');
    });

    it('should have description', () => {
      expect(validator.description).toBeTruthy();
      expect(validator.description).toContain('Context Economy');
    });
  });
});
