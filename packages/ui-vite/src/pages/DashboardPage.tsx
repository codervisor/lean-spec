import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api, type Stats } from '../lib/api';
import { useProject } from '../contexts';
import { DashboardClient } from '../components/dashboard/DashboardClient';
import type { DashboardSpec } from '../components/dashboard/SpecListItem';

export function DashboardPage() {
  const { currentProject } = useProject();
  const [specs, setSpecs] = useState<DashboardSpec[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const projectColor = currentProject && 'color' in currentProject ? (currentProject as { color?: string }).color : undefined;

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [specsData, statsData] = await Promise.all([
          api.getSpecs(),
          api.getStats(),
        ]);

        setSpecs(Array.isArray(specsData) ? specsData : []);
        setStats(statsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Error</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <DashboardClient
      specs={specs}
      stats={stats}
      projectColor={projectColor}
      projectName={currentProject?.name}
    />
  );
}
