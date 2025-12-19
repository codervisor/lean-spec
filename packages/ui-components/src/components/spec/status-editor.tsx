/**
 * Inline status editor component
 * Framework-agnostic version that accepts onStatusChange callback
 */

import * as React from 'react';
import { Clock, PlayCircle, CheckCircle2, Archive, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '../../lib/utils';
import type { SpecStatus } from '../../types/specs';

const STATUSES: SpecStatus[] = ['planned', 'in-progress', 'complete', 'archived'];

export interface StatusConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  className: string;
}

export const defaultStatusConfig: Record<SpecStatus, StatusConfig> = {
  'planned': {
    icon: Clock,
    label: 'Planned',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
  },
  'in-progress': {
    icon: PlayCircle,
    label: 'In Progress',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
  },
  'complete': {
    icon: CheckCircle2,
    label: 'Complete',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  },
  'archived': {
    icon: Archive,
    label: 'Archived',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
  }
};

export interface StatusEditorProps {
  currentStatus: SpecStatus;
  onStatusChange: (newStatus: SpecStatus) => Promise<void> | void;
  disabled?: boolean;
  config?: Partial<Record<SpecStatus, Partial<StatusConfig>>>;
  className?: string;
  ariaLabel?: string;
}

export function StatusEditor({ 
  currentStatus, 
  onStatusChange,
  disabled = false,
  config: customConfig,
  className,
  ariaLabel = 'Change status',
}: StatusEditorProps) {
  const [status, setStatus] = React.useState<SpecStatus>(currentStatus);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Merge custom config with defaults
  const config = React.useMemo(() => {
    const merged = { ...defaultStatusConfig };
    if (customConfig) {
      for (const key in customConfig) {
        const statusKey = key as SpecStatus;
        merged[statusKey] = { ...merged[statusKey], ...customConfig[statusKey] };
      }
    }
    return merged;
  }, [customConfig]);

  // Update local state when prop changes
  React.useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  const handleChange = async (newStatus: SpecStatus) => {
    if (newStatus === status) return;
    
    const previousStatus = status;
    setStatus(newStatus); // Optimistic update
    setIsUpdating(true);
    setError(null);

    try {
      await onStatusChange(newStatus);
    } catch (err) {
      setStatus(previousStatus); // Rollback
      const errorMessage = err instanceof Error ? err.message : 'Failed to update';
      setError(errorMessage);
      console.error('Status update failed:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const currentConfig = config[status];
  const Icon = currentConfig.icon;
  const label = currentConfig.label;

  return (
    <div className={cn('relative', className)}>
      <Select
        value={status}
        onValueChange={(value: string) => handleChange(value as SpecStatus)}
        disabled={disabled || isUpdating}
      >
        <SelectTrigger 
          className={cn(
            'h-7 w-fit min-w-[120px] border-0 px-2 text-xs font-medium',
            currentConfig.className,
            isUpdating && 'opacity-70'
          )}
          aria-label={ariaLabel}
        >
          <div className="flex items-center gap-1.5">
            {isUpdating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Icon className="h-3.5 w-3.5" />
            )}
            <SelectValue>
              {label}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => {
            const cfg = config[s];
            const ItemIcon = cfg.icon;
            return (
              <SelectItem key={s} value={s} className="pl-2">
                <div className="flex items-center gap-2">
                  <ItemIcon className="h-4 w-4" />
                  <span>{cfg.label}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {error && (
        <div className="absolute top-full left-0 mt-1 text-xs text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
