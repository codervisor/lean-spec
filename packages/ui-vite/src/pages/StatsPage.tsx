import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { AlertCircle } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@leanspec/ui-components';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Stats, Spec } from '../types/api';
import { StatsSkeleton } from '../components/shared/Skeletons';
import { useTranslation } from 'react-i18next';
import { useProject } from '../contexts';

const STATUS_COLORS = {
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
  const [stats, setStats] = useState<Stats | null>(null);
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t, i18n } = useTranslation('common');
  const { currentProject, loading: projectLoading } = useProject();

  const loadStats = useCallback(async () => {
    if (projectLoading || !currentProject) return;
    try {
      setLoading(true);
      const [statsData, specsData] = await Promise.all([api.getStats(), api.getSpecs()]);
      setStats(statsData);
      setSpecs(Array.isArray(specsData) ? specsData : []);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load statistics';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [currentProject, projectLoading]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

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

  const completionRate = stats?.completionRate.toFixed(1) || '0.0';

  if (projectLoading || loading) {
    return <StatsSkeleton />;
  }

  if (!currentProject) {
    return (
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
    );
  }

  if (error || !stats) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-3">
          <div className="flex justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div className="text-lg font-semibold">{t('statsPage.state.errorTitle')}</div>
          <p className="text-sm text-muted-foreground">{error || t('statsPage.state.unknownError')}</p>
          <Button variant="secondary" size="sm" onClick={loadStats} className="mt-2">
            {t('actions.retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('statsPage.title')}</h2>
        <p className="text-muted-foreground mt-1">{t('statsPage.description')}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
          <CardHeader className="relative pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('statsPage.cards.total.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold">{stats.totalSpecs}</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
          <CardHeader className="relative pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('statsPage.cards.completed.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold">{statusCounts.complete || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {completionRate}% {t('statsPage.cards.completed.subtitle')}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent" />
          <CardHeader className="relative pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('statsPage.cards.inProgress.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold">{statusCounts['in-progress'] || 0}</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
          <CardHeader className="relative pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('statsPage.cards.planned.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold">{statusCounts.planned || 0}</div>
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}
