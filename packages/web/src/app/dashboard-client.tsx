'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  CheckCircle2, 
  PlayCircle, 
  Clock,
  LayoutGrid,
  List,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { PriorityBadge } from '@/components/priority-badge';
import { Badge } from '@/components/ui/badge';
import { extractH1Title } from '@/lib/utils';

interface Spec {
  id: string;
  specNumber: number | null;
  specName: string;
  title: string | null;
  status: string | null;
  priority: string | null;
  tags: string[] | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  contentMd?: string;
}

interface Stats {
  totalSpecs: number;
  completionRate: number;
  specsByStatus: { status: string; count: number }[];
}

interface DashboardClientProps {
  initialSpecs: Spec[];
  initialStats: Stats;
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
  // Extract H1 title from content if available, fallback to title or name
  const h1Title = spec.contentMd ? extractH1Title(spec.contentMd) : null;
  const displayTitle = h1Title || spec.title || spec.specName;
  
  return (
    <Link 
      href={`/specs/${spec.specNumber}`}
      className="block p-3 rounded-lg hover:bg-accent transition-colors"
      title={spec.specName} /* Show name as tooltip */
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
          {/* Show spec name as secondary if it differs from title */}
          {displayTitle !== spec.specName && (
            <div className="text-xs text-muted-foreground mb-1">
              {spec.specName}
            </div>
          )}
          {spec.tags && spec.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {spec.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {spec.status && <StatusBadge status={spec.status} className="text-xs scale-90" />}
          {spec.priority && <PriorityBadge priority={spec.priority} className="text-xs scale-90" />}
        </div>
      </div>
    </Link>
  );
}

function ActivityItem({ spec, action, time }: { spec: Spec; action: string; time: Date | null }) {
  const h1Title = spec.contentMd ? extractH1Title(spec.contentMd) : null;
  const displayTitle = h1Title || spec.title || spec.specName;
  
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <Link 
            href={`/specs/${spec.specNumber}`}
            className="font-medium hover:underline"
            title={spec.specName}
          >
            #{spec.specNumber?.toString().padStart(3, '0')} {displayTitle}
          </Link>
          {' '}
          <span className="text-muted-foreground">{action}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatRelativeTime(time)}
        </p>
      </div>
    </div>
  );
}

export function DashboardClient({ initialSpecs, initialStats }: DashboardClientProps) {
  const stats = initialStats;
  
  // Get specs by status
  const inProgressSpecs = initialSpecs
    .filter(spec => spec.status === 'in-progress')
    .sort((a, b) => (b.specNumber || 0) - (a.specNumber || 0))
    .slice(0, 5);
  
  const plannedSpecs = initialSpecs
    .filter(spec => spec.status === 'planned')
    .sort((a, b) => (b.specNumber || 0) - (a.specNumber || 0))
    .slice(0, 5);
  
  const recentlyAdded = initialSpecs
    .sort((a, b) => {
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, 5);
  
  const recentActivity = initialSpecs
    .filter(spec => spec.updatedAt)
    .sort((a, b) => {
      if (!a.updatedAt) return 1;
      if (!b.updatedAt) return -1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    })
    .slice(0, 10);
  
  const completeCount = stats.specsByStatus.find(s => s.status === 'complete')?.count || 0;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Project overview and recent activity
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Specs */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
            <CardHeader className="relative pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Specs
                </CardTitle>
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold">{stats.totalSpecs}</div>
            </CardContent>
          </Card>

          {/* In Progress */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent" />
            <CardHeader className="relative pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  In Progress
                </CardTitle>
                <PlayCircle className="h-5 w-5 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold">
                {stats.specsByStatus.find(s => s.status === 'in-progress')?.count || 0}
              </div>
            </CardContent>
          </Card>

          {/* Completed */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
            <CardHeader className="relative pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completed
                </CardTitle>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold">{completeCount}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {stats.completionRate.toFixed(1)}% completion rate
              </p>
            </CardContent>
          </Card>

          {/* Planned */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
            <CardHeader className="relative pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Planned
                </CardTitle>
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold">
                {stats.specsByStatus.find(s => s.status === 'planned')?.count || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Recently Added */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Recently Added
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {recentlyAdded.slice(0, 5).map(spec => (
                <SpecListItem key={spec.id} spec={spec} />
              ))}
            </CardContent>
          </Card>

          {/* Planned Specs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600" />
                Planned ({plannedSpecs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {plannedSpecs.length > 0 ? (
                plannedSpecs.map(spec => (
                  <SpecListItem key={spec.id} spec={spec} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No planned specs
                </p>
              )}
            </CardContent>
          </Card>

          {/* In Progress Specs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-orange-600" />
                In Progress ({inProgressSpecs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {inProgressSpecs.length > 0 ? (
                inProgressSpecs.map(spec => (
                  <SpecListItem key={spec.id} spec={spec} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No specs in progress
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-l-2 border-muted pl-4 space-y-1">
              {recentActivity.map(spec => (
                <ActivityItem 
                  key={spec.id}
                  spec={spec}
                  action="updated"
                  time={spec.updatedAt}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/specs">
                  <List className="h-4 w-4 mr-2" />
                  View All Specs
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/specs?view=board">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Board View
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/stats">
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
