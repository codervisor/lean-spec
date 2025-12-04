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
import { cn } from '@/lib/utils';
import type { ProjectDependencyGraph } from '@/app/api/dependencies/route';

const NODE_WIDTH = 280;
const NODE_HEIGHT = 110;
const precedenceColor = '#f59e0b';
const relatedColor = '#38bdf8';

type GraphTone = 'planned' | 'in-progress' | 'complete' | 'archived';

interface SpecNodeData {
  label: string;
  badge: string;
  subtitle?: string;
  tone: GraphTone;
  href?: string;
  interactive?: boolean;
}

const toneClasses: Record<GraphTone, string> = {
  planned: 'border-amber-400/70 bg-amber-400/10 text-amber-900 dark:text-amber-200',
  'in-progress': 'border-sky-400/70 bg-sky-400/10 text-sky-900 dark:text-sky-200',
  complete: 'border-emerald-400/70 bg-emerald-400/10 text-emerald-900 dark:text-emerald-200',
  archived: 'border-gray-400/70 bg-gray-400/10 text-gray-600 dark:text-gray-400',
};

const dagreConfig: dagre.GraphLabel = {
  rankdir: 'LR',
  align: 'UL',
  nodesep: 60,
  ranksep: 120,
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

interface ProjectDependencyGraphClientProps {
  data: ProjectDependencyGraph;
}

function layoutGraph(nodes: Node<SpecNodeData>[], edges: Edge[]): { nodes: Node<SpecNodeData>[]; edges: Edge[] } {
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

export function ProjectDependencyGraphClient({ data }: ProjectDependencyGraphClientProps) {
  const router = useRouter();
  const [instance, setInstance] = React.useState<ReactFlowInstance | null>(null);
  const [showRelated, setShowRelated] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);

  const graph = React.useMemo(() => {
    const filteredNodes = data.nodes.filter(node => 
      statusFilter.length === 0 || statusFilter.includes(node.status)
    );
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));

    const nodes: Node<SpecNodeData>[] = filteredNodes.map(node => ({
      id: node.id,
      type: 'specNode',
      data: {
        label: `#${node.number.toString().padStart(3, '0')} ${node.name}`,
        badge: node.status.toUpperCase().replace('-', ' '),
        subtitle: `Priority: ${node.priority}`,
        tone: node.status as GraphTone,
        href: `/specs/${node.number}`,
        interactive: true,
      },
      position: { x: 0, y: 0 },
      draggable: false,
      selectable: true,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }));

    const edges: Edge[] = data.edges
      .filter(edge => {
        if (!filteredNodeIds.has(edge.source) || !filteredNodeIds.has(edge.target)) {
          return false;
        }
        if (!showRelated && edge.type === 'related') {
          return false;
        }
        return true;
      })
      .map(edge => ({
        id: `${edge.source}-${edge.target}-${edge.type}`,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edge.type === 'dependsOn' ? precedenceColor : relatedColor,
          width: edge.type === 'dependsOn' ? 28 : 24,
          height: edge.type === 'dependsOn' ? 28 : 24,
        },
        style: {
          stroke: edge.type === 'dependsOn' ? precedenceColor : relatedColor,
          strokeWidth: 3,
          strokeDasharray: edge.type === 'related' ? '10 8' : undefined,
        },
      }));

    return layoutGraph(nodes, edges);
  }, [data, showRelated, statusFilter]);

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

  const toggleStatus = (status: string) => {
    setStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Project Dependencies
          </p>
          <p className="text-lg text-foreground">
            Visualize spec relationships across your project
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <button
            onClick={() => setShowRelated(!showRelated)}
            className={cn(
              'rounded-lg border px-3 py-1.5 transition-colors',
              showRelated
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:bg-accent'
            )}
          >
            Show Related
          </button>
          {['planned', 'in-progress', 'complete'].map(status => (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={cn(
                'rounded-lg border px-3 py-1.5 transition-colors capitalize',
                statusFilter.length === 0 || statusFilter.includes(status)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-accent'
              )}
            >
              {status.replace('-', ' ')}
            </button>
          ))}
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
          minZoom={0.2}
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
          Depends On → solid arrow
        </span>
        <span className="inline-flex items-center gap-2 font-medium">
          <span className="inline-block h-2.5 w-8 rounded-full bg-sky-400/80" />
          Related ↔ dashed line
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-2.5 w-8 rounded-full bg-primary/60" />
          {graph.nodes.length} specs • {graph.edges.length} connections
        </span>
      </div>
    </div>
  );
}
