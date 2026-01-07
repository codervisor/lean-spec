import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  type Node,
  type Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from '@dagrejs/dagre';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@leanspec/ui-components';
import { Network, List, AlertTriangle, GitBranch, RefreshCcw } from 'lucide-react';
import { api } from '../lib/api';
import type { DependencyGraph as APIDependencyGraph } from '../types/api';
import { EmptyState } from '../components/shared/EmptyState';
import { useProject } from '../contexts';
import { useTranslation } from 'react-i18next';

// Node layout using dagre
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 200;
  const nodeHeight = 80;

  dagreGraph.setGraph({ rankdir: direction, ranksep: 100, nodesep: 50 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'complete':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-500';
    case 'in-progress':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-blue-500';
    case 'planned':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 border-purple-500';
    case 'archived':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300 border-gray-500';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300 border-gray-500';
  }
};

export function DependenciesPage() {
  const { specName, projectId } = useParams<{ specName: string; projectId: string }>();
  const navigate = useNavigate();
  const basePath = projectId ? `/projects/${projectId}` : '/projects/default';
  const { currentProject, loading: projectLoading } = useProject();
  const { t } = useTranslation(['common', 'errors']);
  const projectReady = !projectId || currentProject?.id === projectId;
  const [graph, setGraph] = useState<APIDependencyGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!projectReady || projectLoading) return;

    setLoading(true);
    api.getDependencies(specName)
      .then((data) => {
        setGraph(data);

        // Convert API graph to React Flow format
        const flowNodes: Node[] = data.nodes.map((node) => ({
          id: node.id,
          data: {
            label: (
              <div className="text-center p-2">
                <div className="font-medium text-sm">{node.name}</div>
                <div className={`text-xs px-2 py-0.5 rounded mt-1 ${getStatusColor(node.status)}`}>
                  {t(`status.${node.status}`, { defaultValue: node.status })}
                </div>
              </div>
            ),
            name: node.name,
            status: node.status,
          },
          position: { x: 0, y: 0 },
          type: 'default',
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
          style: {
            border: '2px solid',
            borderRadius: '8px',
            padding: '10px',
            width: 200,
          },
          className: getStatusColor(node.status),
        }));

        const flowEdges: Edge[] = data.edges.map((edge, index) => ({
          id: `${edge.source}-${edge.target}-${index}`,
          source: edge.source,
          target: edge.target,
          type: 'smoothstep',
          animated: edge.type === 'depends_on',
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
          label: edge.type === 'depends_on'
            ? t('dependenciesPage.list.dependsOn')
            : t('dependenciesPage.list.requiredBy'),
          style: { stroke: edge.type === 'depends_on' ? '#3B82F6' : '#6B7280' },
        }));

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
          flowNodes,
          flowEdges
        );

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t('loadingError', { ns: 'errors' })))
      .finally(() => setLoading(false));
  }, [projectLoading, projectReady, setEdges, setNodes, specName, t]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    navigate(`${basePath}/specs/${node.id}`);
  }, [basePath, navigate]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">{t('dependenciesPage.state.loading')}</CardContent>
      </Card>
    );
  }

  if (error || !graph) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={t('dependenciesPage.state.errorTitle')}
        description={error || t('dependenciesPage.state.errorDescription')}
        tone="error"
        actions={(
          <Button size="sm" variant="secondary" onClick={() => navigate(0)}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            {t('actions.retry')}
          </Button>
        )}
      />
    );
  }

  if (graph.nodes.length === 0) {
    return (
      <EmptyState
        icon={GitBranch}
        title={t('dependenciesPage.empty.noDependencies')}
        description={t('dependenciesPage.empty.noDependenciesDescription')}
        actions={(
          <Button size="sm" variant="outline" onClick={() => navigate(`${basePath}/specs`)}>
            {t('dependenciesPage.actions.goToSpecs')}
          </Button>
        )}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {specName
              ? t('dependenciesPage.header.specTitle', { specName })
              : t('dependenciesPage.header.allTitle')}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t('dependenciesPage.header.countSummary', {
              specs: graph.nodes.length,
              relationships: graph.edges.length,
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'graph' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('graph')}
          >
            <Network className="w-4 h-4 mr-2" />
            {t('dependenciesPage.view.graph')}
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4 mr-2" />
            {t('dependenciesPage.view.list')}
          </Button>
        </div>
      </div>

      {viewMode === 'graph' ? (
        <Card>
          <CardContent className="p-0">
            <div style={{ height: '600px' }} className="border rounded-lg">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                fitView
                attributionPosition="bottom-left"
              >
                <Controls />
                <Background />
              </ReactFlow>
            </div>
            <div className="p-4 text-sm text-muted-foreground">
              {t('dependenciesPage.graph.instructions')}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('dependenciesPage.list.specsTitle', { count: graph.nodes.length })}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {graph.nodes.map((node: APIDependencyGraph['nodes'][number]) => (
                  <button
                    key={node.id}
                    onClick={() => navigate(`${basePath}/specs/${node.id}`)}
                    className="w-full p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-left"
                  >
                    <div className="font-medium">{node.name}</div>
                    <div className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${getStatusColor(node.status)}`}>
                      {t(`status.${node.status}`, { defaultValue: node.status })}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('dependenciesPage.list.relationshipsTitle', { count: graph.edges.length })}</CardTitle>
            </CardHeader>
            <CardContent>
              {graph.edges.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground bg-secondary/40 rounded-lg border">
                  {t('dependenciesPage.list.noRelationships')}
                </div>
              ) : (
                <div className="space-y-2">
                  {graph.edges.map((edge: APIDependencyGraph['edges'][number], i: number) => (
                    <div key={i} className="p-3 bg-secondary rounded-lg text-sm">
                      <div className="font-medium">{edge.source}</div>
                      <div className="text-xs text-muted-foreground my-1">
                        {edge.type === 'depends_on'
                          ? t('dependenciesPage.list.dependsOn')
                          : t('dependenciesPage.list.requiredBy')}
                      </div>
                      <div className="font-medium">{edge.target}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
