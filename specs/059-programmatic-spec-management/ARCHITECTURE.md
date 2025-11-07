# System Architecture

**Programmatic spec management through AST manipulation**

## Design Principles

### 1. Separate Concerns

**AI Role**: Strategic decisions
- Identify concerns in spec
- Suggest splitting strategy
- Review transformation results
- Detect semantic issues

**Code Role**: Tactical execution
- Parse markdown to AST
- Analyze structure
- Transform content
- Update references
- Validate results

**Human Role**: Final decisions
- Approve transformations
- Override suggestions
- Provide context
- Handle edge cases

### 2. Deterministic Transformations

**No LLM in transformation pipeline**:
```
Input spec → Parse → Analyze → Transform → Output spec
    (AST-based, deterministic, fast)

NOT:
Input spec → LLM rewrite → Hope it's correct → Manual fixes
    (slow, error-prone, non-deterministic)
```

**Benefits**:
- ✅ Predictable results
- ✅ No hallucinations
- ✅ 100x+ faster
- ✅ Reversible (diffable)

### 3. Working Memory Constraints

Every component must fit in memory:
- Parser: <1MB for any reasonable spec
- Analyzer: Streaming for large projects
- Transformer: Operate on AST nodes, not full text
- Validator: Incremental checks

## System Components

### High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CLI Layer                        │
│  lspec analyze | split | compact | compress        │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│              Orchestration Layer                    │
│    - Command routing                                │
│    - User interaction (prompts, confirmations)      │
│    - Preview generation                             │
│    - Undo/rollback                                  │
└─────────────────────┬───────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼──────┐ ┌───▼────┐ ┌─────▼──────────┐
│   Parser     │ │Analyzer│ │  Transformer   │
│  (AST)       │ │        │ │    Engine      │
└───────┬──────┘ └───┬────┘ └─────┬──────────┘
        │            │            │
        └────────────┴────────────┘
                     │
         ┌───────────▼──────────────┐
         │   Validation Layer       │
         │  - Markdown validity     │
         │  - Frontmatter schema    │
         │  - Cross-reference check │
         │  - Line count limits     │
         └──────────────────────────┘
```

### Component Details

#### 1. Markdown Parser

**Technology**: [unified.js](https://unifiedjs.com/) ecosystem
- `remark-parse`: Markdown → AST
- `remark-stringify`: AST → Markdown
- `remark-frontmatter`: YAML frontmatter support
- `mdast-util-*`: AST traversal and manipulation

**Why unified.js**:
- ✅ Battle-tested (used by MDX, Docusaurus, etc.)
- ✅ Rich plugin ecosystem
- ✅ Stable AST format (mdast)
- ✅ TypeScript support
- ✅ Streaming capable

**Interface**:
```typescript
interface MarkdownParser {
  parse(content: string): SpecAST;
  stringify(ast: SpecAST): string;
  validate(ast: SpecAST): ValidationResult;
}

interface SpecAST {
  frontmatter: FrontmatterNode;
  sections: SectionNode[];
  references: ReferenceNode[];
}
```

**Example**:
```typescript
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';

const parser = unified()
  .use(remarkParse)
  .use(remarkFrontmatter, ['yaml']);

const ast = parser.parse(specContent);
// Now we can traverse/transform the AST programmatically
```

#### 2. Structure Analyzer

**Purpose**: Extract semantic structure from AST

**Capabilities**:
- **Boundary Detection**: Identify logical section boundaries
- **Concern Extraction**: Group related sections
- **Complexity Metrics**: Lines, nesting depth, cross-references
- **Redundancy Analysis**: Find duplicate/similar content
- **Conflict Detection**: Identify contradictions

**Interface**:
```typescript
interface StructureAnalyzer {
  analyze(ast: SpecAST): AnalysisResult;
  detectBoundaries(ast: SpecAST): Boundary[];
  extractConcerns(ast: SpecAST): Concern[];
  calculateComplexity(ast: SpecAST): ComplexityMetrics;
  findRedundancy(ast: SpecAST): RedundancyReport;
  detectConflicts(ast: SpecAST): Conflict[];
}

