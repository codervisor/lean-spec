import { useCallback, useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button, Card, CardContent } from '@leanspec/ui-components';
import { api, type Stats } from '../lib/api';
import { useProject } from '../contexts';
import { DashboardClient } from '../components/dashboard/DashboardClient';
import type { DashboardSpec } from '../components/dashboard/SpecListItem';
import { DashboardSkeleton } from '../components/shared/Skeletons';
import { useTranslation } from 'react-i18next';

export function DashboardPage() {
  const { currentProject } = useProject();
  const [specs, setSpecs] = useState<DashboardSpec[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation('common');
  const projectColor = currentProject && 'color' in currentProject ? (currentProject as { color?: string }).color : undefined;
  const basePath = currentProject?.id ? `/projects/${currentProject.id}` : '/projects/default';

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [specsData, statsData] = await Promise.all([
        api.getSpecs(),
        api.getStats(),
      ]);

      setSpecs(Array.isArray(specsData) ? specsData : []);
      setStats(statsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-3">
          <div className="flex justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div className="text-lg font-semibold">{t('dashboard.state.errorTitle')}</div>
          <p className="text-sm text-muted-foreground">{error || t('dashboard.state.errorDescription')}</p>
          <Button variant="secondary" size="sm" onClick={loadData} className="mt-2">
            {t('actions.retry')}
          </Button>
        </CardContent>
      </Card>
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
      basePath={basePath}
    />
  );
}
