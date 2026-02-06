import React from 'react';
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
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Clock, PlayCircle, CheckCircle2, Archive, AlertCircle, ArrowUp, Minus, ArrowDown } from 'lucide-react';
import type { CompleteSpecRelationships, SpecRelationshipNode } from '../../types/specs';
import { cn } from '../../lib/utils';

const NODE_WIDTH = 280;
const NODE_HEIGHT = 110;
const edgeColor = '#64748b';

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
  specId?: string;
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

interface SpecNodeProps extends NodeProps<SpecNodeData> {
  statusLabels?: Record<string, string>;
  priorityLabels?: Record<string, string>;
}

const SpecNode = React.memo(function SpecNode({ data, statusLabels, priorityLabels }: SpecNodeProps) {
  const StatusIcon = data.status ? statusIcons[data.status as keyof typeof statusIcons] || Clock : null;
  const PriorityIcon = data.priority ? priorityIcons[data.priority as keyof typeof priorityIcons] || Minus : null;

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
                title={statusLabels?.[data.status || ''] || data.status}
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
                title={priorityLabels?.[data.priority || ''] || data.priority}
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

interface GraphCopy {
  currentBadge: string;
  currentSubtitle: string;
  dependsOnBadge: string;
  dependsOnSubtitle: string;
  requiredByBadge: string;
  requiredBySubtitle: string;
  completedSubtitle?: string;
  inProgressSubtitle?: string;
  plannedBlockingSubtitle?: string;
  plannedCanProceedSubtitle?: string;
  archivedSubtitle?: string;
}

function formatRelationshipLabel(node: SpecRelationshipNode) {
  if (node.specNumber) {
    const number = node.specNumber.toString().padStart(3, '0');
    const title = node.title || node.specName.replace(/[-_]/g, ' ').trim();
    return `#${number} ${title}`;
  }
  return node.title || node.specName;
}

function nodeId(prefix: string, value: string, index: number) {
  return `${prefix}-${index}-${value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || index}`;
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

function buildGraph(
  relationships: CompleteSpecRelationships,
  specNumber: number | null | undefined,
  specTitle: string,
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
      tone: 'current',
      status: relationships.current.status,
      priority: relationships.current.priority,
      interactive: false,
      isCurrent: true,
    },
    position: { x: 0, y: 0 },
    draggable: false,
    selectable: false,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  };

  nodes.push(currentNode);

  relationships.dependsOn?.forEach((node: SpecRelationshipNode, index: number) => {
    const id = nodeId('precedence', node.specName, index);
    
    let subtitle = copy.dependsOnSubtitle;
    if (node.status === 'complete') {
      subtitle = copy.completedSubtitle || 'Completed';
    } else if (node.status === 'in-progress') {
      subtitle = copy.inProgressSubtitle || 'In progress';
    } else if (node.status === 'planned') {
      subtitle = copy.plannedBlockingSubtitle || 'Must complete first';
    } else if (node.status === 'archived') {
      subtitle = copy.archivedSubtitle || 'Archived';
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
        interactive: true,
        specId: node.specNumber ? node.specNumber.toString() : node.specName,
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

  relationships.requiredBy?.forEach((node: SpecRelationshipNode, index: number) => {
    const id = nodeId('required-by', node.specName, index);
    
    let subtitle = copy.requiredBySubtitle;
    const currentIsComplete = relationships.current.status === 'complete' || relationships.current.status === 'archived';
    
    if (node.status === 'complete') {
      subtitle = copy.completedSubtitle || 'Completed';
    } else if (node.status === 'in-progress') {
      subtitle = copy.inProgressSubtitle || 'In progress';
    } else if (node.status === 'planned') {
      subtitle = currentIsComplete 
        ? (copy.plannedCanProceedSubtitle || 'Can proceed')
        : (copy.plannedBlockingSubtitle || 'Blocked by this spec');
    } else if (node.status === 'archived') {
      subtitle = copy.archivedSubtitle || 'Archived';
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
        interactive: true,
        specId: node.specNumber ? node.specNumber.toString() : node.specName,
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

export interface DependencyGraphProps {
  relationships: CompleteSpecRelationships;
  specNumber?: number | null;
  specTitle: string;
  onNodeClick?: (specId: string) => void;
  labels?: {
    title?: string;
    subtitle?: string;
    badge?: string;
    currentBadge?: string;
    currentSubtitle?: string;
    dependsOnBadge?: string;
    dependsOnSubtitle?: string;
    requiredByBadge?: string;
    requiredBySubtitle?: string;
    completedSubtitle?: string;
    inProgressSubtitle?: string;
    plannedBlockingSubtitle?: string;
    plannedCanProceedSubtitle?: string;
    archivedSubtitle?: string;
  };
  statusLabels?: Record<string, string>;
  priorityLabels?: Record<string, string>;
}

function DependencyGraphInner({
  relationships,
  specNumber,
  specTitle,
  onNodeClick,
  labels,
  statusLabels,
  priorityLabels,
}: DependencyGraphProps) {
  const [instance, setInstance] = React.useState<ReactFlowInstance | null>(null);

  const copy: GraphCopy = {
    currentBadge: labels?.currentBadge || 'Current Spec',
    currentSubtitle: labels?.currentSubtitle || 'Currently viewing',
    dependsOnBadge: labels?.dependsOnBadge || 'Depends On',
    dependsOnSubtitle: labels?.dependsOnSubtitle || 'Upstream dependency',
    requiredByBadge: labels?.requiredByBadge || 'Required By',
    requiredBySubtitle: labels?.requiredBySubtitle || 'Downstream dependency',
    completedSubtitle: labels?.completedSubtitle,
    inProgressSubtitle: labels?.inProgressSubtitle,
    plannedBlockingSubtitle: labels?.plannedBlockingSubtitle,
    plannedCanProceedSubtitle: labels?.plannedCanProceedSubtitle,
    archivedSubtitle: labels?.archivedSubtitle,
  };

  const graph = React.useMemo(
    () => buildGraph(relationships, specNumber, specTitle, copy),
    [relationships, specNumber, specTitle, labels]
  );

  const nodeTypes = React.useMemo(
    () => ({
      specNode: (props: NodeProps<SpecNodeData>) => (
        <SpecNode {...props} statusLabels={statusLabels} priorityLabels={priorityLabels} />
      ),
    }),
    [statusLabels, priorityLabels]
  );

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
      if (!node?.data || !node.data.interactive || !onNodeClick) return;
      const specId = node.data.specId;
      if (specId) onNodeClick(specId);
    },
    [onNodeClick]
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">
            {labels?.title || 'Dependency Graph'}
          </p>
          <p className="text-base text-foreground">
            {labels?.subtitle || 'Visual representation of spec dependencies'}
          </p>
        </div>
        <div className="rounded-full border border-border px-3 py-1.5 text-sm font-medium uppercase tracking-wide">
          {labels?.badge || 'Interactive'}
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

export function SpecDependencyGraph(props: DependencyGraphProps) {
  return (
    <ReactFlowProvider>
      <DependencyGraphInner {...props} />
    </ReactFlowProvider>
  );
}
