/**
 * Health API schemas
 *
 * Canonical schema definitions for health check responses.
 * These serve as the source of truth for API contracts.
 */

import { z } from 'zod';

/**
 * Schema for health check response (GET /health)
 */
export const HealthResponseSchema = z.object({
  status: z.string(),
  version: z.string().optional(),
  currentProject: z.string().optional().nullable(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
