/**
 * Search module types
 */

export interface SearchOptions {
  /** Maximum number of matches to return per spec */
  maxMatchesPerSpec?: number;
  /** Maximum context length (characters) before/after match */
  contextLength?: number;
  /** Whether to include archived specs in search */
  includeArchived?: boolean;
}

export interface SearchMatch {
  /** Field where the match was found */
  field: 'title' | 'name' | 'tags' | 'description' | 'content';
  /** Matched text with surrounding context */
  text: string;
  /** Line number (for content matches) */
  lineNumber?: number;
  /** Match relevance score (0-100) */
  score: number;
  /** Character ranges of highlights within text */
  highlights: Array<[number, number]>;
  /** Number of times query appears in this match */
  occurrences: number;
}

export interface SearchResultSpec {
  /** Spec name (e.g., "042-oauth2-implementation") */
  name: string;
  /** Spec path */
  path: string;
  /** Spec status */
  status: string;
  /** Spec priority */
  priority?: string;
  /** Spec tags */
  tags?: string[];
  /** Spec title */
  title?: string;
  /** Spec description */
  description?: string;
}

export interface SearchResult {
  /** The matching spec */
  spec: SearchResultSpec;
  /** Overall relevance score (0-100) */
  score: number;
  /** Total number of matches found */
  totalMatches: number;
  /** Individual matches with context */
  matches: SearchMatch[];
}

export interface SearchMetadata {
  /** Total number of results */
  totalResults: number;
  /** Search execution time in milliseconds */
  searchTime: number;
  /** Original search query */
  query: string;
  /** Number of specs searched */
  specsSearched: number;
}

export interface SearchResponse {
  /** Search results sorted by relevance */
  results: SearchResult[];
  /** Search metadata */
  metadata: SearchMetadata;
}
