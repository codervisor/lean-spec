import type { ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { BookOpen, ChevronRight, Menu, BotMessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@leanspec/ui-components';
import { QuickSearch } from './QuickSearch';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';
import { WideModeToggle } from './WideModeToggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './Tooltip';
// import { useMediaQuery } from '../hooks/use-media-query';
import { useChat } from '../contexts';
import { useCurrentProject } from '../hooks/useProjectQuery';

interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface NavigationProps {
  onToggleSidebar?: () => void;
  onShowShortcuts?: () => void;
  rightSlot?: ReactNode;
  onHeaderDoubleClick?: () => void;
}

function stripProjectPrefix(pathname: string): string {
  const match = pathname.match(/^\/projects\/[^/]+(\/.*)?$/);
  return match ? match[1] || '/' : pathname;
}

function parsePathname(pathname: string): { page: string; specId?: string; query?: string } {
  const path = stripProjectPrefix(pathname);

  if (path === '/') return { page: 'home' };
  if (path === '/stats') return { page: 'stats' };
  if (path === '/chat') return { page: 'chat' };
  if (path === '/dependencies') return { page: 'dependencies' };
  if (path === '/context') return { page: 'context' };
  if (path === '/settings') return { page: 'settings' };
  if (path === '/machines') return { page: 'machines' };
  if (path === '/specs' || path.startsWith('/specs?')) {
    return { page: 'specs', query: path.split('?')[1] };
  }
  if (path.startsWith('/specs/')) {
    return { page: 'spec-detail', specId: path.split('/')[2] };
  }
  if (path === '/sessions' || path.startsWith('/sessions?')) {
    return { page: 'sessions', query: path.split('?')[1] };
  }
  if (path.startsWith('/sessions/')) {
    return { page: 'session-detail', specId: path.split('/')[2] };
  }

  return { page: 'unknown' };
}

function Breadcrumb({ basePath }: { basePath: string }) {
  const location = useLocation();
  const { t } = useTranslation('common');

  const homeLabel = t('navigation.home');
  const specsLabel = t('navigation.specs');
  const chatLabel = t('navigation.chat');
  const statsLabel = t('navigation.stats');
  const depsLabel = t('navigation.dependencies');
  const contextLabel = t('navigation.context');
  const settingsLabel = t('navigation.settings');
  const machinesLabel = t('navigation.machines');
  const sessionsLabel = t('navigation.sessions');

  const parsed = parsePathname(location.pathname);

  let items: BreadcrumbItem[] = [];

  switch (parsed.page) {
    case 'home':
      items = [{ label: homeLabel }];
      break;

    case 'stats':
      items = [{ label: homeLabel, to: basePath }, { label: statsLabel }];
      break;

    case 'chat':
      items = [{ label: homeLabel, to: basePath }, { label: chatLabel }];
      break;

    case 'dependencies':
      items = [{ label: homeLabel, to: basePath }, { label: depsLabel }];
      break;

    case 'context':
      items = [{ label: homeLabel, to: basePath }, { label: contextLabel }];
      break;

    case 'settings':
      items = [{ label: homeLabel, to: basePath }, { label: settingsLabel }];
      break;

    case 'machines':
      items = [{ label: homeLabel, to: basePath }, { label: machinesLabel }];
      break;

    case 'specs': {
      items = [{ label: homeLabel, to: basePath }, { label: specsLabel }];
      break;
    }

    case 'spec-detail':
      items = [
        { label: homeLabel, to: basePath },
        { label: specsLabel, to: `${basePath}/specs` },
        { label: parsed.specId || '' },
      ];
      break;

    case 'sessions':
      items = [{ label: homeLabel, to: basePath }, { label: sessionsLabel }];
      break;

    case 'session-detail':
      items = [
        { label: homeLabel, to: basePath },
        { label: sessionsLabel, to: `${basePath}/sessions` },
        { label: parsed.specId || '' },
      ];
      break;

    default:
      items = [{ label: homeLabel, to: basePath }];
  }

  return (
    <nav className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="h-4 w-4" />}
          {item.to ? (
            <Link to={item.to} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}

export function Navigation({ onToggleSidebar, rightSlot, onHeaderDoubleClick }: NavigationProps) {
  const { t } = useTranslation('common');
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject } = useCurrentProject();
  const { toggleChat } = useChat();
  const resolvedProjectId = projectId ?? currentProject?.id;
  const basePath = resolvedProjectId ? `/projects/${resolvedProjectId}` : '/projects';

  const toggleSidebar = () => {
    onToggleSidebar?.();
  };

  return (
    <header
      className="sticky top-0 z-50 h-14 border-b border-border bg-background transition-all duration-300 ease-in-out"
      data-tauri-drag-region="true"
      onDoubleClick={onHeaderDoubleClick}
    >
      <div className="flex items-center justify-between h-full lg:px-1 px-4">
        {/* Left: Mobile Menu + Logo + Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          {/* Mobile hamburger menu */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="lg:hidden h-9 w-9 shrink-0"
            data-tauri-drag-region="false"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">{t('navigation.toggleMenu')}</span>
          </Button>

          <Link
            to={basePath}
            className="flex items-center space-x-2 shrink-0"
            data-tauri-drag-region="false"
          >
            <img
              src="/logo-with-bg.svg"
              alt="LeanSpec"
              className="h-7 w-7 sm:h-8 sm:w-8 dark:hidden"
            />
            <img
              src="/logo-dark-bg.svg"
              alt="LeanSpec"
              className="h-7 w-7 sm:h-8 sm:w-8 hidden dark:block"
            />
            <span className="font-bold text-lg sm:text-xl hidden sm:inline">LeanSpec</span>
          </Link>
          <div className="hidden md:block min-w-0" data-tauri-drag-region="false">
            <Breadcrumb basePath={basePath} />
          </div>
        </div>

        {/* Right: Search + Language + Theme + Docs + GitHub */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0" data-tauri-drag-region="false">
          <div data-tauri-drag-region="false">
            <QuickSearch />
          </div>
          <TooltipProvider>
            <WideModeToggle />
            <LanguageSwitcher />
            <ThemeToggle />


            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="h-9 w-9 sm:h-10 sm:w-10"
                  data-tauri-drag-region="false"
                >
                  <a
                    href="https://www.lean-spec.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('navigation.docsTooltip')}
                  >
                    <BookOpen className="h-5 w-5" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('navigation.docsTooltip')}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="h-9 w-9 sm:h-10 sm:w-10"
                  data-tauri-drag-region="false"
                >
                  <a
                    href="https://github.com/codervisor/lean-spec"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('navigation.githubTooltip')}
                  >
                    <img
                      src="/github-mark-white.svg"
                      alt="GitHub"
                      className="hidden dark:block w-5 h-5"
                    />
                    <img
                      src="/github-mark.svg"
                      alt="GitHub"
                      className="dark:hidden w-5 h-5"
                    />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('navigation.githubTooltip')}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 sm:h-10 sm:w-10"
                  onClick={toggleChat}
                  data-tauri-drag-region="false"
                >
                  <BotMessageSquare className="h-5 w-5" />
                  <span className="sr-only">{t('chat.openChat', 'Open AI Chat')}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('chat.openChat', 'Open AI Chat')}</p>
              </TooltipContent>
            </Tooltip>

            {rightSlot && (
              <div className="ml-2 flex items-center" data-tauri-drag-region="false">
                {rightSlot}
              </div>
            )}
          </TooltipProvider>
        </div>
      </div>
    </header>
  );
}
