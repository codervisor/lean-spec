/**
 * Validation API schemas
 *
 * Canonical schema definitions for validation-related API responses.
 * These serve as the source of truth for API contracts.
 */

import { z } from 'zod';

/**
 * Schema for validation issue (legacy spec validation endpoints)
 */
export const ValidationIssueSchema = z.object({
  severity: z.string(),
  message: z.string(),
  spec: z.string().optional().nullable(),
});

export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;

/**
 * Schema for validation response (legacy GET /api/validate)
 */
export const ValidationResponseSchema = z.object({
  isValid: z.boolean(),
  issues: z.array(ValidationIssueSchema),
});

export type ValidationResponse = z.infer<typeof ValidationResponseSchema>;

/**
 * Schema for project validation response (POST /api/projects/:id/validate)
 */
export const ProjectValidationResponseSchema = z.object({
  projectId: z.string(),
  path: z.string(),
  validation: z.object({
    isValid: z.boolean(),
    error: z.string().nullable().optional(),
    specsDir: z.string().nullable().optional(),
  }),
});

export type ProjectValidationResponse = z.infer<typeof ProjectValidationResponseSchema>;
