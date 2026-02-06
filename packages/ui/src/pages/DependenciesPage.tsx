import * as React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/library';
import ReactFlow, {
  Background,
  Controls,
  type Edge,
  MiniMap,
  MarkerType,
  type Node,
  Position,
  type ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { cn } from '@/library';
import { api } from '../lib/api';
import type { DependencyGraph } from '../types/api';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { DependenciesSkeleton } from '../components/shared/skeletons';

import { nodeTypes } from '../components/dependencies/spec-node';
import { SpecSidebar } from '../components/dependencies/spec-sidebar';
import { getConnectionDepths, layoutGraph } from '../components/dependencies/utils';
import { DEPENDS_ON_COLOR, toneBgColors } from '../components/dependencies/constants';
import type { SpecNodeData, GraphTone, FocusedNodeDetails, ConnectionStats } from '../components/dependencies/types';
import { PageHeader } from '../components/shared/page-header';
import { PageContainer } from '../components/shared/page-container';

export function DependenciesPage() {
  const { specName, projectId } = useParams<{ specName?: string; projectId?: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const { currentProject, loading: projectLoading } = useCurrentProject();
  const projectReady = !projectId || currentProject?.id === projectId;

  const specParam = searchParams.get('spec');
  const resolvedProjectId = projectId ?? currentProject?.id;
  const basePath = resolvedProjectId ? `/projects/${resolvedProjectId}` : '/projects';

  // Helper to generate project-scoped URLs
  const getSpecUrl = React.useCallback((specNumber: number | string) => {
    return `${basePath}/specs/${specNumber}`;
  }, [basePath]);

  const [data, setData] = React.useState<DependencyGraph | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [instance, setInstance] = React.useState<ReactFlowInstance | null>(null);
  const [showStandalone, setShowStandalone] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
  const [focusedNodeId, setFocusedNodeId] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<'graph' | 'focus'>('graph');
  const [isCompact, setIsCompact] = React.useState(false);
  const [selectorOpen, setSelectorOpen] = React.useState(false);
  const [selectorQuery, setSelectorQuery] = React.useState('');

  // Track if we've completed initial URL-to-state sync
  const initialSyncComplete = React.useRef(false);
  // Track the expected focusedNodeId after URL initialization (to avoid URL update race)
  const initialFocusedNodeId = React.useRef<string | null>(null);

  // Load data
  React.useEffect(() => {
    if (!projectReady || projectLoading) return;

    setLoading(true);
    api.getDependencies(specName)
      .then((responseData) => {
        setData(responseData);
        setIsCompact(responseData.nodes.length > 30);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t('errors:loadingError')))
      .finally(() => setLoading(false));
  }, [projectLoading, projectReady, specName, t]);

  // Initialize focused node from URL param on mount
  React.useEffect(() => {
    if (data && !initialSyncComplete.current) {
      if (specParam) {
        const node = data.nodes.find((n) => n.number.toString() === specParam);
        if (node) {
          initialFocusedNodeId.current = node.id;
          setFocusedNodeId(node.id);
        }
      }
      initialSyncComplete.current = true;
    }
  }, [specParam, data]);

  // Sync URL with focused node state
  React.useEffect(() => {
    if (!data) return;
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
      const params = new URLSearchParams(searchParams);
      if (newSpecParam) {
        params.set('spec', newSpecParam);
      } else {
        params.delete('spec');
      }
      setSearchParams(params, { replace: true });
    }
  }, [focusedNodeId, data, specParam, searchParams, setSearchParams]);

  // Only use dependsOn edges (DAG only)
  const dependsOnEdges = React.useMemo(
    () => (data?.edges || []).filter((e) => e.type === 'dependsOn'),
    [data?.edges]
  );

  const adjacencyMaps = React.useMemo(() => {
    const upstream = new Map<string, Set<string>>();
    const downstream = new Map<string, Set<string>>();

    dependsOnEdges.forEach((e) => {
      if (!upstream.has(e.source)) upstream.set(e.source, new Set());
      upstream.get(e.source)!.add(e.target);

      if (!downstream.has(e.target)) downstream.set(e.target, new Set());
      downstream.get(e.target)!.add(e.source);
    });

    return { upstream, downstream };
  }, [dependsOnEdges]);

  // Get connection depths for focused node (all transitive deps)
  const connectionDepths = React.useMemo(() => {
    if (!focusedNodeId) return null;
    return getConnectionDepths(focusedNodeId, dependsOnEdges, Infinity);
  }, [focusedNodeId, dependsOnEdges]);

  React.useEffect(() => {
    if (!focusedNodeId && viewMode === 'focus') {
      setViewMode('graph');
    }
  }, [focusedNodeId, viewMode]);

  // Helper to get all transitive IDs
  const getAllTransitiveIds = React.useCallback((startId: string, adjacencyMap: Map<string, Set<string>>) => {
    const visited = new Set<string>();
    const queue = [startId];
    while (queue.length > 0) {
      const id = queue.shift()!;
      const neighbors = adjacencyMap.get(id);
      if (neighbors) {
        neighbors.forEach(n => {
          if (!visited.has(n)) {
            visited.add(n);
            queue.push(n);
          }
        });
      }
    }
    return visited;
  }, []);

  // Get detailed info for focused node (for sidebar)
  const focusedNodeDetails = React.useMemo((): FocusedNodeDetails | null => {
    if (!focusedNodeId || !data) return null;
    const node = data.nodes.find((n) => n.id === focusedNodeId);
    if (!node) return null;

    const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));

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

    const upstream = getTransitiveDeps(focusedNodeId, adjacencyMaps.upstream);
    const downstream = getTransitiveDeps(focusedNodeId, adjacencyMaps.downstream);

    return { node, upstream, downstream };
  }, [focusedNodeId, data, adjacencyMaps]);

  // Build the graph
  const graph = React.useMemo(() => {
    if (!data) return { nodes: [], edges: [] };

    const isFocusMode = viewMode === 'focus' && !!focusedNodeId;

    if (isFocusMode && focusedNodeId) {
      const upstreamIds = getAllTransitiveIds(focusedNodeId, adjacencyMaps.upstream);
      const downstreamIds = getAllTransitiveIds(focusedNodeId, adjacencyMaps.downstream);
      const visibleNodeIds = new Set<string>([focusedNodeId, ...upstreamIds, ...downstreamIds]);

      const visibleNodes = data.nodes.filter((n) => visibleNodeIds.has(n.id));

      const nodes: Node<SpecNodeData>[] = visibleNodes.map((node) => {
        const isFocused = focusedNodeId === node.id;
        const connectionDepth = isFocused ? 0 : connectionDepths?.get(node.id);

        return {
          id: node.id,
          type: 'specNode',
          data: {
            label: node.name,
            shortLabel: node.name.length > 14 ? node.name.slice(0, 12) + '…' : node.name,
            badge: node.status === 'in-progress' ? 'WIP' : node.status.slice(0, 3).toUpperCase(),
            number: node.number,
            tone: node.status as GraphTone,
            priority: node.priority,
            href: getSpecUrl(node.number),
            interactive: true,
            isFocused,
            connectionDepth,
            isDimmed: false,
            isCompact,
            isSecondary: false,
          },
          position: { x: 0, y: 0 },
          draggable: true,
          selectable: true,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        };
      });

      const edges: Edge[] = dependsOnEdges
        .filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
        .map((edge) => {
          const isHighlighted = edge.source === focusedNodeId || edge.target === focusedNodeId;

          return {
            id: `${edge.source}-${edge.target}-dependsOn`,
            source: edge.source,
            target: edge.target,
            type: 'smoothstep',
            animated: isHighlighted,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: DEPENDS_ON_COLOR,
              width: 18,
              height: 18,
            },
            style: {
              stroke: DEPENDS_ON_COLOR,
              strokeWidth: isHighlighted ? 2.75 : 2,
              opacity: 1,
            },
          };
        });

      return layoutGraph(nodes, edges, isCompact, false, {
        mode: 'focus',
        focusedNodeId,
        upstreamIds,
        downstreamIds,
      });
    }

    // Primary nodes: those matching the status filter
    const primaryNodes = data.nodes.filter(
      (node) => statusFilter.length === 0 || statusFilter.includes(node.status)
    );
    const primaryNodeIds = new Set(primaryNodes.map((n) => n.id));

    // Find all nodes in the critical path (connected to primary nodes via dependencies)
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
          priority: node.priority,
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

    return layoutGraph(nodes, edges, isCompact, showStandalone, { mode: 'graph' });
  }, [
    data,
    dependsOnEdges,
    statusFilter,
    focusedNodeId,
    connectionDepths,
    isCompact,
    showStandalone,
    adjacencyMaps,
    viewMode,
    getSpecUrl,
    getAllTransitiveIds,
  ]);

  // Connection stats
  const connectionStats = React.useMemo((): ConnectionStats => {
    if (!data) return { connected: 0, standalone: 0 };

    const nodesWithDeps = new Set<string>();
    dependsOnEdges.forEach((e) => {
      nodesWithDeps.add(e.source);
      nodesWithDeps.add(e.target);
    });

    return {
      connected: nodesWithDeps.size,
      standalone: data.nodes.length - nodesWithDeps.size,
    };
  }, [dependsOnEdges, data]);

  const statusCounts = React.useMemo(() => {
    if (!data) return {};
    const counts: Record<string, number> = {};
    data.nodes.forEach((node) => {
      counts[node.status] = (counts[node.status] || 0) + 1;
    });
    return counts;
  }, [data]);

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
  }, [instance, graph, statusFilter, showStandalone]);

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
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [instance, focusedNodeId, specParam, graph.nodes]);

  // Filter specs for selector dropdown
  const filteredSpecs = React.useMemo(() => {
    if (!data) return [];
    // Sort by number descending (newest first)
    const sortedNodes = [...data.nodes].sort((a, b) => b.number - a.number);
    if (!selectorQuery.trim()) return sortedNodes.slice(0, 15);
    const q = selectorQuery.toLowerCase();
    return sortedNodes
      .filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          n.number.toString().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, 15);
  }, [data, selectorQuery]);

  // Get focused spec name for display
  const focusedSpec = React.useMemo(
    () => (focusedNodeId && data ? data.nodes.find((n) => n.id === focusedNodeId) : null),
    [focusedNodeId, data]
  );

  const handleNodeClick = React.useCallback(
    (event: React.MouseEvent, node: Node<SpecNodeData>) => {
      if (!node?.data) return;
      if (event.detail === 2 && node.data.href) {
        navigate(node.data.href);
        return;
      }
      setFocusedNodeId((prev) => (prev === node.id ? null : node.id));
    },
    [navigate]
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

  if (loading) {
    return <DependenciesSkeleton />;
  }

  if (error || !data) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
          <div className="text-center">
            <p className="text-lg font-semibold text-destructive mb-2">{t('dependenciesPage.state.errorTitle')}</p>
            <p className="text-sm text-muted-foreground">{error || t('dependenciesPage.state.errorDescription')}</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (data.nodes.length === 0) {
    return (
      <PageContainer>
        <div className="rounded-lg border border-border bg-muted/30 p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">{t('dependenciesPage.empty.noDependencies')}</h2>
          <p className="text-muted-foreground">{t('dependenciesPage.empty.noDependenciesDescription')}</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      className="h-[calc(100vh-7rem)]"
      contentClassName="flex h-full flex-col gap-4"
    >
      <div className="flex h-full flex-col gap-4">
        <PageHeader
          title={t('dependenciesPage.title')}
          description={t('dependenciesPage.description')}
          actions={(
            <Popover open={selectorOpen} onOpenChange={setSelectorOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={selectorOpen}
                  className={cn(
                    'w-[240px] h-9 justify-between px-3 text-xs',
                    focusedNodeId && 'border-primary/60 bg-primary/10 text-foreground'
                  )}
                >
                  {focusedSpec ? (
                    <span className="truncate flex items-center">
                      <span className="text-muted-foreground mr-2 font-mono">#{focusedSpec.number}</span>
                      <span className="truncate">{focusedSpec.name}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground font-normal">{t('dependenciesPage.selector.placeholder')}</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="end">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder={t('dependenciesPage.selector.filterPlaceholder')}
                    value={selectorQuery}
                    onValueChange={setSelectorQuery}
                    className="text-xs"
                  />
                  <CommandList>
                    <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">
                      {t('dependenciesPage.selector.empty')}
                    </CommandEmpty>
                    <CommandGroup>
                      {focusedNodeId && (
                        <CommandItem
                          onSelect={() => {
                            setFocusedNodeId(null);
                            setSelectorOpen(false);
                            setSelectorQuery('');
                          }}
                          className="text-muted-foreground"
                        >
                          <X className="mr-2 h-3.5 w-3.5" />
                          {t('dependenciesPage.selector.clearSelection')}
                        </CommandItem>
                      )}
                      {filteredSpecs.map((spec) => (
                        <CommandItem
                          key={spec.id}
                          value={spec.id}
                          onSelect={() => handleSelectSpec(spec.id)}
                        >
                          <span className="text-muted-foreground font-mono mr-2">#{spec.number}</span>
                          <span className="truncate flex-1">{spec.name}</span>
                          <span
                            className={cn(
                              'text-[9px] px-1 py-0.5 rounded uppercase font-medium ml-2 shrink-0',
                              spec.status === 'planned' && 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
                              spec.status === 'in-progress' && 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
                              spec.status === 'complete' && 'bg-green-500/20 text-green-600 dark:text-green-400',
                              spec.status === 'archived' && 'bg-gray-500/20 text-gray-500 dark:text-gray-400'
                            )}
                          >
                            {spec.status === 'in-progress' ? 'WIP' : spec.status.slice(0, 3)}
                          </span>
                          <div
                            className={cn(
                              'mr-2 flex h-4 w-4 items-center justify-center',
                              focusedNodeId === spec.id ? 'opacity-100' : 'opacity-0'
                            )}
                          >
                            <Check className="h-4 w-4" />
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        />

        <div className="text-sm text-muted-foreground">
          {connectionStats.connected > 0 ? (
            <>
              <span className="text-emerald-600 dark:text-emerald-400">
                {t('dependenciesPage.header.summary.connected', { count: connectionStats.connected })}
              </span>
              {connectionStats.standalone > 0 && (
                <>
                  {' • '}
                  <span className="text-muted-foreground">
                    {t('dependenciesPage.header.summary.standalone', { count: connectionStats.standalone })}
                  </span>
                </>
              )}
            </>
          ) : (
            <span>{t('dependenciesPage.header.summary.none')}</span>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {(['planned', 'in-progress', 'complete', 'archived'] as const).map((status) => {
            const isActive = statusFilter.length === 0 || statusFilter.includes(status);
            const label = t(`status.${status}`);
            const count = statusCounts[status] || 0;
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
                {label}
                <span className="ml-1 opacity-60">{t('dependenciesPage.filters.count', { count })}</span>
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
            {t('dependenciesPage.filters.showStandalone', { count: connectionStats.standalone })}
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
            {t('dependenciesPage.filters.compact')}
          </button>

          {focusedNodeId && (
            <button
              onClick={() => setViewMode((prev) => (prev === 'graph' ? 'focus' : 'graph'))}
              className={cn(
                'rounded border px-2 py-1 font-medium transition-colors',
                viewMode === 'focus'
                  ? 'border-primary/60 bg-primary/20 text-primary'
                  : 'border-border bg-background hover:bg-accent text-muted-foreground'
              )}
            >
              {t('dependenciesPage.filters.focusMode')}
            </button>
          )}

          {hasFilters && (
            <>
              <span className="h-3 w-px bg-border" />
              <button
                onClick={clearFilters}
                className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1 font-medium text-red-400 hover:bg-red-500/20"
              >
                {t('dependenciesPage.filters.clear')}
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
                  <p className="text-sm font-medium">{t('dependenciesPage.empty.title')}</p>
                  <p className="text-xs mt-1">
                    {showStandalone
                      ? t('dependenciesPage.empty.filters')
                      : t('dependenciesPage.empty.standaloneHint')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <SpecSidebar
            focusedDetails={focusedNodeDetails}
            onSelectSpec={setFocusedNodeId}
            onOpenSpec={(num) => navigate(getSpecUrl(num))}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-6 bg-amber-400 rounded" />
            {t('dependenciesPage.legend.dependsOn')}
          </span>
          <span className="text-muted-foreground/50 ml-auto">
            {t('dependenciesPage.legend.instructions')}
          </span>
        </div>
      </div>
    </PageContainer>
  );
}
