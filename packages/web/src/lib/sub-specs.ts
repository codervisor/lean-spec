/**
 * Sub-spec detection and management
 */

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import { FileText, Palette, Code, TestTube, CheckSquare, Wrench, Map, GitBranch } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface SubSpec {
  name: string;
  file: string;
  icon: LucideIcon;
  color: string;
  content: string;
}

const SUB_SPEC_CONFIG = [
  { name: 'README', file: 'README.md', icon: FileText, color: 'text-blue-600' },
  { name: 'DESIGN', file: 'DESIGN.md', icon: Palette, color: 'text-purple-600' },
  { name: 'ARCHITECTURE', file: 'ARCHITECTURE.md', icon: Map, color: 'text-indigo-600' },
  { name: 'IMPLEMENTATION', file: 'IMPLEMENTATION.md', icon: Code, color: 'text-green-600' },
  { name: 'TESTING', file: 'TESTING.md', icon: TestTube, color: 'text-orange-600' },
  { name: 'TASKS', file: 'TASKS.md', icon: CheckSquare, color: 'text-gray-600' },
  { name: 'CONFIGURATION', file: 'CONFIGURATION.md', icon: Wrench, color: 'text-yellow-600' },
  { name: 'GITHUB-INTEGRATION', file: 'GITHUB-INTEGRATION.md', icon: GitBranch, color: 'text-pink-600' },
  { name: 'UI-UX-DESIGN', file: 'UI-UX-DESIGN.md', icon: Palette, color: 'text-violet-600' },
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
          icon: config.icon,
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
      icon: config.icon,
      color: config.color,
      content: markdownContent,
    };
  } catch (error) {
    console.error(`Error reading sub-spec ${fileName}:`, error);
    return null;
  }
}
