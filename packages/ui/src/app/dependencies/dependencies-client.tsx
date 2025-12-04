'use client';

import * as React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
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
  projectId?: string;
}

export function ProjectDependencyGraphClient({ data, projectId }: ProjectDependencyGraphClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const specParam = searchParams.get('spec');
    // Helper to generate project-scoped URLs
  const getSpecUrl = React.useCallback((specNumber: number | string) => {
    return projectId 
      ? `/projects/${projectId}/specs/${specNumber}`
      : `/specs/${specNumber}`;
  }, [projectId]);
  const [instance, setInstance] = React.useState<ReactFlowInstance | null>(null);
  const [showStandalone, setShowStandalone] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
  const [focusedNodeId, setFocusedNodeId] = React.useState<string | null>(null);
  const [isCompact, setIsCompact] = React.useState(data.nodes.length > 30);
  const [selectorOpen, setSelectorOpen] = React.useState(false);
  const [selectorQuery, setSelectorQuery] = React.useState('');
  const selectorRef = React.useRef<HTMLDivElement>(null);
  // Track if we've completed initial URL-to-state sync
  const initialSyncComplete = React.useRef(false);
  // Track the expected focusedNodeId after URL initialization (to avoid URL update race)
  const initialFocusedNodeId = React.useRef<string | null>(null);

  // Initialize focused node from URL param on mount
  React.useEffect(() => {
    if (!initialSyncComplete.current) {
      if (specParam) {
        const node = data.nodes.find((n) => n.number.toString() === specParam);
        if (node) {
          initialFocusedNodeId.current = node.id;
          setFocusedNodeId(node.id);
        }
      }
      initialSyncComplete.current = true;
    }
  }, [specParam, data.nodes]);

  // Sync URL with focused node state
  React.useEffect(() => {
    // Skip if initial sync hasn't completed
    if (!initialSyncComplete.current) return;
    
    // Skip if this is the initial focusedNodeId set from URL
    if (initialFocusedNodeId.current !== null) {
      if (focusedNodeId === initialFocusedNodeId.current) {
        // This is the initial sync, clear the ref but don't update URL
        initialFocusedNodeId.current = null;
        return;
      }
      // focusedNodeId changed to something else, clear the ref
      initialFocusedNodeId.current = null;
    }
    
    const focusedNode = focusedNodeId ? data.nodes.find((n) => n.id === focusedNodeId) : null;
    const newSpecParam = focusedNode ? focusedNode.number.toString() : null;
    
    // Only update if different from current URL
    if (newSpecParam !== specParam) {
      const params = new URLSearchParams(searchParams.toString());
      if (newSpecParam) {
        params.set('spec', newSpecParam);
      } else {
        params.delete('spec');
      }
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(newUrl, { scroll: false });
    }
  }, [focusedNodeId, data.nodes, specParam, pathname, router, searchParams]);

  // Only use dependsOn edges (DAG only - no related edges)
  const dependsOnEdges = React.useMemo(
    () => data.edges.filter((e) => e.type === 'dependsOn'),
    [data.edges]
  );

  // Get connection depths for focused node (all transitive deps)
  const connectionDepths = React.useMemo(() => {
    if (!focusedNodeId) return null;
    return getConnectionDepths(focusedNodeId, dependsOnEdges, Infinity);
  }, [focusedNodeId, dependsOnEdges]);

  // Get detailed info for focused node (for sidebar)
  // Edge direction: source depends_on target (A→B means A depends on B)
  // Upstream = specs THIS spec depends on (where focused is source, get target)
  // Downstream = specs that depend on THIS spec (where focused is target, get source)
  const focusedNodeDetails = React.useMemo((): FocusedNodeDetails | null => {
    if (!focusedNodeId) return null;
    const node = data.nodes.find((n) => n.id === focusedNodeId);
    if (!node) return null;

    const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));

    // Build directional adjacency maps
    const upstreamMap = new Map<string, Set<string>>();
    const downstreamMap = new Map<string, Set<string>>();
    dependsOnEdges.forEach((e) => {
      if (!upstreamMap.has(e.source)) upstreamMap.set(e.source, new Set());
      upstreamMap.get(e.source)!.add(e.target);
      if (!downstreamMap.has(e.target)) downstreamMap.set(e.target, new Set());
      downstreamMap.get(e.target)!.add(e.source);
    });

    // BFS to get all upstream specs grouped by depth
    const getTransitiveDeps = (
      startId: string,
      adjacencyMap: Map<string, Set<string>>
    ): { depth: number; specs: typeof data.nodes }[] => {
      const visited = new Set<string>([startId]);
      const result: { depth: number; specs: typeof data.nodes }[] = [];
      let currentLevel = new Set([startId]);
      let depth = 1;

      while (currentLevel.size > 0) {
        const nextLevel = new Set<string>();
        const specsAtDepth: typeof data.nodes = [];

        currentLevel.forEach((nodeId) => {
          const neighbors = adjacencyMap.get(nodeId);
          if (neighbors) {
            neighbors.forEach((neighborId) => {
              if (!visited.has(neighborId)) {
                visited.add(neighborId);
                nextLevel.add(neighborId);
                const spec = nodeMap.get(neighborId);
                if (spec) specsAtDepth.push(spec);
              }
            });
          }
        });

        if (specsAtDepth.length > 0) {
          result.push({ depth, specs: specsAtDepth });
        }
        currentLevel = nextLevel;
        depth++;
      }

      return result;
    };

    const upstream = getTransitiveDeps(focusedNodeId, upstreamMap);
    const downstream = getTransitiveDeps(focusedNodeId, downstreamMap);

    return { node, upstream, downstream };
  }, [focusedNodeId, data.nodes, dependsOnEdges]);

  // Build the graph
  const graph = React.useMemo(() => {
    // Primary nodes: those matching the status filter
    const primaryNodes = data.nodes.filter(
      (node) => statusFilter.length === 0 || statusFilter.includes(node.status)
    );
    const primaryNodeIds = new Set(primaryNodes.map((n) => n.id));

    // Find all nodes in the critical path (connected to primary nodes via dependencies)
    // This includes nodes with filtered-out statuses if they're part of dependency chains
    const criticalPathIds = new Set<string>(primaryNodeIds);
    
    // BFS to find all connected nodes through dependencies
    const queue = [...primaryNodeIds];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      dependsOnEdges.forEach((e) => {
        // Check both directions - upstream and downstream dependencies
        if (e.source === nodeId && !criticalPathIds.has(e.target)) {
          criticalPathIds.add(e.target);
          queue.push(e.target);
        }
        if (e.target === nodeId && !criticalPathIds.has(e.source)) {
          criticalPathIds.add(e.source);
          queue.push(e.source);
        }
      });
    }

    // Get all nodes in critical path
    const criticalPathNodes = data.nodes.filter((n) => criticalPathIds.has(n.id));
    
    // Filter edges to only those between critical path nodes
    const filteredEdges = dependsOnEdges.filter(
      (e) => criticalPathIds.has(e.source) && criticalPathIds.has(e.target)
    );

    // Filter to nodes with dependencies unless showStandalone
    let visibleNodes = criticalPathNodes;
    if (!showStandalone) {
      const nodesWithDeps = new Set<string>();
      filteredEdges.forEach((e) => {
        nodesWithDeps.add(e.source);
        nodesWithDeps.add(e.target);
      });
      visibleNodes = criticalPathNodes.filter((n) => nodesWithDeps.has(n.id));
    }

    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
    
    // Track which nodes are "secondary" (shown due to critical path, not primary filter)
    const secondaryNodeIds = new Set(
      [...visibleNodeIds].filter((id) => !primaryNodeIds.has(id))
    );

    const nodes: Node<SpecNodeData>[] = visibleNodes.map((node) => {
      const isFocused = focusedNodeId === node.id;
      const isSecondary = secondaryNodeIds.has(node.id);

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
          href: getSpecUrl(node.number),
          interactive: true,
          isFocused,
          connectionDepth,
          isDimmed,
          isCompact,
          isSecondary,
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
  }, [instance, graph.nodes.length, statusFilter, showStandalone]);

  // Center on focused node when set from URL param
  React.useEffect(() => {
    if (!instance || !focusedNodeId || !specParam) return;
    const node = graph.nodes.find((n) => n.id === focusedNodeId);
    if (node) {
      const timer = setTimeout(() => {
        instance.setCenter(node.position.x + 80, node.position.y + 30, {
          duration: 400,
          zoom: 1,
        });
      }, 400); // Wait for initial fitView to complete
      return () => clearTimeout(timer);
    }
  }, [instance, focusedNodeId, specParam, graph.nodes]);

  // Close selector dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as globalThis.Node)) {
        setSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter specs for selector dropdown
  const filteredSpecs = React.useMemo(() => {
    if (!selectorQuery.trim()) return data.nodes.slice(0, 15);
    const q = selectorQuery.toLowerCase();
    return data.nodes
      .filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          n.number.toString().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, 15);
  }, [data.nodes, selectorQuery]);

  // Get focused spec name for display
  const focusedSpec = React.useMemo(
    () => (focusedNodeId ? data.nodes.find((n) => n.id === focusedNodeId) : null),
    [focusedNodeId, data.nodes]
  );

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
    setFocusedNodeId(null);
    setSelectorQuery('');
  };

  const handleSelectSpec = (specId: string) => {
    setFocusedNodeId(specId);
    setSelectorOpen(false);
    setSelectorQuery('');
    // Center on the selected node
    if (instance) {
      const node = graph.nodes.find((n) => n.id === specId);
      if (node) {
        instance.setCenter(node.position.x + 80, node.position.y + 30, {
          duration: 400,
          zoom: 1,
        });
      }
    }
  };

  const hasFilters = statusFilter.length > 0 || focusedNodeId;

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
                  <span className="text-emerald-600 dark:text-emerald-400">{connectionStats.connected} specs with dependencies</span>
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

        {/* Spec Selector */}
        <div className="relative" ref={selectorRef}>
          <button
            onClick={() => setSelectorOpen(!selectorOpen)}
            className={cn(
              'h-7 w-52 rounded-md border bg-background px-2.5 text-xs text-left flex items-center gap-2 transition-colors',
              focusedNodeId
                ? 'border-primary/60 bg-primary/10'
                : 'border-border hover:border-primary/40'
            )}
          >
            {focusedSpec ? (
              <>
                <span className="text-muted-foreground">#{focusedSpec.number.toString().padStart(3, '0')}</span>
                <span className="truncate flex-1 text-foreground">{focusedSpec.name}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Select spec to highlight...</span>
            )}
            <svg className="w-3 h-3 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {selectorOpen && (
            <div className="absolute right-0 top-8 z-50 w-64 rounded-md border border-border bg-background shadow-lg overflow-hidden">
              <div className="p-2 border-b border-border">
                <input
                  type="text"
                  placeholder="Type to filter..."
                  value={selectorQuery}
                  onChange={(e) => setSelectorQuery(e.target.value)}
                  className="w-full h-7 rounded border border-border bg-muted/30 px-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>
              <div className="max-h-64 overflow-auto">
                {focusedNodeId && (
                  <button
                    onClick={() => {
                      setFocusedNodeId(null);
                      setSelectorOpen(false);
                      setSelectorQuery('');
                    }}
                    className="w-full px-3 py-2 text-xs text-left hover:bg-muted/50 border-b border-border text-muted-foreground flex items-center gap-2"
                  >
                    <span className="text-red-400">×</span> Clear selection
                  </button>
                )}
                {filteredSpecs.length > 0 ? (
                  filteredSpecs.map((spec) => (
                    <button
                      key={spec.id}
                      onClick={() => handleSelectSpec(spec.id)}
                      className={cn(
                        'w-full px-3 py-2 text-xs text-left hover:bg-muted/50 flex items-center gap-2',
                        focusedNodeId === spec.id && 'bg-primary/20'
                      )}
                    >
                      <span className="text-muted-foreground font-mono">#{spec.number.toString().padStart(3, '0')}</span>
                      <span className="truncate flex-1">{spec.name}</span>
                      <span
                        className={cn(
                          'text-[9px] px-1 py-0.5 rounded uppercase font-medium',
                          spec.status === 'planned' && 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
                          spec.status === 'in-progress' && 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
                          spec.status === 'complete' && 'bg-green-500/20 text-green-600 dark:text-green-400',
                          spec.status === 'archived' && 'bg-gray-500/20 text-gray-500 dark:text-gray-400'
                        )}
                      >
                        {spec.status === 'in-progress' ? 'WIP' : spec.status.slice(0, 3)}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                    No specs found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {(['planned', 'in-progress', 'complete', 'archived'] as const).map((status) => {
          const isActive = statusFilter.length === 0 || statusFilter.includes(status);
          return (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={cn(
                'rounded border px-2 py-1 font-medium transition-colors',
                isActive && status === 'planned' && 'border-blue-500/60 bg-blue-500/20 text-blue-700 dark:text-blue-300',
                isActive && status === 'in-progress' && 'border-orange-500/60 bg-orange-500/20 text-orange-700 dark:text-orange-300',
                isActive && status === 'complete' && 'border-green-500/60 bg-green-500/20 text-green-700 dark:text-green-300',
                isActive && status === 'archived' && 'border-gray-500/60 bg-gray-500/20 text-gray-600 dark:text-gray-300',
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
              ? 'border-violet-500/60 bg-violet-500/20 text-violet-700 dark:text-violet-300'
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
        <div className="flex-1 overflow-hidden rounded-lg border border-border bg-gray-50 dark:bg-[#080c14]">
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
                  return toneBgColors[d.tone] || '#6b7280';
                }}
                maskColor="rgba(128, 128, 128, 0.6)"
                className="!bg-white/95 dark:!bg-background/95 !border-border !rounded-md"
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
          onOpenSpec={(num) => router.push(getSpecUrl(num))}
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
