# Implementation Roadmap

**Phased delivery for mechanical transformation tools**

## Timeline Overview

**Total Duration**: 4 weeks for v0.3.0

```
Week 1:    Foundation (parsing, basic operations)
Week 2:    Core commands (analyze, split, compact)
Week 3:    Additional commands (compress, isolate)
Week 4:    Polish, testing, dogfooding
```

**Key Change**: Significantly simpler than originally planned. No complex algorithms, no semantic analysis - just mechanical file operations.

## Phase 1: Foundation (Week 1)

### Goals
- ✅ Basic markdown parsing (line ranges, sections, frontmatter)
- ✅ File operations (extract, create, delete, move)
- ✅ Token counting integration

### Tasks

#### Day 1-2: Parser Setup

```bash
# Leverage existing code
packages/core/src/analysis/
  parser.ts         # Basic markdown parsing
  line-extractor.ts # Extract line ranges
  section-finder.ts # Find section boundaries
```

**What we need**:
- Parse frontmatter (already exists)
- Find section headings and line numbers
- Extract line ranges from content
- Count tokens (already exists via spec 069)

**What we DON'T need**:
- ❌ Full AST traversal
- ❌ Semantic analysis
- ❌ Concern detection
- ❌ Similarity algorithms

#### Day 3-4: Basic File Operations

```typescript
// Simple utilities
function extractLines(content: string, start: number, end: number): string {
  return content.split('\n').slice(start - 1, end).join('\n');
}

function removeLines(content: string, start: number, end: number): string {
  const lines = content.split('\n');
  lines.splice(start - 1, end - start + 1);
  return lines.join('\n');
}

function replaceLines(content: string, start: number, end: number, replacement: string): string {
  const lines = content.split('\n');
  lines.splice(start - 1, end - start + 1, replacement);
  return lines.join('\n');
}
```

#### Day 5: Token Integration

```bash
# Already exists from spec 069
$ lean-spec tokens <spec>

# Just need to integrate into analyze command
$ lean-spec analyze <spec> --json
# Returns token count in JSON
```

## Phase 2: Core Commands (Week 2)

### Goals
- ✅ `analyze` command (return structure as JSON)
- ✅ `split` command (mechanical line extraction)
- ✅ `compact` command (remove line ranges)

### Day 1-2: Analyze Command

```typescript
// packages/cli/src/commands/analyze.ts
interface AnalyzeResult {
  spec: string;
  metrics: {
    tokens: number;
    lines: number;
    sections: SectionInfo[];
  };
  threshold: {
    status: 'excellent' | 'good' | 'warning' | 'error';
  };
  structure: Array<{
    section: string;
    level: number;
    lineRange: [number, number];
    tokens: number;
  }>;
}

export async function analyze(spec: string): Promise<AnalyzeResult> {
  // 1. Read spec
  const content = await readFile(spec);
  
  // 2. Count tokens (existing utility)
  const tokens = await countTokens(content);
  
  // 3. Find sections
  const sections = findSections(content);
  
  // 4. Return structured data
  return {
    spec,
    metrics: { tokens, lines: content.split('\n').length, sections },
    threshold: getThresholdStatus(tokens),
    structure: sections
  };
}
```

### Day 3-4: Split Command

```typescript
// packages/cli/src/commands/split.ts
interface SplitOptions {
  outputs: Array<{
    file: string;
    lines: [number, number];
  }>;
  updateRefs: boolean;
}

export async function split(spec: string, options: SplitOptions) {
  const content = await readFile(`${spec}/README.md`);
  
  // Extract each output
  for (const { file, lines } of options.outputs) {
    const extracted = extractLines(content, lines[0], lines[1]);
    await writeFile(`${spec}/${file}`, extracted);
  }
  
  // Update frontmatter in README.md
  if (options.updateRefs) {
    await updateSubSpecLinks(spec, options.outputs.map(o => o.file));
  }
  
  // Validate
  await validateSpec(spec);
}
```

### Day 5: Compact Command

