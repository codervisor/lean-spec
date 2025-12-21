/**
 * Specs endpoint tests
 *
 * Tests for project-scoped spec endpoints.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiClient } from '../client';
import {
  ListSpecsResponseSchema,
  ProjectsListResponseSchema,
  SpecDetailSchema,
  SpecSummarySchema,
  type ListSpecsResponse,
  type ProjectsListResponse,
  type SpecDetail,
  type ProjectMutationResponse,
} from '../schemas';
import { validateSchema, createSchemaErrorMessage } from '../utils/validation';
import {
  createTestProject,
  defaultTestFixtures,
  type TestProject,
} from '../fixtures';

describe('Specs API', () => {
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

    const projectList = projectsValidation.data!;
    mode = projectList.mode ?? 'single-project';
    projectId = projectList.projects[0]?.id ?? 'default';

    if (mode === 'multi-project') {
      testProject = await createTestProject({
        name: 'specs-test-project',
        specs: defaultTestFixtures,
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

  describe('GET /api/projects/:projectId/specs', () => {
    it('returns specs for the selected project', async () => {
      if (!projectId) {
        throw new Error('No projectId available for specs tests');
      }

      const response = await apiClient.get(`/api/projects/${projectId}/specs`);
      expect(response.status).toBe(200);

      const result = validateSchema(ListSpecsResponseSchema, response.data);
      if (!result.success) {
        throw new Error(
          createSchemaErrorMessage(
            `GET /api/projects/${projectId}/specs`,
            result.errors || []
          )
        );
      }

      expect(Array.isArray(result.data?.specs)).toBe(true);
    });

    it('each spec matches SpecSummary schema', async () => {
      if (!projectId) {
        return;
      }

      const response = await apiClient.get<ListSpecsResponse>(
        `/api/projects/${projectId}/specs`
      );

      for (const spec of response.data.specs) {
        const validation = validateSchema(SpecSummarySchema, spec);
        if (!validation.success) {
          throw new Error(
            createSchemaErrorMessage(
              `Spec ${spec.specName}`,
              validation.errors || []
            )
          );
        }
      }
    });
  });

  describe('GET /api/projects/:projectId/specs/:spec', () => {
    it('returns spec detail for the first spec in the project', async () => {
      if (!projectId) {
        return;
      }

      const listResponse = await apiClient.get<ListSpecsResponse>(
        `/api/projects/${projectId}/specs`
      );
      const firstSpec = listResponse.data.specs[0];

      if (!firstSpec) {
        return;
      }

      const response = await apiClient.get(`/api/projects/${projectId}/specs/${firstSpec.id}`);
      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const detailValidation = validateSchema(SpecDetailSchema, response.data);
        if (!detailValidation.success) {
          throw new Error(
            createSchemaErrorMessage(
              `GET /api/projects/${projectId}/specs/${firstSpec.id}`,
              detailValidation.errors || []
            )
          );
        }

        expect(response.data).toHaveProperty('contentMd');
      }
    });

    it('returns 404 for nonexistent spec id', async () => {
      if (!projectId) {
        return;
      }

      const response = await apiClient.get(
        `/api/projects/${projectId}/specs/999-nonexistent-spec`
      );

      expect([404, 400]).toContain(response.status);
    });
  });
});
