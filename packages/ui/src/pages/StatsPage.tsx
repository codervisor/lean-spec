import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { AlertCircle, FileText, Clock, PlayCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, cn } from '@/library';
import { Link } from 'react-router-dom';
import { StatCard } from '../components/dashboard/stat-card';
import type { Stats, Spec } from '../types/api';
import { StatsSkeleton } from '../components/shared/skeletons';
import { PageHeader } from '../components/shared/page-header';
import { PageContainer } from '../components/shared/page-container';
import { useTranslation } from 'react-i18next';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { useProjectStats, useSpecsList } from '../hooks/useSpecsQuery';
import { resolveTokenStatus, tokenProgressClasses } from '../lib/token-utils';

const STATUS_COLORS = {
  draft: '#94A3B8',
  planned: '#3B82F6',
  'in-progress': '#F59E0B',
  complete: '#10B981',
  archived: '#6B7280',
};

const PRIORITY_COLORS = {
  critical: '#EF4444',
  high: '#F59E0B',
  medium: '#3B82F6',
  low: '#6B7280',
};

export function StatsPage() {
  const { t, i18n } = useTranslation('common');
  const { currentProject, loading: projectLoading } = useCurrentProject();
  const resolvedProjectId = currentProject?.id ?? null;
  const statsQuery = useProjectStats(resolvedProjectId);
  const specsQuery = useSpecsList(resolvedProjectId);
  const stats = (statsQuery.data as Stats | undefined) ?? null;
  const specs = (specsQuery.data as Spec[] | undefined) ?? [];
  const loading = statsQuery.isLoading || specsQuery.isLoading;
  const error = statsQuery.error || specsQuery.error ? t('statsPage.state.errorDescription') : null;

  // Prepare data for charts - must be before any conditional returns
  const statusCounts = useMemo(() => stats?.specsByStatus.reduce<Record<string, number>>((acc: Record<string, number>, entry: { status: string; count: number }) => {
    acc[entry.status] = entry.count;
    return acc;
  }, {}) || {}, [stats?.specsByStatus]);

  const statusData = useMemo(() => stats?.specsByStatus.map(({ status, count }: { status: string; count: number }) => ({
    name: t(`status.${status}`, { defaultValue: status }),
    value: count,
    fill: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#6B7280',
  })) || [], [stats?.specsByStatus, t]);

  const priorityData = useMemo(() => (stats?.specsByPriority || []).map(({ priority, count }: { priority: string; count: number }) => ({
    name: t(`priority.${priority}`, { defaultValue: priority }),
    value: count,
    fill: PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || '#6B7280',
  })), [stats?.specsByPriority, t]);

  const topTags = useMemo(() => {
    const tagFrequency = specs.reduce<Record<string, number>>((acc, spec) => {
      (spec.tags || []).forEach((tag: string) => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    }, {});

    return Object.entries(tagFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));
  }, [specs]);

  const trendData = useMemo(() => {
    const monthFormatter = new Intl.DateTimeFormat(i18n.language, { year: 'numeric', month: 'short' });
    const monthly = specs
      .filter((spec) => spec.createdAt)
      .reduce<Record<string, number>>((acc, spec) => {
        try {
          const date = typeof spec.createdAt === 'string'
            ? new Date(spec.createdAt)
            : spec.createdAt;

          if (date instanceof Date && !isNaN(date.getTime())) {
            const month = monthFormatter.format(date);
            acc[month] = (acc[month] || 0) + 1;
          }
        } catch {
          // Skip invalid dates
        }
        return acc;
      }, {});

    return Object.entries(monthly)
      .slice(-6)
      .map(([month, count]) => ({ month, count }));
  }, [i18n.language, specs]);

  const tokenDistribution = useMemo(() => {
    const counts = {
      optimal: 0,
      good: 0,
      warning: 0,
      critical: 0,
      unknown: 0,
    };

    specs.forEach((spec) => {
      if (typeof spec.tokenCount === 'number') {
        const status = resolveTokenStatus(spec.tokenCount);
        counts[status] += 1;
      } else {
        counts.unknown += 1;
      }
    });

    const knownTotal = counts.optimal + counts.good + counts.warning + counts.critical;

    return {
      counts,
      knownTotal,
    };
  }, [specs]);

  const completionRate = stats?.completionRate.toFixed(1) || '0.0';

  if (projectLoading || loading) {
    return <StatsSkeleton />;
  }

  if (!currentProject) {
    return (
      <PageContainer>
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <div className="text-lg font-semibold">{t('statsPage.state.noProjectTitle', { defaultValue: 'No project selected' })}</div>
            <p className="text-sm text-muted-foreground">
              {t('statsPage.state.noProjectDescription', { defaultValue: 'Select or create a project to view statistics.' })}
            </p>
            <Link to="/projects" className="inline-flex">
              <Button variant="secondary" size="sm">{t('projectsPage.title', { defaultValue: 'Projects' })}</Button>
            </Link>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (error || !stats) {
    return (
      <PageContainer>
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <div className="flex justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div className="text-lg font-semibold">{t('statsPage.state.errorTitle')}</div>
            <p className="text-sm text-muted-foreground">{error || t('statsPage.state.unknownError')}</p>
            <Button variant="secondary" size="sm" onClick={() => void statsQuery.refetch()} className="mt-2">
              {t('actions.retry')}
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer contentClassName="space-y-6">
      <PageHeader
        title={t('statsPage.title')}
        description={t('statsPage.description')}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title={t('statsPage.cards.total.title')}
          value={stats.totalSpecs}
          icon={FileText}
          iconColor="text-blue-600"
          gradientFrom="from-blue-500/10"
        />
        <StatCard
          title={t('statsPage.cards.planned.title')}
          value={statusCounts.planned || 0}
          icon={Clock}
          iconColor="text-purple-600"
          gradientFrom="from-purple-500/10"
        />
        <StatCard
          title={t('statsPage.cards.inProgress.title')}
          value={statusCounts['in-progress'] || 0}
          icon={PlayCircle}
          iconColor="text-orange-600"
          gradientFrom="from-orange-500/10"
        />
        <StatCard
          title={t('statsPage.cards.completed.title')}
          value={statusCounts.complete || 0}
          icon={CheckCircle2}
          iconColor="text-green-600"
          gradientFrom="from-green-500/10"
          subtext={
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {completionRate}% {t('statsPage.cards.completed.subtitle')}
            </span>
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('statsPage.tokenDistribution.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {tokenDistribution.knownTotal === 0 ? (
            <p className="text-sm text-muted-foreground">{t('statsPage.tokenDistribution.empty')}</p>
          ) : (
            <div className="space-y-4">
              {(['optimal', 'good', 'warning', 'critical'] as const).map((status) => {
                const count = tokenDistribution.counts[status];
                const percent = tokenDistribution.knownTotal > 0 ? (count / tokenDistribution.knownTotal) * 100 : 0;
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{t(`statsPage.tokenDistribution.buckets.${status}`)}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className={cn('h-2 rounded-full transition-all duration-500', tokenProgressClasses[status])}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {tokenDistribution.counts.unknown > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t('statsPage.tokenDistribution.unknown', { count: tokenDistribution.counts.unknown })}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Distribution - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t('statsPage.charts.status.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => t('statsPage.charts.label', { name, value })}
                  outerRadius={80}
                  dataKey="value"
                >
                  {statusData.map((entry: { name: string; value: number; fill: string }, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Priority Distribution - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t('statsPage.charts.priority.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {trendData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('statsPage.charts.creation.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {topTags.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('statsPage.charts.topTags.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topTags.map(({ tag, count }) => (
                  <div key={tag} className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium truncate">{tag}</span>
                    <div className="flex items-center gap-2 w-40">
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${(count / topTags[0].count) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
