'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FileText, 
  Search, 
  ChevronDown, 
  ChevronRight,
  Palette,
  Code,
  TestTube,
  CheckSquare,
  Wrench,
  Map,
  GitBranch,
  BookOpen
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/status-badge';
import { cn } from '@/lib/utils';

interface SubSpec {
  name: string;
  file: string;
  iconName: string;
  color: string;
  content: string;
}

interface Spec {
  id: string;
  specNumber: number | null;
  title: string | null;
  specName: string;
  status: string | null;
  priority: string | null;
  subSpecs?: SubSpec[];
}

interface SpecsNavSidebarProps {
  specs: Spec[];
  currentSpecId: string;
  currentSubSpec?: string;
}

const SUB_SPEC_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'FileText': FileText,
  'Palette': Palette,
  'Code': Code,
  'TestTube': TestTube,
  'CheckSquare': CheckSquare,
  'Wrench': Wrench,
  'Map': Map,
  'GitBranch': GitBranch,
  'BookOpen': BookOpen,
};

export function SpecsNavSidebar({ specs, currentSpecId, currentSubSpec }: SpecsNavSidebarProps) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [expandedSpecs, setExpandedSpecs] = React.useState<Set<string>>(() => {
    // Auto-expand current spec
    return new Set([currentSpecId]);
  });

  const filteredSpecs = React.useMemo(() => {
    if (!searchQuery) return specs;
    const query = searchQuery.toLowerCase();
    return specs.filter(
      (spec) =>
        spec.title?.toLowerCase().includes(query) ||
        spec.specName.toLowerCase().includes(query) ||
        spec.specNumber?.toString().includes(query)
    );
  }, [specs, searchQuery]);

  // Sort specs by number descending (newest first)
  const sortedSpecs = React.useMemo(() => {
    return [...filteredSpecs].sort((a, b) => (b.specNumber || 0) - (a.specNumber || 0));
  }, [filteredSpecs]);

  const toggleExpanded = (specId: string) => {
    setExpandedSpecs(prev => {
      const next = new Set(prev);
      if (next.has(specId)) {
        next.delete(specId);
      } else {
        next.add(specId);
      }
      return next;
    });
  };

  return (
    <aside className="sticky top-14 h-[calc(100vh-3.5rem)] w-[280px] border-r bg-background flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-sm mb-3">Specifications</h2>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search specs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {sortedSpecs.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No specs found
            </div>
          ) : (
            sortedSpecs.map((spec) => {
              const isCurrentSpec = spec.id === currentSpecId;
              const isExpanded = expandedSpecs.has(spec.id);
              const hasSubSpecs = spec.subSpecs && spec.subSpecs.length > 0;
              const displayTitle = spec.title || spec.specName;
              
              return (
                <div key={spec.id} className="mb-1">
                  {/* Main spec item */}
                  <div className="flex items-center gap-1">
                    {hasSubSpecs && (
                      <button
                        onClick={() => toggleExpanded(spec.id)}
                        className="p-1 hover:bg-accent rounded"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </button>
                    )}
                    <Link
                      href={`/specs/${spec.specNumber || spec.id}`}
                      className={cn(
                        'flex-1 flex items-start gap-2 p-2 rounded-md text-sm transition-colors',
                        isCurrentSpec && !currentSubSpec
                          ? 'bg-accent text-accent-foreground font-medium'
                          : 'hover:bg-accent/50',
                        !hasSubSpecs && 'ml-5'
                      )}
                    >
                      <FileText className="h-4 w-4 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {spec.specNumber && (
                            <span className="text-xs font-mono text-muted-foreground">
                              #{spec.specNumber.toString().padStart(3, '0')}
                            </span>
                          )}
                        </div>
                        <div className="truncate text-xs">{displayTitle}</div>
                        {spec.status && (
                          <div className="mt-1">
                            <StatusBadge status={spec.status} size="sm" />
                          </div>
                        )}
                      </div>
                    </Link>
                  </div>

                  {/* Sub-specs (indented) */}
                  {hasSubSpecs && isExpanded && (
                    <div className="ml-5 mt-1 space-y-1">
                      {spec.subSpecs!.map((subSpec) => {
                        const Icon = SUB_SPEC_ICONS[subSpec.iconName] || FileText;
                        const isCurrentSubSpec = isCurrentSpec && currentSubSpec === subSpec.file;
                        
                        return (
                          <Link
                            key={subSpec.file}
                            href={`/specs/${spec.specNumber || spec.id}?subspec=${subSpec.file}`}
                            className={cn(
                              'flex items-center gap-2 p-2 rounded-md text-sm transition-colors',
                              isCurrentSubSpec
                                ? 'bg-accent text-accent-foreground font-medium'
                                : 'hover:bg-accent/50'
                            )}
                          >
                            <Icon className={cn('h-4 w-4 shrink-0', subSpec.color)} />
                            <span className="truncate text-xs">{subSpec.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}
