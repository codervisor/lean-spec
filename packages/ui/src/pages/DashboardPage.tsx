import { useCallback, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button, Card, CardContent } from '@leanspec/ui-components';
import { Link } from 'react-router-dom';
import type { Stats } from '../types/api';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { useProjectStats, useSpecsList } from '../hooks/useSpecsQuery';
import { DashboardClient } from '../components/dashboard/dashboard-client';
import type { DashboardSpec } from '../components/dashboard/spec-list-item';
import { DashboardSkeleton } from '../components/shared/skeletons';
import { PageContainer } from '../components/shared/page-container';
import { useTranslation } from 'react-i18next';

export function DashboardPage() {
  const { currentProject, loading: projectLoading } = useCurrentProject();
  const resolvedProjectId = currentProject?.id ?? null;
  const specsQuery = useSpecsList(resolvedProjectId);
  const statsQuery = useProjectStats(resolvedProjectId);
  const { t } = useTranslation('common');
  const projectColor = currentProject && 'color' in currentProject ? (currentProject as { color?: string }).color : undefined;
  const basePath = currentProject?.id ? `/projects/${currentProject.id}` : '/projects';

  const specs = useMemo(
    () => (Array.isArray(specsQuery.data) ? (specsQuery.data as DashboardSpec[]) : []),
    [specsQuery.data]
  );
  const stats = (statsQuery.data as Stats | undefined) ?? null;

  const loadData = useCallback(async () => {
    await Promise.all([specsQuery.refetch(), statsQuery.refetch()]);
  }, [specsQuery, statsQuery]);

  const isLoading = projectLoading || specsQuery.isLoading || statsQuery.isLoading;
  const queryError = specsQuery.error || statsQuery.error;
  const resolvedError = queryError ? t('dashboard.state.errorDescription') : null;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!currentProject) {
    return (
      <PageContainer>
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <div className="text-lg font-semibold">{t('dashboard.state.noProjectTitle', { defaultValue: 'No project selected' })}</div>
            <p className="text-sm text-muted-foreground">
              {t('dashboard.state.noProjectDescription', { defaultValue: 'Select or create a project to view the dashboard.' })}
            </p>
            <Link to="/projects" className="inline-flex">
              <Button variant="secondary" size="sm">{t('projectsPage.title', { defaultValue: 'Projects' })}</Button>
            </Link>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (resolvedError) {
    return (
      <PageContainer>
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <div className="flex justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div className="text-lg font-semibold">{t('dashboard.state.errorTitle')}</div>
            <p className="text-sm text-muted-foreground">{resolvedError || t('dashboard.state.errorDescription')}</p>
            <Button variant="secondary" size="sm" onClick={loadData} className="mt-2">
              {t('actions.retry')}
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
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
