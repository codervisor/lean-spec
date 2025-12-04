import dagre from '@dagrejs/dagre';
import type { Node, Edge } from 'reactflow';
import type { SpecNodeData } from './types';
import {
  NODE_WIDTH,
  NODE_HEIGHT,
  COMPACT_NODE_WIDTH,
  COMPACT_NODE_HEIGHT,
} from './constants';

/**
 * Get nodes at various depths from a starting node (BFS)
 */
export function getConnectionDepths(
  startId: string,
  edges: Array<{ source: string; target: string }>,
  maxDepth: number = 2
): Map<string, number> {
  const depths = new Map<string, number>();
  depths.set(startId, 0);

  const adjacency = new Map<string, Set<string>>();
  edges.forEach((e) => {
    if (!adjacency.has(e.source)) adjacency.set(e.source, new Set());
    if (!adjacency.has(e.target)) adjacency.set(e.target, new Set());
    adjacency.get(e.source)!.add(e.target);
    adjacency.get(e.target)!.add(e.source);
  });

  let currentLevel = new Set([startId]);
  for (let depth = 1; depth <= maxDepth; depth++) {
    const nextLevel = new Set<string>();
    currentLevel.forEach((nodeId) => {
      const neighbors = adjacency.get(nodeId);
      if (neighbors) {
        neighbors.forEach((neighbor) => {
          if (!depths.has(neighbor)) {
            depths.set(neighbor, depth);
            nextLevel.add(neighbor);
          }
        });
      }
    });
    currentLevel = nextLevel;
  }

  return depths;
}

/**
 * Layout the graph using dagre (hierarchical DAG layout)
 */
export function layoutGraph(
  nodes: Node<SpecNodeData>[],
  edges: Edge[],
  isCompact: boolean,
  showStandalone: boolean
): { nodes: Node<SpecNodeData>[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes: [], edges: [] };

  const width = isCompact ? COMPACT_NODE_WIDTH : NODE_WIDTH;
  const height = isCompact ? COMPACT_NODE_HEIGHT : NODE_HEIGHT;
  const gap = isCompact ? 30 : 50;

  // Separate nodes with dependencies from standalone nodes
  const nodesWithDeps = new Set<string>();
  edges.forEach((e) => {
    nodesWithDeps.add(e.source);
    nodesWithDeps.add(e.target);
  });

  const connectedNodes = nodes.filter((n) => nodesWithDeps.has(n.id));
  const standaloneNodes = showStandalone ? nodes.filter((n) => !nodesWithDeps.has(n.id)) : [];

  const allLayoutedNodes: Node<SpecNodeData>[] = [];

  // DAG view: Layout connected nodes with dagre (left-to-right for dependency flow)
  if (connectedNodes.length > 0) {
    const graph = new dagre.graphlib.Graph();
    graph.setGraph({
      rankdir: 'LR',
      align: 'UL',
      nodesep: isCompact ? 30 : 50,
      ranksep: isCompact ? 80 : 120,
      marginx: 40,
      marginy: 40,
    });
    graph.setDefaultEdgeLabel(() => ({}));

    connectedNodes.forEach((node) => {
      graph.setNode(node.id, { width, height });
    });
    edges.forEach((edge) => {
      if (nodesWithDeps.has(edge.source) && nodesWithDeps.has(edge.target)) {
        graph.setEdge(edge.source, edge.target);
      }
    });

    dagre.layout(graph);

    // Find bounds for centering
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    connectedNodes.forEach((node) => {
      const pos = graph.node(node.id);
      minX = Math.min(minX, pos.x - width / 2);
      minY = Math.min(minY, pos.y - height / 2);
      maxX = Math.max(maxX, pos.x + width / 2);
      maxY = Math.max(maxY, pos.y + height / 2);
    });

    connectedNodes.forEach((node) => {
      const pos = graph.node(node.id);
      allLayoutedNodes.push({
        ...node,
        position: {
          x: pos.x - minX,
          y: pos.y - minY,
        },
      });
    });

    // Layout standalone nodes in a grid below the graph
    if (standaloneNodes.length > 0) {
      const graphHeight = maxY - minY;
      const graphWidth = maxX - minX;
      const gridStartY = graphHeight + gap * 2;
      const cols = Math.ceil(Math.sqrt(standaloneNodes.length * 1.5));
      const gridWidth = cols * (width + gap);
      const gridStartX = graphWidth > gridWidth ? Math.floor((graphWidth - gridWidth) / 2) : 0;

      standaloneNodes.forEach((node, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        allLayoutedNodes.push({
          ...node,
          position: {
            x: gridStartX + col * (width + gap),
            y: gridStartY + row * (height + gap),
          },
        });
      });
    }
  } else {
    // Only standalone nodes - arrange in a grid
    const cols = Math.ceil(Math.sqrt(standaloneNodes.length * 1.5));

    standaloneNodes.forEach((node, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      allLayoutedNodes.push({
        ...node,
        position: {
          x: col * (width + gap),
          y: row * (height + gap),
        },
      });
    });
  }

  return { nodes: allLayoutedNodes, edges };
}
