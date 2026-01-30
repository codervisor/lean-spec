import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Umbrella } from 'lucide-react';
import { Collapsible, CollapsibleContent } from '@radix-ui/react-collapsible';
import { cn, buildHierarchy, type HierarchyNode } from '@leanspec/ui-components';
import type { Spec } from '../../types/api';
import { StatusBadge } from '../StatusBadge';
import { PriorityBadge } from '../PriorityBadge';

interface HierarchyListProps {
  specs: Spec[];
  basePath?: string;
}

// Recursive item component
function HierarchyListItem({ node, basePath, depth = 0 }: { node: HierarchyNode; basePath: string; depth: number }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.childNodes && node.childNodes.length > 0;

  return (
    <div className="space-y-1">
      <div className={cn(
        "border rounded-lg bg-background transition-colors",
        "hover:bg-accent/5"
      )}>
        {/* Main Content */}
        <div className="flex items-start">
          {/* Toggle */}
          <div
            className={cn(
              "p-4 cursor-pointer text-muted-foreground hover:text-foreground h-full flex items-center",
              !hasChildren && "invisible pointer-events-none"
            )}
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
          >
            {hasChildren && <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />}
          </div>

          {/* Link */}
          <Link
            to={`${basePath}/specs/${node.specName}`}
            className="flex-1 p-4 pl-0 block"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {hasChildren && <Umbrella className="h-3.5 w-3.5 text-primary/70" />}
                  <span className="text-xs font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                    #{node.specNumber}
                  </span>
                  <h3 className="font-medium truncate">{node.title || node.specName}</h3>
                </div>
                <p className="text-sm text-muted-foreground truncate">{node.specName}</p>
              </div>
              <div className="flex gap-2 items-center flex-shrink-0">
                {node.status && <StatusBadge status={node.status as any} />}
                {node.priority && <PriorityBadge priority={node.priority as any} />}
              </div>
            </div>
            {node.tags && node.tags.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {node.tags.map((tag: string) => (
                  <span key={tag} className="text-xs px-2 py-0.5 bg-secondary rounded text-secondary-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </Link>
        </div>
      </div>

      {hasChildren && (
        <Collapsible open={isExpanded}>
          <CollapsibleContent>
            <div className="ml-4 pl-4 border-l-2 border-border/40 space-y-2 mt-2 mb-4">
              {node.childNodes.map(child => (
                <HierarchyListItem key={child.specName} node={child} basePath={basePath} depth={depth + 1} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

export function HierarchyList({ specs, basePath = '/projects' }: HierarchyListProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roots = useMemo(() => buildHierarchy(specs as any), [specs]);

  if (specs.length === 0) {
    return null; // Parent handles empty state
  }

  return (
    <div className="h-full overflow-y-auto space-y-2">
      {roots.map(node => (
        <HierarchyListItem key={node.specName} node={node} basePath={basePath} depth={0} />
      ))}
    </div>
  );
}
