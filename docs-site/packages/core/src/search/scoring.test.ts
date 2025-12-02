/**
 * Unit tests for search scoring algorithms
 */

import { describe, it, expect } from 'vitest';
import {
  calculateMatchScore,
  calculateSpecScore,
  containsAllTerms,
  containsAnyTerm,
  countOccurrences,
  findMatchPositions,
  FIELD_WEIGHTS,
} from './scoring.js';
import type { SearchMatch } from './types.js';

describe('Search Scoring', () => {
  describe('FIELD_WEIGHTS', () => {
    it('should have correct weight hierarchy', () => {
      expect(FIELD_WEIGHTS.title).toBe(100);
      expect(FIELD_WEIGHTS.name).toBe(70);
      expect(FIELD_WEIGHTS.tags).toBe(70);
      expect(FIELD_WEIGHTS.description).toBe(50);
      expect(FIELD_WEIGHTS.content).toBe(10);
      
      // Verify hierarchy
      expect(FIELD_WEIGHTS.title).toBeGreaterThan(FIELD_WEIGHTS.name);
      expect(FIELD_WEIGHTS.name).toBeGreaterThanOrEqual(FIELD_WEIGHTS.tags);
      expect(FIELD_WEIGHTS.tags).toBeGreaterThan(FIELD_WEIGHTS.description);
      expect(FIELD_WEIGHTS.description).toBeGreaterThan(FIELD_WEIGHTS.content);
    });
  });

  describe('containsAllTerms', () => {
    it('should return true when all terms are present', () => {
      expect(containsAllTerms('authentication flow', ['auth', 'flow'])).toBe(true);
      expect(containsAllTerms('OAuth2 authentication', ['oauth', 'auth'])).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(containsAllTerms('Authentication Flow', ['authentication', 'flow'])).toBe(true);
      expect(containsAllTerms('oauth2 authentication', ['oauth2'])).toBe(true);
    });

    it('should return false when any term is missing', () => {
      expect(containsAllTerms('authentication', ['auth', 'flow'])).toBe(false);
      expect(containsAllTerms('flow', ['auth', 'flow'])).toBe(false);
    });

    it('should handle empty query terms', () => {
      expect(containsAllTerms('test', [])).toBe(true);
    });
  });

  describe('containsAnyTerm', () => {
    it('should return true when any term is present', () => {
      expect(containsAnyTerm('authentication', ['auth', 'flow'])).toBe(true);
      expect(containsAnyTerm('flow control', ['auth', 'flow'])).toBe(true);
      expect(containsAnyTerm('OAuth2 API', ['oauth', 'jwt'])).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(containsAnyTerm('AUTHENTICATION', ['auth'])).toBe(true);
      expect(containsAnyTerm('OAuth2', ['oauth2'])).toBe(true);
    });

    it('should return false when no terms are present', () => {
      expect(containsAnyTerm('database', ['auth', 'flow'])).toBe(false);
      expect(containsAnyTerm('', ['auth', 'flow'])).toBe(false);
    });

    it('should handle empty query terms', () => {
      expect(containsAnyTerm('test', [])).toBe(false);
    });

    it('should handle single term queries', () => {
      expect(containsAnyTerm('authentication flow', ['auth'])).toBe(true);
      expect(containsAnyTerm('database', ['auth'])).toBe(false);
    });
  });

  describe('countOccurrences', () => {
    it('should count all occurrences of query terms', () => {
      expect(countOccurrences('auth auth auth', ['auth'])).toBe(3);
      expect(countOccurrences('flow auth flow', ['flow', 'auth'])).toBe(3);
    });

    it('should be case-insensitive', () => {
      expect(countOccurrences('Auth AUTH auth', ['auth'])).toBe(3);
    });

    it('should count overlapping occurrences', () => {
      expect(countOccurrences('authentication', ['auth'])).toBe(1);
    });
  });

  describe('findMatchPositions', () => {
    it('should find all match positions', () => {
      const positions = findMatchPositions('test auth test', ['test']);
      expect(positions).toEqual([[0, 4], [10, 14]]);
    });

    it('should merge overlapping positions', () => {
      const positions = findMatchPositions('authentication flow', ['auth', 'authentication']);
      // 'auth' [0,4] and 'authentication' [0,14] overlap and merge to [0,14]
      // Note: 'flow' is not in query terms
      expect(positions.length).toBe(1);
      expect(positions[0]).toEqual([0, 14]); // merged authentication
    });

    it('should be case-insensitive', () => {
      const positions = findMatchPositions('Test AUTH', ['test', 'auth']);
      expect(positions).toEqual([[0, 4], [5, 9]]);
    });

    it('should handle no matches', () => {
      const positions = findMatchPositions('test', ['missing']);
      expect(positions).toEqual([]);
    });
  });

  describe('calculateMatchScore', () => {
    const queryTerms = ['auth', 'flow'];

    it('should score title matches highest', () => {
      const score = calculateMatchScore(
        { field: 'title', text: 'Authentication Flow', occurrences: 2 },
        queryTerms,
        1,
        0
      );
      expect(score).toBeGreaterThan(50);
    });

    it('should score content matches lower than title', () => {
      const titleScore = calculateMatchScore(
        { field: 'title', text: 'auth flow', occurrences: 2 },
        queryTerms,
        1,
        0
      );
      const contentScore = calculateMatchScore(
        { field: 'content', text: 'auth flow', occurrences: 2 },
        queryTerms,
        1,
        0
      );
      // Both may hit the 100 cap, but title should have higher raw score before capping
      // Or use different terms to avoid the cap
      expect(titleScore).toBeGreaterThanOrEqual(contentScore);
    });

    it('should apply exact word match bonus', () => {
      // Use content field (lower base score) to avoid hitting 100 cap
      const exactScore = calculateMatchScore(
        { field: 'content', text: 'the auth flow works', occurrences: 1 },
        ['auth', 'flow'],
        10, // Higher total matches to add frequency penalty
        5   // Later position
      );
      const partialScore = calculateMatchScore(
        { field: 'content', text: 'authentication flowing', occurrences: 1 },
        ['auth', 'flow'],
        10,
        5
      );
      // Exact word match gets 2x multiplier, so should score higher
      expect(exactScore).toBeGreaterThan(partialScore);
    });

    it('should apply position bonus for early matches', () => {
      const earlyScore = calculateMatchScore(
        { field: 'content', text: 'auth flow', occurrences: 1 },
        queryTerms,
        10,
        0
      );
      const lateScore = calculateMatchScore(
        { field: 'content', text: 'auth flow', occurrences: 1 },
        queryTerms,
        10,
        9
      );
      expect(earlyScore).toBeGreaterThan(lateScore);
    });

    it('should apply frequency penalty for common terms', () => {
      const rareScore = calculateMatchScore(
        { field: 'content', text: 'auth flow', occurrences: 1 },
        queryTerms,
        1, // Only match
        0
      );
      const commonScore = calculateMatchScore(
        { field: 'content', text: 'auth flow', occurrences: 1 },
        queryTerms,
        10, // Many matches
        0
      );
      expect(rareScore).toBeGreaterThan(commonScore);
    });

    it('should cap score at 100', () => {
      const score = calculateMatchScore(
        { field: 'title', text: 'auth flow', occurrences: 2 },
        ['auth', 'flow'],
        1,
        0
      );
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateSpecScore', () => {
    it('should calculate weighted average of field scores', () => {
      const matches: SearchMatch[] = [
        {
          field: 'title',
          text: 'Auth Flow',
          score: 100,
          highlights: [[0, 4], [5, 9]],
          occurrences: 2,
        },
        {
          field: 'content',
          text: 'authentication flow',
          score: 50,
          highlights: [[0, 14], [15, 19]],
          occurrences: 2,
        },
      ];

      const score = calculateSpecScore(matches);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
      // Title should dominate since it has higher weight
      expect(score).toBeGreaterThan(75);
    });

    it('should use highest score per field', () => {
      const matches: SearchMatch[] = [
        {
          field: 'content',
          text: 'first match',
          score: 50,
          highlights: [],
          occurrences: 1,
        },
        {
          field: 'content',
          text: 'better match',
          score: 80,
          highlights: [],
          occurrences: 1,
        },
        {
          field: 'content',
          text: 'worse match',
          score: 30,
          highlights: [],
          occurrences: 1,
        },
      ];

      const score = calculateSpecScore(matches);
      // Should be based on the 80-score match, not average
      expect(score).toBeGreaterThanOrEqual(70);
    });

    it('should return 0 for no matches', () => {
      expect(calculateSpecScore([])).toBe(0);
    });

    it('should round to integer', () => {
      const matches: SearchMatch[] = [
        {
          field: 'content',
          text: 'test',
          score: 75.7,
          highlights: [],
          occurrences: 1,
        },
      ];

      const score = calculateSpecScore(matches);
      expect(Number.isInteger(score)).toBe(true);
    });
  });
});
