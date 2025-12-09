import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import commonEn from '../../locales/en/common.json';
import errorsEn from '../../locales/en/errors.json';
import helpEn from '../../locales/en/help.json';

import commonZh from '../../locales/zh-CN/common.json';
import errorsZh from '../../locales/zh-CN/errors.json';
import helpZh from '../../locales/zh-CN/help.json';

const resources = {
  en: {
    common: commonEn,
    errors: errorsEn,
    help: helpEn,
  },
  'zh-CN': {
    common: commonZh,
    errors: errorsZh,
    help: helpZh,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'errors', 'help'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'leanspec-language',
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
