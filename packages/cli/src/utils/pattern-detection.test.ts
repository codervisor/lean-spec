import { describe, it, expect } from 'vitest';
import { detectPatternType, isDateGroupedPattern, shouldGroupSpecs } from './pattern-detection.js';
import type { LeanSpecConfig } from '../config.js';

describe('pattern-detection', () => {
  describe('detectPatternType', () => {
    it('should detect flat pattern', () => {
      const config: LeanSpecConfig = {
        template: 'spec-template.md',
        specsDir: 'specs',
        structure: {
          pattern: 'flat',
          dateFormat: 'YYYYMMDD',
          sequenceDigits: 3,
          defaultFile: 'README.md',
        },
      };

      const result = detectPatternType(config);
      expect(result.type).toBe('flat');
      expect(result.shouldGroup).toBe(false);
      expect(result.groupExtractor).toBeUndefined();
    });

    it('should detect flat pattern with prefix', () => {
      const config: LeanSpecConfig = {
        template: 'spec-template.md',
        specsDir: 'specs',
        structure: {
          pattern: 'flat',
          prefix: '{YYYYMMDD}-',
          dateFormat: 'YYYYMMDD',
          sequenceDigits: 3,
          defaultFile: 'README.md',
        },
      };

      const result = detectPatternType(config);
      expect(result.type).toBe('flat');
      expect(result.shouldGroup).toBe(false);
    });

    it('should detect date-grouped custom pattern', () => {
      const config: LeanSpecConfig = {
        template: 'spec-template.md',
        specsDir: 'specs',
        structure: {
          pattern: 'custom',
          groupExtractor: '{YYYYMMDD}',
          dateFormat: 'YYYYMMDD',
          sequenceDigits: 3,
          defaultFile: 'README.md',
        },
      };

      const result = detectPatternType(config);
      expect(result.type).toBe('date-grouped');
      expect(result.shouldGroup).toBe(true);
      expect(result.groupExtractor).toBe('{YYYYMMDD}');
      expect(result.isDateBased).toBe(true);
    });

    it('should detect date-grouped pattern with YYYY-MM format', () => {
      const config: LeanSpecConfig = {
        template: 'spec-template.md',
        specsDir: 'specs',
        structure: {
          pattern: 'custom',
          groupExtractor: '{YYYY-MM}',
          dateFormat: 'YYYY-MM',
          sequenceDigits: 3,
          defaultFile: 'README.md',
        },
      };

      const result = detectPatternType(config);
      expect(result.type).toBe('date-grouped');
      expect(result.shouldGroup).toBe(true);
      expect(result.isDateBased).toBe(true);
    });

    it('should detect custom-grouped pattern with milestone', () => {
      const config: LeanSpecConfig = {
        template: 'spec-template.md',
        specsDir: 'specs',
        structure: {
          pattern: 'custom',
          groupExtractor: 'milestone-{milestone}',
          dateFormat: 'YYYYMMDD',
          sequenceDigits: 3,
          defaultFile: 'README.md',
        },
      };

      const result = detectPatternType(config);
      expect(result.type).toBe('custom-grouped');
      expect(result.shouldGroup).toBe(true);
      expect(result.groupExtractor).toBe('milestone-{milestone}');
      expect(result.isDateBased).toBe(false);
    });

    it('should detect custom-grouped pattern with team', () => {
      const config: LeanSpecConfig = {
        template: 'spec-template.md',
        specsDir: 'specs',
        structure: {
          pattern: 'custom',
          groupExtractor: 'team-{team}',
          dateFormat: 'YYYYMMDD',
          sequenceDigits: 3,
          defaultFile: 'README.md',
        },
      };

      const result = detectPatternType(config);
      expect(result.type).toBe('custom-grouped');
      expect(result.shouldGroup).toBe(true);
      expect(result.isDateBased).toBe(false);
    });

    it('should default to flat for custom pattern without groupExtractor', () => {
      const config: LeanSpecConfig = {
        template: 'spec-template.md',
        specsDir: 'specs',
        structure: {
          pattern: 'custom',
          dateFormat: 'YYYYMMDD',
          sequenceDigits: 3,
          defaultFile: 'README.md',
        },
      };

      const result = detectPatternType(config);
      expect(result.type).toBe('flat');
      expect(result.shouldGroup).toBe(false);
    });
  });

  describe('isDateGroupedPattern', () => {
    it('should return true for date-grouped patterns', () => {
      const config: LeanSpecConfig = {
        template: 'spec-template.md',
        specsDir: 'specs',
        structure: {
          pattern: 'custom',
          groupExtractor: '{YYYYMMDD}',
          dateFormat: 'YYYYMMDD',
          sequenceDigits: 3,
          defaultFile: 'README.md',
        },
      };

      expect(isDateGroupedPattern(config)).toBe(true);
    });

    it('should return false for flat patterns', () => {
      const config: LeanSpecConfig = {
        template: 'spec-template.md',
        specsDir: 'specs',
        structure: {
          pattern: 'flat',
          dateFormat: 'YYYYMMDD',
          sequenceDigits: 3,
          defaultFile: 'README.md',
        },
      };

      expect(isDateGroupedPattern(config)).toBe(false);
    });

    it('should return false for non-date custom patterns', () => {
      const config: LeanSpecConfig = {
        template: 'spec-template.md',
        specsDir: 'specs',
        structure: {
          pattern: 'custom',
          groupExtractor: 'milestone-{milestone}',
          dateFormat: 'YYYYMMDD',
          sequenceDigits: 3,
          defaultFile: 'README.md',
        },
      };

      expect(isDateGroupedPattern(config)).toBe(false);
    });
  });

  describe('shouldGroupSpecs', () => {
    it('should return true for date-grouped patterns', () => {
      const config: LeanSpecConfig = {
        template: 'spec-template.md',
        specsDir: 'specs',
        structure: {
          pattern: 'custom',
          groupExtractor: '{YYYYMMDD}',
          dateFormat: 'YYYYMMDD',
          sequenceDigits: 3,
          defaultFile: 'README.md',
        },
      };

      expect(shouldGroupSpecs(config)).toBe(true);
    });

    it('should return true for custom-grouped patterns', () => {
      const config: LeanSpecConfig = {
        template: 'spec-template.md',
        specsDir: 'specs',
        structure: {
          pattern: 'custom',
          groupExtractor: 'milestone-{milestone}',
          dateFormat: 'YYYYMMDD',
          sequenceDigits: 3,
          defaultFile: 'README.md',
        },
      };

      expect(shouldGroupSpecs(config)).toBe(true);
    });

    it('should return false for flat patterns', () => {
      const config: LeanSpecConfig = {
        template: 'spec-template.md',
        specsDir: 'specs',
        structure: {
          pattern: 'flat',
          dateFormat: 'YYYYMMDD',
          sequenceDigits: 3,
          defaultFile: 'README.md',
        },
      };

      expect(shouldGroupSpecs(config)).toBe(false);
    });

    it('should return false for flat patterns with date prefix', () => {
      const config: LeanSpecConfig = {
        template: 'spec-template.md',
        specsDir: 'specs',
        structure: {
          pattern: 'flat',
          prefix: '{YYYYMMDD}-',
          dateFormat: 'YYYYMMDD',
          sequenceDigits: 3,
          defaultFile: 'README.md',
        },
      };

      expect(shouldGroupSpecs(config)).toBe(false);
    });
  });
});
