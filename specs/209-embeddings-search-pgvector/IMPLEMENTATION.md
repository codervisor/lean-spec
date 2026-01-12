# Implementation Details

## Database Schema

### PostgreSQL + pgvector

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE projects (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE specs (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  spec_name TEXT NOT NULL,
  path TEXT NOT NULL,
  title TEXT,
  content TEXT,
  content_hash TEXT NOT NULL,  -- SHA256 of content for change detection
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, spec_name)
);

CREATE TABLE embeddings (
  id UUID PRIMARY KEY,
  spec_id UUID REFERENCES specs(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,  -- For future chunking strategy
  chunk_text TEXT NOT NULL,
  embedding VECTOR(1536),  -- Dimension depends on model
  model TEXT NOT NULL,  -- e.g., "text-embedding-3-small"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(spec_id, chunk_index)
);

-- Similarity search index (HNSW for speed, IVFFlat for accuracy)
CREATE INDEX ON embeddings USING hnsw (embedding vector_cosine_ops);
```

## Similarity Search Query

```sql
-- Find specs similar to query embedding
SELECT 
  s.spec_name,
  s.title,
  s.path,
  e.chunk_text,
  1 - (e.embedding <=> $1::vector) AS similarity  -- Cosine similarity
FROM embeddings e
JOIN specs s ON e.spec_id = s.id
WHERE s.project_id = $2
ORDER BY e.embedding <=> $1::vector  -- <=> is cosine distance operator
LIMIT 10;
```

**Distance metrics**:
- `<=>` - Cosine distance (default, best for text)
- `<->` - L2 (Euclidean) distance
- `<#>` - Inner product (for normalized vectors)

## Chunking Strategy

### Phase 1: Single Embedding per Spec

**Approach**:
```typescript
function prepareSpecForEmbedding(spec: Spec): string {
  const titleSection = spec.title ? `Title: ${spec.title}\n\n` : '';
  const content = spec.content;
  const combined = titleSection + content;
  
  // Truncate to model's max tokens (8191 for text-embedding-3-small)
  return truncateToTokenLimit(combined, 8191);
}
```

**Limitations**:
- May lose context in long specs (>3500 tokens)
- Single vector represents entire spec

### Phase 2: Chunk-Based Embeddings (Future)

**Approach**:
```typescript
function chunkSpec(spec: Spec): string[] {
  // Split by markdown sections (## headers)
  const sections = spec.content.split(/^##\s+/m);
  
  const chunks: string[] = [];
  let currentChunk = spec.title ? `Title: ${spec.title}\n\n` : '';
  
  for (const section of sections) {
    const sectionTokens = estimateTokens(section);
    const currentTokens = estimateTokens(currentChunk);
    
    if (currentTokens + sectionTokens > 1500) {
      // Chunk size target: 1500 tokens
      chunks.push(currentChunk);
      currentChunk = section;
    } else {
      currentChunk += section;
    }
  }
  
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}
```

**Benefits**:
- Better for long specs
- More precise match location
- Can return snippet from matching chunk

## Config Storage & Encryption

### File Structure

```json
{
  "search": {
    "mode": "embeddings",
    "provider": "openai",
    "apiKey": "encrypted:AES256:base64encodedciphertext",
    "embeddingModel": "text-embedding-3-small",
    "dimensions": 1536,
    "storage": "leanspec-cloud",
    "cloudApiKey": "encrypted:AES256:...",
    "databaseUrl": null
  }
}
```

### Encryption Implementation

```typescript
import { webcrypto } from 'crypto';

// Get or generate encryption key from system keychain
async function getEncryptionKey(): Promise<CryptoKey> {
  // Try system keychain first (macOS Keychain, Windows Credential Manager, etc.)
  const storedKey = await getFromKeychain('leanspec-encryption-key');
  if (storedKey) {
    return importKey(storedKey);
  }
  
  // Fallback: Derive key from machine ID
  const machineId = await getMachineId();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(machineId),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new Uint8Array(16), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptApiKey(apiKey: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(apiKey);
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  
  // Format: encrypted:AES256:base64(iv + ciphertext)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  return `encrypted:AES256:${Buffer.from(combined).toString('base64')}`;
}
```

## Indexing Pipeline

### Initial Indexing

```typescript
async function indexProject(projectId: string, config: SearchConfig) {
  const specs = await loadAllSpecs(projectId);
  const total = specs.length;
  let processed = 0;
  
  for (const spec of specs) {
    const content = prepareSpecForEmbedding(spec);
    const contentHash = sha256(content);
    
    // Check if already indexed with same content
    const existing = await db.query(
      'SELECT content_hash FROM specs WHERE project_id = $1 AND spec_name = $2',
      [projectId, spec.name]
    );
    
    if (existing?.content_hash === contentHash) {
      processed++;
      continue;  // Skip unchanged specs
    }
    
    // Generate embedding
    const embedding = await generateEmbedding(content, config);
    
    // Upsert spec and embedding
    await db.transaction(async (tx) => {
      const specId = await tx.query(
        `INSERT INTO specs (project_id, spec_name, path, title, content, content_hash)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (project_id, spec_name) 
         DO UPDATE SET content = $5, content_hash = $6, updated_at = NOW()
         RETURNING id`,
        [projectId, spec.name, spec.path, spec.title, content, contentHash]
      );
      
      await tx.query(
        `INSERT INTO embeddings (spec_id, chunk_index, chunk_text, embedding, model)
         VALUES ($1, 0, $2, $3, $4)
         ON CONFLICT (spec_id, chunk_index)
         DO UPDATE SET embedding = $3, model = $4, created_at = NOW()`,
        [specId, content, embedding, config.embeddingModel]
      );
    });
    
    processed++;
    console.log(`Indexed ${processed}/${total}: ${spec.name}`);
  }
}
```

### Incremental Indexing (File Watcher)

```typescript
import chokidar from 'chokidar';

function watchSpecsDirectory(projectId: string, specsDir: string, config: SearchConfig) {
  const watcher = chokidar.watch(`${specsDir}/**/*.md`, {
    ignored: /(^|[\/\\])\../,  // Ignore dotfiles
    persistent: true,
  });
  
  watcher
    .on('add', async (path) => {
      await indexSpec(projectId, path, config);
    })
    .on('change', async (path) => {
      await indexSpec(projectId, path, config);
    })
    .on('unlink', async (path) => {
      await db.query(
        'DELETE FROM specs WHERE project_id = $1 AND path = $2',
        [projectId, path]
      );
    });
}
```

## Provider Adapters

```typescript
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { cohere } from '@ai-sdk/cohere';
import { createAzure } from '@ai-sdk/azure';

function getEmbeddingModel(config: SearchConfig) {
  switch (config.provider) {
    case 'openai':
      return openai.embedding(config.embeddingModel);
      
    case 'cohere':
      return cohere.embedding(config.embeddingModel);
      
    case 'azure':
      const azure = createAzure({
        apiKey: config.apiKey,
        resourceName: config.azureResourceName,
      });
      return azure.embedding(config.embeddingModel);
      
    case 'custom':
      return {
        modelId: config.embeddingModel,
        provider: 'custom',
        doEmbed: async (values: string[]) => {
          const response = await fetch(config.customEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({ input: values }),
          });
          const data = await response.json();
          return { embeddings: data.embeddings };
        },
      };
      
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}
```

## Error Handling & Fallback

```typescript
async function search(query: string, config: SearchConfig): Promise<SearchResult[]> {
  if (config.mode === 'embeddings') {
    try {
      return await embeddingsSearch(query, config);
    } catch (error) {
      if (error instanceof NetworkError) {
        console.warn('Network error during embeddings search, falling back to lexical');
      } else if (error instanceof APIError) {
        console.error('API error:', error.message);
      } else {
        console.error('Unexpected error:', error);
      }
      
      // Always fall back to lexical search
      return lexicalSearch(query);
    }
  }
  
  return lexicalSearch(query);
}

// Specific error types
class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

class APIError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'APIError';
  }
}
```

## Migration Path for Users

### First-Time Setup Flow

1. User navigates to Settings → Search
2. Sees default mode: "Lexical (current)"
3. Clicks "Try Embeddings Search" button
4. Modal appears:
   ```
   Enable Semantic Search
   
   Semantic search uses AI to understand meaning,
   not just keywords.
   
   Example:
   - "user authentication" finds OAuth, JWT, sessions
   
   Setup required:
   1. OpenAI API key (or other provider)
   2. One-time indexing (~1 minute for 68 specs)
   
   Estimated cost: $0.003 for 68 specs
   
   [Select Provider ▼]  [Enter API Key]
   
   [Cancel]  [Enable Embeddings Search]
   ```

5. After enabling, background indexing starts with progress:
   ```
   Indexing specs... 45/68 (66%)
   [████████████░░░░] 
   
   Estimated time remaining: 23 seconds
   ```

6. Completion notification:
   ```
   ✓ Embeddings search enabled!
   
   Indexed 68 specs in 47 seconds.
   Try searching: "authentication flow"
   ```

### Re-indexing

```bash
# CLI command for manual re-indexing
lean-spec search:index

# Output:
# 🔍 Scanning specs directory...
# Found 68 specs
# 
# Checking for changes...
# - 12 specs updated since last index
# - 56 specs unchanged (skipped)
# 
# Generating embeddings for 12 specs...
# ████████████████████ 12/12 (100%)
# 
# ✓ Re-indexing complete in 5.2 seconds
# Cost: $0.0004
```
