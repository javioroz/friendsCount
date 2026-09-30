import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const SUPPORTED_LANGUAGES = ['es', 'en', 'fr', 'pt', 'it', 'de', 'eo'] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

const isSupported = (value: unknown): value is LanguageCode =>
  typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);

interface LanguageStore {
  language: LanguageCode;
  hasHydrated: boolean;
  setLanguage: (language: LanguageCode) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      language: 'es',
      hasHydrated: false,
      setLanguage: (language) => set({ language }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'friendscount-language',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ language: state.language }),
      merge: (persisted, current) => {
        const saved = (persisted as Partial<LanguageStore> | undefined)?.language;
        // A stale or hand-edited value must not put i18next in an unknown language.
        return { ...current, language: isSupported(saved) ? saved : current.language };
      },
      onRehydrateStorage: () => () => {
        useLanguageStore.setState({ hasHydrated: true });
      },
    }
  )
);
