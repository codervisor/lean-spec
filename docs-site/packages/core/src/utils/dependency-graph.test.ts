import { describe, it, expect } from 'vitest';
import { SpecDependencyGraph } from './dependency-graph.js';
import type { SpecInfo } from '../types/spec.js';

// Helper to create test specs
function createSpec(path: string, dependsOn: string[] = [], related: string[] = []): SpecInfo {
  return {
    path,
    fullPath: `/test/${path}`,
    filePath: `/test/${path}/README.md`,
    name: path,
    frontmatter: {
      status: 'planned',
      created: '2025-01-01',
      depends_on: dependsOn,
      related,
    },
  };
}

describe('SpecDependencyGraph', () => {
  describe('graph construction', () => {
    it('should build graph from specs', () => {
      const specs = [
        createSpec('001-spec-a'),
        createSpec('002-spec-b', ['001-spec-a']),
        createSpec('003-spec-c', ['002-spec-b']),
      ];

      const graph = new SpecDependencyGraph(specs);
      expect(graph).toBeDefined();
    });

    it('should handle empty spec list', () => {
      const graph = new SpecDependencyGraph([]);
      expect(graph).toBeDefined();
      expect(graph.getAllSpecs()).toHaveLength(0);
    });

    it('should build reverse edges (requiredBy)', () => {
      const specs = [
        createSpec('001-base'),
        createSpec('002-depends-on-base', ['001-base']),
      ];

      const graph = new SpecDependencyGraph(specs);
      const baseGraph = graph.getCompleteGraph('001-base');
      
      expect(baseGraph.requiredBy).toHaveLength(1);
      expect(baseGraph.requiredBy[0].path).toBe('002-depends-on-base');
    });

    it('should build bidirectional related links', () => {
      const specs = [
        createSpec('001-spec-a', [], ['002-spec-b']),
        createSpec('002-spec-b'),
      ];

      const graph = new SpecDependencyGraph(specs);
      const graphA = graph.getCompleteGraph('001-spec-a');
      const graphB = graph.getCompleteGraph('002-spec-b');
      
      // A lists B as related
      expect(graphA.related).toHaveLength(1);
      expect(graphA.related[0].path).toBe('002-spec-b');
      
      // B also sees A as related (bidirectional)
      expect(graphB.related).toHaveLength(1);
      expect(graphB.related[0].path).toBe('001-spec-a');
    });
  });

  describe('getCompleteGraph', () => {
    it('should return complete graph for spec', () => {
      const specs = [
        createSpec('001-base'),
        createSpec('002-middle', ['001-base'], ['004-related']),
        createSpec('003-top', ['002-middle']),
        createSpec('004-related'),
      ];

      const graph = new SpecDependencyGraph(specs);
      const middleGraph = graph.getCompleteGraph('002-middle');
      
      expect(middleGraph.current.path).toBe('002-middle');
      expect(middleGraph.dependsOn).toHaveLength(1);
      expect(middleGraph.dependsOn[0].path).toBe('001-base');
      expect(middleGraph.requiredBy).toHaveLength(1);
      expect(middleGraph.requiredBy[0].path).toBe('003-top');
      expect(middleGraph.related).toHaveLength(1);
      expect(middleGraph.related[0].path).toBe('004-related');
    });

    it('should throw error for non-existent spec', () => {
      const graph = new SpecDependencyGraph([createSpec('001-spec')]);
      
      expect(() => graph.getCompleteGraph('999-missing')).toThrow('Spec not found');
    });

    it('should handle spec with no dependencies', () => {
      const specs = [createSpec('001-isolated')];
      const graph = new SpecDependencyGraph(specs);
      const isolated = graph.getCompleteGraph('001-isolated');
      
      expect(isolated.dependsOn).toHaveLength(0);
      expect(isolated.requiredBy).toHaveLength(0);
      expect(isolated.related).toHaveLength(0);
    });
  });

  describe('getUpstream', () => {
    it('should get direct upstream dependencies', () => {
      const specs = [
        createSpec('001-base'),
        createSpec('002-middle', ['001-base']),
      ];

      const graph = new SpecDependencyGraph(specs);
      const upstream = graph.getUpstream('002-middle');
      
      expect(upstream).toHaveLength(1);
      expect(upstream[0].path).toBe('001-base');
    });

    it('should traverse upstream chain', () => {
      const specs = [
        createSpec('001-base'),
        createSpec('002-middle', ['001-base']),
        createSpec('003-top', ['002-middle']),
      ];

      const graph = new SpecDependencyGraph(specs);
      const upstream = graph.getUpstream('003-top');
      
      expect(upstream).toHaveLength(2);
      expect(upstream.map(s => s.path)).toContain('002-middle');
      expect(upstream.map(s => s.path)).toContain('001-base');
    });

    it('should respect maxDepth', () => {
      const specs = [
        createSpec('001-level-1'),
        createSpec('002-level-2', ['001-level-1']),
        createSpec('003-level-3', ['002-level-2']),
        createSpec('004-level-4', ['003-level-3']),
      ];

      const graph = new SpecDependencyGraph(specs);
      const upstream = graph.getUpstream('004-level-4', 1);
      
      // maxDepth=1 means we can go 1 level deep from the starting spec
      // 004 -> 003 (level 1) -> stop
      // Should get level 3 only
      expect(upstream).toHaveLength(1);
      expect(upstream[0].path).toBe('003-level-3');
    });

    it('should handle circular dependencies gracefully', () => {
      const specs = [
        createSpec('001-a', ['002-b']),
        createSpec('002-b', ['001-a']),
      ];

      const graph = new SpecDependencyGraph(specs);
      const upstream = graph.getUpstream('001-a');
      
      // Should return 002-b without infinite loop
      expect(upstream).toHaveLength(1);
      expect(upstream[0].path).toBe('002-b');
    });
  });

  describe('getDownstream', () => {
    it('should get direct downstream dependents', () => {
      const specs = [
        createSpec('001-base'),
        createSpec('002-depends', ['001-base']),
      ];

      const graph = new SpecDependencyGraph(specs);
      const downstream = graph.getDownstream('001-base');
      
      expect(downstream).toHaveLength(1);
      expect(downstream[0].path).toBe('002-depends');
    });

    it('should traverse downstream chain', () => {
      const specs = [
        createSpec('001-base'),
        createSpec('002-middle', ['001-base']),
        createSpec('003-top', ['002-middle']),
      ];

      const graph = new SpecDependencyGraph(specs);
      const downstream = graph.getDownstream('001-base');
      
      expect(downstream).toHaveLength(2);
      expect(downstream.map(s => s.path)).toContain('002-middle');
      expect(downstream.map(s => s.path)).toContain('003-top');
    });

    it('should respect maxDepth', () => {
      const specs = [
        createSpec('001-base'),
        createSpec('002-level-1', ['001-base']),
        createSpec('003-level-2', ['002-level-1']),
        createSpec('004-level-3', ['003-level-2']),
      ];

      const graph = new SpecDependencyGraph(specs);
      const downstream = graph.getDownstream('001-base', 1);
      
      // Should only get level 1, not levels 2 and 3
      expect(downstream).toHaveLength(1);
      expect(downstream[0].path).toBe('002-level-1');
    });
  });

  describe('getImpactRadius', () => {
    it('should return all affected specs', () => {
      const specs = [
        createSpec('001-base'),
        createSpec('002-middle', ['001-base'], ['004-related']),
        createSpec('003-top', ['002-middle']),
        createSpec('004-related'),
      ];

      const graph = new SpecDependencyGraph(specs);
      const impact = graph.getImpactRadius('002-middle');
      
      expect(impact.current.path).toBe('002-middle');
      expect(impact.upstream).toHaveLength(1);
      expect(impact.upstream[0].path).toBe('001-base');
      expect(impact.downstream).toHaveLength(1);
      expect(impact.downstream[0].path).toBe('003-top');
      expect(impact.related).toHaveLength(1);
      expect(impact.related[0].path).toBe('004-related');
    });

    it('should throw error for non-existent spec', () => {
      const graph = new SpecDependencyGraph([createSpec('001-spec')]);
      
      expect(() => graph.getImpactRadius('999-missing')).toThrow('Spec not found');
    });
  });

  describe('hasCircularDependency', () => {
    it('should detect circular dependency', () => {
      const specs = [
        createSpec('001-a', ['002-b']),
        createSpec('002-b', ['003-c']),
        createSpec('003-c', ['001-a']),
      ];

      const graph = new SpecDependencyGraph(specs);
      expect(graph.hasCircularDependency('001-a')).toBe(true);
      expect(graph.hasCircularDependency('002-b')).toBe(true);
      expect(graph.hasCircularDependency('003-c')).toBe(true);
    });

    it('should return false for acyclic graph', () => {
      const specs = [
        createSpec('001-base'),
        createSpec('002-middle', ['001-base']),
        createSpec('003-top', ['002-middle']),
      ];

      const graph = new SpecDependencyGraph(specs);
      expect(graph.hasCircularDependency('001-base')).toBe(false);
      expect(graph.hasCircularDependency('002-middle')).toBe(false);
      expect(graph.hasCircularDependency('003-top')).toBe(false);
    });

    it('should handle self-loop', () => {
      const specs = [createSpec('001-self', ['001-self'])];

      const graph = new SpecDependencyGraph(specs);
      expect(graph.hasCircularDependency('001-self')).toBe(true);
    });
  });

  describe('getAllSpecs', () => {
    it('should return all specs', () => {
      const specs = [
        createSpec('001-spec-a'),
        createSpec('002-spec-b'),
        createSpec('003-spec-c'),
      ];

      const graph = new SpecDependencyGraph(specs);
      const allSpecs = graph.getAllSpecs();
      
      expect(allSpecs).toHaveLength(3);
      expect(allSpecs.map(s => s.path)).toContain('001-spec-a');
      expect(allSpecs.map(s => s.path)).toContain('002-spec-b');
      expect(allSpecs.map(s => s.path)).toContain('003-spec-c');
    });
  });

  describe('edge cases', () => {
    it('should handle missing dependencies gracefully', () => {
      const specs = [
        createSpec('001-spec', ['999-missing']),
      ];

      const graph = new SpecDependencyGraph(specs);
      const complete = graph.getCompleteGraph('001-spec');
      
      // Should not include missing dependency
      expect(complete.dependsOn).toHaveLength(0);
    });

    it('should handle missing related specs gracefully', () => {
      const specs = [
        createSpec('001-spec', [], ['999-missing']),
      ];

      const graph = new SpecDependencyGraph(specs);
      const complete = graph.getCompleteGraph('001-spec');
      
      // Should not include missing related spec
      expect(complete.related).toHaveLength(0);
    });

    it('should deduplicate multiple paths to same spec', () => {
      const specs = [
        createSpec('001-base'),
        createSpec('002-middle-a', ['001-base']),
        createSpec('003-middle-b', ['001-base']),
        createSpec('004-top', ['002-middle-a', '003-middle-b']),
      ];

      const graph = new SpecDependencyGraph(specs);
      const upstream = graph.getUpstream('004-top');
      
      // Should include 001-base only once even though reached via two paths
      const baseCount = upstream.filter(s => s.path === '001-base').length;
      expect(baseCount).toBe(1);
    });
  });
});
