/**
 * Service-based data access functions
 * These replace direct database queries with the unified specs service
 */

import { specsService } from '../specs/service';
import type { Spec } from './schema';
import { detectSubSpecs } from '../sub-specs';
import { join } from 'path';
import { readFileSync } from 'node:fs';
import matter from 'gray-matter';

/**
 * Spec with parsed tags (for client consumption)
 */
export type ParsedSpec = Omit<Spec, 'tags'> & {
  tags: string[] | null;
};

interface SpecRelationships {
  dependsOn: string[];
  related: string[];
}
function normalizeRelationshipList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }
  if (typeof value === 'string') {
    return [value];
  }
  return [];
}

function getFilesystemRelationships(specDirPath: string): SpecRelationships {
  try {
    const readmePath = join(specDirPath, 'README.md');
    const raw = readFileSync(readmePath, 'utf-8');
    const { data } = matter(raw);
    const dependsOn = normalizeRelationshipList(data?.depends_on ?? data?.dependsOn);
    const related = normalizeRelationshipList(data?.related);
    return {
      dependsOn,
      related,
    };
  } catch (error) {
    console.warn('Unable to parse spec relationships', error);
    return { dependsOn: [], related: [] };
  }
}

/**
 * Parse tags from JSON string to array
 */
function parseSpecTags(spec: Spec): ParsedSpec {
  return {
    ...spec,
    tags: spec.tags ? (typeof spec.tags === 'string' ? JSON.parse(spec.tags) : spec.tags) : null,
  };
}

/**
 * Get all specs (uses filesystem by default, database if projectId provided)
 */
export async function getSpecs(projectId?: string): Promise<ParsedSpec[]> {
  const specs = await specsService.getAllSpecs(projectId);
  return specs.map(parseSpecTags);
}

/**
 * Get a spec by ID (number or UUID)
 */
export async function getSpecById(id: string, projectId?: string): Promise<(ParsedSpec & { subSpecs?: import('../sub-specs').SubSpec[]; relationships?: SpecRelationships }) | null> {
  const spec = await specsService.getSpec(id, projectId);

  if (!spec) return null;

  const parsedSpec = parseSpecTags(spec);

  // Detect sub-specs from filesystem (only for filesystem mode)
  if (!projectId) {
    const specDirPath = join(process.cwd(), '../../specs', spec.filePath.replace('/README.md', '').replace('specs/', ''));
    const subSpecs = detectSubSpecs(specDirPath);
    const relationships = getFilesystemRelationships(specDirPath);
    return { ...parsedSpec, subSpecs, relationships };
  }

  return parsedSpec;
}

/**
 * Get specs by status
 */
export async function getSpecsByStatus(
  status: 'planned' | 'in-progress' | 'complete' | 'archived',
  projectId?: string
): Promise<ParsedSpec[]> {
  const specs = await specsService.getSpecsByStatus(status, projectId);
  return specs.map(parseSpecTags);
}

/**
 * Search specs
 */
export async function searchSpecs(query: string, projectId?: string): Promise<ParsedSpec[]> {
  const specs = await specsService.searchSpecs(query, projectId);
  return specs.map(parseSpecTags);
}

/**
 * Stats calculation
 */
export interface StatsResult {
  totalProjects: number;
  totalSpecs: number;
  specsByStatus: { status: string; count: number }[];
  specsByPriority: { priority: string; count: number }[];
  completionRate: number;
}

export async function getStats(projectId?: string): Promise<StatsResult> {
  const specs = await specsService.getAllSpecs(projectId);

  // Count by status
  const statusCounts = new Map<string, number>();
  const priorityCounts = new Map<string, number>();

  for (const spec of specs) {
    if (spec.status) {
      statusCounts.set(spec.status, (statusCounts.get(spec.status) || 0) + 1);
    }
    if (spec.priority) {
      priorityCounts.set(spec.priority, (priorityCounts.get(spec.priority) || 0) + 1);
    }
  }

  const completeCount = statusCounts.get('complete') || 0;
  const completionRate = specs.length > 0 ? (completeCount / specs.length) * 100 : 0;

  return {
    totalProjects: 1, // For now, single project (LeanSpec)
    totalSpecs: specs.length,
    specsByStatus: Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count })),
    specsByPriority: Array.from(priorityCounts.entries()).map(([priority, count]) => ({ priority, count })),
    completionRate: Math.round(completionRate * 10) / 10,
  };
}
