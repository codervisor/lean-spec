import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from '../locales/en/common.json';
import zhCNCommon from '../locales/zh-CN/common.json';

const resources = {
  en: {
    common: enCommon,
  },
  'zh-CN': {
    common: zhCNCommon,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('leanspec-language') || 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
  });

// Save language preference when it changes
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('leanspec-language', lng);
});

export default i18n;
