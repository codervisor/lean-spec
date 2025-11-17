'use client';

import { useEffect, useState } from 'react';

type Messages = Record<string, any>;

let cachedMessages: Messages = {};
let cachedLocale: string = '';

export function useTranslations() {
  const [messages, setMessages] = useState<Messages>(cachedMessages);
  const [locale, setLocale] = useState<string>(cachedLocale || 'en');
  const [isLoading, setIsLoading] = useState(!cachedLocale);

  useEffect(() => {
    // Get locale from cookie
    const cookieLocale = document.cookie
      .split('; ')
      .find(row => row.startsWith('NEXT_LOCALE='))
      ?.split('=')[1] || 'en';
    
    setLocale(cookieLocale);

    // If we already have messages for this locale, use them
    if (cachedLocale === cookieLocale && Object.keys(cachedMessages).length > 0) {
      setMessages(cachedMessages);
      setIsLoading(false);
      return;
    }

    // Load messages
    setIsLoading(true);
    import(`@/locales/${cookieLocale}/common.json`)
      .then(module => {
        cachedMessages = module.default;
        cachedLocale = cookieLocale;
        setMessages(module.default);
        setIsLoading(false);
      })
      .catch(() => {
        // Fallback to English
        import('@/locales/en/common.json')
          .then(module => {
            cachedMessages = module.default;
            cachedLocale = 'en';
            setMessages(module.default);
            setIsLoading(false);
          });
      });
  }, []);

  const t = (key: string): string => {
    if (isLoading) {
      return key; // Return key while loading
    }
    
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

  return { t, locale, isLoading };
}
