import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api, type DependencyGraph } from '../lib/api';

export function DependenciesPage() {
  const { specName } = useParams<{ specName: string }>();
  const [graph, setGraph] = useState<DependencyGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getDependencies(specName)
      .then(setGraph)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [specName]);

  if (loading) {
    return <div className="text-center py-12">Loading dependencies...</div>;
  }

  if (error || !graph) {
    return (
      <div className="text-center py-12">
        <div className="text-destructive">Error loading dependencies: {error || 'Unknown error'}</div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">
        {specName ? `Dependencies for ${specName}` : 'All Dependencies'}
      </h2>

      <div className="border rounded-lg p-6">
        <p className="text-muted-foreground mb-4">
          Dependency graph visualization will be implemented with a proper graph component.
        </p>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Nodes ({graph.nodes.length})</h3>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {graph.nodes.map((node) => (
                <div key={node.id} className="p-2 bg-secondary rounded text-sm">
                  <div className="font-medium">{node.name}</div>
                  <div className="text-xs text-muted-foreground">{node.status}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-2">Edges ({graph.edges.length})</h3>
            <div className="space-y-1">
              {graph.edges.map((edge, i) => (
                <div key={i} className="text-sm text-muted-foreground">
                  {edge.source} → {edge.target} ({edge.type})
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