```typescript
// packages/cli/src/commands/compact.ts
interface CompactOptions {
  removes: Array<[number, number]>;
}

export async function compact(spec: string, options: CompactOptions) {
  let content = await readFile(`${spec}/README.md`);
  
  // Remove ranges (reverse order to maintain line numbers)
  const sorted = options.removes.sort((a, b) => b[0] - a[0]);
  for (const [start, end] of sorted) {
    content = removeLines(content, start, end);
  }
  
  await writeFile(`${spec}/README.md`, content);
  await validateSpec(spec);
}
```

## Phase 3: Additional Commands (Week 3)

### Goals
- ✅ `compress` command (replace with summary)
- ✅ `isolate` command (move to new spec)
- ✅ CLI polish

### Day 1-2: Compress Command

```typescript
// packages/cli/src/commands/compress.ts
interface CompressOptions {
  range: [number, number];
  replacement: string;
}

export async function compress(spec: string, options: CompressOptions) {
  const content = await readFile(`${spec}/README.md`);
  const newContent = replaceLines(
    content,
    options.range[0],
    options.range[1],
    options.replacement
  );
  
  await writeFile(`${spec}/README.md`, newContent);
  await validateSpec(spec);
}
```

### Day 3-4: Isolate Command

```typescript
// packages/cli/src/commands/isolate.ts
interface IsolateOptions {
  lines: [number, number];
  newSpec: string;
  addReference: boolean;
}

export async function isolate(sourceSpec: string, options: IsolateOptions) {
  // 1. Extract content
  const content = await readFile(`${sourceSpec}/README.md`);
  const extracted = extractLines(content, options.lines[0], options.lines[1]);
  
  // 2. Create new spec
  await createSpec(options.newSpec, extracted);
  
  // 3. Remove from source
  await compact(sourceSpec, { removes: [options.lines] });
  
  // 4. Add reference if requested
  if (options.addReference) {
    await addCrossReference(sourceSpec, options.newSpec);
  }
}
```

### Day 5: CLI Integration

```bash
# Add commands to CLI
packages/cli/src/index.ts

program
  .command('analyze <spec>')
  .option('--json', 'Output as JSON')
  .action(analyzeCommand);

program
  .command('split <spec>')
  .option('--output <file:lines>', 'Output file with line range', collect)
  .option('--update-refs', 'Update cross-references')
  .action(splitCommand);

# etc.
```

## Phase 4: Polish & Dogfooding (Week 4)

### Goals
- ✅ Test on real specs
- ✅ Fix bugs
- ✅ Documentation
- ✅ Release v0.3.0

### Day 1-2: Dogfooding

**Target specs** (oversized or complex):
1. This spec (059) - Use to split itself
2. Spec 045 - Large unified dashboard spec
3. Spec 048 - Complexity analysis spec

### Day 3-4: Testing & Fixes

```bash
# Test suite
packages/core/src/analysis/__tests__/
  parser.test.ts
  line-extractor.test.ts
  section-finder.test.ts

packages/cli/src/commands/__tests__/
  analyze.test.ts
  split.test.ts
  compact.test.ts
  compress.test.ts
  isolate.test.ts
```

### Day 5: Release

- [ ] Update CHANGELOG.md
- [ ] Version bump to v0.3.0
- [ ] Publish to npm
- [ ] Update documentation site

## Success Criteria

**Must Have**:
- ✅ AI agent can analyze spec via JSON output
- ✅ AI agent can split spec with explicit parameters
- ✅ All transformations are deterministic
- ✅ No LLM calls in tools
- ✅ Fast (<200ms for typical operations)

**Nice to Have**:
- `--dry-run` mode
- `preview` command
- `rollback` command

**Deferred to v0.4.0**:
- Batch operations
- Watch mode
- CI/CD integration

## Testing Strategy

See [TESTING.md](./TESTING.md) for detailed test plan.

**Key insight**: Simple tools = simple tests. No complex algorithms to test.

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Line numbers shift after edits | Tools update references automatically |
| Invalid markdown after split | Validation catches errors |
| AI agent provides bad parameters | Dry-run mode for safety |
| Breaking cross-references | Reference validator checks links |

---

**Key Principle**: Keep it simple. 4 weeks to build mechanical tools vs. 7+ weeks for complex semantic analysis. AI agents do the hard work, tools just execute.

