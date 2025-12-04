'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import ReactFlow, {
  Background,
  Controls,
  Edge,
  MiniMap,
  MarkerType,
  Node,
  Position,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { cn } from '@/lib/utils';
import type { ProjectDependencyGraph } from '@/app/api/dependencies/route';

import { nodeTypes } from './spec-node';
import { SpecSidebar } from './spec-sidebar';
import { getConnectionDepths, layoutGraph } from './utils';
import { DEPENDS_ON_COLOR, toneBgColors } from './constants';
import type { SpecNodeData, GraphTone, FocusedNodeDetails, ConnectionStats } from './types';

interface ProjectDependencyGraphClientProps {
  data: ProjectDependencyGraph;
}

export function ProjectDependencyGraphClient({ data }: ProjectDependencyGraphClientProps) {
  const router = useRouter();
  const [instance, setInstance] = React.useState<ReactFlowInstance | null>(null);
  const [showStandalone, setShowStandalone] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [focusedNodeId, setFocusedNodeId] = React.useState<string | null>(null);
  const [isCompact, setIsCompact] = React.useState(data.nodes.length > 30);

  // Only use dependsOn edges (DAG only - no related edges)
  const dependsOnEdges = React.useMemo(
    () => data.edges.filter((e) => e.type === 'dependsOn'),
    [data.edges]
  );

  // Get connection depths for focused node
  const connectionDepths = React.useMemo(() => {
    if (!focusedNodeId) return null;
    return getConnectionDepths(focusedNodeId, dependsOnEdges, 2);
  }, [focusedNodeId, dependsOnEdges]);

  // Get detailed info for focused node (for sidebar)
  const focusedNodeDetails = React.useMemo((): FocusedNodeDetails | null => {
    if (!focusedNodeId) return null;
    const node = data.nodes.find((n) => n.id === focusedNodeId);
    if (!node) return null;

    const upstreamIds = dependsOnEdges
      .filter((e) => e.target === focusedNodeId)
      .map((e) => e.source);
    const upstream = data.nodes.filter((n) => upstreamIds.includes(n.id));

    const downstreamIds = dependsOnEdges
      .filter((e) => e.source === focusedNodeId)
      .map((e) => e.target);
    const downstream = data.nodes.filter((n) => downstreamIds.includes(n.id));

    return { node, upstream, downstream };
  }, [focusedNodeId, data.nodes, dependsOnEdges]);

  // Build the graph
  const graph = React.useMemo(() => {
    let filteredNodes = data.nodes.filter(
      (node) => statusFilter.length === 0 || statusFilter.includes(node.status)
    );

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredNodes = filteredNodes.filter(
        (node) =>
          node.name.toLowerCase().includes(query) ||
          node.number.toString().includes(query) ||
          node.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
    
    // Filter dependsOn edges
    const filteredEdges = dependsOnEdges.filter(
      (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
    );

    // Filter to nodes with dependencies unless showStandalone
    let visibleNodes = filteredNodes;
    if (!showStandalone) {
      const nodesWithDeps = new Set<string>();
      filteredEdges.forEach((e) => {
        nodesWithDeps.add(e.source);
        nodesWithDeps.add(e.target);
      });
      visibleNodes = filteredNodes.filter((n) => nodesWithDeps.has(n.id));
    }

    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));

    const nodes: Node<SpecNodeData>[] = visibleNodes.map((node) => {
      const isFocused = focusedNodeId === node.id;

      let connectionDepth: number | undefined;
      let isDimmed = false;

      if (focusedNodeId) {
        connectionDepth = connectionDepths?.get(node.id);
        isDimmed = connectionDepth === undefined;
      }

      return {
        id: node.id,
        type: 'specNode',
        data: {
          label: node.name,
          shortLabel: node.name.length > 14 ? node.name.slice(0, 12) + '…' : node.name,
          badge: node.status === 'in-progress' ? 'WIP' : node.status.slice(0, 3).toUpperCase(),
          number: node.number,
          tone: node.status as GraphTone,
          href: `/specs/${node.number}`,
          interactive: true,
          isFocused,
          connectionDepth,
          isDimmed,
          isCompact,
        },
        position: { x: 0, y: 0 },
        draggable: true,
        selectable: true,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    const edges: Edge[] = filteredEdges
      .filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
      .map((edge) => {
        let isHighlighted = true;
        let opacity = 0.7;

        if (focusedNodeId) {
          const sourceDepth = connectionDepths?.get(edge.source);
          const targetDepth = connectionDepths?.get(edge.target);
          isHighlighted =
            sourceDepth !== undefined &&
            targetDepth !== undefined &&
            (sourceDepth === 0 || targetDepth === 0);
          opacity = isHighlighted
            ? 1
            : sourceDepth !== undefined && targetDepth !== undefined
            ? 0.4
            : 0.1;
        }

        return {
          id: `${edge.source}-${edge.target}-dependsOn`,
          source: edge.source,
          target: edge.target,
          type: 'smoothstep',
          animated: isHighlighted && focusedNodeId !== null,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: DEPENDS_ON_COLOR,
            width: 18,
            height: 18,
          },
          style: {
            stroke: DEPENDS_ON_COLOR,
            strokeWidth: isHighlighted ? 2.5 : 1.5,
            opacity,
          },
        };
      });

    return layoutGraph(nodes, edges, isCompact, showStandalone);
  }, [
    data,
    dependsOnEdges,
    statusFilter,
    searchQuery,
    focusedNodeId,
    connectionDepths,
    isCompact,
    showStandalone,
  ]);

  // Connection stats
  const connectionStats = React.useMemo((): ConnectionStats => {
    const nodesWithDeps = new Set<string>();
    dependsOnEdges.forEach((e) => {
      nodesWithDeps.add(e.source);
      nodesWithDeps.add(e.target);
    });

    return {
      connected: nodesWithDeps.size,
      standalone: data.nodes.length - nodesWithDeps.size,
    };
  }, [dependsOnEdges, data.nodes.length]);

  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    data.nodes.forEach((node) => {
      counts[node.status] = (counts[node.status] || 0) + 1;
    });
    return counts;
  }, [data.nodes]);

  const handleInit = React.useCallback((flowInstance: ReactFlowInstance) => {
    setInstance(flowInstance);
    requestAnimationFrame(() => {
      flowInstance.fitView({ padding: 0.15, duration: 300 });
    });
  }, []);

  React.useEffect(() => {
    if (!instance) return;
    const timer = setTimeout(() => {
      instance.fitView({ padding: 0.15, duration: 300 });
    }, 50);
    return () => clearTimeout(timer);
  }, [instance, graph.nodes.length, statusFilter, searchQuery, showStandalone]);

  const handleNodeClick = React.useCallback(
    (event: React.MouseEvent, node: Node<SpecNodeData>) => {
      if (!node?.data) return;
      if (event.detail === 2 && node.data.href) {
        router.push(node.data.href);
        return;
      }
      setFocusedNodeId((prev) => (prev === node.id ? null : node.id));
    },
    [router]
  );

  const handlePaneClick = React.useCallback(() => {
    setFocusedNodeId(null);
  }, []);

  const toggleStatus = (status: string) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
    setFocusedNodeId(null);
  };

  const clearFilters = () => {
    setStatusFilter([]);
    setSearchQuery('');
    setFocusedNodeId(null);
  };

  const hasFilters = statusFilter.length > 0 || searchQuery.trim() || focusedNodeId;

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Dependency Graph
            </p>
            <p className="text-sm text-foreground">
              {connectionStats.connected > 0 ? (
                <>
                  <span className="text-emerald-400">{connectionStats.connected} specs with dependencies</span>
                  {connectionStats.standalone > 0 && (
                    <>
                      {' • '}
                      <span className="text-muted-foreground">{connectionStats.standalone} standalone</span>
                    </>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">No dependencies defined</span>
              )}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search specs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 w-44 rounded-md border border-border bg-background px-2.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {(['planned', 'in-progress', 'complete'] as const).map((status) => {
          const isActive = statusFilter.length === 0 || statusFilter.includes(status);
          return (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={cn(
                'rounded border px-2 py-1 font-medium transition-colors',
                isActive && status === 'planned' && 'border-blue-500/60 bg-blue-500/20 text-blue-300',
                isActive && status === 'in-progress' && 'border-orange-500/60 bg-orange-500/20 text-orange-300',
                isActive && status === 'complete' && 'border-green-500/60 bg-green-500/20 text-green-300',
                !isActive && 'border-border bg-background text-muted-foreground/40'
              )}
            >
              {status === 'in-progress' ? 'WIP' : status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="ml-1 opacity-60">({statusCounts[status] || 0})</span>
            </button>
          );
        })}

        <span className="h-3 w-px bg-border" />

        <button
          onClick={() => setShowStandalone(!showStandalone)}
          className={cn(
            'rounded border px-2 py-1 font-medium transition-colors',
            showStandalone
              ? 'border-violet-500/60 bg-violet-500/20 text-violet-300'
              : 'border-border bg-background hover:bg-accent text-muted-foreground'
          )}
        >
          Show Standalone
          <span className="ml-1 opacity-60">({connectionStats.standalone})</span>
        </button>

        <span className="h-3 w-px bg-border" />

        <button
          onClick={() => setIsCompact(!isCompact)}
          className={cn(
            'rounded border px-2 py-1 font-medium transition-colors',
            isCompact
              ? 'border-primary/60 bg-primary/20 text-primary'
              : 'border-border bg-background hover:bg-accent text-muted-foreground'
          )}
        >
          Compact
        </button>

        {hasFilters && (
          <>
            <span className="h-3 w-px bg-border" />
            <button
              onClick={clearFilters}
              className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1 font-medium text-red-400 hover:bg-red-500/20"
            >
              Clear
            </button>
          </>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-1 gap-3 min-h-0">
        {/* Graph */}
        <div className="flex-1 overflow-hidden rounded-lg border border-border bg-[#080c14]">
          {graph.nodes.length > 0 ? (
            <ReactFlow
              nodes={graph.nodes}
              edges={graph.edges}
              nodeTypes={nodeTypes}
              onInit={handleInit}
              className="h-full w-full"
              fitView
              proOptions={{ hideAttribution: true }}
              nodesDraggable
              nodesConnectable={false}
              elementsSelectable
              panOnScroll
              panOnDrag
              zoomOnScroll
              zoomOnPinch
              minZoom={0.05}
              maxZoom={2}
              onNodeClick={handleNodeClick}
              onPaneClick={handlePaneClick}
            >
              <Background gap={20} size={1} color="rgba(100, 116, 139, 0.06)" />
              <Controls showInteractive={false} className="!bg-background/90 !border-border !rounded-md" />
              <MiniMap
                nodeColor={(node) => {
                  const d = node.data as SpecNodeData;
                  return toneBgColors[d.tone] || '#1f2937';
                }}
                maskColor="rgba(0, 0, 0, 0.85)"
                className="!bg-background/95 !border-border !rounded-md"
                style={{ width: 120, height: 80 }}
                pannable
                zoomable
              />
            </ReactFlow>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-sm font-medium">No dependencies to display</p>
                <p className="text-xs mt-1">
                  {showStandalone
                    ? 'No specs match the current filters'
                    : 'Enable "Show Standalone" to see specs without dependencies'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <SpecSidebar
          focusedDetails={focusedNodeDetails}
          onSelectSpec={setFocusedNodeId}
          onOpenSpec={(num) => router.push(`/specs/${num}`)}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-6 bg-amber-400 rounded" />
          Depends On (arrow shows direction)
        </span>
        <span className="text-muted-foreground/50 ml-auto">
          Click: select • Double-click: open • Drag to rearrange
        </span>
      </div>
    </div>
  );
}
