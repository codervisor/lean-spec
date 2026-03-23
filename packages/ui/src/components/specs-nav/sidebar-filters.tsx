import {
  Check,
  Search,
  Archive,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  cn,
  Input,
} from '@/library';
import { StatusBadge } from '../status-badge';
import { PriorityBadge } from '../priority-badge';
import { getStatusLabel, getPriorityLabel } from '@/lib/badge-config';

interface SidebarFiltersProps {
  statusFilter: string[];
  priorityFilter: string[];
  tagFilter: string[];
  showArchived: boolean;
  statusOptions: Array<'draft' | 'planned' | 'in-progress' | 'complete'>;
  allTags: string[];
  tagSearchQuery: string;
  onTagSearchQueryChange: (v: string) => void;
  onToggleStatus: (status: string) => void;
  onTogglePriority: (priority: string) => void;
  onToggleTag: (tag: string) => void;
  onToggleArchived: () => void;
  onClearAll: () => void;
  t: (key: string) => string;
}

export function SidebarFilters({
  statusFilter,
  priorityFilter,
  tagFilter,
  showArchived,
  statusOptions,
  allTags,
  tagSearchQuery,
  onTagSearchQueryChange,
  onToggleStatus,
  onTogglePriority,
  onToggleTag,
  onToggleArchived,
  onClearAll,
  t,
}: SidebarFiltersProps) {
  const hasActiveFilters = statusFilter.length > 0 || priorityFilter.length > 0 || tagFilter.length > 0;

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <span className="font-medium text-sm py-1">{t('specsNavSidebar.filtersLabel')}</span>
        {(hasActiveFilters || showArchived) && (
          <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={onClearAll}>
            {t('specsNavSidebar.clearFilters')}
          </Button>
        )}
      </div>
      <div className="max-h-[calc(100dvh-200px)] overflow-y-auto">
        <Accordion type="multiple" className="w-full">
          {/* Status accordion */}
          <AccordionItem value="status" className="border-b-0">
            <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 hover:no-underline text-xs">
              {statusFilter.length === 0
                ? t('specsNavSidebar.select.status.all')
                : `${t('specsNavSidebar.status')}: ${statusFilter.length} ${t('specsNavSidebar.selected')}`}
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <div className="space-y-1 px-2">
                {statusOptions.map((status) => (
                  <FilterCheckbox
                    key={status}
                    checked={statusFilter.includes(status)}
                    onToggle={() => onToggleStatus(status)}
                    label={getStatusLabel(status, t)}
                    icon={<StatusBadge status={status} iconOnly className="scale-90" />}
                  />
                ))}
                {showArchived && (
                  <FilterCheckbox
                    key="archived"
                    checked={statusFilter.includes('archived')}
                    onToggle={() => onToggleStatus('archived')}
                    label={getStatusLabel('archived', t)}
                    icon={<StatusBadge status="archived" iconOnly className="scale-90" />}
                  />
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Priority accordion */}
          <AccordionItem value="priority" className="border-b-0 border-t">
            <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 hover:no-underline text-xs">
              {priorityFilter.length === 0
                ? t('specsNavSidebar.select.priority.all')
                : `${t('specsNavSidebar.priority')}: ${priorityFilter.length} ${t('specsNavSidebar.selected')}`}
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <div className="space-y-1 px-2">
                {(['critical', 'high', 'medium', 'low'] as const).map((priority) => (
                  <FilterCheckbox
                    key={priority}
                    checked={priorityFilter.includes(priority)}
                    onToggle={() => onTogglePriority(priority)}
                    label={getPriorityLabel(priority, t)}
                    icon={<PriorityBadge priority={priority} iconOnly className="scale-90" />}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Tags accordion */}
          {allTags.length > 0 && (
            <AccordionItem value="tags" className="border-b-0 border-t">
              <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 hover:no-underline text-xs">
                {tagFilter.length === 0
                  ? t('specsNavSidebar.select.tag.all')
                  : `${t('specsNavSidebar.tags')}: ${tagFilter.length} ${t('specsNavSidebar.selected')}`}
              </AccordionTrigger>
              <AccordionContent className="pb-2">
                <div className="px-2 pb-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder={t('specsNavSidebar.searchTags')}
                      value={tagSearchQuery}
                      onChange={(e) => onTagSearchQueryChange(e.target.value)}
                      className="h-8 pl-8 text-xs bg-background"
                    />
                  </div>
                </div>
                <div className="space-y-1 px-2 max-h-48 overflow-y-auto">
                  {allTags
                    .filter(tag => tag.toLowerCase().includes(tagSearchQuery.toLowerCase()))
                    .map((tag) => (
                      <FilterCheckbox
                        key={tag}
                        checked={tagFilter.includes(tag)}
                        onToggle={() => onToggleTag(tag)}
                        label={tag}
                      />
                    ))}
                  {allTags.filter(tag => tag.toLowerCase().includes(tagSearchQuery.toLowerCase())).length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      {t('specsNavSidebar.noTagsFound')}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

        {/* Show Archived Toggle */}
        <div
          className="flex items-center gap-2 px-4 py-3 border-t hover:bg-accent cursor-pointer group"
          onClick={onToggleArchived}
        >
          <div className={cn("flex items-center justify-center w-4 h-4 border rounded transition-colors", showArchived ? "bg-primary border-primary text-primary-foreground" : "group-hover:border-primary/50")}>
            {showArchived && <Check className="h-3 w-3" />}
          </div>
          <div className="flex items-center gap-2 flex-1">
            <Archive className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{t('specsNavSidebar.showArchived')}</span>
          </div>
        </div>
      </div>
    </>
  );
}

function FilterCheckbox({
  checked,
  onToggle,
  label,
  icon,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer group"
      onClick={onToggle}
    >
      <div className={cn("flex items-center justify-center w-4 h-4 border rounded transition-colors", checked ? "bg-primary border-primary text-primary-foreground" : "group-hover:border-primary/50")}>
        {checked && <Check className="h-3 w-3" />}
      </div>
      <div className="flex items-center gap-2 flex-1">
        {icon}
        <span className="text-sm flex-1 break-all">{label}</span>
      </div>
    </div>
  );
}
