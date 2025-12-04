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
  isDependsOn?: boolean;
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

  const nodeCount = nodes.length;
  const width = isCompact ? COMPACT_NODE_WIDTH : NODE_WIDTH;
  
  // Scale parameters based on node count for better layouts
  const scaleFactor = Math.sqrt(nodeCount);
  const baseRadius = Math.max(300, nodeCount * 15);
  
  // Create force simulation nodes with initial positions in a spiral
  // Spiral layout provides better initial positions than a circle for larger graphs
  const forceNodes: ForceNode[] = nodes.map((n, i) => {
    const angle = (i / nodeCount) * Math.PI * 6; // More turns for larger graphs
    const radius = 50 + (i / nodeCount) * baseRadius;
    return {
      id: n.id,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  });

  // Separate edges by type for different link strengths
  const dependsOnEdges = new Set(
    edges.filter((e) => e.id.includes('dependsOn')).map((e) => `${e.source}-${e.target}`)
  );

  const forceLinks: ForceLink[] = edges.map((e) => ({
    source: e.source,
    target: e.target,
    isDependsOn: dependsOnEdges.has(`${e.source}-${e.target}`),
  }));

  const nodeById = new Map(forceNodes.map((n) => [n.id, n]));

  // Calculate node degree for better positioning
  const nodeDegree = new Map<string, number>();
  edges.forEach((e) => {
    nodeDegree.set(e.source, (nodeDegree.get(e.source) || 0) + 1);
    nodeDegree.set(e.target, (nodeDegree.get(e.target) || 0) + 1);
  });

  // Adaptive parameters based on graph size
  const linkDistance = isCompact 
    ? Math.max(100, 80 + scaleFactor * 10)
    : Math.max(150, 120 + scaleFactor * 15);
  
  const chargeStrength = isCompact
    ? -Math.max(400, 200 + nodeCount * 8)
    : -Math.max(600, 300 + nodeCount * 12);

  const collideRadius = isCompact
    ? width * 0.9
    : width * 1.1;

  // Create and run simulation with tuned parameters
  const simulation = forceSimulation<ForceNode>(forceNodes)
    .force(
      'link',
      forceLink<ForceNode, ForceLink & { isDependsOn?: boolean }>(forceLinks)
        .id((d) => d.id)
        .distance((d) => {
          // Shorter distance for dependsOn edges (tighter coupling)
          return d.isDependsOn ? linkDistance * 0.8 : linkDistance * 1.2;
        })
        .strength((d) => {
          // Stronger links for dependsOn relationships
          return d.isDependsOn ? 0.7 : 0.4;
        })
    )
    .force(
      'charge',
      forceManyBody<ForceNode>()
        .strength((d) => {
          // Nodes with more connections get stronger repulsion
          const degree = nodeDegree.get(d.id) || 1;
          return chargeStrength * (1 + Math.log(degree) * 0.3);
        })
        .distanceMax(isCompact ? 400 : 600)
    )
    .force('center', forceCenter(0, 0))
    .force(
      'collide',
      forceCollide<ForceNode>()
        .radius(collideRadius)
        .strength(0.8)
        .iterations(2)
    )
    .alphaDecay(0.02) // Slower decay for better convergence
    .velocityDecay(0.3) // Moderate velocity decay
    .stop();

  // Run simulation synchronously with more iterations for larger graphs
  const iterations = Math.min(500, 200 + nodeCount * 2);
  for (let i = 0; i < iterations; i++) {
    simulation.tick();
  }

  // Normalize positions (move to positive quadrant starting from padding)
  let minX = Infinity;
  let minY = Infinity;
  forceNodes.forEach((n) => {
    minX = Math.min(minX, n.x ?? 0);
    minY = Math.min(minY, n.y ?? 0);
  });

  const padding = 60;

  // Map back to ReactFlow nodes
  return nodes.map((node) => {
    const forceNode = nodeById.get(node.id);
    return {
      ...node,
      position: {
        x: (forceNode?.x ?? 0) - minX + padding,
        y: (forceNode?.y ?? 0) - minY + padding,
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
