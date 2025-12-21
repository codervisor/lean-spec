/**
 * Dependencies endpoint tests
 *
 * Tests for GET /api/deps/:spec endpoint.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiClient } from '../client';
import {
  DependencyResponseSchema,
  SpecSummarySchema,
  type DependencyResponse,
  type Project,
} from '../schemas';
import { validateSchema, createSchemaErrorMessage } from '../utils/validation';
import {
  createTestProject,
  dependencyTestFixtures,
  type TestProject,
} from '../fixtures';

describe('GET /api/deps/:spec', () => {
  let testProject: TestProject | null = null;
  let addedProjectId: string | null = null;

  beforeAll(async () => {
    // Create a test project with dependency relationships
    testProject = await createTestProject({
      name: 'deps-test-project',
      specs: dependencyTestFixtures,
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

  it('returns 200 OK for valid spec', async () => {
    const response = await apiClient.get('/api/deps/001');
    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
  });

  it('returns valid response matching schema', async () => {
    const response = await apiClient.get('/api/deps/001');
    const result = validateSchema(DependencyResponseSchema, response.data);

    if (!result.success) {
      throw new Error(
        createSchemaErrorMessage('GET /api/deps/001', result.errors || [])
      );
    }

    expect(result.success).toBe(true);
  });

  it('has spec, dependsOn, and requiredBy fields', async () => {
    const response = await apiClient.get<DependencyResponse>('/api/deps/001');
    const data = response.data;

    expect(data).toHaveProperty('spec');
    expect(data).toHaveProperty('dependsOn');
    expect(data).toHaveProperty('requiredBy');
  });

  it('spec field matches SpecSummary schema', async () => {
    const response = await apiClient.get<DependencyResponse>('/api/deps/001');
    const result = validateSchema(SpecSummarySchema, response.data.spec);

    if (!result.success) {
      throw new Error(
        createSchemaErrorMessage('GET /api/deps/001 spec', result.errors || [])
      );
    }

    expect(result.success).toBe(true);
  });

  it('dependsOn is an array', async () => {
    const response = await apiClient.get<DependencyResponse>('/api/deps/002');
    expect(Array.isArray(response.data.dependsOn)).toBe(true);
  });

  it('requiredBy is an array', async () => {
    const response = await apiClient.get<DependencyResponse>('/api/deps/001');
    expect(Array.isArray(response.data.requiredBy)).toBe(true);
  });

  describe('error handling', () => {
    it('returns 404 for nonexistent spec', async () => {
      const response = await apiClient.get('/api/deps/999-nonexistent-spec');
      expect(response.status).toBe(404);
      expect(response.ok).toBe(false);
    });
  });
});
