/**
 * Health endpoint tests
 *
 * Tests for GET /health endpoint.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { apiClient } from '../client';
import { HealthResponseSchema, type HealthResponse } from '../schemas';
import { validateSchema, createSchemaErrorMessage } from '../utils/validation';

describe('GET /health', () => {
  beforeAll(async () => {
    // Simple connectivity check
    try {
      await apiClient.get('/health');
    } catch (error) {
      throw new Error(
        `Cannot connect to API server at ${apiClient.baseUrl}. ` +
          `Please ensure the server is running. Error: ${error}`
      );
    }
  });

  it('returns 200 OK', async () => {
    const response = await apiClient.get('/health');
    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
  });

  it('returns valid response matching schema', async () => {
    const response = await apiClient.get('/health');
    const result = validateSchema(HealthResponseSchema, response.data);

    if (!result.success) {
      throw new Error(
        createSchemaErrorMessage('GET /health', result.errors || [])
      );
    }

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('has status field set to "ok"', async () => {
    const response = await apiClient.get<HealthResponse>('/health');
    expect(response.data).toHaveProperty('status', 'ok');
  });

  it('includes version string', async () => {
    const response = await apiClient.get<HealthResponse>('/health');
    expect(response.data).toHaveProperty('version');
    expect(typeof response.data.version).toBe('string');
    expect(response.data.version.length).toBeGreaterThan(0);
  });
});
