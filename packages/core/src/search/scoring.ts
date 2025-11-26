/**
 * Relevance scoring algorithms for search results
 */

import type { SearchMatch } from './types.js';

/**
 * Field weights for scoring (higher = more relevant)
 */
export const FIELD_WEIGHTS = {
  title: 100,
  name: 70,
  tags: 70,
  description: 50,
  content: 10,
} as const;

/**
 * Calculate relevance score for a match
 * 
 * Scoring factors:
 * - Field weight (title > name > tags > description > content)
 * - Exact word match bonus (2x)
 * - Position bonus (earlier = more relevant)
 * - Frequency penalty (many matches = less specific)
 * 
 * @param match - The search match to score
 * @param queryTerms - Individual query terms
 * @param totalMatches - Total matches found in the field
 * @param matchPosition - Position of this match (0-based)
 * @returns Score between 0-100
 */
export function calculateMatchScore(
  match: Pick<SearchMatch, 'field' | 'text' | 'occurrences'>,
  queryTerms: string[],
  totalMatches: number,
  matchPosition: number
): number {
  // Start with field weight
  let score = FIELD_WEIGHTS[match.field];

  // Exact word match bonus (2x)
  const textLower = match.text.toLowerCase();
  const hasExactMatch = queryTerms.some(term => {
    // Check for word boundaries
    const regex = new RegExp(`\\b${escapeRegex(term)}\\b`, 'i');
    return regex.test(match.text);
  });
  
  if (hasExactMatch) {
    score *= 2;
  }

  // Position bonus (first match is 1.5x, decreases linearly)
  const positionBonus = Math.max(1.0, 1.5 - (matchPosition * 0.1));
  score *= positionBonus;

  // Frequency penalty (many matches = less specific)
  // Cap at 3 to avoid over-penalizing
  const frequencyFactor = Math.min(1.0, 3.0 / totalMatches);
  score *= frequencyFactor;

  // Normalize to 0-100 scale (multiply by 10 to get reasonable range)
  return Math.min(100, score * 10);
}

/**
 * Calculate overall relevance score for a spec
 * 
 * Uses the highest scoring match from each field type,
 * weighted by field importance.
 * 
 * @param matches - All matches for the spec
 * @returns Overall score between 0-100
 */
export function calculateSpecScore(matches: SearchMatch[]): number {
  if (matches.length === 0) return 0;

  // Group matches by field
  const fieldScores: Record<string, number> = {};
  
  for (const match of matches) {
    const field = match.field;
    const currentScore = fieldScores[field] || 0;
    fieldScores[field] = Math.max(currentScore, match.score);
  }

  // Calculate weighted average of best scores per field
  let totalScore = 0;
  let totalWeight = 0;

  for (const [field, score] of Object.entries(fieldScores)) {
    const weight = FIELD_WEIGHTS[field as keyof typeof FIELD_WEIGHTS] || 1;
    totalScore += score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
}

/**
 * Check if text contains all query terms (AND logic)
 * 
 * @param text - Text to search
 * @param queryTerms - Terms to find
 * @returns True if all terms are found
 */
export function containsAllTerms(text: string, queryTerms: string[]): boolean {
  const textLower = text.toLowerCase();
  return queryTerms.every(term => textLower.includes(term));
}

/**
 * Check if text contains any query term (OR logic)
 * 
 * @param text - Text to search
 * @param queryTerms - Terms to find
 * @returns True if any term is found
 */
export function containsAnyTerm(text: string, queryTerms: string[]): boolean {
  const textLower = text.toLowerCase();
  return queryTerms.some(term => textLower.includes(term));
}

/**
 * Count occurrences of query terms in text
 * 
 * @param text - Text to search
 * @param queryTerms - Terms to count
 * @returns Number of occurrences
 */
export function countOccurrences(text: string, queryTerms: string[]): number {
  const textLower = text.toLowerCase();
  let count = 0;
  
  for (const term of queryTerms) {
    const regex = new RegExp(escapeRegex(term), 'gi');
    const matches = textLower.match(regex);
    count += matches ? matches.length : 0;
  }
  
  return count;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find all match positions in text for query terms
 * 
 * @param text - Text to search
 * @param queryTerms - Terms to find
 * @returns Array of [start, end] positions
 */
export function findMatchPositions(
  text: string,
  queryTerms: string[]
): Array<[number, number]> {
  const positions: Array<[number, number]> = [];
  const textLower = text.toLowerCase();

  for (const term of queryTerms) {
    const termLower = term.toLowerCase();
    let index = 0;

    while ((index = textLower.indexOf(termLower, index)) !== -1) {
      positions.push([index, index + term.length]);
      index += term.length;
    }
  }

  // Sort by position and merge overlapping ranges
  positions.sort((a, b) => a[0] - b[0]);
  
  const merged: Array<[number, number]> = [];
  for (const pos of positions) {
    if (merged.length === 0) {
      merged.push(pos);
    } else {
      const last = merged[merged.length - 1];
      if (pos[0] <= last[1]) {
        // Overlapping, merge
        last[1] = Math.max(last[1], pos[1]);
      } else {
        merged.push(pos);
      }
    }
  }

  return merged;
}
