/**
 * Inline priority editor component
 * Framework-agnostic version that accepts onPriorityChange callback
 */

import * as React from 'react';
import { AlertCircle, ArrowUp, Minus, ArrowDown, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '../../lib/utils';
import type { SpecPriority } from '../../types/specs';

const PRIORITIES: SpecPriority[] = ['low', 'medium', 'high', 'critical'];

export interface PriorityConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  className: string;
}

export const defaultPriorityConfig: Record<SpecPriority, PriorityConfig> = {
  'critical': {
    icon: AlertCircle,
    label: 'Critical',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  },
  'high': {
    icon: ArrowUp,
    label: 'High',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
  },
  'medium': {
    icon: Minus,
    label: 'Medium',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
  },
  'low': {
    icon: ArrowDown,
    label: 'Low',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
  }
};

export interface PriorityEditorProps {
  currentPriority: SpecPriority;
  onPriorityChange: (newPriority: SpecPriority) => Promise<void> | void;
  disabled?: boolean;
  config?: Partial<Record<SpecPriority, Partial<PriorityConfig>>>;
  className?: string;
  ariaLabel?: string;
}

export function PriorityEditor({ 
  currentPriority, 
  onPriorityChange,
  disabled = false,
  config: customConfig,
  className,
  ariaLabel = 'Change priority',
}: PriorityEditorProps) {
  const [priority, setPriority] = React.useState<SpecPriority>(currentPriority);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Merge custom config with defaults
  const config = React.useMemo(() => {
    const merged = { ...defaultPriorityConfig };
    if (customConfig) {
      for (const key in customConfig) {
        const priorityKey = key as SpecPriority;
        merged[priorityKey] = { ...merged[priorityKey], ...customConfig[priorityKey] };
      }
    }
    return merged;
  }, [customConfig]);

  // Update local state when prop changes
  React.useEffect(() => {
    setPriority(currentPriority);
  }, [currentPriority]);

  const handleChange = async (newPriority: SpecPriority) => {
    if (newPriority === priority) return;
    
    const previousPriority = priority;
    setPriority(newPriority); // Optimistic update
    setIsUpdating(true);
    setError(null);

    try {
      await onPriorityChange(newPriority);
    } catch (err) {
      setPriority(previousPriority); // Rollback
      const errorMessage = err instanceof Error ? err.message : 'Failed to update';
      setError(errorMessage);
      console.error('Priority update failed:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const currentConfig = config[priority];
  const Icon = currentConfig.icon;
  const label = currentConfig.label;

  return (
    <div className={cn('relative', className)}>
      <Select
        value={priority}
        onValueChange={(value: string) => handleChange(value as SpecPriority)}
        disabled={disabled || isUpdating}
      >
        <SelectTrigger 
          className={cn(
            'h-7 w-fit min-w-[100px] border-0 px-2 text-xs font-medium',
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
          {PRIORITIES.map((p) => {
            const cfg = config[p];
            const ItemIcon = cfg.icon;
            return (
              <SelectItem key={p} value={p} className="pl-2">
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
