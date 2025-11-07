# Testing Strategy

**Comprehensive validation for programmatic spec management**

## Testing Philosophy

### Principles

1. **Test behavior, not implementation** - Focus on what transforms do, not how
2. **Fast feedback loops** - Unit tests run in <1s, integration in <5s
3. **Confidence through coverage** - Target >85% code coverage
4. **Real-world scenarios** - Use actual specs from project
5. **Regression prevention** - Golden tests capture known-good transformations

### Test Pyramid

```
         /\
        /  \  E2E (5%)
       /----\  Integration (25%)
      /      \ Unit (70%)
     /________\
```

## Unit Tests

### Parser Tests

**File**: `src/analysis/parser/parser.test.ts`

```typescript
describe('MarkdownParser', () => {
  describe('parse', () => {
    it('should parse basic markdown', () => {
      const content = `# Title\n\nParagraph`;
      const ast = parser.parse(content);
      
      expect(ast.type).toBe('root');
      expect(ast.children).toHaveLength(2);
      expect(ast.children[0].type).toBe('heading');
    });
    
    it('should parse frontmatter', () => {
      const content = `---\nstatus: planned\n---\n\n# Title`;
      const ast = parser.parse(content);
      
      expect(ast.frontmatter).toBeDefined();
      expect(ast.frontmatter.data.status).toBe('planned');
    });
    
    it('should track line positions', () => {
      const content = `# H1\n\nParagraph\n\n## H2`;
      const ast = parser.parse(content);
      
      const h1 = ast.children[0] as HeadingNode;
      const h2 = ast.children[2] as HeadingNode;
      
      expect(h1.position.start.line).toBe(1);
      expect(h2.position.start.line).toBe(5);
    });
  });
  
  describe('stringify', () => {
    it('should round-trip correctly', () => {
      const content = readTestFixture('simple-spec.md');
      const ast = parser.parse(content);
      const output = parser.stringify(ast);
      
      expect(output).toBe(content);
    });
  });
});
```

### Analyzer Tests

**File**: `src/analysis/analyzer/complexity.test.ts`

```typescript
describe('ComplexityAnalyzer', () => {
  it('should detect lines exceeding limit', () => {
    const spec = createSpec({ lineCount: 450 });
    const result = analyzer.analyze(spec);
    
    expect(result.exceedsLimit).toBe(true);
    expect(result.lineCount).toBe(450);
  });
  
  it('should calculate complexity score', () => {
    const simple = createSpec({ lineCount: 100, sections: 5 });
    const complex = createSpec({ lineCount: 800, sections: 50, nesting: 5 });
    
    const simpleScore = analyzer.analyze(simple).score;
    const complexScore = analyzer.analyze(complex).score;
    
    expect(complexScore).toBeGreaterThan(simpleScore);
  });
  
  it('should identify concerns', () => {
    const spec = createSpecWithSections([
      'Overview',
      'Design',
      'Implementation',
      'Testing'
    ]);
    
    const concerns = analyzer.extractConcerns(spec);
    
    expect(concerns).toHaveLength(4);
    expect(concerns[0].name).toBe('Overview');
    expect(concerns[1].name).toBe('Design & Architecture');
  });
});
```

**File**: `src/analysis/analyzer/redundancy.test.ts`

```typescript
describe('RedundancyAnalyzer', () => {
  it('should find exact duplicates', () => {
    const spec = createSpecWithDuplicates();
    const result = analyzer.detectRedundancy(spec);
    
    expect(result.duplicates).toHaveLength(2);
    expect(result.duplicates[0].similarity).toBe(1.0);
  });
  
  it('should find near-duplicates', () => {
    const spec = createSpecWithSimilarSections();
    const result = analyzer.detectRedundancy(spec);
    
    const nearDupe = result.duplicates.find(d => d.similarity < 1.0);
    expect(nearDupe).toBeDefined();
    expect(nearDupe.similarity).toBeGreaterThan(0.85);
  });
  
  it('should calculate potential savings', () => {
    const spec = createSpecWithRedundancy();
    const result = analyzer.detectRedundancy(spec);
    
    expect(result.totalLinesSaved).toBeGreaterThan(0);
  });
});
```

### Transformer Tests

**File**: `src/analysis/transformer/partition.test.ts`

```typescript
describe('PartitionTransformer', () => {
  it('should split by concerns', () => {
    const spec = loadFixture('spec-045-original.md');
    const ast = parser.parse(spec);
    
    const result = transformer.apply(ast, { strategy: 'concerns' });
    
    expect(result.subSpecs).toHaveLength(5);
    expect(result.subSpecs[0].name).toBe('README.md');
    expect(result.subSpecs[1].name).toBe('DESIGN.md');
  });
  
  it('should update cross-references', () => {
    const spec = loadFixture('spec-with-refs.md');
    const ast = parser.parse(spec);
    
    const result = transformer.apply(ast, { strategy: 'concerns' });
    
    const readme = result.subSpecs.find(s => s.name === 'README.md');
    const refs = findReferences(readme.ast);
    
    // Internal ref becomes sub-spec ref
    expect(refs).toContainEqual({
      type: 'sub-spec',
      url: './DESIGN.md#architecture'
    });
  });
  
  it('should preserve all content', () => {
    const spec = loadFixture('spec-045-original.md');
    const ast = parser.parse(spec);
    
    const originalLines = countLines(ast);
    const result = transformer.apply(ast, { strategy: 'concerns' });
    const totalLines = result.subSpecs.reduce(
      (sum, s) => sum + countLines(s.ast),
      0
    );
    
    // Allow small difference for added headers/footers
    expect(totalLines).toBeGreaterThanOrEqual(originalLines);
    expect(totalLines).toBeLessThan(originalLines * 1.1);
  });
});
```

**File**: `src/analysis/transformer/compact.test.ts`

```typescript
describe('CompactionTransformer', () => {
  it('should remove exact duplicates', () => {
    const spec = createSpecWithDuplicates();
    
    const result = transformer.apply(spec);
    
    const duplicates = findDuplicateSections(result);
    expect(duplicates).toHaveLength(0);
  });
  
  it('should preserve decision rationale', () => {
    const spec = loadFixture('spec-with-rationale.md');
    
    const originalRationale = extractRationale(spec);
    const result = transformer.apply(spec);
    const resultRationale = extractRationale(result);
    
    expect(resultRationale).toEqual(originalRationale);
  });
  
  it('should reduce line count', () => {
    const spec = loadFixture('verbose-spec.md');
    const originalLines = countLines(spec);
    
    const result = transformer.apply(spec);
    const resultLines = countLines(result);
    
    expect(resultLines).toBeLessThan(originalLines);
  });
});
```

### Reference Manager Tests

**File**: `src/analysis/references/manager.test.ts`

```typescript
describe('ReferenceManager', () => {
  it('should find all references', () => {
    const spec = loadFixture('spec-with-refs.md');
    const refs = manager.findReferences(spec);
    
    expect(refs).toContainEqual({
      type: 'internal',
      url: '#design'
    });
    expect(refs).toContainEqual({
      type: 'sub-spec',
      url: './TESTING.md'
    });
    expect(refs).toContainEqual({
      type: 'cross-spec',
      url: '../012-sub-spec-files/'
    });
  });
  
  it('should update references after split', () => {
    const spec = loadFixture('spec-before-split.md');
    const mapping = {
      '#design': './DESIGN.md#design',
      '#testing': './TESTING.md#testing'
    };
    
    const updated = manager.updateReferences(spec, mapping);
    const refs = manager.findReferences(updated);
    
    expect(refs.find(r => r.url === '#design')).toBeUndefined();
    expect(refs.find(r => r.url === './DESIGN.md#design')).toBeDefined();
  });
  
  it('should validate references', () => {
    const spec = loadFixture('spec-with-broken-refs.md');
    const result = manager.validateReferences(spec);
    
    expect(result.passed).toBe(false);
    expect(result.errors).toContainEqual({
      message: 'Broken reference: #nonexistent'
    });
  });
});
```

## Integration Tests

### CLI Integration

**File**: `src/__tests__/cli-integration.test.ts`

```typescript
describe('CLI Integration', () => {
  beforeEach(() => {
    setupTestProject();
  });
  
  afterEach(() => {
    cleanupTestProject();
  });
  
  it('should analyze spec complexity', async () => {
    const result = await runCLI('analyze 045 --json');
    const data = JSON.parse(result.stdout);
    
    expect(data.complexity.lineCount).toBeGreaterThan(400);
    expect(data.concerns).toHaveLength(5);
  });
  
  it('should split spec into sub-specs', async () => {
    await runCLI('split 045 --force');
    
    expect(fileExists('specs/045/README.md')).toBe(true);
    expect(fileExists('specs/045/DESIGN.md')).toBe(true);
    expect(fileExists('specs/045/IMPLEMENTATION.md')).toBe(true);
    
    // Validate all files
    const result = await runCLI('validate 045');
    expect(result.code).toBe(0);
  });
  
  it('should compact verbose spec', async () => {
    const before = readFile('specs/018/README.md');
    const beforeLines = before.split('\n').length;
    
    await runCLI('compact 018 --force');
    
    const after = readFile('specs/018/README.md');
    const afterLines = after.split('\n').length;
    
    expect(afterLines).toBeLessThan(beforeLines);
  });
  
  it('should rollback transformation', async () => {
    const original = readFile('specs/045/README.md');
    
    await runCLI('split 045 --force');
    await runCLI('rollback 045');
    
    const restored = readFile('specs/045/README.md');
    expect(restored).toBe(original);
  });
});
```

### Transformation Workflows

**File**: `src/__tests__/workflows.test.ts`

```typescript
describe('Transformation Workflows', () => {
  it('should handle full split workflow', async () => {
    // 1. Analyze
    const analysis = await analyze('045');
    expect(analysis.recommendations[0].strategy).toBe('partition');
    
    // 2. Preview
    const preview = await previewSplit('045');
    expect(preview.subSpecs).toHaveLength(5);
    
    // 3. Apply
    const result = await applySplit('045');
    expect(result.success).toBe(true);
    
    // 4. Validate
    const validation = await validate('045');
    expect(validation.passed).toBe(true);
  });
  
  it('should handle compaction + split workflow', async () => {
    // Spec is verbose AND oversized
    const spec = '018';
    
    // 1. Compact first
    await compact(spec);
    
    // 2. Check if still needs split
    const analysis = await analyze(spec);
    
    if (analysis.exceedsLimit) {
      // 3. Split if needed
      await split(spec);
    }
    
    // 4. All files should be under limit
    const files = await listFiles(spec);
    for (const file of files) {
      const lines = await getLineCount(file);
      expect(lines).toBeLessThanOrEqual(400);
    }
  });
});
```

## Golden Tests

### Purpose
Capture known-good transformations as regression tests.

### Structure

```
tests/golden/
  split-045-unified-dashboard/
    input.md                  # Original spec
    expected/
      README.md               # Expected output
      DESIGN.md
      RATIONALE.md
      IMPLEMENTATION.md
      TESTING.md
  compact-018-validation/
    input.md
    expected.md
  compress-043-phases/
    input.md
    expected.md
