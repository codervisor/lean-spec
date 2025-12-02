import { describe, it, expect } from 'vitest';
import { groupIssuesByFile, formatSummary } from './validate-formatter.js';
import type { ValidationResult } from './validation-framework.js';
import type { SpecInfo } from '../spec-loader.js';

describe('validate-formatter', () => {
  describe('groupIssuesByFile', () => {
    it('should group issues by file path', () => {
      const spec1: SpecInfo = {
        path: 'specs/001-test',
        filePath: '/tmp/specs/001-test/README.md',
        frontmatter: { status: 'planned', created: '2025-11-05' },
        content: '',
      };

      const spec2: SpecInfo = {
        path: 'specs/002-test',
        filePath: '/tmp/specs/002-test/README.md',
        frontmatter: { status: 'planned', created: '2025-11-05' },
        content: '',
      };

      const results = [
        {
          spec: spec1,
          validatorName: 'max-lines',
          result: {
            passed: false,
            errors: [{ message: 'Spec exceeds 400 lines', suggestion: 'Split the spec' }],
            warnings: [],
          },
          content: '',
        },
        {
          spec: spec1,
          validatorName: 'frontmatter',
          result: {
            passed: true,
            errors: [],
            warnings: [{ message: 'Missing optional field' }],
          },
          content: '',
        },
        {
          spec: spec2,
          validatorName: 'max-lines',
          result: {
            passed: true,
            errors: [],
            warnings: [{ message: 'Approaching limit' }],
          },
          content: '',
        },
      ];

      const grouped = groupIssuesByFile(results);

      expect(grouped).toHaveLength(2);
      expect(grouped[0].filePath).toBe('/tmp/specs/001-test/README.md');
      expect(grouped[0].issues).toHaveLength(2);
      expect(grouped[1].filePath).toBe('/tmp/specs/002-test/README.md');
      expect(grouped[1].issues).toHaveLength(1);
    });

    it('should sort errors before warnings within a file', () => {
      const spec: SpecInfo = {
        path: 'specs/001-test',
        filePath: '/tmp/specs/001-test/README.md',
        frontmatter: { status: 'planned', created: '2025-11-05' },
        content: '',
      };

      const results = [
        {
          spec,
          validatorName: 'rule1',
          result: {
            passed: true,
            errors: [],
            warnings: [{ message: 'Warning 1' }],
          },
          content: '',
        },
        {
          spec,
          validatorName: 'rule2',
          result: {
            passed: false,
            errors: [{ message: 'Error 1' }],
            warnings: [],
          },
          content: '',
        },
        {
          spec,
          validatorName: 'rule3',
          result: {
            passed: true,
            errors: [],
            warnings: [{ message: 'Warning 2' }],
          },
          content: '',
        },
      ];

      const grouped = groupIssuesByFile(results);

      expect(grouped).toHaveLength(1);
      expect(grouped[0].issues).toHaveLength(3);
      // Error should be first
      expect(grouped[0].issues[0].severity).toBe('error');
      expect(grouped[0].issues[0].message).toBe('Error 1');
      // Warnings should follow
      expect(grouped[0].issues[1].severity).toBe('warning');
      expect(grouped[0].issues[2].severity).toBe('warning');
    });

    it('should handle specs with no issues', () => {
      const spec: SpecInfo = {
        path: 'specs/001-test',
        filePath: '/tmp/specs/001-test/README.md',
        frontmatter: { status: 'planned', created: '2025-11-05' },
        content: '',
      };

      const results = [
        {
          spec,
          validatorName: 'max-lines',
          result: {
            passed: true,
            errors: [],
            warnings: [],
          },
          content: '',
        },
      ];

      const grouped = groupIssuesByFile(results);

      expect(grouped).toHaveLength(0);
    });
  });

  describe('formatSummary', () => {
    it('should format summary with errors', () => {
      const summary = formatSummary(10, 2, 3, 5);
      expect(summary).toContain('2 errors');
      expect(summary).toContain('3 warnings');
      expect(summary).toContain('10 specs checked');
      expect(summary).toContain('5 clean');
    });

    it('should use singular form for 1 error', () => {
      const summary = formatSummary(10, 1, 0, 9);
      expect(summary).toContain('1 error');
      expect(summary).not.toContain('errors');
    });

    it('should format summary with only warnings', () => {
      const summary = formatSummary(10, 0, 3, 7);
      expect(summary).toContain('3 warnings');
      expect(summary).toContain('10 specs checked');
      expect(summary).toContain('7 clean');
      expect(summary).not.toContain('error');
    });

    it('should format summary with all passing', () => {
      const summary = formatSummary(10, 0, 0, 10);
      expect(summary).toContain('All 10 specs passed');
      expect(summary).not.toContain('error');
      expect(summary).not.toContain('warning');
    });
  });
});
