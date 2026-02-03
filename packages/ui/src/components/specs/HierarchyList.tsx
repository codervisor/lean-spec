import { memo, useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, FolderTree } from 'lucide-react';
import { Collapsible, CollapsibleContent } from '@radix-ui/react-collapsible';
import { cn, buildHierarchy, type HierarchyNode as UiHierarchyNode } from '@leanspec/ui-components';
import type { Spec, HierarchyNode, SpecStatus } from '../../types/api';
import { StatusBadge } from '../StatusBadge';
import { PriorityBadge } from '../PriorityBadge';
import { TokenBadge } from '../TokenBadge';
import { ValidationBadge } from '../ValidationBadge';

// Use the API HierarchyNode or the ui-components one (they're compatible)
type TreeNode = HierarchyNode | UiHierarchyNode;

type SortOption = 'id-desc' | 'id-asc' | 'updated-desc' | 'title-asc' | 'priority-desc' | 'priority-asc';

interface HierarchyListProps {
  specs: Spec[];
  /** Pre-built hierarchy from server - if provided, skips client-side tree building */
  hierarchy?: HierarchyNode[];
  basePath?: string;
  sortBy?: SortOption;
  onTokenClick?: (specName: string) => void;
  onValidationClick?: (specName: string) => void;
  onStatusChange?: (spec: Spec, status: SpecStatus) => void;
  onPriorityChange?: (spec: Spec, priority: string) => void;
}

// Sort helper function for hierarchy nodes
function sortNodes(nodes: TreeNode[], sortBy: SortOption): TreeNode[] {
  const sorted = [...nodes];
  switch (sortBy) {
    case 'id-asc':
      sorted.sort((a, b) => (a.specNumber || 0) - (b.specNumber || 0));
      break;
    case 'priority-desc':
      sorted.sort((a, b) => {
        const priorityOrder: Record<string, number> = {
          'critical': 4,
          'high': 3,
          'medium': 2,
          'low': 1,
        };
        const scoreA = priorityOrder[a.priority || ''] || 0;
        const scoreB = priorityOrder[b.priority || ''] || 0;
        const cmp = scoreB - scoreA;
        return cmp !== 0 ? cmp : (b.specNumber || 0) - (a.specNumber || 0);
      });
      break;
    case 'priority-asc':
      sorted.sort((a, b) => {
        const priorityOrder: Record<string, number> = {
          'critical': 4,
          'high': 3,
          'medium': 2,
          'low': 1,
        };
        const scoreA = priorityOrder[a.priority || ''] || 0;
        const scoreB = priorityOrder[b.priority || ''] || 0;
        const cmp = scoreA - scoreB;
        return cmp !== 0 ? cmp : (b.specNumber || 0) - (a.specNumber || 0);
      });
      break;
    case 'updated-desc':
      sorted.sort((a, b) => {
        // updatedAt exists on LightweightSpec (UiHierarchyNode) but not API HierarchyNode
        const aUpdated = 'updatedAt' in a ? (a as UiHierarchyNode).updatedAt : undefined;
        const bUpdated = 'updatedAt' in b ? (b as UiHierarchyNode).updatedAt : undefined;
        if (!aUpdated) return 1;
        if (!bUpdated) return -1;
        const aTime = new Date(aUpdated).getTime();
        const bTime = new Date(bUpdated).getTime();
        const timeDiff = bTime - aTime;
        return timeDiff !== 0 ? timeDiff : (b.specNumber || 0) - (a.specNumber || 0);
      });
      break;
    case 'title-asc':
      sorted.sort((a, b) => {
        const titleA = (a.title || a.specName).toLowerCase();
        const titleB = (b.title || b.specName).toLowerCase();
        const cmp = titleA.localeCompare(titleB);
        return cmp !== 0 ? cmp : (b.specNumber || 0) - (a.specNumber || 0);
      });
      break;
    case 'id-desc':
    default:
      sorted.sort((a, b) => (b.specNumber || 0) - (a.specNumber || 0));
      break;
  }
  return sorted;
}

