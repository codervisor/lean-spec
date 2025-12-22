import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import { api, type Spec } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';

export function SpecsPage() {
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');

  useEffect(() => {
    api.getSpecs()
      .then(setSpecs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Get unique values for filters
  const uniqueStatuses = useMemo(() =>
    Array.from(new Set(specs.map(s => s.status))),
    [specs]
  );
  const uniquePriorities = useMemo(() =>
    Array.from(new Set(specs.map(s => s.priority).filter(Boolean))),
    [specs]
  );
  const uniqueTags = useMemo(() =>
    Array.from(new Set(specs.flatMap(s => s.tags || []))),
    [specs]
  );

  // Filter specs based on search and filters
  const filteredSpecs = useMemo(() => {
    return specs.filter(spec => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          spec.name.toLowerCase().includes(query) ||
          spec.title.toLowerCase().includes(query) ||
          (spec.tags?.some(tag => tag.toLowerCase().includes(query)));
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && spec.status !== statusFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && spec.priority !== priorityFilter) {
        return false;
      }

      // Tag filter
      if (tagFilter !== 'all' && !spec.tags?.includes(tagFilter)) {
        return false;
      }

      return true;
    });
  }, [specs, searchQuery, statusFilter, priorityFilter, tagFilter]);

  if (loading) {
    return <div className="text-center py-12">Loading specs...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-destructive">Error loading specs: {error}</div>
        <p className="text-sm text-muted-foreground mt-2">
          Make sure the HTTP server is running on http://localhost:3333
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Specs</h2>
        <div className="text-sm text-muted-foreground">
          {filteredSpecs.length} of {specs.length} {specs.length === 1 ? 'spec' : 'specs'}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, title, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Statuses</option>
          {uniqueStatuses.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Priorities</option>
          {uniquePriorities.map(priority => (
            <option key={priority} value={priority}>{priority}</option>
          ))}
        </select>

        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Tags</option>
          {uniqueTags.map(tag => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>

        {(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || tagFilter !== 'all') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setPriorityFilter('all');
              setTagFilter('all');
            }}
            className="text-sm text-primary hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {filteredSpecs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No specs match your filters
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSpecs.map((spec) => (
            <Link
              key={spec.name}
              to={`/specs/${spec.name}`}
              className="block p-4 border rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-medium">{spec.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{spec.name}</p>
                </div>
                <div className="flex gap-2 items-center">
                  {spec.status && <StatusBadge status={spec.status} />}
                  {spec.priority && <PriorityBadge priority={spec.priority} />}
                </div>
              </div>
              {spec.tags && spec.tags.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {spec.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 bg-secondary rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
