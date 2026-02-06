import { useState } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useThemeStore } from '../stores/theme';
import { Button, cn } from '@leanspec/ui-components';
import { useTranslation } from 'react-i18next';

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);

  const themes = [
    { value: 'light', icon: Sun, label: t('settings.appearance.light') },
    { value: 'dark', icon: Moon, label: t('settings.appearance.dark') },
    { value: 'system', icon: Monitor, label: t('settings.appearance.system') },
  ] as const;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        aria-label={t('theme.toggleTheme')}
        className={cn("h-9 w-9", open && "bg-accent")}
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-36 z-50 rounded-md border bg-popover p-1 shadow-md">
            {themes.map(({ value, icon: Icon, label }) => (
              <Button
                key={value}
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                }}
                variant="ghost"
                size="sm"
                className={cn(
                  'w-full justify-start h-8 px-2',
                  theme === value && 'bg-accent'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{label}</span>
                {theme === value && <Check className="h-3 w-3 ml-2" />}
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
