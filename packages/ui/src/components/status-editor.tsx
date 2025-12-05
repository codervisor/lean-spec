/**
 * Inline status editor component
 * Allows changing spec status via dropdown
 */

'use client';

import * as React from 'react';
import { Clock, PlayCircle, CheckCircle2, Archive, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const STATUSES = ['planned', 'in-progress', 'complete', 'archived'] as const;
type Status = (typeof STATUSES)[number];

const statusConfig: Record<Status, { icon: React.ComponentType<{ className?: string }>; label: string; className: string }> = {
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

interface StatusEditorProps {
  specId: string;
  currentStatus: string;
  onUpdate?: (newStatus: string) => void;
  disabled?: boolean;
  projectId?: string;
}

export function StatusEditor({ 
  specId, 
  currentStatus, 
  onUpdate,
  disabled = false,
  projectId 
}: StatusEditorProps) {
  const [status, setStatus] = React.useState<Status>(currentStatus as Status || 'planned');
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleChange = async (newStatus: Status) => {
    if (newStatus === status) return;
    
    const previousStatus = status;
    setStatus(newStatus); // Optimistic update
    setIsUpdating(true);
    setError(null);

    try {
      const apiUrl = projectId
        ? `/api/projects/${projectId}/specs/${specId}/metadata`
        : `/api/specs/${specId}/metadata`;
      
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }

      onUpdate?.(newStatus);
      toast.success('Status updated');
    } catch (err) {
      setStatus(previousStatus); // Rollback
      const errorMessage = err instanceof Error ? err.message : 'Failed to update';
      setError(errorMessage);
      toast.error('Failed to update status', { description: errorMessage });
      console.error('Status update failed:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const config = statusConfig[status] || statusConfig.planned;
  const Icon = config.icon;

  return (
    <div className="relative">
      <Select
        value={status}
        onValueChange={(value) => handleChange(value as Status)}
        disabled={disabled || isUpdating}
      >
        <SelectTrigger 
          className={cn(
            'h-7 w-fit min-w-[120px] border-0 px-2 text-xs font-medium',
            config.className,
            isUpdating && 'opacity-70'
          )}
          aria-label="Change spec status"
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
          {STATUSES.map((s) => {
            const cfg = statusConfig[s];
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
