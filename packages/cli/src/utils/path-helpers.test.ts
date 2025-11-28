import { describe, it, expect } from 'vitest';
import { createSpecDirPattern } from './path-helpers.js';

describe('createSpecDirPattern', () => {
  const pattern = createSpecDirPattern();

  describe('ASCII spec names', () => {
    it('should match simple sequence format (001-name)', () => {
      expect('001-test-feature'.match(pattern)).toBeTruthy();
      expect('123-feature'.match(pattern)).toBeTruthy();
      expect('99-short'.match(pattern)).toBeTruthy();
    });

    it('should match date prefix format (20251103-001-name)', () => {
      expect('20251103-001-feature'.match(pattern)).toBeTruthy();
      expect('20241225-123-holiday'.match(pattern)).toBeTruthy();
    });

    it('should match custom prefix format (spec-001-name)', () => {
      expect('spec-001-feature'.match(pattern)).toBeTruthy();
      expect('prefix-99-test'.match(pattern)).toBeTruthy();
    });
  });

  describe('Unicode/Chinese spec names', () => {
    it('should match Chinese spec names', () => {
      expect('001-测试'.match(pattern)).toBeTruthy();
      expect('002-功能开发'.match(pattern)).toBeTruthy();
      expect('123-中文名称'.match(pattern)).toBeTruthy();
    });

    it('should match Japanese spec names', () => {
      expect('001-テスト'.match(pattern)).toBeTruthy();
      expect('002-機能'.match(pattern)).toBeTruthy();
    });

    it('should match Korean spec names', () => {
      expect('001-테스트'.match(pattern)).toBeTruthy();
      expect('002-기능'.match(pattern)).toBeTruthy();
    });

    it('should match mixed Unicode and ASCII names', () => {
      expect('001-测试-feature'.match(pattern)).toBeTruthy();
      expect('002-feature-测试'.match(pattern)).toBeTruthy();
      expect('003-テスト-test'.match(pattern)).toBeTruthy();
    });

    it('should match date prefix with Chinese name', () => {
      expect('20251128-001-测试'.match(pattern)).toBeTruthy();
      expect('20241225-123-功能'.match(pattern)).toBeTruthy();
    });
  });

  describe('sequence number extraction', () => {
    it('should extract correct sequence number from ASCII names', () => {
      const match1 = '001-test'.match(pattern);
      expect(match1?.[1]).toBe('001');

      const match2 = '123-feature'.match(pattern);
      expect(match2?.[1]).toBe('123');
    });

    it('should extract correct sequence number from Chinese names', () => {
      const match1 = '001-测试'.match(pattern);
      expect(match1?.[1]).toBe('001');

      const match2 = '456-功能'.match(pattern);
      expect(match2?.[1]).toBe('456');
    });

    it('should extract sequence from date-prefixed names', () => {
      const match = '20251103-001-feature'.match(pattern);
      expect(match?.[1]).toBe('001');
    });
  });

  describe('non-matching patterns', () => {
    it('should not match names without dash after number', () => {
      expect('001test'.match(pattern)).toBeFalsy();
    });

    it('should not match 8-digit dates without sequence', () => {
      // This is intentional - 8-digit dates alone are not spec directories
      expect('20251103-'.match(pattern)).toBeFalsy();
    });

    it('should not match names with only numbers after dash', () => {
      // e.g., 001-123 should not match as the part after dash should be a name
      expect('001-123'.match(pattern)).toBeFalsy();
    });
  });
});
