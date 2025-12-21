/**
 * Performance tests
 *
 * Tests for API response times and concurrency handling.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiClient } from '../client';
import {
  createTestProject,
  defaultTestFixtures,
  type TestProject,
} from '../fixtures';
import type { Project } from '../schemas';

describe('Performance', () => {
  let testProject: TestProject | null = null;
  let addedProjectId: string | null = null;

  beforeAll(async () => {
    // Create a test project
    testProject = await createTestProject({
      name: 'perf-test-project',
      specs: defaultTestFixtures,
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

  describe('Response times', () => {
    it('GET /health completes within 50ms', async () => {
      const start = Date.now();
      await apiClient.get('/health');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);
    });

    it('GET /api/projects completes within 100ms', async () => {
      const start = Date.now();
      await apiClient.get('/api/projects');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('GET /api/specs completes within 200ms', async () => {
      const start = Date.now();
      await apiClient.get('/api/specs');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(200);
    });

    it('GET /api/stats completes within 200ms', async () => {
      const start = Date.now();
      await apiClient.get('/api/stats');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(200);
    });

    it('POST /api/search completes within 300ms', async () => {
      const start = Date.now();
      await apiClient.post('/api/search', { query: 'test' });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(300);
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

    it('handles 3 concurrent GET /health requests', async () => {
      const requests = Array(3)
        .fill(null)
        .map(() => apiClient.get('/health'));

      const results = await Promise.all(requests);

      expect(results.every((r) => r.status === 200)).toBe(true);
    });
  });
});
