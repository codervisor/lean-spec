/**
 * Sub-spec detection and management
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

export interface SubSpec {
  name: string;
  file: string;
  iconName: string;
  color: string;
  content: string;
}

// Icon and color mapping with regex patterns for flexible matching
const ICON_PATTERNS: Array<{ pattern: RegExp; iconName: string; color: string }> = [
  // Design & UI
  { pattern: /design|ui|ux|mockup|wireframe|prototype/i, iconName: 'Palette', color: 'text-purple-600' },
  
  // Architecture & Structure
  { pattern: /architecture|structure|system|diagram/i, iconName: 'Map', color: 'text-indigo-600' },
  
  // Implementation & Code
  { pattern: /implementation|code|develop|build/i, iconName: 'Code', color: 'text-green-600' },
  
  // API & Integration
  { pattern: /api|endpoint|integration|interface/i, iconName: 'Code', color: 'text-blue-600' },
  
  // Testing & QA
  { pattern: /test|qa|quality|validation/i, iconName: 'TestTube', color: 'text-orange-600' },
  
  // Tasks & Project Management
  { pattern: /task|todo|checklist|milestone/i, iconName: 'CheckSquare', color: 'text-gray-600' },
  
  // Configuration & Setup
  { pattern: /config|setup|settings|environment/i, iconName: 'Wrench', color: 'text-yellow-600' },
  
  // Deployment & DevOps
  { pattern: /deploy|devops|ci|cd|pipeline|release/i, iconName: 'Wrench', color: 'text-orange-600' },
  
  // Migration & Updates
  { pattern: /migration|upgrade|refactor|transition/i, iconName: 'GitBranch', color: 'text-cyan-600' },
  
  // Security & Authentication
  { pattern: /security|auth|permission|access|encryption/i, iconName: 'CheckSquare', color: 'text-red-600' },
  
  // Performance & Optimization
  { pattern: /performance|optimization|speed|cache|benchmark/i, iconName: 'TrendingUp', color: 'text-green-600' },
  
  // Database & Data
  { pattern: /database|data|schema|model|query/i, iconName: 'FileText', color: 'text-blue-600' },
  
  // Documentation
  { pattern: /doc|guide|manual|reference/i, iconName: 'FileText', color: 'text-gray-500' },
  
  // GitHub & Git
  { pattern: /github|git|vcs|version/i, iconName: 'GitBranch', color: 'text-pink-600' },
];

// Default icon for unknown sub-spec types
const DEFAULT_ICON = { iconName: 'FileText', color: 'text-gray-600' };

/**
 * Get icon and color for a sub-spec based on its name using regex patterns
 */
function getIconForSubSpec(fileName: string): { iconName: string; color: string } {
  // Remove .md extension
  const baseName = fileName.replace(/\.md$/i, '');
  
  // Try to match against patterns
  for (const { pattern, iconName, color } of ICON_PATTERNS) {
    if (pattern.test(baseName)) {
      return { iconName, color };
    }
  }
  
  return DEFAULT_ICON;
}

/**
 * Convert filename to display name (e.g., "DESIGN.md" -> "Design")
 */
function formatSubSpecName(fileName: string): string {
  const baseName = fileName.replace(/\.md$/i, '');
  // Convert to title case: "API-DESIGN" -> "Api Design", "TESTING" -> "Testing"
  return baseName
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Detect sub-spec files in a spec directory (dynamically finds all .md files except README.md)
 */
export function detectSubSpecs(specDirPath: string): SubSpec[] {
  const subSpecs: SubSpec[] = [];

  if (!existsSync(specDirPath)) {
    return subSpecs;
  }

  try {
    const entries = readdirSync(specDirPath);
    
    for (const entry of entries) {
      // Skip README.md (main spec file), non-.md files, and directories
      if (entry === 'README.md' || !entry.endsWith('.md')) {
        continue;
      }

      const filePath = join(specDirPath, entry);
      const stat = statSync(filePath);
      
      // Skip directories
      if (!stat.isFile()) {
        continue;
      }

      try {
        const content = readFileSync(filePath, 'utf-8');
        // Remove frontmatter if present
        const { content: markdownContent } = matter(content);
        const iconConfig = getIconForSubSpec(entry);
        
        subSpecs.push({
          name: formatSubSpecName(entry),
          file: entry,
          iconName: iconConfig.iconName,
          color: iconConfig.color,
          content: markdownContent,
        });
      } catch (error) {
        console.error(`Error reading sub-spec ${entry}:`, error);
      }
    }

    // Sort alphabetically by filename for consistent ordering
    subSpecs.sort((a, b) => a.file.localeCompare(b.file));
  } catch (error) {
    console.error(`Error reading spec directory ${specDirPath}:`, error);
  }

  return subSpecs;
}

/**
 * Get sub-spec by name from a spec directory
 */
export function getSubSpec(specDirPath: string, fileName: string): SubSpec | null {
  const filePath = join(specDirPath, fileName);
  if (!existsSync(filePath)) return null;

  try {
    const content = readFileSync(filePath, 'utf-8');
    const { content: markdownContent } = matter(content);
    const iconConfig = getIconForSubSpec(fileName);
    
    return {
      name: formatSubSpecName(fileName),
      file: fileName,
      iconName: iconConfig.iconName,
      color: iconConfig.color,
      content: markdownContent,
    };
  } catch (error) {
    console.error(`Error reading sub-spec ${fileName}:`, error);
    return null;
  }
}
