'use client';

import { useEffect } from 'react';
import '../lib/i18n/config';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // i18n initialization happens in the config import
    // This component ensures the config is loaded on the client side
  }, []);

  return <>{children}</>;
}
