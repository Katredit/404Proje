import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import tr from './tr.json';
import en from './en.json';
import fr from './fr.json';
import es from './es.json';
import ru from './ru.json';
import ja from './ja.json';
import zh from './zh.json';
import ko from './ko.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      tr: { translation: tr },
      en: { translation: en },
      fr: { translation: fr },
      es: { translation: es },
      ru: { translation: ru },
      ja: { translation: ja },
      zh: { translation: zh },
      ko: { translation: ko },
    },
    fallbackLng: 'tr',
    supportedLngs: ['tr', 'en', 'fr', 'es', 'ru', 'ja', 'zh', 'ko'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
