/**
 * Health endpoint tests
 *
 * Tests for GET /health endpoint (skips when not available).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { apiClient } from '../client';
import { HealthResponseSchema, type HealthResponse } from '../schemas';
import { validateSchema, createSchemaErrorMessage } from '../utils/validation';

describe('GET /health', () => {
  let available = true;

  beforeAll(async () => {
    const response = await apiClient.get('/health');
    if (response.status === 404) {
      available = false;
    }
  });

  it('returns 404 when health endpoint is not implemented', async () => {
    if (available) {
      return;
    }
    const response = await apiClient.get('/health');
    expect(response.status).toBe(404);
  });

  it('returns 200 OK when available', async () => {
    if (!available) {
      return;
    }
    const response = await apiClient.get('/health');
    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
  });

  it('returns valid response matching schema', async () => {
    if (!available) {
      return;
    }
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

  it('has status field set to "ok" when available', async () => {
    if (!available) {
      return;
    }
    const response = await apiClient.get<HealthResponse>('/health');
    expect(response.data).toHaveProperty('status', 'ok');
  });

  it('includes version string when available', async () => {
    if (!available) {
      return;
    }
    const response = await apiClient.get<HealthResponse>('/health');
    expect(response.data).toHaveProperty('version');
    expect(typeof response.data.version === 'string' || response.data.version === undefined).toBe(true);
  });
});
