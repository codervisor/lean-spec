'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Search, FileText, CheckCircle2, PlayCircle, Clock, TrendingUp } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { PriorityBadge } from '@/components/priority-badge';
import { cn } from '@/lib/utils';

interface Spec {
  id: string;
  specNumber: number | null;
  specName: string;
  title: string | null;
  status: string | null;
  priority: string | null;
  tags: string[] | null;
}

interface Stats {
  totalSpecs: number;
  completionRate: number;
  specsByStatus: { status: string; count: number }[];
}

interface HomeClientProps {
  initialProjects: any[];
  initialStats: Stats;
  initialSpecs: Spec[];
}

export function HomeClient({ initialProjects, initialStats, initialSpecs }: HomeClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const filteredSpecs = useMemo(() => {
    return initialSpecs.filter(spec => {
      const matchesSearch = !searchQuery ||
        spec.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spec.specName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spec.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || spec.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || spec.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [initialSpecs, searchQuery, statusFilter, priorityFilter]);

  const stats = initialStats;

  return (
    <div className="min-h-screen bg-background">
      {/* Stats Section */}
      <section className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">LeanSpec Web</h1>
          <p className="text-muted-foreground mt-2">Interactive spec showcase for AI-powered development</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Total Specs */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-blue-500/10 to-transparent" />
            <CardHeader className="relative pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Specs</CardTitle>
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold">{stats.totalSpecs}</div>
            </CardContent>
          </Card>

          {/* Completed */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-green-500/10 to-transparent" />
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
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span className="text-green-600">{stats.completionRate}%</span>
                completion rate
              </p>
            </CardContent>
          </Card>

          {/* In Progress */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-blue-500/10 to-transparent" />
            <CardHeader className="relative pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
                <PlayCircle className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold">
                {stats.specsByStatus.find(s => s.status === 'in-progress')?.count || 0}
              </div>
            </CardContent>
          </Card>

          {/* Planned */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-orange-500/10 to-transparent" />
            <CardHeader className="relative pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Planned</CardTitle>
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold">
                {stats.specsByStatus.find(s => s.status === 'planned')?.count || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Specs List */}
      <section className="container mx-auto px-4 py-4">
        <div className="mb-1">
          <h2 className="text-2xl font-bold mb-4">Specifications</h2>

          {/* Search and Filters */}
          <div className="sticky top-14 z-40 bg-background pb-4 pt-2 mb-1">
            <div className="flex flex-col sm:flex-row gap-4 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search specs by title, name, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="border rounded-lg border-gray-200 dark:border-gray-800">
          <table className="w-full">
            <thead className="sticky top-14 z-30 border-b backdrop-blur border-gray-200 bg-background/95 dark:border-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Spec
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Priority
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredSpecs.map((spec) => (
                <tr key={spec.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => window.location.href = `/specs/${spec.specNumber || spec.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/specs/${spec.specNumber || spec.id}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {spec.specNumber ? `#${spec.specNumber}` : spec.specName}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">{spec.title || spec.specName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={spec.status || 'planned'} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <PriorityBadge priority={spec.priority || 'medium'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-muted-foreground border-t border-gray-200 dark:border-gray-800 mt-12">
        <p>LeanSpec - Lightweight spec methodology for AI-powered development</p>
        <p className="mt-2 text-sm">
          <a href="https://github.com/codervisor/lean-spec" className="text-primary hover:underline">
            View on GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
