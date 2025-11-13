/**
 * Helper functions for MCP server modules
 */

import type { SpecData } from './types.js';

/**
 * Format error messages for MCP responses
 */
export function formatErrorMessage(prefix: string, error: unknown): string {
  const errorMsg = error instanceof Error ? error.message : String(error);
  return `${prefix}: ${errorMsg}`;
}

/**
 * Convert spec info to serializable SpecData format
 */
export function specToData(spec: any): SpecData {
  return {
    name: spec.name,
    path: spec.path,
    status: spec.frontmatter.status,
    created: spec.frontmatter.created,
    title: spec.frontmatter.title,
    tags: spec.frontmatter.tags,
    priority: spec.frontmatter.priority,
    assignee: spec.frontmatter.assignee,
    description: spec.frontmatter.description,
    customFields: spec.frontmatter.custom,
  };
}

/**
 * Regex pattern for detecting spec references in content.
 * Matches patterns like:
 * - "spec: 001-feature"
 * - "specs: 023-something"
 * - "depends on: 042-dependency"
 * The pattern expects at least 3 digits followed by optional hyphens and word characters.
 */
export const SPEC_REFERENCE_REGEX = /(?:spec[s]?[:\s]+|depends on[:\s]+)([0-9]{3,}[-\w]+)/gi;
