/**
 * Tests for spec relationships computation
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeRelationshipList,
  extractDependsOn,
  computeSpecRelationships,
  buildRelationshipMap,
  enrichSpecsWithRelationships,
} from '../relationships';
import type { Spec } from '../../db/schema';

// Helper to create mock specs
function createMockSpec(overrides: Partial<Spec> = {}): Spec {
  return {
    id: 'test-id',
    projectId: 'test-project',
    specNumber: 1,
    specName: 'test-spec',
    title: 'Test Spec',
    status: 'planned',
    priority: null,
    tags: null,
    assignee: null,
    contentMd: '# Test Spec\n\nDescription',
    contentHtml: null,
    createdAt: new Date(),
    updatedAt: null,
    completedAt: null,
    filePath: 'specs/001-test-spec/README.md',
    githubUrl: null,
    syncedAt: new Date(),
    ...overrides,
  };
}

describe('normalizeRelationshipList', () => {
  it('returns empty array for undefined', () => {
    expect(normalizeRelationshipList(undefined)).toEqual([]);
  });

  it('returns empty array for null', () => {
    expect(normalizeRelationshipList(null)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(normalizeRelationshipList('')).toEqual([]);
  });

  it('returns array with single string value', () => {
    expect(normalizeRelationshipList('spec-a')).toEqual(['spec-a']);
  });

  it('returns array values as-is', () => {
    expect(normalizeRelationshipList(['spec-a', 'spec-b'])).toEqual(['spec-a', 'spec-b']);
  });

  it('trims whitespace', () => {
    expect(normalizeRelationshipList(['  spec-a  ', 'spec-b'])).toEqual(['spec-a', 'spec-b']);
  });

  it('filters empty values', () => {
    expect(normalizeRelationshipList(['spec-a', '', 'spec-b'])).toEqual(['spec-a', 'spec-b']);
  });

  it('converts non-string array elements to strings', () => {
    expect(normalizeRelationshipList([1, 2])).toEqual(['1', '2']);
  });
});

describe('extractDependsOn', () => {
  it('extracts depends_on from frontmatter string', () => {
    const content = `---
depends_on:
  - spec-a
  - spec-b
---

# Test Spec`;
    expect(extractDependsOn(content)).toEqual(['spec-a', 'spec-b']);
  });

  it('handles dependsOn alias', () => {
    const content = `---
dependsOn:
  - spec-a
---

# Test Spec`;
    expect(extractDependsOn(content)).toEqual(['spec-a']);
  });

  it('prefers depends_on over dependsOn', () => {
    const content = `---
depends_on:
  - from-depends-on
dependsOn:
  - from-dependsOn
---

# Test Spec`;
    expect(extractDependsOn(content)).toEqual(['from-depends-on']);
  });

  it('extracts from frontmatter object', () => {
    const frontmatter = {
      depends_on: ['spec-a', 'spec-b'],
    };
    expect(extractDependsOn(frontmatter)).toEqual(['spec-a', 'spec-b']);
  });

  it('returns empty array for content without frontmatter', () => {
    const content = '# Test Spec\n\nNo frontmatter here';
    expect(extractDependsOn(content)).toEqual([]);
  });

  it('returns empty array for invalid frontmatter', () => {
    const content = '---invalid yaml---';
    expect(extractDependsOn(content)).toEqual([]);
  });
});

describe('computeSpecRelationships', () => {
  it('computes dependsOn from spec content', () => {
    const spec = createMockSpec({
      specName: 'spec-c',
      contentMd: `---
depends_on:
  - spec-a
  - spec-b
---

# Spec C`,
    });
    const allSpecs = [spec];
    
    const result = computeSpecRelationships(spec, allSpecs);
    
    expect(result.dependsOn).toEqual(['spec-a', 'spec-b']);
    expect(result.requiredBy).toEqual([]);
  });

  it('computes requiredBy from other specs', () => {
    const specA = createMockSpec({
      specName: 'spec-a',
      contentMd: '# Spec A',
    });
    const specB = createMockSpec({
      specName: 'spec-b',
      contentMd: `---
depends_on:
  - spec-a
---

# Spec B`,
    });
    const specC = createMockSpec({
      specName: 'spec-c',
      contentMd: `---
depends_on:
  - spec-a
---

# Spec C`,
    });
    
    const allSpecs = [specA, specB, specC];
    const result = computeSpecRelationships(specA, allSpecs);
    
    expect(result.dependsOn).toEqual([]);
    expect(result.requiredBy).toContain('spec-b');
    expect(result.requiredBy).toContain('spec-c');
  });
});

describe('buildRelationshipMap', () => {
  it('builds complete relationship map for all specs', () => {
    const specA = createMockSpec({
      specName: 'spec-a',
      contentMd: '# Spec A',
    });
    const specB = createMockSpec({
      specName: 'spec-b',
      contentMd: `---
depends_on:
  - spec-a
---

# Spec B`,
    });
    const specC = createMockSpec({
      specName: 'spec-c',
      contentMd: `---
depends_on:
  - spec-b
---

# Spec C`,
    });
    
    const specs = [specA, specB, specC];
    const map = buildRelationshipMap(specs);
    
    // spec-a: no deps, required by spec-b
    expect(map.get('spec-a')).toEqual({
      dependsOn: [],
      requiredBy: ['spec-b'],
    });
    
    // spec-b: depends on spec-a, required by spec-c
    expect(map.get('spec-b')).toEqual({
      dependsOn: ['spec-a'],
      requiredBy: ['spec-c'],
    });
    
    // spec-c: depends on spec-b, not required by anyone
    expect(map.get('spec-c')).toEqual({
      dependsOn: ['spec-b'],
      requiredBy: [],
    });
  });
});

describe('enrichSpecsWithRelationships', () => {
  it('adds relationships to each spec', () => {
    const specA = createMockSpec({
      specName: 'spec-a',
      contentMd: '# Spec A',
    });
    const specB = createMockSpec({
      specName: 'spec-b',
      contentMd: `---
depends_on:
  - spec-a
---

# Spec B`,
    });
    
    const specs = [specA, specB];
    const enriched = enrichSpecsWithRelationships(specs);
    
    expect(enriched[0].relationships).toEqual({
      dependsOn: [],
      requiredBy: ['spec-b'],
    });
    
    expect(enriched[1].relationships).toEqual({
      dependsOn: ['spec-a'],
      requiredBy: [],
    });
  });
});
