'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ChevronRight, Menu, BookOpen } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { QuickSearch } from '@/components/quick-search';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  if (pathname === '/') {
    return [{ label: 'Home' }];
  }
  
  if (pathname === '/stats') {
    return [
      { label: 'Home', href: '/' },
      { label: 'Stats' }
    ];
  }
  
  if (pathname === '/specs' || pathname.startsWith('/specs?')) {
    const searchParams = new URLSearchParams(pathname.split('?')[1] || '');
    const view = searchParams.get('view');
    const viewLabel = view === 'board' ? 'Board View' : 'List View';
    return [
      { label: 'Home', href: '/' },
      { label: `Specs (${viewLabel})` }
    ];
  }
  
  if (pathname.startsWith('/specs/')) {
    const specId = pathname.split('/')[2];
    return [
      { label: 'Home', href: '/' },
      { label: 'Specs', href: '/specs' },
      { label: specId }
    ];
  }
  
  if (pathname === '/board') {
    return [
      { label: 'Home', href: '/' },
      { label: 'Board' }
    ];
  }
  
  return [{ label: 'Home', href: '/' }];
}

export function Navigation({ specs }: NavigationProps) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

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
            <span className="sr-only">Toggle menu</span>
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
        
        {/* Right: Search + Theme + Docs + GitHub */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <QuickSearch specs={specs} />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <ThemeToggle />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle theme</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" asChild className="h-9 w-9 sm:h-10 sm:w-10">
                  <a 
                    href="https://www.lean-spec.dev" 
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Documentation"
                  >
                    <BookOpen className="h-5 w-5" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Documentation</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" asChild className="h-9 w-9 sm:h-10 sm:w-10">
                  <a 
                    href="https://github.com/codervisor/lean-spec" 
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub repository"
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
                <p>GitHub repository</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </header>
  );
}
