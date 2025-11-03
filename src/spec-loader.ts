import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { loadConfig } from './config.js';
import { parseFrontmatter, getSpecFile, matchesFilter, type SpecFrontmatter, type SpecFilterOptions } from './frontmatter.js';

export interface SpecInfo {
  path: string; // Relative path like "20251101/003-pm-visualization-tools"
  fullPath: string; // Absolute path to spec directory
  filePath: string; // Absolute path to spec file (README.md)
  name: string; // Just the spec name like "003-pm-visualization-tools"
  date: string; // Date folder like "20251101"
  frontmatter: SpecFrontmatter;
  content?: string; // Full file content (optional, for search)
  subFiles?: SubFileInfo[]; // Sub-documents and assets
}

export interface SubFileInfo {
  name: string; // e.g., "TESTING.md" or "diagram.png"
  path: string; // Absolute path to the file
  size: number; // File size in bytes
  type: 'document' | 'asset'; // Classification based on file type
  content?: string; // Optional content for documents
}

// Load sub-files for a spec (all files except README.md)
export async function loadSubFiles(
  specDir: string,
  options: { includeContent?: boolean } = {}
): Promise<SubFileInfo[]> {
  const subFiles: SubFileInfo[] = [];

  try {
    const entries = await fs.readdir(specDir, { withFileTypes: true });

    for (const entry of entries) {
      // Skip README.md (main spec file)
      if (entry.name === 'README.md') continue;

      // Skip directories for now (could be assets folder)
      if (entry.isDirectory()) continue;

      const filePath = path.join(specDir, entry.name);
      const stat = await fs.stat(filePath);

      // Determine type based on extension
      const ext = path.extname(entry.name).toLowerCase();
      const isDocument = ext === '.md';

      const subFile: SubFileInfo = {
        name: entry.name,
        path: filePath,
        size: stat.size,
        type: isDocument ? 'document' : 'asset',
      };

      // Load content for documents if requested
      if (isDocument && options.includeContent) {
        subFile.content = await fs.readFile(filePath, 'utf-8');
      }

      subFiles.push(subFile);
    }
  } catch (error) {
    // Directory doesn't exist or can't be read - return empty array
    // This is expected for specs without sub-files
    return [];
  }

  // Sort: documents first, then alphabetically
  return subFiles.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'document' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

// Load all specs from the specs directory
export async function loadAllSpecs(options: {
  includeArchived?: boolean;
  includeContent?: boolean;
  includeSubFiles?: boolean;
  filter?: SpecFilterOptions;
} = {}): Promise<SpecInfo[]> {
  const config = await loadConfig();
  const cwd = process.cwd();
  const specsDir = path.join(cwd, config.specsDir);

  const specs: SpecInfo[] = [];

  // Check if specs directory exists
  try {
    await fs.access(specsDir);
  } catch {
    return [];
  }

  // Pattern to match spec directories (2 or more digits followed by dash)
  const specPattern = /^(\d{2,})-/;

  // Recursively load all specs from the directory structure
  async function loadSpecsFromDir(dir: string, relativePath: string = ''): Promise<void> {
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
          const specFile = await getSpecFile(entryPath, config.structure.defaultFile);
          
          if (specFile) {
            const frontmatter = await parseFrontmatter(specFile, config);
            
            if (frontmatter) {
              // Apply filter if provided
              if (options.filter && !matchesFilter(frontmatter, options.filter)) {
                continue;
              }
              
              // Extract date from path or frontmatter
              const dateMatch = entryRelativePath.match(/(\d{8})/);
              const date = dateMatch 
                ? dateMatch[1] 
                : (typeof frontmatter.created === 'string' 
                    ? frontmatter.created 
                    : frontmatter.created?.toString() || '');
              
              const specInfo: SpecInfo = {
                path: entryRelativePath,
                fullPath: entryPath,
                filePath: specFile,
                name: entry.name,
                date: date,
                frontmatter,
              };
              
              // Load content if requested
              if (options.includeContent) {
                specInfo.content = await fs.readFile(specFile, 'utf-8');
              }
              
              // Load sub-files if requested
              if (options.includeSubFiles) {
                specInfo.subFiles = await loadSubFiles(entryPath, {
                  includeContent: options.includeContent,
                });
              }
              
              specs.push(specInfo);
            }
          }
        } else {
          // Not a spec directory, scan recursively for nested structure
          await loadSpecsFromDir(entryPath, entryRelativePath);
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }
  }
  
  // Load active specs
  await loadSpecsFromDir(specsDir);

  // Load archived specs if requested
  if (options.includeArchived) {
    const archivedPath = path.join(specsDir, 'archived');
    await loadSpecsFromDir(archivedPath, 'archived');
  }

  // Sort specs by date (reverse chronological) and then by name
  specs.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return a.name.localeCompare(b.name);
  });

  return specs;
}

// Get a specific spec by path
export async function getSpec(specPath: string): Promise<SpecInfo | null> {
  const config = await loadConfig();
  const cwd = process.cwd();
  const specsDir = path.join(cwd, config.specsDir);

  // Resolve the full path
  let fullPath: string;
  if (path.isAbsolute(specPath)) {
    fullPath = specPath;
  } else {
    fullPath = path.join(specsDir, specPath);
  }

  // Check if directory exists
  try {
    await fs.access(fullPath);
  } catch {
    return null;
  }

  const specFile = await getSpecFile(fullPath, config.structure.defaultFile);
  if (!specFile) return null;

  const frontmatter = await parseFrontmatter(specFile, config);
  if (!frontmatter) return null;

  const content = await fs.readFile(specFile, 'utf-8');

  // Parse path components
  const relativePath = path.relative(specsDir, fullPath);
  const parts = relativePath.split(path.sep);
  const date = parts[0] === 'archived' ? parts[1] : parts[0];
  const name = parts[parts.length - 1];

  return {
    path: relativePath,
    fullPath,
    filePath: specFile,
    name,
    date,
    frontmatter,
    content,
  };
}