**Day 5: Round-trip validation**
- [ ] Test parse → stringify → parse identity
- [ ] Validate on all existing specs
- [ ] Fix any formatting issues

#### Week 2: AST Utilities

**Day 1-2: Traversal**
- [ ] Implement `visit(ast, nodeType, callback)`
- [ ] Implement `findSections(ast, predicate)`
- [ ] Implement `extractText(node)`

**Day 3-4: Queries**
- [ ] Find references: `findReferences(ast)`
- [ ] Find code blocks: `findCodeBlocks(ast)`
- [ ] Find headings: `findHeadings(ast, depth)`
- [ ] Count lines: `countLines(node)`

**Day 5: Testing**
- [ ] Unit tests for all utilities
- [ ] Integration test with real specs
- [ ] Document API with examples

### Deliverables
- ✅ Working parser (unified.js integration)
- ✅ AST utilities library
- ✅ Test suite (>80% coverage)
- ✅ Documentation

## Phase 2: Analysis Tools (Week 3)

### Goals
- ✅ Detect complexity issues
- ✅ Find redundancy
- ✅ Identify concerns
- ✅ CLI commands for analysis

### Tasks

#### Day 1-2: Complexity Analysis
```typescript
// src/analysis/analyzer/complexity.ts
export interface ComplexityAnalyzer {
  analyze(ast: SpecAST): ComplexityMetrics;
}
```

- [ ] Implement token count analysis (using tiktoken)
- [ ] Calculate nesting depth
- [ ] Count sections, code blocks, references
- [ ] Validate against token thresholds (2K/3.5K/5K)
- [ ] Check structure quality (sub-specs, sectioning)
- [ ] Test on existing specs

#### Day 3-4: Concern Detection
```typescript
// src/analysis/analyzer/concerns.ts
export interface ConcernAnalyzer {
  extractConcerns(ast: SpecAST): Concern[];
}
```

- [ ] Implement boundary detection algorithm
- [ ] Implement concern clustering
- [ ] Generate concern names
- [ ] Test on specs with known structure

#### Day 5: CLI Integration
```bash
$ lean-spec analyze <spec> --complexity
$ lean-spec analyze <spec> --concerns
```

- [ ] Add `analyze` command to CLI
- [ ] Format output (human-readable)
- [ ] Add JSON output mode
- [ ] Add to help documentation

### Deliverables
- ✅ Complexity analyzer
- ✅ Concern detector
- ✅ `lean-spec analyze` command
- ✅ Comprehensive tests

## Phase 3: Transformation Engine (Weeks 4-5)

### Goals
- ✅ Partition specs into sub-specs
- ✅ Compact redundant content
- ✅ Update cross-references automatically
- ✅ Validate transformations

### Week 4: Partition Transformer

#### Day 1-2: Core splitting logic
```typescript
// src/analysis/transformer/partition.ts
export class PartitionTransformer implements Transformer {
  preview(ast: SpecAST, options: PartitionOptions): TransformPreview;
  apply(ast: SpecAST, options: PartitionOptions): SubSpecFile[];
}
```

- [ ] Implement concern extraction
- [ ] Generate sub-spec ASTs
- [ ] Create README.md (overview + links)
- [ ] Test with spec 045 (known-good split)

#### Day 3-4: Reference updating
- [ ] Build reference graph
- [ ] Generate mapping (old → new paths)
- [ ] Update internal links
- [ ] Update cross-references
- [ ] Validate all links resolve

#### Day 5: File operations
- [ ] Write sub-spec files
- [ ] Update parent README.md
- [ ] Create git commit
- [ ] Test on actual filesystem

### Week 5: Compaction & Compression

#### Day 1-2: Redundancy detection
```typescript
// src/analysis/analyzer/redundancy.ts
export interface RedundancyAnalyzer {
  findDuplicates(ast: SpecAST): Duplicate[];
  findSimilarContent(ast: SpecAST): SimilarityGroup[];
}
```

- [ ] Exact duplicate detection
- [ ] Fuzzy matching (85% similarity)
- [ ] Pattern detection (repeated examples)
- [ ] Test on verbose specs

