/**
 * Types for local multi-project support
 */

/**
 * Local project metadata
 */
export interface LocalProject {
  id: string;              // Unique identifier (hash of path)
  name: string;            // Display name (from config or folder name)
  path: string;            // Absolute path to project root
  specsDir: string;        // Path to specs/ directory
  lastAccessed: Date;      // For sorting recent projects
  favorite: boolean;       // User can pin favorites
  color?: string;          // Optional color coding
  description?: string;    // From project README or config
}

/**
 * Projects configuration file structure
 */
export interface ProjectsConfig {
  projects: LocalProject[];
  recentProjects: string[]; // Project IDs in order (max 10)
}

/**
 * Project validation result
 */
export interface ProjectValidation {
  isValid: boolean;
  path: string;
  specsDir?: string;
  name?: string;
  description?: string;
  error?: string;
}
