import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@leanspec/ui-components';
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  List as ListIcon,
  PlayCircle,
  TrendingUp,
} from 'lucide-react';
import type { Stats } from '../../types/api';
import { StatCard } from './StatCard';
import { SpecListItem, type DashboardSpec } from './SpecListItem';
import { ActivityItem } from './ActivityItem';
import { useTranslation } from 'react-i18next';
import { useLayoutStore } from '../../stores/layout';
import { cn } from '@leanspec/ui-components';

interface DashboardClientProps {
  specs: DashboardSpec[];
  stats: Stats;
  projectColor?: string;
  projectName?: string;
  basePath?: string;
}

export function DashboardClient({ specs, stats, projectColor, projectName, basePath = '/projects' }: DashboardClientProps) {
  const { t } = useTranslation('common');
  const { isWideMode } = useLayoutStore();
  const inProgressSpecs = specs
    .filter((spec) => spec.status === 'in-progress')
    .sort((a, b) => (b.specNumber || 0) - (a.specNumber || 0))
    .slice(0, 5);

  const plannedSpecs = specs
    .filter((spec) => spec.status === 'planned')
    .sort((a, b) => (b.specNumber || 0) - (a.specNumber || 0))
    .slice(0, 5);

  const recentlyAdded = specs
    .slice()
    .sort((a, b) => {
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    })
    .slice(0, 5);

  const recentActivity = specs
    .filter((spec) => spec.updatedAt)
    .sort((a, b) => {
      if (!a.updatedAt) return 1;
      if (!b.updatedAt) return -1;
      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      return bTime - aTime;
    })
    .slice(0, 10);

  const statusCounts = stats.specsByStatus.reduce<Record<string, number>>((acc: Record<string, number>, entry: { status: string; count: number }) => {
    acc[entry.status] = entry.count;
    return acc;
  }, {});

  const completeCount = statusCounts['complete'] || 0;
  const completionRate = stats.completionRate ?? 0;

  return (
    <div className="min-h-screen w-full bg-background p-4 sm:p-8">
      <div className={cn("mx-auto space-y-6 sm:space-y-8", isWideMode ? "max-w-full" : "max-w-7xl")}>
        <div>
          <div className="flex items-center gap-3">
            {projectColor && (
              <div
                className="h-8 w-2 rounded-full shrink-0"
                style={{ backgroundColor: projectColor }}
              />
            )}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{t('dashboard.title')}</h1>
              <p className="text-muted-foreground mt-2">
                {projectName
                  ? t('dashboard.subtitleWithProject', { projectName })
                  : t('dashboard.subtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title={t('dashboard.cards.total')}
            value={stats.totalSpecs}
            icon={FileText}
            iconColor="text-blue-600"
            gradientFrom="from-blue-500/10"
          />
          <StatCard
            title={t('dashboard.cards.planned')}
            value={statusCounts['planned'] || 0}
            icon={Clock}
            iconColor="text-purple-600"
            gradientFrom="from-purple-500/10"
          />
          <StatCard
            title={t('dashboard.cards.inProgress')}
            value={statusCounts['in-progress'] || 0}
            icon={PlayCircle}
            iconColor="text-orange-600"
            gradientFrom="from-orange-500/10"
          />
          <StatCard
            title={t('dashboard.cards.completed')}
            value={completeCount}
            icon={CheckCircle2}
            iconColor="text-green-600"
            gradientFrom="from-green-500/10"
            subtext={
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {t('dashboard.cards.completionRate', { rate: completionRate.toFixed(1) })}
              </span>
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                {t('dashboard.recentlyAdded')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {recentlyAdded.slice(0, 5).map((spec) => (
                <SpecListItem key={spec.id} spec={spec} basePath={basePath} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600" />
                {t('dashboard.plannedSection', { count: plannedSpecs.length })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {plannedSpecs.length > 0 ? (
                plannedSpecs.map((spec) => <SpecListItem key={spec.id} spec={spec} basePath={basePath} />)
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">{t('dashboard.noPlanned')}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-orange-600" />
                {t('dashboard.inProgressSection', { count: inProgressSpecs.length })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {inProgressSpecs.length > 0 ? (
                inProgressSpecs.map((spec) => <SpecListItem key={spec.id} spec={spec} basePath={basePath} />)
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">{t('dashboard.noInProgress')}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('dashboard.recentActivity')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-l-2 border-muted pl-4 space-y-1">
              {recentActivity.map((spec) => (
                <ActivityItem key={spec.id} spec={spec} action={t('dashboard.actionUpdated')} time={spec.updatedAt ?? null} basePath={basePath} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('dashboard.quickActions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to={`${basePath}/specs`}>
                  <ListIcon className="h-4 w-4 mr-2" />
                  {t('dashboard.viewAllSpecs')}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to={`${basePath}/stats`}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {t('dashboard.viewStats')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

