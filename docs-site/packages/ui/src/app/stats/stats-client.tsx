'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, CheckCircle2, PlayCircle, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Stats {
  totalSpecs: number;
  completionRate: number;
  specsByStatus: { status: string; count: number }[];
  specsByPriority?: { priority: string; count: number }[];
}

interface Spec {
  id: string;
  specNumber: number | null;
  status: string | null;
  priority: string | null;
  tags: string[] | null;
  createdAt: Date | null;
}

interface StatsClientProps {
  stats: Stats;
  specs: Spec[];
}

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

export function StatsClient({ stats, specs }: StatsClientProps) {
  // Calculate priority breakdown
  const priorityBreakdown = specs.reduce((acc, spec) => {
    const priority = spec.priority || 'unknown';
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const priorityData = Object.entries(priorityBreakdown).map(([priority, count]) => ({
    name: priority.charAt(0).toUpperCase() + priority.slice(1),
    value: count,
    color: PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || '#6B7280',
  }));

  // Calculate status data for charts
  const statusData = stats.specsByStatus.map(item => ({
    name: item.status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    value: item.count,
    color: STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] || '#6B7280',
  }));

  // Calculate tag frequency
  const tagFrequency = specs.reduce((acc, spec) => {
    (spec.tags || []).forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const topTags = Object.entries(tagFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  // Calculate monthly trends (last 6 months)
  const monthlyTrends = specs
    .filter(spec => spec.createdAt)
    .reduce((acc, spec) => {
      const month = new Date(spec.createdAt!).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const trendData = Object.entries(monthlyTrends)
    .slice(-6)
    .map(([month, count]) => ({ month, count }));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Project Statistics</h1>
          <p className="text-muted-foreground mt-2">Comprehensive metrics and insights</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Total Specs */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
            <CardHeader className="relative pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Specs</CardTitle>
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold">{stats.totalSpecs}</div>
              <p className="text-xs text-muted-foreground mt-1">All specifications</p>
            </CardContent>
          </Card>

          {/* Completed */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
            <CardHeader className="relative pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold">
                {stats.specsByStatus.find(s => s.status === 'complete')?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-green-600 font-medium">{stats.completionRate}%</span> completion rate
              </p>
            </CardContent>
          </Card>

          {/* In Progress */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent" />
            <CardHeader className="relative pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
                <PlayCircle className="h-5 w-5 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold">
                {stats.specsByStatus.find(s => s.status === 'in-progress')?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Active work</p>
            </CardContent>
          </Card>

          {/* Planned */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
            <CardHeader className="relative pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Planned</CardTitle>
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold">
                {stats.specsByStatus.find(s => s.status === 'planned')?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Upcoming work</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Status Distribution</CardTitle>
              <CardDescription>Breakdown of specs by status</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Priority Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Priority Distribution</CardTitle>
              <CardDescription>Breakdown of specs by priority</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Trends and Tags */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trends */}
          {trendData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Creation Trend</CardTitle>
                <CardDescription>Specs created over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Top Tags */}
          {topTags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Tags</CardTitle>
                <CardDescription>Most frequently used tags</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topTags.map(({ tag, count }) => (
                    <div key={tag} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{tag}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${(count / topTags[0].count) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
