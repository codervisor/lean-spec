import i18n from 'i18next';

// Import translation files
import commandsEn from '../../locales/en/commands.json';
import errorsEn from '../../locales/en/errors.json';
import templatesEn from '../../locales/en/templates.json';

import commandsZh from '../../locales/zh-CN/commands.json';
import errorsZh from '../../locales/zh-CN/errors.json';
import templatesZh from '../../locales/zh-CN/templates.json';

const resources = {
  en: {
    commands: commandsEn,
    errors: errorsEn,
    templates: templatesEn,
  },
  'zh-CN': {
    commands: commandsZh,
    errors: errorsZh,
    templates: templatesZh,
  },
};

// Detect system locale
function getSystemLocale(): string {
  const locale = process.env.LANG || process.env.LC_ALL || process.env.LC_MESSAGES || 'en';
  
  // Check if it's Chinese
  if (locale.toLowerCase().includes('zh')) {
    return 'zh-CN';
  }
  
  return 'en';
}

i18n.init({
  resources,
  lng: getSystemLocale(),
  fallbackLng: 'en',
  defaultNS: 'commands',
  ns: ['commands', 'errors', 'templates'],
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
export const t = i18n.t.bind(i18n);
