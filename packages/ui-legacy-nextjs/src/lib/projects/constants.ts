/**
 * Shared project constants and utilities
 * 
 * These are isomorphic (work in both client and server) and provide
 * the canonical project ID handling for the unified architecture.
 */

/**
 * Default project ID for single-project mode
 * Allows treating single-project as a special case of multi-project
 */
export const DEFAULT_PROJECT_ID = 'default';

/**
 * Check if a projectId is the default project
 */
export function isDefaultProject(projectId?: string | null): boolean {
  return !projectId || projectId === DEFAULT_PROJECT_ID;
}

/**
 * Normalize projectId - returns DEFAULT_PROJECT_ID if undefined/null
 * Ensures all code paths use a consistent project identifier
 */
export function normalizeProjectId(projectId?: string | null): string {
  return projectId && projectId !== DEFAULT_PROJECT_ID ? projectId : DEFAULT_PROJECT_ID;
}
