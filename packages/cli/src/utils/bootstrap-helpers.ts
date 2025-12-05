import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import matter from 'gray-matter';
import { loadConfig } from '../config.js';
import type { SpecStatus, SpecFrontmatter } from '../frontmatter.js';
import { 
  getFirstCommitTimestamp, 
  fileExistsInGit,
  parseStatusTransitions,
} from './git-timestamps.js';

/**
 * Information about a spec file that may or may not have valid frontmatter
 */
export interface BootstrapSpecInfo {
  path: string;           // Relative path to spec directory
  fullPath: string;       // Absolute path to spec directory
  filePath: string;       // Absolute path to spec file (README.md)
  name: string;           // Spec directory name
  content: string;        // File content
  hasFrontmatter: boolean; // Does file have YAML frontmatter?
  hasValidFrontmatter: boolean; // Does frontmatter have required fields?
  existingFrontmatter?: Partial<SpecFrontmatter>; // Existing frontmatter data
  inferredStatus?: SpecStatus; // Status inferred from content/git
  inferredCreated?: string;    // Created date inferred from content/git
}

/**
 * Load all spec directories, including those without valid frontmatter
 */
export async function loadSpecsForBootstrap(
  specsDir: string,
  options: {
    includeArchived?: boolean;
    targetSpecs?: string[];
  } = {}
): Promise<BootstrapSpecInfo[]> {
  const specs: BootstrapSpecInfo[] = [];
  const config = await loadConfig();
  
  // Pattern to match spec directories (2 or more digits followed by dash)
  const specPattern = /^(\d{2,})-/;
  
  async function scanDirectory(dir: string, relativePath: string = ''): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        // Skip archived directory in main scan (handle separately)
        if (entry.name === 'archived' && relativePath === '') continue;
        
        const entryPath = path.join(dir, entry.name);
        const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        
        // Check if this is a spec directory (NNN-name format)
        if (specPattern.test(entry.name)) {
          // Filter by target specs if specified
          if (options.targetSpecs && options.targetSpecs.length > 0) {
            const matches = options.targetSpecs.some(target => {
              // Match by name, number, or path
              const targetNum = target.match(/^0*(\d+)$/)?.[1];
              const entryNum = entry.name.match(/^(\d+)/)?.[1];
              return entry.name === target || 
                     entry.name.includes(target) || 
                     (targetNum && entryNum && parseInt(targetNum, 10) === parseInt(entryNum, 10));
            });
            if (!matches) continue;
          }
          
          const specFile = path.join(entryPath, config.structure.defaultFile);
          
          try {
            await fs.access(specFile);
            const specInfo = await analyzeSpecFile(specFile, entryPath, entryRelativePath, entry.name);
            specs.push(specInfo);
          } catch {
            // No spec file found, skip
          }
        } else {
          // Not a spec directory, scan recursively
          await scanDirectory(entryPath, entryRelativePath);
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }
  }
  
  await scanDirectory(specsDir);
  
  // Load archived specs if requested
  if (options.includeArchived) {
    const archivedPath = path.join(specsDir, 'archived');
    await scanDirectory(archivedPath, 'archived');
  }
  
  // Sort by spec number descending
  specs.sort((a, b) => {
    const aNum = parseInt(a.name.match(/^(\d+)/)?.[1] || '0', 10);
    const bNum = parseInt(b.name.match(/^(\d+)/)?.[1] || '0', 10);
    return bNum - aNum;
  });
  
  return specs;
}

/**
 * Analyze a spec file and extract/infer frontmatter data
 */
async function analyzeSpecFile(
  filePath: string,
  fullPath: string,
  relativePath: string,
  name: string
): Promise<BootstrapSpecInfo> {
  const content = await fs.readFile(filePath, 'utf-8');
  
  // Try to parse existing frontmatter
  let hasFrontmatter = false;
  let hasValidFrontmatter = false;
  let existingFrontmatter: Partial<SpecFrontmatter> | undefined;
  
  try {
    const parsed = matter(content);
    if (parsed.data && Object.keys(parsed.data).length > 0) {
      hasFrontmatter = true;
      existingFrontmatter = parsed.data as Partial<SpecFrontmatter>;
      
      // Check if required fields exist
      hasValidFrontmatter = !!(parsed.data.status && parsed.data.created);
    }
  } catch {
    // Failed to parse frontmatter
  }
  
  // Infer status from content or git
  const inferredStatus = inferStatusFromContent(content) || 
                         inferStatusFromGit(filePath) || 
                         'planned';
  
  // Infer created date from content or git
  const inferredCreated = inferCreatedFromContent(content) || 
                          inferCreatedFromGit(filePath) ||
                          new Date().toISOString().split('T')[0];
  
  return {
    path: relativePath,
    fullPath,
    filePath,
    name,
    content,
    hasFrontmatter,
    hasValidFrontmatter,
    existingFrontmatter,
    inferredStatus: existingFrontmatter?.status || inferredStatus,
    inferredCreated: existingFrontmatter?.created || inferredCreated,
  };
}

