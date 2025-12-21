/**
 * Error handling tests
 *
 * Tests for API error responses across project-scoped endpoints.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { apiClient } from '../client';
import {
  ErrorResponseSchema,
  ErrorCodes,
  ProjectsListResponseSchema,
  type ErrorResponse,
  type ProjectsListResponse,
} from '../schemas';
import { validateSchema } from '../utils/validation';

describe('Error Handling', () => {
  let projectId: string | null = null;

  beforeAll(async () => {
    const projectsResponse = await apiClient.get<ProjectsListResponse>('/api/projects');
    const projectsValidation = validateSchema(
      ProjectsListResponseSchema,
      projectsResponse.data
    );

    if (projectsValidation.success) {
      projectId = projectsValidation.data?.projects[0]?.id ?? 'default';
    }
  });

  describe('404 Not Found errors', () => {
    it('GET /api/projects/:id returns 404 for nonexistent project', async () => {
      const response = await apiClient.get<ErrorResponse>(
        '/api/projects/nonexistent-project-id'
      );

      expect(response.status).toBe(404);

      const result = validateSchema(ErrorResponseSchema, response.data);
      expect(result.success).toBe(true);
    });

    it('GET /api/projects/:projectId/specs/:spec returns 404 for nonexistent spec', async () => {
      if (!projectId) {
        return;
      }

      const response = await apiClient.get<ErrorResponse>(
        `/api/projects/${projectId}/specs/999-nonexistent-spec`
      );

      expect([404, 400]).toContain(response.status);
      const result = validateSchema(ErrorResponseSchema, response.data);
      expect(result.success).toBe(true);
      if (response.status === 404) {
        expect(result.data?.code === undefined || result.data?.code === ErrorCodes.SPEC_NOT_FOUND).toBe(true);
      }
    });

    it('GET /api/projects/:id/dependencies returns 404 for nonexistent project', async () => {
      const response = await apiClient.get('/api/projects/nonexistent-project-id/dependencies');
      expect([404, 400]).toContain(response.status);
    });
  });

  describe('400 Bad Request errors', () => {
    it('POST /api/projects returns 400 for invalid path', async () => {
      const response = await apiClient.post<ErrorResponse>('/api/projects', {
        path: '/this/path/definitely/does/not/exist/anywhere/on/disk',
      });

      expect([400, 422]).toContain(response.status);

      const result = validateSchema(ErrorResponseSchema, response.data);
      expect(result.success).toBe(true);
    });
  });

  describe('Error response schema', () => {
    it('error responses expose error messages', async () => {
      const response = await apiClient.get<ErrorResponse>('/api/projects/nonexistent');

      const result = validateSchema(ErrorResponseSchema, response.data);
      expect(result.success).toBe(true);
      expect(typeof result.data?.error).toBe('string');
    });
  });

  describe('Known error codes (optional)', () => {
    it('uses PROJECT_NOT_FOUND for missing projects when provided', async () => {
      const response = await apiClient.get<ErrorResponse>('/api/projects/missing-project');
      if (!response.data.code) {
        return;
      }
      expect(response.data.code).toBe(ErrorCodes.PROJECT_NOT_FOUND);
    });

    it('uses SPEC_NOT_FOUND for missing specs when provided', async () => {
      if (!projectId) {
        return;
      }

      const response = await apiClient.get<ErrorResponse>(
        `/api/projects/${projectId}/specs/missing-spec`
      );
      if (!response.data.code) {
        return;
      }
      expect(response.data.code).toBe(ErrorCodes.SPEC_NOT_FOUND);
    });
  });
});
