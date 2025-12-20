/**
 * Schema validation utilities
 *
 * Helpers for validating API responses against Zod schemas.
 */

import { z } from 'zod';

/**
 * Result of a schema validation
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Validate data against a Zod schema
 */
export function validateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  const errors = result.error.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`
  );

  return {
    success: false,
    errors,
  };
}

/**
 * Format validation errors for test output
 */
export function formatValidationErrors(errors: string[]): string {
  return errors.map((e) => `  - ${e}`).join('\n');
}

/**
 * Create a helpful error message for schema validation failures
 */
export function createSchemaErrorMessage(
  endpoint: string,
  errors: string[]
): string {
  return `Schema validation failed for ${endpoint}:\n${formatValidationErrors(errors)}`;
}
