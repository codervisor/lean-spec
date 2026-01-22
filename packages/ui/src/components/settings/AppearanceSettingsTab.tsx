import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@leanspec/ui-components';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

function Label({ htmlFor, children, className = '' }: { htmlFor?: string; children: React.ReactNode; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}>
      {children}
    </label>
  );
}

export function AppearanceSettingsTab() {
  const { t, i18n } = useTranslation('common');
  const { theme, setTheme } = useTheme();

  const handleLanguageChange = (locale: string) => {
    i18n.changeLanguage(locale);
    localStorage.setItem('leanspec-locale', locale);
  };

  const themes: Array<{ value: 'light' | 'dark' | 'system'; icon: typeof Sun; label: string; description: string }> = [
    { value: 'light', icon: Sun, label: t('settings.appearance.light'), description: t('settings.appearance.lightDescription') },
    { value: 'dark', icon: Moon, label: t('settings.appearance.dark'), description: t('settings.appearance.darkDescription') },
    { value: 'system', icon: Monitor, label: t('settings.appearance.system'), description: t('settings.appearance.systemDescription') },
  ];

  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.appearance.theme')}</CardTitle>
          <CardDescription>{t('settings.appearance.themeDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {themes.map(({ value, icon: Icon, label, description }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  'flex flex-col items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-accent',
                  theme === value ? 'border-primary bg-accent' : 'border-border'
                )}
              >
                <Icon className="h-8 w-8" />
                <div className="text-center">
                  <div className="font-semibold">{label}</div>
                  <div className="text-xs text-muted-foreground">{description}</div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Language Selection */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.appearance.language')}</CardTitle>
          <CardDescription>{t('settings.appearance.languageDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="language-select">{t('settings.appearance.selectLanguage')}</Label>
            <Select value={i18n.language} onValueChange={handleLanguageChange}>
              <SelectTrigger id="language-select" className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="zh-CN">简体中文</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
