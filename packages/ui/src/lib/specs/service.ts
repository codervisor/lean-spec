/**
 * Unified specs service
 * Routes requests to filesystem or database source based on configuration
 */

import { FilesystemSource } from './sources/filesystem-source';
import { MultiProjectFilesystemSource } from './sources/multi-project-source';
import type { SpecSource } from './types';
import type { Spec } from '../db/schema';

// Lazy import DatabaseSource to avoid DB connection issues in filesystem mode
type DatabaseSourceConstructor = new () => SpecSource;
let DatabaseSourceCtor: DatabaseSourceConstructor | null = null;

/**
 * Service modes
 * - filesystem: Read from local filesystem only (LeanSpec's own specs)
 * - multi-project: Read from multiple local filesystem projects
 * - database: Read from database only (external repos)
 * - both: Support both modes (route based on projectId)
 */
type SpecsMode = 'filesystem' | 'multi-project' | 'database' | 'both';

/**
 * Unified specs service
 * Provides a single interface for accessing specs from different sources
 */
export class SpecsService {
  private filesystemSource?: FilesystemSource;
  private multiProjectSource?: MultiProjectFilesystemSource;
  private databaseSource?: SpecSource;
  private mode: SpecsMode;

  constructor() {
    this.mode = (process.env.SPECS_MODE as SpecsMode) || 'filesystem';

    if (this.mode === 'filesystem' || this.mode === 'both') {
      const specsDir = process.env.SPECS_DIR;
      this.filesystemSource = new FilesystemSource(specsDir);
    }

    if (this.mode === 'multi-project') {
      this.multiProjectSource = new MultiProjectFilesystemSource();
    }

    // Don't instantiate database source here - do it lazily
  }

  /**
   * Lazy load database source
   */
  private async getDatabaseSource(): Promise<SpecSource> {
    if (!this.databaseSource) {
      if (!DatabaseSourceCtor) {
        const { DatabaseSource } = await import('./sources/database-source');
        DatabaseSourceCtor = DatabaseSource;
      }
      this.databaseSource = new DatabaseSourceCtor();
    }
    return this.databaseSource;
  }

  /**
   * Get all specs
   * If projectId is provided, uses database source (external repo)
   * Otherwise uses filesystem source (LeanSpec's own specs)
   */
  async getAllSpecs(projectId?: string): Promise<Spec[]> {
    const source = await this.getSource(projectId);
    return await source.getAllSpecs(projectId);
  }

  /**
   * Get a single spec
   */
  async getSpec(specPath: string, projectId?: string): Promise<Spec | null> {
    const source = await this.getSource(projectId);
    return await source.getSpec(specPath, projectId);
  }

  /**
   * Get specs by status
   */
  async getSpecsByStatus(
    status: 'planned' | 'in-progress' | 'complete' | 'archived',
    projectId?: string
  ): Promise<Spec[]> {
    const source = await this.getSource(projectId);
    return await source.getSpecsByStatus(status, projectId);
  }

  /**
   * Search specs
   */
  async searchSpecs(query: string, projectId?: string): Promise<Spec[]> {
    const source = await this.getSource(projectId);
    return await source.searchSpecs(query, projectId);
  }

  /**
   * Invalidate cache
   */
  async invalidateCache(specPath?: string, projectId?: string): Promise<void> {
    const source = await this.getSource(projectId);
    source.invalidateCache(specPath);
  }

  /**
   * Get the appropriate source based on projectId and mode
   */
  private async getSource(projectId?: string): Promise<SpecSource> {
    // Multi-project mode: use multi-project source
    if (this.mode === 'multi-project' && this.multiProjectSource) {
      return this.multiProjectSource;
    }

    // If projectId provided, use database (external repo)
    if (projectId && (this.mode === 'database' || this.mode === 'both')) {
      return await this.getDatabaseSource();
    }

    // Otherwise use filesystem (LeanSpec's own specs)
    if (this.filesystemSource) {
      return this.filesystemSource;
    }

    throw new Error('No spec source configured');
  }
}

// Singleton instance
export const specsService = new SpecsService();
