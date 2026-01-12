'use client';

import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages } from 'lucide-react';

const languages = [
  { code: 'en', labelKey: 'language.english', shortLabel: 'EN' },
  { code: 'zh-CN', labelKey: 'language.chinese', shortLabel: '中文' },
];

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation('common');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];
  const currentLanguageLabel = t(currentLanguage.labelKey);

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-2" aria-hidden>
        <Languages className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-2">
          <Languages className="h-4 w-4" />
          <span className="text-xs font-medium">{currentLanguage.shortLabel}</span>
          <span className="sr-only">{t('language.changeLanguage')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map(language => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => changeLanguage(language.code)}
            className={clsx('cursor-pointer', i18n.language === language.code && 'bg-accent')}
          >
            {t(language.labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
