'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatusBadge, getStatusLabel } from '@/components/status-badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { extractH1Title } from '@/lib/utils';
import { PriorityBadge, getPriorityLabel } from './priority-badge';
import { formatRelativeTime } from '@/lib/date-utils';

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
  contentMd?: string;
  updatedAt?: Date | string | number | null;
}

interface SpecsNavSidebarProps {
  specs: Spec[];
  currentSpecId: string;
  currentSubSpec?: string;
  onSpecHover?: (specId: string) => void;
}

export function SpecsNavSidebar({ specs, currentSpecId, currentSubSpec, onSpecHover }: SpecsNavSidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('specs-nav-sidebar-collapsed');
      return saved === 'true';
    }
    return false;
  });
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const activeItemRef = React.useRef<HTMLAnchorElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Update CSS variable for page width calculations and persist to localStorage
  React.useEffect(() => {
    document.documentElement.style.setProperty(
      '--specs-nav-sidebar-width',
      isCollapsed ? '0px' : '280px'
    );
    localStorage.setItem('specs-nav-sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [currentSpecId, currentSubSpec]);

  // Expose function for mobile toggle
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).toggleSpecsSidebar = () => setMobileOpen(prev => !prev);
    }
  }, []);

  // Scroll active item into view only if it's not visible
  React.useEffect(() => {
    if (activeItemRef.current) {
      const element = activeItemRef.current;
      const parent = element.closest('.overflow-y-auto');

      if (parent) {
        const elementRect = element.getBoundingClientRect();
        const parentRect = parent.getBoundingClientRect();

        // Check if element is already visible
        const isVisible =
          elementRect.top >= parentRect.top &&
          elementRect.bottom <= parentRect.bottom;

        // Only scroll if not visible
        if (!isVisible) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }
    }
  }, [currentSpecId, currentSubSpec]);

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

  return (
    <TooltipProvider delayDuration={700}>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="relative flex-shrink-0">
        <aside className={cn(
          "sticky top-14 h-[calc(100vh-3.5rem)] border-r border-border bg-background flex flex-col overflow-hidden transition-all duration-300",
          // Desktop behavior
          "hidden lg:flex",
          mounted && isCollapsed ? "lg:w-0 lg:border-r-0" : "lg:w-[280px]",
          // Mobile behavior - show as overlay when open
          mobileOpen && "fixed left-0 top-14 z-50 flex w-[280px]"
        )}>
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Specifications</h2>
              <div className="flex items-center gap-1">
                {/* Mobile close button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileOpen(false)}
                  className="h-6 w-6 p-0 lg:hidden"
                >
                  <X className="h-4 w-4" />
                </Button>
                {/* Desktop collapse button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCollapsed(true)}
                  className="h-6 w-6 p-0 hidden lg:block"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search specs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 border-border"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="p-1">
              {sortedSpecs.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No specs found
                </div>
              ) : (
                sortedSpecs.map((spec) => {
                  const isCurrentSpec = spec.id === currentSpecId;

                  // Extract H1 title, fallback to title or name
                  const h1Title = spec.contentMd ? extractH1Title(spec.contentMd) : null;
                  const displayTitle = h1Title || spec.title || spec.specName;

                  return (
                    <div key={spec.id} className="mb-0.5">
                      {/* Main spec item */}
                      <div className="flex items-center gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              ref={isCurrentSpec && !currentSubSpec ? activeItemRef : null}
                              href={`/specs/${spec.specNumber || spec.id}`}
                              onMouseEnter={() => onSpecHover?.(spec.specNumber?.toString() || spec.id)}
                              className={cn(
                                'w-full flex items-start gap-2 p-1.5 rounded-md text-sm transition-colors',
                                isCurrentSpec
                                  ? 'bg-accent text-accent-foreground font-medium'
                                  : 'hover:bg-accent/50',
                              )}
                            >
                              <FileText className="h-4 w-4 shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  {spec.specNumber && (
                                    <span className="text-xs font-mono text-muted-foreground shrink-0">
                                      #{spec.specNumber.toString().padStart(3, '0')}
                                    </span>
                                  )}
                                  <span className="truncate text-xs leading-relaxed">{displayTitle}</span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {spec.status && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div>
                                          <StatusBadge status={spec.status} iconOnly className="text-[10px] scale-90" />
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="right">
                                        {getStatusLabel(spec.status)}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {spec.priority && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div>
                                          <PriorityBadge priority={spec.priority} iconOnly className="text-[10px] scale-90" />
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="right">
                                        {getPriorityLabel(spec.priority)}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {spec.updatedAt && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {formatRelativeTime(spec.updatedAt)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[300px]">
                            <div className="space-y-1">
                              <div className="font-semibold">{displayTitle}</div>
                              <div className="text-xs text-muted-foreground">{spec.specName}</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* Floating toggle button when collapsed (desktop only) */}
        {mounted && isCollapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(false)}
            className="hidden lg:block h-6 w-6 p-0 fixed z-50 top-20 -translate-y-1 -translate-x-1/2 left-[calc(var(--main-sidebar-width,240px))] bg-background border"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {/* Mobile floating toggle button - matches BackToTop/TOC style */}
        <Button
          onClick={() => setMobileOpen(true)}
          size="icon"
          className="lg:hidden fixed bottom-6 left-6 h-12 w-12 rounded-full shadow-lg z-40 hover:scale-110 transition-transform"
          aria-label="Show specifications list"
        >
          <FileText className="h-5 w-5" />
        </Button>
      </div>
    </TooltipProvider>
  );
}
