/**
 * Performance tests
 *
 * Tests for API response times and concurrency handling (project-scoped endpoints).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiClient } from '../client';
import {
  ProjectsListResponseSchema,
  type ProjectsListResponse,
  type ProjectMutationResponse,
} from '../schemas';
import {
  createTestProject,
  defaultTestFixtures,
  type TestProject,
} from '../fixtures';

describe('Performance', () => {
  let projectId: string | null = null;
  let mode: 'single-project' | 'multi-project' = 'single-project';
  let addedProjectId: string | null = null;
  let testProject: TestProject | null = null;
  let healthAvailable = true;
  let searchAvailable = true;

  beforeAll(async () => {
    const projectsResponse = await apiClient.get<ProjectsListResponse>('/api/projects');
    const projectsValidation = validateSchema(
      ProjectsListResponseSchema,
      projectsResponse.data
    );

    if (projectsValidation.success) {
      projectId = projectsValidation.data?.projects[0]?.id ?? 'default';
      mode = projectsValidation.data?.mode ?? 'single-project';
    }

    if (mode === 'multi-project') {
      testProject = await createTestProject({
        name: 'perf-test-project',
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

    const healthProbe = await apiClient.get('/health');
    if (healthProbe.status === 404) {
      healthAvailable = false;
    }

    const searchProbe = await apiClient.post('/api/search', { query: 'probe', projectId });
    if ([404, 501].includes(searchProbe.status)) {
      searchAvailable = false;
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

  describe('Response times', () => {
    it('GET /health completes promptly when available', async () => {
      if (!healthAvailable) {
        return;
      }
      const start = Date.now();
      await apiClient.get('/health');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });

    it('GET /api/projects completes within 700ms', async () => {
      const start = Date.now();
      await apiClient.get('/api/projects');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(700);
    });

    it('GET /api/projects/:projectId/specs completes within 1000ms', async () => {
      if (!projectId) {
        return;
      }
      const start = Date.now();
      await apiClient.get(`/api/projects/${projectId}/specs`);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    });

    it('GET /api/projects/:projectId/stats completes within 1000ms', async () => {
      if (!projectId) {
        return;
      }
      const start = Date.now();
      await apiClient.get(`/api/projects/${projectId}/stats`);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    });

    it('POST /api/search completes within 1200ms when available', async () => {
      if (!searchAvailable) {
        return;
      }
      const start = Date.now();
      await apiClient.post('/api/search', { query: 'test', projectId });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1200);
    });
  });

  describe('Concurrent requests', () => {
    it('handles 5 concurrent GET /api/projects requests', async () => {
      const requests = Array(5)
        .fill(null)
        .map(() => apiClient.get('/api/projects'));

      const results = await Promise.all(requests);

      expect(results.every((r) => r.status === 200)).toBe(true);
    });

    it('handles concurrent GET /health when available', async () => {
      if (!healthAvailable) {
        return;
      }

      const requests = Array(3)
        .fill(null)
        .map(() => apiClient.get('/health'));

      const results = await Promise.all(requests);

      expect(results.every((r) => r.status === 200)).toBe(true);
    });
  });
});
