import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { useLanguageStore } from '../stores/languageStore';

// Import translation files
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';
import it from './locales/it.json';
import de from './locales/de.json';
import eo from './locales/eo.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  pt: { translation: pt },
  it: { translation: it },
  de: { translation: de },
  eo: { translation: eo },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: useLanguageStore.getState().language, // Restored from AsyncStorage
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

// Single source of truth: the store persists the choice, i18next follows it.
useLanguageStore.subscribe((state) => {
  if (state.language !== i18n.language) {
    i18n.changeLanguage(state.language);
  }
});

export default i18n;
