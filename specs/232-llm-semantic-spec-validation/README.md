---
status: planned
created: 2026-01-20
priority: medium
tags:
- quality
- validation
- llm
- ai
- semantic
created_at: 2026-01-20T03:16:27.831295218Z
updated_at: 2026-01-20T03:16:27.831295218Z
---

# LLM-Based Semantic Validation for Specs

## Overview

Use LLMs to detect semantic corruption in specs that programmatic validation can't catch (contradictions, incomplete thoughts, content in wrong section, etc.). Complements structural validation with understanding of logical consistency.

**The Problem:**
- Programmatic validation catches structural issues (syntax, formatting)
- But misses semantic issues that "look good but aren't logically right"
- Examples: contradictions, incomplete sentences, wrong section placement
- These are hard to detect with regex/parsing alone

**The Solution:**
Send spec content to LLM for semantic analysis, get structured feedback on logical issues.

**Key Principles:**
- **Opt-in** - Costs money, requires API key
- **Token efficient** - Only send spec content, use cheap models
- **Actionable** - LLM provides specific suggestions
- **Cacheable** - Don't revalidate unchanged specs
- **Privacy-conscious** - Multiple provider options including local

## Design

### What LLMs Catch That Regex Can't

#### 1. Logical Contradictions
```markdown
## Overview
This feature adds dark mode support.

## Design
We won't implement theming in this version.
```
→ LLM detects: Overview says "adds dark mode" but Design says "won't implement"

#### 2. Content in Wrong Section
```markdown
## Overview
We'll use React hooks and Context API for state management...
[500 words of implementation details]

## Design
[Empty]
```
→ LLM detects: Implementation details belong in Design, not Overview

#### 3. Incomplete Thoughts
```markdown
## Plan
- [ ] Set up authentication
- [ ] Create user model
- [ ] The API endpoint should
```
→ LLM detects: Incomplete sentence, likely corruption

#### 4. Semantic Duplicates
```markdown
## Design
We'll use JWT tokens for authentication.

## Implementation
Authentication will be handled via JWT tokens.
```
→ LLM detects: Same concept repeated, likely copy-paste

#### 5. Missing Logical Connections
```markdown
## Overview
Add real-time notifications.

## Plan
- [ ] Set up Redis
```
→ LLM detects: Gap - why Redis? No explanation

#### 6. Status Mismatches
```yaml
status: complete
```
```markdown
## Plan
- [ ] Start implementation (unchecked)

## Test
[Empty section]
```
→ LLM detects: Marked complete but incomplete content

### LLM Validator Implementation

```typescript
// packages/core/src/validators/semantic-validator.ts
import { LLMClient } from '../llm/client';

export interface SemanticIssue {
  type: 'contradiction' | 'wrong_section' | 'incomplete' | 
        'duplicate' | 'gap' | 'status_mismatch';
  severity: 'error' | 'warning';
  location: string;
  problem: string;
  suggestion: string;
}

export interface SemanticValidationResult {
  hasIssues: boolean;
  issues: SemanticIssue[];
}

export class SemanticValidator {
  constructor(private llm: LLMClient) {}
  
  async validate(spec: SpecInfo): Promise<SemanticValidationResult> {
    if (!this.llm.isAvailable()) {
      return { hasIssues: false, issues: [] };
    }
    
    const prompt = this.buildPrompt(spec);
    const response = await this.llm.complete(prompt, {
      model: 'gpt-4o-mini',  // Fast and cheap
      temperature: 0,
      maxTokens: 1000,
      responseFormat: { type: 'json_object' }
    });
    
    const result = JSON.parse(response);
    return {
      hasIssues: result.issues.length > 0,
      issues: result.issues
    };
  }
  
  private buildPrompt(spec: SpecInfo): string {
    return `You are a spec quality reviewer. Analyze this LeanSpec spec for semantic corruption from failed AI edits.

Look for:
1. Logical contradictions (sections saying opposite things)
2. Content in wrong section (implementation in Overview, etc.)
3. Incomplete thoughts/sentences (corruption artifacts)
4. Semantic duplicates (same concept repeated differently)
5. Missing logical connections (gaps in reasoning)
6. Status mismatches (marked complete but incomplete content)

Spec content:
---
${spec.content}
---

Output JSON:
{
  "issues": [
    {
      "type": "contradiction" | "wrong_section" | "incomplete" | "duplicate" | "gap" | "status_mismatch",
      "severity": "error" | "warning",
      "location": "section name or line range",
      "problem": "what's wrong",
      "suggestion": "how to fix"
    }
  ]
}

Only report real issues. If the spec is logically sound, return empty issues array.
Be specific in location and suggestion.`;
  }
}
```

### Multi-Provider LLM Client

