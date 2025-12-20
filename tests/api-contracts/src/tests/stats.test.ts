/**
 * Stats endpoint tests
 *
 * Tests for GET /api/stats endpoint.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiClient } from '../client';
import { StatsResponseSchema, type StatsResponse, type Project } from '../schemas';
import { validateSchema, createSchemaErrorMessage } from '../utils/validation';
import { createTestProject, type TestProject } from '../fixtures';
import { statsTestFixtures } from '../fixtures/specs';

describe('GET /api/stats', () => {
  let testProject: TestProject | null = null;
  let addedProjectId: string | null = null;

  beforeAll(async () => {
    // Create a test project with known stats
    testProject = await createTestProject({
      name: 'stats-test-project',
      specs: statsTestFixtures,
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

  it('returns 200 OK', async () => {
    const response = await apiClient.get('/api/stats');
    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
  });

  it('returns valid response matching schema', async () => {
    const response = await apiClient.get('/api/stats');
    const result = validateSchema(StatsResponseSchema, response.data);

    if (!result.success) {
      throw new Error(
        createSchemaErrorMessage('GET /api/stats', result.errors || [])
      );
    }

    expect(result.success).toBe(true);
  });

  it('has all required fields', async () => {
    const response = await apiClient.get<StatsResponse>('/api/stats');
    const data = response.data;

    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('byStatus');
    expect(data).toHaveProperty('byPriority');
    expect(data).toHaveProperty('byTag');
    expect(data).toHaveProperty('completionPercentage');
    expect(data).toHaveProperty('activeCount');
    expect(data).toHaveProperty('unassigned');
  });

  describe('status counts', () => {
    it('has non-negative total count', async () => {
      const response = await apiClient.get<StatsResponse>('/api/stats');
      expect(response.data.total).toBeGreaterThanOrEqual(0);
    });

    it('has all status fields', async () => {
      const response = await apiClient.get<StatsResponse>('/api/stats');
      const byStatus = response.data.byStatus;

      expect(byStatus).toHaveProperty('planned');
      expect(byStatus).toHaveProperty('inProgress');
      expect(byStatus).toHaveProperty('complete');
      expect(byStatus).toHaveProperty('archived');
    });
  });

  describe('priority counts', () => {
    it('has all priority fields', async () => {
      const response = await apiClient.get<StatsResponse>('/api/stats');
      const byPriority = response.data.byPriority;

      expect(byPriority).toHaveProperty('low');
      expect(byPriority).toHaveProperty('medium');
      expect(byPriority).toHaveProperty('high');
      expect(byPriority).toHaveProperty('critical');
    });
  });

  describe('tag counts', () => {
    it('returns tag counts as array', async () => {
      const response = await apiClient.get<StatsResponse>('/api/stats');
      expect(Array.isArray(response.data.byTag)).toBe(true);
    });

    it('each tag has name and count', async () => {
      const response = await apiClient.get<StatsResponse>('/api/stats');
      for (const tagCount of response.data.byTag) {
        expect(tagCount).toHaveProperty('tag');
        expect(tagCount).toHaveProperty('count');
        expect(typeof tagCount.tag).toBe('string');
        expect(typeof tagCount.count).toBe('number');
        expect(tagCount.count).toBeGreaterThan(0);
      }
    });
  });

  describe('calculated metrics', () => {
    it('completion percentage is a number between 0 and 100', async () => {
      const response = await apiClient.get<StatsResponse>('/api/stats');
      const percentage = response.data.completionPercentage;

      expect(typeof percentage).toBe('number');
      expect(percentage).toBeGreaterThanOrEqual(0);
      expect(percentage).toBeLessThanOrEqual(100);
    });

    it('active count is non-negative', async () => {
      const response = await apiClient.get<StatsResponse>('/api/stats');
      expect(typeof response.data.activeCount).toBe('number');
      expect(response.data.activeCount).toBeGreaterThanOrEqual(0);
    });

    it('unassigned count is non-negative', async () => {
      const response = await apiClient.get<StatsResponse>('/api/stats');
      expect(typeof response.data.unassigned).toBe('number');
      expect(response.data.unassigned).toBeGreaterThanOrEqual(0);
    });
  });
});
