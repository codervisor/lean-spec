/**
 * Database-backed spec source
 * Reads specs from PostgreSQL/SQLite database
 */

import { db, schema } from '../../db';
import { eq, and } from 'drizzle-orm';
import type { SpecSource } from '../types';
import type { Spec } from '../../db/schema';

/**
 * Database source implementation
 * Reads specs from database (for external GitHub repos)
 */
export class DatabaseSource implements SpecSource {
  /**
   * Get all specs, optionally filtered by projectId
   */
  async getAllSpecs(projectId?: string): Promise<Spec[]> {
    const query = projectId
      ? db.select().from(schema.specs).where(eq(schema.specs.projectId, projectId))
      : db.select().from(schema.specs);

    return await query.orderBy(schema.specs.specNumber);
  }

  /**
   * Get a single spec by path and projectId
   */
  async getSpec(specPath: string, projectId?: string): Promise<Spec | null> {
    if (!projectId) {
      return null; // Database mode requires projectId
    }

    // Parse spec number from path (e.g., "035" or "035-my-spec")
    const specNum = parseInt(specPath.split('-')[0], 10);
    if (isNaN(specNum)) {
      return null;
    }

    const results = await db
      .select()
      .from(schema.specs)
      .where(and(eq(schema.specs.projectId, projectId), eq(schema.specs.specNumber, specNum)))
      .limit(1);

    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get specs by status
   */
  async getSpecsByStatus(
    status: 'planned' | 'in-progress' | 'complete' | 'archived',
    projectId?: string
  ): Promise<Spec[]> {
    const conditions = [eq(schema.specs.status, status)];
    if (projectId) {
      conditions.push(eq(schema.specs.projectId, projectId));
    }

    return await db
      .select()
      .from(schema.specs)
      .where(and(...conditions))
      .orderBy(schema.specs.specNumber);
  }

  /**
   * Search specs by query
   */
  async searchSpecs(query: string, projectId?: string): Promise<Spec[]> {
    // TODO: Implement full-text search with database
    // For now, just return all specs and filter in memory
    const allSpecs = await this.getAllSpecs(projectId);
    const lowerQuery = query.toLowerCase();

    return allSpecs.filter((spec) => {
      return (
        spec.specName.toLowerCase().includes(lowerQuery) ||
        spec.title?.toLowerCase().includes(lowerQuery) ||
        spec.contentMd.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * Invalidate cache (no-op for database source)
   */
  invalidateCache(): void {
    // Database source doesn't have its own cache
    // Next.js handles caching at the page level
  }
}
