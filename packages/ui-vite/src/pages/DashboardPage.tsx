import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  List as ListIcon,
  Loader2,
  PlayCircle,
  TrendingUp,
} from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@leanspec/ui-components';
import { api, type Stats } from '../lib/api';
import { useProject } from '../contexts';
import { StatCard } from '../components/dashboard/StatCard';
import { SpecListItem, type DashboardSpec } from '../components/dashboard/SpecListItem';
import { ActivityItem } from '../components/dashboard/ActivityItem';

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

        const rawSpecs = Array.isArray(specsData) ? specsData : [];

        const transformedSpecs = rawSpecs.map((spec) => {
          const name = spec?.name || '';
          const match = name.match(/^(\d+)-/);
          const specNumber = match ? parseInt(match[1], 10) : null;

          return {
            ...spec,
            name,
            id: name || spec?.title || crypto.randomUUID(),
            specNumber,
            created: spec?.created ? new Date(spec.created) : null,
            updated: spec?.updated ? new Date(spec.updated) : null,
          } as DashboardSpec;
        });

        setSpecs(transformedSpecs);
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
      if (!a.created) return 1;
      if (!b.created) return -1;
      return b.created.getTime() - a.created.getTime();
    })
    .slice(0, 5);

  const recentActivity = specs
    .filter((spec) => spec.updated)
    .sort((a, b) => {
      if (!a.updated) return 1;
      if (!b.updated) return -1;
      return b.updated.getTime() - a.updated.getTime();
    })
    .slice(0, 10);

  const completeCount = stats.by_status?.['complete'] || 0;
  const totalSpecs = stats.total;
  const completionRate = totalSpecs > 0 ? (completeCount / totalSpecs) * 100 : 0;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <div>
          <div className="flex items-center gap-3">
            {projectColor && (
              <div
                className="h-8 w-2 rounded-full shrink-0"
                style={{ backgroundColor: projectColor }}
              />
            )}
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Dashboard</h1>
          </div>
          <p className="text-muted-foreground mt-2">Project overview and recent activity</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Total Specs"
            value={totalSpecs}
            icon={FileText}
            iconColor="text-blue-600"
            gradientFrom="from-blue-500/10"
          />
          <StatCard
            title="Planned"
            value={stats.by_status?.['planned'] || 0}
            icon={Clock}
            iconColor="text-purple-600"
            gradientFrom="from-purple-500/10"
          />
          <StatCard
            title="In Progress"
            value={stats.by_status?.['in-progress'] || 0}
            icon={PlayCircle}
            iconColor="text-orange-600"
            gradientFrom="from-orange-500/10"
          />
          <StatCard
            title="Completed"
            value={completeCount}
            icon={CheckCircle2}
            iconColor="text-green-600"
            gradientFrom="from-green-500/10"
            subtext={
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {completionRate.toFixed(1)}% completion rate
              </span>
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Recently Added
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {recentlyAdded.slice(0, 5).map((spec) => (
                <SpecListItem key={spec.id} spec={spec} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600" />
                Planned ({plannedSpecs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {plannedSpecs.length > 0 ? (
                plannedSpecs.map((spec) => <SpecListItem key={spec.id} spec={spec} />)
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No planned specs</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-orange-600" />
                In Progress ({inProgressSpecs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {inProgressSpecs.length > 0 ? (
                inProgressSpecs.map((spec) => <SpecListItem key={spec.id} spec={spec} />)
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No specs in progress</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-l-2 border-muted pl-4 space-y-1">
              {recentActivity.map((spec) => (
                <ActivityItem key={spec.id} spec={spec} action="updated" time={spec.updated} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/specs">
                  <ListIcon className="h-4 w-4 mr-2" />
                  View All Specs
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/stats">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Stats
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
