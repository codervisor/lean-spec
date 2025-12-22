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
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@leanspec/ui-components';
import { api, type Spec as APISpec, type Stats } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { useProject } from '../contexts';

// Extend API spec with dates as Date objects
interface Spec extends Omit<APISpec, 'created' | 'updated'> {
  created: Date | null;
  updated: Date | null;
  specNumber: number | null;
  id: string;
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return 'Unknown';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

function SpecListItem({ spec }: { spec: Spec }) {
  const displayTitle = spec.title || spec.name;
  const specUrl = `/specs/${spec.name}`;

  return (
    <Link
      to={specUrl}
      className="block p-3 rounded-lg hover:bg-accent transition-colors"
      title={spec.name}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {spec.specNumber && (
              <span className="text-sm font-mono text-muted-foreground shrink-0">
                #{spec.specNumber.toString().padStart(3, '0')}
              </span>
            )}
            <h4 className="text-sm font-medium truncate">
              {displayTitle}
            </h4>
          </div>
          {displayTitle !== spec.name && (
            <div className="text-xs text-muted-foreground mb-1">
              {spec.name}
            </div>
          )}
          {spec.tags && spec.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {spec.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {spec.status && <StatusBadge status={spec.status} className="text-[11px]" />}
          {spec.priority && <PriorityBadge priority={spec.priority} className="text-[11px]" />}
        </div>
      </div>
    </Link>
  );
}

function ActivityItem({ spec, action, time }: { spec: Spec; action: string; time: Date | null }) {
  const displayTitle = spec.title || spec.name;
  const specUrl = `/specs/${spec.name}`;

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <Link to={specUrl} className="font-medium hover:underline" title={spec.name}>
            {spec.specNumber && `#${spec.specNumber.toString().padStart(3, '0')} `}
            {displayTitle}
          </Link>{' '}
          <span className="text-muted-foreground">{action}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatRelativeTime(time)}
        </p>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { currentProject } = useProject();
  const [specs, setSpecs] = useState<Spec[]>([]);
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
          } as Spec;
        });

        console.debug(transformedSpecs)
        console.debug(statsData)

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
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
            <CardHeader className="relative pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Specs</CardTitle>
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold">{totalSpecs}</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
            <CardHeader className="relative pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Planned</CardTitle>
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold">{stats.by_status?.['planned'] || 0}</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent" />
            <CardHeader className="relative pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
                <PlayCircle className="h-5 w-5 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold">{stats.by_status?.['in-progress'] || 0}</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
            <CardHeader className="relative pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold">{completeCount}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {completionRate.toFixed(1)}% completion rate
              </p>
            </CardContent>
          </Card>
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
