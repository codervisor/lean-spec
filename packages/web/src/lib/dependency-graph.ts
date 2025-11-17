/**
 * Dependency Graph for Web API
 * Standalone implementation to avoid tiktoken wasm issues from @leanspec/core
 */

export interface SpecFrontmatter {
  status: string;
  created: string;
  depends_on?: string[];
  related?: string[];
  priority?: string;
  tags?: string[];
  assignee?: string;
}

export interface SpecInfo {
  path: string;
  fullPath: string;
  filePath: string;
  name: string;
  frontmatter: SpecFrontmatter;
}

interface DependencyNode {
  dependsOn: Set<string>;
  requiredBy: Set<string>;
  related: Set<string>;
}

export interface CompleteDependencyGraph {
  current: SpecInfo;
  dependsOn: SpecInfo[];
  requiredBy: SpecInfo[];
  related: SpecInfo[];
}

/**
 * Dependency graph builder
 */
export class SpecDependencyGraph {
  private graph: Map<string, DependencyNode>;
  private specs: Map<string, SpecInfo>;

  constructor(allSpecs: SpecInfo[]) {
    this.graph = new Map();
    this.specs = new Map();
    this.buildGraph(allSpecs);
  }

  private buildGraph(specs: SpecInfo[]): void {
    // First pass: Initialize all nodes
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

  private getSpecsByPaths(paths: string[]): SpecInfo[] {
    return paths
      .map(path => this.specs.get(path))
      .filter((spec): spec is SpecInfo => spec !== undefined);
  }
}
