'use client';

import * as React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import type { SpecNodeData } from './types';
import {
  NODE_WIDTH,
  COMPACT_NODE_WIDTH,
  toneClasses,
} from './constants';

export const SpecNode = React.memo(function SpecNode({ data }: NodeProps<SpecNodeData>) {
  const isCompact = data.isCompact;
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

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border-2 shadow-lg transition-all duration-200',
        toneClasses[data.tone],
        data.interactive && 'cursor-pointer hover:scale-105 hover:shadow-xl hover:border-white/50',
        data.isFocused && 'ring-2 ring-white ring-offset-2 ring-offset-background scale-110 z-50',
        data.connectionDepth === 1 && 'ring-1 ring-white/40',
        isCompact ? 'px-2 py-1 gap-0.5' : 'px-2.5 py-1.5 gap-0.5'
      )}
      style={{
        width: isCompact ? COMPACT_NODE_WIDTH : NODE_WIDTH,
        opacity: depthOpacity,
        transform: data.isDimmed ? 'scale(0.9)' : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <div className="flex items-center justify-between gap-1">
        <span className={cn('font-bold text-white/90', isCompact ? 'text-[9px]' : 'text-[10px]')}>
          #{data.number.toString().padStart(3, '0')}
        </span>
        <span
          className={cn(
            'font-medium uppercase tracking-wide rounded',
            isCompact ? 'text-[7px] px-0.5 py-0.5' : 'text-[8px] px-1 py-0.5',
            data.tone === 'planned' && 'bg-blue-500/30 text-blue-300',
            data.tone === 'in-progress' && 'bg-orange-500/30 text-orange-300',
            data.tone === 'complete' && 'bg-green-500/30 text-green-300',
            data.tone === 'archived' && 'bg-gray-500/30 text-gray-400'
          )}
        >
          {data.badge}
        </span>
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
