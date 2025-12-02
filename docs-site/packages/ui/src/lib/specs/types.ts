/**
 * Types for the specs service layer
 */

import type { Spec } from '../db/schema';

/**
 * Unified interface for accessing specs from different sources
 * (filesystem or database)
 */
export interface SpecSource {
  /**
   * Get all specs, optionally filtered by projectId
   * @param projectId - Optional project ID for database mode
   */
  getAllSpecs(projectId?: string): Promise<Spec[]>;

  /**
   * Get a single spec by its identifier
   * @param specPath - Spec identifier (e.g., "035" or "035-my-spec")
   * @param projectId - Optional project ID for database mode
   */
  getSpec(specPath: string, projectId?: string): Promise<Spec | null>;

  /**
   * Get specs filtered by status
   * @param status - Status to filter by
   * @param projectId - Optional project ID for database mode
   */
  getSpecsByStatus(
    status: 'planned' | 'in-progress' | 'complete' | 'archived',
    projectId?: string
  ): Promise<Spec[]>;

  /**
   * Search specs by query
   * @param query - Search query string
   * @param projectId - Optional project ID for database mode
   */
  searchSpecs(query: string, projectId?: string): Promise<Spec[]>;

  /**
   * Invalidate cache for a specific spec or all specs
   * @param specPath - Optional spec path to invalidate, or undefined for all
   */
  invalidateCache(specPath?: string): void;
}

/**
 * Cached spec entry with expiration
 */
export interface CachedSpec<T = Spec | Spec[]> {
  data: T;
  expiresAt: number;
}

/**
 * Context file representation for project context visibility
 */
export interface ContextFile {
  name: string;
  path: string;
  content: string;
  tokenCount: number;
  lastModified: Date;
}

/**
 * LeanSpec configuration (from .lean-spec/config.json)
 */
export interface LeanSpecConfig {
  template?: string;
  specsDir?: string;
  structure?: {
    pattern?: string;
    prefix?: string;
    dateFormat?: string;
    sequenceDigits?: number;
    defaultFile?: string;
  };
  features?: {
    aiAgents?: boolean;
  };
  templates?: Record<string, string>;
}

/**
 * Project context containing all contextual files
 */
export interface ProjectContext {
  agentInstructions: ContextFile[];  // AGENTS.md, GEMINI.md, etc.
  config: {
    file: ContextFile | null;        // .lean-spec/config.json
    parsed: LeanSpecConfig | null;   // Parsed config object
  };
  projectDocs: ContextFile[];        // README.md, CONTRIBUTING.md, etc.
  totalTokens: number;
  projectRoot: string;               // Absolute path to project root (for editor links)
}
