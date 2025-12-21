/**
 * Projects endpoint tests
 *
 * Tests for project management API endpoints.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiClient } from '../client';
import {
  ProjectsListResponseSchema,
  ProjectSchema,
  RefreshProjectsResponseSchema,
  ToggleFavoriteResponseSchema,
  type ProjectsListResponse,
  type Project,
  type RefreshProjectsResponse,
  type ToggleFavoriteResponse,
} from '../schemas';
import { validateSchema, createSchemaErrorMessage } from '../utils/validation';
import {
  createTestProject,
  defaultTestFixtures,
  type TestProject,
} from '../fixtures';

describe('Projects API', () => {
  let testProject: TestProject | null = null;
  let addedProjectId: string | null = null;

  beforeAll(async () => {
    // Create a test project
    testProject = await createTestProject({
      name: 'test-project',
      specs: defaultTestFixtures,
    });
  });

  afterAll(async () => {
    // Clean up: remove the test project from the server if it was added
    if (addedProjectId) {
      try {
        await apiClient.delete(`/api/projects/${addedProjectId}`);
      } catch {
        // Ignore cleanup errors
      }
    }
    // Clean up the test project files
    if (testProject) {
      await testProject.cleanup();
    }
  });

  describe('GET /api/projects', () => {
    it('returns 200 OK', async () => {
      const response = await apiClient.get('/api/projects');
      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
    });

    it('returns valid response matching schema', async () => {
      const response = await apiClient.get('/api/projects');
      const result = validateSchema(ProjectsListResponseSchema, response.data);

      if (!result.success) {
        throw new Error(
          createSchemaErrorMessage('GET /api/projects', result.errors || [])
        );
      }

      expect(result.success).toBe(true);
    });

    it('returns projects array', async () => {
      const response = await apiClient.get<ProjectsListResponse>('/api/projects');
      expect(response.data).toHaveProperty('projects');
      expect(Array.isArray(response.data.projects)).toBe(true);
    });

    it('has currentProjectId field', async () => {
      const response = await apiClient.get<ProjectsListResponse>('/api/projects');
      expect(response.data).toHaveProperty('currentProjectId');
    });
  });

  describe('POST /api/projects', () => {
    it('adds a new project with valid path', async () => {
      if (!testProject) {
        throw new Error('Test project not created');
      }

      const response = await apiClient.post<Project>('/api/projects', {
        path: testProject.path,
      });

      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);

      // Validate response matches project schema
      const result = validateSchema(ProjectSchema, response.data);
      if (!result.success) {
        throw new Error(
          createSchemaErrorMessage('POST /api/projects', result.errors || [])
        );
      }

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('path', testProject.path);

      // Save the project ID for later tests and cleanup
      addedProjectId = result.data?.id ?? null;
    });

    it('returns 400 for invalid path', async () => {
      const response = await apiClient.post('/api/projects', {
        path: '/nonexistent/invalid/path/that/does/not/exist',
      });

      expect(response.status).toBe(400);
      expect(response.ok).toBe(false);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('returns project by ID', async () => {
      if (!addedProjectId) {
        // Skip if project wasn't added in previous test
        return;
      }

      const response = await apiClient.get<Project>(`/api/projects/${addedProjectId}`);

      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);

      const result = validateSchema(ProjectSchema, response.data);
      if (!result.success) {
        throw new Error(
          createSchemaErrorMessage(
            `GET /api/projects/${addedProjectId}`,
            result.errors || []
          )
        );
      }

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id', addedProjectId);
    });

    it('returns 404 for nonexistent project', async () => {
      const response = await apiClient.get(
        '/api/projects/nonexistent-project-id-12345'
      );

      expect(response.status).toBe(404);
      expect(response.ok).toBe(false);
    });
  });

  describe('PATCH /api/projects/:id', () => {
    it('updates project name', async () => {
      if (!addedProjectId) {
        return;
      }

      const response = await apiClient.patch<Project>(`/api/projects/${addedProjectId}`, {
        name: 'Updated Test Project',
      });

      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('name', 'Updated Test Project');
    });

    it('updates project color', async () => {
      if (!addedProjectId) {
        return;
      }

      const response = await apiClient.patch<Project>(`/api/projects/${addedProjectId}`, {
        color: '#FF5733',
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('color', '#FF5733');
    });

    it('returns 404 for nonexistent project', async () => {
      const response = await apiClient.patch(
        '/api/projects/nonexistent-project-id-12345',
        {
          name: 'Test',
        }
      );

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/projects/:id/switch', () => {
    it('switches to project', async () => {
      if (!addedProjectId) {
        return;
      }

      const response = await apiClient.post<Project>(
        `/api/projects/${addedProjectId}/switch`
      );

      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);

      const result = validateSchema(ProjectSchema, response.data);
      expect(result.success).toBe(true);
    });

    it('returns 404 for nonexistent project', async () => {
      const response = await apiClient.post(
        '/api/projects/nonexistent-project-id-12345/switch'
      );

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/projects/:id/favorite', () => {
    it('toggles favorite status', async () => {
      if (!addedProjectId) {
        return;
      }

      const response = await apiClient.post<ToggleFavoriteResponse>(
        `/api/projects/${addedProjectId}/favorite`
      );

      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);

      const result = validateSchema(ToggleFavoriteResponseSchema, response.data);
      if (!result.success) {
        throw new Error(
          createSchemaErrorMessage(
            `POST /api/projects/${addedProjectId}/favorite`,
            result.errors || []
          )
        );
      }

      expect(result.success).toBe(true);
      expect(typeof result.data?.favorite).toBe('boolean');
    });

    it('returns 404 for nonexistent project', async () => {
      const response = await apiClient.post(
        '/api/projects/nonexistent-project-id-12345/favorite'
      );

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/projects/refresh', () => {
    it('returns valid response', async () => {
      const response = await apiClient.post<RefreshProjectsResponse>('/api/projects/refresh');

      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);

      const result = validateSchema(RefreshProjectsResponseSchema, response.data);
      if (!result.success) {
        throw new Error(
          createSchemaErrorMessage(
            'POST /api/projects/refresh',
            result.errors || []
          )
        );
      }

      expect(result.success).toBe(true);
      expect(typeof result.data?.removed).toBe('number');
      expect(typeof result.data?.message).toBe('string');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('removes project', async () => {
      if (!addedProjectId) {
        return;
      }

      const response = await apiClient.delete(`/api/projects/${addedProjectId}`);

      expect(response.status).toBe(204);

      // Verify project is gone
      const getResponse = await apiClient.get(
        `/api/projects/${addedProjectId}`
      );
      expect(getResponse.status).toBe(404);

      // Mark as cleaned up
      addedProjectId = null;
    });

    it('returns 404 for nonexistent project', async () => {
      const response = await apiClient.delete(
        '/api/projects/nonexistent-project-id-12345'
      );

      expect(response.status).toBe(404);
    });
  });
});
