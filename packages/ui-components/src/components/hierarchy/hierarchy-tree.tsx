import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Umbrella, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '../spec/status-badge';
import type { LightweightSpec } from '@/types/specs';

interface HierarchyNode extends LightweightSpec {
  childNodes: HierarchyNode[];
}

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
  level: number;
  onSpecClick?: (spec: LightweightSpec) => void;
  selectedSpecId?: string;
}

function TreeNode({ node, level, onSpecClick, selectedSpecId }: TreeNodeProps) {
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
          "flex items-center py-1 pr-2 rounded-md hover:bg-accent/50 cursor-pointer text-sm transition-colors",
          isSelected && "bg-accent/80 font-medium text-accent-foreground"
        )}
        style={{ paddingLeft: `${level * 16 + 4}px` }}
        onClick={handleClick}
      >
        <div 
          className={cn(
            "mr-1 h-5 w-5 flex items-center justify-center rounded-sm hover:bg-muted/50 transition-colors",
            !hasChildren && "invisible"
          )}
          onClick={hasChildren ? handleToggle : undefined}
        >
          {hasChildren && (
            isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
          )}
        </div>
        
        <div className="mr-2 text-muted-foreground">
          {hasChildren ? (
            <Umbrella className={cn("h-4 w-4", isExpanded ? "text-primary" : "text-muted-foreground")} />
          ) : (
            <FileText className="h-4 w-4" />
          )}
        </div>

        <span className="truncate flex-1">
          {node.specNumber ? `#${String(node.specNumber).padStart(3, '0')} ` : ''}
          {node.title || node.specName}
        </span>
        
        <div className="ml-2">
           <StatusBadge status={node.status} iconOnly />
        </div>
      </div>
      
      {hasChildren && isExpanded && (
        <div>
          {node.childNodes.map(child => (
            <TreeNode 
              key={child.id || child.specName} 
              node={child} 
              level={level + 1} 
              onSpecClick={onSpecClick}
              selectedSpecId={selectedSpecId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function HierarchyTree({ specs, onSpecClick, selectedSpecId, className }: HierarchyTreeProps) {
  // Memoize tree construction
  const treeRoots = useMemo(() => {
    const nodeMap = new Map<string, HierarchyNode>();
    
    // Initialize nodes
    specs.forEach(spec => {
      const id = spec.id || spec.specName;
      // create a shallow copy with added childNodes array
      nodeMap.set(id, { ...spec, childNodes: [] });
    });

    const roots: HierarchyNode[] = [];

    // Build hierarchy
    specs.forEach(spec => {
      const id = spec.id || spec.specName;
      const node = nodeMap.get(id)!;
      
      // Check if it has a parent that exists in our set
      // Try by parent ID/Name first
      const parentId = spec.parent;
      
      if (parentId && nodeMap.has(parentId)) {
        const parentNode = nodeMap.get(parentId)!;
        parentNode.childNodes.push(node);
      } else {
        // No parent, or parent not in this list -> it's a root
        roots.push(node);
      }
    });

    // Sort by spec number or name
    const sortNodes = (nodes: HierarchyNode[]) => {
      nodes.sort((a, b) => {
        if (a.specNumber && b.specNumber) return a.specNumber - b.specNumber;
        return a.specName.localeCompare(b.specName);
      });
      nodes.forEach(node => sortNodes(node.childNodes));
    };

    sortNodes(roots);
    return roots;
  }, [specs]);

  if (!specs || specs.length === 0) {
    return (
      <div className={cn("text-muted-foreground text-sm p-4 italic", className)}>
        No specs found.
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      {treeRoots.map(node => (
        <TreeNode 
          key={node.id || node.specName} 
          node={node} 
          level={0} 
          onSpecClick={onSpecClick}
          selectedSpecId={selectedSpecId}
        />
      ))}
    </div>
  );
}
