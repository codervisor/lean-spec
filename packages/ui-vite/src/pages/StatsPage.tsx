import { useState, useEffect } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@leanspec/ui-components';
import { api, type Stats } from '../lib/api';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12">Loading statistics...</div>;
  }

  if (error || !stats) {
    return (
      <div className="text-center py-12">
        <div className="text-destructive">Error loading stats: {error || 'Unknown error'}</div>
      </div>
    );
  }

  // Prepare data for charts
  const statusCounts = stats.specsByStatus.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.status] = entry.count;
    return acc;
  }, {});

  const statusData = stats.specsByStatus.map(({ status, count }) => ({
    name: status
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
    value: count,
    fill: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#6B7280',
  }));

  const priorityData = Object.entries(stats.byPriority || {}).map(([priority, count]) => ({
    name: priority.charAt(0).toUpperCase() + priority.slice(1),
    value: count,
    fill: PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || '#6B7280',
  }));

  const completionRate = stats.completionRate.toFixed(1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Statistics</h2>
        <p className="text-muted-foreground mt-1">Overview of your specifications</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Specs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalSpecs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statusCounts.complete || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {completionRate}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statusCounts['in-progress'] || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Planned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statusCounts.planned || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Distribution - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
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
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
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
            <CardTitle>Priority Distribution</CardTitle>
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

      {/* Tags */}
      {Object.keys(stats.byTag || {}).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {Object.entries(stats.byTag || {})
                .sort(([, a], [, b]) => b - a)
                .map(([tag, count]) => (
                  <div
                    key={tag}
                    className="flex justify-between items-center p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                  >
                    <span className="text-sm font-medium">{tag}</span>
                    <span className="text-sm font-bold">{count}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
