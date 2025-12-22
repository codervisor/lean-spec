import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Don't trigger shortcuts when typing in inputs
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : true;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;

        if (keyMatch && ctrlMatch && shiftMatch) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

export function useGlobalShortcuts() {
  const navigate = useNavigate();

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'h',
      description: 'Go to dashboard (home)',
      action: useCallback(() => navigate('/'), [navigate]),
    },
    {
      key: 'g',
      description: 'Go to specs list',
      action: useCallback(() => navigate('/specs'), [navigate]),
    },
    {
      key: 's',
      description: 'Go to stats',
      action: useCallback(() => navigate('/stats'), [navigate]),
    },
    {
      key: 'd',
      description: 'Go to dependencies',
      action: useCallback(() => navigate('/dependencies'), [navigate]),
    },
    {
      key: ',',
      description: 'Go to settings',
      action: useCallback(() => navigate('/settings'), [navigate]),
    },
    {
      key: '/',
      description: 'Focus search (on specs page)',
      action: useCallback(() => {
        const searchInput = document.querySelector<HTMLInputElement>('input[type="text"]');
        searchInput?.focus();
      }, []),
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}
