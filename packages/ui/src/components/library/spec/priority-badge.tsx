/**
 * Priority badge component with icons
 * Framework-agnostic - no i18n dependency, labels passed as props or using defaults
 * Supports editable mode with dropdown
 */

import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '../ui/select';
import { cn } from '@/lib/utils';
import { priorityConfig as defaultPriorityConfig } from '@/lib/badge-config';
import type { SpecPriority } from '@/types/specs';

export { defaultPriorityConfig };

export interface PriorityBadgeProps {
  /** The priority to display */
  priority: string;
  /** Additional CSS classes */
  className?: string;
  /** Show only icon, no label */
  iconOnly?: boolean;
  /** Custom label override */
  label?: string;
  /** Enable editable mode with dropdown */
  editable?: boolean;
  /** Callback when priority changes (editable mode only) */
  onChange?: (priority: SpecPriority) => void;
}

export function PriorityBadge({
  priority,
  className,
  iconOnly = false,
  label,
  editable = false,
  onChange,
}: PriorityBadgeProps) {
  const config = defaultPriorityConfig[priority as SpecPriority] || defaultPriorityConfig.medium;

  // Warn in development if an unknown priority is provided
  if (import.meta.env.DEV && !(priority in defaultPriorityConfig)) {
    console.warn(`PriorityBadge: Unknown priority "${priority}", falling back to "medium"`);
  }

  const Icon = config.icon;
  const displayLabel = label ?? config.label;

  const badgeContent = (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center w-fit border-transparent',
        !iconOnly && 'gap-1.5',
        config.className,
        editable && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {!iconOnly && displayLabel}
    </Badge>
  );

  if (!editable || !onChange) {
    return badgeContent;
  }

  return (
    <Select value={priority} onValueChange={(value) => onChange(value as SpecPriority)}>
      <SelectTrigger
        className={cn(
          'h-7 w-fit border-0 px-0 text-xs font-medium hover:bg-transparent focus:ring-0',
          config.className
        )}
        asChild
      >
        {badgeContent}
      </SelectTrigger>
      <SelectContent>
        {Object.entries(defaultPriorityConfig).map(([key, cfg]) => {
          const ItemIcon = cfg.icon;
          return (
            <SelectItem key={key} value={key} className="pl-2">
              <div className="flex items-center gap-2">
                <ItemIcon className="h-4 w-4" />
                <span>{cfg.label}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
