'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import dagre from '@dagrejs/dagre';
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Handle,
  MarkerType,
  Node,
  NodeProps,
  Position,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { SpecRelationships } from '@/types/specs';
import { cn } from '@/lib/utils';

const NODE_WIDTH = 280;
const NODE_HEIGHT = 110;
const precedenceColor = '#f59e0b';
const relatedColor = '#38bdf8';

type GraphTone = 'precedence' | 'related' | 'current';

interface SpecNodeData {
  label: string;
  badge: string;
  subtitle?: string;
  tone: GraphTone;
  href?: string;
  interactive?: boolean;
}

const toneClasses: Record<GraphTone, string> = {
  current: 'border-primary/70 bg-primary/5 text-foreground',
  precedence: 'border-amber-400/70 bg-amber-400/10 text-amber-900 dark:text-amber-200',
  related: 'border-sky-400/70 bg-sky-400/10 text-sky-900 dark:text-sky-200',
};

const dagreConfig: dagre.GraphLabel = {
  rankdir: 'LR',
  align: 'UL',
  nodesep: 160,
  ranksep: 190,
  marginx: 40,
  marginy: 40,
};

const SpecNode = React.memo(function SpecNode({ data }: NodeProps<SpecNodeData>) {
  return (
    <div
      className={cn(
        'flex w-[280px] flex-col gap-1.5 rounded-xl border-2 px-5 py-4 text-base shadow-md transition-colors',
        toneClasses[data.tone],
        data.interactive && 'cursor-pointer hover:border-primary/70 hover:shadow-lg'
      )}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
        {data.badge}
      </span>
      <span className="text-base font-semibold leading-snug">{data.label}</span>
      {data.subtitle && (
        <span className="text-sm text-muted-foreground/80">{data.subtitle}</span>
      )}
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
});
SpecNode.displayName = 'SpecNode';

const nodeTypes = {
  specNode: SpecNode,
};

interface SpecDependencyGraphProps {
  relationships: SpecRelationships;
  specNumber?: number | null;
  specTitle: string;
}

interface GraphPayload {
  nodes: Node<SpecNodeData>[];
  edges: Edge[];
}

function formatRelationshipLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 'Unknown Spec';
  const match = trimmed.match(/^(\d+)[-_]?(.*)$/);
  if (!match) return trimmed;
  const number = match[1].padStart(3, '0');
  const remainder = match[2]?.replace(/[-_]/g, ' ').trim();
  return remainder ? `#${number} ${remainder}` : `#${number}`;
}

function buildRelationshipHref(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d+)/);
  if (match) {
    return `/specs/${parseInt(match[1], 10)}`;
  }
  return `/specs/${trimmed}`;
}

function nodeId(prefix: string, value: string, index: number) {
  return `${prefix}-${index}-${value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || index}`;
}

function layoutGraph(nodes: Node<SpecNodeData>[], edges: Edge[]): GraphPayload {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph(dagreConfig);
  graph.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });
  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  const layoutedNodes = nodes.map((node) => {
    const { x, y } = graph.node(node.id);
    return {
      ...node,
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
    };
  });

  return { nodes: layoutedNodes, edges };
}

function buildGraph(relationships: SpecRelationships, specNumber: number | null | undefined, specTitle: string) {
  const nodes: Node<SpecNodeData>[] = [];
  const edges: Edge[] = [];
  const centerLabel = specNumber ? `#${specNumber.toString().padStart(3, '0')} ${specTitle}` : specTitle;

  const currentNode: Node<SpecNodeData> = {
    id: 'current-spec',
    type: 'specNode',
    data: {
      label: centerLabel,
      badge: 'Current Spec',
      subtitle: 'This spec',
      tone: 'current',
      interactive: false,
    },
    position: { x: 0, y: 0 },
    draggable: false,
    selectable: false,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  };

  nodes.push(currentNode);

  relationships.dependsOn?.forEach((value, index) => {
    const id = nodeId('precedence', value, index);
    nodes.push({
      id,
      type: 'specNode',
      data: {
        label: formatRelationshipLabel(value),
        badge: 'Precedence',
        tone: 'precedence',
        href: buildRelationshipHref(value),
        interactive: true,
      },
      position: { x: 0, y: 0 },
      draggable: false,
      selectable: true,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });

    edges.push({
      id: `edge-${id}-current`,
      source: id,
      target: currentNode.id,
      type: 'smoothstep',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: precedenceColor,
        width: 28,
        height: 28,
      },
      style: {
        stroke: precedenceColor,
        strokeWidth: 3,
      },
    });
  });

  relationships.related?.forEach((value, index) => {
    const id = nodeId('related', value, index);
    nodes.push({
      id,
      type: 'specNode',
      data: {
        label: formatRelationshipLabel(value),
        badge: 'Connected',
        tone: 'related',
        href: buildRelationshipHref(value),
        interactive: true,
      },
      position: { x: 0, y: 0 },
      draggable: false,
      selectable: true,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });

    edges.push({
      id: `edge-current-${id}`,
      source: currentNode.id,
      target: id,
      type: 'smoothstep',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: relatedColor,
        width: 24,
        height: 24,
      },
      style: {
        stroke: relatedColor,
        strokeWidth: 3,
        strokeDasharray: '10 8',
      },
    });
  });

  return layoutGraph(nodes, edges);
}

export function SpecDependencyGraph({ relationships, specNumber, specTitle }: SpecDependencyGraphProps) {
  const router = useRouter();
  const [instance, setInstance] = React.useState<ReactFlowInstance | null>(null);

  const graph = React.useMemo(() => buildGraph(relationships, specNumber, specTitle), [relationships, specNumber, specTitle]);

  const handleInit = React.useCallback((flowInstance: ReactFlowInstance) => {
    setInstance(flowInstance);
    requestAnimationFrame(() => {
      flowInstance.fitView({ padding: 0.4, duration: 350 });
    });
  }, []);

  React.useEffect(() => {
    if (!instance) return;
    instance.fitView({ padding: 0.4, duration: 350 });
  }, [instance, graph.nodes]);

  const handleNodeClick = React.useCallback(
    (_: React.MouseEvent, node: Node<SpecNodeData>) => {
      if (!node?.data) return;
      if (!node.data.href) return;
      router.push(node.data.href);
    },
    [router]
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">Dependency Map</p>
          <p className="text-base text-foreground">Explore precedence and connected work</p>
        </div>
        <div className="rounded-full border border-border px-3 py-1.5 text-sm font-medium uppercase tracking-wide">
          React Flow DAG
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-2xl border border-border bg-muted/30">
        <ReactFlow
          nodes={graph.nodes}
          edges={graph.edges}
          nodeTypes={nodeTypes}
          onInit={handleInit}
          className="h-full w-full"
          fitView
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          panOnScroll
          panOnDrag
          zoomOnScroll
          zoomOnPinch
          minZoom={0.4}
          maxZoom={1.6}
          onNodeClick={handleNodeClick}
        >
          <Background gap={24} size={1} color="rgba(148, 163, 184, 0.3)" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2 font-medium">
          <span className="inline-block h-2.5 w-8 rounded-full bg-amber-400/80" />
          Precedence → work that must finish first.
        </span>
        <span className="inline-flex items-center gap-2 font-medium">
          <span className="inline-block h-2.5 w-8 rounded-full bg-sky-400/80" />
          Connected → parallel or follow-up specs.
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-2.5 w-8 rounded-full bg-primary/60" />
          Drag to pan • Scroll / pinch to zoom.
        </span>
      </div>
    </div>
  );
}
