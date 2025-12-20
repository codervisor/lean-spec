/**
 * Error response schemas
 *
 * Canonical schema definitions for error responses.
 * These serve as the source of truth for API contracts.
 */

import { z } from 'zod';

/**
 * Schema for standard API error response
 */
export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.string().optional().nullable(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/**
 * Error codes used in the API
 */
export const ErrorCodes = {
  NOT_FOUND: 'NOT_FOUND',
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  SPEC_NOT_FOUND: 'SPEC_NOT_FOUND',
  NO_PROJECT: 'NO_PROJECT',
  INVALID_REQUEST: 'INVALID_REQUEST',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
