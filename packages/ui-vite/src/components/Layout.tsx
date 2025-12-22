import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Navigation } from './Navigation';
import { MainSidebar } from './MainSidebar';
import { useGlobalShortcuts } from '../hooks/useKeyboardShortcuts';

function KeyboardShortcutsHelp({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { key: 'h', description: 'Go to dashboard (home)' },
    { key: 'g', description: 'Go to specs list' },
    { key: 's', description: 'Go to stats' },
    { key: 'd', description: 'Go to dependencies' },
    { key: ',', description: 'Go to settings' },
    { key: '/', description: 'Focus search' },
    { key: '⌘ + K', description: 'Open quick search' },
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
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Register global keyboard shortcuts
  useGlobalShortcuts();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation onShowShortcuts={() => setShowShortcuts(true)} />
      <div className="flex w-full min-w-0">
        <MainSidebar />
        <main className="flex-1 min-w-0 w-full lg:w-[calc(100vw-var(--main-sidebar-width,240px))] px-4 py-6 lg:px-6">
          <Outlet />
        </main>
      </div>
      {showShortcuts && <KeyboardShortcutsHelp onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
