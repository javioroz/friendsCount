import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ThemeColors } from '../contexts/ThemeContext';

export const lightTheme: ThemeColors = {
  background: '#dcebfeff',
  primary: '#003888ff',
  secondary: '#289dfeff',
  text: '#374151',
  headerBackground: '#003888ff',
  surface: '#ffffff',
  border: '#d1d5db',
  muted: '#6b7280',
};

export const darkTheme: ThemeColors = {
  background: '#042340ff',
  primary: '#00a7a9ff',
  secondary: '#0081f9ff',
  text: '#ffffff',
  headerBackground: '#00a7a9ff',
  surface: '#0b1a37',
  border: '#1c3358',
  muted: '#94a3b8',
};

interface ThemeStore {
  isDarkMode: boolean;
  hasHydrated: boolean;
  toggleTheme: () => void;
  setDarkMode: (isDarkMode: boolean) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      isDarkMode: false,
      hasHydrated: false,
      toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      setDarkMode: (isDarkMode) => set({ isDarkMode }),
    }),
    {
      name: 'friendscount-theme',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ isDarkMode: state.isDarkMode }),
      onRehydrateStorage: () => () => {
        useThemeStore.setState({ hasHydrated: true });
      },
    }
  )
);

export const getColors = (isDarkMode: boolean): ThemeColors =>
  isDarkMode ? darkTheme : lightTheme;
