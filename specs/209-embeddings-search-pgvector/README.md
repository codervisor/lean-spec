---
status: planned
created: 2026-01-12
priority: high
tags:
- search
- embeddings
- llm
- cloud-service
- pgvector
- ai-sdk
- ui
- core
depends_on:
- 075-intelligent-search-engine
- 124-advanced-search-capabilities
- 147-json-config-format
- 184-ui-packages-consolidation
created_at: 2026-01-12T13:35:04.956817Z
updated_at: 2026-01-12T13:35:11.301764Z
---

# Embeddings-Based Search with PgVector Storage

## Problem & Motivation

### Current Search Limitations

Existing search (specs 075, 124) uses lexical/keyword matching with relevance scoring:
- **No semantic understanding** - "authentication flow" won't find "login process" or "user verification"
- **Keyword-dependent** - Requires exact terms or close variants
- **No conceptual similarity** - Can't discover specs about similar concepts with different vocabulary
- **Limited for AI agents** - Agents need semantic understanding to discover truly relevant specs

### Why Embeddings Search?

**Semantic understanding**:
```
Query: "user authentication"
Lexical: Matches "authentication" literally
Embeddings: Also finds "login", "OAuth", "JWT", "session management", "access control"
```

**Better for growing projects**: As projects reach 100+ specs, semantic search becomes critical for discovery.

**AI agent optimization**: Agents can find relevant specs even with imprecise queries.

### Why PgVector + Cloud Service?

**Non-file storage requirement**: Embeddings are binary vectors (1536 dimensions for OpenAI), not human-readable markdown. Storing in git is impractical:
- ❌ Large binary files (not diff-friendly)
- ❌ Not human-editable
- ❌ Regeneration required when embedding model changes

**PostgreSQL + pgvector benefits**:
- ✅ Industry-standard vector database
- ✅ ACID guarantees
- ✅ Efficient similarity search (HNSW, IVFFlat indexes)
- ✅ Mature ecosystem (Supabase, Neon, Railway, etc.)
- ✅ Can be self-hosted or cloud-hosted

**Cloud service opportunity**:
- LeanSpec-managed embedding service
- No user setup required (optional paid tier)
- Includes embedding generation + storage
- Fallback to local lexical search if unavailable

## High-Level Approach

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    LeanSpec Client                       │
│                  (CLI/MCP/Web/Desktop)                   │
└────────────┬──────────────────────────────┬─────────────┘
             │                               │
             │ (Primary)                     │ (Fallback)
             ▼                               ▼
┌─────────────────────────┐    ┌────────────────────────┐
│  Embeddings Search API  │    │   Lexical Search       │
│  (LeanSpec Cloud)       │    │   (Local, Existing)    │
└────────────┬────────────┘    └────────────────────────┘
             │
             ▼
┌─────────────────────────┐
│  PostgreSQL + pgvector  │
│  (Managed or Self-Host) │
└─────────────────────────┘

User configures:
- LLM provider (OpenAI, Anthropic, etc.)
- Embedding model
- API keys
- Storage (cloud vs self-hosted)
```

### Hybrid Search Strategy

**Phase 1: Embeddings-only**
1. Generate query embedding
2. Vector similarity search in pgvector
3. Return top-k results with scores

**Phase 2: Hybrid (Future)**
- Combine lexical (BM25) + semantic (embeddings) scores
- Re-rank using cross-encoder or RRF (Reciprocal Rank Fusion)
- Best of both worlds

### Configuration Through UI

**Settings Page: `/settings/search` (Web/Desktop)**
```typescript
interface SearchConfig {
  // Search mode
  mode: 'lexical' | 'embeddings' | 'hybrid';
  
  // LLM Provider
  provider: 'openai' | 'anthropic' | 'cohere' | 'azure' | 'custom';
  apiKey: string;  // Encrypted storage
  
  // Embedding Model
  embeddingModel: string;  // e.g., "text-embedding-3-small"
  dimensions?: number;     // Default: 1536 (OpenAI)
  