```

### Test Implementation

```typescript
describe('Golden Tests', () => {
  const goldenDir = path.join(__dirname, 'golden');
  
  describe('split transformations', () => {
    const testCases = fs.readdirSync(goldenDir)
      .filter(name => name.startsWith('split-'));
    
    testCases.forEach(testCase => {
      it(`should match golden output: ${testCase}`, async () => {
        const inputPath = path.join(goldenDir, testCase, 'input.md');
        const expectedDir = path.join(goldenDir, testCase, 'expected');
        
        const input = fs.readFileSync(inputPath, 'utf-8');
        const ast = parser.parse(input);
        
        const result = await transformer.apply(ast, { strategy: 'auto' });
        
        // Compare each output file
        for (const subSpec of result.subSpecs) {
          const actualContent = parser.stringify(subSpec.ast);
          const expectedPath = path.join(expectedDir, subSpec.name);
          const expectedContent = fs.readFileSync(expectedPath, 'utf-8');
          
          expect(actualContent).toBe(expectedContent);
        }
      });
    });
  });
  
  describe('compact transformations', () => {
    // Similar structure for compaction tests
  });
});
```

### Updating Golden Tests

When intentionally changing transformation behavior:

```bash
# Update golden test expectations
$ npm run test:golden -- --update

# Or manually:
$ npm run transform:split -- tests/golden/split-045/input.md \
    --output tests/golden/split-045/expected/
