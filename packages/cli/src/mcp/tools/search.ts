/**
 * Search tool - Intelligent relevance-ranked search across spec content
 */

import { z } from 'zod';
import { loadAllSpecs } from '../../spec-loader.js';
import type { SpecStatus, SpecPriority, SpecFilterOptions } from '../../frontmatter.js';
import { searchSpecs, type SearchableSpec } from '@leanspec/core';
import { formatErrorMessage, loadSubSpecMetadata } from '../helpers.js';
import type { ToolDefinition, SpecData } from '../types.js';

/**
 * Search specs for a query
 */
export async function searchSpecsData(query: string, options: {
  status?: SpecStatus;
  tags?: string[];
  priority?: SpecPriority;
  assignee?: string;
  customFields?: Record<string, unknown>;
}): Promise<{
  results: Array<{
    spec: SpecData;
    score: number;
    totalMatches: number;
    matches: Array<{
      field: string;
      text: string;
      lineNumber?: number;
      score: number;
      highlights: Array<[number, number]>;
    }>;
  }>;
  metadata: {
    totalResults: number;
    searchTime: number;
    query: string;
    specsSearched: number;
  };
}> {
  const filter: SpecFilterOptions = {};
  if (options.status) filter.status = options.status;
  if (options.tags) filter.tags = options.tags;
  if (options.priority) filter.priority = options.priority;
  if (options.assignee) filter.assignee = options.assignee;
  if (options.customFields) filter.customFields = options.customFields;

  const specs = await loadAllSpecs({
    includeArchived: true,
    includeContent: true,
    filter,
  });

  // Convert to searchable format
  const searchableSpecs: SearchableSpec[] = specs.map(spec => ({
    path: spec.path,
    name: spec.path,
    status: spec.frontmatter.status,
    priority: spec.frontmatter.priority,
    tags: spec.frontmatter.tags,
    title: spec.frontmatter.title as string | undefined,
    description: spec.frontmatter.description as string | undefined,
    content: spec.content,
  }));

  // Use intelligent search engine
  const searchResult = searchSpecs(query, searchableSpecs, {
    maxMatchesPerSpec: 5,
    contextLength: 80,
  });

  // Convert to MCP format
  const results = await Promise.all(
    searchResult.results.map(async (result) => {
      const specInfo = specs.find(s => s.path === result.spec.path);
      
      const spec: SpecData = {
        name: result.spec.name,
        path: result.spec.path,
        status: result.spec.status as SpecStatus,
        created: specInfo?.frontmatter.created || '',
        title: result.spec.title,
        tags: result.spec.tags,
        priority: result.spec.priority as SpecPriority | undefined,
        assignee: specInfo?.frontmatter.assignee,
        description: result.spec.description,
        customFields: specInfo?.frontmatter.custom as Record<string, unknown> | undefined,
      };
      
      // Add sub-spec metadata for progressive disclosure
      if (specInfo?.fullPath) {
        const subSpecs = await loadSubSpecMetadata(specInfo.fullPath);
        if (subSpecs.length > 0) {
          spec.subSpecs = subSpecs;
        }
      }
      
      return {
        spec,
        score: result.score,
        totalMatches: result.totalMatches,
        matches: result.matches.map(match => ({
          field: match.field,
          text: match.text,
          lineNumber: match.lineNumber,
          score: match.score,
          highlights: match.highlights,
        })),
      };
    })
  );

  return {
    results,
    metadata: searchResult.metadata,
  };
}

/**
 * Search tool definition
 */
export function searchTool(): ToolDefinition {
  return [
    'search',
    {
      title: 'Search Specs',
      description: 'Intelligent relevance-ranked search across all specification content. Uses field-weighted scoring (title > tags > description > content) to return the most relevant specs. Returns matching specs with relevance scores, highlighted excerpts, and metadata.',
      inputSchema: {
        query: z.string().describe('Search term or phrase to find in spec content. Multiple terms are combined with AND logic. Searches across titles, tags, descriptions, and body text with intelligent relevance ranking.'),
        status: z.enum(['planned', 'in-progress', 'complete', 'archived']).optional().describe('Limit search to specs with this status.'),
        tags: z.array(z.string()).optional().describe('Limit search to specs with these tags.'),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Limit search to specs with this priority.'),
      },
      outputSchema: {
        results: z.array(z.object({
          spec: z.any(),
          score: z.number(),
          totalMatches: z.number(),
          matches: z.array(z.object({
            field: z.string(),
            text: z.string(),
            lineNumber: z.number().optional(),
            score: z.number(),
            highlights: z.array(z.tuple([z.number(), z.number()])),
          })),
        })),
        metadata: z.object({
          totalResults: z.number(),
          searchTime: z.number(),
          query: z.string(),
          specsSearched: z.number(),
        }),
      },
    },
    async (input) => {
      try {
        const searchResult = await searchSpecsData(input.query, {
          status: input.status as SpecStatus | undefined,
          tags: input.tags,
          priority: input.priority as SpecPriority | undefined,
        });

        return {
          content: [{ type: 'text', text: JSON.stringify(searchResult, null, 2) }],
          structuredContent: searchResult,
        };
      } catch (error) {
        const errorMessage = formatErrorMessage('Error searching specs', error);
        return {
          content: [{ type: 'text', text: errorMessage }],
          isError: true,
        };
      }
    }
  ];
}
