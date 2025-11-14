'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface SidebarLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  description?: string;
  currentPath: string;
  isCollapsed?: boolean;
}

function SidebarLink({ href, icon: Icon, children, description, currentPath, isCollapsed }: SidebarLinkProps) {
  const isActive = currentPath === href || (href !== '/' && currentPath.startsWith(href));
  
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside 
      className={cn(
        "sticky top-14 h-[calc(100vh-3.5rem)] border-r bg-background transition-all duration-300",
        isCollapsed ? "w-[60px]" : "w-[240px]"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <SidebarLink 
            href="/" 
            icon={Home} 
            currentPath={pathname}
            description={!isCollapsed ? "Dashboard" : undefined}
            isCollapsed={isCollapsed}
          >
            Home
          </SidebarLink>
          <SidebarLink 
            href="/specs" 
            icon={FileText} 
            currentPath={pathname}
            description={!isCollapsed ? "All Specifications" : undefined}
            isCollapsed={isCollapsed}
          >
            Specs
          </SidebarLink>
          <SidebarLink 
            href="/stats" 
            icon={BarChart3} 
            currentPath={pathname}
            description={!isCollapsed ? "Analytics" : undefined}
            isCollapsed={isCollapsed}
          >
            Stats
          </SidebarLink>
        </nav>

        {/* Collapse Toggle */}
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn("w-full", isCollapsed && "px-2")}
          >
            {isCollapsed ? (
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
  );
}
