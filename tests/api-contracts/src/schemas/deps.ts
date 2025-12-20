/**
 * Dependencies API schemas
 *
 * Canonical schema definitions for dependency-related API responses.
 * These serve as the source of truth for API contracts.
 */

import { z } from 'zod';
import { SpecSummarySchema } from './specs';

/**
 * Schema for dependency response (GET /api/deps/:spec)
 */
export const DependencyResponseSchema = z.object({
  spec: SpecSummarySchema,
  dependsOn: z.array(SpecSummarySchema),
  requiredBy: z.array(SpecSummarySchema),
});

export type DependencyResponse = z.infer<typeof DependencyResponseSchema>;
