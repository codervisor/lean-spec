import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts';
import { Button } from '@leanspec/ui-components';
import { useTranslation } from 'react-i18next';

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { t } = useTranslation('common');

  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={t('theme.toggleTheme')}
      className="relative h-9 w-9"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
