/**
 * Project API schemas
 *
 * Canonical schema definitions for project-related API responses.
 * These serve as the source of truth for API contracts.
 */

import { z } from 'zod';

const DateTimeSchema = z.union([z.string(), z.date()]).optional().nullable();

/**
 * Schema for a single project (covers single-project and multi-project modes)
 */
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  displayName: z.string().optional(),
  path: z.string().optional(),
  specsDir: z.string(),
  favorite: z.boolean().optional(),
  color: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isFeatured: z.boolean().optional(),
  lastAccessed: DateTimeSchema,
  githubOwner: z.string().optional(),
  githubRepo: z.string().optional(),
});

export type Project = z.infer<typeof ProjectSchema>;

/**
 * Schema for the projects list response (GET /api/projects)
 */
export const ProjectsListResponseSchema = z.object({
  mode: z.enum(['single-project', 'multi-project']).optional(),
  projects: z.array(ProjectSchema),
  recentProjects: z.array(z.string()).optional(),
  favoriteProjects: z.array(z.string()).optional(),
});

export type ProjectsListResponse = z.infer<typeof ProjectsListResponseSchema>;

/**
 * Schema for add project request body (POST /api/projects)
 */
export const AddProjectRequestSchema = z.object({
  path: z.string(),
  favorite: z.boolean().optional(),
  color: z.string().optional(),
});

export type AddProjectRequest = z.infer<typeof AddProjectRequestSchema>;

/**
 * Schema for add/update project responses
 */
export const ProjectMutationResponseSchema = z.object({
  project: ProjectSchema.optional(),
  favorite: z.boolean().optional(),
});

export type ProjectMutationResponse = z.infer<typeof ProjectMutationResponseSchema>;

/**
 * Schema for project update request body (PATCH /api/projects/:id)
 */
export const ProjectUpdateRequestSchema = z.object({
  name: z.string().optional(),
  color: z.string().nullable().optional(),
  favorite: z.boolean().optional(),
  description: z.string().nullable().optional(),
});

export type ProjectUpdateRequest = z.infer<typeof ProjectUpdateRequestSchema>;

/**
 * Schema for project detail response (GET /api/projects/:id)
 */
export const ProjectResponseSchema = z.object({
  project: ProjectSchema.optional(),
});

export type ProjectResponse = z.infer<typeof ProjectResponseSchema>;
