'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Specs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.totalSpecs}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.completionRate}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {stats.specsByStatus.find(s => s.status === 'in-progress')?.count || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Planned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {stats.specsByStatus.find(s => s.status === 'planned')?.count || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Specs List */}
      <section className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">Specifications</h2>
          
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="all">All Status</option>
                <option value="planned">Planned</option>
                <option value="in-progress">In Progress</option>
                <option value="complete">Complete</option>
                <option value="archived">Archived</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="all">All Priority</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="text-sm text-muted-foreground mb-4">
            Showing {filteredSpecs.length} of {initialSpecs.length} specs
          </div>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
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
              <tbody className="divide-y">
                {filteredSpecs.map((spec) => (
                  <tr key={spec.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link 
                        href={`/specs/${spec.id}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {spec.specNumber ? `#${spec.specNumber}` : spec.specName}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{spec.title || spec.specName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={
                        spec.status === 'complete' ? 'default' :
                        spec.status === 'in-progress' ? 'secondary' :
                        'outline'
                      }>
                        {spec.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={
                        spec.priority === 'critical' ? 'destructive' :
                        spec.priority === 'high' ? 'secondary' :
                        'outline'
                      }>
                        {spec.priority || 'medium'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-muted-foreground border-t mt-12">
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