```

## Performance Tests

### Benchmarks

```typescript
describe('Performance', () => {
  it('should parse large spec in <50ms', async () => {
    const largeSpec = createSpec({ lineCount: 2000 });
    
    const start = performance.now();
    const ast = parser.parse(largeSpec);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(50);
  });
  
  it('should analyze in <100ms', async () => {
    const spec = loadFixture('spec-045.md');
    
    const start = performance.now();
    await analyzer.analyze(spec);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(100);
  });
  
  it('should split in <500ms', async () => {
    const spec = loadFixture('spec-045.md');
    
    const start = performance.now();
    await transformer.apply(spec, { strategy: 'auto' });
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(500);
  });
  
  it('should analyze all specs in <2s', async () => {
    const specs = await loadAllSpecs();
    
    const start = performance.now();
    for (const spec of specs) {
      await analyzer.analyze(spec);
    }
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(2000);
  });
});
```

## E2E Tests

### Real-World Scenarios

```typescript
describe('E2E: Real-world usage', () => {
  it('should handle oversized spec from creation to split', async () => {
    // 1. Create new spec
    await runCLI('create test-large-spec');
    
    // 2. Add content (simulate writing)
    const specPath = 'specs/060-test-large-spec/README.md';
    fs.writeFileSync(specPath, generateLargeSpec(1200));
    
    // 3. Validate (should warn)
    const validation = await runCLI('validate 060');
    expect(validation.stderr).toContain('exceeds 400 lines');
    
    // 4. Analyze
    const analysis = await runCLI('analyze 060 --json');
    expect(JSON.parse(analysis.stdout).recommendations[0].strategy)
      .toBe('partition');
    
    // 5. Split
    await runCLI('split 060 --force');
    
    // 6. Validate all sub-specs pass
    const finalValidation = await runCLI('validate 060');
    expect(finalValidation.code).toBe(0);
  });
  
  it('should handle spec evolution: create → grow → compact → split', async () => {
    // Simulate natural spec evolution
    
    // Phase 1: Create simple spec (200 lines)
    await createSpec('test-evolution', { lines: 200 });
    
    // Phase 2: Grows to 350 lines (warning zone)
    await appendContent('test-evolution', 150);
    const warning = await runCLI('validate test-evolution');
    expect(warning.stderr).toContain('approaching limit');
    
    // Phase 3: Compact to 280 lines
    await runCLI('compact test-evolution --force');
    const postCompact = await getLineCount('test-evolution');
    expect(postCompact).toBeLessThan(300);
    
    // Phase 4: Grows to 500 lines (exceeds limit)
    await appendContent('test-evolution', 220);
    
    // Phase 5: Must split
    await runCLI('split test-evolution --force');
    
    // Phase 6: All sub-specs under limit
    const files = await listFiles('test-evolution');
    for (const file of files) {
      const lines = await getLineCount(file);
      expect(lines).toBeLessThanOrEqual(400);
    }
  });
});
```

## Test Utilities

### Test Helpers

```typescript
// tests/helpers.ts

