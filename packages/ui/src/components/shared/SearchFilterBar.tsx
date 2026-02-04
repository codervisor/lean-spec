import { Search, Filter, ArrowUpDown, X } from 'lucide-react';
import {
  Input,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  Badge,
  cn
} from '@leanspec/ui-components';
import { useTranslation } from 'react-i18next';

export interface FilterOption {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export interface SortOption<T extends string = string> {
  value: T;
  label: string;
}

interface SearchFilterBarProps<TSort extends string = string> {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;

  sortOptions?: SortOption<TSort>[];
  sortBy?: TSort;
  onSortChange?: (value: TSort) => void;

  filters?: {
    label: string;
    options: FilterOption[];
  }[];

  resultCount?: number;
  totalCount?: number;
  filteredCountKey?: string;
  className?: string;
}

export function SearchFilterBar<TSort extends string = string>({
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  sortOptions = [],
  sortBy,
  onSortChange,
  filters = [],
  resultCount,
  totalCount,
  filteredCountKey = 'specsPage.filters.filteredCount',
  className
}: SearchFilterBarProps<TSort>) {
  const { t } = useTranslation('common');
  const activeFilters = filters.flatMap(g => g.options).filter(o => o.checked).length;

  return (
    <div className={cn("flex flex-col gap-4 mb-6", className)}>
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder || t('actions.search')}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => onSearchChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {/* Filters */}
          {filters.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 shrink-0">
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('specsNavSidebar.filtersLabel')}</span>
                  {activeFilters > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                      {activeFilters}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {filters.map((group, groupIndex) => (
                  <div key={group.label}>
                    {groupIndex > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                    {group.options.map((option) => (
                      <DropdownMenuCheckboxItem
                        key={option.id}
                        checked={option.checked}
                        onCheckedChange={option.onCheckedChange}
                      >
                        {option.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </div>
                ))}
                {activeFilters > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="justify-center text-muted-foreground text-xs"
                      onClick={() => {
                        filters.forEach(group => {
                          group.options.forEach(opt => opt.onCheckedChange(false));
                        });
                      }}
                    >
                      {t('specsNavSidebar.clearFilters')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Sort */}
          {sortOptions.length > 0 && onSortChange && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0" title={t('specsNavSidebar.sort.label')}>
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>{t('specsNavSidebar.sort.label')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => onSortChange(v as TSort)}>
                  {sortOptions.map((option) => (
                    <DropdownMenuRadioItem key={option.value} value={option.value}>
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Results summary (if filtered) */}
      {(resultCount !== undefined && totalCount !== undefined && resultCount < totalCount) && (
        <div className="text-sm text-muted-foreground">
          {t(filteredCountKey, { filtered: resultCount, total: totalCount })}
        </div>
      )}
    </div>
  );
}
