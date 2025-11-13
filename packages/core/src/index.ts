/**
 * @leanspec/core - Platform-agnostic spec parsing and validation
 * 
 * This package provides core functionality for parsing and validating LeanSpec
 * specifications without dependencies on Node.js file system operations.
 * 
 * Use with adapters:
 * - FileSystemStorage (Node.js fs) - in @leanspec/cli
 * - GitHubStorage (Octokit API) - in @leanspec/web
 */

// Types
export * from './types/index.js';

// Parsers
export * from './parsers/frontmatter.js';

// Validators
export {
  FrontmatterValidator,
  type FrontmatterOptions,
} from './validators/frontmatter.js';

export {
  StructureValidator,
  type StructureOptions,
} from './validators/structure.js';

export {
  LineCountValidator,
  type LineCountOptions,
} from './validators/line-count.js';

export {
  ComplexityValidator,
  type ComplexityOptions,
  type ComplexityMetrics,
  type ComplexityScore,
} from './validators/complexity.js';

// Note: SubSpecValidator requires file system operations
// It will remain in the CLI package for now

// Utilities
export { countSpecsByStatusAndPriority } from './utils/spec-stats.js';
export { generateInsights } from './utils/insights.js';
export {
  TokenCounter,
  countTokens,
  type TokenCount,
  type TokenCounterOptions,
} from './utils/token-counter.js';

// Search
export {
  searchSpecs,
  FIELD_WEIGHTS,
  type SearchOptions,
  type SearchMatch,
  type SearchResult,
  type SearchResultSpec,
  type SearchResponse,
  type SearchMetadata,
  type SearchableSpec,
} from './search/index.js';
