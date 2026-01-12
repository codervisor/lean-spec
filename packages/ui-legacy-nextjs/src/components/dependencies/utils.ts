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
 * Get nodes at various depths from a starting node (directional BFS)
 * Only includes upstream (specs this depends on) and downstream (specs that depend on this)
 * Edge direction: source depends_on target (A→B means A depends on B)
 */
export function getConnectionDepths(
  startId: string,
  edges: Array<{ source: string; target: string }>,
  maxDepth: number = 2
): Map<string, number> {
  const depths = new Map<string, number>();
  depths.set(startId, 0);

  // Build directional adjacency maps
  // upstreamMap: source → targets (specs that source depends on)
  // downstreamMap: target → sources (specs that depend on target)
  const upstreamMap = new Map<string, Set<string>>();
  const downstreamMap = new Map<string, Set<string>>();
  
  edges.forEach((e) => {
    // source depends on target, so target is upstream of source
    if (!upstreamMap.has(e.source)) upstreamMap.set(e.source, new Set());
    upstreamMap.get(e.source)!.add(e.target);
    
    // source depends on target, so source is downstream of target
    if (!downstreamMap.has(e.target)) downstreamMap.set(e.target, new Set());
    downstreamMap.get(e.target)!.add(e.source);
  });

  // BFS upstream (specs this depends on, directly or transitively)
  let currentLevel = new Set([startId]);
  let depth = 1;
  while (currentLevel.size > 0 && depth <= maxDepth) {
    const nextLevel = new Set<string>();
    currentLevel.forEach((nodeId) => {
      const upstreamNodes = upstreamMap.get(nodeId);
      if (upstreamNodes) {
        upstreamNodes.forEach((upstream) => {
          if (!depths.has(upstream)) {
            depths.set(upstream, depth);
            nextLevel.add(upstream);
          }
        });
      }
    });
    currentLevel = nextLevel;
    depth++;
  }

  // BFS downstream (specs that depend on this, directly or transitively)
  currentLevel = new Set([startId]);
  depth = 1;
  while (currentLevel.size > 0 && depth <= maxDepth) {
    const nextLevel = new Set<string>();
    currentLevel.forEach((nodeId) => {
      const downstreamNodes = downstreamMap.get(nodeId);
      if (downstreamNodes) {
        downstreamNodes.forEach((downstream) => {
          if (!depths.has(downstream)) {
            depths.set(downstream, depth);
            nextLevel.add(downstream);
          }
        });
      }
    });
    currentLevel = nextLevel;
    depth++;
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
  showStandalone: boolean,
  options: {
    mode?: 'graph' | 'focus';
    focusedNodeId?: string | null;
    upstreamIds?: Set<string>;
    downstreamIds?: Set<string>;
  } = {}
): { nodes: Node<SpecNodeData>[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes: [], edges: [] };

  const mode = options.mode ?? 'graph';
  const upstreamIds = options.upstreamIds ?? new Set<string>();
  const downstreamIds = options.downstreamIds ?? new Set<string>();

  if (mode === 'focus' && options.focusedNodeId) {
    return layeredLayout(nodes, edges, isCompact, {
      focusedNodeId: options.focusedNodeId,
      upstreamIds,
      downstreamIds,
    });
  }

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

function layeredLayout(
  nodes: Node<SpecNodeData>[],
  edges: Edge[],
  isCompact: boolean,
  params: {
    focusedNodeId: string;
    upstreamIds: Set<string>;
    downstreamIds: Set<string>;
  }
): { nodes: Node<SpecNodeData>[]; edges: Edge[] } {
  // Use dagre for consistent hierarchical layout
  // This preserves the structure of complex dependency chains (A->B->C)
  // instead of flattening them into just "upstream" and "downstream" buckets
  
  const width = isCompact ? COMPACT_NODE_WIDTH : NODE_WIDTH;
  const height = isCompact ? COMPACT_NODE_HEIGHT : NODE_HEIGHT;
  
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({
    rankdir: 'LR', // Consistent with main graph
    align: 'UL',
    nodesep: isCompact ? 30 : 50,
    ranksep: isCompact ? 80 : 120,
    marginx: 40,
    marginy: 40,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    graph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  // Find bounds to normalize coordinates (start at 0,0)
  let minX = Infinity, minY = Infinity;
  nodes.forEach((node) => {
    const pos = graph.node(node.id);
    minX = Math.min(minX, pos.x - width / 2);
    minY = Math.min(minY, pos.y - height / 2);
  });

  const layoutedNodes = nodes.map((node) => {
    const pos = graph.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - minX,
        y: pos.y - minY,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
