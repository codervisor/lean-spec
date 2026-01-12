import { createContext, useContext, useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@leanspec/ui-components';

/**
 * Context value for keyboard shortcuts help dialog state.
 */
interface KeyboardShortcutsContextValue {
  /** Whether the keyboard shortcuts help dialog is visible */
  showHelp: boolean;
  /** Toggle the keyboard shortcuts help dialog */
  toggleHelp: () => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | undefined>(
  undefined
);

/**
 * Keyboard shortcuts help dialog component.
 * Shows available keyboard shortcuts in a modal dialog.
 */
function KeyboardShortcutsHelp({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('common');
  const shortcuts = [
    { key: 'h', description: t('keyboardShortcuts.items.dashboard') },
    { key: 'g', description: t('keyboardShortcuts.items.specs') },
    { key: 's', description: t('keyboardShortcuts.items.stats') },
    { key: 'd', description: t('keyboardShortcuts.items.dependencies') },
    { key: ',', description: t('keyboardShortcuts.items.settings') },
    { key: '/', description: t('keyboardShortcuts.items.search') },
    { key: '⌘ + K', description: t('keyboardShortcuts.items.quickSearch') },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-background border rounded-lg shadow-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-medium mb-4">{t('keyboardShortcuts.title')}</h3>
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.description}</span>
              <kbd className="px-2 py-1 text-xs bg-secondary rounded border">{s.key}</kbd>
            </div>
          ))}
        </div>
        <Button onClick={onClose} variant="secondary" size="sm" className="mt-4 w-full">
          {t('actions.close')}
        </Button>
      </div>
    </div>
  );
}

/**
 * Provider for keyboard shortcuts help dialog state.
 * Wraps the app to provide global keyboard shortcuts help functionality.
 */
export function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  const [showHelp, setShowHelp] = useState(false);

  const value = useMemo(
    () => ({
      showHelp,
      toggleHelp: () => setShowHelp((prev) => !prev),
    }),
    [showHelp]
  );

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
      {showHelp && <KeyboardShortcutsHelp onClose={() => setShowHelp(false)} />}
    </KeyboardShortcutsContext.Provider>
  );
}

/**
 * Hook to access keyboard shortcuts context.
 * Must be used within a KeyboardShortcutsProvider.
 */
export function useKeyboardShortcuts() {
  const context = useContext(KeyboardShortcutsContext);
  if (context === undefined) {
    throw new Error('useKeyboardShortcuts must be used within a KeyboardShortcutsProvider');
  }
  return context;
}
