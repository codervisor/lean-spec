'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Github } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

export function Navigation() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
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
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
