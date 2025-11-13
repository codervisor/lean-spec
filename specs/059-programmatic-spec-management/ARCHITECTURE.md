# System Architecture

**Mechanical transformation tools for AI agent orchestration**

## Design Principles

### 1. AI Agent Orchestration Model

**AI Agent Role** (GitHub Copilot, Claude, etc.):
- Read and understand spec content
- Detect issues (token count, redundancy, structure)
- Decide transformation strategy
- Determine split points, what to remove, what to compress
- Call tools with explicit parameters
- Verify results

**Tool Role** (LeanSpec CLI):
- Parse markdown structure (sections, line ranges)
- Execute mechanical transformations (split, move, delete)
- Update cross-references
- Validate markdown syntax
- Report results as structured data (JSON)

**Key Insight**: Tools don't need semantic understanding - AI agents already have context. Tools just need reliable execution.

**What Changed**: Previously designed tools to do semantic analysis (detect concerns, find redundancy). Now tools are dumb executors - AI agents do the thinking.

### 2. Deterministic Transformations

**No LLM in tools** - AI agent provides intelligence, tools execute:
```
AI Agent analyzes spec → Decides what to do → Calls tool with parameters
                                                      ↓
                                         Tool executes mechanically
                                                      ↓
                                              Returns result (JSON)
                                                      ↓
                                         AI Agent verifies/continues

NOT:
Tool tries to understand content → Makes decisions → Uses LLM → Slow/unreliable
```

**Benefits**:
- ✅ Predictable results (same input = same output)
- ✅ No hallucinations (just file operations)
- ✅ Fast (milliseconds, no LLM calls)
- ✅ Testable (deterministic behavior)
- ✅ Simple (no AI integration complexity)

### 3. Minimal Parsing Requirements

Tools only need basic markdown parsing:
- Extract line ranges: "Give me lines 100-200"
- Identify sections: "Where does ## Design start?"
- Parse frontmatter: "What's the current status?"
- Update references: "Change line 45 ref to line 23"

**No need for**:
- ❌ Semantic understanding of content
- ❌ Concern detection algorithms
- ❌ Similarity/redundancy detection
- ❌ Conflict detection
- ❌ Content summarization

AI agents already have this context - tools just execute their decisions.

## System Components

### High-Level Architecture

```
┌──────────────────────────────────────────────────┐
│           AI Agent (Copilot/Claude)              │
│  • Reads specs                                   │
│  • Detects issues (4,800 tokens)                 │
│  • Decides strategy (split by concerns)          │
│  • Calls tools with parameters                   │
└─────────────────┬────────────────────────────────┘
                  │ (tool calls)
┌─────────────────▼────────────────────────────────┐
│              LeanSpec CLI Tools                  │
│  lean-spec analyze | split | compact | compress     │
└─────────────────┬────────────────────────────────┘
                  │
        ┌─────────┼─────────┐
        │         │         │
┌───────▼──────┐ │ ┌───────▼─────────┐
│   Parser     │ │ │  Transformer    │
│  (Basic MD)  │ │ │   (Mechanical)  │
└───────┬──────┘ │ └───────┬─────────┘
        │         │         │
        └─────────┼─────────┘
                  │
         ┌────────▼─────────┐
         │    Validator     │
         │  (Syntax checks) │
         └──────────────────┘
                  │
         ┌────────▼─────────┐
         │   JSON Output    │
         │  (for AI agent)  │
         └──────────────────┘
```

**Key Points**:
- AI agent is the orchestrator (top)
- Tools are executors (middle)
- No "analyzer" or "concern detector" - AI does that
- Validation is just syntax checking

### Component Details

#### 1. Markdown Parser (Simplified)

