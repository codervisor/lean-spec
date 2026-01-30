import { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '../spec/status-badge';
import { PriorityBadge } from '../spec/priority-badge';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import type { LightweightSpec } from '@/types/specs';
import { buildHierarchy, type HierarchyNode } from '@/lib/hierarchy';

export interface HierarchyTreeProps {
  /** Flat list of all specs to render in the tree */
  specs: LightweightSpec[];
  /** Callback when a spec is clicked */
  onSpecClick?: (spec: LightweightSpec) => void;
  /** Currently selected spec ID */
  selectedSpecId?: string;
  /** Class name */
  className?: string;
}

interface TreeNodeProps {
  node: HierarchyNode;
  onSpecClick?: (spec: LightweightSpec) => void;
  selectedSpecId?: string;
}

function TreeNode({ node, onSpecClick, selectedSpecId }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.childNodes && node.childNodes.length > 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleClick = () => {
    onSpecClick?.(node);
  };

  const isSelected = selectedSpecId === (node.id || node.specName);

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center py-1.5 pr-2 rounded-md cursor-pointer text-xs transition-colors group",
          isSelected
            ? "bg-accent/80 font-medium text-accent-foreground"
            : "hover:bg-accent/50 text-foreground/80 hover:text-foreground"
        )}
        onClick={handleClick}
        data-spec-id={node.id || node.specName}
      >
        <div
          className={cn(
            "mr-0.5 h-4 w-4 flex items-center justify-center rounded-sm transition-colors shrink-0",
            !hasChildren && "invisible",
            !isSelected && "group-hover:bg-muted/50 text-muted-foreground/70 hover:text-foreground"
          )}
          onClick={hasChildren ? handleToggle : undefined}
        >
          {hasChildren && (
            <ChevronRight className={cn("h-3 w-3 transition-transform duration-200", isExpanded && "rotate-90")} />
          )}
        </div>

        <span className="truncate flex-1" title={node.title || node.specName}>
          {node.specNumber ? <span className="opacity-60 mr-1.5 font-mono text-xs">#{String(node.specNumber).padStart(3, '0')}</span> : ''}
          {node.title || node.specName}
        </span>

        <div className="ml-2 shrink-0 flex items-center gap-1">
          <StatusBadge status={node.status} iconOnly className="px-1 h-5 min-w-5 justify-center" />
          {node.priority && <PriorityBadge priority={node.priority} iconOnly className="px-1 h-5 min-w-5 justify-center" />}
        </div>
      </div>

      {hasChildren && (
        <Collapsible open={isExpanded}>
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <div className="ml-2 pl-2 border-l border-border/50 flex flex-col gap-0.5 mt-0.5">
              {node.childNodes.map(child => (
                <TreeNode
                  key={child.id || child.specName}
                  node={child}
                  onSpecClick={onSpecClick}
                  selectedSpecId={selectedSpecId}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

export function HierarchyTree({ specs, onSpecClick, selectedSpecId, className }: HierarchyTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoize tree construction
  const treeRoots = useMemo(() => {
    return buildHierarchy(specs);
  }, [specs]);

  // Track previous selection to avoid unnecessary scrolls (align with list-view behavior)
  const prevSelectedSpecId = useRef<string | undefined>(undefined);
  const hasScrolledInitially = useRef(false);

  // Scroll to selected element on mount or when selection changes
  // Aligned with list-view behavior: use 'nearest' (smart scroll) and skip if selection unchanged
  useEffect(() => {
    if (!selectedSpecId || !containerRef.current) return;

    // Skip if selection hasn't changed and we've already done initial scroll
    if (prevSelectedSpecId.current === selectedSpecId && hasScrolledInitially.current) return;

    // Find the element with the matching data-spec-id
    const element = containerRef.current.querySelector(`[data-spec-id="${selectedSpecId}"]`);
    if (element) {
      // Use requestAnimationFrame to defer scroll (align with list-view behavior)
      const raf = requestAnimationFrame(() => {
        // Use 'nearest' (equivalent to list-view's 'smart') - only scrolls if element is out of view
        element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
      hasScrolledInitially.current = true;
      prevSelectedSpecId.current = selectedSpecId;
      return () => cancelAnimationFrame(raf);
    }

    prevSelectedSpecId.current = selectedSpecId;
  }, [selectedSpecId, specs.length]); // Also run when specs change (initial load)

  if (!specs || specs.length === 0) {
    return (
      <div className={cn("text-muted-foreground text-sm p-4 italic", className)}>
        No specs found.
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("flex flex-col gap-0.5", className)}>
      {treeRoots.map(node => (
        <TreeNode
          key={node.id || node.specName}
          node={node}
          onSpecClick={onSpecClick}
          selectedSpecId={selectedSpecId}
        />
      ))}
    </div>
  );
}
