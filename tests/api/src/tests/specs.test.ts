/**
 * Specs endpoint tests
 *
 * Tests for spec-related API endpoints.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiClient } from '../client';
import {
  ListSpecsResponseSchema,
  SpecDetailSchema,
  SpecSummarySchema,
  type ListSpecsResponse,
  type SpecDetail,
  type Project,
} from '../schemas';
import { validateSchema, createSchemaErrorMessage } from '../utils/validation';
import {
  createTestProject,
  defaultTestFixtures,
  type TestProject,
} from '../fixtures';

describe('Specs API', () => {
  let testProject: TestProject | null = null;
  let addedProjectId: string | null = null;

  beforeAll(async () => {
    // Create a test project with specs
    testProject = await createTestProject({
      name: 'specs-test-project',
      specs: defaultTestFixtures,
    });

    // Add the project to the server
    const addResponse = await apiClient.post<Project>('/api/projects', {
      path: testProject.path,
    });

    if (addResponse.ok && addResponse.data) {
      addedProjectId = addResponse.data.id;

      // Switch to the test project
      await apiClient.post(`/api/projects/${addedProjectId}/switch`);
    }
  });

  afterAll(async () => {
    // Clean up: remove the test project from the server
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

  describe('GET /api/specs', () => {
    it('returns 200 OK when project is selected', async () => {
      const response = await apiClient.get('/api/specs');
      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
    });

    it('returns valid response matching schema', async () => {
      const response = await apiClient.get('/api/specs');
      const result = validateSchema(ListSpecsResponseSchema, response.data);

      if (!result.success) {
        throw new Error(
          createSchemaErrorMessage('GET /api/specs', result.errors || [])
        );
      }

      expect(result.success).toBe(true);
    });

    it('returns specs array with total count', async () => {
      const response = await apiClient.get<ListSpecsResponse>('/api/specs');
      expect(response.data).toHaveProperty('specs');
      expect(response.data).toHaveProperty('total');
      expect(Array.isArray(response.data.specs)).toBe(true);
      expect(typeof response.data.total).toBe('number');
    });

    it('returns non-negative number of specs', async () => {
      const response = await apiClient.get<ListSpecsResponse>('/api/specs');
      expect(response.data.total).toBeGreaterThanOrEqual(0);
      expect(response.data.specs.length).toBe(response.data.total);
    });

    it('each spec matches SpecSummary schema', async () => {
      const response = await apiClient.get<ListSpecsResponse>('/api/specs');
      const specs = response.data.specs;

      for (const spec of specs) {
        const result = validateSchema(SpecSummarySchema, spec);
        if (!result.success) {
          throw new Error(
            createSchemaErrorMessage(
              `Spec ${spec.specName}`,
              result.errors || []
            )
          );
        }
        expect(result.success).toBe(true);
      }
    });

    describe('filters', () => {
      it('filters by status', async () => {
        const response = await apiClient.get<ListSpecsResponse>('/api/specs', {
          status: 'in-progress',
        });

        expect(response.status).toBe(200);

        const specs = response.data.specs;
        for (const spec of specs) {
          expect(spec.status).toBe('in-progress');
        }
      });

      it('filters by priority', async () => {
        const response = await apiClient.get<ListSpecsResponse>('/api/specs', {
          priority: 'high',
        });

        expect(response.status).toBe(200);

        const specs = response.data.specs;
        for (const spec of specs) {
          expect(spec.priority).toBe('high');
        }
      });

      it('filters by tags', async () => {
        const response = await apiClient.get<ListSpecsResponse>('/api/specs', { tags: 'api' });

        expect(response.status).toBe(200);

        const specs = response.data.specs;
        for (const spec of specs) {
          expect(spec.tags).toContain('api');
        }
      });

      it('returns empty array for no matches', async () => {
        const response = await apiClient.get<ListSpecsResponse>('/api/specs', {
          tags: 'nonexistent-tag-xyz',
        });

        expect(response.status).toBe(200);
        expect(response.data.specs).toHaveLength(0);
        expect(response.data.total).toBe(0);
      });
    });
  });

  describe('GET /api/specs/:spec', () => {
    it('returns spec by number', async () => {
      // Get an existing spec first
      const listResponse = await apiClient.get<ListSpecsResponse>('/api/specs');
      if (listResponse.data.specs.length === 0) {
        return; // Skip if no specs
      }
      
      const spec = listResponse.data.specs[0];
      const response = await apiClient.get(`/api/specs/${spec.id}`);

      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
    });

    it('returns valid response matching SpecDetail schema', async () => {
      // Get an existing spec first
      const listResponse = await apiClient.get<ListSpecsResponse>('/api/specs');
      if (listResponse.data.specs.length === 0) {
        return; // Skip if no specs
      }
      
      const spec = listResponse.data.specs[0];
      const response = await apiClient.get(`/api/specs/${spec.id}`);
      const result = validateSchema(SpecDetailSchema, response.data);

      if (!result.success) {
        throw new Error(
          createSchemaErrorMessage(`GET /api/specs/${spec.id}`, result.errors || [])
        );
      }

      expect(result.success).toBe(true);
    });

    it('includes content field', async () => {
      // Get an existing spec first
      const listResponse = await apiClient.get<ListSpecsResponse>('/api/specs');
      if (listResponse.data.specs.length === 0) {
        return; // Skip if no specs
      }
      
      const spec = listResponse.data.specs[0];
      const response = await apiClient.get<SpecDetail>(`/api/specs/${spec.id}`);
      expect(response.data).toHaveProperty('contentMd');
      expect(typeof response.data.contentMd).toBe('string');
      expect(response.data.contentMd.length).toBeGreaterThan(0);
    });

    it('returns 404 for nonexistent spec', async () => {
      const response = await apiClient.get('/api/specs/999-nonexistent-spec');

      expect(response.status).toBe(404);
      expect(response.ok).toBe(false);
    });
  });
});
