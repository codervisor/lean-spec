# Implementation Roadmap

**Phased delivery for programmatic spec management**

## Timeline Overview

**Total Duration**: 7 weeks for v0.3.0

```
Weeks 1-2: Foundation (parsing, analysis core)
Week 3:    Analysis tools (CLI commands)
Weeks 4-5: Transformation engine
Week 6:    CLI integration
Week 7:    Polish & dogfooding
```

## Phase 1: Foundation (Weeks 1-2)

### Goals
- ✅ Parse markdown to AST
- ✅ Traverse and query AST
- ✅ Validate round-trip (parse → stringify → parse)

### Tasks

#### Week 1: Parser Setup

**Day 1-2: Project scaffolding**
```bash
# Create new package/module
src/analysis/
  parser/
    index.ts
    ast-types.ts
    unified-config.ts
  analyzer/
  transformer/
  __tests__/
```

- [ ] Set up unified.js dependencies
- [ ] Configure TypeScript types
- [ ] Create test fixtures (sample specs)

**Day 3-4: Basic parsing**
- [ ] Implement `parseSpec(content: string): SpecAST`
- [ ] Implement `stringifySpec(ast: SpecAST): string`
- [ ] Handle frontmatter parsing
- [ ] Add position tracking (line numbers)

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

- [ ] Implement line count analysis
- [ ] Calculate nesting depth
- [ ] Count sections, code blocks, references
- [ ] Compute complexity score (0-100)
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
$ lspec analyze <spec> --complexity
$ lspec analyze <spec> --concerns
```

- [ ] Add `analyze` command to CLI
- [ ] Format output (human-readable)
- [ ] Add JSON output mode
- [ ] Add to help documentation

### Deliverables
- ✅ Complexity analyzer
- ✅ Concern detector
- ✅ `lspec analyze` command
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

#### Day 1-2: `lspec split` command
```bash
$ lspec split <spec> [options]
```

- [ ] Implement command handler
- [ ] Add strategy selection (auto, concerns, phases)
- [ ] Generate and display preview
- [ ] Prompt for confirmation
- [ ] Apply transformation
- [ ] Validate result
- [ ] Test on multiple specs

#### Day 3: `lspec compact` command
```bash
$ lspec compact <spec> [options]
```

- [ ] Implement command handler
- [ ] Display redundancy analysis
- [ ] Show compaction preview
- [ ] Apply compaction
- [ ] Validate result
- [ ] Test on verbose specs

#### Day 4: `lspec compress` command
```bash
$ lspec compress <spec> [options]
```

- [ ] Implement command handler
- [ ] Identify compressible sections
- [ ] Generate AI summaries (optional)
- [ ] Show preview
- [ ] Apply compression
- [ ] Test on specs with completed phases

#### Day 5: Utilities & Polish
```bash
$ lspec preview <spec> --transformation=<type>
$ lspec diff <spec> --before-after
$ lspec rollback <spec>
```

- [ ] Implement preview command
- [ ] Implement diff command
- [ ] Implement rollback (git-based)
- [ ] Update help documentation
- [ ] Create command examples

### Deliverables
- ✅ `lspec split` command
- ✅ `lspec compact` command
- ✅ `lspec compress` command
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
- [ ] Run on all specs >300 lines
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
$ lspec split 045
# Verify: 5 files created, all valid, references updated

# Test: Compact verbose spec
$ lspec compact 018
# Verify: Lines reduced, no info lost

# Test: Compress completed phases
$ lspec compress 043 --phases
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
- ✅ Complexity scores match manual assessment
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
