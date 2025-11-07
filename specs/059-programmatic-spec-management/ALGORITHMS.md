# Core Algorithms

**Programmatic approaches for spec analysis and transformation**

## Overview

All algorithms operate on markdown AST, not raw text. This ensures:
- ✅ Structure-aware transformations
- ✅ No corruption from regex parsing
- ✅ Deterministic results
- ✅ Fast execution (no LLM)

## Algorithm 1: Boundary Detection

**Purpose**: Identify logical boundaries where spec can be split

### Approach

Use heading hierarchy and semantic signals:

```typescript
interface Boundary {
  type: 'major' | 'minor';
  location: number;  // Line number
  confidence: number;  // 0-1
  before: SectionNode;
  after: SectionNode;
}

function detectBoundaries(ast: SpecAST): Boundary[] {
  const boundaries: Boundary[] = [];
  
  // 1. Major boundaries: H2 headings after Overview
  // These typically separate concerns
  const h2Sections = ast.sections.filter(s => s.depth === 2);
  for (const section of h2Sections) {
    if (isAfterOverview(section) && isConcernBoundary(section)) {
      boundaries.push({
        type: 'major',
        location: section.lineStart,
        confidence: calculateConfidence(section),
        before: getPreviousSection(section),
        after: section
      });
    }
  }
  
  // 2. Minor boundaries: Phase separators
  // "## Phase 1:", "## Phase 2:", etc.
  const phasePattern = /^Phase \d+:/;
  for (const section of h2Sections) {
    if (phasePattern.test(section.value)) {
      boundaries.push({
        type: 'minor',
        location: section.lineStart,
        confidence: 0.9,  // High confidence for phases
        before: getPreviousSection(section),
        after: section
      });
    }
  }
  
  return boundaries.sort((a, b) => a.location - b.location);
}

function isConcernBoundary(section: SectionNode): boolean {
  // Common concern separators
  const concernKeywords = [
    'design', 'architecture', 'implementation', 'testing',
    'rationale', 'configuration', 'api', 'migration'
  ];
  
  const titleLower = section.value.toLowerCase();
  return concernKeywords.some(kw => titleLower.includes(kw));
}

function calculateConfidence(section: SectionNode): number {
  let confidence = 0.5;  // Base confidence
  
  // Higher confidence if:
  // - Contains many subsections (implies substantial content)
  if (section.children.filter(n => n.type === 'heading').length > 3) {
    confidence += 0.2;
  }
  
  // - Has distinct vocabulary from previous section
  const similarity = calculateSimilarity(section, getPreviousSection(section));
  confidence += (1 - similarity) * 0.3;
  
  return Math.min(confidence, 1.0);
}
```

### Edge Cases

**1. Nested Sections**
```markdown
## Design
### Component Architecture
#### ComponentA
##### Props
##### Methods
```

Strategy: Only consider H2 and H3 as boundary candidates. Deeper nesting stays together.

**2. Short Sections**
```markdown
## Design
[10 lines]

## Implementation
[200 lines]
```

Strategy: Merge short sections (<30 lines) with adjacent concern.

**3. Code-Heavy Sections**
```markdown
## Examples
[5 lines of text]
[150 lines of code blocks]
```

