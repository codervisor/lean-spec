'use client';

import { useTransition } from 'react';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';

const locales = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'zh-CN', label: 'Chinese', nativeLabel: '简体中文' },
];

export function LanguageSwitcher() {
  const [isPending, startTransition] = useTransition();

  const setLocale = (locale: string) => {
    startTransition(() => {
      // Set cookie for locale preference
      document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`;
      // Reload to apply new locale
      window.location.reload();
    });
  };

  // Get current locale from cookie
  const currentLocale = typeof document !== 'undefined' 
    ? document.cookie
        .split('; ')
        .find(row => row.startsWith('NEXT_LOCALE='))
        ?.split('=')[1] || 'en'
    : 'en';

  const currentLocaleInfo = locales.find(l => l.code === currentLocale) || locales[0];

  return (
    <div className="relative inline-block">
      <Button 
        variant="ghost" 
        size="icon"
        disabled={isPending}
        aria-label="Change language"
        onClick={() => {
          // Toggle between locales
          const nextLocale = currentLocale === 'en' ? 'zh-CN' : 'en';
          setLocale(nextLocale);
        }}
        title={currentLocaleInfo.nativeLabel}
      >
        <Languages className="h-5 w-5" />
      </Button>
    </div>
  );
}
