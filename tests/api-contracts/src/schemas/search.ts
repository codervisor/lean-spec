/**
 * Search API schemas
 *
 * Canonical schema definitions for search-related API responses.
 * These serve as the source of truth for API contracts.
 */

import { z } from 'zod';
import { SpecSummarySchema } from './specs';

/**
 * Schema for search filters
 */
export const SearchFiltersSchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

/**
 * Schema for search request body (POST /api/search)
 */
export const SearchRequestSchema = z.object({
  query: z.string(),
  filters: SearchFiltersSchema.optional(),
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;

/**
 * Schema for search response (POST /api/search)
 */
export const SearchResponseSchema = z.object({
  results: z.array(SpecSummarySchema),
  total: z.number(),
  query: z.string(),
});

export type SearchResponse = z.infer<typeof SearchResponseSchema>;
