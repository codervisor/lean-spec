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
}

// Load all specs from the specs directory
export async function loadAllSpecs(options: {
  includeArchived?: boolean;
  includeContent?: boolean;
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

  // Load active specs
  const entries = await fs.readdir(specsDir, { withFileTypes: true });
  const dateDirs = entries
    .filter((e) => e.isDirectory() && e.name !== 'archived')
    .sort((a, b) => b.name.localeCompare(a.name)); // Reverse chronological

  for (const dir of dateDirs) {
    const dateDir = path.join(specsDir, dir.name);
    const specEntries = await fs.readdir(dateDir, { withFileTypes: true });
    const specDirs = specEntries.filter((s) => s.isDirectory());

    for (const spec of specDirs) {
      const specDir = path.join(dateDir, spec.name);
      const specFile = await getSpecFile(specDir, config.structure.defaultFile);

      if (!specFile) continue;

      const frontmatter = await parseFrontmatter(specFile);
      if (!frontmatter) continue;

      // Apply filter if provided
      if (options.filter && !matchesFilter(frontmatter, options.filter)) {
        continue;
      }

      const specInfo: SpecInfo = {
        path: `${dir.name}/${spec.name}`,
        fullPath: specDir,
        filePath: specFile,
        name: spec.name,
        date: dir.name,
        frontmatter,
      };

      // Load content if requested
      if (options.includeContent) {
        specInfo.content = await fs.readFile(specFile, 'utf-8');
      }

      specs.push(specInfo);
    }
  }

  // Load archived specs if requested
  if (options.includeArchived) {
    const archivedPath = path.join(specsDir, 'archived');
    try {
      await fs.access(archivedPath);

      const archivedEntries = await fs.readdir(archivedPath, { withFileTypes: true });
      const archivedDirs = archivedEntries
        .filter((e) => e.isDirectory())
        .sort((a, b) => b.name.localeCompare(a.name));

      for (const dir of archivedDirs) {
        const dateDir = path.join(archivedPath, dir.name);
        const specEntries = await fs.readdir(dateDir, { withFileTypes: true });
        const specDirs = specEntries.filter((s) => s.isDirectory());

        for (const spec of specDirs) {
          const specDir = path.join(dateDir, spec.name);
          const specFile = await getSpecFile(specDir, config.structure.defaultFile);

          if (!specFile) continue;

          const frontmatter = await parseFrontmatter(specFile);
          if (!frontmatter) continue;

          // Apply filter if provided
          if (options.filter && !matchesFilter(frontmatter, options.filter)) {
            continue;
          }

          const specInfo: SpecInfo = {
            path: `archived/${dir.name}/${spec.name}`,
            fullPath: specDir,
            filePath: specFile,
            name: spec.name,
            date: dir.name,
            frontmatter,
          };

          // Load content if requested
          if (options.includeContent) {
            specInfo.content = await fs.readFile(specFile, 'utf-8');
          }

          specs.push(specInfo);
        }
      }
    } catch {
      // No archived directory
    }
  }

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

  const frontmatter = await parseFrontmatter(specFile);
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
