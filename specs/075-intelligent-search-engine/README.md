---
status: complete
created: '2025-11-13'
tags:
  - search
  - mcp
  - cli
  - core
  - ranking
  - v0.3.0
priority: critical
created_at: '2025-11-13T09:01:46.579Z'
updated_at: '2025-11-13T09:32:09.405Z'
related:
  - 065-v03-planning
  - 059-programmatic-spec-management
completed_at: '2025-11-13T09:32:09.405Z'
completed: '2025-11-13'
transitions:
  - status: complete
    at: '2025-11-13T09:32:09.405Z'
---

# Intelligent Search Engine

> **Status**: ✅ Complete · **Priority**: Critical · **Created**: 2025-11-13 · **Tags**: search, mcp, cli, core, ranking, v0.3.0

**Project**: lean-spec  
**Team**: Core Development

## Overview

**Problem**: Current search is primitive - simple case-insensitive substring matching with no ranking, relevance scoring, or intelligent query interpretation. Both CLI and MCP use identical basic logic that returns poor results when multiple specs match.

**Why Now**: Search is foundational for AI agents and human users to discover relevant specs. As projects grow (60+ specs in our own repo), poor search becomes a bottleneck. AI agents need intelligent search to provide better context. **Included in v0.3 release** - critical for AI agent performance optimization theme.

**Current Limitations**:
- No relevance ranking (first match = best match)
- No fuzzy matching (typos fail completely)
- No phrase/proximity search
- No field-weighted scoring (title matches = body matches)
- No multi-word query intelligence (AND/OR logic)
- Limited context (shows 3 matches max, often mid-paragraph)
- No search result metadata (match count, relevance score)
- Duplicate code between CLI and MCP implementations

**Impact**: Users miss relevant specs, AI agents get poor context, search feels broken compared to modern expectations (GitHub, VSCode, etc.).

## Design

### Core Principles

1. **Relevance Over Speed**: Better results matter more than millisecond latency
2. **Context Economy**: Show enough context to decide without reading full spec
3. **Progressive Enhancement**: Start with better ranking, add features incrementally
4. **Shared Implementation**: One search engine for CLI, MCP, and future web UI

### Search Engine Architecture

**Phase 1: Core Search Engine (packages/core/src/search/)**

```typescript
// Core search result with scoring
export interface SearchResult {
  spec: SpecInfo;
  score: number;           // 0-100 relevance score
  matches: SearchMatch[];  // Detailed match information
  totalMatches: number;    // Total matches found
}

export interface SearchMatch {
  field: 'title' | 'description' | 'content' | 'tags' | 'name';
  text: string;           // Matched text with context
  lineNumber?: number;    // For content matches
  score: number;          // Match-level score
  highlights: [number, number][]; // Character ranges to highlight
}

export interface SearchOptions {
  query: string;
  filters?: SpecFilterOptions;
  maxResults?: number;     // Default: 50
  minScore?: number;       // Default: 10 (0-100 scale)
  includeArchived?: boolean;
  // Future: fuzzyThreshold, fieldWeights, etc.
}
```

**Scoring Algorithm (Research-Backed)**:

```typescript
// Field weights based on importance
const FIELD_WEIGHTS = {
  title: 10.0,        // Title match = highest relevance
  name: 8.0,          // Spec name match
  tags: 7.0,          // Tag match
  description: 5.0,   // Description match
  content: 1.0,       // Body content match (baseline)
};

// Scoring factors (multiplicative)
function calculateScore(match: RawMatch): number {
  let score = FIELD_WEIGHTS[match.field];
  
  // Exact word boundary match bonus (2x)
  if (isExactWordMatch(match)) score *= 2.0;
  
  // Early position bonus (matches near start = more relevant)
  if (match.position < 100) score *= 1.5;
  
  // Frequency penalty (many matches = less specific)
  score *= Math.min(1.0, 3.0 / match.occurrences);
  
  // Normalize to 0-100 scale
  return Math.min(100, score * 10);
}
```

**Query Processing**:
- Split on whitespace → implicit AND logic
- Quote detection → phrase search (future)
- Operator support → AND/OR/NOT (future)
- Case-insensitive by default

