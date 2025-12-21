/**
 * Edge case and robustness tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { apiClient } from '../client';
import {
  ErrorResponseSchema,
  ProjectsListResponseSchema,
  ListSpecsResponseSchema,
  type ProjectMutationResponse,
  type ProjectsListResponse,
  type ListSpecsResponse,
} from '../schemas';
import { validateSchema, createSchemaErrorMessage } from '../utils/validation';
import { createTestProject, type TestProject, type TestSpecFixture } from '../fixtures';

const LARGE_SPEC_COUNT = 120;

type Mode = 'single-project' | 'multi-project';

describe('Edge Cases', () => {
  let mode: Mode = 'single-project';
  let baseProjectId: string | null = null;

  beforeAll(async () => {
    const projectsResponse = await apiClient.get<ProjectsListResponse>('/api/projects');
    const validation = validateSchema(ProjectsListResponseSchema, projectsResponse.data);
    if (!validation.success) {
      throw new Error(createSchemaErrorMessage('GET /api/projects', validation.errors || []));
    }

    mode = validation.data?.mode ?? 'single-project';
    baseProjectId = validation.data?.projects[0]?.id ?? null;
  });

  it('rejects invalid status filter without a 5xx', async () => {
    if (!baseProjectId) {
      throw new Error('No project id available for invalid-params test');
    }

    const response = await apiClient.get(`/api/projects/${baseProjectId}/specs`, {
      status: 'definitely-invalid-status',
    });

    expect([400, 422]).toContain(response.status);

    const validation = validateSchema(ErrorResponseSchema, response.data);
    expect(validation.success || response.data === null).toBe(true);
  });

  it('returns structured error for malformed JSON search payload (no 5xx)', async () => {
    const url = new URL('/api/search', apiClient.baseUrl);
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"query": "oops"', // intentionally malformed JSON
    });

    expect([400, 422]).toContain(res.status);

    const data = await res.json().catch(() => null);
    if (data) {
      const validation = validateSchema(ErrorResponseSchema, data);
      if (!validation.success) {
        throw new Error(createSchemaErrorMessage('POST /api/search (malformed)', validation.errors || []));
      }
    }
  });

  it('handles empty projects without 5xx and returns zero specs', async () => {
    if (mode !== 'multi-project') {
      return;
    }

    const emptyProject = await createTestProject({ name: 'edge-empty-project', specs: [] });
    let addedProjectId: string | null = null;
    try {
      const addResponse = await apiClient.post<ProjectMutationResponse>('/api/projects', {
        path: emptyProject.path,
      });
      expect(addResponse.status).toBe(200);
      addedProjectId = addResponse.data?.project?.id ?? null;

      if (!addedProjectId) {
        throw new Error('Project creation did not return an id');
      }

      const listResponse = await apiClient.get(`/api/projects/${addedProjectId}/specs`);
      expect(listResponse.status).toBe(200);

      const validation = validateSchema(ListSpecsResponseSchema, listResponse.data);
      if (!validation.success) {
        throw new Error(
          createSchemaErrorMessage(
            `/api/projects/${addedProjectId}/specs (empty)`,
            validation.errors || []
          )
        );
      }

      expect((validation.data as ListSpecsResponse).specs.length).toBe(0);
    } finally {
      if (addedProjectId) {
        await apiClient.delete(`/api/projects/${addedProjectId}`).catch(() => undefined);
      }
      await emptyProject.cleanup();
    }
  });

  it('handles large spec sets (>=100 specs) within response expectations', async () => {
    if (mode !== 'multi-project') {
      return;
    }

    const largeFixtures: TestSpecFixture[] = Array.from({ length: LARGE_SPEC_COUNT }, (_, i) => ({
      name: `large-spec-${i + 1}`,
      title: `Large Spec ${i + 1}`,
      status: 'planned',
      priority: (['low', 'medium', 'high', 'critical'] as const)[i % 4],
      tags: ['large'],
    }));

    const largeProject = await createTestProject({ name: 'edge-large-project', specs: largeFixtures });
    let addedProjectId: string | null = null;
    try {
      const addResponse = await apiClient.post<ProjectMutationResponse>('/api/projects', {
        path: largeProject.path,
      });
      expect(addResponse.status).toBe(200);
      addedProjectId = addResponse.data?.project?.id ?? null;

      if (!addedProjectId) {
        throw new Error('Project creation did not return an id');
      }

      const start = Date.now();
      const listResponse = await apiClient.get(`/api/projects/${addedProjectId}/specs`);
      const duration = Date.now() - start;

      expect(listResponse.status).toBe(200);

      const validation = validateSchema(ListSpecsResponseSchema, listResponse.data);
      if (!validation.success) {
        throw new Error(
          createSchemaErrorMessage(
            `/api/projects/${addedProjectId}/specs (large)`,
            validation.errors || []
          )
        );
      }

      expect((validation.data as ListSpecsResponse).specs.length).toBeGreaterThanOrEqual(LARGE_SPEC_COUNT);
      expect(duration).toBeLessThan(3000);
    } finally {
      if (addedProjectId) {
        await apiClient.delete(`/api/projects/${addedProjectId}`).catch(() => undefined);
      }
      await largeProject.cleanup();
    }
  });
});
