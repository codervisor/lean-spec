/**
 * Stats API schemas
 *
 * Canonical schema definitions for statistics-related API responses.
 * These serve as the source of truth for API contracts.
 */

import { z } from 'zod';

/**
 * Schema for status counts (array format from Next.js API)
 */
export const StatusCountSchema = z.object({
  status: z.string(),
  count: z.number(),
});

export type StatusCount = z.infer<typeof StatusCountSchema>;

/**
 * Schema for priority counts (array format from Next.js API)
 */
export const PriorityCountSchema = z.object({
  priority: z.string(),
  count: z.number(),
});

export type PriorityCount = z.infer<typeof PriorityCountSchema>;

/**
 * Schema for stats response (GET /api/projects/:projectId/stats)
 */
export const StatsResponseSchema = z.object({
  totalProjects: z.number(),
  totalSpecs: z.number(),
  specsByStatus: z.array(StatusCountSchema),
  specsByPriority: z.array(PriorityCountSchema),
  completionRate: z.number(),
});

export type StatsResponse = z.infer<typeof StatsResponseSchema>;
