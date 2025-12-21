/**
 * Validation API schemas
 *
 * Canonical schema definitions for validation-related API responses.
 * These serve as the source of truth for API contracts.
 */

import { z } from 'zod';

/**
 * Schema for validation issue
 */
export const ValidationIssueSchema = z.object({
  severity: z.string(),
  message: z.string(),
  spec: z.string().optional().nullable(),
});

export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;

/**
 * Schema for validation response (GET /api/validate, GET /api/validate/:spec)
 */
export const ValidationResponseSchema = z.object({
  isValid: z.boolean(),
  issues: z.array(ValidationIssueSchema),
});

export type ValidationResponse = z.infer<typeof ValidationResponseSchema>;
