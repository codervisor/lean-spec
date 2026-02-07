import { Card } from '../ui/card';
import { SpecCard } from '../spec/spec-card';
import { EmptyState } from '../layout/empty-state';
import { Search } from 'lucide-react';
import type { LightweightSpec } from '../../types/specs';

export interface SearchResultsProps {
  results: LightweightSpec[];
  query: string;
  isSearching?: boolean;
  onSpecClick?: (specId: string) => void;
}

export function SearchResults({
  results,
  query,
  isSearching = false,
  onSpecClick,
}: SearchResultsProps) {
  if (isSearching) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          Searching...
        </div>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="No results found"
        description={query ? `No specs match "${query}"` : "Try a different search query"}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {results.map((spec) => (
        <SpecCard
          key={spec.id}
          spec={spec}
          onClick={onSpecClick ? () => onSpecClick(spec.id) : undefined}
        />
      ))}
    </div>
  );
}
