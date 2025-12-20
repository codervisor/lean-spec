/**
 * Spec API schemas
 *
 * Canonical schema definitions for spec-related API responses.
 * These serve as the source of truth for API contracts.
 */

import { z } from 'zod';

/**
 * Spec status enum
 */
export const SpecStatusSchema = z.enum([
  'planned',
  'in-progress',
  'complete',
  'archived',
]);

export type SpecStatus = z.infer<typeof SpecStatusSchema>;

/**
 * Spec priority enum
 */
export const SpecPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export type SpecPriority = z.infer<typeof SpecPrioritySchema>;

/**
 * Schema for spec summary (list view)
 */
export const SpecSummarySchema = z.object({
  id: z.string(),
  specNumber: z.number().nullable(),
  specName: z.string(),
  title: z.string().nullable(),
  status: z.string(),
  priority: z.string().nullable(),
  tags: z.array(z.string()),
  assignee: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  filePath: z.string(),
  dependsOn: z.array(z.string()),
  requiredBy: z.array(z.string()).optional(),
});

export type SpecSummary = z.infer<typeof SpecSummarySchema>;

/**
 * Schema for spec detail (full view)
 */
export const SpecDetailSchema = z.object({
  id: z.string(),
  specNumber: z.number().nullable(),
  specName: z.string(),
  title: z.string().nullable(),
  status: z.string(),
  priority: z.string().nullable(),
  tags: z.array(z.string()),
  assignee: z.string().nullable().optional(),
  contentMd: z.string(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  filePath: z.string(),
  dependsOn: z.array(z.string()),
  requiredBy: z.array(z.string()).optional(),
});

export type SpecDetail = z.infer<typeof SpecDetailSchema>;

/**
 * Schema for list specs response (GET /api/specs)
 */
export const ListSpecsResponseSchema = z.object({
  specs: z.array(SpecSummarySchema),
  total: z.number(),
});

export type ListSpecsResponse = z.infer<typeof ListSpecsResponseSchema>;

/**
 * Schema for metadata update request (PATCH /api/specs/:spec/metadata)
 */
export const MetadataUpdateRequestSchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  tags: z.array(z.string()).optional(),
  assignee: z.string().optional(),
});

export type MetadataUpdateRequest = z.infer<typeof MetadataUpdateRequestSchema>;
