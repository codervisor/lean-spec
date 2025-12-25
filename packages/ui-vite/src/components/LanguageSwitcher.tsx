import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { Button, cn } from '@leanspec/ui-components';

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
              <Button
                key={language.code}
                onClick={() => changeLanguage(language.code)}
                variant="ghost"
                size="sm"
                className={cn(
                  'w-full justify-start h-8',
                  i18n.language === language.code && 'bg-accent'
                )}
              >
                {t(language.labelKey)}
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
