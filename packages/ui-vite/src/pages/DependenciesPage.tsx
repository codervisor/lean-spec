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
import { api, type DependencyGraph as APIDependencyGraph } from '../lib/api';
import { EmptyState } from '../components/shared/EmptyState';
import { useProject } from '../contexts';

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
                  {node.status}
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
          label: edge.type === 'depends_on' ? 'depends on' : 'required by',
          style: { stroke: edge.type === 'depends_on' ? '#3B82F6' : '#6B7280' },
        }));

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
          flowNodes,
          flowEdges
        );

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectLoading, projectReady, setEdges, setNodes, specName]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    navigate(`${basePath}/specs/${node.id}`);
  }, [basePath, navigate]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">Loading dependencies...</CardContent>
      </Card>
    );
  }

  if (error || !graph) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load dependencies"
        description={error || 'Please check your connection and try again.'}
        tone="error"
        actions={(
          <Button size="sm" variant="secondary" onClick={() => navigate(0)}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
      />
    );
  }

  if (graph.nodes.length === 0) {
    return (
      <EmptyState
        icon={GitBranch}
        title="No dependencies yet"
        description="Specs are present but no dependency relationships were found. Add depends_on links to see the graph."
        actions={(
          <Button size="sm" variant="outline" onClick={() => navigate(`${basePath}/specs`)}>
            Go to specs
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
            {specName ? `Dependencies for ${specName}` : 'All Dependencies'}
          </h2>
          <p className="text-muted-foreground mt-1">
            {graph.nodes.length} specs, {graph.edges.length} relationships
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'graph' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('graph')}
          >
            <Network className="w-4 h-4 mr-2" />
            Graph
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4 mr-2" />
            List
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
              Click on a node to view spec details. Use mouse wheel to zoom, drag to pan.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Specs ({graph.nodes.length})</CardTitle>
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
                      {node.status}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Relationships ({graph.edges.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {graph.edges.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground bg-secondary/40 rounded-lg border">
                  No relationships yet. Add depends_on or required_by references in your specs to visualize them here.
                </div>
              ) : (
                <div className="space-y-2">
                  {graph.edges.map((edge: APIDependencyGraph['edges'][number], i: number) => (
                    <div key={i} className="p-3 bg-secondary rounded-lg text-sm">
                      <div className="font-medium">{edge.source}</div>
                      <div className="text-xs text-muted-foreground my-1">
                        {edge.type === 'depends_on' ? '↓ depends on' : '↑ required by'}
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
