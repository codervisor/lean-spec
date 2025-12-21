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
import { searchTestFixtures } from '../fixtures/specs';
import { createTestProject, type TestProject } from '../fixtures';
import { type ProjectMutationResponse } from '../schemas';

describe('POST /api/search', () => {
  let projectId: string | null = null;
  let mode: 'single-project' | 'multi-project' = 'single-project';

  beforeAll(async () => {
    const projectsResponse = await apiClient.get<ProjectsListResponse>('/api/projects');
    const projectsValidation = validateSchema(
      ProjectsListResponseSchema,
      projectsResponse.data
    );

    if (projectsValidation.success) {
      projectId = projectsValidation.data?.projects[0]?.id ?? null;
      mode = projectsValidation.data?.mode ?? 'single-project';
    }
  });

  it('returns valid response matching schema', async () => {
    const response = await apiClient.post('/api/search', {
      query: 'API',
      projectId,
    });

    expect(response.status).toBe(200);

    const result = validateSchema(SearchResponseSchema, response.data);

    if (!result.success) {
      throw new Error(
        createSchemaErrorMessage('POST /api/search', result.errors || [])
      );
    }

    expect(result.success).toBe(true);
  });

  it('each result matches SpecSummary schema', async () => {
    const response = await apiClient.post<SearchResponse>('/api/search', {
      query: 'API',
      projectId,
    });

    expect(response.status).toBe(200);

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

  describe('ranking (multi-project only)', () => {
    let rankingProject: TestProject | null = null;
    let rankingProjectId: string | null = null;

    beforeAll(async () => {
      if (mode !== 'multi-project') {
        return;
      }

      rankingProject = await createTestProject({
        name: 'search-ranking-project',
        specs: searchTestFixtures,
      });

      const addResponse = await apiClient.post<ProjectMutationResponse>('/api/projects', {
        path: rankingProject.path,
      });

      if (addResponse.ok && addResponse.data?.project) {
        rankingProjectId = addResponse.data.project.id;
      }
    });

    afterAll(async () => {
      if (rankingProjectId) {
        await apiClient.delete(`/api/projects/${rankingProjectId}`).catch(() => undefined);
      }
      if (rankingProject) {
        await rankingProject.cleanup();
      }
    });

    it('ranks exact title match first within scoped project', async () => {
      if (mode !== 'multi-project' || !rankingProjectId) {
        return;
      }

      const response = await apiClient.post<SearchResponse>('/api/search', {
        query: 'Authentication API',
        projectId: rankingProjectId,
      });

      expect(response.status).toBe(200);

      const validation = validateSchema(SearchResponseSchema, response.data);
      if (!validation.success) {
        throw new Error(createSchemaErrorMessage('POST /api/search (ranking)', validation.errors || []));
      }

      const names = response.data.results.map((r) => r.specName);
      expect(names[0]).toBe('authentication-api');
    });
  });
});
