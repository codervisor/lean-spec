/**
 * Context extraction for search matches
 */

import type { SearchMatch } from './types.js';
import { findMatchPositions } from './scoring.js';

/**
 * Extract context around a match with smart boundaries
 * 
 * @param text - Full text content
 * @param matchIndex - Index of the line/position where match occurs
 * @param queryTerms - Query terms to highlight
 * @param contextLength - Characters before/after (default: 80)
 * @returns Context text with match highlighted
 */
export function extractContext(
  text: string,
  matchIndex: number,
  queryTerms: string[],
  contextLength: number = 80
): { text: string; highlights: Array<[number, number]> } {
  const lines = text.split('\n');
  const matchLine = lines[matchIndex] || '';

  // For short lines, just return the line
  if (matchLine.length <= contextLength * 2) {
    const highlights = findMatchPositions(matchLine, queryTerms);
    return { text: matchLine, highlights };
  }

  // Find first occurrence of any query term
  const matchLineLower = matchLine.toLowerCase();
  let firstMatchPos = matchLine.length;
  
  for (const term of queryTerms) {
    const pos = matchLineLower.indexOf(term.toLowerCase());
    if (pos !== -1 && pos < firstMatchPos) {
      firstMatchPos = pos;
    }
  }

  // Extract context around the match
  const start = Math.max(0, firstMatchPos - contextLength);
  const end = Math.min(matchLine.length, firstMatchPos + contextLength);
  
  let contextText = matchLine.substring(start, end);
  
  // Add ellipsis if truncated
  if (start > 0) contextText = '...' + contextText;
  if (end < matchLine.length) contextText = contextText + '...';

  // Adjust highlight positions for context
  const highlights = findMatchPositions(contextText, queryTerms);

  return { text: contextText, highlights };
}

/**
 * Extract context with sentence boundaries
 * 
 * @param text - Full text content
 * @param matchIndex - Index where match occurs
 * @param queryTerms - Query terms to highlight
 * @param contextLength - Target characters before/after
 * @returns Context text respecting sentence boundaries
 */
export function extractSmartContext(
  text: string,
  matchIndex: number,
  queryTerms: string[],
  contextLength: number = 80
): { text: string; highlights: Array<[number, number]> } {
  const lines = text.split('\n');
  const matchLine = lines[matchIndex] || '';

  // For short content, use simple extraction
  if (matchLine.length <= contextLength * 2) {
    return extractContext(text, matchIndex, queryTerms, contextLength);
  }

  // Try to find sentence boundaries
  const matchLineLower = matchLine.toLowerCase();
  let firstMatchPos = matchLine.length;
  
  for (const term of queryTerms) {
    const pos = matchLineLower.indexOf(term.toLowerCase());
    if (pos !== -1 && pos < firstMatchPos) {
      firstMatchPos = pos;
    }
  }

  // Look for sentence boundaries (., !, ?)
  const sentenceEnd = /[.!?]\s+/g;
  let start = Math.max(0, firstMatchPos - contextLength);
  let end = Math.min(matchLine.length, firstMatchPos + contextLength);

  // Try to expand to sentence boundaries if close
  const beforeText = matchLine.substring(0, start);
  const lastSentence = beforeText.lastIndexOf('. ');
  if (lastSentence !== -1 && start - lastSentence < 20) {
    start = lastSentence + 2; // Skip ". "
  }

  const afterText = matchLine.substring(end);
  const nextSentence = afterText.indexOf('. ');
  if (nextSentence !== -1 && nextSentence < 20) {
    end = end + nextSentence + 1; // Include "."
  }

  let contextText = matchLine.substring(start, end);
  
  // Add ellipsis if truncated
  if (start > 0) contextText = '...' + contextText;
  if (end < matchLine.length) contextText = contextText + '...';

  const highlights = findMatchPositions(contextText, queryTerms);

  return { text: contextText, highlights };
}

/**
 * Deduplicate nearby matches
 * 
 * If matches are within a certain distance, keep only the best scoring one.
 * 
 * @param matches - All matches for a spec
 * @param minDistance - Minimum line distance between matches (default: 3)
 * @returns Deduplicated matches
 */
export function deduplicateMatches(
  matches: SearchMatch[],
  minDistance: number = 3
): SearchMatch[] {
  if (matches.length === 0) return matches;

  // Sort by score (descending) then by line number
  const sorted = [...matches].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.lineNumber || 0) - (b.lineNumber || 0);
  });

  const deduplicated: SearchMatch[] = [];
  const usedLines = new Set<number>();

  for (const match of sorted) {
    // Non-content fields always included
    if (match.field !== 'content') {
      deduplicated.push(match);
      continue;
    }

    // Check if too close to an existing match
    const lineNum = match.lineNumber || 0;
    let tooClose = false;

    for (let i = lineNum - minDistance; i <= lineNum + minDistance; i++) {
      if (usedLines.has(i)) {
        tooClose = true;
        break;
      }
    }

    if (!tooClose) {
      deduplicated.push(match);
      usedLines.add(lineNum);
    }
  }

  // Sort by field priority and score for final output
  return deduplicated.sort((a, b) => {
    const fieldOrder = { title: 0, name: 1, tags: 2, description: 3, content: 4 };
    const orderA = fieldOrder[a.field];
    const orderB = fieldOrder[b.field];
    
    if (orderA !== orderB) return orderA - orderB;
    return b.score - a.score;
  });
}

/**
 * Limit matches per spec
 * 
 * @param matches - All matches
 * @param maxMatches - Maximum matches to keep (default: 5)
 * @returns Limited matches (best scoring)
 */
export function limitMatches(
  matches: SearchMatch[],
  maxMatches: number = 5
): SearchMatch[] {
  if (matches.length <= maxMatches) return matches;

  // Separate by field type
  const fieldMatches: Record<string, SearchMatch[]> = {
    title: [],
    name: [],
    tags: [],
    description: [],
    content: [],
  };

  for (const match of matches) {
    fieldMatches[match.field].push(match);
  }

  // Always include non-content matches
  const nonContent: SearchMatch[] = [
    ...fieldMatches.title,
    ...fieldMatches.name,
    ...fieldMatches.tags,
    ...fieldMatches.description,
  ];

  // Fill remaining slots with best content matches
  const contentMatches = fieldMatches.content
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, maxMatches - nonContent.length));

  return [...nonContent, ...contentMatches];
}
