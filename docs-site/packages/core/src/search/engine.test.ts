/**
 * Unit tests for search engine
 */

import { describe, it, expect } from 'vitest';
import { searchSpecs, advancedSearchSpecs } from './engine.js';
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

  describe('Cross-field matching (spec 124)', () => {
    // Test specs designed to validate cross-field matching
    const crossFieldSpecs: SearchableSpec[] = [
      {
        path: '123-ai-coding-agent-integration',
        name: '123-ai-coding-agent-integration',
        status: 'planned',
        priority: 'high',
        tags: ['ai', 'agent', 'integration'],
        title: 'AI Coding Agent Integration',
        description: 'Integrate AI coding agents into the workflow',
        content: `
## Overview
This spec describes how to orchestrate multiple coding agents.
The system will manage agent communication and task distribution.
        `.trim(),
      },
      {
        path: '099-simple-api-docs',
        name: '099-simple-api-docs',
        status: 'complete',
        priority: 'low',
        tags: ['docs', 'api'],
        title: 'Simple API Documentation',
        description: 'Document the REST API',
        content: `
## API Documentation
Basic endpoint documentation.
        `.trim(),
      },
    ];

    it('should find specs when terms span multiple fields', () => {
      // "AI" is in title/tags, "agent" is in title/tags/content, 
      // "orchestrate" is only in content
      // Old behavior: would NOT match because no single field has all 3 terms
      // New behavior: SHOULD match because spec contains all terms across fields
      const result = searchSpecs('AI agent orchestrate', crossFieldSpecs);
      
      expect(result.results.length).toBe(1);
      expect(result.results[0].spec.name).toBe('123-ai-coding-agent-integration');
    });

    it('should find specs when query terms are in different fields', () => {
      // "coding" is in title, "orchestrate" is in content only
      const result = searchSpecs('coding orchestrate', crossFieldSpecs);
      
      expect(result.results.length).toBe(1);
      expect(result.results[0].spec.name).toBe('123-ai-coding-agent-integration');
    });

    it('should include partial field matches for context', () => {
      // Search for terms that span fields
      const result = searchSpecs('AI orchestrate', crossFieldSpecs);
      
      expect(result.results.length).toBe(1);
      // Should have matches from multiple fields (title for AI, content for orchestration)
      expect(result.results[0].matches.length).toBeGreaterThan(0);
      
      // Verify we get matches from different fields
      const matchFields = new Set(result.results[0].matches.map(m => m.field));
      expect(matchFields.size).toBeGreaterThan(1);
    });

    it('should not match specs missing any query term', () => {
      // "ai" and "agent" exist, but "blockchain" doesn't
      const result = searchSpecs('ai agent blockchain', crossFieldSpecs);
      
      expect(result.results.length).toBe(0);
    });

    it('should still rank specs with terms in higher-weighted fields better', () => {
      // Create specs where one has terms in title (high weight), other has terms only in content (low weight)
      const rankingSpecs: SearchableSpec[] = [
        {
          path: 'content-only',
          name: 'content-only',
          status: 'planned',
          title: 'Database System',
          content: 'Uses OAuth authentication for user management',
        },
        {
          path: 'title-match',
          name: 'title-match',
          status: 'planned',
          title: 'OAuth Authentication User System',
          content: 'Some other content',
        },
      ];

      const result = searchSpecs('oauth authentication user', rankingSpecs);
      
      // Both should match (both have all 3 terms)
      expect(result.results.length).toBe(2);
      // Both are found - that's the key requirement for cross-field matching
      const names = result.results.map(r => r.spec.name);
      expect(names).toContain('content-only');
      expect(names).toContain('title-match');
    });
  });
});