**Match Context**:
- Show 80 chars before/after match (not 1 line)
- Smart boundary detection (sentence/paragraph)
- Deduplicate nearby matches
  - Limit to 5 best matches per spec (not first 3)

### Future Enhancements

- **Fuzzy Matching**: Levenshtein distance for typos
- **Phrase Search**: "authentication flow" as single unit
- **Boolean Operators**: `api AND (auth OR jwt)`
- **Field-Specific Search**: `title:api`, `tag:security`
- **Stemming**: "implement" matches "implementation"
- **Synonym Expansion**: "auth" → "authentication"

### Implementation Structure

```
packages/core/src/search/
  index.ts              # Public API
  engine.ts             # Core search engine
  scoring.ts            # Relevance scoring algorithms
  context.ts            # Match context extraction
  query-parser.ts       # Query string parsing (future)
  types.ts              # TypeScript interfaces

packages/cli/src/commands/
  search.ts             # CLI command (thin wrapper)

packages/cli/src/
  mcp-server.ts         # MCP tool (thin wrapper)
```

### CLI Output Redesign

```bash
$ lean-spec search "authentication flow"

🔍 Found 4 specs (searched 68 specs in 45ms)

1. 042-oauth2-implementation (95% match) [in-progress]
   🟡 high · [api, security, auth]
   
   Title: "OAuth2 Authentication Flow"
   
   Content (3 matches):
   "...implement the complete authentication flow including token refresh..."
   "...OAuth2 flow supports authorization code grant with PKCE..."
   
   More: +1 match in description

2. 038-jwt-token-service (78% match) [complete]
   🟢 medium · [api, auth]
   
   Tags: auth
   
   Content (2 matches):
   "...JWT authentication flow with RS256 signing..."
   
3. 051-user-session-management (62% match) [planned]
   ...

View full spec: lean-spec view 042
Search in spec: lean-spec view 042 | grep -i "authentication"
```

### MCP Response Format

```json
{
  "results": [
    {
      "spec": {
        "name": "042-oauth2-implementation",
        "path": "042-oauth2-implementation",
        "status": "in-progress",
        "priority": "high",
        "tags": ["api", "security", "auth"]
      },
      "score": 95,
      "totalMatches": 4,
      "matches": [
        {
          "field": "title",
          "text": "OAuth2 Authentication Flow",
          "score": 100,
          "highlights": [[7, 21]]
        },
        {
          "field": "content",
          "text": "implement the complete authentication flow including...",
          "lineNumber": 42,
          "score": 85,
          "highlights": [[23, 37], [38, 42]]
        }
      ]
    }
  ],
  "metadata": {
    "totalResults": 4,
    "searchTime": 45,
    "query": "authentication flow",
    "filters": {}
  }
}
```

## Plan

### Phase 1: Core Search Engine (MVP) - Target: 2-4 hours

- [ ] **Create search engine module** (`packages/core/src/search/`)
  - [ ] Define TypeScript interfaces (SearchResult, SearchMatch, SearchOptions)
  - [ ] Implement core search engine with scoring
  - [ ] Write comprehensive unit tests (>90% coverage)

- [ ] **Implement scoring algorithm**
  - [ ] Field-weighted scoring (title > name > tags > description > content)
  - [ ] Exact word boundary detection
  - [ ] Position-based relevance
  - [ ] Frequency normalization

- [ ] **Build context extraction**
  - [ ] Smart context boundaries (80 chars, sentence-aware)
  - [ ] Highlight calculation (character ranges)
  - [ ] Deduplication of nearby matches
  - [ ] Limit to 5 best matches per spec

- [ ] **Refactor CLI command**
  - [ ] Use new search engine
  - [ ] Improved output format with scores
  - [ ] Show search metadata (time, total results)
  - [ ] Better error messages

- [ ] **Refactor MCP tool**
  - [ ] Use new search engine
  - [ ] Return structured results with scoring
  - [ ] Include search metadata
  - [ ] Consistent error handling

- [ ] **Documentation**
  - [ ] Update CLI reference with examples
  - [ ] Update MCP documentation
  - [ ] Add search algorithm documentation
  - [ ] Update finding-specs guide

### Phase 2: Enhanced Features - Target: 2-3 hours

