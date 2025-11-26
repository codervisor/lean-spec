/**
 * Advanced query parser for search
 * 
 * Supports:
 * - Boolean operators: AND, OR, NOT
 * - Field-specific search: status:in-progress, tag:api, priority:high
 * - Date range filters: created:>2025-11-01, created:2025-11-01..2025-11-15
 * - Fuzzy matching: term~
 * - Quoted phrases: "exact phrase"
 */

/**
 * Token types for the query lexer
 */
export type TokenType =
  | 'TERM'
  | 'PHRASE'
  | 'FIELD'
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'LPAREN'
  | 'RPAREN'
  | 'FUZZY'
  | 'EOF';

/**
 * A token from the lexer
 */
export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

/**
 * AST node types
 */
export type ASTNodeType = 'AND' | 'OR' | 'NOT' | 'TERM' | 'PHRASE' | 'FIELD' | 'FUZZY';

/**
 * Abstract Syntax Tree node
 */
export interface ASTNode {
  type: ASTNodeType;
  value?: string;
  field?: string;
  left?: ASTNode;
  right?: ASTNode;
  children?: ASTNode[];
}

/**
 * Parsed query result
 */
export interface ParsedQuery {
  ast: ASTNode | null;
  /** Plain text terms for simple matching */
  terms: string[];
  /** Field filters extracted from query */
  fields: FieldFilter[];
  /** Date range filters */
  dateFilters: DateFilter[];
  /** Fuzzy terms */
  fuzzyTerms: string[];
  /** Whether the query has advanced syntax */
  hasAdvancedSyntax: boolean;
  /** Original query string */
  originalQuery: string;
  /** Parse errors if any */
  errors: string[];
}

/**
 * Field filter (e.g., status:in-progress)
 */
export interface FieldFilter {
  field: string;
  value: string;
  /** Whether to match exactly or as substring */
  exact: boolean;
}

/**
 * Date range filter
 */
export interface DateFilter {
  field: string;
  operator: '>' | '<' | '>=' | '<=' | '=' | 'range';
  value: string;
  endValue?: string; // For range queries
}

/**
 * Supported field prefixes for field-specific search
 */
export const SUPPORTED_FIELDS = [
  'status',
  'tag',
  'tags',
  'priority',
  'assignee',
  'title',
  'name',
  'created',
  'updated',
] as const;

export type SupportedField = (typeof SUPPORTED_FIELDS)[number];

/**
 * Tokenize a query string
 */