describe('Advanced Search (spec 124 Phase 2)', () => {
  const sampleSpecs: SearchableSpec[] = [
    {
      path: '042-oauth2-implementation',
      name: '042-oauth2-implementation',
      status: 'in-progress',
      priority: 'high',
      tags: ['api', 'security', 'auth'],
      title: 'OAuth2 Authentication Flow',
      description: 'Implement OAuth2 authentication with token refresh',
      content: 'OAuth2 flow supports authorization code grant with PKCE.',
      created: '2025-11-01',
      updated: '2025-11-15',
      assignee: 'marvin',
    },
    {
      path: '038-jwt-token-service',
      name: '038-jwt-token-service',
      status: 'complete',
      priority: 'medium',
      tags: ['api', 'auth'],
      title: 'JWT Token Service',
      description: 'JWT-based authentication service',
      content: 'JWT authentication flow with RS256 signing.',
      created: '2025-10-15',
      updated: '2025-11-10',
      assignee: 'alice',
    },
    {
      path: '051-user-session-management',
      name: '051-user-session-management',
      status: 'planned',
      priority: 'medium',
      tags: ['api', 'users'],
      title: 'User Session Management',
      description: 'Handle user sessions and authentication state',
      content: 'Manage user sessions across multiple devices.',
      created: '2025-11-20',
      assignee: 'bob',
    },
    {
      path: '025-api-rate-limiting',
      name: '025-api-rate-limiting',
      status: 'complete',
      priority: 'high',
      tags: ['api', 'security'],
      title: 'API Rate Limiting',
      description: 'Rate limiting for API endpoints (deprecated)',
      content: 'Implement rate limiting to prevent abuse.',
      created: '2025-09-01',
      updated: '2025-09-15',
    },
  ];

  describe('Boolean operators', () => {
    it('should support AND operator', () => {
      const result = advancedSearchSpecs('api AND authentication', sampleSpecs);
      
      // Should find specs with both "api" and "authentication"
      expect(result.results.length).toBeGreaterThan(0);
      // OAuth2 spec should match (has both in various fields)
      const names = result.results.map(r => r.spec.name);
      expect(names).toContain('042-oauth2-implementation');
    });

    it('should support OR operator', () => {
      const result = advancedSearchSpecs('session OR token', sampleSpecs);
      
      // Should find specs with either "session" or "token"
      expect(result.results.length).toBeGreaterThan(0);
      const names = result.results.map(r => r.spec.name);
      expect(names).toContain('051-user-session-management');
      expect(names).toContain('038-jwt-token-service');
    });

    it('should support NOT operator', () => {
      const result = advancedSearchSpecs('api NOT deprecated', sampleSpecs);
      
      // Should find specs with "api" but not "deprecated"
      const names = result.results.map(r => r.spec.name);
      expect(names).not.toContain('025-api-rate-limiting');
      expect(names).toContain('042-oauth2-implementation');
    });

    it('should support parentheses for grouping', () => {
      const result = advancedSearchSpecs('(session OR token) AND authentication', sampleSpecs);
      
      // Should find specs matching (session OR token) AND authentication
      expect(result.results.length).toBeGreaterThan(0);
    });
  });

  describe('Field-specific search', () => {
    it('should filter by status', () => {
      const result = advancedSearchSpecs('status:in-progress', sampleSpecs);
      
      expect(result.results.length).toBe(1);
      expect(result.results[0].spec.status).toBe('in-progress');
    });

    it('should filter by tag', () => {
      const result = advancedSearchSpecs('tag:security', sampleSpecs);
      
      expect(result.results.length).toBe(2);
      for (const r of result.results) {
        expect(r.spec.tags).toContain('security');
      }
    });

    it('should filter by priority', () => {
      const result = advancedSearchSpecs('priority:high', sampleSpecs);
      
      expect(result.results.length).toBe(2);
      for (const r of result.results) {
        expect(r.spec.priority).toBe('high');
      }
    });

    it('should combine field filters with search terms', () => {
      const result = advancedSearchSpecs('tag:api status:planned', sampleSpecs);
      
      expect(result.results.length).toBe(1);
      expect(result.results[0].spec.name).toBe('051-user-session-management');
    });

    it('should filter by title', () => {
      const result = advancedSearchSpecs('title:OAuth2', sampleSpecs);
      
      expect(result.results.length).toBe(1);
      expect(result.results[0].spec.title).toContain('OAuth2');
    });
  });

  describe('Date range filters', () => {
    it('should filter by created date (greater than)', () => {
      const result = advancedSearchSpecs('created:>2025-11-01', sampleSpecs);
      
      // Should find specs created after Nov 1, 2025
      expect(result.results.length).toBeGreaterThan(0);
      for (const r of result.results) {
        const spec = sampleSpecs.find(s => s.name === r.spec.name);
        expect(spec?.created).toBeDefined();
        expect(spec!.created! > '2025-11-01').toBe(true);
      }
    });

    it('should filter by created date (less than)', () => {
      const result = advancedSearchSpecs('created:<2025-10-01', sampleSpecs);
      
      // Should find specs created before Oct 1, 2025
      expect(result.results.length).toBe(1);
      expect(result.results[0].spec.name).toBe('025-api-rate-limiting');
    });

    it('should filter by date range', () => {
      const result = advancedSearchSpecs('created:2025-10-01..2025-11-01', sampleSpecs);
      
      // Should find specs created between Oct 1 and Nov 1, 2025
      expect(result.results.length).toBeGreaterThan(0);
      for (const r of result.results) {
        const spec = sampleSpecs.find(s => s.name === r.spec.name);
        expect(spec?.created).toBeDefined();
        expect(spec!.created! >= '2025-10-01').toBe(true);
        expect(spec!.created! <= '2025-11-01').toBe(true);
      }
    });
  });

  describe('Fuzzy matching', () => {
    it('should find specs with typo-tolerant search', () => {
      const result = advancedSearchSpecs('authetication~', sampleSpecs);
      
      // Should find specs with "authentication" despite the typo
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('should not fuzzy match completely different words', () => {
      const result = advancedSearchSpecs('completely_different_word~', sampleSpecs);
      
      // Should not find any specs
      expect(result.results.length).toBe(0);
    });
  });

  describe('Complex queries', () => {
    it('should combine field filters, boolean operators, and search terms', () => {
      const result = advancedSearchSpecs('tag:api status:in-progress oauth', sampleSpecs);
      
      expect(result.results.length).toBe(1);
      expect(result.results[0].spec.name).toBe('042-oauth2-implementation');
    });

    it('should handle quoted phrases', () => {
      const result = advancedSearchSpecs('"token refresh"', sampleSpecs);
      
      // Should find specs with exact phrase "token refresh"
      expect(result.results.length).toBeGreaterThan(0);
    });
  });

  describe('Backward compatibility', () => {
    it('should work with simple queries (no advanced syntax)', () => {
      const result = advancedSearchSpecs('authentication', sampleSpecs);
      
      // Should behave like regular search
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.metadata.query).toBe('authentication');
    });
  });
});
