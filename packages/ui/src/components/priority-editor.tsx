/**
 * Inline priority editor component
 * Allows changing spec priority via dropdown
 */

'use client';

import * as React from 'react';
import { AlertCircle, ArrowUp, Minus, ArrowDown, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
type Priority = (typeof PRIORITIES)[number];

const priorityConfig: Record<Priority, { icon: React.ComponentType<{ className?: string }>; label: string; className: string }> = {
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

interface PriorityEditorProps {
  specId: string;
  currentPriority: string;
  onUpdate?: (newPriority: string) => void;
  disabled?: boolean;
  projectId?: string;
}

export function PriorityEditor({ 
  specId, 
  currentPriority, 
  onUpdate,
  disabled = false,
  projectId 
}: PriorityEditorProps) {
  const [priority, setPriority] = React.useState<Priority>(currentPriority as Priority || 'medium');
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleChange = async (newPriority: Priority) => {
    if (newPriority === priority) return;
    
    const previousPriority = priority;
    setPriority(newPriority); // Optimistic update
    setIsUpdating(true);
    setError(null);

    try {
      const apiUrl = projectId
        ? `/api/projects/${projectId}/specs/${specId}/metadata`
        : `/api/specs/${specId}/metadata`;
      
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update priority');
      }

      onUpdate?.(newPriority);
      toast.success('Priority updated');
    } catch (err) {
      setPriority(previousPriority); // Rollback
      const errorMessage = err instanceof Error ? err.message : 'Failed to update';
      setError(errorMessage);
      toast.error('Failed to update priority', { description: errorMessage });
      console.error('Priority update failed:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const config = priorityConfig[priority] || priorityConfig.medium;
  const Icon = config.icon;

  return (
    <div className="relative">
      <Select
        value={priority}
        onValueChange={(value) => handleChange(value as Priority)}
        disabled={disabled || isUpdating}
      >
        <SelectTrigger 
          className={cn(
            'h-7 w-fit min-w-[100px] border-0 px-2 text-xs font-medium',
            config.className,
            isUpdating && 'opacity-70'
          )}
          aria-label="Change spec priority"
        >
          <div className="flex items-center gap-1.5">
            {isUpdating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Icon className="h-3.5 w-3.5" />
            )}
            <SelectValue>
              {config.label}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          {PRIORITIES.map((p) => {
            const cfg = priorityConfig[p];
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