#### Day 3-4: Compaction transformer
```typescript
// src/analysis/transformer/compact.ts
export class CompactionTransformer implements Transformer {
  preview(ast: SpecAST): CompactionPreview;
  apply(ast: SpecAST): SpecAST;
}
```

- [ ] Remove exact duplicates
- [ ] Consolidate references
- [ ] Merge similar sections
- [ ] Preserve decision rationale
- [ ] Test preservation (no info loss)

#### Day 5: Compression transformer
```typescript
// src/analysis/transformer/compress.ts
export class CompressionTransformer implements Transformer {
  // Uses AI for summarization
  preview(ast: SpecAST, options: CompressionOptions): CompressionPreview;
  apply(ast: SpecAST, options: CompressionOptions): SpecAST;
}
```

- [ ] Identify compressible sections
- [ ] Generate summaries (AI-assisted)
- [ ] Preserve key decisions
- [ ] Test on completed phases

### Deliverables
- ✅ Partition transformer (sub-spec splitting)
- ✅ Compaction transformer (redundancy removal)
- ✅ Compression transformer (summarization)
- ✅ Reference manager (link updates)
- ✅ Comprehensive tests

## Phase 4: CLI Commands (Week 6)

### Goals
- ✅ User-friendly CLI interface
- ✅ Interactive previews
- ✅ Safe transformations (with rollback)
- ✅ All commands documented

### Tasks

#### Day 1-2: `lean-spec split` command
```bash
$ lean-spec split <spec> [options]
```

- [ ] Implement command handler
- [ ] Add strategy selection (auto, concerns, phases)
- [ ] Generate and display preview
- [ ] Prompt for confirmation
- [ ] Apply transformation
- [ ] Validate result
- [ ] Test on multiple specs

#### Day 3: `lean-spec compact` command
```bash
$ lean-spec compact <spec> [options]
```

- [ ] Implement command handler
- [ ] Display redundancy analysis
- [ ] Show compaction preview
- [ ] Apply compaction
- [ ] Validate result
- [ ] Test on verbose specs

#### Day 4: `lean-spec compress` command
```bash
$ lean-spec compress <spec> [options]
```

- [ ] Implement command handler
- [ ] Identify compressible sections
- [ ] Generate AI summaries (optional)
- [ ] Show preview
- [ ] Apply compression
- [ ] Test on specs with completed phases

#### Day 5: Utilities & Polish
```bash
$ lean-spec preview <spec> --transformation=<type>
$ lean-spec diff <spec> --before-after
$ lean-spec rollback <spec>
```

- [ ] Implement preview command
- [ ] Implement diff command
- [ ] Implement rollback (git-based)
- [ ] Update help documentation
- [ ] Create command examples

### Deliverables
- ✅ `lean-spec split` command
- ✅ `lean-spec compact` command
- ✅ `lean-spec compress` command
- ✅ Utility commands (preview, diff, rollback)
- ✅ Help documentation
- ✅ Example workflows

## Phase 5: Polish & Launch (Week 7)

### Goals
- ✅ Handle edge cases
- ✅ Optimize performance
- ✅ Dogfood on our own specs
- ✅ Documentation & examples

### Tasks

#### Day 1: Edge case handling
- [ ] Test on all existing specs
- [ ] Handle empty sections
- [ ] Handle specs with no clear concerns
- [ ] Handle specs already split
- [ ] Handle malformed markdown
- [ ] Add helpful error messages

#### Day 2: Performance optimization
- [ ] Profile analysis operations
- [ ] Add caching for repeated analysis
- [ ] Optimize AST traversal
- [ ] Parallelize project-wide analysis
- [ ] Target: <1s for any single spec

#### Day 3-4: Dogfooding
- [ ] Run on all specs >3,000 tokens
- [ ] Fix any issues discovered
- [ ] Document learnings
- [ ] Create case studies (before/after)

#### Day 5: Documentation & Launch
- [ ] Update README.md
- [ ] Create tutorial/guide
- [ ] Record demo video
- [ ] Announce on social media
- [ ] Blog post explaining approach

### Deliverables
- ✅ Robust edge case handling
- ✅ Optimized performance
- ✅ Dogfooded on all project specs
- ✅ Complete documentation
- ✅ v0.3.0 released

## Testing Strategy

