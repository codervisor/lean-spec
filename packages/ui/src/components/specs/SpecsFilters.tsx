import { Search, Filter, X, Clock, PlayCircle, CheckCircle2, Archive, AlertCircle, ArrowUp, Minus, ArrowDown, Settings, List, LayoutGrid, Umbrella, AlertTriangle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  cn,
} from '@leanspec/ui-components';
import { useTranslation } from 'react-i18next';

type ViewMode = 'list' | 'board';

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
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  groupByParent: boolean;
  onGroupByParentChange: (value: boolean) => void;
  showValidationIssuesOnly: boolean;
  onShowValidationIssuesOnlyChange: (value: boolean) => void;
  showArchived: boolean;
  onShowArchivedChange: (value: boolean) => void;
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
  viewMode,
  onViewModeChange,
  groupByParent,
  onGroupByParentChange,
  showValidationIssuesOnly,
  onShowValidationIssuesOnlyChange,
  showArchived,
  onShowArchivedChange,
}: SpecsFiltersProps) {
  const { t } = useTranslation('common');

  // Status icons mapping
  const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    planned: Clock,
    'in-progress': PlayCircle,
    complete: CheckCircle2,
    archived: Archive,
  };

  // Priority icons mapping
  const priorityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    critical: AlertCircle,
    high: ArrowUp,
    medium: Minus,
    low: ArrowDown,
  };

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
  const hasActiveFilters = searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || tagFilter !== 'all' || showValidationIssuesOnly;
  const hasActiveSettings = groupByParent || showValidationIssuesOnly || showArchived;

  return (
    <div className="space-y-4">
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
              {uniqueStatuses.map(status => {
                const StatusIcon = statusIcons[status];
                return (
                  <SelectItem key={status} value={status}>
                    <div className="flex items-center gap-2">
                      {StatusIcon && <StatusIcon className="h-4 w-4" />}
                      <span>{formatStatus(status)}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('specsPage.filters.priorityAll')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('specsPage.filters.priorityAll')}</SelectItem>
              {uniquePriorities.map(priority => {
                const PriorityIcon = priorityIcons[priority];
                return (
                  <SelectItem key={priority} value={priority}>
                    <div className="flex items-center gap-2">
                      {PriorityIcon && <PriorityIcon className="h-4 w-4" />}
                      <span>{formatPriority(priority)}</span>
                    </div>
                  </SelectItem>
                );
              })}
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
              <SelectItem value="token-desc">{t('specsPage.filters.sortOptions.token-desc')}</SelectItem>
              <SelectItem value="token-asc">{t('specsPage.filters.sortOptions.token-asc')}</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              onClick={onClearFilters}
              variant="ghost"
              size="sm"
              className="h-9 gap-1"
            >
              <X className="w-4 h-4" />
              {t('specsNavSidebar.clearFilters')}
            </Button>
          )}

          <span className="text-sm text-muted-foreground">
            {t('specsPage.filters.filteredCount', { filtered: filteredCount, total: totalSpecs })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={hasActiveSettings ? "secondary" : "outline"}
                size="sm"
                className="h-9 gap-1.5"
              >
                <Settings className={cn("w-4 h-4", hasActiveSettings ? "text-primary" : "text-muted-foreground")} />
                <span className="hidden sm:inline">{t('specsPage.filters.settings')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuCheckboxItem
                checked={groupByParent}
                onCheckedChange={onGroupByParentChange}
              >
                <Umbrella className="w-4 h-4 mr-2" />
                {t('specsPage.filters.groupByParent')}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={showValidationIssuesOnly}
                onCheckedChange={onShowValidationIssuesOnlyChange}
                disabled
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                {t('specsPage.filters.withErrors')}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={showArchived}
                onCheckedChange={onShowArchivedChange}
              >
                <Archive className="w-4 h-4 mr-2" />
                {showArchived ? t('specsPage.filters.hideArchived') : t('specsPage.filters.showArchived')}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Mode Switch */}
          <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border h-9">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('list')}
              className={cn(
                "h-7",
                viewMode === 'list' && "bg-background shadow-sm"
              )}
              title={t('specsPage.views.listTooltip')}
            >
              <List className="w-4 h-4 mr-1.5" />
              {t('specsPage.views.list')}
            </Button>
            <Button
              variant={viewMode === 'board' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('board')}
              className={cn(
                "h-7",
                viewMode === 'board' && "bg-background shadow-sm"
              )}
              title={t('specsPage.views.boardTooltip')}
            >
              <LayoutGrid className="w-4 h-4 mr-1.5" />
              {t('specsPage.views.board')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
