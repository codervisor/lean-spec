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
 * 
 * @example Advanced query syntax
 * ```typescript
 * import { advancedSearchSpecs } from '@leanspec/core/search';
 * 
 * // Boolean operators
 * const results = advancedSearchSpecs('api AND authentication', specs);
 * const results2 = advancedSearchSpecs('frontend OR backend', specs);
 * const results3 = advancedSearchSpecs('api NOT deprecated', specs);
 * 
 * // Field-specific search
 * const results4 = advancedSearchSpecs('status:in-progress tag:api', specs);
 * 
 * // Date range filters
 * const results5 = advancedSearchSpecs('created:>2025-11-01', specs);
 * 
 * // Fuzzy matching
 * const results6 = advancedSearchSpecs('authetication~', specs);
 * ```
 */

export { searchSpecs, specContainsAllTerms, advancedSearchSpecs, searchSpecsAdvanced } from './engine.js';
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

// Query parser exports
export {
  parseQuery,
  tokenize,
  levenshteinDistance,
  fuzzyMatch,
  getSearchSyntaxHelp,
  SUPPORTED_FIELDS,
  type ParsedQuery,
  type FieldFilter,
  type DateFilter,
  type ASTNode,
  type Token,
  type TokenType,
  type ASTNodeType,
  type SupportedField,
} from './query-parser.js';