- [ ] Fuzzy matching for typo tolerance (Levenshtein distance ≤2)
- [ ] Phrase search with quotes ("exact phrase")
- [ ] Boolean operators (AND, OR, NOT)
- [ ] Field-specific search syntax (title:, tag:, content:)
- [ ] Query suggestions/autocomplete (defer to post-v0.3)
- [ ] Search history and analytics (defer to post-v0.3)

### Phase 3: Performance Optimization (If Needed)

- [ ] Search index caching
- [ ] Incremental index updates
- [ ] Parallel spec processing
- [ ] Benchmark and profile

## Test

### Unit Tests (Core Engine)

- [ ] **Scoring algorithm**
  - Title matches score highest (100 points)
  - Tag matches score higher than content (70 vs 10)
  - Exact word match gets 2x bonus
  - Position bonus for early matches
  - Frequency penalty for common terms

- [ ] **Query processing**
  - Multi-word queries use AND logic
  - Case-insensitive matching
  - Special characters handled correctly
  - Empty query returns error

- [ ] **Context extraction**
  - Shows 80 chars before/after match
  - Respects sentence boundaries
  - Deduplicates nearby matches
  - Limits to 5 matches per spec

- [ ] **Filtering**
  - Combines filters with search query
  - Filters applied before scoring
  - Empty results handled gracefully

### Integration Tests

- [ ] **CLI command**
  - Search returns ranked results
  - Output format is readable
  - Filters work correctly
  - No results message shown
  - Error handling works

- [ ] **MCP tool**
  - Returns valid JSON structure
  - Includes all required fields
  - Scoring consistent with CLI
  - Metadata accurate

### Real-World Tests (Dogfooding)

Test on lean-spec repo with 68+ specs:

- [ ] "authentication" finds OAuth2 spec first (not random match)
- [ ] "token count" finds token-counting specs, not specs mentioning "tokens"
- [ ] Typo "athentication" finds nothing (fuzzy matching not implemented)
- [ ] "api AND security" returns intersection (when OR implemented)
- [ ] Search completes in <100ms for 68 specs

### Performance Criteria

- **Latency**: <100ms for 100 specs on typical machine
- **Accuracy**: Subjective "top result is correct" >80% of test queries
- **Coverage**: Unit test coverage >90%

## Notes

### Research Findings

**Modern Search Expectations** (from GitHub, VSCode, etc.):
- Relevance ranking is non-negotiable
- Field-weighted scoring (title > body)
- Fuzzy matching for typos
- Query suggestions
- Fast (<100ms)

**LeanSpec Context** (from spec 066, 069, 071):
- Projects typically have 20-100 specs
- Specs average 1,500 tokens (6,000 chars)
- Search needs to work for AI agents (structured results)
- No need for full-text index (linear scan is fine for <1000 specs)

### Alternatives Considered

**Full-Text Search Libraries**:
- ❌ **Lunr.js**: 7KB minified, overkill for small datasets, adds dependency
- ❌ **FlexSearch**: Fastest, but complex API, harder to customize scoring
- ❌ **Fuse.js**: Fuzzy search focused, weak relevance ranking
- ✅ **Custom Engine**: Full control, no dependencies, optimized for LeanSpec

**Why Custom**:
- Simple algorithm (200 LOC)
- No external dependencies
- Perfect control over scoring
- Can optimize for spec structure
- Easy to maintain and extend

### Open Questions

1. **Fuzzy matching threshold**: How many typos to tolerate? (Levenshtein distance ≤2?)
2. **Should archived specs rank lower?** (Currently same as active)
3. **Should we cache search results?** (Probably not - specs change frequently)
4. **Field-specific search syntax priority?** (Can wait for user demand)

### Dependencies

- **Part of**: v0.3 release (spec 065)
- **Depends on**: None (new core module)
- **Related**: 059 (programmatic spec management), 070 (MCP token counting), 072 (AI agent workflow)
- **Blocks**: Future web UI search (will use same engine)

### Migration Notes

**Breaking Changes**: None (additive feature, existing search still works)

**Backward Compatibility**: 
- CLI command interface unchanged
- MCP tool returns superset of current fields
- Existing scripts/integrations continue working
