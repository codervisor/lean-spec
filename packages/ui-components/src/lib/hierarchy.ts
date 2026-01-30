import { LightweightSpec } from '../types/specs';

export interface HierarchyNode extends LightweightSpec {
  childNodes: HierarchyNode[];
}

/**
 * Builds a hierarchical tree structure from a flat list of specs.
 *
 * @param specs Flat list of specs
 * @returns Array of root nodes, each containing their children recursively
 */
export function buildHierarchy(specs: LightweightSpec[]): HierarchyNode[] {
  const nodeMap = new Map<string, HierarchyNode>();

  // Initialize nodes
  specs.forEach(spec => {
    const id = spec.id || spec.specName;
    // create a shallow copy with added childNodes array
    nodeMap.set(id, { ...spec, childNodes: [] });
  });

  const roots: HierarchyNode[] = [];

  // Build hierarchy
  specs.forEach(spec => {
    const id = spec.id || spec.specName;
    const node = nodeMap.get(id)!;

    // Check if it has a parent that exists in our set
    // Try by parent ID/Name first
    const parentId = spec.parent;

    if (parentId && nodeMap.has(parentId)) {
      const parentNode = nodeMap.get(parentId)!;
      parentNode.childNodes.push(node);
    } else {
      // No parent, or parent not in this list -> it's a root
      roots.push(node);
    }
  });

  // Sort by spec number or name (descending, newest first - same as flat list)
  const sortNodes = (nodes: HierarchyNode[]) => {
    nodes.sort((a, b) => {
      if (a.specNumber && b.specNumber) return b.specNumber - a.specNumber;
      return b.specName.localeCompare(a.specName);
    });
    nodes.forEach(node => sortNodes(node.childNodes));
  };

  sortNodes(roots);
  return roots;
}