Strategy: Treat large code blocks as single unit (don't split).

## Algorithm 2: Concern Extraction

**Purpose**: Group related sections into coherent concerns

### Approach

Clustering via content similarity and semantic relationships:

```typescript
interface Concern {
  id: string;
  name: string;
  sections: SectionNode[];
  lineCount: number;
  keywords: string[];
  dependencies: string[];  // IDs of other concerns
}

function extractConcerns(ast: SpecAST): Concern[] {
  const sections = ast.sections.filter(s => s.depth === 2);
  const concerns: Concern[] = [];
  
  // 1. Identify "anchor" sections (obvious concerns)
  const anchors = identifyAnchors(sections);
  
  // 2. Cluster remaining sections around anchors
  const clustered = clusterSections(sections, anchors);
  
  // 3. Create concerns from clusters
  for (const cluster of clustered) {
    concerns.push(createConcern(cluster));
  }
  
  // 4. Analyze dependencies between concerns
  for (const concern of concerns) {
    concern.dependencies = findDependencies(concern, concerns);
  }
  
  return concerns;
}

function identifyAnchors(sections: SectionNode[]): Map<string, SectionNode> {
  const anchors = new Map<string, SectionNode>();
  
  // Common anchor patterns
  const anchorPatterns = {
    'overview': /^(overview|introduction|background|summary)/i,
    'design': /^(design|architecture|structure)/i,
    'implementation': /^(implementation|plan|roadmap)/i,
    'testing': /^(testing|test|validation|qa)/i,
    'rationale': /^(rationale|decisions|trade-?offs|alternatives)/i,
    'configuration': /^(configuration|config|setup)/i,
  };
  
  for (const [id, pattern] of Object.entries(anchorPatterns)) {
    const match = sections.find(s => pattern.test(s.value));
    if (match) {
      anchors.set(id, match);
    }
  }
  
  return anchors;
}

function clusterSections(
  sections: SectionNode[],
  anchors: Map<string, SectionNode>
): Map<string, SectionNode[]> {
  const clusters = new Map<string, SectionNode[]>();
  
  // Initialize clusters with anchors
  for (const [id, anchor] of anchors) {
    clusters.set(id, [anchor]);
  }
  
  // Assign non-anchor sections to closest anchor
  const unassigned = sections.filter(s => 
    ![...anchors.values()].includes(s)
  );
  
  for (const section of unassigned) {
    const closestAnchor = findClosestAnchor(section, anchors);
    const cluster = clusters.get(closestAnchor);
    cluster.push(section);
  }
  
  return clusters;
}

function findClosestAnchor(
  section: SectionNode,
  anchors: Map<string, SectionNode>
): string {
  let maxSimilarity = 0;
  let closestId = 'overview';  // Default
  
  for (const [id, anchor] of anchors) {
    const similarity = calculateSimilarity(section, anchor);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      closestId = id;
    }
  }
  
  return closestId;
}

function calculateSimilarity(s1: SectionNode, s2: SectionNode): number {
  // Simple approach: Jaccard similarity of keywords
  const keywords1 = extractKeywords(s1);
  const keywords2 = extractKeywords(s2);
  
  const intersection = keywords1.filter(k => keywords2.includes(k)).length;
  const union = new Set([...keywords1, ...keywords2]).size;
  
  return intersection / union;
}

function extractKeywords(section: SectionNode): string[] {
  // Extract significant words (nouns, verbs, not stopwords)
  const text = extractText(section);
  const words = text.toLowerCase().split(/\W+/);
  
  const stopwords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
  
  return words.filter(w => 
    w.length > 3 && !stopwords.has(w)
  );
}
```

### Concern Naming

```typescript
function createConcern(cluster: SectionNode[]): Concern {
  const anchorSection = cluster[0];  // First section is anchor
  
  // Generate concern name from anchor
  const concernName = generateConcernName(anchorSection);
  
  return {
    id: concernName.toLowerCase().replace(/\s+/g, '-'),
    name: concernName,
    sections: cluster,
    lineCount: cluster.reduce((sum, s) => sum + s.lineCount, 0),
    keywords: extractKeywords(anchorSection),
    dependencies: []  // Filled in later
  };
}

function generateConcernName(anchor: SectionNode): string {
  const title = anchor.value;
  
  // Map common patterns to standard names
  const standardNames = {
    /design|architecture/i: 'Design & Architecture',
    /implementation|plan/i: 'Implementation Plan',
    /test|qa|validation/i: 'Testing Strategy',
    /rationale|decision/i: 'Rationale & Trade-offs',
    /config/i: 'Configuration',
    /api/i: 'API Design',
  };
  
  for (const [pattern, name] of Object.entries(standardNames)) {
    if (pattern.test(title)) {
      return name;
    }
  }
  
  // Default: Use section title
  return title;
}
```

## Algorithm 3: Redundancy Detection

**Purpose**: Find duplicate or similar content

### Approach

Text similarity with semantic awareness:

```typescript
interface Duplicate {
  sections: SectionNode[];
  similarity: number;
  linesSaved: number;
}

interface RedundancyReport {
  duplicates: Duplicate[];
  totalLinesSaved: number;
}

function detectRedundancy(ast: SpecAST): RedundancyReport {
  const sections = ast.sections;
  const duplicates: Duplicate[] = [];
  
  // 1. Exact duplicates (fast path)
  const exactDupes = findExactDuplicates(sections);
  duplicates.push(...exactDupes);
  
  // 2. Near-duplicates (fuzzy matching)
  const nearDupes = findNearDuplicates(sections);
  duplicates.push(...nearDupes);
  
  // 3. Redundant patterns (e.g., repeated examples)
  const patterns = findRedundantPatterns(sections);
  duplicates.push(...patterns);
  
  const totalLinesSaved = duplicates.reduce(
    (sum, d) => sum + d.linesSaved,
    0
  );
  
  return { duplicates, totalLinesSaved };
}

function findExactDuplicates(sections: SectionNode[]): Duplicate[] {
  const contentMap = new Map<string, SectionNode[]>();
  
  for (const section of sections) {
    const content = normalizeContent(section);
    if (!contentMap.has(content)) {
      contentMap.set(content, []);
    }
    contentMap.get(content).push(section);
  }
  
  const duplicates: Duplicate[] = [];
  for (const [content, sections] of contentMap) {
    if (sections.length > 1) {
      duplicates.push({
        sections,
        similarity: 1.0,  // Exact match
        linesSaved: (sections.length - 1) * sections[0].lineCount
      });
    }
  }
  
  return duplicates;
}

function normalizeContent(section: SectionNode): string {
  const text = extractText(section);
  
  // Normalize:
  // - Remove extra whitespace
  // - Lowercase
  // - Remove punctuation
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

function findNearDuplicates(sections: SectionNode[]): Duplicate[] {
  const duplicates: Duplicate[] = [];
  const threshold = 0.85;  // 85% similarity
  
  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++) {
      const similarity = calculateSimilarity(sections[i], sections[j]);
      
      if (similarity >= threshold) {
        duplicates.push({
          sections: [sections[i], sections[j]],
          similarity,
          linesSaved: Math.min(
            sections[i].lineCount,
            sections[j].lineCount
          )
        });
      }
    }
  }
  
  return duplicates;
}

function findRedundantPatterns(sections: SectionNode[]): Duplicate[] {
  const duplicates: Duplicate[] = [];
  
  // Pattern 1: Repeated code examples
  const codeBlocks = sections.flatMap(s =>
    s.children.filter(n => n.type === 'code')
  );
  
  for (let i = 0; i < codeBlocks.length; i++) {
    for (let j = i + 1; j < codeBlocks.length; j++) {
      if (isSimilarCode(codeBlocks[i], codeBlocks[j])) {
        duplicates.push({
          sections: [
            findParentSection(codeBlocks[i]),
            findParentSection(codeBlocks[j])
          ],
          similarity: 0.9,
          linesSaved: codeBlocks[j].lineCount
        });
      }
    }
  }
  
  // Pattern 2: Repeated lists (e.g., feature lists)
  // Pattern 3: Repeated tables
  // ... (similar approaches)
  
  return duplicates;
}
```

## Algorithm 4: Reference Updating

**Purpose**: Maintain cross-reference integrity after transformations

### Approach

Build reference graph, apply mapping, validate:

```typescript
interface ReferenceGraph {
  nodes: Map<string, ReferenceNode>;
  edges: Map<string, Set<string>>;
}

interface ReferenceMapping {
  [oldTarget: string]: string;  // oldTarget => newTarget
}

function updateReferences(
  ast: SpecAST,
  mapping: ReferenceMapping
): SpecAST {
  // 1. Build reference graph
  const graph = buildReferenceGraph(ast);
  
  // 2. Apply mapping to update references
  const updated = applyMapping(ast, graph, mapping);
  
  // 3. Validate all references resolve
  validateReferences(updated);
  
  return updated;
}

function buildReferenceGraph(ast: SpecAST): ReferenceGraph {
  const nodes = new Map<string, ReferenceNode>();
  const edges = new Map<string, Set<string>>();
  
  // Traverse AST to find all references
  visit(ast, 'link', (node: LinkNode) => {
    const ref = parseReference(node.url);
    nodes.set(node.url, ref);
    
    // Track edges (which sections reference which)
    const source = findParentSection(node);
    if (!edges.has(source.id)) {
      edges.set(source.id, new Set());
    }
    edges.get(source.id).add(node.url);
  });
  
  return { nodes, edges };
}

function applyMapping(
  ast: SpecAST,
  graph: ReferenceGraph,
  mapping: ReferenceMapping
): SpecAST {
  // Clone AST for immutability
  const updated = cloneAST(ast);
  
  // Update each reference according to mapping
  visit(updated, 'link', (node: LinkNode) => {
    if (mapping[node.url]) {
      node.url = mapping[node.url];
    }
  });
  
  return updated;
}

function generateMapping(transformation: Transformation): ReferenceMapping {
  const mapping: ReferenceMapping = {};
  
  if (transformation.type === 'partition') {
    // When splitting into sub-specs:
    // - Internal section refs → sub-spec file refs
    // - Cross-references remain unchanged
    
    for (const subSpec of transformation.subSpecs) {
      for (const section of subSpec.sections) {
        const oldTarget = `#${section.id}`;
        const newTarget = `./${subSpec.fileName}#${section.id}`;
        mapping[oldTarget] = newTarget;
      }
    }
  }
  
  if (transformation.type === 'isolate') {
    // When extracting to new spec:
    // - Extracted section refs → cross-spec refs
    
    const concern = transformation.extractedConcern;
    for (const section of concern.sections) {
      const oldTarget = `#${section.id}`;
      const newTarget = `../${transformation.newSpecName}/README.md#${section.id}`;
      mapping[oldTarget] = newTarget;
    }
  }
  
  return mapping;
}
```

### Reference Types

**1. Internal (same file)**:
```markdown
[see Design](#design)
→ stays same (if not split)
→ becomes ./DESIGN.md#design (if split)
```

**2. Sub-spec (same spec folder)**:
```markdown
[see TESTING.md](./TESTING.md)
→ stays same (already sub-spec)
```

**3. Cross-spec (different spec)**:
```markdown
[spec 012](../012-sub-spec-files/)
→ stays same (different spec)
```

**4. External**:
```markdown
[MDN](https://developer.mozilla.org/...)
→ stays same (external)
```

## Algorithm 5: Sub-Spec Creation

**Purpose**: Generate well-formed sub-spec files

### Approach

Extract content, add context, validate:

```typescript
interface SubSpecFile {
  name: string;  // e.g., 'DESIGN.md'
  concern: Concern;
  content: string;
}

function createSubSpec(
  parentSpec: SpecAST,
  concern: Concern
): SubSpecFile {
  // 1. Extract sections for this concern
  const sections = extractSections(parentSpec, concern);
  
  // 2. Build sub-spec AST
  const ast = buildSubSpecAST(parentSpec, concern, sections);
  
  // 3. Generate markdown
  const content = stringifyAST(ast);
  
  // 4. Validate
  validateSubSpec(ast);
  
  return {
    name: generateFileName(concern),
    concern,
    content
  };
}

function buildSubSpecAST(
  parent: SpecAST,
  concern: Concern,
  sections: SectionNode[]
): SpecAST {
  return {
    type: 'root',
    children: [
      // Header with context
      createHeading(1, concern.name),
      createParagraph(`Detailed ${concern.name.toLowerCase()} for ${parent.title}`),
      createParagraph(`Part of [${parent.name}](./README.md)`),
      
      // Sections from concern
      ...sections,
      
      // Footer with navigation
      createHeading(2, 'Related'),
      createList([
        `[Overview](./README.md)`,
        ...getRelatedSubSpecs(concern)
      ])
    ]
  };
}

function generateFileName(concern: Concern): string {
  // Standard names for common concerns
  const standardNames = {
    'design': 'DESIGN.md',
    'implementation': 'IMPLEMENTATION.md',
    'testing': 'TESTING.md',
    'rationale': 'RATIONALE.md',
    'configuration': 'CONFIGURATION.md',
  };
  
  const key = concern.id.replace(/-/g, '');
  if (standardNames[key]) {
    return standardNames[key];
  }
  
  // Custom concern: Use ALL-CAPS with concern name
  return `${concern.id.toUpperCase()}.md`;
}
```

## Algorithm 6: Compaction

**Purpose**: Remove redundancy while preserving signal

### Approach

Multi-pass optimization:

```typescript
function compactSpec(ast: SpecAST, options: CompactionOptions): SpecAST {
  let compacted = cloneAST(ast);
  
  // Pass 1: Remove exact duplicates
  compacted = removeDuplicates(compacted);
  
  // Pass 2: Consolidate references
  compacted = consolidateReferences(compacted);
  
  // Pass 3: Remove inferable content
  if (options.aggressive) {
    compacted = removeInferableContent(compacted);
  }
  
  // Pass 4: Merge similar sections
  compacted = mergeSimilarSections(compacted);
  
  return compacted;
}

function removeDuplicates(ast: SpecAST): SpecAST {
  const seen = new Set<string>();
  
  return filterSections(ast, section => {
    const normalized = normalizeContent(section);
    if (seen.has(normalized)) {
      return false;  // Remove duplicate
    }
    seen.add(normalized);
    return true;  // Keep first occurrence
  });
}

function consolidateReferences(ast: SpecAST): SpecAST {
  // Find repeated references that can be defined once
  const refs = findReferences(ast);
  const repeated = refs.filter(r => r.count > 1);
  
  // Convert to reference-style links
  for (const ref of repeated) {
    replaceWithReferenceLink(ast, ref);
  }
  
  // Add reference definitions at bottom
  addReferenceDefinitions(ast, repeated);
  
  return ast;
}

function removeInferableContent(ast: SpecAST): SpecAST {
  // Remove obvious statements
  const obviousPatterns = [
    /^ESLint (is|will) lint/i,
    /^TypeScript (is|provides) type/i,
    /^The .+ (will|is going to) be/i,
  ];
  
  return filterContent(ast, node => {
    if (node.type === 'paragraph') {
      const text = extractText(node);
      return !obviousPatterns.some(p => p.test(text));
    }
    return true;
  });
}
```

## Performance Optimization

### Caching Strategy

```typescript
class AnalysisCache {
  private cache = new Map<string, CacheEntry>();
  
  get(specPath: string, contentHash: string): AnalysisResult | null {
    const entry = this.cache.get(specPath);
    if (entry && entry.hash === contentHash) {
      return entry.result;
    }
    return null;
  }
  
  set(specPath: string, contentHash: string, result: AnalysisResult) {
    this.cache.set(specPath, { hash: contentHash, result });
  }
}

function analyzeWithCache(specPath: string): AnalysisResult {
  const content = readFileSync(specPath, 'utf-8');
  const hash = createHash('md5').update(content).digest('hex');
  
  const cached = cache.get(specPath, hash);
  if (cached) {
    return cached;  // 🚀 Fast path
  }
  
  const result = analyze(content);
  cache.set(specPath, hash, result);
  return result;
}
```

### Streaming for Large Projects

```typescript
async function* analyzeAllSpecs(
  specsDir: string
): AsyncGenerator<AnalysisResult> {
  const specs = await listSpecs(specsDir);
  
  for (const spec of specs) {
    // Skip small specs (unlikely to need work)
    const lineCount = await getLineCount(spec);
    if (lineCount < 200) {
      continue;
    }
    
    // Analyze and yield
    const result = await analyzeWithCache(spec);
    yield result;
  }
}

// Usage:
for await (const result of analyzeAllSpecs('./specs')) {
  console.log(`Analyzed ${result.spec}: ${result.complexity.score}/100`);
}
```

---

**Key Principle**: Algorithms must be fast, deterministic, and structure-aware. No regex parsing of markdown, always use AST.
