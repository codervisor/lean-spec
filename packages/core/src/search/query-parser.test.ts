/**
 * Unit tests for query parser
 */

import { describe, it, expect } from 'vitest';
import {
  tokenize,
  parseQuery,
  levenshteinDistance,
  fuzzyMatch,
  getSearchSyntaxHelp,
} from './query-parser.js';

describe('Query Parser', () => {
  describe('tokenize', () => {
    it('should tokenize simple terms', () => {
      const tokens = tokenize('hello world');
      expect(tokens).toEqual([
        { type: 'TERM', value: 'hello', position: 0 },
        { type: 'TERM', value: 'world', position: 6 },
        { type: 'EOF', value: '', position: 11 },
      ]);
    });

    it('should tokenize quoted phrases', () => {
      const tokens = tokenize('"exact phrase"');
      expect(tokens).toEqual([
        { type: 'PHRASE', value: 'exact phrase', position: 0 },
        { type: 'EOF', value: '', position: 14 },
      ]);
    });

    it('should tokenize boolean operators', () => {
      const tokens = tokenize('a AND b OR c NOT d');
      expect(tokens.map(t => t.type)).toEqual([
        'TERM',
        'AND',
        'TERM',
        'OR',
        'TERM',
        'NOT',
        'TERM',
        'EOF',
      ]);
    });

    it('should tokenize field filters', () => {
      const tokens = tokenize('status:planned tag:api');
      expect(tokens).toEqual([
        { type: 'FIELD', value: 'status:planned', position: 0 },
        { type: 'FIELD', value: 'tag:api', position: 15 },
        { type: 'EOF', value: '', position: 22 },
      ]);
    });

    it('should tokenize fuzzy terms', () => {
      const tokens = tokenize('authetication~');
      expect(tokens).toEqual([
        { type: 'FUZZY', value: 'authetication', position: 0 },
        { type: 'EOF', value: '', position: 14 },
      ]);
    });

    it('should tokenize parentheses', () => {
      const tokens = tokenize('(a OR b) AND c');
      expect(tokens.map(t => t.type)).toEqual([
        'LPAREN',
        'TERM',
        'OR',
        'TERM',
        'RPAREN',
        'AND',
        'TERM',
        'EOF',
      ]);
    });

    it('should handle date filters with operators', () => {
      const tokens = tokenize('created:>2025-11-01');
      expect(tokens).toEqual([
        { type: 'FIELD', value: 'created:>2025-11-01', position: 0 },
        { type: 'EOF', value: '', position: 19 },
      ]);
    });
  });

  describe('parseQuery', () => {
    it('should parse simple terms', () => {
      const result = parseQuery('hello world');
      expect(result.terms).toEqual(['hello', 'world']);
      expect(result.hasAdvancedSyntax).toBe(false);
    });

    it('should parse quoted phrases', () => {
      const result = parseQuery('"exact phrase"');
      expect(result.terms).toEqual(['exact phrase']);
      expect(result.hasAdvancedSyntax).toBe(true);
    });

    it('should parse field filters', () => {
      const result = parseQuery('status:in-progress tag:api');
      expect(result.fields).toEqual([
        { field: 'status', value: 'in-progress', exact: true },
        { field: 'tag', value: 'api', exact: true },
      ]);
      expect(result.hasAdvancedSyntax).toBe(true);
    });

    it('should parse date filters with greater than', () => {
      const result = parseQuery('created:>2025-11-01');
      expect(result.dateFilters).toEqual([
        { field: 'created', operator: '>', value: '2025-11-01' },
      ]);
    });

    it('should parse date filters with less than', () => {
      const result = parseQuery('created:<2025-11-15');
      expect(result.dateFilters).toEqual([
        { field: 'created', operator: '<', value: '2025-11-15' },
      ]);
    });

    it('should parse date range filters', () => {
      const result = parseQuery('created:2025-11-01..2025-11-15');
      expect(result.dateFilters).toEqual([
        {
          field: 'created',
          operator: 'range',
          value: '2025-11-01',
          endValue: '2025-11-15',
        },
      ]);
    });

    it('should parse fuzzy terms', () => {
      const result = parseQuery('authetication~');
      expect(result.fuzzyTerms).toEqual(['authetication']);
      expect(result.hasAdvancedSyntax).toBe(true);
    });

    it('should parse complex queries', () => {
      const result = parseQuery('tag:api status:planned created:>2025-11');
      expect(result.fields.length).toBe(3);
      expect(result.dateFilters.length).toBe(1);
    });

    it('should handle empty query', () => {
      const result = parseQuery('');
      expect(result.terms).toEqual([]);
      expect(result.ast).toBeNull();
    });

    it('should handle whitespace-only query', () => {
      const result = parseQuery('   ');
      expect(result.terms).toEqual([]);
      expect(result.ast).toBeNull();
    });

    it('should parse boolean AND', () => {
      const result = parseQuery('api AND authentication');
      expect(result.ast?.type).toBe('AND');
      expect(result.terms).toContain('api');
      expect(result.terms).toContain('authentication');
      expect(result.hasAdvancedSyntax).toBe(true);
    });

    it('should parse boolean OR', () => {
      const result = parseQuery('frontend OR backend');
      expect(result.ast?.type).toBe('OR');
      expect(result.terms).toContain('frontend');
      expect(result.terms).toContain('backend');
      expect(result.hasAdvancedSyntax).toBe(true);
    });

    it('should parse boolean NOT', () => {
      const result = parseQuery('api NOT deprecated');
      expect(result.ast?.type).toBe('AND');
      expect(result.ast?.right?.type).toBe('NOT');
      expect(result.hasAdvancedSyntax).toBe(true);
    });

    it('should parse parentheses for grouping', () => {
      const result = parseQuery('(frontend OR backend) AND api');
      expect(result.ast?.type).toBe('AND');
      expect(result.ast?.left?.type).toBe('OR');
    });

    it('should handle implicit AND', () => {
      // Terms next to each other are implicitly ANDed
      const result = parseQuery('api authentication');
      expect(result.ast?.type).toBe('AND');
    });
  });

  describe('levenshteinDistance', () => {
    it('should return 0 for identical strings', () => {
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
    });

    it('should return correct distance for one character difference', () => {
      expect(levenshteinDistance('hello', 'hallo')).toBe(1);
      expect(levenshteinDistance('hello', 'hellp')).toBe(1);
    });

    it('should return correct distance for insertions', () => {
      expect(levenshteinDistance('hello', 'helllo')).toBe(1);
    });

    it('should return correct distance for deletions', () => {
      expect(levenshteinDistance('hello', 'helo')).toBe(1);
    });

    it('should return length of other string for empty string', () => {
      expect(levenshteinDistance('', 'hello')).toBe(5);
      expect(levenshteinDistance('hello', '')).toBe(5);
    });

    it('should handle common typos', () => {
      expect(levenshteinDistance('authetication', 'authentication')).toBe(1);
      expect(levenshteinDistance('teh', 'the')).toBe(2);
    });
  });

  describe('fuzzyMatch', () => {
    it('should match exact strings', () => {
      expect(fuzzyMatch('hello', 'hello world')).toBe(true);
    });

    it('should match with typos', () => {
      expect(fuzzyMatch('authetication', 'authentication flow')).toBe(true);
    });

    it('should match with one character difference', () => {
      expect(fuzzyMatch('hellp', 'hello world')).toBe(true);
    });

    it('should not match completely different words', () => {
      expect(fuzzyMatch('hello', 'goodbye world')).toBe(false);
    });

    it('should respect max distance', () => {
      // 'apple' and 'apppp' have distance 2 (le -> pp)
      expect(fuzzyMatch('apple', 'apppp', 2)).toBe(true);
      expect(fuzzyMatch('apple', 'apppp', 1)).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(fuzzyMatch('HELLO', 'hello world')).toBe(true);
    });
  });

  describe('getSearchSyntaxHelp', () => {
    it('should return non-empty help text', () => {
      const help = getSearchSyntaxHelp();
      expect(help.length).toBeGreaterThan(100);
    });

    it('should include examples of syntax', () => {
      const help = getSearchSyntaxHelp();
      expect(help).toContain('status:');
      expect(help).toContain('tag:');
      expect(help).toContain('AND');
      expect(help).toContain('OR');
      expect(help).toContain('NOT');
      expect(help).toContain('~');
    });
  });
});
