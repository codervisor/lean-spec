import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@/library';
import { useThemeStore } from '../../stores/theme';
import { useDisplayStore } from '../../stores/display';
import { Sun, Moon, Monitor, Scan } from 'lucide-react';

function Label({ htmlFor, children, className = '' }: { htmlFor?: string; children: React.ReactNode; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}>
      {children}
    </label>
  );
}

export function AppearanceSettingsTab() {
  const { t, i18n } = useTranslation('common');
  const { theme, setTheme } = useThemeStore();
  const { displayMode, setDisplayMode } = useDisplayStore();

  const handleLanguageChange = (locale: string) => {
    i18n.changeLanguage(locale);
    localStorage.setItem('leanspec-locale', locale);
  };

  const themes: Array<{ value: 'light' | 'dark' | 'system'; icon: typeof Sun; label: string; description: string }> = [
    { value: 'light', icon: Sun, label: t('settings.appearance.light'), description: t('settings.appearance.lightDescription') },
    { value: 'dark', icon: Moon, label: t('settings.appearance.dark'), description: t('settings.appearance.darkDescription') },
    { value: 'system', icon: Monitor, label: t('settings.appearance.system'), description: t('settings.appearance.systemDescription') },
  ];

  const displayModes: Array<{ value: 'normal' | 'wide'; icon: typeof Monitor; label: string; description: string }> = [
    { value: 'normal', icon: Monitor, label: t('settings.appearance.normal'), description: t('settings.appearance.normalDescription') },
    { value: 'wide', icon: Scan, label: t('settings.appearance.wide'), description: t('settings.appearance.wideDescription') },
  ];

  return (
    <div className="space-y-8">
      {/* Theme Selection */}
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">{t('settings.appearance.theme')}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{t('settings.appearance.themeDescription')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {themes.map(({ value, icon: Icon, label, description }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer transition-all hover:bg-accent/50',
                theme === value ? 'border-primary bg-accent shadow-sm' : 'border-border hover:border-primary/50'
              )}
            >
              <Icon className={cn('h-6 w-6', theme === value && 'text-primary')} />
              <div className="text-center">
                <div className="text-sm font-medium">{label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Display Mode Selection */}
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">{t('settings.appearance.displayMode')}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{t('settings.appearance.displayModeDescription')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
          {displayModes.map(({ value, icon: Icon, label, description }) => (
            <button
              key={value}
              onClick={() => setDisplayMode(value)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer transition-all hover:bg-accent/50',
                displayMode === value ? 'border-primary bg-accent shadow-sm' : 'border-border hover:border-primary/50'
              )}
            >
              <Icon className={cn('h-6 w-6', displayMode === value && 'text-primary')} />
              <div className="text-center">
                <div className="text-sm font-medium">{label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Language Selection */}
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">{t('settings.appearance.language')}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{t('settings.appearance.languageDescription')}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="language-select">{t('settings.appearance.selectLanguage')}</Label>
          <Select value={i18n.language} onValueChange={handleLanguageChange}>
            <SelectTrigger id="language-select" className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en" className="cursor-pointer">{t('language.english')}</SelectItem>
              <SelectItem value="zh-CN" className="cursor-pointer">{t('language.chinese')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>
    </div>
  );
}
