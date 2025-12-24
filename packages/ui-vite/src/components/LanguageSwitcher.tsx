import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { Button } from '@leanspec/ui-components';
import { cn } from '../lib/utils';

const languages = [
  { code: 'en', labelKey: 'language.english', shortLabel: 'EN' },
  { code: 'zh-CN', labelKey: 'language.chinese', shortLabel: '中文' },
];

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation('common');
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setOpen(false);
  };

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="h-9 w-9 p-0" aria-hidden>
        <Languages className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="h-9 w-9 p-0"
        onClick={() => setOpen(!open)}
        aria-label={t('language.changeLanguage')}
      >
        <Languages className="h-4 w-4" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-32 z-50 rounded-md border bg-popover p-1 shadow-md">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => changeLanguage(language.code)}
                className={cn(
                  'w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors',
                  i18n.language === language.code && 'bg-accent'
                )}
              >
                {t(language.labelKey)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
