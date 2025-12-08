'use client';

import * as React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Clock, PlayCircle, CheckCircle2, Archive, AlertCircle, ArrowUp, Minus, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SpecNodeData } from './types';
import {
  NODE_WIDTH,
  COMPACT_NODE_WIDTH,
  toneClasses,
} from './constants';

const statusIcons = {
  'planned': Clock,
  'in-progress': PlayCircle,
  'complete': CheckCircle2,
  'archived': Archive,
};

const priorityIcons = {
  'critical': AlertCircle,
  'high': ArrowUp,
  'medium': Minus,
  'low': ArrowDown,
};

export const SpecNode = React.memo(function SpecNode({ data }: NodeProps<SpecNodeData>) {
  const isCompact = data.isCompact;
  const isSecondary = data.isSecondary;
  const depthOpacity =
    data.connectionDepth === 0
      ? 1
      : data.connectionDepth === 1
      ? 0.95
      : data.connectionDepth === 2
      ? 0.7
      : data.isDimmed
      ? 0.15
      : 1;

  // Secondary nodes (shown due to critical path) are slightly transparent
  const baseOpacity = isSecondary ? 0.65 : 1;

  const StatusIcon = statusIcons[data.tone as keyof typeof statusIcons] || Clock;
  const PriorityIcon = priorityIcons[data.priority as keyof typeof priorityIcons] || Minus;

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg shadow-lg transition-all duration-200',
        toneClasses[data.tone],
        data.interactive && 'cursor-pointer hover:scale-105 hover:shadow-xl hover:border-gray-400 dark:hover:border-white/50',
        data.isFocused && 'ring-2 ring-gray-800 dark:ring-white ring-offset-2 ring-offset-background scale-110 z-50',
        data.connectionDepth === 1 && 'ring-1 ring-gray-400 dark:ring-white/40',
        isCompact ? 'px-2 py-1 gap-0.5' : 'px-2.5 py-1.5 gap-0.5',
        isSecondary ? 'border border-dashed' : 'border-2'
      )}
      style={{
        width: isCompact ? COMPACT_NODE_WIDTH : NODE_WIDTH,
        opacity: depthOpacity * baseOpacity,
        transform: data.isDimmed ? 'scale(0.9)' : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <div className="flex items-center justify-between gap-1">
        <span className={cn('font-bold', isCompact ? 'text-[9px]' : 'text-[10px]')}>
          #{data.number.toString().padStart(3, '0')}
        </span>
        <div className="flex items-center gap-0.5">
          {/* Status icon */}
          <div
            className={cn(
              'rounded flex items-center justify-center',
              isCompact ? 'p-0.5' : 'p-1',
              data.tone === 'planned' && 'bg-blue-500/30',
              data.tone === 'in-progress' && 'bg-orange-500/30',
              data.tone === 'complete' && 'bg-green-500/30',
              data.tone === 'archived' && 'bg-gray-500/30'
            )}
            title={data.tone}
          >
            <StatusIcon className={cn(isCompact ? 'h-2 w-2' : 'h-2.5 w-2.5')} />
          </div>
          {/* Priority icon */}
          <div
            className={cn(
              'rounded flex items-center justify-center',
              isCompact ? 'p-0.5' : 'p-1',
              data.priority === 'critical' && 'bg-red-500/30',
              data.priority === 'high' && 'bg-orange-500/30',
              data.priority === 'medium' && 'bg-blue-500/30',
              data.priority === 'low' && 'bg-gray-500/30'
            )}
            title={data.priority}
          >
            <PriorityIcon className={cn(isCompact ? 'h-2 w-2' : 'h-2.5 w-2.5')} />
          </div>
          {/* Level indicator */}
          {data.connectionDepth !== undefined && data.connectionDepth > 0 && (
            <span
              className={cn(
                'font-medium rounded bg-muted/50 text-muted-foreground',
                isCompact ? 'text-[7px] px-0.5 py-0.5' : 'text-[8px] px-1 py-0.5'
              )}
              title={`Level ${data.connectionDepth}`}
            >
              L{data.connectionDepth}
            </span>
          )}
        </div>
      </div>
      <span
        className={cn('font-medium leading-tight truncate', isCompact ? 'text-[8px]' : 'text-[10px]')}
        title={data.label}
      >
        {isCompact ? data.shortLabel : data.label}
      </span>
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
});

SpecNode.displayName = 'SpecNode';

export const nodeTypes = {
  specNode: SpecNode,
};
