'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { SpecNode, FocusedNodeDetails, SpecsByDepth } from './types';

interface SpecListItemProps {
  spec: SpecNode;
  type: 'upstream' | 'downstream';
  onClick: () => void;
}

function SpecListItem({ spec, type, onClick }: SpecListItemProps) {
  const typeColors = {
    upstream: 'border-l-amber-500',
    downstream: 'border-l-emerald-500',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-2 py-1.5 rounded border-l-2 bg-muted/30 hover:bg-muted/50 transition-colors',
        typeColors[type]
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold text-muted-foreground">
          #{spec.number.toString().padStart(3, '0')}
        </span>
        <span
          className={cn(
            'text-[8px] px-1 py-0.5 rounded font-medium uppercase',
            spec.status === 'planned' && 'bg-amber-500/20 text-amber-400',
            spec.status === 'in-progress' && 'bg-sky-500/20 text-sky-400',
            spec.status === 'complete' && 'bg-emerald-500/20 text-emerald-400'
          )}
        >
          {spec.status === 'in-progress' ? 'WIP' : spec.status.slice(0, 3)}
        </span>
      </div>
      <p className="text-[11px] text-foreground truncate leading-tight mt-0.5">{spec.name}</p>
    </button>
  );
}

interface DepthGroupProps {
  group: SpecsByDepth;
  type: 'upstream' | 'downstream';
  onSelectSpec: (specId: string) => void;
}

function DepthGroup({ group, type, onSelectSpec }: DepthGroupProps) {
  const [isExpanded, setIsExpanded] = React.useState(group.depth === 1);
  const depthLabel = group.depth === 1 ? 'Direct' : `Level ${group.depth}`;

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 w-full text-left text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className={cn(
          'transition-transform text-[8px]',
          isExpanded ? 'rotate-90' : 'rotate-0'
        )}>
          ▶
        </span>
        <span className="font-medium">{depthLabel}</span>
        <span className="opacity-60">({group.specs.length})</span>
      </button>
      {isExpanded && (
        <div className="space-y-1 ml-2">
          {group.specs.map((spec) => (
            <SpecListItem
              key={spec.id}
              spec={spec}
              type={type}
              onClick={() => onSelectSpec(spec.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SpecSidebarProps {
  focusedDetails: FocusedNodeDetails | null;
  onSelectSpec: (specId: string) => void;
  onOpenSpec: (specNumber: number) => void;
}

export function SpecSidebar({ focusedDetails, onSelectSpec, onOpenSpec }: SpecSidebarProps) {
  if (!focusedDetails) {
    return (
      <div className="w-64 shrink-0 rounded-lg border border-border bg-background/95 overflow-hidden flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-muted-foreground">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                />
              </svg>
            </div>
            <p className="text-sm font-medium">Select a spec</p>
            <p className="text-xs mt-1">Click on a spec to see its dependencies</p>
          </div>
        </div>
      </div>
    );
  }

  const { node, upstream, downstream } = focusedDetails;

  return (
    <div className="w-64 shrink-0 rounded-lg border border-border bg-background/95 overflow-hidden flex flex-col">
      {/* Selected spec header */}
      <div className="p-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-sm">#{node.number.toString().padStart(3, '0')}</span>
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-medium uppercase',
              node.status === 'planned' && 'bg-amber-500/20 text-amber-300',
              node.status === 'in-progress' && 'bg-sky-500/20 text-sky-300',
              node.status === 'complete' && 'bg-emerald-500/20 text-emerald-300'
            )}
          >
            {node.status}
          </span>
        </div>
        <p className="text-sm font-medium text-foreground leading-snug">{node.name}</p>
        <button
          onClick={() => onOpenSpec(node.number)}
          className="mt-2 w-full rounded bg-primary/20 border border-primary/40 px-2 py-1.5 text-xs text-primary hover:bg-primary/30 font-medium"
        >
          Open Spec →
        </button>
      </div>

      {/* Scrollable spec lists */}
      <div className="flex-1 overflow-auto p-3 space-y-4">
        {/* Upstream Dependencies */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Depends On ({upstream.reduce((sum, g) => sum + g.specs.length, 0)})
            </span>
          </div>
          {upstream.length > 0 ? (
            <div className="space-y-2">
              {upstream.map((group) => (
                <DepthGroup
                  key={group.depth}
                  group={group}
                  type="upstream"
                  onSelectSpec={onSelectSpec}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/60 italic">No upstream dependencies</p>
          )}
        </div>

        {/* Downstream Dependents */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Required By ({downstream.reduce((sum, g) => sum + g.specs.length, 0)})
            </span>
          </div>
          {downstream.length > 0 ? (
            <div className="space-y-2">
              {downstream.map((group) => (
                <DepthGroup
                  key={group.depth}
                  group={group}
                  type="downstream"
                  onSelectSpec={onSelectSpec}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/60 italic">No specs depend on this</p>
          )}
        </div>
      </div>
    </div>
  );
}
