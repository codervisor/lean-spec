import { Outlet, Link, useLocation } from 'react-router-dom';
import { BarChart3, FileText, Network, Settings, Keyboard, LayoutDashboard } from 'lucide-react';
import { cn } from '../lib/utils';
import { ProjectSwitcher } from './ProjectSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { useGlobalShortcuts } from '../hooks/useKeyboardShortcuts';
import { useState } from 'react';

function KeyboardShortcutsHelp({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { key: 'h', description: 'Go to dashboard (home)' },
    { key: 'g', description: 'Go to specs list' },
    { key: 's', description: 'Go to stats' },
    { key: 'd', description: 'Go to dependencies' },
    { key: ',', description: 'Go to settings' },
    { key: '/', description: 'Focus search' },
    { key: '?', description: 'Show keyboard shortcuts' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-background border rounded-lg shadow-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-medium mb-4">Keyboard Shortcuts</h3>
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.description}</span>
              <kbd className="px-2 py-1 text-xs bg-secondary rounded border">{s.key}</kbd>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 text-sm bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export function Layout() {
  const location = useLocation();
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  // Register global keyboard shortcuts
  useGlobalShortcuts();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/specs', label: 'Specs', icon: FileText },
    { path: '/stats', label: 'Stats', icon: BarChart3 },
    { path: '/dependencies', label: 'Dependencies', icon: Network },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold">LeanSpec</h1>
            <ProjectSwitcher />
            <nav className="flex gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.path === '/' 
                  ? location.pathname === '/' 
                  : location.pathname.startsWith(item.path);
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowShortcuts(true)}
              title="Keyboard shortcuts (?)"
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
            >
              <Keyboard className="w-4 h-4" />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-6">
        <Outlet />
      </main>
      {showShortcuts && <KeyboardShortcutsHelp onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
