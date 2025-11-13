/**
 * Unit tests for search context extraction
 */

import { describe, it, expect } from 'vitest';
import {
  extractContext,
  extractSmartContext,
  deduplicateMatches,
  limitMatches,
} from './context.js';
import type { SearchMatch } from './types.js';

describe('Search Context', () => {
  describe('extractContext', () => {
    it('should return full line if short enough', () => {
      const text = 'line 1\nshort match\nline 3';
      const result = extractContext(text, 1, ['match'], 80);
      
      expect(result.text).toBe('short match');
      expect(result.highlights).toEqual([[6, 11]]);
    });

    it('should truncate long lines with ellipsis', () => {
      const longLine = 'a'.repeat(200);
      const text = `line 1\n${longLine}\nline 3`;
      const result = extractContext(text, 1, ['aaa'], 80);
      
      expect(result.text).toContain('...');
      expect(result.text.length).toBeLessThan(200);
    });

    it('should center context around first match', () => {
      const text = 'line 1\n' + 'x'.repeat(100) + 'match' + 'y'.repeat(100) + '\nline 3';
      const result = extractContext(text, 1, ['match'], 80);
      
      expect(result.text).toContain('match');
      expect(result.text.startsWith('...')).toBe(true);
      expect(result.text.endsWith('...')).toBe(true);
    });

    it('should find highlights in context', () => {
      const text = 'line 1\nthis is a test match here\nline 3';
      const result = extractContext(text, 1, ['test', 'match'], 80);
      
      expect(result.highlights.length).toBe(2);
      expect(result.highlights.some(([start, end]) => 
        result.text.substring(start, end).toLowerCase().includes('test')
      )).toBe(true);
      expect(result.highlights.some(([start, end]) => 
        result.text.substring(start, end).toLowerCase().includes('match')
      )).toBe(true);
    });
  });

  describe('extractSmartContext', () => {
    it('should respect sentence boundaries when close', () => {
      const text = 'line 1\nFirst sentence. Match here. Another sentence.\nline 3';
      const result = extractSmartContext(text, 1, ['match'], 50);
      
      // Should ideally include "Match here." or expand to sentence boundaries
      expect(result.text).toContain('Match');
      expect(result.text).toContain('here');
    });

    it('should handle text without sentence boundaries', () => {
      const text = 'line 1\nno punctuation just a long match string here\nline 3';
      const result = extractSmartContext(text, 1, ['match'], 30);
      
      expect(result.text).toContain('match');
    });
  });

  describe('deduplicateMatches', () => {
    it('should keep non-content matches', () => {
      const matches: SearchMatch[] = [
        {
          field: 'title',
          text: 'Title Match',
          score: 90,
          highlights: [],
          occurrences: 1,
        },
        {
          field: 'name',
          text: 'name-match',
          score: 80,
          highlights: [],
          occurrences: 1,
        },
      ];

      const result = deduplicateMatches(matches, 3);
      expect(result.length).toBe(2);
    });

    it('should remove nearby content matches', () => {
      const matches: SearchMatch[] = [
        {
          field: 'content',
          text: 'match at line 10',
          lineNumber: 10,
          score: 90,
          highlights: [],
          occurrences: 1,
        },
        {
          field: 'content',
          text: 'match at line 11',
          lineNumber: 11,
          score: 85,
          highlights: [],
          occurrences: 1,
        },
        {
          field: 'content',
          text: 'match at line 12',
          lineNumber: 12,
          score: 80,
          highlights: [],
          occurrences: 1,
        },
      ];

      const result = deduplicateMatches(matches, 3);
      // Should keep only the highest scoring one
      expect(result.length).toBe(1);
      expect(result[0].lineNumber).toBe(10);
    });

    it('should keep distant matches', () => {
      const matches: SearchMatch[] = [
        {
          field: 'content',
          text: 'match at line 10',
          lineNumber: 10,
          score: 90,
          highlights: [],
          occurrences: 1,
        },
        {
          field: 'content',
          text: 'match at line 20',
          lineNumber: 20,
          score: 85,
          highlights: [],
          occurrences: 1,
        },
      ];

      const result = deduplicateMatches(matches, 3);
      expect(result.length).toBe(2);
    });

    it('should sort by field priority and score', () => {
      const matches: SearchMatch[] = [
        {
          field: 'content',
          text: 'content match',
          score: 95,
          highlights: [],
          occurrences: 1,
        },
        {
          field: 'title',
          text: 'title match',
          score: 80,
          highlights: [],
          occurrences: 1,
        },
        {
          field: 'description',
          text: 'description match',
          score: 85,
          highlights: [],
          occurrences: 1,
        },
      ];

      const result = deduplicateMatches(matches, 3);
      expect(result[0].field).toBe('title');
      expect(result[1].field).toBe('description');
      expect(result[2].field).toBe('content');
    });
  });

  describe('limitMatches', () => {
    it('should not limit if under max', () => {
      const matches: SearchMatch[] = [
        {
          field: 'title',
          text: 'match 1',
          score: 90,
          highlights: [],
          occurrences: 1,
        },
        {
          field: 'content',
          text: 'match 2',
          score: 80,
          highlights: [],
          occurrences: 1,
        },
      ];

      const result = limitMatches(matches, 5);
      expect(result.length).toBe(2);
    });

    it('should always include non-content matches', () => {
      const matches: SearchMatch[] = [
        {
          field: 'title',
          text: 'title',
          score: 90,
          highlights: [],
          occurrences: 1,
        },
        {
          field: 'name',
          text: 'name',
          score: 85,
          highlights: [],
          occurrences: 1,
        },
        {
          field: 'tags',
          text: 'tag',
          score: 80,
          highlights: [],
          occurrences: 1,
        },
        {
          field: 'description',
          text: 'desc',
          score: 75,
          highlights: [],
          occurrences: 1,
        },
        ...Array.from({ length: 10 }, (_, i) => ({
          field: 'content' as const,
          text: `content ${i}`,
          score: 70 - i,
          highlights: [] as Array<[number, number]>,
          occurrences: 1,
        })),
      ];

      const result = limitMatches(matches, 5);
      expect(result.length).toBe(5);
      
      // All non-content should be included
      expect(result.some(m => m.field === 'title')).toBe(true);
      expect(result.some(m => m.field === 'name')).toBe(true);
      expect(result.some(m => m.field === 'tags')).toBe(true);
      expect(result.some(m => m.field === 'description')).toBe(true);
    });

    it('should include best content matches up to limit', () => {
      const matches: SearchMatch[] = Array.from({ length: 10 }, (_, i) => ({
        field: 'content' as const,
        text: `content ${i}`,
        score: 90 - i * 5,
        highlights: [] as Array<[number, number]>,
        occurrences: 1,
      }));

      const result = limitMatches(matches, 3);
      expect(result.length).toBe(3);
      
      // Should have highest scoring ones
      expect(result[0].score).toBe(90);
      expect(result[1].score).toBe(85);
      expect(result[2].score).toBe(80);
    });
  });
});
