/**
 * Search module - Intelligent relevance-ranked search for specs
 * 
 * @example
 * ```typescript
 * import { searchSpecs } from '@leanspec/core/search';
 * 
 * const results = searchSpecs('authentication flow', specs, {
 *   maxMatchesPerSpec: 5,
 *   contextLength: 80,
 * });
 * 
 * console.log(`Found ${results.results.length} specs in ${results.metadata.searchTime}ms`);
 * ```
 */

export { searchSpecs, specContainsAllTerms } from './engine.js';
export type {
  SearchOptions,
  SearchMatch,
  SearchResult,
  SearchResultSpec,
  SearchResponse,
  SearchMetadata,
} from './types.js';
export type { SearchableSpec } from './engine.js';
export { FIELD_WEIGHTS, containsAllTerms, containsAnyTerm } from './scoring.js';
