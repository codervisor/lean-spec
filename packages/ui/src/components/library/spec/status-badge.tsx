/**
 * Status badge component with icons
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
import { statusConfig as defaultStatusConfig } from '@/lib/badge-config';
import type { SpecStatus } from '@/types/specs';

export { defaultStatusConfig };

export interface StatusBadgeProps {
  /** The status to display */
  status: string;
  /** Additional CSS classes */
  className?: string;
  /** Show only icon, no label */
  iconOnly?: boolean;
  /** Custom label override */
  label?: string;
  /** Enable editable mode with dropdown */
  editable?: boolean;
  /** Callback when status changes (editable mode only) */
  onChange?: (status: SpecStatus) => void;
}

export function StatusBadge({
  status,
  className,
  iconOnly = false,
  label,
  editable = false,
  onChange,
}: StatusBadgeProps) {
  const config = defaultStatusConfig[status as SpecStatus] || defaultStatusConfig.planned;

  // Warn in development if an unknown status is provided
  if (import.meta.env.DEV && !(status in defaultStatusConfig)) {
    console.warn(`StatusBadge: Unknown status "${status}", falling back to "planned"`);
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
    <Select value={status} onValueChange={(value) => onChange(value as SpecStatus)}>
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
        {Object.entries(defaultStatusConfig).map(([key, cfg]) => {
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
