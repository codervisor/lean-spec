import { LightweightSpec } from '../types/specs';

export type SortOption = 'id-desc' | 'id-asc' | 'updated-desc' | 'title-asc' | 'title-desc' | 'priority-desc' | 'priority-asc';

export interface HierarchyNode extends LightweightSpec {
  childNodes: HierarchyNode[];
}

/**
 * Builds a hierarchical tree structure from a flat list of specs.
 *
 * @param specs Flat list of specs
 * @param sortBy Sort option for the hierarchy nodes (default: 'id-desc')
 * @returns Array of root nodes, each containing their children recursively
 */
export function buildHierarchy(specs: LightweightSpec[], sortBy: SortOption = 'id-desc'): HierarchyNode[] {
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

  // Priority order map
  const priorityOrder: Record<string, number> = {
    'critical': 4,
    'high': 3,
    'medium': 2,
    'low': 1,
  };

  // Sort nodes recursively based on sortBy option
  const sortNodes = (nodes: HierarchyNode[]) => {
    nodes.sort((a, b) => {
      switch (sortBy) {
        case 'id-asc':
          return (a.specNumber || 0) - (b.specNumber || 0);
        case 'updated-desc': {
          if (!a.updatedAt) return 1;
          if (!b.updatedAt) return -1;
          const timeDiff = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          return timeDiff !== 0 ? timeDiff : (b.specNumber || 0) - (a.specNumber || 0);
        }
        case 'title-asc': {
          const cmp = (a.title || a.specName || '').toLowerCase().localeCompare((b.title || b.specName || '').toLowerCase());
          return cmp !== 0 ? cmp : (b.specNumber || 0) - (a.specNumber || 0);
        }
        case 'title-desc': {
          const cmp = (b.title || b.specName || '').toLowerCase().localeCompare((a.title || a.specName || '').toLowerCase());
          return cmp !== 0 ? cmp : (b.specNumber || 0) - (a.specNumber || 0);
        }
        case 'priority-desc': {
          const scoreA = priorityOrder[a.priority || ''] || 0;
          const scoreB = priorityOrder[b.priority || ''] || 0;
          const cmp = scoreB - scoreA;
          return cmp !== 0 ? cmp : (b.specNumber || 0) - (a.specNumber || 0);
        }
        case 'priority-asc': {
          const scoreA = priorityOrder[a.priority || ''] || 0;
          const scoreB = priorityOrder[b.priority || ''] || 0;
          const cmp = scoreA - scoreB;
          return cmp !== 0 ? cmp : (b.specNumber || 0) - (a.specNumber || 0);
        }
        case 'id-desc':
        default:
          return (b.specNumber || 0) - (a.specNumber || 0);
      }
    });
    nodes.forEach(node => sortNodes(node.childNodes));
  };

  sortNodes(roots);
  return roots;
}

/**
 * Get all IDs of nodes that have children (expandable nodes)
 */
export function getAllParentIds(nodes: HierarchyNode[]): Set<string> {
  const ids = new Set<string>();
  const traverse = (n: HierarchyNode[]) => {
    for (const node of n) {
      if (node.childNodes && node.childNodes.length > 0) {
        ids.add(node.id || node.specName);
        traverse(node.childNodes);
      }
    }
  };
  traverse(nodes);
  return ids;
}
