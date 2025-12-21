/**
 * API client configuration
 *
 * Reads the API_BASE_URL from environment variables to support testing
 * against different server implementations.
 */

/**
 * Base URL for the API server.
 *
 * Can be configured via environment variable:
 * - API_BASE_URL=http://localhost:3001 (Rust HTTP server)
 * - API_BASE_URL=http://localhost:3000 (Next.js server)
 *
 * Default: http://localhost:3001 (Rust HTTP server)
 */
export const API_BASE_URL =
  process.env.API_BASE_URL || 'http://localhost:3001';
