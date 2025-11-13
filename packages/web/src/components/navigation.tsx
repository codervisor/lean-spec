'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Github, BarChart3 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { QuickSearch } from '@/components/quick-search';
import { cn } from '@/lib/utils';

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

export function Navigation({ specs }: NavigationProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center px-4">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <img src="/logo.svg" alt="LeanSpec" className="h-6 w-6" />
            <span className="font-bold text-xl">LeanSpec</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/"
              className={cn(
                "transition-colors hover:text-foreground/80 flex items-center gap-1.5",
                pathname === "/" 
                  ? "text-foreground font-semibold" 
                  : "text-foreground/60"
              )}
            >
              <Home className="h-4 w-4" />
              Home
            </Link>
            <Link
              href="/board"
              className={cn(
                "transition-colors hover:text-foreground/80 flex items-center gap-1.5",
                pathname === "/board" 
                  ? "text-foreground font-semibold" 
                  : "text-foreground/60"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              Board
            </Link>
            <Link
              href="/stats"
              className={cn(
                "transition-colors hover:text-foreground/80 flex items-center gap-1.5",
                pathname === "/stats" 
                  ? "text-foreground font-semibold" 
                  : "text-foreground/60"
              )}
            >
              <BarChart3 className="h-4 w-4" />
              Stats
            </Link>
            <a
              href="https://github.com/codervisor/lean-spec"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-1.5"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </nav>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <QuickSearch specs={specs} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
