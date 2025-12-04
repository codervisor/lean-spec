import dagre from '@dagrejs/dagre';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force';
import type { Node, Edge } from 'reactflow';
import type { SpecNodeData, ViewMode } from './types';
import {
  NODE_WIDTH,
  NODE_HEIGHT,
  COMPACT_NODE_WIDTH,
  COMPACT_NODE_HEIGHT,
} from './constants';

interface ForceNode extends SimulationNodeDatum {
  id: string;
  x?: number;
  y?: number;
}

interface ForceLink extends SimulationLinkDatum<ForceNode> {
  source: string | ForceNode;
  target: string | ForceNode;
}

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
 * Force-directed layout using d3-force
 * Used for network view where both dependsOn and related edges are shown
 */
function forceLayout(
  nodes: Node<SpecNodeData>[],
  edges: Edge[],
  isCompact: boolean
): Node<SpecNodeData>[] {
  if (nodes.length === 0) return [];

  const width = isCompact ? COMPACT_NODE_WIDTH : NODE_WIDTH;
  const height = isCompact ? COMPACT_NODE_HEIGHT : NODE_HEIGHT;

  // Create force simulation nodes with initial positions
  const forceNodes: ForceNode[] = nodes.map((n, i) => ({
    id: n.id,
    x: Math.cos((2 * Math.PI * i) / nodes.length) * 300 + 500,
    y: Math.sin((2 * Math.PI * i) / nodes.length) * 300 + 400,
  }));

  const forceLinks: ForceLink[] = edges.map((e) => ({
    source: e.source,
    target: e.target,
  }));

  const nodeById = new Map(forceNodes.map((n) => [n.id, n]));

  // Create and run simulation
  const simulation = forceSimulation<ForceNode>(forceNodes)
    .force(
      'link',
      forceLink<ForceNode, ForceLink>(forceLinks)
        .id((d) => d.id)
        .distance(isCompact ? 120 : 180)
        .strength(0.3)
    )
    .force('charge', forceManyBody<ForceNode>().strength(isCompact ? -300 : -500))
    .force('center', forceCenter(500, 400))
    .force('collide', forceCollide<ForceNode>().radius(isCompact ? width * 0.8 : width))
    .stop();

  // Run simulation synchronously
  for (let i = 0; i < 300; i++) {
    simulation.tick();
  }

  // Normalize positions (move to positive quadrant starting from 0,0)
  let minX = Infinity;
  let minY = Infinity;
  forceNodes.forEach((n) => {
    minX = Math.min(minX, n.x ?? 0);
    minY = Math.min(minY, n.y ?? 0);
  });

  // Map back to ReactFlow nodes
  return nodes.map((node) => {
    const forceNode = nodeById.get(node.id);
    return {
      ...node,
      position: {
        x: (forceNode?.x ?? 0) - minX + 40,
        y: (forceNode?.y ?? 0) - minY + 40,
      },
    };
  });
}

/**
 * Layout the graph using dagre for DAG view or d3-force for network view
 */
export function layoutGraph(
  nodes: Node<SpecNodeData>[],
  edges: Edge[],
  isCompact: boolean,
  showStandalone: boolean,
  viewMode: ViewMode = 'dag'
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

  // Use force layout for network view
  if (viewMode === 'network') {
    if (connectedNodes.length > 0) {
      const connectedEdges = edges.filter(
        (e) => nodesWithDeps.has(e.source) && nodesWithDeps.has(e.target)
      );
      const forceLayoutedNodes = forceLayout(connectedNodes, connectedEdges, isCompact);
      allLayoutedNodes.push(...forceLayoutedNodes);

      // Add standalone nodes in grid below force layout
      if (standaloneNodes.length > 0) {
        let maxY = 0;
        forceLayoutedNodes.forEach((n) => {
          maxY = Math.max(maxY, n.position.y + height);
        });

        const gridStartY = maxY + gap * 2;
        const cols = Math.ceil(Math.sqrt(standaloneNodes.length * 1.5));

        standaloneNodes.forEach((node, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          allLayoutedNodes.push({
            ...node,
            position: {
              x: col * (width + gap) + 40,
              y: gridStartY + row * (height + gap),
            },
          });
        });
      }
    } else if (standaloneNodes.length > 0) {
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
