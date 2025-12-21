/**
 * Dependencies API schemas
 *
 * Canonical schema definitions for dependency-related API responses.
 * These serve as the source of truth for API contracts.
 */

import { z } from 'zod';

export const DependencyNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  number: z.number(),
  status: z.string(),
  priority: z.string(),
  tags: z.array(z.string()),
});

export type DependencyNode = z.infer<typeof DependencyNodeSchema>;

export const DependencyEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  type: z.literal('dependsOn').optional(),
});

export type DependencyEdge = z.infer<typeof DependencyEdgeSchema>;

/**
 * Schema for dependency graph response (GET /api/projects/:projectId/dependencies)
 */
export const DependencyGraphSchema = z.object({
  nodes: z.array(DependencyNodeSchema),
  edges: z.array(DependencyEdgeSchema),
});

export type DependencyGraph = z.infer<typeof DependencyGraphSchema>;
