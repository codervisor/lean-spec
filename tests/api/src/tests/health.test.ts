/**
 * Health endpoint tests
 *
 * Tests for GET /health endpoint (skips when not available).
 */

import { describe, it, expect } from 'vitest';
import { apiClient } from '../client';
import { HealthResponseSchema, type HealthResponse } from '../schemas';
import { validateSchema, createSchemaErrorMessage } from '../utils/validation';

describe('GET /health', () => {
  it('returns 200 OK and matches schema', async () => {
    const response = await apiClient.get('/health');

    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);

    const result = validateSchema(HealthResponseSchema, response.data);

    if (!result.success) {
      throw new Error(
        createSchemaErrorMessage('GET /health', result.errors || [])
      );
    }

    expect(result.success).toBe(true);
    expect(response.data).toHaveProperty('status', 'ok');
  });

  it('includes version string when available', async () => {
    const response = await apiClient.get<HealthResponse>('/health');
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('version');
    expect(typeof response.data.version === 'string' || response.data.version === undefined).toBe(true);
  });
});