/**
 * Infer status from markdown content using common patterns
 */
export function inferStatusFromContent(content: string): SpecStatus | null {
  // Pattern 1: **Status**: Complete (inline metadata)
  const inlineMatch = content.match(/\*\*Status\*\*:\s*(?:✅\s*|📅\s*|⏳\s*|📦\s*)?(\w+(?:-\w+)?)/i);
  if (inlineMatch) {
    return normalizeStatus(inlineMatch[1]);
  }
  
  // Pattern 2: Status: Complete (simple format)
  const simpleMatch = content.match(/^Status:\s*(\w+(?:-\w+)?)/mi);
  if (simpleMatch) {
    return normalizeStatus(simpleMatch[1]);
  }
  
  // Pattern 3: [x] Done / [ ] In Progress (task list format)
  if (/^\s*-\s*\[x\]\s*(done|complete|finished)/mi.test(content)) {
    return 'complete';
  }
  
  // Pattern 4: ADR format - "Status: Accepted"
  const adrMatch = content.match(/^##?\s*Status\s*\n+\s*(\w+)/mi);
  if (adrMatch) {
    const adrStatus = adrMatch[1].toLowerCase();
    if (['accepted', 'approved', 'done'].includes(adrStatus)) {
      return 'complete';
    }
    if (['proposed', 'pending', 'draft'].includes(adrStatus)) {
      return 'planned';
    }
    if (['superseded', 'deprecated', 'rejected'].includes(adrStatus)) {
      return 'archived';
    }
  }
  
  return null;
}

/**
 * Infer status from git history (check if ever marked complete)
 */
export function inferStatusFromGit(filePath: string): SpecStatus | null {
  if (!fileExistsInGit(filePath)) {
    return null;
  }
  
  try {
    const transitions = parseStatusTransitions(filePath);
    if (transitions.length > 0) {
      // Return the last known status from git history
      return transitions[transitions.length - 1].status;
    }
  } catch {
    // Git parsing failed
  }
  
  return null;
}

/**
 * Normalize various status strings to valid SpecStatus
 */
function normalizeStatus(status: string): SpecStatus {
  const normalized = status.toLowerCase().trim().replace(/\s+/g, '-');
  
  const statusMap: Record<string, SpecStatus> = {
    // Standard statuses
    'planned': 'planned',
    'in-progress': 'in-progress',
    'inprogress': 'in-progress',
    'in_progress': 'in-progress',
    'wip': 'in-progress',
    'working': 'in-progress',
    'active': 'in-progress',
    'complete': 'complete',
    'completed': 'complete',
    'done': 'complete',
    'finished': 'complete',
    'implemented': 'complete',
    'archived': 'archived',
    'deprecated': 'archived',
    'superseded': 'archived',
    'rejected': 'archived',
    // ADR statuses
    'accepted': 'complete',
    'approved': 'complete',
    'proposed': 'planned',
    'pending': 'planned',
    'draft': 'planned',
  };
  
  return statusMap[normalized] || 'planned';
}

/**
 * Infer created date from markdown content
 */
export function inferCreatedFromContent(content: string): string | null {
  // Pattern 1: **Created**: 2025-01-15 (inline metadata)
  const inlineMatch = content.match(/\*\*Created\*\*:\s*(\d{4}-\d{2}-\d{2})/);
  if (inlineMatch) {
    return inlineMatch[1];
  }
  
  // Pattern 2: Created: 2025-01-15 (simple format)
  const simpleMatch = content.match(/^Created:\s*(\d{4}-\d{2}-\d{2})/mi);
  if (simpleMatch) {
    return simpleMatch[1];
  }
  
  // Pattern 3: Date: 2025-01-15
  const dateMatch = content.match(/^Date:\s*(\d{4}-\d{2}-\d{2})/mi);
  if (dateMatch) {
    return dateMatch[1];
  }
  
  // Pattern 4: ADR format - "Date: January 15, 2025"
  const adrMatch = content.match(/^##?\s*Date\s*\n+\s*(\w+\s+\d{1,2},?\s+\d{4})/mi);
  if (adrMatch) {
    try {
      const date = new Date(adrMatch[1]);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {
      // Failed to parse date
    }
  }
  
  // Pattern 5: Look for dates in common formats anywhere
  const anyDateMatch = content.match(/(\d{4}-\d{2}-\d{2})/);
  if (anyDateMatch) {
    return anyDateMatch[1];
  }
  
  return null;
}

/**
 * Infer created date from git history (first commit date)
 */
export function inferCreatedFromGit(filePath: string): string | null {
  const timestamp = getFirstCommitTimestamp(filePath);
  if (timestamp) {
    // Extract date part from ISO timestamp
    return timestamp.split('T')[0];
  }
  return null;
}