interface Concern {
  id: string;
  name: string;
  sections: SectionNode[];
  lineCount: number;
  dependencies: string[];
}

interface Boundary {
  type: 'section' | 'subsection' | 'concern';
  start: number;
  end: number;
  confidence: number;
}
```

**Algorithms** (see ALGORITHMS.md):
- Boundary detection via heading hierarchy
- Concern clustering via content similarity
- Redundancy via fuzzy text matching
- Conflicts via semantic contradiction

#### 3. Transformation Engine

**Purpose**: Apply transformations to AST

**Core Transformers**:
```typescript
interface Transformer {
  name: string;
  preview(ast: SpecAST, options: TransformOptions): TransformPreview;
  apply(ast: SpecAST, options: TransformOptions): SpecAST;
  rollback(ast: SpecAST, snapshot: Snapshot): SpecAST;
}

class PartitionTransformer implements Transformer {
  // Split into sub-specs by concern
  preview(ast, options) {
    return {
      subSpecs: [
        { name: 'README.md', lineCount: 203, sections: [...] },
        { name: 'DESIGN.md', lineCount: 378, sections: [...] },
        // ...
      ],
      crossReferences: [...],
      warnings: [...]
    };
  }
  
  apply(ast, options) {
    const subSpecs = this.splitByConcerns(ast, options);
    const updated = this.updateCrossReferences(ast, subSpecs);
    return updated;
  }
}

class CompactionTransformer implements Transformer {
  // Remove redundancy, consolidate references
  preview(ast, options) {
    return {
      duplicates: [...],
      consolidations: [...],
      linesSaved: 142,
      preservedDecisions: [...]
    };
  }
  
  apply(ast, options) {
    const deduped = this.removeDuplicates(ast);
    const consolidated = this.consolidateReferences(deduped);
    return consolidated;
  }
}

class CompressionTransformer implements Transformer {
  // Summarize sections (optionally with AI)
  preview(ast, options) {
    return {
      sectionsToCompress: [...],
      estimatedLinesSaved: 58,
      summaries: [...]
    };
  }
  
  apply(ast, options) {
    // Can use AI for summarization if configured
    const compressed = this.compressSections(ast, options);
    return compressed;
  }
}

class IsolationTransformer implements Transformer {
  // Move concern to new spec
  preview(ast, options) {
    return {
      concernToMove: {...},
      newSpecName: '060-velocity-algorithm',
      remainingSections: [...],
      crossReferences: [...]
    };
  }
  
