/**
 * Stats API schemas
 *
 * Canonical schema definitions for statistics-related API responses.
 * These serve as the source of truth for API contracts.
 */

import { z } from 'zod';

/**
 * Schema for status counts
 */
export const StatusCountsSchema = z.object({
  planned: z.number(),
  inProgress: z.number(),
  complete: z.number(),
  archived: z.number(),
});

export type StatusCounts = z.infer<typeof StatusCountsSchema>;

/**
 * Schema for priority counts
 */
export const PriorityCountsSchema = z.object({
  low: z.number(),
  medium: z.number(),
  high: z.number(),
  critical: z.number(),
});

export type PriorityCounts = z.infer<typeof PriorityCountsSchema>;

/**
 * Schema for tag count
 */
export const TagCountSchema = z.object({
  tag: z.string(),
  count: z.number(),
});

export type TagCount = z.infer<typeof TagCountSchema>;

/**
 * Schema for stats response (GET /api/stats)
 */
export const StatsResponseSchema = z.object({
  total: z.number(),
  byStatus: StatusCountsSchema,
  byPriority: PriorityCountsSchema,
  byTag: z.array(TagCountSchema),
  completionPercentage: z.number(),
  activeCount: z.number(),
  unassigned: z.number(),
});

export type StatsResponse = z.infer<typeof StatsResponseSchema>;
