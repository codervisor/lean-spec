/**
 * Sub-spec styling utilities
 * 
 * Auto-assigns icons and colors to sub-spec files based on filename patterns.
 * This is a presentation concern and lives in the frontend.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Palette,
  Map,
  Code,
  TestTube,
  CheckSquare,
  Wrench,
  GitBranch,
  TrendingUp,
  FileText,
  Network,
  Rocket,
  Shield,
  Database,
  Lightbulb,
  BookOpen,
} from 'lucide-react';

interface SubSpecStyle {
  icon: LucideIcon;
  color: string;
}

interface PatternConfig {
  keywords: string[];
  icon: LucideIcon;
  color: string;
}

const PATTERNS: PatternConfig[] = [
  // Architecture & Structure (check before Design since "system-design" should be Architecture)
  {
    keywords: ['architecture', 'system', 'structure', 'diagram'],
    icon: Map,
    color: 'text-indigo-600',
  },
  // Design & UI
  {
    keywords: ['ui', 'ux', 'mockup', 'wireframe', 'prototype', 'design'],
    icon: Palette,
    color: 'text-purple-600',
  },
  // Implementation & Code
  {
    keywords: ['implementation', 'code', 'develop', 'build'],
    icon: Code,
    color: 'text-green-600',
  },
  // API & Integration
  {
    keywords: ['api', 'endpoint', 'integration', 'interface'],
    icon: Network,
    color: 'text-blue-600',
  },
  // Testing & QA
  {
    keywords: ['test', 'qa', 'quality', 'validation'],
    icon: TestTube,
    color: 'text-orange-600',
  },
  // Tasks & PM
  {
    keywords: ['task', 'todo', 'checklist', 'milestone'],
    icon: CheckSquare,
    color: 'text-slate-600',
  },
  // Configuration & Setup
  {
    keywords: ['config', 'setup', 'settings', 'environment'],
    icon: Wrench,
    color: 'text-amber-600',
  },
  // Deployment & DevOps
  {
    keywords: ['deploy', 'devops', 'ci', 'cd', 'pipeline', 'release'],
    icon: Rocket,
    color: 'text-rose-600',
  },
  // Migration & Updates
  {
    keywords: ['migration', 'upgrade', 'refactor', 'transition'],
    icon: GitBranch,
    color: 'text-cyan-600',
  },
  // Security
  {
    keywords: ['security', 'auth', 'permission', 'access', 'encryption'],
    icon: Shield,
    color: 'text-red-600',
  },
  // Performance
  {
    keywords: ['performance', 'optimization', 'speed', 'cache', 'benchmark'],
    icon: TrendingUp,
    color: 'text-emerald-600',
  },
  // Data
  {
    keywords: ['database', 'data', 'schema', 'model', 'query'],
    icon: Database,
    color: 'text-sky-600',
  },
  // Notes & Research
  {
    keywords: ['notes', 'research', 'findings', 'considerations', 'exploration'],
    icon: Lightbulb,
    color: 'text-yellow-600',
  },
  // Docs
  {
    keywords: ['doc', 'guide', 'manual', 'reference', 'readme'],
    icon: BookOpen,
    color: 'text-gray-500',
  },
  // Git
  {
    keywords: ['github', 'git', 'vcs', 'version'],
    icon: GitBranch,
    color: 'text-pink-600',
  },
];

const DEFAULT_STYLE: SubSpecStyle = {
  icon: FileText,
  color: 'text-gray-600',
};

/**
 * Determines icon and color for a sub-spec based on its filename
 */
export function getSubSpecStyle(fileName: string): SubSpecStyle {
  const lower = fileName.toLowerCase();

  for (const pattern of PATTERNS) {
    if (pattern.keywords.some(keyword => lower.includes(keyword))) {
      return {
        icon: pattern.icon,
        color: pattern.color,
      };
    }
  }

  return DEFAULT_STYLE;
}

/**
 * Formats sub-spec file name into a display name
 * Examples:
 * - "IMPLEMENTATION.md" -> "Implementation"
 * - "api-design.md" -> "Api Design"
 */
export function formatSubSpecName(fileName: string): string {
  return fileName
    .replace(/\.md$/i, '')
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