  apply(ast, options) {
    const { extracted, remaining } = this.extractConcern(ast, options);
    this.createNewSpec(extracted, options);
    return remaining;
  }
}
```

#### 4. Reference Manager

**Purpose**: Maintain cross-reference integrity

**Challenges**:
- Internal links: `[see Design section](#design)`
- Sub-spec links: `[see TESTING.md](./TESTING.md)`
- Cross-spec links: `[spec 012](../012-sub-spec-files/)`
- Code references: Links to source files

**Interface**:
```typescript
interface ReferenceManager {
  findReferences(ast: SpecAST): Reference[];
  updateReferences(ast: SpecAST, mapping: ReferenceMapping): SpecAST;
  validateReferences(ast: SpecAST): ValidationResult;
}

interface Reference {
  type: 'internal' | 'sub-spec' | 'cross-spec' | 'code';
  source: Location;
  target: string;
  valid: boolean;
}

interface ReferenceMapping {
  // When we move section "Design" to DESIGN.md:
  '#design' => './DESIGN.md#design',
  // When we split concerns:
  '#velocity-tracking' => '../060-velocity-algorithm/README.md',
  // etc.
}
```

**Update algorithm**:
1. Parse all references in AST
2. Build mapping based on transformation
3. Update each reference according to mapping
4. Validate all references still resolve

#### 5. Validation Layer

**Purpose**: Ensure transformations produce valid specs

**Checks**:
```typescript
interface Validator {
  validate(ast: SpecAST): ValidationResult;
}

class MarkdownValidator implements Validator {
  // Ensure valid markdown structure
  validate(ast) {
    return {
      syntaxValid: true,
      wellFormed: true,
      errors: []
    };
  }
}

class FrontmatterValidator implements Validator {
  // Ensure valid frontmatter (existing from spec 018)
  validate(ast) {
    const fm = ast.frontmatter;
    return validateFrontmatter(fm);
  }
}

class ReferenceValidator implements Validator {
  // Ensure all links resolve
  validate(ast) {
    const refs = findReferences(ast);
    const broken = refs.filter(r => !r.valid);
    return {
      passed: broken.length === 0,
      errors: broken.map(r => ({
        message: `Broken reference: ${r.target}`,
        location: r.source
      }))
    };
  }
}

class LineCountValidator implements Validator {
  // Ensure Context Economy (existing from spec 048)
  validate(ast) {
    const lines = countLines(ast);
    if (lines > 400) {
      return {
        passed: false,
        errors: [{ message: `Exceeds 400 lines (${lines})` }]
      };
    }
    // ...
  }
}
```

## Data Structures

### SpecAST (Abstract Syntax Tree)

```typescript
interface SpecAST {
  type: 'root';
  frontmatter: FrontmatterNode;
  children: Node[];
  
  // Convenience accessors
  sections: SectionNode[];
  references: ReferenceNode[];
  codeBlocks: CodeNode[];
}

interface FrontmatterNode {
  type: 'yaml';
  value: string;  // Raw YAML
  data: FrontmatterData;  // Parsed
}

interface SectionNode {
  type: 'heading';
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  value: string;
  children: Node[];
  
  // Computed
  lineStart: number;
  lineEnd: number;
  lineCount: number;
}

interface ReferenceNode {
  type: 'link' | 'linkReference';
  url: string;
  title?: string;
  
  // Analysis
  referenceType: 'internal' | 'sub-spec' | 'cross-spec' | 'external';
  valid: boolean;
}

interface CodeNode {
  type: 'code';
  lang?: string;
  value: string;
  
  // Context
  lineStart: number;
  lineEnd: number;
}
```

### AnalysisResult

```typescript
interface AnalysisResult {
  complexity: ComplexityMetrics;
  concerns: Concern[];
  boundaries: Boundary[];
  redundancy: RedundancyReport;
  conflicts: Conflict[];
  recommendations: Recommendation[];
}

interface ComplexityMetrics {
  lineCount: number;
  sectionCount: number;
  maxNestingDepth: number;
  codeBlockCount: number;
  referenceCount: number;
  
  // Thresholds
  exceedsLimit: boolean;  // >400 lines
  approachingLimit: boolean;  // >300 lines
  
  // Complexity score (0-100)
  score: number;
}

interface RedundancyReport {
  duplicateSections: DuplicateGroup[];
  similarContent: SimilarityGroup[];
  consolidationOpportunities: Consolidation[];
  
  // Metrics
  totalRedundantLines: number;
  potentialSavings: number;  // Lines that could be removed
}

interface Conflict {
  type: 'contradiction' | 'outdated' | 'inconsistent';
  sections: SectionNode[];
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

interface Recommendation {
  strategy: 'partition' | 'compact' | 'compress' | 'isolate';
  rationale: string;
  estimatedImpact: {
    linesSaved: number;
    filesCreated: number;
    complexity: 'reduced' | 'same' | 'increased';
  };
  confidence: number;  // 0-1
}
```

### TransformPreview

```typescript
interface TransformPreview {
  transformation: string;  // 'partition' | 'compact' | etc.
  
  before: {
    lineCount: number;
    fileCount: number;
    complexity: number;
  };
  
  after: {
    lineCount: number;
    fileCount: number;
    complexity: number;
  };
  
  changes: Change[];
  warnings: Warning[];
  
  // For review
  diff: string;  // Git-style diff
  affectedFiles: string[];
}

interface Change {
  type: 'create' | 'modify' | 'delete' | 'move';
  file: string;
  description: string;
  linesDelta: number;
}
```

## Performance Considerations

### Target Performance

| Operation | Target | Rationale |
|-----------|--------|-----------|
| Parse spec (<2000 lines) | <50ms | Should feel instant |
| Analyze complexity | <100ms | Real-time feedback |
| Generate preview | <200ms | Quick iteration |
| Apply transformation | <500ms | One-time operation |
| Validate result | <100ms | Post-transform check |
| Full project analysis | <2s | Acceptable for bulk operations |

### Optimization Strategies

**1. Incremental Processing**
- Parse only when content changes
- Cache AST between operations
- Invalidate cache on write

**2. Streaming for Large Projects**
```typescript
async function* analyzeProject(specs: SpecInfo[]): AsyncGenerator<AnalysisResult> {
  for (const spec of specs) {
    const ast = await parseSpec(spec);
    const analysis = await analyzeAST(ast);
    yield analysis;  // Stream results
  }
}
```

**3. Parallel Processing**
- Analyze multiple specs concurrently
- Use worker threads for CPU-intensive tasks
- Batch file I/O operations

**4. Smart Defaults**
- Skip analysis for specs <200 lines (rarely need splitting)
- Focus on specs >300 lines
- Prioritize specs with known issues

## Error Handling

### Graceful Degradation

```typescript
async function splitSpec(specPath: string): Promise<Result<SplitResult, Error>> {
  try {
    // 1. Parse
    const ast = await parseSpec(specPath);
    if (!ast.ok) {
      return Err(new ParseError('Invalid markdown', ast.error));
    }
    
    // 2. Analyze
    const analysis = await analyzeAST(ast.value);
    if (analysis.concerns.length === 0) {
      return Err(new AnalysisError('No concerns detected', {
        suggestion: 'Spec may be too simple to split'
      }));
    }
    
    // 3. Preview
    const preview = await generatePreview(ast.value, analysis);
    const confirmed = await promptUser(preview);
    if (!confirmed) {
      return Err(new UserCancelled());
    }
    
    // 4. Transform (with rollback on error)
    const snapshot = createSnapshot(specPath);
    try {
      const result = await applyTransformation(ast.value, analysis);
      await validateResult(result);
      return Ok(result);
    } catch (error) {
      await rollback(snapshot);
      return Err(new TransformError('Transformation failed', error));
    }
    
  } catch (error) {
    return Err(new UnexpectedError(error));
  }
}
```

### User-Friendly Errors

```typescript
class LeanSpecError extends Error {
  constructor(
    message: string,
    public context: ErrorContext,
    public suggestion?: string
  ) {
    super(message);
  }
  
  format(): string {
    return `
${this.message}

Context: ${this.context}
${this.suggestion ? `\nSuggestion: ${this.suggestion}` : ''}
    `.trim();
  }
}

// Usage:
throw new LeanSpecError(
  'Failed to split spec',
  { specPath, lineCount: 1166, concerns: 5 },
  'Try using --force to override automatic concern detection'
);
```

## Testing Strategy

### Unit Tests
- Parser: Round-trip (parse → stringify → parse)
- Analyzer: Known specs with expected results
- Transformer: Input AST → Expected output AST
- Validator: Valid/invalid AST examples

### Integration Tests
- CLI commands end-to-end
- Multi-step transformations
- Error handling scenarios

### Golden Tests
- Known-good transformations
- Regression testing on real specs
- Compare against manual splits

See [TESTING.md](./TESTING.md) for detailed test plan.

## Future Enhancements

### v0.4.0: Continuous Management
- Watch mode: Auto-detect when specs exceed limits
- Pre-commit hooks: Validate before commit
- CI/CD integration: Block PRs with oversized specs

### v0.5.0: AI-Assisted Strategy
- LLM suggests optimal splitting strategy
- Semantic analysis for better concern detection
- Automated conflict resolution

### v1.0.0: Project-Wide Optimization
- Analyze all specs together
- Identify duplicate content across specs
- Suggest consolidation opportunities
- Generate spec dependency graph

---

**Key Principle**: Fast, deterministic transformations > slow, unpredictable LLM rewrites. Use AI for strategy, code for execution.
