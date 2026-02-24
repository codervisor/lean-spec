import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, FileText, BarChart3, Network, ChevronLeft, ChevronRight, BookOpen, X, Folder, Cpu, Settings, Terminal, FolderOpen } from 'lucide-react';
import { cn } from '@/library';
import { ProjectSwitcher } from './project-switcher';
import { SidebarLink } from './shared/sidebar-link';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { useMachineStore } from '../stores/machine';
import { useLayoutStore } from '../stores/layout';

interface MainSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function MainSidebar({ mobileOpen = false, onMobileClose }: MainSidebarProps) {
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject } = useCurrentProject();
  const resolvedProjectId = projectId ?? currentProject?.id;
  const basePath = resolvedProjectId ? `/projects/${resolvedProjectId}` : '/projects';
  const { t } = useTranslation('common');
  const { machineModeEnabled } = useMachineStore();
  const { mainSidebarCollapsed: collapsed, toggleMainSidebar } = useLayoutStore();

  useEffect(() => {
    document.documentElement.style.setProperty('--main-sidebar-width', collapsed ? '60px' : '240px');
  }, [collapsed]);

  // Close mobile sidebar when route changes
  useEffect(() => {
    if (mobileOpen && onMobileClose) {
      onMobileClose();
    }
  }, [location.pathname, mobileOpen, onMobileClose]);

  const navItems = [
    { id: 'home', path: basePath, label: t('navigation.home'), description: t('navigation.dashboard'), icon: Home },
    { id: 'specs', path: `${basePath}/specs`, label: t('navigation.specs'), description: t('navigation.allSpecifications'), icon: FileText },
    { id: 'sessions', path: `${basePath}/sessions`, label: t('navigation.sessions'), description: t('navigation.sessionsDescription'), icon: Terminal },
    { id: 'files', path: `${basePath}/files`, label: t('navigation.files'), description: t('navigation.filesDescription'), icon: FolderOpen },
    { id: 'dependencies', path: `${basePath}/dependencies`, label: t('navigation.dependencies'), description: t('navigation.dependencyGraph'), icon: Network },
    { id: 'stats', path: `${basePath}/stats`, label: t('navigation.stats'), description: t('navigation.analytics'), icon: BarChart3 },
    { id: 'context', path: `${basePath}/context`, label: t('navigation.context'), description: t('navigation.projectContext'), icon: BookOpen },
    { id: 'projects', path: '/projects', label: t('navigation.projects'), description: t('navigation.manageProjects'), icon: Folder },
    { id: 'settings', path: '/settings', label: t('navigation.settings'), description: t('navigation.settingsDescription'), icon: Settings },
    ...(machineModeEnabled
      ? [{ id: 'machines', path: '/machines', label: t('navigation.machines'), description: t('navigation.manageMachines'), icon: Cpu }]
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
                key={item.id}
                to={item.path}
                icon={item.icon}
                label={item.label}
                description={!collapsed || mobileOpen ? item.description : undefined}
                isCollapsed={collapsed && !mobileOpen}
                stripProjectPrefix
              />
            ))}
          </nav>

          <div className="hidden lg:block p-2 border-t">
            <button
              onClick={toggleMainSidebar}
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
