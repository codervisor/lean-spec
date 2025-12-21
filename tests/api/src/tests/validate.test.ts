/**
 * Validation endpoint tests
 *
 * Tests for POST /api/projects/:projectId/validate endpoint.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiClient } from '../client';
import {
  ProjectValidationResponseSchema,
  ProjectsListResponseSchema,
  type ProjectValidationResponse,
  type ProjectsListResponse,
  type ProjectMutationResponse,
} from '../schemas';
import { validateSchema, createSchemaErrorMessage } from '../utils/validation';
import { createTestProject, type TestProject } from '../fixtures';
import { validationTestFixtures } from '../fixtures/specs';

describe('Validation API', () => {
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
        name: 'validation-test-project',
        specs: validationTestFixtures,
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

  describe('POST /api/projects/:projectId/validate', () => {
    it('validates project paths when multi-project mode is enabled', async () => {
      if (!projectId) {
        throw new Error('No projectId available for validation tests');
      }

      const response = await apiClient.post<ProjectValidationResponse>(
        `/api/projects/${projectId}/validate`
      );

      if (mode !== 'multi-project') {
        expect([400, 404]).toContain(response.status);
        return;
      }

      expect(response.status).toBe(200);

      const result = validateSchema(
        ProjectValidationResponseSchema,
        response.data
      );

      if (!result.success) {
        throw new Error(
          createSchemaErrorMessage(
            `POST /api/projects/${projectId}/validate`,
            result.errors || []
          )
        );
      }

      expect(result.data?.validation).toBeDefined();
    });
  });
});
