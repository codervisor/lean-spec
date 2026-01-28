import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, FileText, BarChart3, Network, ChevronLeft, ChevronRight, BookOpen, X, Folder, Cpu, Settings, Terminal } from 'lucide-react';
import { cn } from '../lib/utils';
import { ProjectSwitcher } from './ProjectSwitcher';
import { useMachine, useProject } from '../contexts';

const STORAGE_KEY = 'main-sidebar-collapsed';

interface SidebarLinkProps {
  to: string;
  icon: typeof Home;
  label: string;
  description?: string;
  currentPath: string;
  isCollapsed: boolean;
}

function SidebarLink({ to, icon: Icon, label, description, currentPath, isCollapsed }: SidebarLinkProps) {
  const normalize = (value: string) => value.replace(/\/$/, '') || '/';
  const normalizedTo = normalize(to);
  const normalizedPath = normalize(currentPath);

  // Strip /projects/:id prefix so highlighting works for project-scoped routes
  const stripProjectPrefix = (value: string) => {
    const match = value.match(/^\/projects\/[^/]+(\/.*)?$/);
    return match ? (match[1] || '/') : value;
  };

  const toWithoutProject = stripProjectPrefix(normalizedTo);
  const pathWithoutProject = stripProjectPrefix(normalizedPath);

  const isHome = toWithoutProject === '/' || toWithoutProject === '';
  const isActive = isHome
    ? pathWithoutProject === '/' || pathWithoutProject === ''
    : pathWithoutProject === toWithoutProject || pathWithoutProject.startsWith(`${toWithoutProject}/`);

  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        isActive && 'bg-accent text-accent-foreground font-medium',
        isCollapsed && 'justify-center px-2'
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
      {!isCollapsed && (
        <div className="flex flex-col">
          <span className="text-sm">{label}</span>
          {description && <span className="text-xs text-muted-foreground">{description}</span>}
        </div>
      )}
    </Link>
  );
}

interface MainSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function MainSidebar({ mobileOpen = false, onMobileClose }: MainSidebarProps) {
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject } = useProject();
  const resolvedProjectId = projectId ?? currentProject?.id;
  const basePath = resolvedProjectId ? `/projects/${resolvedProjectId}` : '/projects';
  const { t } = useTranslation('common');
  const { machineModeEnabled } = useMachine();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--main-sidebar-width', collapsed ? '60px' : '240px');
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    }
  }, [collapsed]);

  // Close mobile sidebar when route changes
  useEffect(() => {
    if (mobileOpen && onMobileClose) {
      onMobileClose();
    }
  }, [location.pathname, mobileOpen, onMobileClose]);

  const navItems = [
    { path: basePath, label: t('navigation.home'), description: t('navigation.dashboard'), icon: Home },
    { path: `${basePath}/specs`, label: t('navigation.specs'), description: t('navigation.allSpecifications'), icon: FileText },
    { path: `${basePath}/sessions`, label: t('navigation.sessions'), description: t('navigation.sessionsDescription'), icon: Terminal },
    { path: `${basePath}/dependencies`, label: t('navigation.dependencies'), description: t('navigation.dependencyGraph'), icon: Network },
    { path: `${basePath}/stats`, label: t('navigation.stats'), description: t('navigation.analytics'), icon: BarChart3 },
    { path: `${basePath}/context`, label: t('navigation.context'), description: t('navigation.projectContext'), icon: BookOpen },
    { path: '/projects', label: t('navigation.projects'), description: t('navigation.manageProjects'), icon: Folder },
    { path: '/settings', label: t('navigation.settings'), description: t('navigation.settingsDescription'), icon: Settings },
    ...(machineModeEnabled
      ? [{ path: '/machines', label: t('navigation.machines'), description: t('navigation.manageMachines'), icon: Cpu }]
      : []),
  ];

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          'border-r bg-background transition-all duration-300 flex-shrink-0',
          // Desktop behavior
          "hidden lg:flex lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)]",
          collapsed ? "lg:w-[60px]" : "lg:w-[240px]",
          // Mobile behavior - show as overlay when open
          mobileOpen && "fixed inset-y-0 left-0 z-[60] flex w-[280px]"
        )}
      >
        <div className="flex flex-col h-full w-full">
          {/* Mobile close button */}
          <div className="lg:hidden flex justify-end p-2 border-b">
            <button
              onClick={onMobileClose}
              className="p-2 hover:bg-secondary rounded-md transition-colors"
              aria-label={t('navigation.closeMenu')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 px-2 py-2 space-y-1">
            <div className="mb-4 flex items-center justify-center">
              <ProjectSwitcher collapsed={collapsed && !mobileOpen} />
            </div>
            {navItems.map((item) => (
              <SidebarLink
                key={item.path}
                to={item.path}
                icon={item.icon}
                label={item.label}
                description={!collapsed || mobileOpen ? item.description : undefined}
                currentPath={location.pathname}
                isCollapsed={collapsed && !mobileOpen}
              />
            ))}
          </nav>

          <div className="hidden lg:block p-2 border-t">
            <button
              onClick={() => setCollapsed((prev) => !prev)}
              className={cn(
                'w-full flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-secondary transition-colors',
                collapsed && 'px-2'
              )}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              {!collapsed && <span className="text-xs">{t('navigation.collapse')}</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
