/**
 * Theme Toggle component
 * Switches between light and dark themes
 * Framework-agnostic - no dependency on next-themes
 */

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeToggleProps {
  /** Current theme */
  theme?: Theme;
  /** Callback when theme changes */
  onThemeChange?: (theme: Theme) => void;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ThemeToggle({
  theme = 'light',
  onThemeChange,
  className,
  size = 'icon',
}: ThemeToggleProps) {
  const isDark = theme === 'dark';

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    onThemeChange?.(newTheme);
  };

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={toggleTheme}
      className={cn('relative', className)}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      <Sun
        className={cn(
          'h-5 w-5 transition-all',
          isDark ? '-rotate-90 scale-0' : 'rotate-0 scale-100'
        )}
      />
      <Moon
        className={cn(
          'absolute h-5 w-5 transition-all',
          isDark ? 'rotate-0 scale-100' : 'rotate-90 scale-0'
        )}
      />
    </Button>
  );
}

/**
 * Hook for managing theme state with localStorage persistence
 */
export function useTheme(defaultTheme: Theme = 'system') {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    // Get stored theme or detect system preference
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) {
      setThemeState(stored);
    } else {
      // Safely check for matchMedia (SSR-safe)
      try {
        if (typeof window !== 'undefined' && window.matchMedia) {
          if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setThemeState('dark');
          }
        }
      } catch {
        // Ignore errors in SSR or unsupported environments
      }
    }
  }, []);

  React.useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      try {
        const systemTheme =
          typeof window !== 'undefined' &&
          window.matchMedia &&
          window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
        root.classList.add(systemTheme);
      } catch {
        root.classList.add('light');
      }
    } else {
      root.classList.add(theme);
    }

    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  const setTheme = React.useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  return { theme, setTheme, mounted };
}
