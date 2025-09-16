import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';
import svCommon from './locales/sv/common.json';

const savedLng = ((): string | undefined => {
  try {
    return localStorage.getItem('lng') ?? undefined;
  } catch {
    return undefined;
  }
})();

void i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon },
    sv: { common: svCommon },
  },
  lng: savedLng || 'en',
  fallbackLng: 'en',
  ns: ['common'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem('lng', lng);
  } catch {
    // ignore storage errors
  }
});

export default i18n;
