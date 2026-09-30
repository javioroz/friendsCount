import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { getColors, useThemeStore } from '../stores/themeStore';

export interface ThemeColors {
  background: string;
  primary: string;
  secondary: string;
  text: string;
  headerBackground: string;
  surface: string;
  border: string;
  muted: string;
}

interface ThemeContextType {
  isDarkMode: boolean;
  colors: ThemeColors;
  hasHydrated: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const hasHydrated = useThemeStore((state) => state.hasHydrated);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  const value = useMemo(
    () => ({ isDarkMode, colors: getColors(isDarkMode), hasHydrated, toggleTheme }),
    [isDarkMode, hasHydrated, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
