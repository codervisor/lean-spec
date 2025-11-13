/**
 * Core search engine implementation
 */

import type {
  SearchOptions,
  SearchResult,
  SearchResponse,
  SearchMatch,
  SearchResultSpec,
} from './types.js';
import {
  calculateMatchScore,
  calculateSpecScore,
  containsAllTerms,
  countOccurrences,
  findMatchPositions,
} from './scoring.js';
import {
  extractSmartContext,
  deduplicateMatches,
  limitMatches,
} from './context.js';

/**
 * Spec data structure for search
 */
export interface SearchableSpec {
  path: string;
  name: string;
  status: string;
  priority?: string;
  tags?: string[];
  title?: string;
  description?: string;
  content?: string;
}

/**
 * Search specs with intelligent relevance ranking
 * 
 * @param query - Search query string
 * @param specs - Specs to search
 * @param options - Search options
 * @returns Search results with relevance scoring
 */
export function searchSpecs(
  query: string,
  specs: SearchableSpec[],
  options: SearchOptions = {}
): SearchResponse {
  const startTime = Date.now();

  // Parse query into terms (split on whitespace)
  const queryTerms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(term => term.length > 0);

  if (queryTerms.length === 0) {
    return {
      results: [],
      metadata: {
        totalResults: 0,
        searchTime: Date.now() - startTime,
        query,
        specsSearched: specs.length,
      },
    };
  }

  // Search options
  const maxMatchesPerSpec = options.maxMatchesPerSpec || 5;
  const contextLength = options.contextLength || 80;

  // Search each spec
  const results: SearchResult[] = [];

  for (const spec of specs) {
    const matches = searchSpec(spec, queryTerms, contextLength);
    
    if (matches.length > 0) {
      // Deduplicate and limit matches
      let processedMatches = deduplicateMatches(matches, 3);
      processedMatches = limitMatches(processedMatches, maxMatchesPerSpec);

      // Calculate overall score
      const score = calculateSpecScore(processedMatches);

      results.push({
        spec: specToSearchResult(spec),
        score,
        totalMatches: matches.length,
        matches: processedMatches,
      });
    }
  }

  // Sort by relevance score (descending)
  results.sort((a, b) => b.score - a.score);

  return {
    results,
    metadata: {
      totalResults: results.length,
      searchTime: Date.now() - startTime,
      query,
      specsSearched: specs.length,
    },
  };
}

/**
 * Search a single spec for query terms
 */
function searchSpec(
  spec: SearchableSpec,
  queryTerms: string[],
  contextLength: number
): SearchMatch[] {
  const matches: SearchMatch[] = [];

  // Search title
  if (spec.title && containsAllTerms(spec.title, queryTerms)) {
    const occurrences = countOccurrences(spec.title, queryTerms);
    const highlights = findMatchPositions(spec.title, queryTerms);
    const score = calculateMatchScore(
      { field: 'title', text: spec.title, occurrences },
      queryTerms,
      1,
      0
    );

    matches.push({
      field: 'title',
      text: spec.title,
      score,
      highlights,
      occurrences,
    });
  }

  // Search name
  if (spec.name && containsAllTerms(spec.name, queryTerms)) {
    const occurrences = countOccurrences(spec.name, queryTerms);
    const highlights = findMatchPositions(spec.name, queryTerms);
    const score = calculateMatchScore(
      { field: 'name', text: spec.name, occurrences },
      queryTerms,
      1,
      0
    );

    matches.push({
      field: 'name',
      text: spec.name,
      score,
      highlights,
      occurrences,
    });
  }

  // Search tags
  if (spec.tags && spec.tags.length > 0) {
    for (const tag of spec.tags) {
      if (containsAllTerms(tag, queryTerms)) {
        const occurrences = countOccurrences(tag, queryTerms);
        const highlights = findMatchPositions(tag, queryTerms);
        const score = calculateMatchScore(
          { field: 'tags', text: tag, occurrences },
          queryTerms,
          spec.tags.length,
          spec.tags.indexOf(tag)
        );

        matches.push({
          field: 'tags',
          text: tag,
          score,
          highlights,
          occurrences,
        });
      }
    }
  }

  // Search description
  if (spec.description && containsAllTerms(spec.description, queryTerms)) {
    const occurrences = countOccurrences(spec.description, queryTerms);
    const highlights = findMatchPositions(spec.description, queryTerms);
    const score = calculateMatchScore(
      { field: 'description', text: spec.description, occurrences },
      queryTerms,
      1,
      0
    );

    matches.push({
      field: 'description',
      text: spec.description,
      score,
      highlights,
      occurrences,
    });
  }

  // Search content
  if (spec.content) {
    const contentMatches = searchContent(
      spec.content,
      queryTerms,
      contextLength
    );
    matches.push(...contentMatches);
  }

  return matches;
}

/**
 * Search content with context extraction
 */
function searchContent(
  content: string,
  queryTerms: string[],
  contextLength: number
): SearchMatch[] {
  const matches: SearchMatch[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (containsAllTerms(line, queryTerms)) {
      const occurrences = countOccurrences(line, queryTerms);
      const { text, highlights } = extractSmartContext(
        content,
        i,
        queryTerms,
        contextLength
      );

      const score = calculateMatchScore(
        { field: 'content', text: line, occurrences },
        queryTerms,
        lines.length,
        i
      );

      matches.push({
        field: 'content',
        text,
        lineNumber: i + 1, // 1-based line numbers
        score,
        highlights,
        occurrences,
      });
    }
  }

  return matches;
}

/**
 * Convert spec to search result format
 */
function specToSearchResult(spec: SearchableSpec): SearchResultSpec {
  return {
    name: spec.name,
    path: spec.path,
    status: spec.status,
    priority: spec.priority,
    tags: spec.tags,
    title: spec.title,
    description: spec.description,
  };
}
