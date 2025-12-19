import { Outlet, Link, useLocation } from 'react-router-dom';
import { BarChart3, FileText, Network } from 'lucide-react';
import { cn } from '../lib/utils';

export function Layout() {
  const location = useLocation();

  const navItems = [
    { path: '/specs', label: 'Specs', icon: FileText },
    { path: '/stats', label: 'Stats', icon: BarChart3 },
    { path: '/dependencies', label: 'Dependencies', icon: Network },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold">LeanSpec</h1>
            <nav className="flex gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
