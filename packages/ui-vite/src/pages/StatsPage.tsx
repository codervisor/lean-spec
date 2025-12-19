import { useState, useEffect } from 'react';
import { api, type Stats } from '../lib/api';

export function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12">Loading statistics...</div>;
  }

  if (error || !stats) {
    return (
      <div className="text-center py-12">
        <div className="text-destructive">Error loading stats: {error || 'Unknown error'}</div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Statistics</h2>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="border rounded-lg p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Specs</h3>
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>

        <div className="border rounded-lg p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">By Status</h3>
          <div className="space-y-2">
            {Object.entries(stats.by_status).map(([status, count]) => (
              <div key={status} className="flex justify-between items-center">
                <span className="text-sm capitalize">{status}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border rounded-lg p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">By Priority</h3>
          <div className="space-y-2">
            {Object.entries(stats.by_priority).map(([priority, count]) => (
              <div key={priority} className="flex justify-between items-center">
                <span className="text-sm capitalize">{priority}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {Object.keys(stats.by_tag).length > 0 && (
          <div className="border rounded-lg p-6 md:col-span-2 lg:col-span-3">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">By Tag</h3>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {Object.entries(stats.by_tag).map(([tag, count]) => (
                <div key={tag} className="flex justify-between items-center p-2 bg-secondary rounded">
                  <span className="text-sm">{tag}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
