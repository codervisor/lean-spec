import { useEffect, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@leanspec/ui-components';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { api, type Spec } from '../lib/api';
import { cn } from '../lib/utils';

// Extended Spec type for UI logic
interface SidebarSpec extends Spec {
  id: string;
  specNumber: number | null;
}

export function SpecsNavSidebar() {
  const location = useLocation();
  const [specs, setSpecs] = useState<SidebarSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Load specs
  useEffect(() => {
    async function loadSpecs() {
      try {
        setLoading(true);
        const data = await api.getSpecs();
        const processed = data.map(spec => {
          const match = spec.name.match(/^(\d+)-/);
          const specNumber = match ? parseInt(match[1], 10) : null;
          return {
            ...spec,
            id: spec.name,
            specNumber,
          };
        });
        setSpecs(processed);
      } catch (err) {
        console.error('Failed to load specs for sidebar', err);
      } finally {
        setLoading(false);
      }
    }
    loadSpecs();
  }, []);

  // Filter and sort specs
  const filteredSpecs = useMemo(() => {
    let result = specs;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (spec) =>
          spec.title?.toLowerCase().includes(query) ||
          spec.name.toLowerCase().includes(query) ||
          spec.specNumber?.toString().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((spec) => spec.status === statusFilter);
    }

    // Sort by number descending (newest first)
    return result.sort((a, b) => (b.specNumber || 0) - (a.specNumber || 0));
  }, [specs, searchQuery, statusFilter]);

  if (collapsed) {
    return (
      <div className="border-r bg-background h-[calc(100vh-3.5rem)] sticky top-14 w-4 flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 absolute -right-3 top-4 bg-background border rounded-full shadow-sm z-10"
          onClick={() => setCollapsed(false)}
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <aside className="w-[280px] border-r bg-background h-[calc(100vh-3.5rem)] sticky top-14 flex flex-col">
      <div className="p-3 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Specifications</h2>
          <div className="flex items-center gap-1">
            <Button
              variant={showFilters ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setShowFilters(!showFilters)}
              title="Toggle filters"
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setCollapsed(true)}
              title="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search specs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {showFilters && (
          <div className="space-y-2 pt-2 border-t">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-8 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All Statuses</option>
              <option value="planned">Planned</option>
              <option value="in-progress">In Progress</option>
              <option value="complete">Complete</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {loading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : filteredSpecs.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No specs found
          </div>
        ) : (
          filteredSpecs.map((spec) => {
            const isActive = location.pathname === `/specs/${spec.name}`;
            const displayTitle = spec.title || spec.name;

            return (
              <Link
                key={spec.id}
                to={`/specs/${spec.name}`}
                className={cn(
                  "flex flex-col gap-1 p-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "hover:bg-accent/50"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {spec.specNumber && (
                    <span className="text-xs font-mono text-muted-foreground shrink-0">
                      #{spec.specNumber.toString().padStart(3, '0')}
                    </span>
                  )}
                  <span className="truncate text-xs leading-relaxed">{displayTitle}</span>
                </div>
                <div className="flex items-center gap-2">
                  {spec.status && (
                    <StatusBadge status={spec.status} className="text-[10px] px-1.5 py-0 h-4" />
                  )}
                  {spec.priority && (
                    <PriorityBadge priority={spec.priority} className="text-[10px] px-1.5 py-0 h-4" />
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </aside>
  );
}