// Memoized recursive item component to prevent cascade re-renders
const HierarchyListItem = memo(function HierarchyListItem({ 
  node, 
  basePath, 
  depth = 0, 
  sortBy = 'id-desc', 
  onTokenClick, 
  onValidationClick,
  onNodeStatusChange,
  onNodePriorityChange 
}: {
  node: TreeNode;
  basePath: string;
  depth: number;
  sortBy?: SortOption;
  onTokenClick?: (specName: string) => void;
  onValidationClick?: (specName: string) => void;
  onNodeStatusChange?: (specName: string, status: string) => void;
  onNodePriorityChange?: (specName: string, priority: string) => void;
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
        "hover:bg-secondary/50"
      )}>
        {/* Main Content */}
        <div className="flex items-start">
          {/* Toggle */}
          <div
            className={cn(
              "w-8 h-full px-2 py-5 cursor-pointer text-muted-foreground hover:text-foreground flex items-center",
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
                  {hasChildren && <FolderTree className="h-3.5 w-3.5 text-primary/70" />}
                  <span className="text-xs font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                    #{node.specNumber}
                  </span>
                  <h3 className="font-medium truncate">{node.title || node.specName}</h3>
                </div>
                <p className="text-sm text-muted-foreground truncate">{node.specName}</p>
              </div>
              <div className="flex gap-2 items-center flex-shrink-0 flex-wrap justify-end">
                {node.status && (
                  <StatusBadge 
                    status={node.status} 
                    editable={!!onNodeStatusChange}
                    onChange={(status) => onNodeStatusChange?.(node.specName, status)}
                  />
                )}
                {node.priority && (
                  <PriorityBadge 
                    priority={node.priority} 
                    editable={!!onNodePriorityChange}
                    onChange={(priority) => onNodePriorityChange?.(node.specName, priority)}
                  />
                )}
                <TokenBadge
                  count={(node as HierarchyNode).tokenCount}
                  size="sm"
                  onClick={onTokenClick ? () => onTokenClick(node.specName) : undefined}
                />
                <ValidationBadge
                  status={(node as HierarchyNode).validationStatus}
                  size="sm"
                  onClick={onValidationClick ? () => onValidationClick(node.specName) : undefined}
                />
              </div>
            </div>
            {node.tags && node.tags.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
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
              {sortNodes(node.childNodes, sortBy).map(child => (
                <HierarchyListItem
                  key={child.specName}
                  node={child}
                  basePath={basePath}
                  depth={depth + 1}
                  sortBy={sortBy}
                  onTokenClick={onTokenClick}
                  onValidationClick={onValidationClick}
                  onNodeStatusChange={onNodeStatusChange}
                  onNodePriorityChange={onNodePriorityChange}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
});

// Filter hierarchy tree to only include nodes present in the filtered specs
function filterHierarchy(nodes: TreeNode[], allowedIds: Set<string>): TreeNode[] {
  const result: TreeNode[] = [];
  for (const node of nodes) {
    if (allowedIds.has(node.specName)) {
      // Include this node, but also filter its children
      const filteredChildren = node.childNodes
        ? filterHierarchy(node.childNodes, allowedIds)
        : [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result.push({ ...node, childNodes: filteredChildren } as any);
    } else if (node.childNodes && node.childNodes.length > 0) {
      // Node itself is not allowed, but check if any descendants are
      const filteredChildren = filterHierarchy(node.childNodes, allowedIds);
      if (filteredChildren.length > 0) {
        // Include this node as a container for allowed children
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result.push({ ...node, childNodes: filteredChildren } as any);
      }
    }
  }
  return result;
}

export const HierarchyList = memo(function HierarchyList({ 
  specs, 
  hierarchy, 
  basePath = '/projects', 
  sortBy = 'id-desc', 
  onTokenClick, 
  onValidationClick,
  onStatusChange,
  onPriorityChange
}: HierarchyListProps) {
  // Build a set of allowed spec IDs from the filtered specs
  const allowedSpecIds = useMemo(() => {
    return new Set(specs.map(s => s.specName));
  }, [specs]);

  // Create a quick lookup map for specs to support callbacks
  const specMap = useMemo(() => {
    return new Map(specs.map(s => [s.specName, s]));
  }, [specs]);

  const handleNodeStatusChange = useCallback((specName: string, status: string) => {
    const spec = specMap.get(specName);
    if (spec && onStatusChange) {
      onStatusChange(spec, status as SpecStatus);
    }
  }, [specMap, onStatusChange]);

  const handleNodePriorityChange = useCallback((specName: string, priority: string) => {
    const spec = specMap.get(specName);
    if (spec && onPriorityChange) {
      onPriorityChange(spec, priority);
    }
  }, [specMap, onPriorityChange]);

  // Use pre-built hierarchy from server if available, otherwise build client-side
  const roots = useMemo(() => {
    let baseRoots: TreeNode[];
    if (hierarchy && hierarchy.length > 0) {
      // Server already built the tree - filter it to only include allowed specs
      baseRoots = filterHierarchy(hierarchy, allowedSpecIds);
    } else {
      // Fallback to client-side building (already uses filtered specs)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      baseRoots = buildHierarchy(specs as any);
    }
    // Sort roots according to sortBy
    return sortNodes(baseRoots, sortBy);
  }, [hierarchy, specs, sortBy, allowedSpecIds]);

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
          sortBy={sortBy}
          onTokenClick={onTokenClick}
          onValidationClick={onValidationClick}
          onNodeStatusChange={onStatusChange ? handleNodeStatusChange : undefined}
          onNodePriorityChange={onPriorityChange ? handleNodePriorityChange : undefined}
        />
      ))}
    </div>
  );
});
