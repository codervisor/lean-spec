'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, BarChart3, BookOpen, Network, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ProjectSwitcher } from '@/components/project-switcher';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { useProjectUrl } from '@/contexts/project-context';

interface SidebarLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  description?: string;
  currentPath: string;
  isCollapsed?: boolean;
}

function SidebarLink({ href, icon: Icon, children, description, currentPath, isCollapsed }: SidebarLinkProps) {
  // Normalize paths by removing trailing slashes for comparison
  const normalizedHref = href.replace(/\/$/, '') || '/';
  const normalizedPath = currentPath.replace(/\/$/, '') || '/';
  
  // Extract the path portion after /projects/[projectId] for comparison
  // This ensures matching works even when project context isn't loaded yet
  const getPathWithoutProject = (path: string) => {
    const match = path.match(/^\/projects\/[^/]+(\/.*)?$/);
    return match ? (match[1] || '/') : path;
  };
  
  const hrefPathPortion = getPathWithoutProject(normalizedHref);
  const currentPathPortion = getPathWithoutProject(normalizedPath);
  
  // For home links (root or just /projects/xxx with no sub-path), require exact match
  // For other links, check if path starts with href
  const isHomeLink = hrefPathPortion === '/' || hrefPathPortion === '';
  const isActive = isHomeLink 
    ? currentPathPortion === '/' || currentPathPortion === ''
    : currentPathPortion.startsWith(hrefPathPortion);
  
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-accent text-accent-foreground font-medium",
        isCollapsed && "justify-center px-2"
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
      {!isCollapsed && (
        <div className="flex flex-col">
          <span className="text-sm">{children}</span>
          {description && (
            <span className="text-xs text-muted-foreground">{description}</span>
          )}
        </div>
      )}
    </Link>
  );
}

export function MainSidebar() {
  const pathname = usePathname();
  const { getUrl } = useProjectUrl();
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('main-sidebar-collapsed');
      return saved === 'true';
    }
    return false;
  });
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Update CSS variable for other components to use and persist to localStorage
  React.useEffect(() => {
    document.documentElement.style.setProperty(
      '--main-sidebar-width',
      isCollapsed ? '60px' : '240px'
    );
    localStorage.setItem('main-sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Expose function for mobile toggle
  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.toggleMainSidebar = () => setMobileOpen(prev => !prev);
    return () => {
      window.toggleMainSidebar = undefined;
    };
  }, []);

  // Build project-scoped URLs - always use getUrl from useProjectUrl
  // This handles both single-project (uses 'default') and multi-project modes
  const getNavUrl = (path: string) => {
    return getUrl(path);
  };

  // Hide sidebar on settings/management pages like /projects (manage projects page)
  const isSettingsPage = pathname === '/projects';
  if (isSettingsPage) {
    return null;
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "border-r border-border bg-background transition-all duration-300 flex-shrink-0",
          // Desktop behavior
          "hidden lg:flex lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)]",
          mounted && isCollapsed ? "lg:w-[60px]" : "lg:w-[240px]",
          // Mobile behavior - show as overlay when open
          mobileOpen && "fixed inset-y-0 left-0 z-[60] flex w-[280px]"
        )}
      >
        <div className="flex flex-col h-full w-full">
          {/* Mobile close button */}
          <div className="lg:hidden flex justify-end p-2 border-b border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileOpen(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close menu</span>
            </Button>
          </div>

          {/* Navigation */}
          {mounted && <nav className="flex-1 px-2 py-4 space-y-1">
            <div className="mb-4 flex items-center justify-center">
              <ProjectSwitcher collapsed={isCollapsed && !mobileOpen} />
            </div>
            <SidebarLink 
              href={getNavUrl('/')} 
              icon={Home} 
              currentPath={pathname}
              description={(!isCollapsed || mobileOpen) ? "Dashboard" : undefined}
              isCollapsed={isCollapsed && !mobileOpen}
            >
              Home
            </SidebarLink>
            <SidebarLink 
              href={getNavUrl('/specs')} 
              icon={FileText} 
              currentPath={pathname}
              description={(!isCollapsed || mobileOpen) ? "All Specifications" : undefined}
              isCollapsed={isCollapsed && !mobileOpen}
            >
              Specs
            </SidebarLink>
            <SidebarLink 
              href={getNavUrl('/dependencies')} 
              icon={Network} 
              currentPath={pathname}
              description={(!isCollapsed || mobileOpen) ? "Dependency Graph" : undefined}
              isCollapsed={isCollapsed && !mobileOpen}
            >
              Dependencies
            </SidebarLink>
            <SidebarLink 
              href={getNavUrl('/stats')} 
              icon={BarChart3} 
              currentPath={pathname}
              description={(!isCollapsed || mobileOpen) ? "Analytics" : undefined}
              isCollapsed={isCollapsed && !mobileOpen}
            >
              Stats
            </SidebarLink>
            <SidebarLink 
              href={getNavUrl('/context')} 
              icon={BookOpen} 
              currentPath={pathname}
              description={(!isCollapsed || mobileOpen) ? "Project Context" : undefined}
              isCollapsed={isCollapsed && !mobileOpen}
            >
              Context
            </SidebarLink>
          </nav>}

          {/* Collapse Toggle (desktop only) */}
          <div className="hidden lg:block p-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn("w-full", mounted && isCollapsed && "px-2")}
            >
              {mounted && isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  <span className="text-xs">Collapse</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
