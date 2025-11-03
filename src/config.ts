import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface LeanSpecConfig {
  template: string;
  templates?: Record<string, string>; // Maps template name to filename
  specsDir: string;
  autoCheck?: boolean; // Enable/disable auto-check for sequence conflicts (default: true)
  structure: {
    pattern: 'flat' | 'custom' | string; // 'flat' or 'custom', or legacy pattern string
    dateFormat: string;
    sequenceDigits: number;
    defaultFile: string;
    prefix?: string; // For flat pattern: "{YYYYMMDD}-" or "spec-" (optional, default: empty for global numbering)
    groupExtractor?: string; // For custom pattern: "{YYYYMMDD}" or "milestone-{milestone}"
    groupFallback?: string; // Fallback folder if field missing (only for non-date extractors)
  };
  features?: {
    aiAgents?: boolean;
    examples?: boolean;
    collaboration?: boolean;
    compliance?: boolean;
    approvals?: boolean;
    apiDocs?: boolean;
  };
  frontmatter?: {
    required?: string[];
    optional?: string[];
    custom?: Record<string, 'string' | 'number' | 'boolean' | 'array'>;
  };
  variables?: Record<string, string>;
}

const DEFAULT_CONFIG: LeanSpecConfig = {
  template: 'spec-template.md',
  templates: {
    default: 'spec-template.md',
  },
  specsDir: 'specs',
  structure: {
    pattern: 'flat', // Default to flat for new projects
    prefix: '', // No prefix by default - global sequence numbers only
    dateFormat: 'YYYYMMDD',
    sequenceDigits: 3,
    defaultFile: 'README.md',
  },
  features: {
    aiAgents: true,
    examples: true,
  },
};

export async function loadConfig(cwd: string = process.cwd()): Promise<LeanSpecConfig> {
  const configPath = path.join(cwd, '.lspec', 'config.json');

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const userConfig = JSON.parse(content);
    const merged = { ...DEFAULT_CONFIG, ...userConfig };
    
    // Normalize legacy pattern format
    normalizeLegacyPattern(merged);
    
    return merged;
  } catch {
    // No config file, use defaults
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(
  config: LeanSpecConfig,
  cwd: string = process.cwd(),
): Promise<void> {
  const configDir = path.join(cwd, '.lspec');
  const configPath = path.join(configDir, 'config.json');

  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

export function getToday(format: string = 'YYYYMMDD'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  switch (format) {
    case 'YYYYMMDD':
      return `${year}${month}${day}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'YYYY-MM':
      return `${year}-${month}`;
    case 'YYYY/MM':
      return `${year}/${month}`;
    case 'YYYY':
      return String(year);
    case 'MM':
      return month;
    case 'DD':
      return day;
    default:
      return `${year}${month}${day}`;
  }
}

/**
 * Detect if a config uses legacy pattern format and convert it
 */
export function normalizeLegacyPattern(config: LeanSpecConfig): void {
  const pattern = config.structure.pattern;
  
  // If pattern contains {date}/{seq}-{name}/, convert to custom with date grouping
  if (pattern && pattern.includes('{date}') && pattern.includes('{seq}') && pattern.includes('{name}')) {
    config.structure.pattern = 'custom';
    config.structure.groupExtractor = `{${config.structure.dateFormat}}`;
  }
}

/**
 * Resolve prefix string for flat pattern (e.g., "{YYYYMMDD}-" becomes "20251103-")
 */
export function resolvePrefix(
  prefix: string,
  dateFormat: string = 'YYYYMMDD'
): string {
  const dateReplacements: Record<string, () => string> = {
    '{YYYYMMDD}': () => getToday('YYYYMMDD'),
    '{YYYY-MM-DD}': () => getToday('YYYY-MM-DD'),
    '{YYYY-MM}': () => getToday('YYYY-MM'),
    '{YYYY}': () => getToday('YYYY'),
    '{MM}': () => getToday('MM'),
    '{DD}': () => getToday('DD'),
  };

  let result = prefix;
  for (const [pattern, fn] of Object.entries(dateReplacements)) {
    result = result.replace(pattern, fn());
  }

  return result;
}

/**
 * Extract group folder from extractor pattern
 */
export function extractGroup(
  extractor: string,
  dateFormat: string = 'YYYYMMDD',
  fields?: Record<string, unknown>,
  fallback?: string
): string {
  const dateReplacements: Record<string, () => string> = {
    '{YYYYMMDD}': () => getToday('YYYYMMDD'),
    '{YYYY-MM-DD}': () => getToday('YYYY-MM-DD'),
    '{YYYY-MM}': () => getToday('YYYY-MM'),
    '{YYYY}': () => getToday('YYYY'),
    '{MM}': () => getToday('MM'),
    '{DD}': () => getToday('DD'),
  };

  let result = extractor;

  // Replace date functions first
  for (const [pattern, fn] of Object.entries(dateReplacements)) {
    result = result.replace(pattern, fn());
  }

  // Replace frontmatter fields: {fieldname}
  const fieldMatches = result.match(/\{([^}]+)\}/g);
  if (fieldMatches) {
    for (const match of fieldMatches) {
      const fieldName = match.slice(1, -1); // Remove { }
      const fieldValue = fields?.[fieldName];

      if (fieldValue === undefined) {
        if (!fallback) {
          throw new Error(`Custom field '${fieldName}' required but not provided. Set structure.groupFallback in config or provide --field ${fieldName}=<value>`);
        }
        return fallback;
      }

      result = result.replace(match, String(fieldValue));
    }
  }

  return result;
}