export function tokenize(query: string): Token[] {
  const tokens: Token[] = [];
  let position = 0;

  while (position < query.length) {
    // Skip whitespace
    if (/\s/.test(query[position])) {
      position++;
      continue;
    }

    // Quoted phrase
    if (query[position] === '"') {
      const start = position;
      position++; // Skip opening quote
      let phrase = '';
      while (position < query.length && query[position] !== '"') {
        phrase += query[position];
        position++;
      }
      position++; // Skip closing quote
      tokens.push({ type: 'PHRASE', value: phrase, position: start });
      continue;
    }

    // Parentheses
    if (query[position] === '(') {
      tokens.push({ type: 'LPAREN', value: '(', position });
      position++;
      continue;
    }
    if (query[position] === ')') {
      tokens.push({ type: 'RPAREN', value: ')', position });
      position++;
      continue;
    }

    // Word or operator
    const start = position;
    let word = '';
    while (position < query.length && !/[\s()"]/.test(query[position])) {
      word += query[position];
      position++;
    }

    if (word.length === 0) continue;

    // Check for boolean operators (case-insensitive)
    const upperWord = word.toUpperCase();
    if (upperWord === 'AND') {
      tokens.push({ type: 'AND', value: word, position: start });
      continue;
    }
    if (upperWord === 'OR') {
      tokens.push({ type: 'OR', value: word, position: start });
      continue;
    }
    if (upperWord === 'NOT') {
      tokens.push({ type: 'NOT', value: word, position: start });
      continue;
    }

    // Check for field prefix (e.g., status:planned)
    const colonIndex = word.indexOf(':');
    if (colonIndex > 0) {
      const fieldName = word.substring(0, colonIndex).toLowerCase();
      if (SUPPORTED_FIELDS.includes(fieldName as SupportedField)) {
        tokens.push({ type: 'FIELD', value: word, position: start });
        continue;
      }
    }

    // Check for fuzzy suffix (e.g., term~)
    if (word.endsWith('~')) {
      tokens.push({ type: 'FUZZY', value: word.slice(0, -1), position: start });
      continue;
    }

    // Regular term
    tokens.push({ type: 'TERM', value: word, position: start });
  }

  tokens.push({ type: 'EOF', value: '', position: query.length });
  return tokens;
}

/**
 * Parser for query tokens
 */
class QueryParser {
  private tokens: Token[];
  private current = 0;
  private errors: string[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): { ast: ASTNode | null; errors: string[] } {
    if (this.tokens.length <= 1) {
      // Only EOF
      return { ast: null, errors: [] };
    }

    try {
      const ast = this.parseExpression();
      return { ast, errors: this.errors };
    } catch {
      return { ast: null, errors: this.errors };
    }
  }

  private parseExpression(): ASTNode | null {
    return this.parseOr();
  }

  private parseOr(): ASTNode | null {
    let left = this.parseAnd();
    if (!left) return null;

    while (this.check('OR')) {
      this.advance();
      const right = this.parseAnd();
      if (!right) {
        this.errors.push('Expected term after OR');
        break;
      }
      left = { type: 'OR', left, right };
    }

    return left;
  }

  private parseAnd(): ASTNode | null {
    let left = this.parseNot();
    if (!left) return null;

    // AND can be explicit or implicit (terms next to each other)
    while (this.check('AND') || this.isTermStart()) {
      if (this.check('AND')) {
        this.advance();
      }
      const right = this.parseNot();
      if (!right) break;
      left = { type: 'AND', left, right };
    }

    return left;
  }

  private parseNot(): ASTNode | null {
    if (this.check('NOT')) {
      this.advance();
      const operand = this.parsePrimary();
      if (!operand) {
        this.errors.push('Expected term after NOT');
        return null;
      }
      return { type: 'NOT', left: operand };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode | null {
    const token = this.peek();

    if (token.type === 'LPAREN') {
      this.advance();
      const expr = this.parseExpression();
      if (!this.check('RPAREN')) {
        this.errors.push('Expected closing parenthesis');
      } else {
        this.advance();
      }
      return expr;
    }

    if (token.type === 'TERM') {
      this.advance();
      return { type: 'TERM', value: token.value };
    }

    if (token.type === 'PHRASE') {
      this.advance();
      return { type: 'PHRASE', value: token.value };
    }

    if (token.type === 'FIELD') {
      this.advance();
      const colonIndex = token.value.indexOf(':');
      const field = token.value.substring(0, colonIndex).toLowerCase();
      const value = token.value.substring(colonIndex + 1);
      return { type: 'FIELD', field, value };
    }

    if (token.type === 'FUZZY') {
      this.advance();
      return { type: 'FUZZY', value: token.value };
    }

    return null;
  }

  private isTermStart(): boolean {
    const type = this.peek().type;
    return (
      type === 'TERM' ||
      type === 'PHRASE' ||
      type === 'FIELD' ||
      type === 'FUZZY' ||
      type === 'LPAREN' ||
      type === 'NOT'
    );
  }

  private peek(): Token {
    return this.tokens[this.current] || { type: 'EOF', value: '', position: 0 };
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.tokens[this.current - 1];
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }
}

/**
 * Extract field filters from AST
 */
function extractFieldFilters(ast: ASTNode | null): FieldFilter[] {
  if (!ast) return [];

  const filters: FieldFilter[] = [];

  function traverse(node: ASTNode): void {
    if (node.type === 'FIELD' && node.field && node.value !== undefined) {
      filters.push({
        field: node.field,
        value: node.value,
        exact: true,
      });
    }
    if (node.left) traverse(node.left);
    if (node.right) traverse(node.right);
    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  traverse(ast);
  return filters;
}

/**
 * Extract date filters from field filters
 */
function extractDateFilters(fieldFilters: FieldFilter[]): DateFilter[] {
  const dateFields = ['created', 'updated'];
  const dateFilters: DateFilter[] = [];

  for (const filter of fieldFilters) {
    if (!dateFields.includes(filter.field)) continue;

    const value = filter.value;

    // Range: 2025-11-01..2025-11-15
    if (value.includes('..')) {
      const [start, end] = value.split('..');
      dateFilters.push({
        field: filter.field,
        operator: 'range',
        value: start,
        endValue: end,
      });
      continue;
    }

    // Comparison operators
    if (value.startsWith('>=')) {
      dateFilters.push({
        field: filter.field,
        operator: '>=',
        value: value.substring(2),
      });
    } else if (value.startsWith('<=')) {
      dateFilters.push({
        field: filter.field,
        operator: '<=',
        value: value.substring(2),
      });
    } else if (value.startsWith('>')) {
      dateFilters.push({
        field: filter.field,
        operator: '>',
        value: value.substring(1),
      });
    } else if (value.startsWith('<')) {
      dateFilters.push({
        field: filter.field,
        operator: '<',
        value: value.substring(1),
      });
    } else {
      dateFilters.push({
        field: filter.field,
        operator: '=',
        value,
      });
    }
  }

  return dateFilters;
}

/**
 * Extract plain terms from AST
 */
function extractTerms(ast: ASTNode | null): string[] {
  if (!ast) return [];

  const terms: string[] = [];

  function traverse(node: ASTNode): void {
    if (node.type === 'TERM' && node.value) {
      terms.push(node.value.toLowerCase());
    }
    if (node.type === 'PHRASE' && node.value) {
      terms.push(node.value.toLowerCase());
    }
    if (node.left) traverse(node.left);
    if (node.right) traverse(node.right);
    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  traverse(ast);
  return terms;
}

/**
 * Extract fuzzy terms from AST
 */
function extractFuzzyTerms(ast: ASTNode | null): string[] {
  if (!ast) return [];

  const fuzzyTerms: string[] = [];

  function traverse(node: ASTNode): void {
    if (node.type === 'FUZZY' && node.value) {
      fuzzyTerms.push(node.value.toLowerCase());
    }
    if (node.left) traverse(node.left);
    if (node.right) traverse(node.right);
    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  traverse(ast);
  return fuzzyTerms;
}

/**
 * Check if query has advanced syntax
 */
function hasAdvancedSyntax(tokens: Token[]): boolean {
  for (const token of tokens) {
    if (
      token.type === 'AND' ||
      token.type === 'OR' ||
      token.type === 'NOT' ||
      token.type === 'FIELD' ||
      token.type === 'FUZZY' ||
      token.type === 'PHRASE' ||
      token.type === 'LPAREN'
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Parse a search query string into a structured query object
 * 
 * @param query - The search query string
 * @returns Parsed query with AST, terms, filters, etc.
 */
export function parseQuery(query: string): ParsedQuery {
  const trimmed = query.trim();
  
  if (!trimmed) {
    return {
      ast: null,
      terms: [],
      fields: [],
      dateFilters: [],
      fuzzyTerms: [],
      hasAdvancedSyntax: false,
      originalQuery: query,
      errors: [],
    };
  }

  const tokens = tokenize(trimmed);
  const parser = new QueryParser(tokens);
  const { ast, errors } = parser.parse();

  const fields = extractFieldFilters(ast);
  const dateFilters = extractDateFilters(fields);
  const terms = extractTerms(ast);
  const fuzzyTerms = extractFuzzyTerms(ast);

  return {
    ast,
    terms,
    fields,
    dateFilters,
    fuzzyTerms,
    hasAdvancedSyntax: hasAdvancedSyntax(tokens),
    originalQuery: query,
    errors,
  };
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Check if a term fuzzy matches a text
 * 
 * @param term - The search term
 * @param text - The text to search in
 * @param maxDistance - Maximum edit distance (default: auto based on term length)
 * @returns True if the term fuzzy matches any word in the text
 */
export function fuzzyMatch(term: string, text: string, maxDistance?: number): boolean {
  const termLower = term.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Auto-calculate max distance based on term length
  // Short terms (<=4): 1, medium terms (5-8): 2
  // This is more conservative to reduce false positives
  const autoDistance = termLower.length <= 4 ? 1 : 2;
  const threshold = maxDistance ?? autoDistance;

  // Check each word in the text
  const words = textLower.split(/\s+/);
  for (const word of words) {
    if (levenshteinDistance(termLower, word) <= threshold) {
      return true;
    }
  }

  return false;
}

/**
 * Generate search syntax help text
 */
export function getSearchSyntaxHelp(): string {
  return `
Search Syntax:
  term              Simple term search
  "exact phrase"    Match exact phrase
  term1 AND term2   Both terms must match (AND is optional)
  term1 OR term2    Either term matches
  NOT term          Exclude specs with term

Field Filters:
  status:in-progress    Filter by status (planned, in-progress, complete, archived)
  tag:api               Filter by tag
  priority:high         Filter by priority (low, medium, high, critical)
  assignee:marvin       Filter by assignee
  title:dashboard       Search in title only
  name:oauth            Search in spec name

Date Filters:
  created:>2025-11-01             Created after date
  created:<2025-11-15             Created before date
  created:2025-11-01..2025-11-15  Created in date range
  updated:>=2025-11-01            Updated on or after date

Fuzzy Matching:
  authetication~     Matches "authentication" (typo-tolerant)

Examples:
  api authentication                 Find specs with both terms
  tag:api status:planned             API specs that are planned
  "user session" OR "token refresh"  Either phrase
  dashboard NOT deprecated           Dashboard specs, exclude deprecated
  authetication~                     Find despite typo
`.trim();
}
