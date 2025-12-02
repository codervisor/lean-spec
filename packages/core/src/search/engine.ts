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
  containsAnyTerm,
  countOccurrences,
  findMatchPositions,
} from './scoring.js';
import {
  extractSmartContext,
  deduplicateMatches,
  limitMatches,
} from './context.js';
import {
  parseQuery,
  fuzzyMatch,
  type ParsedQuery,
  type FieldFilter,
  type DateFilter,
  type ASTNode,
} from './query-parser.js';

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
  /** Created date (ISO string) */
  created?: string;
  /** Updated date (ISO string) */
  updated?: string;
  /** Assignee */
  assignee?: string;
}

/**
 * Check if spec contains all query terms across any combination of fields
 * 
 * This enables cross-field matching: term A can be in title, term B in content
 * 
 * @param spec - Spec to check
 * @param queryTerms - Terms that must all be present
 * @returns True if all terms are found somewhere in the spec, false for empty queryTerms
 */
export function specContainsAllTerms(spec: SearchableSpec, queryTerms: string[]): boolean {
  // Return false for empty query to match main search function behavior
  if (queryTerms.length === 0) {
    return false;
  }
  
  // Combine all searchable text from the spec
  const allText = [
    spec.title || '',
    spec.name || '',
    spec.tags?.join(' ') || '',
    spec.description || '',
    spec.content || '',
  ].join(' ').toLowerCase();
  
  return queryTerms.every(term => allText.includes(term));
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
    // First check: does the spec contain all query terms (across any fields)?
    if (!specContainsAllTerms(spec, queryTerms)) {
      continue; // Skip specs that don't have all terms somewhere
    }
    
    // Collect matches from fields that contain ANY query term
    // This provides context/highlighting even for partial field matches
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
 * 
 * Returns matches from fields containing ANY query terms (for context/highlighting)
 * when doing cross-field search where spec-level matching is already confirmed
 */
function searchSpec(
  spec: SearchableSpec,
  queryTerms: string[],
  contextLength: number
): SearchMatch[] {
  const matches: SearchMatch[] = [];

  // Search title - include if it has ANY query terms
  if (spec.title && containsAnyTerm(spec.title, queryTerms)) {
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

  // Search name - include if it has ANY query terms
  if (spec.name && containsAnyTerm(spec.name, queryTerms)) {
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

  // Search tags - include tags that have ANY query terms
  if (spec.tags && spec.tags.length > 0) {
    for (const tag of spec.tags) {
      if (containsAnyTerm(tag, queryTerms)) {
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

  // Search description - include if it has ANY query terms
  if (spec.description && containsAnyTerm(spec.description, queryTerms)) {
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
 * 
 * Returns matches from lines containing ANY query terms
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
    
    // Include lines with ANY query terms (not all terms)
    if (containsAnyTerm(line, queryTerms)) {
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

/**
 * Check if a spec matches field filters
 */
function specMatchesFieldFilters(spec: SearchableSpec, filters: FieldFilter[]): boolean {
  for (const filter of filters) {
    const field = filter.field;
    const filterValue = filter.value.toLowerCase();

    switch (field) {
      case 'status':
        if (spec.status.toLowerCase() !== filterValue) return false;
        break;
      case 'tag':
      case 'tags':
        if (!spec.tags?.some(tag => tag.toLowerCase() === filterValue)) return false;
        break;
      case 'priority':
        if (spec.priority?.toLowerCase() !== filterValue) return false;
        break;
      case 'assignee':
        if (spec.assignee?.toLowerCase() !== filterValue) return false;
        break;
      case 'title':
        if (!spec.title?.toLowerCase().includes(filterValue)) return false;
        break;
      case 'name':
        if (!spec.name.toLowerCase().includes(filterValue)) return false;
        break;
      // Date filters are handled separately
      case 'created':
      case 'updated':
        break;
    }
  }
  return true;
}

/**
 * Check if a spec matches date filters
 */
function specMatchesDateFilters(spec: SearchableSpec, filters: DateFilter[]): boolean {
  for (const filter of filters) {
    const field = filter.field;
    const specDate = field === 'created' ? spec.created : spec.updated;
    
    if (!specDate) return false;
    
    // Normalize dates for comparison (just the date part)
    const specDateStr = specDate.substring(0, 10);
    const filterDateStr = filter.value.substring(0, 10);
    
    switch (filter.operator) {
      case '>':
        if (specDateStr <= filterDateStr) return false;
        break;
      case '>=':
        if (specDateStr < filterDateStr) return false;
        break;
      case '<':
        if (specDateStr >= filterDateStr) return false;
        break;
      case '<=':
        if (specDateStr > filterDateStr) return false;
        break;
      case '=':
        if (!specDateStr.startsWith(filterDateStr)) return false;
        break;
      case 'range':
        if (filter.endValue) {
          const endDateStr = filter.endValue.substring(0, 10);
          if (specDateStr < filterDateStr || specDateStr > endDateStr) return false;
        }
        break;
    }
  }
  return true;
}

/**
 * Evaluate AST against a spec (for boolean logic)
 */
function evaluateAST(node: ASTNode | null, spec: SearchableSpec): boolean {
  if (!node) return true;

  switch (node.type) {
    case 'AND':
      return evaluateAST(node.left!, spec) && evaluateAST(node.right!, spec);
    case 'OR':
      return evaluateAST(node.left!, spec) || evaluateAST(node.right!, spec);
    case 'NOT':
      return !evaluateAST(node.left!, spec);
    case 'TERM':
    case 'PHRASE':
      return specContainsAllTerms(spec, [node.value!.toLowerCase()]);
    case 'FUZZY':
      return specContainsFuzzyTerm(spec, node.value!);
    case 'FIELD':
      return specMatchesFieldFilters(spec, [
        { field: node.field!, value: node.value!, exact: true },
      ]);
    default:
      return true;
  }
}

/**
 * Check if a spec contains a fuzzy term
 */
function specContainsFuzzyTerm(spec: SearchableSpec, term: string): boolean {
  const allText = [
    spec.title || '',
    spec.name || '',
    spec.tags?.join(' ') || '',
    spec.description || '',
    spec.content || '',
  ].join(' ');

  return fuzzyMatch(term, allText);
}

/**
 * Advanced search with query syntax support
 * 
 * @param query - Search query string with optional advanced syntax
 * @param specs - Specs to search
 * @param options - Search options
 * @returns Search results with relevance scoring
 */
export function advancedSearchSpecs(
  query: string,
  specs: SearchableSpec[],
  options: SearchOptions = {}
): SearchResponse {
  const startTime = Date.now();
  const parsedQuery = parseQuery(query);

  // If no advanced syntax, delegate to regular search
  if (!parsedQuery.hasAdvancedSyntax && parsedQuery.errors.length === 0) {
    return searchSpecs(query, specs, options);
  }

  // Search options
  const maxMatchesPerSpec = options.maxMatchesPerSpec || 5;
  const contextLength = options.contextLength || 80;

  // Build combined query terms for highlighting (excluding field filters)
  const queryTerms = [
    ...parsedQuery.terms,
    ...parsedQuery.fuzzyTerms,
  ];

  // Filter by field and date filters first
  const nonDateFieldFilters = parsedQuery.fields.filter(
    f => f.field !== 'created' && f.field !== 'updated'
  );

  // Search each spec
  const results: SearchResult[] = [];

  for (const spec of specs) {
    // Check field filters
    if (!specMatchesFieldFilters(spec, nonDateFieldFilters)) {
      continue;
    }

    // Check date filters
    if (!specMatchesDateFilters(spec, parsedQuery.dateFilters)) {
      continue;
    }

    // Evaluate AST for boolean logic
    if (parsedQuery.ast && !evaluateAST(parsedQuery.ast, spec)) {
      continue;
    }

    // For specs that match the AST, collect matches for context
    const matches = queryTerms.length > 0
      ? searchSpec(spec, queryTerms, contextLength)
      : [];

    // Include spec if it matched the AST (already verified above)
    // Even if no highlighting matches found, the spec matched the query criteria
    let processedMatches = deduplicateMatches(matches, 3);
    processedMatches = limitMatches(processedMatches, maxMatchesPerSpec);

    const score = matches.length > 0 ? calculateSpecScore(processedMatches) : 50;

    results.push({
      spec: specToSearchResult(spec),
      score,
      totalMatches: matches.length || 1,
      matches: processedMatches,
    });
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
 * Search specs with intelligent relevance ranking, with support for advanced query syntax
 * 
 * Automatically detects advanced syntax (AND, OR, NOT, field:value, etc.) and uses
 * the appropriate search method.
 * 
 * @param query - Search query string (supports advanced syntax)
 * @param specs - Specs to search
 * @param options - Search options
 * @returns Search results with relevance scoring
 */
export function searchSpecsAdvanced(
  query: string,
  specs: SearchableSpec[],
  options: SearchOptions = {}
): SearchResponse {
  return advancedSearchSpecs(query, specs, options);
}
