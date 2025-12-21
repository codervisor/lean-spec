/**
 * Custom test assertions
 *
 * Helper functions for common test assertions.
 */

import type { ApiResponse } from '../client';

/**
 * Assert that a response has a specific status code
 */
export function assertStatus(
  response: ApiResponse,
  expectedStatus: number
): void {
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status}. ` +
        `Response: ${JSON.stringify(response.data, null, 2)}`
    );
  }
}

/**
 * Assert that a response is successful (2xx)
 */
export function assertSuccess(response: ApiResponse): void {
  if (!response.ok) {
    throw new Error(
      `Expected successful response, got status ${response.status}. ` +
        `Response: ${JSON.stringify(response.data, null, 2)}`
    );
  }
}

/**
 * Assert that a response has a specific content type
 */
export function assertContentType(
  response: ApiResponse,
  expectedType: string
): void {
  const contentType = response.headers['content-type'] || '';
  if (!contentType.includes(expectedType)) {
    throw new Error(
      `Expected content-type to contain "${expectedType}", got "${contentType}"`
    );
  }
}
