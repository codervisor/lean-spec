import { Search, Filter, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Button,
} from '@leanspec/ui-components';
import { useTranslation } from 'react-i18next';

interface SpecsFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (priority: string) => void;
  tagFilter: string;
  onTagFilterChange: (tag: string) => void;
  sortBy: string;
  onSortByChange: (sort: string) => void;
  uniqueStatuses: string[];
  uniquePriorities: string[];
  uniqueTags: string[];
  onClearFilters: () => void;
  totalSpecs: number;
  filteredCount: number;
}

export function SpecsFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  tagFilter,
  onTagFilterChange,
  sortBy,
  onSortByChange,
  uniqueStatuses,
  uniquePriorities,
  uniqueTags,
  onClearFilters,
  totalSpecs,
  filteredCount,
}: SpecsFiltersProps) {
  const { t } = useTranslation('common');
  const statusKeyMap: Record<string, `status.${string}`> = {
    planned: 'status.planned',
    'in-progress': 'status.inProgress',
    complete: 'status.complete',
    archived: 'status.archived',
  };
  const priorityKeyMap: Record<string, `priority.${string}`> = {
    critical: 'priority.critical',
    high: 'priority.high',
    medium: 'priority.medium',
    low: 'priority.low',
  };

  const formatStatus = (status: string) => statusKeyMap[status] ? t(statusKeyMap[status]) : status;
  const formatPriority = (priority: string) => priorityKeyMap[priority] ? t(priorityKeyMap[priority]) : priority;
  const hasActiveFilters = searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || tagFilter !== 'all';

  return (
    <div className="space-y-4 mb-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('specsPage.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2"
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">{t('specsNavSidebar.filtersLabel')}</span>
          </div>

          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('specsPage.filters.statusAll')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('specsPage.filters.statusAll')}</SelectItem>
              {uniqueStatuses.map(status => (
                <SelectItem key={status} value={status}>{formatStatus(status)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('specsPage.filters.priorityAll')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('specsPage.filters.priorityAll')}</SelectItem>
              {uniquePriorities.map(priority => (
                <SelectItem key={priority} value={priority}>{formatPriority(priority)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tagFilter} onValueChange={onTagFilterChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('specsNavSidebar.select.tag.all')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('specsNavSidebar.select.tag.all')}</SelectItem>
              {uniqueTags.map(tag => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t('specsPage.filters.sort')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="id-desc">{t('specsPage.filters.sortOptions.id-desc')}</SelectItem>
              <SelectItem value="id-asc">{t('specsPage.filters.sortOptions.id-asc')}</SelectItem>
              <SelectItem value="updated-desc">{t('specsPage.filters.sortOptions.updated-desc')}</SelectItem>
              <SelectItem value="title-asc">{t('specsPage.filters.sortOptions.title-asc')}</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              onClick={onClearFilters}
              variant="ghost"
              size="sm"
              className="h-8 gap-1"
            >
              <X className="w-3 h-3" />
              {t('specsNavSidebar.clearFilters')}
            </Button>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          {t('specsPage.filters.filteredCount', { filtered: filteredCount, total: totalSpecs })}
        </div>
      </div>
    </div>
  );
}
