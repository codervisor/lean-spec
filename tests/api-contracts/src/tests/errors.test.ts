/**
 * Error handling tests
 *
 * Tests for API error responses across all endpoints.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiClient } from '../client';
import {
  ErrorResponseSchema,
  ErrorCodes,
  type ErrorResponse,
  type Project,
} from '../schemas';
import { validateSchema, createSchemaErrorMessage } from '../utils/validation';
import {
  createTestProject,
  defaultTestFixtures,
  type TestProject,
} from '../fixtures';

describe('Error Handling', () => {
  let testProject: TestProject | null = null;
  let addedProjectId: string | null = null;

  beforeAll(async () => {
    // Create a test project
    testProject = await createTestProject({
      name: 'error-test-project',
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

  describe('404 Not Found errors', () => {
    it('GET /api/projects/:id returns 404 for nonexistent project', async () => {
      const response = await apiClient.get<ErrorResponse>(
        '/api/projects/nonexistent-project-id'
      );

      expect(response.status).toBe(404);
      expect(response.ok).toBe(false);

      const result = validateSchema(ErrorResponseSchema, response.data);
      if (!result.success) {
        throw new Error(
          createSchemaErrorMessage('404 error response', result.errors || [])
        );
      }

      expect(result.success).toBe(true);
      expect(result.data?.error).toBeTruthy();
      expect(result.data?.code).toBe(ErrorCodes.PROJECT_NOT_FOUND);
    });

    it('GET /api/specs/:spec returns 404 for nonexistent spec', async () => {
      const response = await apiClient.get<ErrorResponse>('/api/specs/999-nonexistent-spec');

      expect(response.status).toBe(404);

      const result = validateSchema(ErrorResponseSchema, response.data);
      expect(result.success).toBe(true);
      expect(result.data?.code).toBe(ErrorCodes.SPEC_NOT_FOUND);
    });

    it('GET /api/deps/:spec returns 404 for nonexistent spec', async () => {
      const response = await apiClient.get('/api/deps/999-nonexistent-spec');

      expect(response.status).toBe(404);
    });

    it('GET /api/validate/:spec returns 404 for nonexistent spec', async () => {
      const response = await apiClient.get('/api/validate/999-nonexistent');

      expect(response.status).toBe(404);
    });
  });

  describe('400 Bad Request errors', () => {
    it('POST /api/projects returns 400 for invalid path', async () => {
      const response = await apiClient.post<ErrorResponse>('/api/projects', {
        path: '/this/path/definitely/does/not/exist/anywhere/on/disk',
      });

      expect(response.status).toBe(400);
      expect(response.ok).toBe(false);

      const result = validateSchema(ErrorResponseSchema, response.data);
      expect(result.success).toBe(true);
      expect(result.data?.error).toBeTruthy();
    });
  });

  describe('Error response schema', () => {
    it('error responses have required fields', async () => {
      const response = await apiClient.get<ErrorResponse>('/api/projects/nonexistent');

      expect(response.data).toHaveProperty('error');
      expect(response.data).toHaveProperty('code');
      expect(typeof response.data.error).toBe('string');
      expect(typeof response.data.code).toBe('string');
    });

    it('error responses may have optional details', async () => {
      const response = await apiClient.get<ErrorResponse>('/api/projects/nonexistent');

      // details field is optional, but if present should be a string
      if (
        response.data.details !== undefined &&
        response.data.details !== null
      ) {
        expect(typeof response.data.details).toBe('string');
      }
    });
  });

  describe('Known error codes', () => {
    it('uses PROJECT_NOT_FOUND for missing projects', async () => {
      const response = await apiClient.get<ErrorResponse>('/api/projects/missing-project');
      expect(response.data.code).toBe(ErrorCodes.PROJECT_NOT_FOUND);
    });

    it('uses SPEC_NOT_FOUND for missing specs', async () => {
      const response = await apiClient.get<ErrorResponse>('/api/specs/missing-spec');
      expect(response.data.code).toBe(ErrorCodes.SPEC_NOT_FOUND);
    });

    it('uses INVALID_REQUEST for bad requests', async () => {
      const response = await apiClient.post<ErrorResponse>('/api/projects', {
        path: '/invalid/path/that/does/not/exist',
      });

      expect(response.data.code).toBe(ErrorCodes.INVALID_REQUEST);
    });
  });
});
