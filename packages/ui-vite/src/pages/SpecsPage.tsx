import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, type Spec } from '../lib/api';

export function SpecsPage() {
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getSpecs()
      .then(setSpecs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12">Loading specs...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-destructive">Error loading specs: {error}</div>
        <p className="text-sm text-muted-foreground mt-2">
          Make sure the HTTP server is running on http://localhost:3333
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Specs</h2>
        <div className="text-sm text-muted-foreground">
          {specs.length} {specs.length === 1 ? 'spec' : 'specs'}
        </div>
      </div>

      <div className="space-y-2">
        {specs.map((spec) => (
          <Link
            key={spec.name}
            to={`/specs/${spec.name}`}
            className="block p-4 border rounded-lg hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-medium">{spec.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{spec.name}</p>
              </div>
              <div className="flex gap-2">
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    spec.status === 'complete'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      : spec.status === 'in-progress'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {spec.status}
                </span>
                {spec.priority && (
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      spec.priority === 'high'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        : spec.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {spec.priority}
                  </span>
                )}
              </div>
            </div>
            {spec.tags && spec.tags.length > 0 && (
              <div className="flex gap-2 mt-2">
                {spec.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 bg-secondary rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
