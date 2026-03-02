import * as React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  type Edge,
  MarkerType,
  type Node,
  Position,
  type ReactFlowInstance,
} from 'reactflow';
import { api } from '../lib/api';
import type { DependencyGraph } from '../types/api';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { DependenciesSkeleton } from '../components/shared/skeletons';

import { SpecSidebar } from '../components/dependencies/spec-sidebar';
import { getConnectionDepths, layoutGraph } from '../components/dependencies/utils';
import { DEPENDS_ON_COLOR } from '../components/dependencies/constants';
import type { SpecNodeData, GraphTone, FocusedNodeDetails, ConnectionStats } from '../components/dependencies/types';
import { PageHeader } from '../components/shared/page-header';
import { PageContainer } from '../components/shared/page-container';

import { DependencyFilterBar } from '../components/dependencies/dependency-filter-bar';
import { SpecSelector } from '../components/dependencies/spec-selector';
import { DependencyGraphView } from '../components/dependencies/dependency-graph-view';

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

  const initialSyncComplete = React.useRef(false);
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

  // Initialize focused node from URL param
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
    if (!initialSyncComplete.current) return;
    if (initialFocusedNodeId.current !== null) {
      if (focusedNodeId === initialFocusedNodeId.current) {
        initialFocusedNodeId.current = null;
        return;
      }
      initialFocusedNodeId.current = null;
    }
    const focusedNode = focusedNodeId ? data.nodes.find((n) => n.id === focusedNodeId) : null;
    const newSpecParam = focusedNode ? focusedNode.number.toString() : null;
    if (newSpecParam !== specParam) {
      const params = new URLSearchParams(searchParams);
      if (newSpecParam) { params.set('spec', newSpecParam); } else { params.delete('spec'); }
      setSearchParams(params, { replace: true });
    }
  }, [focusedNodeId, data, specParam, searchParams, setSearchParams]);

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

  const connectionDepths = React.useMemo(() => {
    if (!focusedNodeId) return null;
    return getConnectionDepths(focusedNodeId, dependsOnEdges, Infinity);
  }, [focusedNodeId, dependsOnEdges]);

  React.useEffect(() => {
    if (!focusedNodeId && viewMode === 'focus') setViewMode('graph');
  }, [focusedNodeId, viewMode]);

  const getAllTransitiveIds = React.useCallback((startId: string, adjacencyMap: Map<string, Set<string>>) => {
    const visited = new Set<string>();
    const queue = [startId];
    while (queue.length > 0) {
      const id = queue.shift()!;
      const neighbors = adjacencyMap.get(id);
      if (neighbors) {
        neighbors.forEach(n => {
          if (!visited.has(n)) { visited.add(n); queue.push(n); }
        });
      }
    }
    return visited;
  }, []);

  const focusedNodeDetails = React.useMemo((): FocusedNodeDetails | null => {
    if (!focusedNodeId || !data) return null;
    const node = data.nodes.find((n) => n.id === focusedNodeId);
    if (!node) return null;
    const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));

    const getTransitiveDeps = (startId: string, adjacencyMap: Map<string, Set<string>>) => {
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
        if (specsAtDepth.length > 0) result.push({ depth, specs: specsAtDepth });
        currentLevel = nextLevel;
        depth++;
      }
      return result;
    };

    return {
      node,
      upstream: getTransitiveDeps(focusedNodeId, adjacencyMaps.upstream),
      downstream: getTransitiveDeps(focusedNodeId, adjacencyMaps.downstream),
    };
  }, [focusedNodeId, data, adjacencyMaps]);

  // Build the graph
  const graph = React.useMemo(() => {
    if (!data) return { nodes: [] as Node<SpecNodeData>[], edges: [] as Edge[] };
    const isFocusMode = viewMode === 'focus' && !!focusedNodeId;

    const buildNodeData = (node: typeof data.nodes[0], opts: { isFocused: boolean; connectionDepth?: number; isDimmed: boolean; isSecondary: boolean }): Node<SpecNodeData> => ({
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
        isFocused: opts.isFocused,
        connectionDepth: opts.connectionDepth,
        isDimmed: opts.isDimmed,
        isCompact,
        isSecondary: opts.isSecondary,
      },
      position: { x: 0, y: 0 },
      draggable: true,
      selectable: true,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });

    if (isFocusMode && focusedNodeId) {
      const upstreamIds = getAllTransitiveIds(focusedNodeId, adjacencyMaps.upstream);
      const downstreamIds = getAllTransitiveIds(focusedNodeId, adjacencyMaps.downstream);
      const visibleNodeIds = new Set<string>([focusedNodeId, ...upstreamIds, ...downstreamIds]);
      const visibleNodes = data.nodes.filter((n) => visibleNodeIds.has(n.id));

      const nodes = visibleNodes.map((node) => {
        const isFocused = focusedNodeId === node.id;
        return buildNodeData(node, { isFocused, connectionDepth: isFocused ? 0 : connectionDepths?.get(node.id), isDimmed: false, isSecondary: false });
      });

      const edges: Edge[] = dependsOnEdges
        .filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
        .map((edge) => {
          const isHighlighted = edge.source === focusedNodeId || edge.target === focusedNodeId;
          return {
            id: `${edge.source}-${edge.target}-dependsOn`, source: edge.source, target: edge.target,
            type: 'smoothstep', animated: isHighlighted,
            markerEnd: { type: MarkerType.ArrowClosed, color: DEPENDS_ON_COLOR, width: 18, height: 18 },
            style: { stroke: DEPENDS_ON_COLOR, strokeWidth: isHighlighted ? 2.75 : 2, opacity: 1 },
          };
        });

      return layoutGraph(nodes, edges, isCompact, false, { mode: 'focus', focusedNodeId, upstreamIds, downstreamIds });
    }

    // Graph mode
    const primaryNodes = data.nodes.filter((node) => statusFilter.length === 0 || statusFilter.includes(node.status));
    const primaryNodeIds = new Set(primaryNodes.map((n) => n.id));
    const criticalPathIds = new Set<string>(primaryNodeIds);
    const queue = [...primaryNodeIds];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      dependsOnEdges.forEach((e) => {
        if (e.source === nodeId && !criticalPathIds.has(e.target)) { criticalPathIds.add(e.target); queue.push(e.target); }
        if (e.target === nodeId && !criticalPathIds.has(e.source)) { criticalPathIds.add(e.source); queue.push(e.source); }
      });
    }

    const filteredEdges = dependsOnEdges.filter((e) => criticalPathIds.has(e.source) && criticalPathIds.has(e.target));
    let visibleNodes = data.nodes.filter((n) => criticalPathIds.has(n.id));
    if (!showStandalone) {
      const nodesWithDeps = new Set<string>();
      filteredEdges.forEach((e) => { nodesWithDeps.add(e.source); nodesWithDeps.add(e.target); });
      visibleNodes = visibleNodes.filter((n) => nodesWithDeps.has(n.id));
    }
    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
    const secondaryNodeIds = new Set([...visibleNodeIds].filter((id) => !primaryNodeIds.has(id)));

    const nodes = visibleNodes.map((node) => {
      const isFocused = focusedNodeId === node.id;
      const isSecondary = secondaryNodeIds.has(node.id);
      let cd: number | undefined;
      let isDimmed = false;
      if (focusedNodeId) { cd = connectionDepths?.get(node.id); isDimmed = cd === undefined; }
      return buildNodeData(node, { isFocused, connectionDepth: cd, isDimmed, isSecondary });
    });

    const edges: Edge[] = filteredEdges
      .filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
      .map((edge) => {
        let isHighlighted = true;
        let opacity = 0.7;
        if (focusedNodeId) {
          const sd = connectionDepths?.get(edge.source);
          const td = connectionDepths?.get(edge.target);
          isHighlighted = sd !== undefined && td !== undefined && (sd === 0 || td === 0);
          opacity = isHighlighted ? 1 : sd !== undefined && td !== undefined ? 0.4 : 0.1;
        }
        return {
          id: `${edge.source}-${edge.target}-dependsOn`, source: edge.source, target: edge.target,
          type: 'smoothstep', animated: isHighlighted && focusedNodeId !== null,
          markerEnd: { type: MarkerType.ArrowClosed, color: DEPENDS_ON_COLOR, width: 18, height: 18 },
          style: { stroke: DEPENDS_ON_COLOR, strokeWidth: isHighlighted ? 2.5 : 1.5, opacity },
        };
      });

    return layoutGraph(nodes, edges, isCompact, showStandalone, { mode: 'graph' });
  }, [data, dependsOnEdges, statusFilter, focusedNodeId, connectionDepths, isCompact, showStandalone, adjacencyMaps, viewMode, getSpecUrl, getAllTransitiveIds]);

  const connectionStats = React.useMemo((): ConnectionStats => {
    if (!data) return { connected: 0, standalone: 0 };
    const nodesWithDeps = new Set<string>();
    dependsOnEdges.forEach((e) => { nodesWithDeps.add(e.source); nodesWithDeps.add(e.target); });
    return { connected: nodesWithDeps.size, standalone: data.nodes.length - nodesWithDeps.size };
  }, [dependsOnEdges, data]);

  const statusCounts = React.useMemo(() => {
    if (!data) return {};
    const counts: Record<string, number> = {};
    data.nodes.forEach((node) => { counts[node.status] = (counts[node.status] || 0) + 1; });
    return counts;
  }, [data]);

  // Auto-fit on graph changes
  React.useEffect(() => {
    if (!instance) return;
    const timer = setTimeout(() => { instance.fitView({ padding: 0.15, duration: 300 }); }, 50);
    return () => clearTimeout(timer);
  }, [instance, graph, statusFilter, showStandalone]);

  // Center on focused node from URL
  React.useEffect(() => {
    if (!instance || !focusedNodeId || !specParam) return;
    const node = graph.nodes.find((n) => n.id === focusedNodeId);
    if (node) {
      const timer = setTimeout(() => {
        instance.setCenter(node.position.x + 80, node.position.y + 30, { duration: 400, zoom: 1 });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [instance, focusedNodeId, specParam, graph.nodes]);

  const handleNodeClick = React.useCallback(
    (event: React.MouseEvent, node: Node<SpecNodeData>) => {
      if (!node?.data) return;
      if (event.detail === 2 && node.data.href) { navigate(node.data.href); return; }
      setFocusedNodeId((prev) => (prev === node.id ? null : node.id));
    },
    [navigate]
  );

  const handlePaneClick = React.useCallback(() => { setFocusedNodeId(null); }, []);

  const toggleStatus = (status: string) => {
    setStatusFilter((prev) => prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]);
    setFocusedNodeId(null);
  };

  const clearFilters = () => { setStatusFilter([]); setFocusedNodeId(null); };

  const handleSelectSpec = (specId: string) => {
    setFocusedNodeId(specId);
    if (instance) {
      const node = graph.nodes.find((n) => n.id === specId);
      if (node) {
        instance.setCenter(node.position.x + 80, node.position.y + 30, { duration: 400, zoom: 1 });
      }
    }
  };

  if (loading) return <DependenciesSkeleton />;

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
    <PageContainer className="h-[calc(100vh-7rem)]" contentClassName="flex h-full flex-col gap-4">
      <div className="flex h-full flex-col gap-4">
        <PageHeader
          title={t('dependenciesPage.title')}
          description={t('dependenciesPage.description')}
          actions={(
            <SpecSelector
              data={data}
              focusedNodeId={focusedNodeId}
              onSelectSpec={handleSelectSpec}
              onClearSelection={() => setFocusedNodeId(null)}
              t={t}
            />
          )}
        />

        <div className="text-sm text-muted-foreground">
          {connectionStats.connected > 0 ? (
            <>
              <span className="text-emerald-600 dark:text-emerald-400">
                {t('dependenciesPage.header.summary.connected', { count: connectionStats.connected })}
              </span>
              {connectionStats.standalone > 0 && (
                <>{' • '}<span className="text-muted-foreground">
                  {t('dependenciesPage.header.summary.standalone', { count: connectionStats.standalone })}
                </span></>
              )}
            </>
          ) : (
            <span>{t('dependenciesPage.header.summary.none')}</span>
          )}
        </div>

        <DependencyFilterBar
          statusFilter={statusFilter}
          statusCounts={statusCounts}
          showStandalone={showStandalone}
          isCompact={isCompact}
          viewMode={viewMode}
          focusedNodeId={focusedNodeId}
          connectionStats={connectionStats}
          onToggleStatus={toggleStatus}
          onToggleStandalone={() => setShowStandalone(!showStandalone)}
          onToggleCompact={() => setIsCompact(!isCompact)}
          onToggleViewMode={() => setViewMode((prev) => (prev === 'graph' ? 'focus' : 'graph'))}
          onClear={clearFilters}
          t={t}
        />

        <div className="flex flex-1 gap-3 min-h-0">
          <div className="flex-1 overflow-hidden rounded-lg border border-border bg-gray-50 dark:bg-[#080c14]">
            <DependencyGraphView
              nodes={graph.nodes}
              edges={graph.edges}
              showStandalone={showStandalone}
              onNodeClick={handleNodeClick}
              onPaneClick={handlePaneClick}
              onInstance={setInstance}
              t={t}
            />
          </div>

          <SpecSidebar
            focusedDetails={focusedNodeDetails}
            onSelectSpec={setFocusedNodeId}
            onOpenSpec={(num) => navigate(getSpecUrl(num))}
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-6 bg-amber-400 rounded" />
            {t('dependenciesPage.legend.dependsOn')}
          </span>
          <span className="text-muted-foreground/50 ml-auto">{t('dependenciesPage.legend.instructions')}</span>
        </div>
      </div>
    </PageContainer>
  );
}
