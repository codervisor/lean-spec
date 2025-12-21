/**
 * Search endpoint tests
 *
 * Tests for POST /api/search endpoint (skips when not implemented).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { apiClient } from '../client';
import {
  ProjectsListResponseSchema,
  SearchResponseSchema,
  SpecSummarySchema,
  type ProjectsListResponse,
  type SearchResponse,
} from '../schemas';
import { validateSchema, createSchemaErrorMessage } from '../utils/validation';

describe('POST /api/search', () => {
  let supportsSearch = true;
  let projectId: string | null = null;

  beforeAll(async () => {
    const projectsResponse = await apiClient.get<ProjectsListResponse>('/api/projects');
    const projectsValidation = validateSchema(
      ProjectsListResponseSchema,
      projectsResponse.data
    );

    if (projectsValidation.success) {
      projectId = projectsValidation.data?.projects[0]?.id ?? null;
    }

    const probe = await apiClient.post('/api/search', { query: 'probe', projectId });
    if ([404, 501].includes(probe.status)) {
      supportsSearch = false;
    }
  });

  it('returns 404/501 when search is not available', async () => {
    if (supportsSearch) {
      return;
    }

    const response = await apiClient.post('/api/search', { query: 'probe', projectId });
    expect([404, 501]).toContain(response.status);
  });

  it('returns valid response matching schema when available', async () => {
    if (!supportsSearch) {
      return;
    }

    const response = await apiClient.post('/api/search', {
      query: 'API',
      projectId,
    });

    const result = validateSchema(SearchResponseSchema, response.data);

    if (!result.success) {
      throw new Error(
        createSchemaErrorMessage('POST /api/search', result.errors || [])
      );
    }

    expect(result.success).toBe(true);
  });

  it('each result matches SpecSummary schema when available', async () => {
    if (!supportsSearch) {
      return;
    }

    const response = await apiClient.post<SearchResponse>('/api/search', {
      query: 'API',
      projectId,
    });

    for (const result of response.data.results) {
      const validation = validateSchema(SpecSummarySchema, result);
      if (!validation.success) {
        throw new Error(
          createSchemaErrorMessage(
            `Search result ${result.specName}`,
            validation.errors || []
          )
        );
      }
    }
  });
});
