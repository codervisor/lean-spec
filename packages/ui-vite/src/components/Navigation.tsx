import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Github, Keyboard } from 'lucide-react';
import { QuickSearch } from './QuickSearch';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '../lib/utils';

interface NavigationProps {
  onShowShortcuts: () => void;
}

function Breadcrumb() {
  const location = useLocation();
  const path = location.pathname;
  const parts = path.split('/').filter(Boolean);

  const items = [
    { label: 'Home', to: '/' },
    ...parts.map((part, idx) => {
      const to = '/' + parts.slice(0, idx + 1).join('/');
      return { label: part, to };
    }),
  ];

  return (
    <nav className="hidden md:flex items-center gap-1 text-sm text-muted-foreground truncate">
      {items.map((item, idx) => (
        <span key={item.to} className="flex items-center gap-1">
          {idx > 0 && <span className="text-muted-foreground">/</span>}
          <Link to={item.to} className={cn('hover:text-foreground transition-colors truncate', idx === items.length - 1 && 'text-foreground font-medium')}>
            {item.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}

export function Navigation({ onShowShortcuts }: NavigationProps) {
  return (
    <header className="sticky top-0 z-40 w-full h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center justify-between h-full px-3 sm:px-4 lg:px-6 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary font-bold">ls</span>
            <span className="hidden sm:inline">LeanSpec</span>
          </Link>
          <Breadcrumb />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <QuickSearch />
          <button
            onClick={() => onShowShortcuts()}
            title="Keyboard shortcuts (?)"
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
          >
            <Keyboard className="w-4 h-4" />
          </button>
          <ThemeToggle />
          <a
            href="https://www.lean-spec.dev"
            target="_blank"
            rel="noreferrer"
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
            aria-label="Documentation"
          >
            <BookOpen className="w-4 h-4" />
          </a>
          <a
            href="https://github.com/codervisor/lean-spec"
            target="_blank"
            rel="noreferrer"
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
            aria-label="GitHub repository"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>
      </div>
    </header>
  );
}
