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

const NullableDateTime = z.union([z.string(), z.date()]).nullable().optional();

const RelationshipsSchema = z.object({
  dependsOn: z.array(z.string()),
  requiredBy: z.array(z.string()).optional(),
});

const SubSpecSchema = z.object({
  slug: z.string(),
  title: z.string(),
  path: z.string().optional(),
});

/**
 * Schema for spec summary (list view)
 */
export const SpecSummarySchema = z.object({
  id: z.string(),
  projectId: z.string().optional(),
  specNumber: z.number().nullable(),
  specName: z.string(),
  title: z.string().nullable(),
  status: SpecStatusSchema.nullable(),
  priority: SpecPrioritySchema.nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  assignee: z.string().nullable().optional(),
  createdAt: NullableDateTime,
  updatedAt: NullableDateTime,
  completedAt: NullableDateTime,
  filePath: z.string(),
  githubUrl: z.string().nullable().optional(),
  syncedAt: NullableDateTime,
  relationships: RelationshipsSchema.optional(),
  subSpecsCount: z.number().optional(),
});

export type SpecSummary = z.infer<typeof SpecSummarySchema>;

/**
 * Schema for spec detail (full view)
 */
export const SpecDetailSchema = z.object({
  id: z.string(),
  projectId: z.string().optional(),
  specNumber: z.number().nullable(),
  specName: z.string(),
  title: z.string().nullable(),
  status: SpecStatusSchema.nullable(),
  priority: SpecPrioritySchema.nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  assignee: z.string().nullable().optional(),
  contentMd: z.string(),
  contentHtml: z.string().nullable().optional(),
  createdAt: NullableDateTime,
  updatedAt: NullableDateTime,
  completedAt: NullableDateTime,
  filePath: z.string(),
  githubUrl: z.string().nullable().optional(),
  syncedAt: NullableDateTime,
  relationships: RelationshipsSchema.optional(),
  subSpecs: z.array(SubSpecSchema).optional(),
});

export type SpecDetail = z.infer<typeof SpecDetailSchema>;

/**
 * Schema for list specs response (GET /api/projects/:projectId/specs)
 */
export const ListSpecsResponseSchema = z.object({
  specs: z.array(SpecSummarySchema),
  projectId: z.string().optional(),
});

export type ListSpecsResponse = z.infer<typeof ListSpecsResponseSchema>;

/**
 * Schema for metadata update request (PATCH /api/specs/:spec/metadata)
 * (kept for backward compatibility with Rust HTTP server)
 */
export const MetadataUpdateRequestSchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  tags: z.array(z.string()).optional(),
  assignee: z.string().optional(),
});

export type MetadataUpdateRequest = z.infer<typeof MetadataUpdateRequestSchema>;
