'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Github, ChevronRight } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { QuickSearch } from '@/components/quick-search';
import { Button } from '@/components/ui/button';

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

  return (
    <header className="sticky top-0 z-50 w-full h-14 border-b border-gray-200 dark:border-gray-800 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left: Logo + Breadcrumb */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center space-x-2 shrink-0">
            <img 
              src="/logo-with-bg.svg" 
              alt="LeanSpec" 
              className="h-8 w-8 dark:hidden" 
            />
            <img 
              src="/logo-dark-bg.svg" 
              alt="LeanSpec" 
              className="h-8 w-8 hidden dark:block" 
            />
            <span className="font-bold text-xl">LeanSpec</span>
          </Link>
          <Breadcrumb items={breadcrumbs} />
        </div>
        
        {/* Right: Search + Theme + GitHub */}
        <div className="flex items-center gap-2">
          <QuickSearch specs={specs} />
          <ThemeToggle />
          <Button variant="ghost" size="icon" asChild>
            <a 
              href="https://github.com/codervisor/lean-spec" 
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub repository"
            >
              <Github className="h-5 w-5" />
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