### Unit Tests

**Parser**:
- ✅ Parse valid markdown
- ✅ Handle frontmatter
- ✅ Track line positions
- ✅ Round-trip identity

**Analyzers**:
- ✅ Complexity calculation
- ✅ Concern detection
- ✅ Redundancy finding
- ✅ Conflict detection

**Transformers**:
- ✅ Partition correctness
- ✅ Reference updating
- ✅ Compaction preservation
- ✅ Compression accuracy

**Commands**:
- ✅ CLI argument parsing
- ✅ Preview generation
- ✅ File operations
- ✅ Rollback functionality

### Integration Tests

**End-to-end workflows**:
```bash
# Test: Split oversized spec
$ lean-spec split 045
# Verify: 5 files created, all valid, references updated

# Test: Compact verbose spec
$ lean-spec compact 018
# Verify: Lines reduced, no info lost

# Test: Compress completed phases
$ lean-spec compress 043 --phases
# Verify: Phases summarized, outcomes preserved
```

### Golden Tests

Create snapshots of transformations:
```
tests/golden/
  split-045/
    input.md          # Original spec
    output/
      README.md       # Expected result
      DESIGN.md
      ...
  compact-018/
    input.md
    output.md
```

Run regression tests:
```bash
$ npm run test:golden
# Compares actual output vs expected output
```

### Performance Tests

```typescript
describe('Performance', () => {
  it('should analyze spec in <100ms', async () => {
    const start = Date.now();
    await analyze(largeSpec);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });
  
  it('should split spec in <500ms', async () => {
    const start = Date.now();
    await split(largeSpec);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });
});
```

## Success Criteria

### Phase 1 (Foundation)
- ✅ Parse all existing specs without errors
- ✅ Round-trip preserves content exactly
- ✅ Test coverage >80%

### Phase 2 (Analysis)
- ✅ Correctly identify concerns in 90%+ of specs
- ✅ Token thresholds match validation expectations
- ✅ Structure checks provide actionable feedback
- ✅ JSON output mode works for automation

### Phase 3 (Transformation)
- ✅ Split spec 045 matches manual split
- ✅ All cross-references remain valid
- ✅ Compaction preserves all decisions
- ✅ Zero information loss

### Phase 4 (CLI)
- ✅ Commands feel intuitive to users
- ✅ Previews are clear and accurate
- ✅ Rollback works reliably
- ✅ Help docs are comprehensive

### Phase 5 (Polish)
- ✅ No crashes on any existing spec
- ✅ Performance targets met
- ✅ Team can use confidently
- ✅ Documentation complete

## Risk Mitigation

### Risk 1: Complex Edge Cases

**Mitigation**:
- Start with simple specs (tests)
- Gradually increase complexity
- Build comprehensive test suite
- Fail gracefully with helpful errors

### Risk 2: Reference Integrity

**Mitigation**:
- Thorough reference graph testing
- Validation after every transform
- Git-based rollback always available
- Manual review before committing

### Risk 3: Information Loss

**Mitigation**:
- Preview mode for all transforms
- Diff view before applying
- Golden tests for regression
- Reversible operations (via git)

### Risk 4: Performance Issues

**Mitigation**:
- Profile early and often
- Cache analysis results
- Stream for large projects
- Set clear performance targets

### Risk 5: User Confusion

**Mitigation**:
- Clear command naming
- Interactive prompts with context
- Comprehensive help docs
- Example workflows

## Post-Launch Roadmap

### v0.3.1 (Bug fixes)
- Address issues from dogfooding
- Improve error messages
- Performance tweaks

### v0.4.0 (Continuous Management)
- Watch mode (auto-detect violations)
- Pre-commit hooks
- CI/CD integration
- Auto-compaction on save

### v0.5.0 (AI-Assisted Strategy)
- LLM suggests optimal strategy
- Semantic conflict detection
- Automated resolution suggestions
- Learning from past transformations

### v1.0.0 (Project-Wide Optimization)
- Cross-spec redundancy detection
- Spec dependency graph
- Consolidation recommendations
- Project health dashboard

---

**Key Principle**: Ship incrementally, dogfood continuously, iterate based on real usage. Quality over speed.
