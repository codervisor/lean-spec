'use client';

import { useEffect, useState } from 'react';

type Messages = Record<string, any>;

export function useTranslations() {
  const [messages, setMessages] = useState<Messages>({});
  const [locale, setLocale] = useState<string>('en');

  useEffect(() => {
    // Get locale from cookie
    const cookieLocale = document.cookie
      .split('; ')
      .find(row => row.startsWith('NEXT_LOCALE='))
      ?.split('=')[1] || 'en';
    
    setLocale(cookieLocale);

    // Load messages
    import(`@/locales/${cookieLocale}/common.json`)
      .then(module => setMessages(module.default))
      .catch(() => {
        // Fallback to English
        import('@/locales/en/common.json')
          .then(module => setMessages(module.default));
      });
  }, []);

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = messages;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  return { t, locale };
}
