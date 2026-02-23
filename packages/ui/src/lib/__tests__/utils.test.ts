import { describe, it, expect } from 'vitest';
import { cn, extractH1Title } from '../utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
    });

    it('should merge tailwind classes correctly', () => {
      expect(cn('p-2', 'p-4')).toBe('p-4');
    });

    it('should handle arrays', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar');
    });
  });

  describe('extractH1Title', () => {
    it('should extract H1 title from markdown', () => {
      expect(extractH1Title('# My Title\n\nContent here')).toBe('My Title');
    });

    it('should return null for empty markdown', () => {
      expect(extractH1Title('')).toBeNull();
    });

    it('should return null for markdown without H1', () => {
      expect(extractH1Title('## Not H1\n\nContent')).toBeNull();
    });

    it('should extract first H1 only', () => {
      expect(extractH1Title('# First\n\n# Second')).toBe('First');
    });
  });
});
