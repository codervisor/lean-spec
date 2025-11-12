/**
 * Database queries for projects and specs
 */

import { db, schema } from './index';
import { eq, and, inArray, desc } from 'drizzle-orm';
import type { Project, Spec } from './schema';
import { detectSubSpecs } from '../sub-specs';
import { join } from 'path';

// Projects
export async function getProjects() {
  return await db.select().from(schema.projects).orderBy(desc(schema.projects.isFeatured), schema.projects.displayName);
}

export async function getProjectById(id: string) {
  const results = await db.select().from(schema.projects).where(eq(schema.projects.id, id)).limit(1);
  return results[0] || null;
}

export async function getFeaturedProjects() {
  return await db.select().from(schema.projects).where(eq(schema.projects.isFeatured, true));
}

// Specs
export async function getSpecs() {
  const results = await db.select().from(schema.specs).orderBy(schema.specs.specNumber);
  return results.map(spec => ({
    ...spec,
    tags: spec.tags ? JSON.parse(spec.tags) : null,
  }));
}

export async function getSpecById(id: string) {
  // Support both uuid and spec number (e.g., "035" or "35")
  let results;
  
  // Check if id is numeric (spec number)
  const specNum = parseInt(id, 10);
  if (!isNaN(specNum)) {
    results = await db.select().from(schema.specs).where(eq(schema.specs.specNumber, specNum)).limit(1);
  } else {
    // Fallback to uuid lookup
    results = await db.select().from(schema.specs).where(eq(schema.specs.id, id)).limit(1);
  }
  
  if (results.length === 0) return null;
  const spec = results[0];
  
  // Detect sub-specs from filesystem
  const specDirPath = join(process.cwd(), '../../specs', spec.filePath.replace('/README.md', '').replace('specs/', ''));
  const subSpecs = detectSubSpecs(specDirPath);
  
  return {
    ...spec,
    tags: spec.tags ? JSON.parse(spec.tags) : null,
    subSpecs,
  };
}

export async function getSpecsByProjectId(projectId: string) {
  const results = await db.select().from(schema.specs).where(eq(schema.specs.projectId, projectId)).orderBy(schema.specs.specNumber);
  return results.map(spec => ({
    ...spec,
    tags: spec.tags ? JSON.parse(spec.tags) : null,
  }));
}

export async function getSpecsByStatus(status: 'planned' | 'in-progress' | 'complete' | 'archived') {
  const results = await db.select().from(schema.specs).where(eq(schema.specs.status, status)).orderBy(schema.specs.specNumber);
  return results.map(spec => ({
    ...spec,
    tags: spec.tags ? JSON.parse(spec.tags) : null,
  }));
}

// Stats
export interface StatsResult {
  totalProjects: number;
  totalSpecs: number;
  specsByStatus: { status: string; count: number }[];
  specsByPriority: { priority: string; count: number }[];
  completionRate: number;
}

export async function getStats(): Promise<StatsResult> {
  const [projects, specs] = await Promise.all([
    db.select().from(schema.projects),
    db.select().from(schema.specs),
  ]);

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
    totalProjects: projects.length,
    totalSpecs: specs.length,
    specsByStatus: Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count })),
    specsByPriority: Array.from(priorityCounts.entries()).map(([priority, count]) => ({ priority, count })),
    completionRate: Math.round(completionRate * 10) / 10,
  };
}
