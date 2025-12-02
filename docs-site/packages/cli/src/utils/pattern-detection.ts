import type { LeanSpecConfig } from '../config.js';

/**
 * Detect the type of folder pattern being used
 */
export type PatternType = 'flat' | 'date-grouped' | 'custom-grouped';

export interface PatternInfo {
  type: PatternType;
  shouldGroup: boolean;
  groupExtractor?: string;
  isDateBased?: boolean;
}

/**
 * Analyze the configured pattern and determine how specs should be displayed
 * 
 * @param config - The LeanSpec configuration
 * @returns {PatternInfo} Object containing:
 *   - type: Pattern type ('flat', 'date-grouped', 'custom-grouped')
 *   - shouldGroup: Whether specs should be displayed in groups
 *   - groupExtractor: Optional group extraction pattern
 *   - isDateBased: Optional flag indicating if grouping is date-based
 */
export function detectPatternType(config: LeanSpecConfig): PatternInfo {
  const { pattern, groupExtractor } = config.structure;

  // Case 1: Explicit flat pattern
  if (pattern === 'flat') {
    return {
      type: 'flat',
      shouldGroup: false,
    };
  }

  // Case 2: Custom pattern with grouping
  if (pattern === 'custom' && groupExtractor) {
    // Detect if it's date-based grouping
    // Matches any date format in braces: {YYYYMMDD}, {YYYY-MM-DD}, {YYYY-MM}, {YYYY}, etc.
    const isDateBased = /\{YYYY[^}]*\}/.test(groupExtractor);
    
    return {
      type: isDateBased ? 'date-grouped' : 'custom-grouped',
      shouldGroup: true,
      groupExtractor,
      isDateBased,
    };
  }

  // Case 3: Legacy or unknown pattern - default to flat
  return {
    type: 'flat',
    shouldGroup: false,
  };
}

/**
 * Check if a pattern uses date-based grouping
 * 
 * @param config - The LeanSpec configuration
 * @returns true if the pattern groups specs by date
 */
export function isDateGroupedPattern(config: LeanSpecConfig): boolean {
  const info = detectPatternType(config);
  return info.type === 'date-grouped';
}

/**
 * Check if specs should be grouped when listed
 * 
 * @param config - The LeanSpec configuration
 * @returns true if specs should be displayed in groups
 */
export function shouldGroupSpecs(config: LeanSpecConfig): boolean {
  const info = detectPatternType(config);
  return info.shouldGroup;
}
