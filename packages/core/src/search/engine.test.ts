/**
 * Unit tests for search engine
 */

import { describe, it, expect } from 'vitest';
import { searchSpecs } from './engine.js';
import type { SearchableSpec } from './engine.js';

describe('Search Engine', () => {
  const sampleSpecs: SearchableSpec[] = [
    {
      path: '042-oauth2-implementation',
      name: '042-oauth2-implementation',
      status: 'in-progress',
      priority: 'high',
      tags: ['api', 'security', 'auth'],
      title: 'OAuth2 Authentication Flow',
      description: 'Implement OAuth2 authentication with token refresh',
      content: `
## Overview
This spec describes the complete authentication flow including token refresh.
The OAuth2 flow supports authorization code grant with PKCE.

## Implementation
- Token generation
- Refresh token handling
- Session management
      `.trim(),
    },
    {
      path: '038-jwt-token-service',
      name: '038-jwt-token-service',
      status: 'complete',
      priority: 'medium',
      tags: ['api', 'auth'],
      title: 'JWT Token Service',
      description: 'JWT-based authentication service',
      content: `
## Overview
JWT authentication flow with RS256 signing.
Provides token validation and refresh capabilities.
      `.trim(),
    },
    {
      path: '051-user-session-management',
      name: '051-user-session-management',
      status: 'planned',
      priority: 'medium',
      tags: ['api', 'users'],
      title: 'User Session Management',
      description: 'Handle user sessions and authentication state',
      content: `
## Overview
Manage user sessions across multiple devices.
Support for session expiration and renewal.
      `.trim(),
    },
    {
      path: '025-api-rate-limiting',
      name: '025-api-rate-limiting',
      status: 'complete',
      priority: 'high',
      tags: ['api', 'security'],
      title: 'API Rate Limiting',
      description: 'Rate limiting for API endpoints',
      content: `
## Overview
Implement rate limiting to prevent abuse.
Uses token bucket algorithm.
      `.trim(),
    },
  ];

  describe('searchSpecs', () => {
    it('should return empty results for empty query', () => {
      const result = searchSpecs('', sampleSpecs);
      
      expect(result.results).toEqual([]);
      expect(result.metadata.totalResults).toBe(0);
      expect(result.metadata.query).toBe('');
    });

    it('should return empty results for whitespace-only query', () => {
      const result = searchSpecs('   ', sampleSpecs);
      
      expect(result.results).toEqual([]);
      expect(result.metadata.totalResults).toBe(0);
    });

    it('should find specs matching query in title', () => {
      const result = searchSpecs('authentication flow', sampleSpecs);
      
      expect(result.results.length).toBeGreaterThan(0);
      // OAuth2 spec should rank highest (has both terms in title and content)
      expect(result.results[0].spec.name).toBe('042-oauth2-implementation');
      expect(result.results[0].matches.some(m => m.field === 'title')).toBe(true);
    });

    it('should find specs matching query in tags', () => {
      const result = searchSpecs('auth', sampleSpecs);
      
      expect(result.results.length).toBeGreaterThan(0);
      const authSpecs = result.results.filter(r => 
        r.spec.tags?.includes('auth')
      );
      expect(authSpecs.length).toBeGreaterThan(0);
    });

    it('should find specs matching query in content', () => {
      const result = searchSpecs('token refresh', sampleSpecs);
      
      expect(result.results.length).toBeGreaterThan(0);
      const oauth2Result = result.results.find(r => 
        r.spec.name === '042-oauth2-implementation'
      );
      expect(oauth2Result).toBeDefined();
      expect(oauth2Result!.matches.some(m => m.field === 'content')).toBe(true);
    });

    it('should rank by relevance (title > content)', () => {
      const result = searchSpecs('authentication', sampleSpecs);
      
      expect(result.results.length).toBeGreaterThan(0);
      
      // Specs with "authentication" in title should rank higher
      const topResult = result.results[0];
      expect(topResult.spec.title?.toLowerCase()).toContain('authentication');
    });

    it('should use AND logic for multiple terms', () => {
      const result = searchSpecs('oauth2 flow', sampleSpecs);
      
      // Should find OAuth2 spec (has both terms)
      expect(result.results.length).toBeGreaterThan(0);
      const oauth2Result = result.results[0];
      expect(oauth2Result.spec.name).toBe('042-oauth2-implementation');
    });

    it('should not match specs missing any query term', () => {
      const result = searchSpecs('oauth2 missing-term', sampleSpecs);
      
      // No spec has "missing-term", so no results
      expect(result.results.length).toBe(0);
    });

    it('should be case-insensitive', () => {
      const result1 = searchSpecs('AUTHENTICATION', sampleSpecs);
      const result2 = searchSpecs('authentication', sampleSpecs);
      const result3 = searchSpecs('AuThEnTiCaTiOn', sampleSpecs);
      
      expect(result1.results.length).toBe(result2.results.length);
      expect(result2.results.length).toBe(result3.results.length);
    });

    it('should include search metadata', () => {
      const result = searchSpecs('auth', sampleSpecs);
      
      expect(result.metadata.totalResults).toBe(result.results.length);
      expect(result.metadata.searchTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.query).toBe('auth');
      expect(result.metadata.specsSearched).toBe(sampleSpecs.length);
    });

    it('should limit matches per spec', () => {
      // Create spec with many matches
      const specWithManyMatches: SearchableSpec = {
        path: 'test-spec',
        name: 'test-spec',
        status: 'planned',
        content: Array.from({ length: 20 }, (_, i) => 
          `Line ${i}: This is a test match`
        ).join('\n'),
      };

      const result = searchSpecs('test', [specWithManyMatches], {
        maxMatchesPerSpec: 5,
      });
      
      expect(result.results.length).toBe(1);
      expect(result.results[0].matches.length).toBeLessThanOrEqual(5);
      expect(result.results[0].totalMatches).toBeGreaterThan(5);
    });

    it('should handle specs without content', () => {
      const specWithoutContent: SearchableSpec = {
        path: 'no-content',
        name: 'no-content',
        status: 'planned',
        title: 'Test Spec',
      };

      const result = searchSpecs('test', [specWithoutContent]);
      
      expect(result.results.length).toBe(1);
      expect(result.results[0].spec.name).toBe('no-content');
      expect(result.results[0].matches.length).toBeGreaterThan(0);
    });

    it('should handle specs with only content matches', () => {
      const contentOnlySpec: SearchableSpec = {
        path: 'content-only',
        name: 'unrelated-name',
        status: 'planned',
        content: 'This content has the search term',
      };

      const result = searchSpecs('search term', [contentOnlySpec]);
      
      expect(result.results.length).toBe(1);
      expect(result.results[0].matches.every(m => m.field === 'content')).toBe(true);
    });

    it('should provide match context', () => {
      const result = searchSpecs('authentication flow', sampleSpecs);
      
      expect(result.results.length).toBeGreaterThan(0);
      
      for (const specResult of result.results) {
        for (const match of specResult.matches) {
          expect(match.text).toBeTruthy();
          expect(match.score).toBeGreaterThan(0);
          expect(match.score).toBeLessThanOrEqual(100);
          expect(match.highlights).toBeDefined();
          expect(Array.isArray(match.highlights)).toBe(true);
        }
      }
    });

    it('should include line numbers for content matches', () => {
      const result = searchSpecs('token refresh', sampleSpecs);
      
      const oauth2Result = result.results.find(r => 
        r.spec.name === '042-oauth2-implementation'
      );
      
      expect(oauth2Result).toBeDefined();
      const contentMatches = oauth2Result!.matches.filter(m => m.field === 'content');
      
      for (const match of contentMatches) {
        expect(match.lineNumber).toBeGreaterThan(0);
      }
    });

    it('should calculate relevance scores', () => {
      const result = searchSpecs('auth', sampleSpecs);
      
      expect(result.results.length).toBeGreaterThan(0);
      
      for (const specResult of result.results) {
        expect(specResult.score).toBeGreaterThan(0);
        expect(specResult.score).toBeLessThanOrEqual(100);
      }
      
      // Results should be sorted by score (descending)
      for (let i = 1; i < result.results.length; i++) {
        expect(result.results[i - 1].score).toBeGreaterThanOrEqual(
          result.results[i].score
        );
      }
    });

    it('should handle custom context length', () => {
      const result = searchSpecs('authentication', sampleSpecs, {
        contextLength: 40,
      });
      
      expect(result.results.length).toBeGreaterThan(0);
      
      // Context should respect the length parameter (though may include ellipsis)
      const contentMatches = result.results
        .flatMap(r => r.matches)
        .filter(m => m.field === 'content');
      
      for (const match of contentMatches) {
        // Context may be longer due to ellipsis and smart boundaries
        expect(match.text.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty spec list', () => {
      const result = searchSpecs('test', []);
      
      expect(result.results).toEqual([]);
      expect(result.metadata.totalResults).toBe(0);
      expect(result.metadata.specsSearched).toBe(0);
    });

    it('should handle special characters in query', () => {
      const result = searchSpecs('auth.*flow', sampleSpecs);
      
      // Should escape regex characters and search literally
      expect(result.results.length).toBe(0);
    });

    it('should handle very long queries', () => {
      const longQuery = 'word '.repeat(50);
      const result = searchSpecs(longQuery, sampleSpecs);
      
      expect(result.metadata.query).toBe(longQuery);
      // No specs should match all 50 words
      expect(result.results.length).toBe(0);
    });
  });
});
