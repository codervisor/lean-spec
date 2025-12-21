/**
 * Project API schemas
 *
 * Canonical schema definitions for project-related API responses.
 * These serve as the source of truth for API contracts.
 */

import { z } from 'zod';

/**
 * Schema for a single project
 */
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  specsDir: z.string(),
  favorite: z.boolean(),
  color: z.string().nullable(),
  lastAccessed: z.string(),
  addedAt: z.string(),
});

export type Project = z.infer<typeof ProjectSchema>;

/**
 * Schema for the projects list response (GET /api/projects)
 */
export const ProjectsListResponseSchema = z.object({
  projects: z.array(ProjectSchema),
  currentProjectId: z.string().nullable(),
});

export type ProjectsListResponse = z.infer<typeof ProjectsListResponseSchema>;

/**
 * Schema for add project request body (POST /api/projects)
 */
export const AddProjectRequestSchema = z.object({
  path: z.string(),
});

export type AddProjectRequest = z.infer<typeof AddProjectRequestSchema>;

/**
 * Schema for project update request body (PATCH /api/projects/:id)
 */
export const ProjectUpdateRequestSchema = z.object({
  name: z.string().optional(),
  color: z.string().nullable().optional(),
  favorite: z.boolean().optional(),
});

export type ProjectUpdateRequest = z.infer<typeof ProjectUpdateRequestSchema>;

/**
 * Schema for toggle favorite response (POST /api/projects/:id/favorite)
 */
export const ToggleFavoriteResponseSchema = z.object({
  favorite: z.boolean(),
});

export type ToggleFavoriteResponse = z.infer<typeof ToggleFavoriteResponseSchema>;

/**
 * Schema for refresh projects response (POST /api/projects/refresh)
 */
export const RefreshProjectsResponseSchema = z.object({
  removed: z.number(),
  message: z.string(),
});

export type RefreshProjectsResponse = z.infer<typeof RefreshProjectsResponseSchema>;
