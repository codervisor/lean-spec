'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { ViewMode } from './types';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div className="flex items-center rounded-md border border-border bg-muted/30 p-0.5">
      <button
        onClick={() => onViewModeChange('dag')}
        className={cn(
          'rounded px-2.5 py-1 text-xs font-medium transition-all',
          viewMode === 'dag'
            ? 'bg-primary/20 text-primary border border-primary/40'
            : 'text-muted-foreground hover:text-foreground'
        )}
        title="DAG View: Hierarchical layout showing depends_on relationships only"
      >
        DAG
      </button>
      <button
        onClick={() => onViewModeChange('network')}
        className={cn(
          'rounded px-2.5 py-1 text-xs font-medium transition-all',
          viewMode === 'network'
            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
            : 'text-muted-foreground hover:text-foreground'
        )}
        title="Network View: Force-directed layout showing both depends_on and related relationships"
      >
        Network
      </button>
    </div>
  );
}
