/**
 * Dependency Graph for LeanSpec
 * 
 * Builds an in-memory graph of all spec relationships for efficient querying.
 * Handles three types of relationships:
 * - dependsOn: Upstream dependencies (current spec depends on these)
 * - requiredBy: Downstream dependents (these specs depend on current)
 * - related: Bidirectional informational connections
 */

import type { SpecInfo } from '../types/spec.js';

/**
 * A node in the dependency graph
 */
interface DependencyNode {
  dependsOn: Set<string>;    // Upstream (current depends on these)
  requiredBy: Set<string>;   // Downstream (these depend on current)
  related: Set<string>;      // Bidirectional connections
}

/**
 * Complete dependency information for a spec
 */
export interface CompleteDependencyGraph {
  current: SpecInfo;
  dependsOn: SpecInfo[];      // Upstream (current depends on these)
  requiredBy: SpecInfo[];     // Downstream (these depend on current)
  related: SpecInfo[];        // Bidirectional (includes both directions)
}

/**
 * Impact radius showing all specs affected by changes
 */
export interface ImpactRadius {
  current: SpecInfo;
  upstream: SpecInfo[];       // What this spec needs
  downstream: SpecInfo[];     // What needs this spec
  related: SpecInfo[];        // Connected work
}

/**
 * Manages the dependency graph for all specs
 */
export class SpecDependencyGraph {
  private graph: Map<string, DependencyNode>;
  private specs: Map<string, SpecInfo>;

  constructor(allSpecs: SpecInfo[]) {
    this.graph = new Map();
    this.specs = new Map();
    this.buildGraph(allSpecs);
  }

  /**
   * Build the complete dependency graph from all specs
   */
  private buildGraph(specs: SpecInfo[]): void {
    // First pass: Initialize all nodes and store spec metadata
    for (const spec of specs) {
      this.specs.set(spec.path, spec);
      this.graph.set(spec.path, {
        dependsOn: new Set(spec.frontmatter.depends_on || []),
        requiredBy: new Set(),
        related: new Set(spec.frontmatter.related || []),
      });
    }

    // Second pass: Build reverse edges
    for (const [specPath, node] of this.graph.entries()) {
      // For each dependsOn, add reverse requiredBy edge
      for (const dep of node.dependsOn) {
        const depNode = this.graph.get(dep);
        if (depNode) {
          depNode.requiredBy.add(specPath);
        }
      }
      
      // For each related, add bidirectional link
      for (const rel of node.related) {
        const relNode = this.graph.get(rel);
        if (relNode) {
          relNode.related.add(specPath);
        }
      }
    }
  }

  /**
   * Get complete dependency graph for a spec
   */
  getCompleteGraph(specPath: string): CompleteDependencyGraph {
    const spec = this.specs.get(specPath);
    if (!spec) {
      throw new Error(`Spec not found: ${specPath}`);
    }

    const node = this.graph.get(specPath);
    if (!node) {
      throw new Error(`Graph node not found: ${specPath}`);
    }

    return {
      current: spec,
      dependsOn: this.getSpecsByPaths(Array.from(node.dependsOn)),
      requiredBy: this.getSpecsByPaths(Array.from(node.requiredBy)),
      related: this.getSpecsByPaths(Array.from(node.related)),
    };
  }

  /**
   * Get upstream dependencies (specs this one depends on)
   * Recursively traverses the dependsOn chain up to maxDepth
   */
  getUpstream(specPath: string, maxDepth: number = 3): SpecInfo[] {
    const visited = new Set<string>();
    const result: SpecInfo[] = [];
    
    const traverse = (path: string, depth: number) => {
      if (visited.has(path)) {
        return;
      }
      
      visited.add(path);
      const node = this.graph.get(path);
      if (!node) return;
      
      for (const dep of node.dependsOn) {
        if (!visited.has(dep)) {
          // Only add and traverse if we haven't exceeded maxDepth
          if (depth < maxDepth) {
            const spec = this.specs.get(dep);
            if (spec) {
              result.push(spec);
              traverse(dep, depth + 1);
            }
          }
        }
      }
    };
    
    traverse(specPath, 0);
    return result;
  }

  /**
   * Get downstream dependents (specs that depend on this one)
   * Recursively traverses the requiredBy chain up to maxDepth
   */
  getDownstream(specPath: string, maxDepth: number = 3): SpecInfo[] {
    const visited = new Set<string>();
    const result: SpecInfo[] = [];
    
    const traverse = (path: string, depth: number) => {
      if (visited.has(path)) {
        return;
      }
      
      visited.add(path);
      const node = this.graph.get(path);
      if (!node) return;
      
      for (const dep of node.requiredBy) {
        if (!visited.has(dep)) {
          // Only add and traverse if we haven't exceeded maxDepth
          if (depth < maxDepth) {
            const spec = this.specs.get(dep);
            if (spec) {
              result.push(spec);
              traverse(dep, depth + 1);
            }
          }
        }
      }
    };
    
    traverse(specPath, 0);
    return result;
  }

  /**
   * Get impact radius - all specs affected by changes to this spec
   * Includes upstream dependencies, downstream dependents, and related specs
   */
  getImpactRadius(specPath: string, maxDepth: number = 3): ImpactRadius {
    const spec = this.specs.get(specPath);
    if (!spec) {
      throw new Error(`Spec not found: ${specPath}`);
    }

    const node = this.graph.get(specPath);
    if (!node) {
      throw new Error(`Graph node not found: ${specPath}`);
    }

    return {
      current: spec,
      upstream: this.getUpstream(specPath, maxDepth),
      downstream: this.getDownstream(specPath, maxDepth),
      related: this.getSpecsByPaths(Array.from(node.related)),
    };
  }

  /**
   * Check if a circular dependency exists
   */
  hasCircularDependency(specPath: string): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (path: string): boolean => {
      if (recursionStack.has(path)) {
        return true;
      }
      
      if (visited.has(path)) {
        return false;
      }
      
      visited.add(path);
      recursionStack.add(path);
      
      const node = this.graph.get(path);
      if (node) {
        for (const dep of node.dependsOn) {
          if (hasCycle(dep)) {
            return true;
          }
        }
      }
      
      recursionStack.delete(path);
      return false;
    };
    
    return hasCycle(specPath);
  }

  /**
   * Get all specs in the graph
   */
  getAllSpecs(): SpecInfo[] {
    return Array.from(this.specs.values());
  }

  /**
   * Get specs by their paths
   */
  private getSpecsByPaths(paths: string[]): SpecInfo[] {
    return paths
      .map(path => this.specs.get(path))
      .filter((spec): spec is SpecInfo => spec !== undefined);
  }
}
