/**
 * Dependencies endpoint tests
 *
 * Tests for GET /api/projects/:projectId/dependencies endpoint.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiClient } from '../client';
import {
  DependencyGraphSchema,
  ProjectsListResponseSchema,
  type DependencyGraph,
  type ProjectsListResponse,
  type ProjectMutationResponse,
} from '../schemas';
import { validateSchema, createSchemaErrorMessage } from '../utils/validation';
import {
  createTestProject,
  dependencyTestFixtures,
  type TestProject,
} from '../fixtures';

describe('GET /api/projects/:projectId/dependencies', () => {
  let projectId: string | null = null;
  let mode: 'single-project' | 'multi-project' = 'single-project';
  let addedProjectId: string | null = null;
  let testProject: TestProject | null = null;

  beforeAll(async () => {
    const projectsResponse = await apiClient.get<ProjectsListResponse>('/api/projects');
    const projectsValidation = validateSchema(
      ProjectsListResponseSchema,
      projectsResponse.data
    );

    if (!projectsValidation.success) {
      throw new Error(
        createSchemaErrorMessage('GET /api/projects', projectsValidation.errors || [])
      );
    }

    const projects = projectsValidation.data!;
    mode = projects.mode ?? 'single-project';
    projectId = projects.projects[0]?.id ?? 'default';

    if (mode === 'multi-project') {
      testProject = await createTestProject({
        name: 'deps-test-project',
        specs: dependencyTestFixtures,
      });

      const addResponse = await apiClient.post<ProjectMutationResponse>('/api/projects', {
        path: testProject.path,
      });

      if (addResponse.ok && addResponse.data?.project) {
        projectId = addResponse.data.project.id;
        addedProjectId = addResponse.data.project.id;
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

  it('returns dependency graph for the project', async () => {
    if (!projectId) {
      throw new Error('No projectId available for dependency tests');
    }

    const response = await apiClient.get(`/api/projects/${projectId}/dependencies`);
    expect([200, 404]).toContain(response.status);

    if (response.status === 200) {
      const result = validateSchema(DependencyGraphSchema, response.data);
      if (!result.success) {
        throw new Error(
          createSchemaErrorMessage(
            `GET /api/projects/${projectId}/dependencies`,
            result.errors || []
          )
        );
      }

      const graph = result.data as DependencyGraph;
      expect(Array.isArray(graph.nodes)).toBe(true);
      expect(Array.isArray(graph.edges)).toBe(true);
    }
  });

  it('edges reference valid node ids when available', async () => {
    if (!projectId) {
      return;
    }

    const response = await apiClient.get(`/api/projects/${projectId}/dependencies`);
    if (response.status !== 200) {
      return;
    }

    const nodeIds = new Set(response.data.nodes.map((node: { id: string }) => node.id));
    for (const edge of response.data.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });
});
