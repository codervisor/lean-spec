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
import { Clock, PlayCircle, CheckCircle2, Archive, AlertCircle, ArrowUp, Minus, ArrowDown } from 'lucide-react';
import type { CompleteSpecRelationships, SpecRelationshipNode } from '@/types/specs';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const NODE_WIDTH = 280;
const NODE_HEIGHT = 110;
const edgeColor = '#64748b'; // Neutral slate color for all edges

type GraphTone = 'precedence' | 'current' | 'required-by';

interface SpecNodeData {
  label: string;
  badge: string;
  subtitle?: string;
  tone: GraphTone;
  status?: string;
  priority?: string;
  href?: string;
  interactive?: boolean;
  isCurrent?: boolean;
}

const statusIcons = {
  'planned': Clock,
  'in-progress': PlayCircle,
  'complete': CheckCircle2,
  'archived': Archive,
};

const priorityIcons = {
  'critical': AlertCircle,
  'high': ArrowUp,
  'medium': Minus,
  'low': ArrowDown,
};

const toneClasses: Record<string, string> = {
  'planned': 'border-blue-400/70 bg-blue-400/10 text-blue-900 dark:text-blue-200',
  'in-progress': 'border-orange-400/70 bg-orange-400/10 text-orange-900 dark:text-orange-200',
  'complete': 'border-green-400/70 bg-green-400/10 text-green-900 dark:text-green-200',
  'archived': 'border-gray-400/70 bg-gray-400/10 text-gray-600 dark:text-gray-300',
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
  const StatusIcon = data.status ? statusIcons[data.status as keyof typeof statusIcons] || Clock : null;
  const PriorityIcon = data.priority ? priorityIcons[data.priority as keyof typeof priorityIcons] || Minus : null;
  const { t } = useTranslation('common');

  // All nodes use status-based colors, but current spec gets enhanced styling
  const baseClass = toneClasses[data.status || data.tone] || toneClasses['planned'];
  const currentSpecEnhancement = data.tone === 'current' ? 'ring-2 ring-primary/40 shadow-lg' : '';

  return (
    <div
      className={cn(
        'flex w-[280px] flex-col gap-1.5 rounded-xl border-2 px-5 py-4 text-base shadow-md transition-colors',
        baseClass,
        currentSpecEnhancement,
        data.interactive && 'cursor-pointer hover:border-primary/70 hover:shadow-lg'
      )}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {data.badge}
        </span>
        {(StatusIcon || PriorityIcon) && (
          <div className="flex items-center gap-1">
            {StatusIcon && (
              <div
                className={cn(
                  'rounded p-1 flex items-center justify-center',
                  data.status === 'planned' && 'bg-blue-500/20',
                  data.status === 'in-progress' && 'bg-orange-500/20',
                  data.status === 'complete' && 'bg-green-500/20',
                  data.status === 'archived' && 'bg-gray-500/20'
                )}
                title={data.status ? t(`status.${data.status}` as `status.${string}`) : undefined}
              >
                <StatusIcon
                  className={cn(
                    'h-3 w-3',
                    data.status === 'planned' && 'text-blue-600 dark:text-blue-400',
                    data.status === 'in-progress' && 'text-orange-600 dark:text-orange-400',
                    data.status === 'complete' && 'text-green-600 dark:text-green-400',
                    data.status === 'archived' && 'text-gray-500 dark:text-gray-400'
                  )}
                />
              </div>
            )}
            {PriorityIcon && (
              <div
                className={cn(
                  'rounded p-1 flex items-center justify-center',
                  data.priority === 'critical' && 'bg-red-500/20',
                  data.priority === 'high' && 'bg-orange-500/20',
                  data.priority === 'medium' && 'bg-blue-500/20',
                  data.priority === 'low' && 'bg-gray-500/20'
                )}
                title={data.priority ? t(`priority.${data.priority}` as `priority.${string}`) : undefined}
              >
                <PriorityIcon
                  className={cn(
                    'h-3 w-3',
                    data.priority === 'critical' && 'text-red-600 dark:text-red-400',
                    data.priority === 'high' && 'text-orange-600 dark:text-orange-400',
                    data.priority === 'medium' && 'text-blue-600 dark:text-blue-400',
                    data.priority === 'low' && 'text-gray-500 dark:text-gray-400'
                  )}
                />
              </div>
            )}
          </div>
        )}
      </div>
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
  relationships: CompleteSpecRelationships;
  specNumber?: number | null;
  specTitle: string;
  projectId?: string;
}

interface GraphPayload {
  nodes: Node<SpecNodeData>[];
  edges: Edge[];
}

interface GraphCopy {
  currentBadge: string;
  currentSubtitle: string;
  dependsOnBadge: string;
  dependsOnSubtitle: string;
  requiredByBadge: string;
  requiredBySubtitle: string;
}

function formatRelationshipLabel(node: SpecRelationshipNode) {
  if (node.specNumber) {
    const number = node.specNumber.toString().padStart(3, '0');
    const title = node.title || node.specName.replace(/[-_]/g, ' ').trim();
    return `#${number} ${title}`;
  }
  return node.title || node.specName;
}

function buildRelationshipHref(node: SpecRelationshipNode, projectId?: string) {
  const specNumber = node.specNumber || node.specName.match(/^(\d+)/)?.[1];
  
  if (projectId) {
    return `/projects/${projectId}/specs/${specNumber}`;
  }
  return `/specs/${specNumber}`;
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

function buildGraph(
  relationships: CompleteSpecRelationships,
  specNumber: number | null | undefined,
  specTitle: string,
  projectId: string | undefined,
  copy: GraphCopy
) {
  const nodes: Node<SpecNodeData>[] = [];
  const edges: Edge[] = [];
  const centerLabel = specNumber ? `#${specNumber.toString().padStart(3, '0')} ${specTitle}` : specTitle;

  const currentNode: Node<SpecNodeData> = {
    id: 'current-spec',
    type: 'specNode',
    data: {
      label: centerLabel,
      badge: copy.currentBadge,
      subtitle: copy.currentSubtitle,
      tone: 'current', // Keep tone as 'current' for identification
      status: relationships.current.status,
      priority: relationships.current.priority,
      interactive: false,
      isCurrent: true, // Add flag to identify current spec
    },
    position: { x: 0, y: 0 },
    draggable: false,
    selectable: false,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  };

  nodes.push(currentNode);

  // Precedence: Specs this one depends on (upstream, blocking)
  relationships.dependsOn?.forEach((node: SpecRelationshipNode, index: number) => {
    const id = nodeId('precedence', node.specName, index);
    
    // Generate status-based subtitle
    let subtitle = copy.dependsOnSubtitle; // fallback
    if (node.status === 'complete') {
      subtitle = 'Completed';
    } else if (node.status === 'in-progress') {
      subtitle = 'In progress';
    } else if (node.status === 'planned') {
      subtitle = 'Must complete first';
    } else if (node.status === 'archived') {
      subtitle = 'Archived';
    }
    
    nodes.push({
      id,
      type: 'specNode',
      data: {
        label: formatRelationshipLabel(node),
        badge: copy.dependsOnBadge,
        subtitle,
        tone: 'precedence',
        status: node.status,
        priority: node.priority,
        href: buildRelationshipHref(node, projectId),
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
        color: edgeColor,
        width: 28,
        height: 28,
      },
      style: {
        stroke: edgeColor,
        strokeWidth: 3,
      },
    });
  });

  // Required By: Specs that depend on this one (downstream, blocked)
  relationships.requiredBy?.forEach((node: SpecRelationshipNode, index: number) => {
    const id = nodeId('required-by', node.specName, index);
    
    // Generate context-aware subtitle based on both current and dependency spec status
    let subtitle = copy.requiredBySubtitle; // fallback
    const currentIsComplete = relationships.current.status === 'complete' || relationships.current.status === 'archived';
    
    if (node.status === 'complete') {
      subtitle = 'Completed';
    } else if (node.status === 'in-progress') {
      subtitle = 'In progress';
    } else if (node.status === 'planned') {
      subtitle = currentIsComplete ? 'Can proceed' : 'Blocked by this spec';
    } else if (node.status === 'archived') {
      subtitle = 'Archived';
    }
    
    nodes.push({
      id,
      type: 'specNode',
      data: {
        label: formatRelationshipLabel(node),
        badge: copy.requiredByBadge,
        subtitle,
        tone: 'required-by',
        status: node.status,
        priority: node.priority,
        href: buildRelationshipHref(node, projectId),
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
        color: edgeColor,
        width: 28,
        height: 28,
      },
      style: {
        stroke: edgeColor,
        strokeWidth: 3,
      },
    });
  });

  return layoutGraph(nodes, edges);
}

export function SpecDependencyGraph({ relationships, specNumber, specTitle, projectId }: SpecDependencyGraphProps) {
  const router = useRouter();
  const [instance, setInstance] = React.useState<ReactFlowInstance | null>(null);
  const { t, i18n } = useTranslation('common');

  const graph = React.useMemo(() => buildGraph(relationships, specNumber, specTitle, projectId, {
    currentBadge: t('dependencyGraph.badges.current'),
    currentSubtitle: t('dependencyGraph.badges.currentSubtitle'),
    dependsOnBadge: t('dependencyGraph.badges.dependsOn'),
    dependsOnSubtitle: t('dependencyGraph.badges.dependsOnSubtitle'),
    requiredByBadge: t('dependencyGraph.badges.requiredBy'),
    requiredBySubtitle: t('dependencyGraph.badges.requiredBySubtitle'),
  }), [relationships, specNumber, specTitle, projectId, t, i18n.language]);

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
          <p className="text-xs font-semibold uppercase tracking-wide">{t('dependencyGraph.header.title')}</p>
          <p className="text-base text-foreground">{t('dependencyGraph.header.subtitle')}</p>
        </div>
        <div className="rounded-full border border-border px-3 py-1.5 text-sm font-medium uppercase tracking-wide">
          {t('dependencyGraph.header.badge')}
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
    </div>
  );
}
