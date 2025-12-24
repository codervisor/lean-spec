import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, BarChart3, Network, Settings, ChevronLeft, ChevronRight, BookOpen, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { ProjectSwitcher } from './ProjectSwitcher';

const STORAGE_KEY = 'ui-vite-main-sidebar-collapsed';

interface NavItem {
  path: string;
  label: string;
  icon: typeof Home;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/specs', label: 'All Specifications', icon: FileText },
  { path: '/dependencies', label: 'Dependency Graph', icon: Network },
  { path: '/stats', label: 'Analytics', icon: BarChart3 },
  { path: '/context', label: 'Project Context', icon: BookOpen },
  { path: '/settings', label: 'Settings', icon: Settings },
];

interface MainSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function MainSidebar({ mobileOpen = false, onMobileClose }: MainSidebarProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setCollapsed(stored === 'true');
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--main-sidebar-width', collapsed ? '64px' : '240px');
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  // Close mobile sidebar when route changes
  useEffect(() => {
    if (mobileOpen && onMobileClose) {
      onMobileClose();
    }
  }, [location.pathname]);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r bg-background h-[calc(100vh-3.5rem)] transition-all duration-300',
          // Desktop styles
          'hidden lg:flex sticky top-14',
          collapsed ? 'w-16' : 'w-60',
          // Mobile styles
          'lg:hidden fixed left-0 top-14 z-50 w-60',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Show on desktop OR when mobile menu is open
          'lg:translate-x-0 lg:flex'
        )}
      >
        {/* Mobile close button */}
        <div className="lg:hidden flex justify-end p-2 border-b">
          <button
            onClick={onMobileClose}
            className="p-2 hover:bg-secondary rounded-md transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-3 py-4">
          <ProjectSwitcher />
        </div>

        <nav className="flex-1 px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive && 'bg-accent text-accent-foreground font-medium',
                  collapsed && 'justify-center px-2'
                )}
              >
                <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t hidden lg:block">
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className={cn('w-full flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-secondary transition-colors', collapsed && 'px-2')}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!collapsed && <span className="text-xs">Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
