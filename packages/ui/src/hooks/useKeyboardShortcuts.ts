import { useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProject } from '../contexts';

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
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject } = useProject();
  const resolvedProjectId = projectId ?? currentProject?.id;
  const basePath = resolvedProjectId ? `/projects/${resolvedProjectId}` : null;

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'h',
      description: 'Go to dashboard (home)',
      action: useCallback(() => navigate(basePath ?? '/projects'), [basePath, navigate]),
    },
    {
      key: 'g',
      description: 'Go to specs list',
      action: useCallback(() => {
        if (!basePath) return;
        navigate(`${basePath}/specs`);
      }, [basePath, navigate]),
    },
    {
      key: 's',
      description: 'Go to stats',
      action: useCallback(() => {
        if (!basePath) return;
        navigate(`${basePath}/stats`);
      }, [basePath, navigate]),
    },
    {
      key: 'd',
      description: 'Go to dependencies',
      action: useCallback(() => {
        if (!basePath) return;
        navigate(`${basePath}/dependencies`);
      }, [basePath, navigate]),
    },
    {
      key: ',',
      description: 'Go to settings',
      action: useCallback(() => {
        if (!basePath) return;
        navigate(`${basePath}/settings`);
      }, [basePath, navigate]),
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
