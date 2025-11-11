/**
 * Core type definitions for LeanSpec
 */

// Valid status values
export type SpecStatus = 'planned' | 'in-progress' | 'complete' | 'archived';

// Valid priority values
export type SpecPriority = 'low' | 'medium' | 'high' | 'critical';

// Status transition record
export interface StatusTransition {
  status: SpecStatus;
  at: string; // ISO 8601 timestamp
}

// Core frontmatter fields
export interface SpecFrontmatter {
  // Required fields
  status: SpecStatus;
  created: string; // YYYY-MM-DD format

  // Recommended fields
  tags?: string[];
  priority?: SpecPriority;

  // Power user fields
  related?: string[];
  depends_on?: string[];
  updated?: string;
  completed?: string;
  assignee?: string;
  reviewer?: string;
  issue?: string;
  pr?: string;
  epic?: string;
  breaking?: boolean;
  due?: string; // YYYY-MM-DD format

  // Timestamp fields (for velocity tracking)
  created_at?: string; // ISO 8601 timestamp
  updated_at?: string; // ISO 8601 timestamp
  completed_at?: string; // ISO 8601 timestamp
  transitions?: StatusTransition[]; // Status change history

  // Allow any additional fields (for extensibility)
  [key: string]: unknown;
}

// Spec information
export interface SpecInfo {
  path: string; // Relative path like "003-pm-visualization-tools" or "20251101/003-pm-visualization-tools"
  fullPath: string; // Absolute path to spec directory
  filePath: string; // Absolute path to spec file (README.md)
  name: string; // Just the spec name like "003-pm-visualization-tools"
  date?: string; // Optional date folder like "20251101" (for dated patterns)
  frontmatter: SpecFrontmatter;
  content?: string; // Full file content (optional, for search)
  subFiles?: SubFileInfo[]; // Sub-documents and assets
}

// Sub-file information
export interface SubFileInfo {
  name: string; // e.g., "TESTING.md" or "diagram.png"
  path: string; // Absolute path to the file
  size: number; // File size in bytes
  type: 'document' | 'asset'; // Classification based on file type
  content?: string; // Optional content for documents
}

// Filter options for specs
export interface SpecFilterOptions {
  status?: SpecStatus | SpecStatus[];
  priority?: SpecPriority | SpecPriority[];
  tags?: string[];
  assignee?: string;
  includeArchived?: boolean;
}

// Configuration for LeanSpec
export interface LeanSpecConfig {
  specsDir: string; // Directory containing specs
  pattern?: string; // Organization pattern: 'flat' | 'dated' | 'nested'
  templateDir?: string; // Custom template directory
  defaultTemplate?: string; // Default template name
  structure?: {
    defaultFile?: string; // Default spec file name (e.g., 'README.md')
  };
  frontmatter?: {
    custom?: Record<string, 'string' | 'number' | 'boolean' | 'array'>; // Custom field types
  };
}
