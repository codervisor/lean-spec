/**
 * Sub-spec detection and management
 */

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

export interface SubSpec {
  name: string;
  file: string;
  iconName: string;
  color: string;
  content: string;
}

const SUB_SPEC_CONFIG = [
  { name: 'README', file: 'README.md', iconName: 'FileText', color: 'text-blue-600' },
  { name: 'DESIGN', file: 'DESIGN.md', iconName: 'Palette', color: 'text-purple-600' },
  { name: 'ARCHITECTURE', file: 'ARCHITECTURE.md', iconName: 'Map', color: 'text-indigo-600' },
  { name: 'IMPLEMENTATION', file: 'IMPLEMENTATION.md', iconName: 'Code', color: 'text-green-600' },
  { name: 'TESTING', file: 'TESTING.md', iconName: 'TestTube', color: 'text-orange-600' },
  { name: 'TASKS', file: 'TASKS.md', iconName: 'CheckSquare', color: 'text-gray-600' },
  { name: 'CONFIGURATION', file: 'CONFIGURATION.md', iconName: 'Wrench', color: 'text-yellow-600' },
  { name: 'GITHUB-INTEGRATION', file: 'GITHUB-INTEGRATION.md', iconName: 'GitBranch', color: 'text-pink-600' },
  { name: 'UI-UX-DESIGN', file: 'UI-UX-DESIGN.md', iconName: 'Palette', color: 'text-violet-600' },
];

/**
 * Detect sub-spec files in a spec directory
 */
export function detectSubSpecs(specDirPath: string): SubSpec[] {
  const subSpecs: SubSpec[] = [];

  if (!existsSync(specDirPath)) {
    return subSpecs;
  }

  for (const config of SUB_SPEC_CONFIG) {
    const filePath = join(specDirPath, config.file);
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, 'utf-8');
        // Remove frontmatter if present
        const { content: markdownContent } = matter(content);
        
        subSpecs.push({
          name: config.name,
          file: config.file,
          iconName: config.iconName,
          color: config.color,
          content: markdownContent,
        });
      } catch (error) {
        console.error(`Error reading sub-spec ${config.file}:`, error);
      }
    }
  }

  return subSpecs;
}

/**
 * Get sub-spec by name from a spec directory
 */
export function getSubSpec(specDirPath: string, fileName: string): SubSpec | null {
  const config = SUB_SPEC_CONFIG.find(c => c.file === fileName);
  if (!config) return null;

  const filePath = join(specDirPath, fileName);
  if (!existsSync(filePath)) return null;

  try {
    const content = readFileSync(filePath, 'utf-8');
    const { content: markdownContent } = matter(content);
    
    return {
      name: config.name,
      file: config.file,
      iconName: config.iconName,
      color: config.color,
      content: markdownContent,
    };
  } catch (error) {
    console.error(`Error reading sub-spec ${fileName}:`, error);
    return null;
  }
}
