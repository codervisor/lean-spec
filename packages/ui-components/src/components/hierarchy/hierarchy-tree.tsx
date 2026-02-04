import { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '../spec/status-badge';
import { PriorityBadge } from '../spec/priority-badge';
import type { LightweightSpec } from '@/types/specs';
import { buildHierarchy, type HierarchyNode, type SortOption, getAllParentIds } from '@/lib/hierarchy';
import { List, type ListImperativeAPI, type RowComponentProps } from 'react-window';

export interface HierarchyTreeProps {
  /** Flat list of all specs to render in the tree */
  specs: LightweightSpec[];
  /** Callback when a spec is clicked */
  onSpecClick?: (spec: LightweightSpec) => void;
  /** Currently selected spec ID */
  selectedSpecId?: string;
  /** Class name */
  className?: string; // Kept for width/margin styling but height is separate
  /** Height of the list implementation */
  height?: number;
  /** Width of the list implementation */
  width?: number | string;
  /** Sort option for the hierarchy (default: 'id-desc') */
  sortBy?: SortOption;
  /** Set of expanded node IDs (controlled) */
  expandedIds?: Set<string>;
  /** Callback when expanded ids change (controlled) */
  onExpandedChange?: (ids: Set<string>) => void;
}

interface FlatNode {
  node: HierarchyNode;
  depth: number;
  indentGuides: boolean[]; // Indicates true for each level that needs a vertical line
  isLast: boolean;
}

// Helper to flatten the tree based on expanded status
function flattenTree(
  nodes: HierarchyNode[],
  expandedIds: Set<string>,
  depth = 0,
  indentGuides: boolean[] = [],
  result: FlatNode[] = []
) {
  nodes.forEach((node, index) => {
    const isLast = index === nodes.length - 1;

    result.push({
      node,
      depth,
      indentGuides,
      isLast
    });

    const id = node.id || node.specName;
    if (node.childNodes && node.childNodes.length > 0 && expandedIds.has(id)) {
      flattenTree(
        node.childNodes,
        expandedIds,
        depth + 1,
        [...indentGuides, !isLast],
        result
      );
    }
  });
  return result;
}


export function HierarchyTree({
  specs,
  onSpecClick,
  selectedSpecId,
  className,
  height = 600,
  width = "100%",
  sortBy = 'id-desc',
  expandedIds: controlledExpandedIds,
  onExpandedChange
}: HierarchyTreeProps) {
  const listRef = useRef<ListImperativeAPI>(null);

  // Memoize tree construction
  const treeRoots = useMemo(() => {
    return buildHierarchy(specs, sortBy);
  }, [specs, sortBy]);

  // State for expanded nodes
  const [internalExpandedIds, setInternalExpandedIds] = useState<Set<string>>(() => getAllParentIds(treeRoots));
  const hasInitialized = useRef(false);

  const isControlled = controlledExpandedIds !== undefined;
  const expandedIds = isControlled ? controlledExpandedIds : internalExpandedIds;

  // Flatten the tree for rendering
  const flatData = useMemo(() => {
    return flattenTree(treeRoots, expandedIds);
  }, [treeRoots, expandedIds]);

  // Track whether we've done the initial scroll
  const hasScrolledToSelected = useRef(false);

  // Track the last spec ID we successfully auto-expanded to avoid fighting user interactions
  const lastRevealedSpecId = useRef<string | null>(null);

  // Initialization: Expand all recursive nodes on mount or when specs change drastically
  useEffect(() => {
    if (!hasInitialized.current && treeRoots.length > 0) {
      // Only set internal state if uncontrolled
      if (!isControlled) {
        setInternalExpandedIds(getAllParentIds(treeRoots));
      }
      hasInitialized.current = true;
    }
  }, [treeRoots, isControlled]);

  // Auto-expand/scroll logic
  useEffect(() => {
    if (!selectedSpecId) return;

    // DFS to find path to selected node
    const findPath = (nodes: HierarchyNode[], target: string, path: string[]): string[] | undefined => {
      for (const node of nodes) {
        const id = node.id || node.specName;
        if (id === target) return path;

        if (node.childNodes && node.childNodes.length > 0) {
          const res = findPath(node.childNodes, target, [...path, id]);
          if (res) return res;
        }
      }
      return undefined;
    };

    const path = findPath(treeRoots, selectedSpecId, []);

    // Only expand if we found a path AND strictly need to reveal it (new selection or first successful find)
    if (path && lastRevealedSpecId.current !== selectedSpecId) {
      let needsExpansion = false;
      const newExpanded = new Set(expandedIds);

      for (const id of path) {
        if (!newExpanded.has(id)) {
          newExpanded.add(id);
          needsExpansion = true;
        }
      }

      if (needsExpansion) {
        if (isControlled) {
          onExpandedChange?.(newExpanded);
        } else {
          setInternalExpandedIds(newExpanded);
        }
      }

      // Mark as revealed so we don't fight subsequent user collapses
      lastRevealedSpecId.current = selectedSpecId;
    }
  }, [selectedSpecId, treeRoots]); // IMPORTANT: Do not include expandedIds here to avoid fighting user interactions

  // Effect to scroll once flatData is ready and contains our item
  useEffect(() => {
    // Skip if no selection
    if (!selectedSpecId || !listRef.current) return;

    // Skip if already scrolled
    if (hasScrolledToSelected.current) return;

    // Check if we found the item in the current flattened (visible) list
    const index = flatData.findIndex(item => (item.node.id || item.node.specName) === selectedSpecId);
    console.debug('index', index)

    if (index >= 0) {
      // Use requestAnimationFrame to ensure the list is fully rendered before scrolling
      const rafId = requestAnimationFrame(() => {
        if (listRef.current) {
          listRef.current.scrollToRow({ index, align: "smart" });
          hasScrolledToSelected.current = true;
        }
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [selectedSpecId, flatData]);

  const toggleNode = (node: HierarchyNode) => {
    const id = node.id || node.specName;
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }

    if (isControlled) {
      onExpandedChange?.(newExpanded);
    } else {
      setInternalExpandedIds(newExpanded);
    }
  };

  const Row = ({ index, style, selectedSpecId: rowSelectedSpecId }: RowComponentProps & { selectedSpecId?: string }) => {
    const { node, depth, indentGuides, isLast } = flatData[index];
    const id = node.id || node.specName;
    const hasChildren = node.childNodes && node.childNodes.length > 0;
    const isExpanded = expandedIds.has(id);
    const isSelected = rowSelectedSpecId === id;

    return (
      <div style={style} className="flex items-center">
        {/* Indent guides */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{ left: 0, width: `${depth * 16}px` }}
        >
          {indentGuides.map((hasLine, i) => hasLine && (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px bg-border/40"
              style={{ left: `${i * 16 + 7}px` }} // +7 to center in 16px slot
            />
          ))}
        </div>

        {/* Current node connector/guide */}
        {depth > 0 && (
          <div
            className="absolute top-0 w-4 pointer-events-none"
            style={{ left: `${(depth - 1) * 16}px`, height: '100%' }}
          >
            <div
              className={cn(
                "absolute left-[7px] w-px bg-border/40",
                isLast ? "top-0 h-1/2" : "top-0 bottom-0"
              )}
            />
          </div>
        )}

        <div
          className={cn(
            "flex items-center py-1.5 pr-2 rounded-md cursor-pointer text-xs transition-colors group flex-1 min-w-0",
            isSelected
              ? "bg-accent/80 font-medium text-accent-foreground"
              : "hover:bg-accent/50 text-foreground/80 hover:text-foreground"
          )}
          style={{ paddingLeft: `${depth * 16}px` }}
          onClick={() => onSpecClick?.(node)}
        >
          <div
            className={cn(
              "mr-0.5 h-4 w-4 flex items-center justify-center rounded-sm transition-colors shrink-0 z-10",
              !hasChildren && "invisible",
              !isSelected && "group-hover:bg-muted/50 text-muted-foreground/70 hover:text-foreground"
            )}
            onClick={(e) => {
              e.stopPropagation();
              toggleNode(node);
            }}
          >
            {hasChildren && (
              <ChevronRight className={cn("h-3 w-3 transition-transform duration-200", isExpanded && "rotate-90")} />
            )}
          </div>

          <span className="truncate flex-1 min-w-0" title={node.title || node.specName}>
            {node.specNumber ? <span className="opacity-60 mr-1.5 font-mono text-xs">#{String(node.specNumber).padStart(3, '0')}</span> : ''}
            {node.title || node.specName}
          </span>

          <div className="ml-2 shrink-0 flex items-center gap-1">
            <StatusBadge status={node.status} iconOnly className="px-1 h-5 min-w-5 justify-center" />
            {node.priority && <PriorityBadge priority={node.priority} iconOnly className="px-1 h-5 min-w-5 justify-center" />}
          </div>
        </div>
      </div>
    );
  };

  if (!specs || specs.length === 0) {
    return (
      <div className={cn("text-muted-foreground text-sm p-4 italic", className)}>
        No specs found.
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <List
        listRef={listRef}
        rowCount={flatData.length}
        rowHeight={30} // Consistent small row height
        style={{ height, width }}
        className="no-scrollbar" // Optional: custom scrollbar styling if needed
        rowComponent={Row}
        rowProps={{ selectedSpecId }}
      />
    </div>
  );
}