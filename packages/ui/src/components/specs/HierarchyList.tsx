import { memo, useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Umbrella } from 'lucide-react';
import { Collapsible, CollapsibleContent } from '@radix-ui/react-collapsible';
import { cn, buildHierarchy, type HierarchyNode as UiHierarchyNode } from '@leanspec/ui-components';
import type { Spec, HierarchyNode } from '../../types/api';
import { StatusBadge } from '../StatusBadge';
import { PriorityBadge } from '../PriorityBadge';
import { TokenBadge } from '../TokenBadge';
import { ValidationBadge } from '../ValidationBadge';

// Use the API HierarchyNode or the ui-components one (they're compatible)
type TreeNode = HierarchyNode | UiHierarchyNode;

interface HierarchyListProps {
  specs: Spec[];
  /** Pre-built hierarchy from server - if provided, skips client-side tree building */
  hierarchy?: HierarchyNode[];
  basePath?: string;
  onTokenClick?: (specName: string) => void;
  onValidationClick?: (specName: string) => void;
}

// Memoized recursive item component to prevent cascade re-renders
const HierarchyListItem = memo(function HierarchyListItem({ node, basePath, depth = 0, onTokenClick, onValidationClick }: {
  node: TreeNode;
  basePath: string;
  depth: number;
  onTokenClick?: (specName: string) => void;
  onValidationClick?: (specName: string) => void;
}) {
  // Only expand first level by default for better initial render performance
  const [isExpanded, setIsExpanded] = useState(depth < 1);
  const hasChildren = node.childNodes && node.childNodes.length > 0;

  const toggleExpanded = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(prev => !prev);
  }, []);

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
            onClick={toggleExpanded}
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
                <TokenBadge
                  count={(node as any).tokenCount}
                  size="sm"
                  onClick={onTokenClick ? () => onTokenClick(node.specName) : undefined}
                />
                <ValidationBadge
                  status={(node as any).validationStatus}
                  size="sm"
                  onClick={onValidationClick ? () => onValidationClick(node.specName) : undefined}
                />
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
          <CollapsibleContent forceMount={isExpanded ? true : undefined}>
            <div className="ml-4 pl-4 border-l-2 border-border/40 space-y-2 mt-2 mb-4">
              {node.childNodes.map(child => (
                <HierarchyListItem
                  key={child.specName}
                  node={child}
                  basePath={basePath}
                  depth={depth + 1}
                  onTokenClick={onTokenClick}
                  onValidationClick={onValidationClick}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
});

export const HierarchyList = memo(function HierarchyList({ specs, hierarchy, basePath = '/projects', onTokenClick, onValidationClick }: HierarchyListProps) {
  // Use pre-built hierarchy from server if available, otherwise build client-side
  const roots = useMemo(() => {
    if (hierarchy && hierarchy.length > 0) {
      // Server already built the tree - use it directly
      return hierarchy;
    }
    // Fallback to client-side building
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return buildHierarchy(specs as any);
  }, [hierarchy, specs]);

  if (specs.length === 0) {
    return null; // Parent handles empty state
  }

  return (
    <div className="h-full overflow-y-auto space-y-2">
      {roots.map(node => (
        <HierarchyListItem
          key={node.specName}
          node={node}
          basePath={basePath}
          depth={0}
          onTokenClick={onTokenClick}
          onValidationClick={onValidationClick}
        />
      ))}
    </div>
  );
});
