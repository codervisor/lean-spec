import { useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useChat } from '../contexts';
import { useCurrentProject } from './useProjectQuery';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
}

/**
 * Returns true if the shortcut requires a modifier key (Ctrl/Cmd, Shift, etc.).
 * Modifier-based shortcuts always fire, even inside inputs — matching VS Code UX.
 */
function hasModifier(shortcut: KeyboardShortcut): boolean {
  return !!(shortcut.ctrl || shortcut.meta || shortcut.shift);
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isInputTarget =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable);

      for (const shortcut of shortcuts) {
        // Plain keys (no modifier) are skipped when typing in inputs.
        // Modifier-based shortcuts and Escape always fire — like VS Code.
        if (isInputTarget && !hasModifier(shortcut) && shortcut.key !== 'Escape') {
          continue;
        }
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !(event.ctrlKey || event.metaKey);
        const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;

        if (keyMatch && ctrlMatch && metaMatch && shiftMatch) {
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
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject } = useCurrentProject();
  const { toggleChat, createConversation, toggleHistory, isOpen, openChat, closeChat } = useChat();
  const resolvedProjectId = projectId ?? currentProject?.id;
  const basePath = resolvedProjectId ? `/projects/${resolvedProjectId}` : null;

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'h',
      description: t('keyboardShortcuts.items.dashboard'),
      action: useCallback(() => navigate(basePath ?? '/projects'), [basePath, navigate]),
    },
    {
      key: 'g',
      description: t('keyboardShortcuts.items.specs'),
      action: useCallback(() => {
        if (!basePath) return;
        navigate(`${basePath}/specs`);
      }, [basePath, navigate]),
    },
    {
      key: 's',
      description: t('keyboardShortcuts.items.stats'),
      action: useCallback(() => {
        if (!basePath) return;
        navigate(`${basePath}/stats`);
      }, [basePath, navigate]),
    },
    {
      key: 'd',
      description: t('keyboardShortcuts.items.dependencies'),
      action: useCallback(() => {
        if (!basePath) return;
        navigate(`${basePath}/dependencies`);
      }, [basePath, navigate]),
    },
    {
      key: 'c',
      description: t('keyboardShortcuts.items.toggleChat'),
      action: useCallback(() => {
        toggleChat();
      }, [toggleChat]),
    },
    {
      key: 'l',
      ctrl: true,
      shift: true,
      description: t('keyboardShortcuts.items.toggleChatSidebar'),
      action: useCallback(() => {
        toggleChat();
      }, [toggleChat]),
    },
    {
      key: 'i',
      ctrl: true,
      shift: true,
      description: t('keyboardShortcuts.items.focusChatInput'),
      action: useCallback(() => {
        if (!isOpen) {
          openChat();
          // Give it a moment to render
          setTimeout(() => {
            const input = document.querySelector<HTMLTextAreaElement>('textarea[data-chat-input="true"]');
            input?.focus();
          }, 100);
        } else {
          const input = document.querySelector<HTMLTextAreaElement>('textarea[data-chat-input="true"]');
          input?.focus();
        }
      }, [isOpen, openChat]),
    },
    {
      key: 'n',
      ctrl: true,
      shift: true,
      description: t('keyboardShortcuts.items.newConversation'),
      action: useCallback(() => {
        if (!isOpen) openChat();
        createConversation();
      }, [isOpen, openChat, createConversation]),
    },
    {
      key: 'h',
      ctrl: true,
      shift: true,
      description: t('keyboardShortcuts.items.viewHistory'),
      action: useCallback(() => {
        if (!isOpen) openChat();
        toggleHistory();
      }, [isOpen, openChat, toggleHistory]),
    },
    {
      key: 'escape',
      description: t('keyboardShortcuts.items.closeChatSidebar'),
      action: useCallback(() => {
        if (!isOpen) return;
        closeChat();
      }, [isOpen, closeChat]),
    },
    {
      key: ',',
      description: t('keyboardShortcuts.items.settings'),
      action: useCallback(() => {
        if (!basePath) return;
        navigate(`${basePath}/settings`);
      }, [basePath, navigate]),
    },
    {
      key: '/',
      description: t('keyboardShortcuts.items.search'),
      action: useCallback(() => {
        const searchInput = document.querySelector<HTMLInputElement>('input[type="text"]');
        searchInput?.focus();
      }, []),
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}
