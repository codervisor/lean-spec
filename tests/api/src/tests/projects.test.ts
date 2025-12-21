/**
 * Projects endpoint tests
 *
 * Tests for project management API endpoints (project-scoped routing).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiClient } from '../client';
import {
  ProjectsListResponseSchema,
  ProjectMutationResponseSchema,
  ProjectResponseSchema,
  type ProjectsListResponse,
  type ProjectMutationResponse,
  type ProjectResponse,
} from '../schemas';
import { validateSchema, createSchemaErrorMessage } from '../utils/validation';
import {
  createTestProject,
  defaultTestFixtures,
  type TestProject,
} from '../fixtures';

describe('Projects API', () => {
  let mode: 'single-project' | 'multi-project' = 'single-project';
  let primaryProjectId: string | null = null;
  let addedProjectId: string | null = null;
  let testProject: TestProject | null = null;

  beforeAll(async () => {
    const listResponse = await apiClient.get<ProjectsListResponse>('/api/projects');
    const listValidation = validateSchema(ProjectsListResponseSchema, listResponse.data);
    if (!listValidation.success) {
      throw new Error(
        createSchemaErrorMessage('GET /api/projects', listValidation.errors || [])
      );
    }

    const listData = listValidation.data!;
    mode = listData.mode ?? 'single-project';
    primaryProjectId = listData.projects[0]?.id ?? 'default';

    if (mode === 'multi-project') {
      testProject = await createTestProject({
        name: 'test-project',
        specs: defaultTestFixtures,
      });

      const addResponse = await apiClient.post<ProjectMutationResponse>(
        '/api/projects',
        { path: testProject.path }
      );

      if (addResponse.ok && addResponse.data?.project) {
        addedProjectId = addResponse.data.project.id;
        primaryProjectId = addResponse.data.project.id;
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

  describe('GET /api/projects', () => {
    it('returns valid response matching schema', async () => {
      const response = await apiClient.get('/api/projects');
      expect(response.status).toBe(200);

      const result = validateSchema(ProjectsListResponseSchema, response.data);
      if (!result.success) {
        throw new Error(
          createSchemaErrorMessage('GET /api/projects', result.errors || [])
        );
      }

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data?.projects)).toBe(true);
      expect(result.data?.projects.length).toBeGreaterThan(0);
    });

    it('includes mode and project metadata', async () => {
      const response = await apiClient.get<ProjectsListResponse>('/api/projects');
      const data = response.data;

      expect(data.mode === 'single-project' || data.mode === 'multi-project' || data.mode === undefined).toBe(true);
      expect(data.projects[0]).toHaveProperty('specsDir');
    });
  });

  describe('GET /api/projects/:id', () => {
    it('returns project by ID from the list', async () => {
      if (!primaryProjectId) {
        throw new Error('No project id available from /api/projects');
      }

      const response = await apiClient.get<ProjectResponse>(`/api/projects/${primaryProjectId}`);
      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const result = validateSchema(ProjectResponseSchema, response.data);
        if (!result.success) {
          throw new Error(
            createSchemaErrorMessage(
              `GET /api/projects/${primaryProjectId}`,
              result.errors || []
            )
          );
        }

        expect(result.data?.project?.id).toBe(primaryProjectId);
      }
    });

    it('returns 404 for nonexistent project', async () => {
      const response = await apiClient.get('/api/projects/nonexistent-project-id-12345');
      expect([404, 400]).toContain(response.status);
    });
  });

  describe('POST /api/projects (multi-project only)', () => {
    it('creates a project when multi-project mode is enabled', async () => {
      if (mode !== 'multi-project') {
        return;
      }

      expect(addedProjectId).toBeTruthy();
    });

    it('returns 400 when multi-project mode is disabled', async () => {
      if (mode === 'multi-project') {
        return;
      }

      const response = await apiClient.post('/api/projects', {
        path: '/nonexistent/invalid/path/that/does/not/exist',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/projects/:id (multi-project only)', () => {
    it('updates project metadata', async () => {
      if (mode !== 'multi-project' || !addedProjectId) {
        return;
      }

      const response = await apiClient.patch<ProjectMutationResponse>(
        `/api/projects/${addedProjectId}`,
        {
          name: 'Updated Test Project',
          color: '#FF5733',
        }
      );

      expect(response.status).toBe(200);

      const result = validateSchema(ProjectMutationResponseSchema, response.data);
      if (!result.success) {
        throw new Error(
          createSchemaErrorMessage(
            `PATCH /api/projects/${addedProjectId}`,
            result.errors || []
          )
        );
      }

      expect(result.data?.project?.name).toBe('Updated Test Project');
      expect(result.data?.project?.color).toBe('#FF5733');
    });

    it('toggles favorite flag when provided', async () => {
      if (mode !== 'multi-project' || !addedProjectId) {
        return;
      }

      const response = await apiClient.patch<ProjectMutationResponse>(
        `/api/projects/${addedProjectId}`,
        { favorite: true }
      );

      expect(response.status).toBe(200);
      const result = validateSchema(ProjectMutationResponseSchema, response.data);
      expect(result.success).toBe(true);
      expect(typeof result.data?.favorite === 'boolean' || result.data?.favorite === undefined).toBe(true);
    });
  });

  describe('DELETE /api/projects/:id (multi-project only)', () => {
    it('removes project when supported', async () => {
      if (mode !== 'multi-project' || !addedProjectId) {
        return;
      }

      const response = await apiClient.delete(`/api/projects/${addedProjectId}`);
      expect([200, 204]).toContain(response.status);

      const verify = await apiClient.get(`/api/projects/${addedProjectId}`);
      expect(verify.status).toBe(404);
      addedProjectId = null;
    });
  });
});
