import { Search, Filter, X, Clock, PlayCircle, CheckCircle2, Archive, AlertCircle, ArrowUp, Minus, ArrowDown, Settings, List, LayoutGrid, FolderTree, AlertTriangle, Check, ChevronDown, Loader2 } from 'lucide-react';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@leanspec/ui-components';
import { useTranslation } from 'react-i18next';

type ViewMode = 'list' | 'board';

interface SpecsFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string[];
  onStatusFilterChange: (status: string[]) => void;
  priorityFilter: string[];
  onPriorityFilterChange: (priority: string[]) => void;
  tagFilter: string[];
  onTagFilterChange: (tag: string[]) => void;
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
  loadingValidation?: boolean;
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
  loadingValidation,
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
  const hasActiveFilters = searchQuery || statusFilter.length > 0 || priorityFilter.length > 0 || tagFilter.length > 0 || showValidationIssuesOnly;
  const hasActiveSettings = groupByParent || showValidationIssuesOnly || showArchived;

  const toggleStatus = (status: string) => {
    onStatusFilterChange(
      statusFilter.includes(status)
        ? statusFilter.filter(s => s !== status)
        : [...statusFilter, status]
    );
  };

  const togglePriority = (priority: string) => {
    onPriorityFilterChange(
      priorityFilter.includes(priority)
        ? priorityFilter.filter(p => p !== priority)
        : [...priorityFilter, priority]
    );
  };

  const toggleTag = (tag: string) => {
    onTagFilterChange(
      tagFilter.includes(tag)
        ? tagFilter.filter(t => t !== tag)
        : [...tagFilter, tag]
    );
  };

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

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[140px] justify-between h-9 px-3">
                <span className="truncate">
                  {statusFilter.length === 0
                    ? t('specsPage.filters.statusAll')
                    : statusFilter.length === 1
                      ? formatStatus(statusFilter[0])
                      : `${statusFilter.length} ${t('specsNavSidebar.selected')}`}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[180px] p-1" align="start">
              <div className="space-y-1">
                {uniqueStatuses.map(status => {
                  const StatusIcon = statusIcons[status];
                  const isSelected = statusFilter.includes(status);
                  return (
                    <div
                      key={status}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer group"
                      onClick={() => toggleStatus(status)}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-4 h-4 border rounded transition-colors",
                        isSelected ? "bg-primary border-primary text-primary-foreground" : "group-hover:border-primary/50"
                      )}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        {StatusIcon && <StatusIcon className="h-4 w-4" />}
                        <span className="text-sm">{formatStatus(status)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[140px] justify-between h-9 px-3">
                <span className="truncate">
                  {priorityFilter.length === 0
                    ? t('specsPage.filters.priorityAll')
                    : priorityFilter.length === 1
                      ? formatPriority(priorityFilter[0])
                      : `${priorityFilter.length} ${t('specsNavSidebar.selected')}`}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[180px] p-1" align="start">
              <div className="space-y-1">
                {uniquePriorities.map(priority => {
                  const PriorityIcon = priorityIcons[priority];
                  const isSelected = priorityFilter.includes(priority);
                  return (
                    <div
                      key={priority}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer group"
                      onClick={() => togglePriority(priority)}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-4 h-4 border rounded transition-colors",
                        isSelected ? "bg-primary border-primary text-primary-foreground" : "group-hover:border-primary/50"
                      )}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        {PriorityIcon && <PriorityIcon className="h-4 w-4" />}
                        <span className="text-sm">{formatPriority(priority)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[140px] justify-between h-9 px-3">
                <span className="truncate">
                  {tagFilter.length === 0
                    ? t('specsNavSidebar.select.tag.all')
                    : tagFilter.length === 1
                      ? tagFilter[0]
                      : `${tagFilter.length} ${t('specsNavSidebar.selected')}`}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[180px] p-1" align="start">
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {uniqueTags.map(tag => {
                  const isSelected = tagFilter.includes(tag);
                  return (
                    <div
                      key={tag}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer group"
                      onClick={() => toggleTag(tag)}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-4 h-4 border rounded transition-colors",
                        isSelected ? "bg-primary border-primary text-primary-foreground" : "group-hover:border-primary/50"
                      )}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span className="text-sm flex-1 break-all">{tag}</span>
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

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

          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            {loadingValidation && showValidationIssuesOnly && (
              <Loader2 className="w-3 h-3 animate-spin" />
            )}
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
                <FolderTree className="w-4 h-4 mr-2" />
                {t('specsPage.filters.groupByParent')}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={showValidationIssuesOnly}
                onCheckedChange={onShowValidationIssuesOnlyChange}
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