export function createSpec(options: {
  lineCount?: number;
  sections?: number;
  nesting?: number;
}): string {
  // Generate synthetic spec with specified properties
}

export function createSpecWithSections(sectionNames: string[]): string {
  // Generate spec with specific sections
}

export function createSpecWithDuplicates(): string {
  // Generate spec with intentional duplicates
}

export function loadFixture(name: string): string {
  return fs.readFileSync(
    path.join(__dirname, 'fixtures', name),
    'utf-8'
  );
}

export async function runCLI(command: string): Promise<{
  code: number;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve) => {
    exec(`npx lspec ${command}`, (error, stdout, stderr) => {
      resolve({
        code: error?.code ?? 0,
        stdout,
        stderr
      });
    });
  });
}

export function countLines(ast: SpecAST | string): number {
  if (typeof ast === 'string') {
    return ast.split('\n').length;
  }
  // Count from AST
}
```

## Coverage Goals

### Targets

| Category | Target Coverage |
|----------|----------------|
| Overall | >85% |
| Parser | >90% |
| Analyzers | >85% |
| Transformers | >90% |
| CLI | >75% |
| Utilities | >80% |

### Measuring Coverage

```bash
# Run tests with coverage
$ npm run test:coverage

# View HTML report
$ open coverage/index.html

# CI check
$ npm run test:ci
# Fails if coverage <85%
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Run golden tests
        run: npm run test:golden
      
      - name: Check coverage
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v2
        with:
          file: ./coverage/coverage-final.json
```

## Test Fixtures

### Maintained Test Specs

Keep real-world test cases:

```
tests/fixtures/
  simple-spec.md              # Basic spec <200 lines
  medium-spec.md              # Spec at warning (350 lines)
  large-spec.md               # Spec exceeding limit (600 lines)
  spec-with-concerns.md       # Clear concern boundaries
  spec-with-phases.md         # Phase-based structure
  spec-with-refs.md           # Many cross-references
  verbose-spec.md             # Redundant content
  malformed-spec.md           # Invalid markdown
```

---

**Key Principle**: Comprehensive testing builds confidence. Test the happy path, edge cases, and failure modes. Fast tests enable rapid iteration.
