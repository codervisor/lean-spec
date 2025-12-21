/**
 * Validation endpoint tests
 *
 * Tests for GET /api/validate and GET /api/validate/:spec endpoints.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiClient } from '../client';
import {
  ValidationResponseSchema,
  ValidationIssueSchema,
  type ValidationResponse,
  type Project,
  type ListSpecsResponse,
} from '../schemas';
import { validateSchema, createSchemaErrorMessage } from '../utils/validation';
import { createTestProject, type TestProject } from '../fixtures';
import { validationTestFixtures } from '../fixtures/specs';

describe('Validation API', () => {
  let testProject: TestProject | null = null;
  let addedProjectId: string | null = null;

  beforeAll(async () => {
    // Create a test project with specs for validation
    testProject = await createTestProject({
      name: 'validation-test-project',
      specs: validationTestFixtures,
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

  describe('GET /api/validate', () => {
    it('returns 200 OK', async () => {
      const response = await apiClient.get('/api/validate');
      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
    });

    it('returns valid response matching schema', async () => {
      const response = await apiClient.get('/api/validate');
      const result = validateSchema(ValidationResponseSchema, response.data);

      if (!result.success) {
        throw new Error(
          createSchemaErrorMessage('GET /api/validate', result.errors || [])
        );
      }

      expect(result.success).toBe(true);
    });

    it('has isValid and issues fields', async () => {
      const response = await apiClient.get<ValidationResponse>('/api/validate');
      expect(response.data).toHaveProperty('isValid');
      expect(response.data).toHaveProperty('issues');
      expect(typeof response.data.isValid).toBe('boolean');
      expect(Array.isArray(response.data.issues)).toBe(true);
    });

    it('each issue matches ValidationIssue schema', async () => {
      const response = await apiClient.get<ValidationResponse>('/api/validate');

      for (const issue of response.data.issues) {
        const result = validateSchema(ValidationIssueSchema, issue);
        if (!result.success) {
          throw new Error(
            createSchemaErrorMessage('Validation issue', result.errors || [])
          );
        }
        expect(result.success).toBe(true);
      }
    });

    it('issues have severity and message', async () => {
      const response = await apiClient.get<ValidationResponse>('/api/validate');

      for (const issue of response.data.issues) {
        expect(issue).toHaveProperty('severity');
        expect(issue).toHaveProperty('message');
        expect(typeof issue.severity).toBe('string');
        expect(typeof issue.message).toBe('string');
      }
    });

    it('isValid is true when no error-level issues', async () => {
      const response = await apiClient.get<ValidationResponse>('/api/validate');

      const hasErrors = response.data.issues.some(
        (issue) => issue.severity === 'error'
      );

      expect(response.data.isValid).toBe(!hasErrors);
    });
  });

  describe('GET /api/validate/:spec', () => {
    it('returns 200 OK for valid spec by number', async () => {
      // First get a valid spec ID from the current project
      const specsResponse = await apiClient.get<ListSpecsResponse>('/api/specs');
      if (specsResponse.status !== 200 || specsResponse.data.specs.length === 0) {
        // Skip if no specs available
        return;
      }
      
      const specId = specsResponse.data.specs[0].id;
      const response = await apiClient.get(`/api/validate/${specId}`);
      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
    });

    it('returns valid response matching schema', async () => {
      // First get a valid spec ID from the current project
      const specsResponse = await apiClient.get<ListSpecsResponse>('/api/specs');
      if (specsResponse.status !== 200 || specsResponse.data.specs.length === 0) {
        return;
      }
      
      const specId = specsResponse.data.specs[0].id;
      const response = await apiClient.get(`/api/validate/${specId}`);
      const result = validateSchema(ValidationResponseSchema, response.data);

      if (!result.success) {
        throw new Error(
          createSchemaErrorMessage(
            `GET /api/validate/${specId}`,
            result.errors || []
          )
        );
      }

      expect(result.success).toBe(true);
    });

    it('returns 404 for nonexistent spec', async () => {
      // First ensure we have a project selected
      const specsResponse = await apiClient.get<ListSpecsResponse>('/api/specs');
      if (specsResponse.status !== 200) {
        // No project selected, skip this test
        return;
      }
      
      const response = await apiClient.get('/api/validate/999-nonexistent');
      expect(response.status).toBe(404);
      expect(response.ok).toBe(false);
    });

    it('returns validation result for single spec', async () => {
      // First get a valid spec ID from the current project
      const specsResponse = await apiClient.get<ListSpecsResponse>('/api/specs');
      if (specsResponse.status !== 200 || specsResponse.data.specs.length === 0) {
        return;
      }
      
      const specId = specsResponse.data.specs[0].id;
      const response = await apiClient.get<ValidationResponse>(`/api/validate/${specId}`);
      expect(response.data).toHaveProperty('isValid');
      expect(response.data).toHaveProperty('issues');
    });
  });
});
