/**
 * Inline status editor component
 * Framework-agnostic version that accepts onStatusChange callback
 */

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '../../lib/utils';
import { statusConfig as defaultStatusConfig } from '../../lib/badge-config';
import type { SpecStatus } from '../../types/specs';

const STATUSES: SpecStatus[] = ['planned', 'in-progress', 'complete', 'archived'];

export { defaultStatusConfig };

export interface StatusEditorProps {
  currentStatus: SpecStatus;
  onStatusChange: (newStatus: SpecStatus) => Promise<void> | void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function StatusEditor({ 
  currentStatus, 
  onStatusChange,
  disabled = false,
  className,
  ariaLabel = 'Change status',
}: StatusEditorProps) {
  const [status, setStatus] = React.useState<SpecStatus>(currentStatus);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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

  const currentConfig = defaultStatusConfig[status];
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
            const cfg = defaultStatusConfig[s];
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