**Technology**: [unified.js](https://unifiedjs.com/) for basic parsing
- `remark-parse`: Markdown → AST
- `remark-stringify`: AST → Markdown
- `remark-frontmatter`: YAML frontmatter

**Why unified.js**:
- ✅ Battle-tested
- ✅ Handles edge cases (nested lists, code blocks, etc.)
- ✅ Position tracking (line numbers)
- ✅ Round-trip safe (parse → stringify → parse = same)

**What we need**:
```typescript
interface MarkdownParser {
  // Get section line ranges
  getSectionRange(content: string, sectionName: string): [number, number];
  
  // Extract line range
  extractLines(content: string, start: number, end: number): string;
  
  // Parse frontmatter
  parseFrontmatter(content: string): Record<string, any>;
  
  // Update frontmatter
  updateFrontmatter(content: string, updates: Record<string, any>): string;
  
  // Find and replace references
  updateReferences(content: string, oldLine: number, newLine: number): string;
}
```

**What we DON'T need**:
- ❌ Full AST traversal algorithms
- ❌ Semantic analysis
- ❌ Content understanding
- ❌ Concern detection

#### 2. Analyze Command (Metrics Only)

**Purpose**: Return structural metrics as JSON for AI agent

```typescript
interface AnalyzeResult {
  spec: string;
  metrics: {
    tokens: number;
    lines: number;
    sections: SectionInfo[];
    codeBlocks: number;
  };
  threshold: {
    status: 'excellent' | 'good' | 'warning' | 'error';
    limit: number;
  };
  structure: {
    section: string;
    level: number;
    lineRange: [number, number];
    tokens: number;
  }[];
}
```

**No semantic analysis** - just counts and structure. AI agent interprets the data.

#### 3. Transformation Commands (Mechanical)

**Split**: Extract line ranges to new files
```typescript
function split(spec: string, outputs: Array<{file: string, lines: [number, number]}>) {
  outputs.forEach(({file, lines}) => {
    const content = extractLines(spec, lines[0], lines[1]);
    writeFile(`${spec}/${file}`, content);
  });
  updateFrontmatter(spec, { /* sub-spec links */ });
}
```

**Compact**: Remove specified line ranges
```typescript
function compact(spec: string, removes: Array<[number, number]>) {
  let content = readFile(spec);
  removes.reverse().forEach(([start, end]) => {
    content = removeLines(content, start, end);
  });
  writeFile(spec, content);
}
```

**Compress**: Replace line range with new content
```typescript
function compress(spec: string, range: [number, number], replacement: string) {
  const content = readFile(spec);
  const newContent = replaceLines(content, range[0], range[1], replacement);
  writeFile(spec, newContent);
}
```

**Isolate**: Move lines to new spec
```typescript
function isolate(spec: string, lines: [number, number], newSpec: string) {
  const content = extractLines(spec, lines[0], lines[1]);
  createSpec(newSpec, content);
  compact(spec, [lines]);
  addReference(spec, newSpec);
}
```

All mechanical - no decisions, no LLM calls.

#### 4. Validation (Syntax Only)

**Purpose**: Ensure transformations produce valid markdown

```typescript
interface Validator {
  validateMarkdown(content: string): ValidationResult;
  validateFrontmatter(content: string): ValidationResult;
  validateReferences(content: string): ValidationResult;
}

class SyntaxValidator {
  validateMarkdown(content) {
    // Use unified.js to check for syntax errors
    // No semantic validation
    return { valid: true, errors: [] };
  }
  
  validateFrontmatter(content) {
    // Use existing frontmatter validator (spec 018)
    return validateFrontmatter(parseFrontmatter(content));
  }
  
  validateReferences(content) {
    // Check that links point to existing files/sections
    // No semantic validation of whether link makes sense
    return { valid: true, brokenLinks: [] };
  }
}
```

**No complex validation** - just syntax and structure. AI agent handles semantic correctness.

## Data Flow

### Example: AI Agent Splits Oversized Spec

```
1. AI Agent reads spec
   ├─ Spec 045: 4,800 tokens
   └─ Detects: Exceeds 3,500 token warning

2. AI Agent calls analyze
   $ lean-spec analyze 045 --json
   ├─ Returns: Structure, sections, line ranges
   └─ AI interprets: "5 major H2 sections"

3. AI Agent decides strategy
   ├─ Group sections into concerns
   ├─ Overview (lines 1-150)
   ├─ Design (lines 151-528)
   └─ Testing (lines 529-710)

4. AI Agent calls split
   $ lean-spec split 045 \
     --output=README.md:1-150 \
     --output=DESIGN.md:151-528 \
     --output=TESTING.md:529-710

5. Tool executes mechanically
   ├─ Extract line ranges
   ├─ Create new files
   ├─ Update frontmatter
   └─ Validate syntax

6. Tool returns result
   {
     "filesCreated": 3,
     "totalTokens": 3052,
     "success": true
   }

7. AI Agent verifies
   $ lean-spec tokens 045/*
   └─ Confirms all under 2,000 tokens
```

## Implementation Scope

### What We're Building

**Core Functionality**:
- ✅ Basic markdown parsing (sections, line ranges, frontmatter)
- ✅ `analyze` - Return structure as JSON
- ✅ `split` - Extract line ranges to files
- ✅ `compact` - Remove line ranges
- ✅ `compress` - Replace line range with text
- ✅ `isolate` - Move lines to new spec
- ✅ Syntax validation

**What We're NOT Building** (AI agent does this):
- ❌ Concern detection algorithms
- ❌ Redundancy detection
- ❌ Similarity analysis
- ❌ Conflict detection
- ❌ Content summarization
- ❌ Semantic understanding

### Technology Stack

**Core**:
- `unified.js` + `remark-parse` - Markdown parsing
- `remark-frontmatter` - YAML parsing
- TypeScript - Type safety
- Node.js - Runtime

**Testing**:
- Vitest - Unit/integration tests
- Existing specs - Real-world test data

**CLI**:
- Commander.js - CLI framework (already used)
- Existing CLI infrastructure from core package

## Performance Targets

| Operation | Target | Why |
|-----------|--------|-----|
| Parse spec | <50ms | Feels instant |
| Analyze | <100ms | AI agent needs fast feedback |
| Split/compact | <200ms | Simple file operations |
| Validate | <50ms | Just syntax checking |

**No complex algorithms = naturally fast**

## Error Handling

**Simple and clear**:
```typescript
// Invalid line range
if (startLine > endLine || startLine < 1) {
  return { error: 'Invalid line range', code: 2 };
}

// File doesn't exist
if (!fs.existsSync(specPath)) {
  return { error: 'Spec not found', code: 4 };
}

// Markdown syntax error
if (!isValidMarkdown(content)) {
  return { error: 'Invalid markdown syntax', code: 3 };
}
```

Exit codes match COMMANDS.md specification.

## Future Considerations

### v0.4.0: Enhanced Tooling
- `--dry-run` mode for all commands
- `preview` command for visualization
- `rollback` via git integration

### v0.5.0: MCP Integration
- Expose tools as MCP server
- AI agents can call tools over stdio/HTTP
- Better integration with Claude Desktop, etc.

### v1.0.0: Advanced Features
- Batch operations (split multiple specs)
- Project-wide analysis
- CI/CD integration

---

**Key Takeaway**: Keep it simple. Tools provide clean file operations, AI agents provide intelligence. This architecture reflects that philosophy.
