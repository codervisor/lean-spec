/**
 * Stats endpoint tests
 *
 * Tests for GET /api/projects/:projectId/stats endpoint.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiClient } from '../client';
import {
  ProjectsListResponseSchema,
  StatsResponseSchema,
  type ProjectsListResponse,
  type StatsResponse,
  type ProjectMutationResponse,
} from '../schemas';
import { validateSchema, createSchemaErrorMessage } from '../utils/validation';
import { createTestProject, type TestProject } from '../fixtures';
import { statsTestFixtures } from '../fixtures/specs';

describe('GET /api/projects/:projectId/stats', () => {
  let projectId: string | null = null;
  let mode: 'single-project' | 'multi-project' = 'single-project';
  let addedProjectId: string | null = null;
  let testProject: TestProject | null = null;

  beforeAll(async () => {
    const projectsResponse = await apiClient.get<ProjectsListResponse>('/api/projects');
    const projectsValidation = validateSchema(
      ProjectsListResponseSchema,
      projectsResponse.data
    );

    if (!projectsValidation.success) {
      throw new Error(
        createSchemaErrorMessage('GET /api/projects', projectsValidation.errors || [])
      );
    }

    const projects = projectsValidation.data!;
    mode = projects.mode ?? 'single-project';
    projectId = projects.projects[0]?.id ?? 'default';

    if (mode === 'multi-project') {
      testProject = await createTestProject({
        name: 'stats-test-project',
        specs: statsTestFixtures,
      });

      const addResponse = await apiClient.post<ProjectMutationResponse>('/api/projects', {
        path: testProject.path,
      });

      if (addResponse.ok && addResponse.data?.project) {
        projectId = addResponse.data.project.id;
        addedProjectId = addResponse.data.project.id;
      }
    }
  });

  afterAll(async () => {
    if (addedProjectId) {
      try {
        await apiClient.delete(`/api/projects/${addedProjectId}`);
      } catch {
        // ignore cleanup errors
      }
    }
    if (testProject) {
      await testProject.cleanup();
    }
  });

  it('returns valid stats payload for the project', async () => {
    if (!projectId) {
      throw new Error('No projectId available for stats tests');
    }

    const response = await apiClient.get(`/api/projects/${projectId}/stats`);
    expect([200, 404]).toContain(response.status);

    if (response.status === 200) {
      const result = validateSchema(StatsResponseSchema, response.data);

      if (!result.success) {
        throw new Error(
          createSchemaErrorMessage(
            `GET /api/projects/${projectId}/stats`,
            result.errors || []
          )
        );
      }

      const data = result.data as StatsResponse;
      expect(typeof data.totalProjects).toBe('number');
      expect(Array.isArray(data.specsByStatus)).toBe(true);
      expect(Array.isArray(data.specsByPriority)).toBe(true);
    }
  });

  it('provides status and priority counts with numeric values', async () => {
    if (!projectId) {
      return;
    }

    const response = await apiClient.get<StatsResponse>(`/api/projects/${projectId}/stats`);
    if (response.status !== 200) {
      return;
    }

    for (const statusCount of response.data.specsByStatus) {
      expect(typeof statusCount.status).toBe('string');
      expect(typeof statusCount.count).toBe('number');
    }

    for (const priorityCount of response.data.specsByPriority) {
      expect(typeof priorityCount.priority).toBe('string');
      expect(typeof priorityCount.count).toBe('number');
    }
  });
});
