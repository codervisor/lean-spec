'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ChevronRight, Menu, BookOpen } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';
import { QuickSearch } from '@/components/quick-search';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useProjectUrl } from '@/contexts/project-context';
import { useTranslation } from 'react-i18next';

interface Spec {
  id: string
  specNumber: string
  title: string
  status: string
  priority: string
  tags: string[]
  createdAt: string
}

interface NavigationProps {
  specs: Spec[]
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="h-4 w-4" />}
          {item.href ? (
            <Link 
              href={item.href}
              className="hover:text-foreground transition-colors"
            >
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

/**
 * Parse pathname to extract project context and page info
 * Handles both legacy (/specs/*) and project-scoped (/projects/[id]/*) URLs
 */
function parsePathname(pathname: string): { projectId?: string; page: string; specId?: string; query?: string } {
  // Project-scoped URL: /projects/[projectId]/...
  const projectMatch = pathname.match(/^\/projects\/([^/]+)(?:\/(.*))?$/);
  if (projectMatch) {
    const projectId = projectMatch[1];
    const rest = projectMatch[2] || '';
    
    // Parse the page within the project
    if (!rest) {
      return { projectId, page: 'home' };
    }
    if (rest === 'specs' || rest.startsWith('specs?')) {
      return { projectId, page: 'specs', query: rest.split('?')[1] };
    }
    if (rest.startsWith('specs/')) {
      return { projectId, page: 'spec-detail', specId: rest.split('/')[1] };
    }
    if (rest === 'stats') {
      return { projectId, page: 'stats' };
    }
    if (rest === 'dependencies') {
      return { projectId, page: 'dependencies' };
    }
    if (rest === 'context') {
      return { projectId, page: 'context' };
    }
    return { projectId, page: 'unknown' };
  }
  
  // Legacy URLs (single-project mode)
  if (pathname === '/') return { page: 'home' };
  if (pathname === '/stats') return { page: 'stats' };
  if (pathname === '/dependencies') return { page: 'dependencies' };
  if (pathname === '/context') return { page: 'context' };
  if (pathname === '/specs' || pathname.startsWith('/specs?')) {
    return { page: 'specs', query: pathname.split('?')[1] };
  }
  if (pathname.startsWith('/specs/')) {
    return { page: 'spec-detail', specId: pathname.split('/')[2] };
  }
  
  return { page: 'unknown' };
}

/**
 * Generate breadcrumbs using project-scoped URLs
 */
function useBreadcrumbs(): BreadcrumbItem[] {
  const pathname = usePathname();
  const { getUrl } = useProjectUrl();
  const { t } = useTranslation('common');
  const homeLabel = t('navigation.home');
  const specsLabel = t('navigation.specs');
  const statsLabel = t('navigation.stats');
  const depsLabel = t('navigation.dependencies');
  const contextLabel = t('navigation.context');
  
  const parsed = parsePathname(pathname);
  const homeUrl = getUrl('/');
  const specsUrl = getUrl('/specs');
  
  switch (parsed.page) {
    case 'home':
      return [{ label: homeLabel }];
    
    case 'stats':
      return [
        { label: homeLabel, href: homeUrl },
        { label: statsLabel }
      ];
    
    case 'dependencies':
      return [
        { label: homeLabel, href: homeUrl },
        { label: depsLabel }
      ];
    
    case 'context':
      return [
        { label: homeLabel, href: homeUrl },
        { label: contextLabel }
      ];
    
    case 'specs': {
      const searchParams = new URLSearchParams(parsed.query || '');
      const view = searchParams.get('view');
      const viewLabel = view === 'board' 
        ? t('specsPage.views.boardTooltip')
        : t('specsPage.views.listTooltip');
      return [
        { label: homeLabel, href: homeUrl },
        { label: `${specsLabel} (${viewLabel})` }
      ];
    }
    
    case 'spec-detail':
      return [
        { label: homeLabel, href: homeUrl },
        { label: specsLabel, href: specsUrl },
        { label: parsed.specId || '' }
      ];
    
    default:
      return [{ label: homeLabel, href: homeUrl }];
  }
}

export function Navigation({ specs }: NavigationProps) {
  const breadcrumbs = useBreadcrumbs();
  const { t } = useTranslation('common');

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.toggleMainSidebar) {
      window.toggleMainSidebar();
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full h-14 border-b border-border bg-background">
      <div className="flex items-center justify-between h-full px-2 sm:px-4">
        {/* Left: Mobile Menu + Logo + Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          {/* Mobile hamburger menu */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="lg:hidden h-9 w-9 shrink-0"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">{t('navigation.toggleMenu')}</span>
          </Button>

          <Link href="/" className="flex items-center space-x-2 shrink-0">
            <Image
              src="/logo-with-bg.svg" 
              alt="LeanSpec" 
              width={32}
              height={32}
              className="h-7 w-7 sm:h-8 sm:w-8 dark:hidden" 
            />
            <Image
              src="/logo-dark-bg.svg" 
              alt="LeanSpec" 
              width={32}
              height={32}
              className="h-7 w-7 sm:h-8 sm:w-8 hidden dark:block" 
            />
            <span className="font-bold text-lg sm:text-xl hidden sm:inline">LeanSpec</span>
          </Link>
          <div className="hidden md:block min-w-0">
            <Breadcrumb items={breadcrumbs} />
          </div>
        </div>
        
        {/* Right: Search + Language + Theme + Docs + GitHub */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <QuickSearch specs={specs} />
          <TooltipProvider>
            <LanguageSwitcher />
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <ThemeToggle />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('theme.toggleTheme')}</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" asChild className="h-9 w-9 sm:h-10 sm:w-10">
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
                <Button variant="ghost" size="icon" asChild className="h-9 w-9 sm:h-10 sm:w-10">
                  <a 
                    href="https://github.com/codervisor/lean-spec" 
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('navigation.githubTooltip')}
                  >
                    <Image
                      src="/github-mark-white.svg"
                      alt="GitHub"
                      width={20}
                      height={20}
                      className="hidden dark:block"
                    />
                    <Image
                      src="/github-mark.svg"
                      alt="GitHub"
                      width={20}
                      height={20}
                      className="dark:hidden"
                    />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('navigation.githubTooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </header>
  );
}