  // Storage
  storage: 'leanspec-cloud' | 'self-hosted';
  
  // Self-hosted DB (if storage === 'self-hosted')
  databaseUrl?: string;  // postgres://user:pass@host:5432/db
  
  // Cloud service (if storage === 'leanspec-cloud')
  cloudApiKey?: string;  // LeanSpec Cloud API key
}
```

**UI Mockup**:
```
┌─────────────────────────────────────────────────┐
│ Search Configuration                            │
├─────────────────────────────────────────────────┤
│                                                 │
│ Search Mode                                     │
│ ○ Lexical (keyword-based, default)             │
│ ● Embeddings (semantic understanding)          │
│ ○ Hybrid (best of both) [Coming soon]          │
│                                                 │
│ ───────────────────────────────────────────────│
│                                                 │
│ LLM Provider                                    │
│ [OpenAI ▼]                                      │
│                                                 │
│ API Key                                         │
│ [sk-...xyz] [Show] [Test Connection]           │
│                                                 │
│ Embedding Model                                 │
│ [text-embedding-3-small ▼]                      │
│ Dimensions: 1536                                │
│                                                 │
│ ───────────────────────────────────────────────│
│                                                 │
│ Storage                                         │
│ ● LeanSpec Cloud (managed)                     │
│   - No setup required                           │
│   - Automatic indexing                          │
│   - Free tier: 1000 searches/month              │
│   [Sign up for Cloud]                           │
│                                                 │
│ ○ Self-Hosted PostgreSQL                       │
│   Database URL                                  │
│   [postgres://...] [Test Connection]            │
│                                                 │
│ [Save Configuration]                            │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Vercel AI SDK v6 Integration

**Why Vercel AI SDK?**
- Unified interface for multiple LLM providers
- Built-in streaming support
- Type-safe
- Excellent DX

**Embedding generation**:
```typescript
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';

async function generateEmbedding(text: string, config: SearchConfig) {
  const { embedding } = await embed({
    model: openai.embedding(config.embeddingModel),
    value: text,
  });
  return embedding;  // number[]
}
```

**Provider adapters** (from config):
```typescript
function getEmbeddingModel(config: SearchConfig) {
  switch (config.provider) {
    case 'openai':
      return openai.embedding(config.embeddingModel);
    case 'anthropic':
      // Future: Anthropic doesn't have embeddings yet
      throw new Error('Anthropic embeddings not available');
    case 'cohere':
      return cohere.embedding(config.embeddingModel);
    case 'azure':
      return azure.embedding(config.embeddingModel);
    case 'custom':
      return createCustomProvider(config.customEndpoint);
  }
}
```

## Acceptance Criteria

- [ ] **Configuration UI**
  - Settings page for search configuration (web + desktop)
  - Provider selection (OpenAI, Anthropic, Cohere, Azure, Custom)
  - API key input with encryption
  - Embedding model dropdown
  - Storage mode selection (cloud vs self-hosted)
  - Test connection buttons for API keys and database URLs

- [ ] **LLM Integration**
  - Vercel AI SDK v6 integration for embeddings
  - Support multiple providers via config
  - Embedding generation for spec content
  - Batch embedding for initial indexing

- [ ] **PgVector Storage**
  - PostgreSQL schema with pgvector extension
  - Tables: `projects`, `specs`, `embeddings`
  - Vector similarity search with configurable distance metric (cosine, L2, inner product)
  - Indexes for performance (HNSW or IVFFlat)

- [ ] **Search API**
  - Query embedding generation
  - Vector similarity search
  - Return ranked results with similarity scores
  - Fallback to lexical search if embeddings unavailable

- [ ] **Indexing Pipeline**
  - Watch for spec changes (file system watcher)
  - Incremental embedding generation
  - Batch re-indexing command (`lean-spec search:index`)
  - Handle spec deletions (remove from vector DB)

- [ ] **CLI/MCP Integration**
  - `lean-spec search` supports `--mode embeddings`
  - MCP `search` tool respects config
  - Clear error messages when embeddings not configured

- [ ] **Security**
  - Encrypt API keys in config (AES-256)
  - Secure database URL storage
  - HTTPS-only for cloud API
  - Rate limiting for cloud service

- [ ] **Cloud Service (Optional, Future)**
  - REST API for embeddings + search
  - Multi-tenant architecture
  - Free tier: 1000 searches/month
  - Paid tier: Unlimited + faster indexing

## Out of Scope

- ❌ **Hybrid search (lexical + embeddings)** - Defer to Phase 2
- ❌ **Cross-encoder re-ranking** - Defer to Phase 3
- ❌ **Multi-modal embeddings** (images, diagrams) - Future enhancement
- ❌ **Fine-tuned embedding models** - Use pre-trained models initially
- ❌ **Real-time indexing** - Batch indexing acceptable for MVP
- ❌ **Distributed vector search** - Single PostgreSQL instance sufficient for MVP
- ❌ **Alternative vector DBs** (Qdrant, Weaviate, Pinecone) - PostgreSQL + pgvector only for now

## Dependencies

**Builds on**:
- 075-intelligent-search-engine (lexical search foundation)
- 124-advanced-search-capabilities (query parsing, filters)
- 147-json-config-format (configuration storage)
- 184-ui-packages-consolidation (UI architecture)

**Technology stack**:
- Vercel AI SDK v6 (`ai` package)
- PostgreSQL + pgvector extension
- Rust `pgvector` crate (for Rust backend)
- TypeScript `pgvector` npm package (for Node.js backend)
- Encryption: `crypto` (Node.js) or `ring` (Rust)

## Technical Notes

### Database Schema

PostgreSQL with pgvector extension. Tables: `projects`, `specs`, `embeddings` (with VECTOR type). HNSW index for efficient similarity search. See IMPLEMENTATION.md for full schema.

### Vercel AI SDK v6

```typescript
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';

const { embedding } = await embed({
  model: openai.embedding('text-embedding-3-small'),
  value: specContent
});
```

### Configuration

Stored in `~/.lean-spec/config.json` under `search` key. API keys encrypted using system keychain (macOS/Windows/Linux) or AES-256-GCM fallback.

### Costs & Performance

- Embedding generation: ~$0.003 per 100 specs (OpenAI text-embedding-3-small)
- Storage: ~6KB per spec vector (1536 dimensions)
- Supabase free tier: 500MB (sufficient for 80K+ specs)

### Graceful Degradation

Embeddings search automatically falls back to lexical search on failure (API errors, missing config, DB unavailable).

## Open Questions

1. **Should we support multiple embedding models simultaneously?** (e.g., compare results)
   - Likely NO - adds complexity, minimal user benefit
   
2. **Chunking strategy for long specs?** (>3500 tokens)
   - Phase 1: Single embedding (truncate)
   - Phase 2: Semantic chunking
   
3. **Cloud service pricing model?**
   - Free tier: 1000 searches/month
   - Paid tier: $5/month for unlimited
   - Enterprise: Custom pricing
   
4. **Should embeddings be project-specific or cross-project?**
   - Project-specific initially (simpler)
   - Cross-project search in future (requires multi-tenant architecture)
   
5. **How to handle embedding model updates?**
   - Store model name + version in DB
   - Prompt user to re-index when model changes
   - Automatic re-indexing in cloud service

## Future Enhancements

- **Hybrid search** (BM25 + embeddings + re-ranking)
- **Semantic chunking** for long specs
- **Cross-project search** ("find similar specs across all projects")
- **Query expansion** (automatically try synonyms)
- **Multi-modal embeddings** (include diagrams, images)
- **Fine-tuned models** (domain-specific embeddings)
- **Search analytics** (track query patterns, improve relevance)
- **Collaborative filtering** ("specs related to this one")