```typescript
// packages/core/src/llm/client.ts

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'leanspec-models' | 'local';
  apiKey?: string;
  endpoint?: string;
  model?: string;
}

export abstract class LLMClient {
  abstract isAvailable(): boolean;
  abstract complete(prompt: string, options: CompletionOptions): Promise<string>;
  
  static create(config: LLMConfig): LLMClient {
    switch (config.provider) {
      case 'openai':
        return new OpenAIClient(config);
      case 'anthropic':
        return new AnthropicClient(config);
      case 'leanspec-models':
        return new LeanSpecModelsClient(config);
      case 'local':
        return new LocalLLMClient(config);
      default:
        return new NoOpClient();
    }
  }
}

// OpenAI Implementation
export class OpenAIClient extends LLMClient {
  constructor(private config: LLMConfig) {
    super();
  }
  
  isAvailable(): boolean {
    return !!this.config.apiKey;
  }
  
  async complete(prompt: string, options: CompletionOptions): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        response_format: options.responseFormat
      })
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
  }
}

// LeanSpec Models (Free Tier)
export class LeanSpecModelsClient extends LLMClient {
  // Same pattern as spec 110 (context-aware AGENTS.md generation)
  // Free tier for LeanSpec users
}

// Local Ollama
export class LocalLLMClient extends LLMClient {
  // For privacy-conscious users
  // Uses local Ollama instance
}
```

### Caching Strategy

```typescript
// packages/core/src/llm/cache.ts
export class ValidationCache {
  private cache = new Map<string, CacheEntry>();
  
  async get(specPath: string, contentHash: string): Promise<SemanticValidationResult | null> {
    const key = `${specPath}:${contentHash}`;
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.result;
  }
  
  async set(specPath: string, contentHash: string, result: SemanticValidationResult, ttl: number): Promise<void> {
    const key = `${specPath}:${contentHash}`;
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      ttl
    });
  }
}
```

### Configuration

```json
{
  "llmValidation": {
    "enabled": false,
    "provider": "leanspec-models",
    "apiKey": "${LEANSPEC_API_KEY}",
    "model": "gpt-4o-mini",
    "localEndpoint": "http://localhost:11434",
    "cache": {
      "enabled": true,
      "ttlMinutes": 60
    },
    "runOn": {
      "create": false,
      "fileWatcher": false,
      "explicitCommand": true
    }
  }
}
```

### Cost Estimation

**Per validation:**
- Spec content: ~1,000 tokens (average)
- Prompt overhead: ~300 tokens
- Response: ~500 tokens
- **Total: ~1,800 tokens**

**Pricing (gpt-4o-mini):**
- Input: $0.15 / 1M tokens = $0.00027 per spec
- Output: $0.60 / 1M tokens = $0.0003 per spec
- **Total: ~$0.0006 per spec**

**With caching:**
- Unchanged specs: $0 (cached)
- Only validate on actual changes
- **Realistic cost: < $0.01 per week for typical project**

## Plan

- [ ] Design `SemanticValidator` interface
- [ ] Implement LLM client abstraction
- [ ] Add provider implementations:
  - [ ] OpenAI
  - [ ] Anthropic
  - [ ] LeanSpec Models (free tier)
  - [ ] Local Ollama
- [ ] Create validation prompt (prompt engineering)
- [ ] Add result caching with content hashing
- [ ] Add CLI command: `lean-spec validate --semantic <spec>`
- [ ] Write tests (20+ test cases)
- [ ] Add cost estimation to docs
- [ ] Integration with file watcher (opt-in)
- [ ] Documentation

## Test

### Semantic Detection Tests
- [ ] Detects contradictions across sections
- [ ] Detects content in wrong section
- [ ] Detects incomplete thoughts
- [ ] Detects semantic duplicates
- [ ] Detects missing logical connections
- [ ] Detects status mismatches
- [ ] No false positives on valid specs

### Provider Tests
- [ ] Works with OpenAI
- [ ] Works with Anthropic
- [ ] Works with LeanSpec Models
- [ ] Works with local Ollama
- [ ] Gracefully degrades when unavailable

### Performance Tests
- [ ] Average validation < 5 seconds
- [ ] Caching reduces redundant calls
- [ ] Token usage within expected bounds
- [ ] Cost tracking is accurate

## Notes

**When to Use:**
- Run manually with `lean-spec validate --semantic <spec>`
- Run in CI/CD before merging (block corrupted specs)
- Run on-demand from file watcher (user's choice)
- **Don't** run automatically on every file change (too expensive)

**Privacy:**
- Only spec content is sent to LLM (no workspace/code)
- Users can choose local models (Ollama) for full privacy
- No data retention (one-time API call)

**Future Enhancements:**
- Fine-tuned model specifically for LeanSpec
- Learn from user feedback (thumbs up/down)
- Context-aware validation (project-specific conventions)
- Multi-spec validation (detect inconsistencies across specs)