/**
 * Search endpoint tests
 *
 * Tests for POST /api/search endpoint.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiClient } from '../client';
import {
  SearchResponseSchema,
  SpecSummarySchema,
  type SearchResponse,
  type Project,
} from '../schemas';
import { validateSchema, createSchemaErrorMessage } from '../utils/validation';
import { createTestProject, type TestProject } from '../fixtures';
import { searchTestFixtures } from '../fixtures/specs';

describe('POST /api/search', () => {
  let testProject: TestProject | null = null;
  let addedProjectId: string | null = null;

  beforeAll(async () => {
    // Create a test project with searchable specs
    testProject = await createTestProject({
      name: 'search-test-project',
      specs: searchTestFixtures,
    });

    // Add the project to the server
    const addResponse = await apiClient.post<Project>('/api/projects', {
      path: testProject.path,
    });

    if (addResponse.ok && addResponse.data) {
      addedProjectId = addResponse.data.id;
      await apiClient.post(`/api/projects/${addedProjectId}/switch`);
    }
  });

  afterAll(async () => {
    if (addedProjectId) {
      try {
        await apiClient.delete(`/api/projects/${addedProjectId}`);
      } catch {
        // Ignore cleanup errors
      }
    }
    if (testProject) {
      await testProject.cleanup();
    }
  });

  it('returns 200 OK for valid search', async () => {
    const response = await apiClient.post('/api/search', {
      query: 'API',
    });

    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
  });

  it('returns valid response matching schema', async () => {
    const response = await apiClient.post('/api/search', {
      query: 'API',
    });

    const result = validateSchema(SearchResponseSchema, response.data);

    if (!result.success) {
      throw new Error(
        createSchemaErrorMessage('POST /api/search', result.errors || [])
      );
    }

    expect(result.success).toBe(true);
  });

  it('returns results, total, and query fields', async () => {
    const response = await apiClient.post<SearchResponse>('/api/search', {
      query: 'test',
    });

    expect(response.data).toHaveProperty('results');
    expect(response.data).toHaveProperty('total');
    expect(response.data).toHaveProperty('query');
    expect(Array.isArray(response.data.results)).toBe(true);
    expect(typeof response.data.total).toBe('number');
    expect(response.data.query).toBe('test');
  });

  it('each result matches SpecSummary schema', async () => {
    const response = await apiClient.post<SearchResponse>('/api/search', {
      query: 'API',
    });

    const results = response.data.results;
    for (const result of results) {
      const validation = validateSchema(SpecSummarySchema, result);
      if (!validation.success) {
        throw new Error(
          createSchemaErrorMessage(
            `Search result ${result.specName}`,
            validation.errors || []
          )
        );
      }
      expect(validation.success).toBe(true);
    }
  });

  it('returns empty results for no matches', async () => {
    const response = await apiClient.post<SearchResponse>('/api/search', {
      query: 'xyznonexistentquery123',
    });

    expect(response.status).toBe(200);
    expect(response.data.results).toHaveLength(0);
    expect(response.data.total).toBe(0);
  });

  describe('with filters', () => {
    it('accepts status filter', async () => {
      const response = await apiClient.post<SearchResponse>('/api/search', {
        query: 'test',
        filters: {
          status: 'complete',
        },
      });

      expect(response.status).toBe(200);
      // All results (if any) should have complete status
      for (const result of response.data.results) {
        expect(result.status).toBe('complete');
      }
    });

    it('accepts priority filter', async () => {
      const response = await apiClient.post<SearchResponse>('/api/search', {
        query: 'test',
        filters: {
          priority: 'high',
        },
      });

      expect(response.status).toBe(200);
    });

    it('accepts tags filter', async () => {
      const response = await apiClient.post<SearchResponse>('/api/search', {
        query: 'test',
        filters: {
          tags: ['api'],
        },
      });

      expect(response.status).toBe(200);
    });
  });
});
